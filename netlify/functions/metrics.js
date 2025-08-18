const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { promisify } = require('util');

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
    const fs = require('fs');
    const possiblePaths = [
      path.join(process.cwd(), 'data', 'roofmaxx'),
      path.join('/opt/build/repo', 'data', 'roofmaxx'),
      path.join(__dirname, '..', '..', 'data', 'roofmaxx')
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

    // Helper to promisify database operations
    const dbGet = (db, query, params) => {
      return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    };

    const dbAll = (db, query, params) => {
      return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    };

    try {
      // Get leads data
      console.log('Opening deals database...');
      const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) console.error('DB open error:', err);
        else console.log('Deals DB opened successfully');
      });
      
      const leadsRaw = await dbAll(db, `
        SELECT lead_source, raw_data
        FROM deals 
        WHERE DATE(created_at) = ?
      `, [dateStr]);
      
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
      
      db.close();
    } catch (error) {
      console.error('Deals database error:', error);
      leads.detail = `Deals DB error: ${error.message} (DB path: ${dbPath})`;
    }

    try {
      // Get ad spend data
      const adsDb = new sqlite3.Database(adsDbPath, sqlite3.OPEN_READONLY);
      
      const result = await dbGet(adsDb, `
        SELECT SUM(cost) as total_cost, COUNT(*) as campaigns
        FROM google_ads_data 
        WHERE date = ?
      `, [dateStr]);
      
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