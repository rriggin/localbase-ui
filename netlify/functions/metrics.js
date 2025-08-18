const initSqlJs = require('sql.js');
const fs = require('fs');
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

    // Try multiple possible paths for databases
    const possiblePaths = [
      __dirname, // Same directory as the function
      path.join(process.cwd(), 'databases'),
      path.join('/var/task', 'databases'),
      path.join(__dirname, '..', '..', 'databases'),
      path.join(process.cwd(), 'data', 'roofmaxx'),
      path.join('/var/task', 'data', 'roofmaxx')
    ];
    
    let dbDir = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        dbDir = testPath;
        break;
      }
    }
    
    console.log('Process cwd:', process.cwd());
    console.log('Function dirname:', __dirname);
    console.log('Checked paths:', possiblePaths);
    console.log('Found db directory:', dbDir);
    
    // Debug: list actual directories that exist
    try {
      console.log('Contents of /var/task:', fs.readdirSync('/var/task'));
      if (fs.existsSync('/var/task/data')) {
        console.log('Contents of /var/task/data:', fs.readdirSync('/var/task/data'));
      }
      console.log('Contents of process.cwd():', fs.readdirSync(process.cwd()));
      if (fs.existsSync(path.join(process.cwd(), 'data'))) {
        console.log('Contents of process.cwd()/data:', fs.readdirSync(path.join(process.cwd(), 'data')));
      }
    } catch (e) {
      console.log('Error listing directories:', e.message);
    }
    
    let leads = { count: 0, detail: `Database directory not found. Checked: ${possiblePaths.join(', ')}`, sources: [] };
    let adSpend = { amount: 0, detail: 'Database directory not found' };
    
    if (!dbDir) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          date: dateStr,
          leads,
          adSpend,
          errors: ['Database directory not found']
        })
      };
    }
    
    const dbPath = path.join(dbDir, 'roofmaxx_deals.db');
    const adsDbPath = path.join(dbDir, 'roofmaxx_google_ads.db');
    
    console.log('Trying deals DB at:', dbPath);
    console.log('Trying ads DB at:', adsDbPath);
    console.log('Deals DB exists:', fs.existsSync(dbPath));
    console.log('Ads DB exists:', fs.existsSync(adsDbPath));

    // Initialize SQL.js
    const SQL = await initSqlJs();

    try {
      // Get leads data
      console.log('Reading deals database...');
      const dealsDbBuffer = fs.readFileSync(dbPath);
      const dealsDb = new SQL.Database(dealsDbBuffer);
      
      const leadsStmt = dealsDb.prepare(`
        SELECT lead_source, raw_data
        FROM deals 
        WHERE DATE(created_at) = ?
      `);
      
      const leadsRaw = [];
      leadsStmt.bind([dateStr]);
      while (leadsStmt.step()) {
        const row = leadsStmt.getAsObject();
        leadsRaw.push(row);
      }
      leadsStmt.free();
      
      console.log('Found', leadsRaw.length, 'leads for', dateStr);
      
      // Count by source, extracting from raw_data if needed
      const sourceCounts = {};
      for (const row of leadsRaw) {
        let source = row.lead_source;
        
        // Try to get dealtype from raw_data if lead_source is empty
        if (!source && row.raw_data) {
          try {
            const data = JSON.parse(row.raw_data);
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
      
      dealsDb.close();
    } catch (error) {
      console.error('Deals database error:', error);
      leads.detail = `Deals DB error: ${error.message} (DB path: ${dbPath})`;
    }

    try {
      // Get ad spend data
      console.log('Reading ads database...');
      const adsDbBuffer = fs.readFileSync(adsDbPath);
      const adsDb = new SQL.Database(adsDbBuffer);
      
      const spendStmt = adsDb.prepare(`
        SELECT SUM(cost) as total_cost, COUNT(*) as campaigns
        FROM google_ads_data 
        WHERE date = ?
      `);
      
      spendStmt.bind([dateStr]);
      let result = null;
      if (spendStmt.step()) {
        result = spendStmt.getAsObject();
      }
      spendStmt.free();
      
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