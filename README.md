# LocalBase UI

The frontend interface and marketing site for LocalBase - a business intelligence platform.

## Features

- 📱 **Mobile Metrics Dashboard** - Swipeable interface for yesterday's key metrics
- 🎨 **Marketing Site** - Professional landing page with LocalBase branding  
- 📊 **BI Dashboard** - Full business intelligence interface
- 🔗 **Real Data Integration** - Connects to LocalBase APIs for live metrics

## Structure

- `/` - Marketing landing page
- `/app/` - Main BI dashboard application
- `/app/templates/mobile-metrics.html` - Mobile-first metrics interface
- `/netlify/functions/` - Serverless API functions
- `/public/` - Static assets and CSS

## Deployment

Deployed on Netlify with:
- Static site hosting
- Serverless functions for API
- Automatic deployments from main branch

## Local Development

```bash
python3 -m http.server 8000
```

Then visit:
- http://localhost:8000 - Marketing site
- http://localhost:8000/app/ - BI Dashboard  
- http://localhost:8000/app/templates/mobile-metrics.html - Mobile metrics

## Architecture

This is the frontend-only repository. The backend data processing and AI services are in the main `localbase` repository.