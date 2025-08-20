import json
import os

def handler(event, context):
    """Debug: List all files in function environment"""
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }
    
    try:
        info = {
            'cwd': os.getcwd(),
            'current_dir': [],
            'db_files_found': []
        }
        
        # List current directory
        try:
            files = os.listdir('.')
            info['current_dir'] = sorted(files)
            
            # Look for .db files specifically
            for f in files:
                if f.endswith('.db'):
                    size = os.path.getsize(f)
                    info['db_files_found'].append(f"{f} ({size} bytes)")
        except Exception as e:
            info['error'] = str(e)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(info, indent=2)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }