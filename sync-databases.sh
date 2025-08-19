#!/bin/bash

echo "🔄 Syncing databases from LocalBase to LocalBase-UI..."

# Create directories if they don't exist
mkdir -p netlify/functions
mkdir -p data/roofmaxx

# Copy databases from localbase repo
if [ -f "../localbase/data/roofmaxx/roofmaxx_deals.db" ]; then
    cp ../localbase/data/roofmaxx/roofmaxx_deals.db netlify/functions/
    cp ../localbase/data/roofmaxx/roofmaxx_deals.db data/roofmaxx/
    echo "✅ Copied roofmaxx_deals.db"
else
    echo "⚠️  roofmaxx_deals.db not found at ../localbase/data/roofmaxx/"
fi

if [ -f "../localbase/src/services/google_ads/data/roofmaxx_google_ad_spend.db" ]; then
    cp ../localbase/src/services/google_ads/data/roofmaxx_google_ad_spend.db netlify/functions/roofmaxx_google_ads.db
    echo "✅ Copied roofmaxx_google_ads.db"
else
    echo "⚠️  roofmaxx_google_ads.db not found at ../localbase/src/services/google_ads/data/"
fi

# Show file sizes for verification
echo ""
echo "📊 Database file sizes:"
ls -lh netlify/functions/*.db 2>/dev/null || echo "No .db files in netlify/functions/"
ls -lh data/roofmaxx/*.db 2>/dev/null || echo "No .db files in data/roofmaxx/"

# Get database stats
echo ""
echo "📈 Database Statistics:"
if [ -f "netlify/functions/roofmaxx_deals.db" ]; then
    DEALS_COUNT=$(sqlite3 netlify/functions/roofmaxx_deals.db "SELECT COUNT(*) FROM deals;" 2>/dev/null || echo "0")
    echo "  Deals: $DEALS_COUNT records"
fi

if [ -f "netlify/functions/roofmaxx_google_ads.db" ]; then
    ADS_COUNT=$(sqlite3 netlify/functions/roofmaxx_google_ads.db "SELECT COUNT(*) FROM google_ads_spend;" 2>/dev/null || echo "0")
    ADS_LATEST=$(sqlite3 netlify/functions/roofmaxx_google_ads.db "SELECT MAX(date) FROM google_ads_spend;" 2>/dev/null || echo "N/A")
    echo "  Google Ads: $ADS_COUNT records (latest: $ADS_LATEST)"
fi

echo ""
echo "🎯 Next steps:"
echo "1. Review the copied files above"
echo "2. Run 'git add . && git commit -m \"Update databases\" && git push'"
echo "3. Netlify will automatically deploy the changes"

echo ""
echo "✅ Database sync complete!"