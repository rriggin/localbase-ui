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

    // Read data from JSON file
    const dataPath = path.join(__dirname, 'metrics-data.json');
    console.log('Reading data from:', dataPath);
    console.log('File exists:', fs.existsSync(dataPath));
    
    if (!fs.existsSync(dataPath)) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          date: dateStr,
          leads: { count: 0, detail: 'Data file not found', sources: [] },
          adSpend: { amount: 0, detail: 'Data file not found' },
          errors: ['Data file not found']
        })
      };
    }

    const rawData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);
    
    console.log('Successfully loaded data for:', data.date);
    console.log('Leads:', data.leads.count);
    console.log('Ad Spend:', data.adSpend.amount);

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