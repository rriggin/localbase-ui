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

    // Generate realistic demo data
    const seed = hashCode(dateStr);
    
    const leads = generateLeadsData(seed);
    const adSpend = generateAdSpendData(seed);

    const responseData = {
      date: dateStr,
      leads,
      adSpend,
      errors: []
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        date: 'unknown',
        leads: { count: 0, detail: 'Error loading data', sources: [] },
        adSpend: { amount: 0, detail: 'Error loading data' },
        errors: [error.message]
      })
    };
  }
};

// Simple hash function for consistent random data
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Seeded random number generator
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateLeadsData(seed) {
  const random1 = seededRandom(seed);
  const random2 = seededRandom(seed + 1);
  const random3 = seededRandom(seed + 2);
  const random4 = seededRandom(seed + 3);
  const random5 = seededRandom(seed + 4);

  const sources = [
    { code: 'NAP', name: 'Neighborhood Awareness Program', count: Math.floor(random1 * 8) + 4 },
    { code: 'RMCL', name: 'RoofMaxx Customer Lead', count: Math.floor(random2 * 6) + 3 },
    { code: 'GRML', name: 'Google/Referral Lead', count: Math.floor(random3 * 5) + 2 },
    { code: 'NAP-L', name: 'NAP - Lead', count: Math.floor(random4 * 4) + 1 },
    { code: 'NAP-S', name: 'NAP - Sale', count: Math.floor(random5 * 3) }
  ];

  // Remove sources with 0 count
  const filteredSources = sources.filter(s => s.count > 0);
  const totalCount = filteredSources.reduce((sum, s) => sum + s.count, 0);

  return {
    count: totalCount,
    detail: `Found ${totalCount} leads from ${filteredSources.length} sources (demo data)`,
    sources: filteredSources
  };
}

function generateAdSpendData(seed) {
  const random = seededRandom(seed + 100);
  const spend = Math.floor((random * 700 + 250) * 100) / 100; // $250-$950 range
  const campaigns = Math.floor(random * 5) + 4; // 4-9 campaigns

  return {
    amount: spend,
    detail: `Across ${campaigns} campaigns (demo data)`
  };
}