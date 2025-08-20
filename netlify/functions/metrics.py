import json
import sqlite3
from datetime import datetime, timedelta
import os

def handler(event, context):
    """Netlify function to serve LocalBase metrics data"""
    
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    }
    
    # Handle preflight requests
    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    try:
        path = event['path']
        
        if path.endswith('/yesterday'):
            date_str = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        else:
            # Extract date from path if provided
            date_str = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        
        # Get data
        leads_data = get_roofmaxx_deals_for_date(date_str)
        ad_spend_data = get_google_ads_spend_for_date(date_str)
        
        response_data = {
            'date': date_str,
            'leads': leads_data,
            'adSpend': ad_spend_data,
            'errors': [],
            'exportedAt': datetime.now().isoformat()
        }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response_data)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': str(e),
                'date': date_str if 'date_str' in locals() else 'unknown',
                'leads': {'count': 0, 'detail': f'Error: {str(e)}', 'sources': []},
                'adSpend': {'amount': 0, 'detail': f'Error: {str(e)}'},
                'errors': [str(e)]
            })
        }

def get_roofmaxx_deals_for_date(date_str):
    """Get RoofMaxx deals data for a specific date"""
    import json
    
    try:
        # Multiple possible paths for database - CHECK LOCAL FIRST
        db_paths = [
            './roofmaxx_deals.db',  # Same directory as function (Netlify)
            'roofmaxx_deals.db',  # Same directory as function (Netlify)
            '/opt/build/repo/netlify/functions/roofmaxx_deals.db',  # Netlify deployment
            '/opt/build/repo/data/roofmaxx/roofmaxx_deals.db',  # Netlify deployment
            'data/roofmaxx/roofmaxx_deals.db',  # Local testing
            '../data/roofmaxx/roofmaxx_deals.db',  # Local testing relative
            'netlify/functions/roofmaxx_deals.db'  # Fallback
        ]
        
        db_path = None
        checked_paths = []
        for path in db_paths:
            checked_paths.append(f"{path}: {os.path.exists(path)}")
            if os.path.exists(path):
                db_path = path
                break
        
        if not db_path:
            return {
                'count': 0,
                'detail': f'Deals database not found. Checked: {", ".join(checked_paths)}',
                'sources': []
            }
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get total deals for the date
        cursor.execute("""
            SELECT COUNT(*) 
            FROM deals 
            WHERE DATE(created_at) = ?
        """, (date_str,))
        
        total_count = cursor.fetchone()[0]
        
        # Get deals with raw_data to extract dealtype
        cursor.execute("""
            SELECT lead_source, raw_data
            FROM deals 
            WHERE DATE(created_at) = ?
        """, (date_str,))
        
        deals_raw = cursor.fetchall()
        conn.close()
        
        # Count by source, extracting from raw_data if needed
        source_counts = {}
        for lead_source, raw_data in deals_raw:
            # Try to get dealtype from raw_data if lead_source is empty
            if (not lead_source or lead_source == '') and raw_data:
                try:
                    data = json.loads(raw_data)
                    lead_source = data.get('dealtype', 'Unknown')
                except (json.JSONDecodeError, TypeError):
                    lead_source = 'Unknown'
            elif not lead_source:
                lead_source = 'Unknown'
            
            source_counts[lead_source] = source_counts.get(lead_source, 0) + 1
        
        # Convert to list format
        sources = []
        for source, count in sorted(source_counts.items(), key=lambda x: x[1], reverse=True):
            sources.append({
                'code': source,
                'name': source,
                'count': count
            })
        
        detail = f"Yesterday's total" if total_count > 0 else "No leads found for this date"
        
        return {
            'count': total_count,
            'detail': detail,
            'sources': sources
        }
        
    except Exception as e:
        return {
            'count': 0,
            'detail': f'Database error: {str(e)}',
            'sources': []
        }

def get_google_ads_spend_for_date(date_str):
    """Get Google Ads spend data for a specific date"""
    try:
        # Multiple possible paths for database - CHECK LOCAL FIRST
        db_paths = [
            './roofmaxx_google_ads.db',  # Same directory as function (Netlify)
            'roofmaxx_google_ads.db',  # Same directory as function (Netlify)
            '/opt/build/repo/netlify/functions/roofmaxx_google_ads.db',  # Netlify deployment
            '/opt/build/repo/data/roofmaxx/roofmaxx_google_ads.db',  # Netlify deployment
            'data/roofmaxx/roofmaxx_google_ads.db',  # Local testing
            '../data/roofmaxx/roofmaxx_google_ads.db',  # Local testing relative
            'netlify/functions/roofmaxx_google_ads.db'  # Fallback
        ]
        
        db_path = None
        checked_paths = []
        for path in db_paths:
            checked_paths.append(f"{path}: {os.path.exists(path)}")
            if os.path.exists(path):
                db_path = path
                break
        
        if not db_path:
            return {
                'amount': 0,
                'detail': f'Google Ads database not found. Checked: {", ".join(checked_paths)}'
            }
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get spend for the date - FIXED: use correct table name
        cursor.execute("""
            SELECT SUM(cost) as total_cost, COUNT(*) as campaigns
            FROM google_ads_spend 
            WHERE date = ?
        """, (date_str,))
        
        result = cursor.fetchone()
        conn.close()
        
        total_cost = result[0] if result[0] is not None else 0
        campaign_count = result[1] if result[1] is not None else 0
        
        detail = f"Across {campaign_count} campaigns" if campaign_count > 0 else "No ad spend data for this date"
        
        return {
            'amount': float(total_cost),
            'detail': detail
        }
        
    except Exception as e:
        return {
            'amount': 0,
            'detail': f'Ad spend database error: {str(e)}'
        }

# For local testing
if __name__ == '__main__':
    test_event = {
        'httpMethod': 'GET',
        'path': '/.netlify/functions/metrics/yesterday'
    }
    result = handler(test_event, {})
    print(json.dumps(result, indent=2))