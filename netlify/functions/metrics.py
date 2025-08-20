import json
import os
from datetime import datetime, timedelta

def handler(event, context):
    """Netlify function to serve LocalBase metrics data from JSON"""
    
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
        # Try to read from static JSON file first
        json_paths = [
            './metrics-data.json',  # Same directory as function
            'metrics-data.json',    # Same directory as function  
            '/opt/build/repo/data/metrics-data.json',  # Netlify deployment
            '../metrics-data.json'  # Parent directory
        ]
        
        data = None
        for path in json_paths:
            try:
                if os.path.exists(path):
                    with open(path, 'r') as f:
                        data = json.load(f)
                    break
            except:
                continue
        
        if data:
            # Update timestamp and return cached data
            data['exportedAt'] = datetime.now().isoformat()
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(data)
            }
        
        # Fallback to hardcoded data if JSON not found
        date_str = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        
        fallback_data = {
            'date': date_str,
            'leads': {
                'count': 5,
                'detail': "Yesterday's total (cached)",
                'sources': [
                    {'code': 'NAP-L', 'name': 'NAP-L', 'count': 3},
                    {'code': 'MICRO', 'name': 'MICRO', 'count': 1},
                    {'code': 'GRML', 'name': 'GRML', 'count': 1}
                ]
            },
            'adSpend': {
                'amount': 36.59,
                'detail': 'Across 2 campaigns (cached)'
            },
            'errors': ['Using cached data - metrics-data.json not found'],
            'exportedAt': datetime.now().isoformat()
        }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(fallback_data)
        }
        
    except Exception as e:
        # Emergency fallback
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': str(e),
                'date': '2025-08-19',
                'leads': {'count': 5, 'detail': 'Error fallback', 'sources': []},
                'adSpend': {'amount': 36.59, 'detail': 'Error fallback'},
                'errors': [f'Function error: {str(e)}'],
                'exportedAt': datetime.now().isoformat()
            })
        }

# For local testing
if __name__ == '__main__':
    test_event = {
        'httpMethod': 'GET',
        'path': '/.netlify/functions/metrics/yesterday'
    }
    result = handler(test_event, {})
    print(json.dumps(json.loads(result['body']), indent=2))