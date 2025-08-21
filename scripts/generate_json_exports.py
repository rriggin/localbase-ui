#!/usr/bin/env python3
"""
LocalBase JSON Export Generator
Generates static JSON files for yesterday, last 7 days, and last 30 days metrics
"""

import json
import sqlite3
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

def get_database_paths():
    """Get paths to LocalBase databases"""
    # Base directory is the parent of the scripts directory
    base_dir = Path(__file__).parent.parent
    
    paths = {
        'roofmaxx_deals': base_dir / 'data' / 'roofmaxx' / 'roofmaxx_deals.db',
        'google_ads': base_dir / 'data' / 'roofmaxx' / 'roofmaxx_google_ads.db'
    }
    
    # Check if databases exist
    missing = []
    for name, path in paths.items():
        if not path.exists():
            missing.append(f"{name}: {path}")
    
    if missing:
        print(f"Warning: Missing databases: {missing}")
    
    return paths

def get_roofmaxx_deals_for_period(db_path, start_date, end_date):
    """Get RoofMaxx deals data for a date range"""
    try:
        if not os.path.exists(db_path):
            return {
                'count': 0,
                'detail': f'Database not found: {db_path}',
                'sources': []
            }
        
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Get total deals for the date range
        cursor.execute("""
            SELECT COUNT(*) 
            FROM deals 
            WHERE DATE(created_at) BETWEEN ? AND ?
        """, (start_date, end_date))
        
        total_count = cursor.fetchone()[0]
        
        # Get deals with raw_data to extract dealtype
        cursor.execute("""
            SELECT lead_source, raw_data
            FROM deals 
            WHERE DATE(created_at) BETWEEN ? AND ?
        """, (start_date, end_date))
        
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
        
        # Generate appropriate detail message
        if start_date == end_date:
            detail = f"Yesterday's total" if total_count > 0 else "No leads found for this date"
        else:
            days = (datetime.strptime(end_date, '%Y-%m-%d') - datetime.strptime(start_date, '%Y-%m-%d')).days + 1
            detail = f"Last {days} days total" if total_count > 0 else f"No leads found for this {days}-day period"
        
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

def get_google_ads_spend_for_period(db_path, start_date, end_date):
    """Get Google Ads spend data for a date range"""
    try:
        if not os.path.exists(db_path):
            return {
                'amount': 0,
                'detail': f'Database not found: {db_path}'
            }
        
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Get spend for the date range
        cursor.execute("""
            SELECT SUM(cost) as total_cost, COUNT(DISTINCT date) as days
            FROM google_ads_spend 
            WHERE date BETWEEN ? AND ?
        """, (start_date, end_date))
        
        result = cursor.fetchone()
        conn.close()
        
        total_cost = result[0] if result[0] is not None else 0
        days_count = result[1] if result[1] is not None else 0
        
        # Generate appropriate detail message
        if start_date == end_date:
            detail = f"Across campaigns" if total_cost > 0 else "No ad spend data for this date"
        else:
            detail = f"Across {days_count} days" if total_cost > 0 else f"No ad spend data for this period"
        
        return {
            'amount': float(total_cost),
            'detail': detail
        }
        
    except Exception as e:
        return {
            'amount': 0,
            'detail': f'Ad spend database error: {str(e)}'
        }

def generate_mock_proposals_for_period(period_name, multiplier):
    """Generate mock proposal data scaled by time period"""
    base_proposals = [
        {"customer": "Smith Residence", "service": "Roof Restoration", "value": 12000},
        {"customer": "Johnson Home", "service": "Roof Coating", "value": 8500},
        {"customer": "Williams Property", "service": "Complete Roof System", "value": 24500}
    ]
    
    # Scale the data based on period
    items = base_proposals * multiplier if multiplier <= 3 else base_proposals + [
        {"customer": f"Customer {i}", "service": "Roof Service", "value": 10000}
        for i in range(4, multiplier + 1)
    ]
    
    return {
        'count': len(items),
        'totalValue': sum(item['value'] for item in items),
        'items': items[:10]  # Limit to 10 items for display
    }

def generate_mock_appointments_for_period(period_name, multiplier):
    """Generate mock appointment data scaled by time period"""
    base_appointments = [
        {"customer": "Davis Family", "time": "9:00 AM", "type": "Roof Inspection"},
        {"customer": "Miller Residence", "time": "11:30 AM", "type": "Estimate Meeting"},
        {"customer": "Wilson Home", "time": "2:00 PM", "type": "Follow-up Visit"},
        {"customer": "Brown Property", "time": "4:30 PM", "type": "Contract Signing"}
    ]
    
    # Scale the data
    items = base_appointments * multiplier if multiplier <= 3 else base_appointments + [
        {"customer": f"Customer {i}", "time": "TBD", "type": "Appointment"}
        for i in range(5, multiplier + 1)
    ]
    
    return {
        'count': len(items),
        'items': items[:10]  # Limit to 10 items for display
    }

def generate_mock_revenue_for_period(period_name, multiplier):
    """Generate mock revenue data scaled by time period"""
    base_revenue = [
        {"customer": "Anderson Residence", "service": "Roof Restoration", "amount": 11000},
        {"customer": "Taylor Home", "service": "Roof Maintenance", "amount": 3500},
        {"customer": "Thomas Property", "service": "Gutter Cleaning", "amount": 4000}
    ]
    
    # Scale the data
    items = base_revenue * multiplier if multiplier <= 3 else base_revenue + [
        {"customer": f"Customer {i}", "service": "Service", "amount": 5000}
        for i in range(4, multiplier + 1)
    ]
    
    return {
        'total': sum(item['amount'] for item in items),
        'items': items[:10]  # Limit to 10 items for display
    }

def generate_json_for_period(period_name, start_date, end_date, db_paths):
    """Generate JSON data for a specific time period"""
    print(f"Generating {period_name} data for {start_date} to {end_date}")
    
    # Get real data from databases
    leads_data = get_roofmaxx_deals_for_period(db_paths['roofmaxx_deals'], start_date, end_date)
    ad_spend_data = get_google_ads_spend_for_period(db_paths['google_ads'], start_date, end_date)
    
    # Calculate multiplier for mock data
    if period_name == 'yesterday':
        multiplier = 1
    elif period_name == 'last7days':
        multiplier = 3  # Show more realistic scaling
    else:  # last30days
        multiplier = 8
    
    # Generate mock data for new features
    proposals_data = generate_mock_proposals_for_period(period_name, multiplier)
    appointments_data = generate_mock_appointments_for_period(period_name, multiplier)
    revenue_data = generate_mock_revenue_for_period(period_name, multiplier)
    
    return {
        'period': period_name,
        'dateRange': {
            'start': start_date,
            'end': end_date
        },
        'leads': leads_data['count'],
        'leadsDetail': leads_data['detail'],
        'adSpend': ad_spend_data['amount'],
        'spendDetail': ad_spend_data['detail'],
        'sources': leads_data['sources'],
        'proposals': proposals_data,
        'appointments': appointments_data,
        'revenue': revenue_data,
        'generatedAt': datetime.now().isoformat(),
        'errors': []
    }

def main():
    """Main function to generate all JSON exports"""
    print("LocalBase JSON Export Generator")
    print("=" * 40)
    
    # Get database paths
    db_paths = get_database_paths()
    
    # Calculate date ranges
    today = datetime.now().date()
    yesterday = today - timedelta(days=1)
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    # Define periods
    periods = [
        ('yesterday', yesterday.strftime('%Y-%m-%d'), yesterday.strftime('%Y-%m-%d')),
        ('last7days', week_ago.strftime('%Y-%m-%d'), yesterday.strftime('%Y-%m-%d')),
        ('last30days', month_ago.strftime('%Y-%m-%d'), yesterday.strftime('%Y-%m-%d'))
    ]
    
    # Create output directory
    output_dir = Path(__file__).parent.parent / 'data'
    output_dir.mkdir(exist_ok=True)
    
    # Generate JSON for each period
    for period_name, start_date, end_date in periods:
        try:
            data = generate_json_for_period(period_name, start_date, end_date, db_paths)
            
            # Write JSON file
            output_file = output_dir / f'{period_name}.json'
            with open(output_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            print(f"✓ Generated {output_file}")
            print(f"  Leads: {data['leads']}, Ad Spend: ${data['adSpend']:.2f}")
            
        except Exception as e:
            print(f"✗ Error generating {period_name}: {e}")
    
    print(f"\nJSON files generated in: {output_dir}")
    print("Files can be accessed at: /data/{period}.json")

if __name__ == '__main__':
    main()