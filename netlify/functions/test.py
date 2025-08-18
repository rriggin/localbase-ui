import json

def handler(event, context):
    """Simple test function to verify Netlify Functions are working"""
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    }
    
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'message': 'Netlify Functions are working!',
            'event_path': event.get('path', 'no path'),
            'event_keys': list(event.keys()),
            'timestamp': '2025-01-18'
        })
    }