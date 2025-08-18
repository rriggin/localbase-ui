import json
from datetime import datetime, timedelta
import random

def lambda_handler(event, context):
    """Netlify function to serve LocalBase metrics demo data"""
    
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
        
        # Get demo data
        leads_data = get_demo_deals_for_date(date_str)
        ad_spend_data = get_demo_ad_spend_for_date(date_str)
        
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

def get_demo_deals_for_date(date_str):
    """Get realistic demo RoofMaxx deals data"""
    # Use date as seed for consistent demo data
    random.seed(hash(date_str))
    
    total_count = random.randint(8, 28)
    
    # Realistic RoofMaxx lead sources with typical distributions
    sources = [
        {'code': 'NAP', 'name': 'Neighborhood Awareness Program', 'count': random.randint(3, 12)},
        {'code': 'RMCL', 'name': 'RoofMaxx Customer Lead', 'count': random.randint(2, 8)},
        {'code': 'GRML', 'name': 'Google/Referral Lead', 'count': random.randint(1, 6)},
        {'code': 'NAP-L', 'name': 'NAP - Lead', 'count': random.randint(0, 5)},
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
    
    # Realistic daily ad spend range
    spend = round(random.uniform(180.50, 850.75), 2)
    campaigns = random.randint(3, 8)
    
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
    result = lambda_handler(test_event, {})
    print(json.dumps(result, indent=2))