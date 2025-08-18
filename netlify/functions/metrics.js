const Database = require('better-sqlite3');
const path = require('path');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    // Try to connect to databases
    const dbPath = path.join(process.cwd(), 'data', 'roofmaxx', 'roofmaxx_deals.db');
    const adsDbPath = path.join(process.cwd(), 'data', 'roofmaxx', 'roofmaxx_google_ads.db');
    
    let leads = { count: 0, detail: 'Database not found', sources: [] };
    let adSpend = { amount: 0, detail: 'Database not found' };

    try {
      // Get leads data
      const db = new Database(dbPath, { readonly: true });
      const leadsQuery = db.prepare(`
        SELECT lead_source, raw_data
        FROM deals 
        WHERE DATE(created_at) = ?
      `);
      
      const leadsRaw = leadsQuery.all(dateStr);
      
      // Count by source, extracting from raw_data if needed
      const sourceCounts = {};
      for (const { lead_source, raw_data } of leadsRaw) {
        let source = lead_source;
        
        // Try to get dealtype from raw_data if lead_source is empty
        if (!source && raw_data) {
          try {
            const data = JSON.parse(raw_data);
            source = data.dealtype || 'Unknown';
          } catch (e) {
            source = 'Unknown';
          }
        } else if (!source) {
          source = 'Unknown';
        }
        
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      }
      
      const sources = Object.entries(sourceCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([source, count]) => ({
          code: source,
          name: source,
          count
        }));
      
      leads = {
        count: leadsRaw.length,
        detail: leadsRaw.length > 0 ? "Yesterday's total" : "No leads found for this date",
        sources
      };
      
      db.close();
    } catch (error) {
      console.error('Deals database error:', error);
      leads.detail = `Deals DB error: ${error.message}`;
    }

    try {
      // Get ad spend data
      const adsDb = new Database(adsDbPath, { readonly: true });
      const spendQuery = adsDb.prepare(`
        SELECT SUM(cost) as total_cost, COUNT(*) as campaigns
        FROM google_ads_data 
        WHERE date = ?
      `);
      
      const result = spendQuery.get(dateStr);
      
      adSpend = {
        amount: result?.total_cost || 0,
        detail: result?.campaigns > 0 ? `Across ${result.campaigns} campaigns` : "No ad spend data for this date"
      };
      
      adsDb.close();
    } catch (error) {
      console.error('Ads database error:', error);
      adSpend.detail = `Ads DB error: ${error.message}`;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        date: dateStr,
        leads,
        adSpend,
        errors: []
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        date: 'unknown',
        leads: { count: 0, detail: `Error: ${error.message}`, sources: [] },
        adSpend: { amount: 0, detail: `Error: ${error.message}` },
        errors: [error.message]
      })
    };
  }
};