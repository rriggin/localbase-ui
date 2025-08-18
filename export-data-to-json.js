#!/usr/bin/env node
/**
 * Export SQLite database data to JSON for Netlify deployment
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Get yesterday's date
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const dateStr = yesterday.toISOString().split('T')[0];

console.log('Exporting data for date:', dateStr);

// Helper to promisify database operations
const dbAll = (db, query, params) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (db, query, params) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

async function exportData() {
  try {
    // Export deals data
    const dealsDb = new sqlite3.Database('data/roofmaxx/roofmaxx_deals.db', sqlite3.OPEN_READONLY);
    
    const leadsRaw = await dbAll(dealsDb, `
      SELECT lead_source, raw_data
      FROM deals 
      WHERE DATE(created_at) = ?
    `, [dateStr]);
    
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
    
    const leadsData = {
      count: leadsRaw.length,
      detail: leadsRaw.length > 0 ? "Yesterday's total" : "No leads found for this date",
      sources
    };
    
    dealsDb.close();
    
    // Export ads data
    const adsDb = new sqlite3.Database('data/roofmaxx/roofmaxx_google_ads.db', sqlite3.OPEN_READONLY);
    
    const adsResult = await dbGet(adsDb, `
      SELECT SUM(cost) as total_cost, COUNT(*) as campaigns
      FROM google_ads_data 
      WHERE date = ?
    `, [dateStr]);
    
    const adSpendData = {
      amount: adsResult?.total_cost || 0,
      detail: adsResult?.campaigns > 0 ? `Across ${adsResult.campaigns} campaigns` : "No ad spend data for this date"
    };
    
    adsDb.close();
    
    // Create final data structure
    const exportData = {
      date: dateStr,
      leads: leadsData,
      adSpend: adSpendData,
      errors: [],
      exportedAt: new Date().toISOString()
    };
    
    // Write to JSON file in netlify/functions directory
    const outputPath = path.join('netlify', 'functions', 'metrics-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    
    console.log('✅ Data exported successfully to:', outputPath);
    console.log('📊 Leads:', leadsData.count);
    console.log('💰 Ad Spend:', `$${adSpendData.amount}`);
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

exportData();