# Report.AI - Complete Design & Functionality Specification

## 🎨 **Overall Design System**

### Design Philosophy
**Style**: Modern, clean interface inspired by shadcn/ui with subtle glassmorphism effects  
**Theme**: Dual-mode (Light/Dark) with intelligent system preference detection  
**Typography**: ui-sans-serif system font stack with optimal cross-platform rendering  
**Color Palette**: Sophisticated slate-based palette with strategic red accents  

### Design Token System
```css
/* Light Theme */
:root {
  --bg: 255 255 255;           /* Pure white background */
  --fg: 15 23 42;              /* slate-900 text */
  --muted-fg: 71 85 105;       /* slate-600 secondary text */
  --border: 226 232 240;       /* slate-200 subtle borders */
  --header: 248 250 252;       /* slate-50 card headers */
  --card: 255 255 255;         /* Pure white cards */
  --input: 241 245 249;        /* slate-100 form inputs */
  --primary: 207 14 15;        /* Strategic red accent */
  --success: 16 185 129;       /* emerald-500 success states */
  --warning: 234 179 8;        /* yellow-500 warnings */
  --info: 59 130 246;          /* blue-500 informational */
  --radius: 14px;              /* Consistent border radius */
  --shadow: 0 10px 20px rgba(2, 6, 23, .06), 0 2px 6px rgba(2, 6, 23, .06);
}

/* Dark Theme */
[data-theme="dark"] {
  --bg: 2 6 23;                /* slate-950 dark background */
  --fg: 241 245 249;           /* slate-100 light text */
  --muted-fg: 148 163 184;     /* slate-400 secondary text */
  --border: 30 41 59;          /* slate-800 subtle borders */
  --header: 15 23 42;          /* slate-900 dark headers */
  --card: 3 7 18;              /* Slightly lighter than background */
  --shadow: 0 14px 28px rgba(0,0,0,.45), 0 10px 10px rgba(0,0,0,.35);
}
```

---

## 🏗️ **Layout Architecture**

### Header System
- **Position**: Sticky header with backdrop blur effect
- **Background**: 92% opacity with glassmorphism blur (8px)
- **Content**: 
  - Left: App title with red dot indicator
  - Right: Theme toggle button
- **Styling**: 14px padding, 1200px max-width container
- **Border**: Subtle bottom border using --border token

### Main Container
- **Max Width**: 1200px with auto-centering
- **Padding**: 24px on all sides
- **Responsive**: Maintains proportions across device sizes
- **Scrolling**: Smooth scroll behavior for section navigation

### Card System
- **Background**: Pure card color with subtle shadow
- **Border**: 1px solid border with 14px radius
- **Shadow**: Layered shadow system (10px + 2px in light, 14px + 10px in dark)
- **Headers**: Light gray background (slate-50/slate-900) with hover effects
- **Bodies**: White/dark card background with 16px padding

---

## 📱 **User Interface Components**

### Button System
**Primary Buttons** (Analysis, Load Campaign):
```css
.btn {
  padding: 12px 24px;
  border-radius: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: rgb(var(--primary));     /* Red background */
  color: rgb(var(--primary-foreground)); /* White text */
}

.btn-primary:hover {
  background: color-mix(in oklab, rgb(var(--primary)) 90%, black);
  transform: translateY(-1px);
}
```

**Secondary Buttons** (File selection, minor actions):
```css
.btn-outline {
  background: transparent;
  border: 1px solid rgb(var(--border));
  color: rgb(var(--fg));
}

.btn-outline:hover {
  background: rgb(var(--accent));
}
```

### Input System
**Text Inputs**:
```css
.input {
  padding: 12px 16px;
  border: 1px solid rgb(var(--border));
  border-radius: 14px;
  background: rgb(var(--input));
  color: rgb(var(--fg));
  font-size: 14px;
  transition: all 0.2s ease;
}

.input:focus {
  outline: 2px solid rgb(var(--ring));
  outline-offset: 2px;
  border-color: rgb(var(--ring));
}
```

**File Upload Areas**:
```css
.file-upload {
  border: 2px dashed rgb(var(--border));
  border-radius: 14px;
  padding: 40px 20px;
  text-align: center;
  background: rgb(var(--accent));
  transition: all 0.3s ease;
}

.file-upload:hover, .file-upload.drag-over {
  border-color: rgb(var(--primary));
  background: color-mix(in oklab, rgb(var(--primary)) 5%, rgb(var(--accent)));
}
```

### Status Chips & Indicators
**Tactic Status Chips**:
```css
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

/* Status Colors */
.status-complete { background: #15803d; color: white; }      /* Deep Green */
.status-live { background: #22c55e; color: white; }          /* Light Green */  
.status-pending { background: #eab308; color: white; }       /* Yellow */
.status-revision { background: #86efac; color: #15803d; }    /* Very Light Green */
.status-cancelled { background: #ef4444; color: white; }     /* Red */
.status-draft { background: #f472b6; color: white; }         /* Pink */
.status-unknown { background: #6b7280; color: white; }       /* Gray */
```

---

## 📊 **Campaign Analysis Workflow**

### Section 1: Campaign Data Input
**Layout**: Single card with expandable sections
**Components**:
- **Lumina URL Input**: 
  - Wide text input (full width)
  - Placeholder: "Paste Townsquare Lumina URL here..."
  - Auto-extraction of 24-character hex ObjectIDs
  - Real-time validation feedback
- **Load Campaign Button**: 
  - Primary red button
  - Transforms to loading state with spinner
  - Success state shows green checkmark

**Behavior**:
- URL validation strips query parameters (`?tab=line_items`, etc.)
- API call to `/api/lumina.php` with extracted order ID
- Auto-population of company name from response
- Dynamic tactic card generation based on lineItems array

### Section 2: Detected Tactics Display
**Layout**: Dynamic grid of tactic cards (responsive 1-3 columns)
**Card Structure**:
```html
<div class="tactic-card">
  <div class="card-header">
    <h3>Product Name</h3>
    <div class="status-chip status-{status}">{Status}</div>
    <button class="remove-tactic">×</button>
  </div>
  <div class="card-body">
    <div class="lineitem-details">
      <p><strong>Sub-Product:</strong> {subProduct}</p>
      <p><strong>Tactic Type:</strong> {tacticTypeSpecial}</p>
      <p><strong>Date Range:</strong> {startDate} - {endDate}</p>
      <p><strong>Status:</strong> {status}</p>
    </div>
    <div class="lumina-buttons">
      <a href="{lineItemUrl}" class="btn-lumina-lineitem">Line Item Details</a>
      <a href="{reportUrl}" class="btn-lumina-report">Performance Reports</a>
    </div>
    <details class="raw-data-viewer">
      <summary>View Raw JSON Data</summary>
      <pre><code>{JSON.stringify(rawData, null, 2)}</code></pre>
    </details>
  </div>
</div>
```

**Dynamic Link Generation**:
- **Line Item URLs**: `https://townsquarelumina.com/lumina/view/lineitem/{slugified-product}/{lineitemId}`
- **Report URLs**: `https://townsquarelumina.com/lumina/view/reports/max?reportType={type}&woOrderNumber={number}&timePeriod={period}`
- **Real-time Updates**: Links update when time range changes

### Section 3: Company & Campaign Information
**Layout**: Two-column grid on desktop, stacked on mobile
**Left Column**:
- **Company Name**: Auto-populated from Lumina API
- **Industry Dropdown**: Predefined categories
- **Marketing Objectives**: Multi-line textarea

**Right Column**:
- **Campaign Goals**: Free-form text input
- **Target Audience**: Demographic details
- **Budget Constraints**: Optional financial parameters

### Section 4: Analysis Time Range
**Layout**: Horizontal button group + custom date picker
**Preset Options**: 30, 60, 90, 120, 150, 180 days
**Custom Range**: 
- Start/End date inputs with calendar picker
- Duration calculator with color-coded feedback
- Integration with Lumina platform button updates

### Section 5: Performance Data Upload
**Layout**: Dynamic table grid based on detected tactics
**Table Structure**: 3-column responsive grid (2 on mobile)
**Upload Options**:
1. **Bulk Upload Across All Tactics**:
   - Single drop zone for multiple CSV files
   - Automatic routing using schema v2 matching
   - Progress indicators per tactic
2. **Tactic-Specific Upload**: 
   - Individual drop zones per tactic
   - Table-specific file validation
3. **Table-Specific Upload**:
   - Granular control per performance table
   - Header validation and feedback

**File Processing Flow**:
```javascript
// Deterministic CSV routing with scoring
const matchResult = matchCsvToTable(filename, csvHeaders);
// Score priorities: Exact (100) > Alias (90) > Pattern (85) > Headers (60-80)

// File validation
const validationResult = validateCsvHeaders(headers, expectedHeaders);
// Jaccard similarity threshold: ≥ 0.6 for acceptance

// Progress tracking
updateProgress(tacticId, completedTables, totalTables);
// Visual feedback: "3/9 tables uploaded"
```

### Section 6: AI Configuration
**Layout**: Collapsible card with tabbed interface
**Configuration Options**:
- **Temperature Slider**: 0.0-1.0 with descriptive labels
- **Tone Selection**: Radio buttons (Concise, Professional, Conversational, Encouraging, Casual)
- **Custom Instructions**: Textarea for additional prompt modifications
- **Chart Control**: Toggle for visualization generation

---

## 📈 **Analysis Results Interface**

### Results Page Layout
**Structure**: Full-width layout with sidebar navigation
**Navigation Sidebar**:
```css
.results-sidebar {
  width: 280px;
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  background: rgb(var(--card));
  border-right: 1px solid rgb(var(--border));
  padding: 20px;
}

.nav-item {
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  color: rgb(var(--muted-fg));
}

.nav-item.active {
  background: rgb(var(--primary));
  color: rgb(var(--primary-foreground));
}
```

### Content Area Structure
**Main Content**:
```css
.results-content {
  margin-left: 280px;
  padding: 40px;
  max-width: calc(1200px - 280px);
}
```

**Section Navigation**:
1. **Executive Summary**
2. **Performance Analysis** (per tactic)
3. **Trend Analysis** 
4. **Strategic Recommendations**
5. **Data Visualizations**

---

## 📊 **Chart System & Visualizations**

### Chart.js Integration
**CDN**: Chart.js v4 via CDN for performance
**Chart Types Supported**:
1. **Line Charts**: Time-series performance trends
2. **Bar Charts**: Comparative metrics across tactics
3. **Pie Charts**: Budget allocation and spend distribution
4. **Doughnut Charts**: Conversion funnel visualization
5. **Scatter Plots**: Cost vs. Performance correlation

### Chart Configuration System
```javascript
const chartConfig = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        padding: 20,
        font: { size: 12, family: 'ui-sans-serif, system-ui' }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(var(--card), 0.95)',
      titleColor: 'rgb(var(--fg))',
      bodyColor: 'rgb(var(--fg))',
      borderColor: 'rgb(var(--border))',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(var(--border), 0.3)' },
      ticks: { color: 'rgb(var(--muted-fg))' }
    },
    y: {
      grid: { color: 'rgba(var(--border), 0.3)' },
      ticks: { color: 'rgb(var(--muted-fg))' }
    }
  }
};
```

### Dynamic Chart Generation
**Performance Metrics Charts**:
```javascript
function generatePerformanceChart(tacticData) {
  return {
    type: 'line',
    data: {
      labels: tacticData.dates,
      datasets: [{
        label: 'Impressions',
        data: tacticData.impressions,
        borderColor: 'rgb(var(--info))',
        backgroundColor: 'rgba(var(--info), 0.1)',
        tension: 0.4
      }, {
        label: 'Clicks',
        data: tacticData.clicks,
        borderColor: 'rgb(var(--success))',
        backgroundColor: 'rgba(var(--success), 0.1)',
        tension: 0.4
      }]
    },
    options: chartConfig
  };
}
```

**Cost Analysis Charts**:
```javascript
function generateCostChart(tactics) {
  return {
    type: 'doughnut',
    data: {
      labels: tactics.map(t => t.name),
      datasets: [{
        data: tactics.map(t => t.spend),
        backgroundColor: [
          'rgba(var(--primary), 0.8)',
          'rgba(var(--info), 0.8)',
          'rgba(var(--success), 0.8)',
          'rgba(var(--warning), 0.8)'
        ],
        borderWidth: 2,
        borderColor: 'rgb(var(--card))'
      }]
    },
    options: {
      ...chartConfig,
      cutout: '60%',
      plugins: {
        ...chartConfig.plugins,
        legend: { position: 'right' }
      }
    }
  };
}
```

### Chart Container System
```css
.chart-container {
  position: relative;
  height: 400px;
  margin: 20px 0;
  padding: 20px;
  background: rgb(var(--card));
  border-radius: var(--radius);
  border: 1px solid rgb(var(--border));
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: rgb(var(--fg));
}

.chart-canvas {
  max-height: 350px;
}
```

---

## 🎯 **Analysis Output Schema**

### Executive Summary Structure
```json
{
  "executiveSummary": {
    "campaignOverview": "Brief campaign description",
    "keyMetrics": {
      "totalImpressions": 1234567,
      "totalClicks": 12345,
      "totalSpend": 10000,
      "averageCTR": 0.015,
      "averageCPC": 0.81
    },
    "topPerformers": [
      {
        "tactic": "Facebook - Link Click",
        "metric": "CTR",
        "value": 0.025,
        "performance": "Above benchmark"
      }
    ],
    "keyInsights": [
      "Video content shows 40% higher engagement",
      "Mobile traffic converts 25% better than desktop"
    ]
  }
}
```

### Per-Tactic Analysis Structure
```json
{
  "tacticAnalysis": [
    {
      "tacticName": "Facebook - Link Click",
      "normalizedName": "meta",
      "product": "Meta",
      "subproduct": "Facebook - Link Click",
      "status": "Live",
      "dateRange": "2024-01-01 to 2024-01-31",
      "metrics": {
        "impressions": 500000,
        "clicks": 12500,
        "spend": 2500,
        "ctr": 0.025,
        "cpc": 0.20,
        "conversions": 450,
        "conversionRate": 0.036
      },
      "benchmarks": {
        "ctr": {
          "value": 0.025,
          "benchmark": 0.018,
          "performance": "above",
          "variance": "+38.9%"
        }
      },
      "insights": [
        "CTR significantly above industry benchmark",
        "Cost efficiency improved 15% month-over-month"
      ],
      "recommendations": [
        "Increase budget allocation by 20%",
        "Test similar creative formats for other campaigns"
      ]
    }
  ]
}
```

### Trend Analysis Structure
```json
{
  "trendAnalysis": {
    "timeSeriesData": {
      "daily": [
        {
          "date": "2024-01-01",
          "metrics": {
            "impressions": 16667,
            "clicks": 417,
            "spend": 83.33,
            "ctr": 0.025
          }
        }
      ]
    },
    "seasonality": {
      "weekdayPerformance": {
        "monday": { "ctr": 0.022, "variance": "-12%" },
        "tuesday": { "ctr": 0.025, "variance": "baseline" }
      },
      "hourlyPerformance": {
        "peakHours": [9, 10, 11, 18, 19, 20],
        "lowHours": [1, 2, 3, 4, 5, 6]
      }
    },
    "trends": [
      {
        "metric": "CTR",
        "direction": "increasing",
        "magnitude": "+15%",
        "significance": "statistically significant"
      }
    ]
  }
}
```

### Strategic Recommendations Schema
```json
{
  "recommendations": {
    "immediate": [
      {
        "priority": "high",
        "action": "Increase Facebook Link Click budget",
        "rationale": "38.9% above CTR benchmark with efficient CPC",
        "expectedImpact": "25-30% increase in qualified traffic",
        "implementation": "Adjust budget allocation within 24-48 hours"
      }
    ],
    "shortTerm": [
      {
        "priority": "medium", 
        "action": "A/B test video creative formats",
        "timeline": "2-3 weeks",
        "expectedImpact": "Potential 20-40% CTR improvement"
      }
    ],
    "longTerm": [
      {
        "priority": "low",
        "action": "Explore Connected TV opportunities",
        "timeline": "Next quarter",
        "rationale": "Brand awareness gaps identified in analysis"
      }
    ]
  }
}
```

---

## 🔧 **Interactive Features & Functionality**

### Real-time Data Processing
**File Upload Progress**:
```javascript
function updateUploadProgress(tacticId, progress) {
  const progressBar = document.querySelector(`#progress-${tacticId}`);
  const progressText = document.querySelector(`#progress-text-${tacticId}`);
  
  progressBar.style.width = `${progress}%`;
  progressText.textContent = `${progress}% complete`;
  
  if (progress === 100) {
    progressBar.classList.add('progress-complete');
    progressText.textContent = 'Upload complete ✓';
  }
}
```

**Dynamic Link Updates**:
```javascript
function updateLuminaLinks(timeRange) {
  document.querySelectorAll('.btn-lumina-report').forEach(button => {
    const baseUrl = button.dataset.baseUrl;
    const updatedUrl = `${baseUrl}&timePeriod=${timeRange}`;
    button.href = updatedUrl;
  });
}
```

### Responsive Behavior
**Mobile Adaptations**:
- Tactic cards: 3-column → 2-column → 1-column
- Company info: 2-column → 1-column stacked
- Charts: Reduced height (400px → 300px)
- Navigation: Collapsible sidebar with hamburger menu

**Touch Interactions**:
- Swipe gestures for chart navigation
- Touch-friendly button sizing (minimum 44px)
- Optimized file upload drop zones

### Accessibility Features
**Keyboard Navigation**:
- Tab order follows logical reading sequence
- All interactive elements keyboard accessible
- Focus indicators with 2px outline offset

**Screen Reader Support**:
- Semantic HTML structure with proper headings
- ARIA labels for complex interactions
- Alt text for chart visualizations via Chart.js plugins

**Color Accessibility**:
- WCAG AA compliant color contrast ratios
- Color-blind friendly chart palettes
- Status information not solely color-dependent

---

## 🚀 **Performance & Technical Implementation**

### Loading States & Feedback
**Progressive Loading**:
```css
.skeleton-loading {
  background: linear-gradient(90deg, 
    transparent, 
    rgba(var(--muted-fg), 0.1), 
    transparent
  );
  background-size: 200% 100%;
  animation: skeleton-wave 2s infinite;
}

@keyframes skeleton-wave {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

**Error States**:
```css
.error-state {
  border: 1px solid rgb(var(--destructive));
  background: rgba(var(--destructive), 0.05);
  color: rgb(var(--destructive));
  padding: 16px;
  border-radius: var(--radius);
}
```

### State Management
**Application State**:
```javascript
const appState = {
  campaign: null,
  tactics: [],
  uploads: {},
  analysis: null,
  ui: {
    theme: 'light',
    activeSection: 'campaign-data',
    collapsedSections: []
  }
};

// State persistence
function saveState() {
  localStorage.setItem('campaignAnalysis', JSON.stringify(appState));
}

function loadState() {
  const saved = localStorage.getItem('campaignAnalysis');
  return saved ? JSON.parse(saved) : appState;
}
```

### Memory Management
- Automatic cleanup of large datasets after analysis
- Chunked processing for large CSV files
- Lazy loading of chart visualizations
- Debounced search and filtering operations

---

This comprehensive specification covers every aspect of the Report.AI's design and functionality, from the 14px border radius to the complex chart generation system and AI analysis output schema. The interface maintains consistency through the shadcn-inspired design system while providing powerful analytical capabilities.
