const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

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
    
    console.log('Querying data for date:', dateStr);

    // Database paths
    const dealsDbPath = path.join(__dirname, 'roofmaxx_deals.db');
    const adsDbPath = path.join(__dirname, 'roofmaxx_google_ads.db');

    // Initialize response data
    let leadsData = { count: 0, detail: "No leads data", sources: [] };
    let adSpendData = { amount: 0, detail: "No ad spend data" };
    let errors = [];

    // Query leads data
    if (fs.existsSync(dealsDbPath)) {
      try {
        const dealsDb = new sqlite3.Database(dealsDbPath);
        
        const leadsCount = await new Promise((resolve, reject) => {
          dealsDb.get(
            "SELECT COUNT(*) as count FROM deals WHERE date(created_at) = ?",
            [dateStr],
            (err, row) => {
              if (err) reject(err);
              else resolve(row ? row.count : 0);
            }
          );
        });

        const leadsSources = await new Promise((resolve, reject) => {
          dealsDb.all(
            "SELECT lead_source, COUNT(*) as count FROM deals WHERE date(created_at) = ? GROUP BY lead_source ORDER BY count DESC",
            [dateStr],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            }
          );
        });

        dealsDb.close();

        leadsData = {
          count: leadsCount,
          detail: leadsCount > 0 ? `${leadsCount} new leads` : "No leads yesterday",
          sources: leadsSources.map(row => ({
            code: row.lead_source,
            name: row.lead_source,
            count: row.count
          }))
        };
        
        console.log('Leads queried successfully:', leadsCount);
      } catch (err) {
        console.error('Error querying leads:', err);
        errors.push(`Leads query error: ${err.message}`);
      }
    } else {
      errors.push('Deals database not found');
    }

    // Query ad spend data
    if (fs.existsSync(adsDbPath)) {
      try {
        const adsDb = new sqlite3.Database(adsDbPath);
        
        const adSpendResult = await new Promise((resolve, reject) => {
          adsDb.get(
            "SELECT SUM(cost) as total_spend, COUNT(DISTINCT campaign_name) as campaign_count FROM google_ads_spend WHERE date = ?",
            [dateStr],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        adsDb.close();

        const totalSpend = adSpendResult?.total_spend || 0;
        const campaignCount = adSpendResult?.campaign_count || 0;

        adSpendData = {
          amount: parseFloat(totalSpend.toFixed(2)),
          detail: campaignCount > 0 ? `Across ${campaignCount} campaigns` : "No ad spend yesterday"
        };
        
        console.log('Ad spend queried successfully:', totalSpend);
      } catch (err) {
        console.error('Error querying ad spend:', err);
        errors.push(`Ad spend query error: ${err.message}`);
      }
    } else {
      errors.push('Google Ads database not found');
    }

    const data = {
      date: dateStr,
      leads: leadsData,
      adSpend: adSpendData,
      errors: errors,
      exportedAt: new Date().toISOString()
    };

    console.log('Final data:', JSON.stringify(data, null, 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
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