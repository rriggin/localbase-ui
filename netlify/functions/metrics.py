import json
from datetime import datetime, timedelta
import random
import sqlite3
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
        path = event.get('path', '')
        
        if path.endswith('/yesterday'):
            date_str = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        else:
            # Extract date from path if provided
            date_str = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        
        # Try to get real data first, fallback to demo data
        leads_data = get_deals_for_date(date_str)
        ad_spend_data = get_ad_spend_for_date(date_str)
        
        response_data = {
            'date': date_str,
            'leads': leads_data,
            'adSpend': ad_spend_data,
            'errors': []
        }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response_data)
        }
        
    except Exception as e:
        # Fallback to demo data if anything fails
        leads_data = get_demo_deals_for_date(date_str if 'date_str' in locals() else '2025-01-16')
        ad_spend_data = get_demo_ad_spend_for_date(date_str if 'date_str' in locals() else '2025-01-16')
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'date': date_str if 'date_str' in locals() else '2025-01-16',
                'leads': leads_data,
                'adSpend': ad_spend_data,
                'errors': [f'Using demo data: {str(e)}']
            })
        }

def get_deals_for_date(date_str):
    """Get real RoofMaxx deals data if database exists"""
    try:
        # Try multiple possible database paths
        possible_paths = [
            'databases/roofmaxx_deals.db',
            '/opt/build/repo/databases/roofmaxx_deals.db',
            './databases/roofmaxx_deals.db'
        ]
        
        db_path = None
        for path in possible_paths:
            if os.path.exists(path):
                db_path = path
                break
        
        if not db_path:
            raise Exception("Database not found")
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get total deals for the date
        cursor.execute("""
            SELECT COUNT(*) 
            FROM deals 
            WHERE DATE(created_at) = ?
        """, (date_str,))
        
        total_count = cursor.fetchone()[0]
        
        # Get deals by source
        cursor.execute("""
            SELECT 
                CASE 
                    WHEN lead_source IS NULL OR lead_source = '' THEN 'Unknown'
                    ELSE lead_source
                END as source,
                COUNT(*) as count
            FROM deals 
            WHERE DATE(created_at) = ?
            GROUP BY lead_source
            ORDER BY count DESC
        """, (date_str,))
        
        sources_raw = cursor.fetchall()
        conn.close()
        
        # Map deal types to readable names
        deal_type_mapping = {
            'NAP': 'Neighborhood Awareness Program',
            'NAP-L': 'NAP - Lead',
            'NAP-S': 'NAP - Sale',
            'RMCL': 'RoofMaxx Customer Lead',
            'GRML': 'Google/Referral Lead',
            'Unknown': 'Unknown Source'
        }
        
        sources = []
        for source, count in sources_raw:
            readable_name = deal_type_mapping.get(source, source)
            sources.append({
                'code': source,
                'name': readable_name,
                'count': count
            })
        
        detail = f"Found {total_count} leads from {len(sources)} sources" if total_count > 0 else "No leads found for this date"
        
        return {
            'count': total_count,
            'detail': detail,
            'sources': sources
        }
        
    except Exception as e:
        # Fallback to demo data
        return get_demo_deals_for_date(date_str)

def get_ad_spend_for_date(date_str):
    """Get real Google Ads spend data if database exists"""
    try:
        # Try multiple possible database paths
        possible_paths = [
            'databases/roofmaxx_google_ads.db',
            '/opt/build/repo/databases/roofmaxx_google_ads.db',
            './databases/roofmaxx_google_ads.db'
        ]
        
        db_path = None
        for path in possible_paths:
            if os.path.exists(path):
                db_path = path
                break
        
        if not db_path:
            raise Exception("Ads database not found")
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get spend for the date
        cursor.execute("""
            SELECT SUM(cost) as total_cost, COUNT(*) as campaigns
            FROM google_ads_data 
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
        # Fallback to demo data
        return get_demo_ad_spend_for_date(date_str)

def get_demo_deals_for_date(date_str):
    """Get realistic demo RoofMaxx deals data"""
    # Use date as seed for consistent demo data
    random.seed(hash(date_str))
    
    total_count = random.randint(12, 28)
    
    # Realistic RoofMaxx lead sources with typical distributions
    sources = [
        {'code': 'NAP', 'name': 'Neighborhood Awareness Program', 'count': random.randint(4, 12)},
        {'code': 'RMCL', 'name': 'RoofMaxx Customer Lead', 'count': random.randint(3, 8)},
        {'code': 'GRML', 'name': 'Google/Referral Lead', 'count': random.randint(2, 6)},
        {'code': 'NAP-L', 'name': 'NAP - Lead', 'count': random.randint(1, 5)},
        {'code': 'NAP-S', 'name': 'NAP - Sale', 'count': random.randint(0, 3)},
    ]
    
    # Adjust to match realistic total
    actual_total = sum(s['count'] for s in sources)
    diff = total_count - actual_total
    if diff != 0:
        sources[0]['count'] = max(0, sources[0]['count'] + diff)
    
    # Remove sources with 0 count
    sources = [s for s in sources if s['count'] > 0]
    final_total = sum(s['count'] for s in sources)
    
    detail = f"Found {final_total} leads from {len(sources)} sources (demo data)"
    
    return {
        'count': final_total,
        'detail': detail,
        'sources': sources
    }

def get_demo_ad_spend_for_date(date_str):
    """Get realistic demo Google Ads spend data"""
    random.seed(hash(date_str + "ads"))
    
    # Realistic daily ad spend range for roofing company
    spend = round(random.uniform(285.50, 950.75), 2)
    campaigns = random.randint(4, 9)
    
    detail = f"Across {campaigns} campaigns (demo data)"
    
    return {
        'amount': spend,
        'detail': detail
    }

# For local testing
if __name__ == '__main__':
    test_event = {
        'httpMethod': 'GET',
        'path': '/.netlify/functions/metrics/yesterday'
    }
    result = handler(test_event, {})
    print(json.dumps(result, indent=2))