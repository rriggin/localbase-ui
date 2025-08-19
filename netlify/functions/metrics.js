const fs = require('fs');
const path = require('path');

// Try to import better-sqlite3, fall back to embedded data if it fails
let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.log('better-sqlite3 not available, will use fallback data');
}

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
    if (Database && fs.existsSync(dealsDbPath)) {
      try {
        const dealsDb = new Database(dealsDbPath, { readonly: true });
        
        const leadsCountResult = dealsDb.prepare("SELECT COUNT(*) as count FROM deals WHERE date(created_at) = ?").get(dateStr);
        const leadsCount = leadsCountResult ? leadsCountResult.count : 0;

        const leadsSources = dealsDb.prepare("SELECT lead_source, COUNT(*) as count FROM deals WHERE date(created_at) = ? GROUP BY lead_source ORDER BY count DESC").all(dateStr);

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
      errors.push(Database ? 'Deals database not found' : 'SQLite not available, using fallback');
    }

    // Query ad spend data
    if (Database && fs.existsSync(adsDbPath)) {
      try {
        const adsDb = new Database(adsDbPath, { readonly: true });
        
        const adSpendResult = adsDb.prepare("SELECT SUM(cost) as total_spend, COUNT(DISTINCT campaign_name) as campaign_count FROM google_ads_spend WHERE date = ?").get(dateStr);

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
      errors.push(Database ? 'Google Ads database not found' : 'SQLite not available, using fallback');
    }

    // Fallback data if database queries failed
    if (!Database || errors.length > 0) {
      console.log('Using fallback data due to database issues');
      leadsData = {
        count: 1,
        detail: "1 new lead (fallback)",
        sources: [{ code: "MICRO", name: "MICRO", count: 1 }]
      };
      adSpendData = {
        amount: 46.89,
        detail: "Updated 8/18 data (fallback)"
      };
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