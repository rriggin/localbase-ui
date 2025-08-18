# LocalBase HTML Templates

A comprehensive set of HTML templates using the Tide design system, adapted for LocalBase business intelligence and data visualization needs.

## 📁 Directory Organization

The app folder is organized for scalability and maintainability:

```
app/
├── 📄 index.html                 # App entry point
├── 📚 README.md                  # This documentation
├── 🏠 gallery.html               # Main app home/template gallery
├── 📊 dashboard.html             # Primary dashboard
├── 📈 google_ads_complete.html   # Production Google Ads analytics
├── 🧩 templates/                 # Reusable base templates & components
│   ├── base.html                # Foundation template (extends from here)
│   ├── chart_wrapper.html       # General chart container template
│   ├── data_table.html          # Data table template
│   └── multi_line_chart.html    # Multi-line chart template
├── 🎮 demos/                     # Demo/example implementations
│   ├── dashboard_demo.html      # Dashboard examples
│   ├── data_table_demo.html     # Data table examples
│   └── example_pie_chart.html   # Chart examples
├── 📈 charts/                    # Specific chart implementations
│   ├── deals/                   # Deal-related visualizations (5 files)
│   └── google-ads/              # Google Ads chart variants (3 files)
├── 💾 assets/                    # Static assets (JS, CSS, data)
│   └── js/                      # JavaScript data files
└── 🗄️ archive/                   # Generated/timestamp files
```

### 🧭 Quick Navigation

- **🏠 Start here**: `gallery.html` (main app home)
- **📊 Main pages**: `dashboard.html`, `google_ads_complete.html`
- **🧩 Templates**: Reusable components in `templates/`
- **🎮 Examples**: Learning materials in `demos/`

## 🎨 Design System

Based on the [Tide AI Workshop theme](https://github.com/rriggin/tide-theme), featuring:

- **Modern dark theme** with professional color palette
- **Inter font family** for clean typography
- **Responsive design** that works on all devices
- **CSS custom properties** for easy theming
- **Font Awesome icons** for consistent iconography

### Color Palette

```css
:root {
    /* Primary Colors */
    --lb-blue: #5F8DFF;           /* Primary brand color */
    --lb-blue-dark: #3A6FE3;      /* Darker variant */
    --lb-blue-light: #7BA4FF;     /* Lighter variant */
    
    /* Accent Colors */
    --lb-green: #5DD6C7;          /* Success/positive */
    --lb-orange: #FFB366;         /* Warning */
    --lb-purple: #B794F6;         /* Info */
    
    /* Neutral Colors */
    --lb-black: #1E1E2E;          /* Main background */
    --lb-gray-dark: #2A2A3C;      /* Card backgrounds */
    --lb-gray-medium: #383850;    /* Interactive elements */
    --lb-gray-light: #4A4A65;     /* Hover states */
    --lb-white: #FFFFFF;          /* Text and icons */
    
    /* Semantic Colors */
    --text-color: #FFFFFF;        /* Primary text */
    --secondary-text: #B8B8D0;    /* Secondary text */
    --border-color: #404060;      /* Borders and dividers */
}
```

## 📄 Template Structure

### 1. Base Template (`base.html`)
The foundation template providing:
- Common layout structure
- CSS reset and variables
- Navigation header
- Typography and utility classes
- Responsive grid system

**Usage:**
```html
{% extends "base.html" %}

{% block title %}Your Page Title{% endblock %}

{% block content %}
    <div class="content-section">
        <h1 class="section-title">Your Content</h1>
    </div>
{% endblock %}
```

### 2. Chart Wrapper (`chart_wrapper.html`)
Specialized template for D3.js visualizations:
- Chart container with consistent styling
- Built-in loading and error states
- Interactive controls (refresh, export, view options)
- Legend and statistics display
- Responsive chart design
- Tooltip functionality

**Usage:**
```html
{% extends "chart_wrapper.html" %}

{% block chart_data %}
const chartData = {{ your_data | safe }};
{% endblock %}

{% block chart_script %}
// Your D3.js chart implementation
{% endblock %}
```

### 3. Dashboard (`dashboard.html`)
Multi-widget dashboard layout:
- Flexible grid system for widgets
- Metric cards with trend indicators
- Chart widget containers
- List widgets for data display
- Real-time controls and filtering
- Auto-refresh functionality

**Features:**
- **Metric Widgets**: Display KPIs with change indicators
- **Chart Widgets**: Containers for visualizations
- **List Widgets**: Scrollable data lists
- **Status Indicators**: Color-coded status badges
- **Responsive Grid**: Adapts to screen size

### 4. Data Table (`data_table.html`)
Full-featured data table:
- Sortable columns
- Search and filtering
- Pagination controls
- Responsive design
- Export functionality
- Status badges and action buttons

**Features:**
- **Client-side sorting** on all columns
- **Real-time search** filtering
- **Pagination** with customizable page sizes
- **Column type support** (currency, dates, numbers)
- **Action buttons** for row operations
- **Export options** for data download

## 🚀 Quick Start

### 1. Basic Page
```html
{% extends "base.html" %}
{% block title %}My LocalBase Page{% endblock %}
{% block content %}
<div class="content-section">
    <h1 class="section-title">Welcome to LocalBase</h1>
    <div class="card">
        <h2 class="card-title">Getting Started</h2>
        <p>Your content here...</p>
    </div>
</div>
{% endblock %}
```

### 2. Simple Chart
```html
{% extends "chart_wrapper.html" %}
{% block title %}Sales Chart{% endblock %}
{% block chart_data %}
const chartData = [
    {name: "Product A", value: 100},
    {name: "Product B", value: 200}
];
{% endblock %}
{% block chart_script %}
// Your D3 chart code here
{% endblock %}
```

### 3. Dashboard Page
```html
{% extends "dashboard.html" %}
{% block title %}Business Dashboard{% endblock %}
<!-- Customize widgets in dashboard_content block -->
```

### 4. Data Explorer
```html
{% extends "data_table.html" %}
{% block title %}Customer Data{% endblock %}
<!-- Table automatically populated from template data -->
```

## 🎯 Integration Examples

### With RoofMaxx Data
See `example_pie_chart.html` for a complete implementation showing:
- RoofMaxx deal type distribution
- Interactive pie chart with LocalBase styling
- Custom tooltips and animations
- Export functionality

### With Supabase Data
```python
# Python backend example
from jinja2 import Template

# Load template
with open('templates/data_table.html') as f:
    template = Template(f.read())

# Render with Supabase data
html = template.render(
    table_title="Customer Deals",
    table_data=supabase_query_results,
    total_records=len(results)
)
```

## 🔧 Customization

### Adding Custom Styles
```html
{% extends "base.html" %}
{% block styles %}
.my-custom-class {
    background-color: var(--lb-blue);
    border-radius: 8px;
}
{% endblock %}
```

### Custom Chart Types
Extend the `LocalBaseChart` class:
```javascript
class MyCustomChart extends LocalBaseChart {
    constructor(containerId, config) {
        super(containerId, config);
    }
    
    render() {
        // Your custom chart implementation
    }
}
```

### Widget Variations
Dashboard widgets support multiple layouts:
- `widget large` - Spans 2 columns
- `widget tall` - Spans 2 rows
- Grid options: `grid-1x1`, `grid-2x1`, `grid-2x2`, `grid-3x1`, `grid-auto`

## 📱 Responsive Behavior

All templates are fully responsive:
- **Desktop (1200px+)**: Full layout with all features
- **Tablet (768px-1199px)**: Adapted grid and controls
- **Mobile (320px-767px)**: Stacked layout, simplified navigation

## 🛠️ Development Notes

### Template Engine
Templates use Jinja2 syntax for:
- Variable interpolation: `{{ variable }}`
- Control structures: `{% if %}`, `{% for %}`
- Template inheritance: `{% extends %}`, `{% block %}`

### JavaScript Architecture
- **Modular design** with ES6 classes
- **Event-driven** interactions
- **D3.js integration** for charts
- **Progressive enhancement** for accessibility

### Performance Considerations
- **CSS custom properties** for efficient theming
- **Minimal JavaScript** dependencies
- **Optimized SVG** for charts and icons
- **Lazy loading** for large datasets

## 🤝 Contributing

When adding new templates:
1. Extend existing base templates when possible
2. Follow the established color palette
3. Maintain responsive design principles
4. Add proper documentation and examples
5. Test across different screen sizes

---

**LocalBase Templates** - Professional data visualization and business intelligence templates with modern design and full functionality.