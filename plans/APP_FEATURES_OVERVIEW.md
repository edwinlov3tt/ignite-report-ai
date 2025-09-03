# Report.AI - Complete Features Overview

## Core Application Architecture
**Type**: Single-page PHP web application with AI-powered campaign analysis  
**Tech Stack**: PHP 7.4+, Vanilla JavaScript, HTML/CSS, Anthropic Claude API, Supabase (optional)  
**Deployment**: SiteGround hosting with .htaccess CORS configuration  
**Schema Management**: Hierarchical Product → Subproduct → Tactic Type schema admin system

---

## 📊 **Data Ingestion & Campaign Management**

### Lumina API Integration
- **Real API Endpoint**: `https://api.edwinlovett.com/order?query={orderID}`
- **URL Processing**: Extracts 24-character hex ObjectIDs from Lumina URLs
- **Query Parameter Handling**: Automatically strips `?tab=line_items`, `?tab=tasks`, etc.
- **Example URL**: `https://townsquarelumina.com/lumina/view/order/677430e377ff89a87ff6c62f`

### Campaign Data Processing
- **LineItem Extraction**: Parses `lineItems` array from API response
- **Status Tracking**: Captures status from each lineItem (Live, Complete, Cancelled, etc.)
- **Company Auto-Population**: Extracts `companyName` and populates Company/Client field
- **Metadata Preservation**: Stores complete rawData for each lineItem

---

## 🎯 **Tactic Detection & Classification**

### Enhanced Tactic Detection Engine
- **Reference Data**: Uses `enhanced_tactic_categories.json` for comprehensive mapping
- **Product/SubProduct Matching**: Maps lineItem data to standardized tactics
- **Status Prioritization**: Intelligent status merging for multi-lineItem tactics
- **Flexible Mapping**: Handles product variations and naming inconsistencies

### Detected Tactic Display
- **Color-Coded Status Chips**:
  - 🟢 Deep Green: Complete
  - 🟢 Light Green: Live
  - 🟡 Yellow: Pending Details
  - 🟢 Very Light Green: Live - Revision
  - 🔴 Red: Cancelled
  - 🩷 Pink: Draft
  - ⚪ Gray: Unknown
- **Removable Interface**: Click X to remove tactics from analysis

---

## 📁 **File Upload & Management System**

### Multi-Level Upload Options
1. **Bulk Upload - Auto-sort Across All Tactics**
   - **Deterministic Routing**: Uses v2 schema with data-table-slug attributes
   - **Filename Pattern Recognition**: `report-{filename_stem}-{table_slug}.csv`
   - **Multi-tier Matching Algorithm**:
     - Exact filename match (Score: 100)
     - Alias match (Score: 90)
     - Stem-based pattern match (Score: 85)
     - CSV header similarity with Jaccard coefficient ≥ 0.6 (Score: 60-80)
   - **Example**: `report-targeted-display-monthly-performance.csv` → Blended Tactics / Targeted Display / Monthly Performance

2. **Tactic-Specific Bulk Upload**
   - Upload multiple CSVs for a single tactic
   - Files distributed across tactic's tables using schema v2 structure

3. **Individual Table Upload**
   - Drag-and-drop or file selection per table
   - Progress tracking per table with DataTransfer API

### Enhanced CSV Processing
- **Smart Parsing**: Handles comma-separated numbers (e.g., "1,234,567")
- **Header Mapping**: Uses unified_tactic_schema.json v2 for validation
- **Jaccard Similarity**: Fuzzy header matching for flexible file routing
- **Progress Indicators**: Visual feedback showing upload completion per tactic
- **File Validation**: CSV format validation with comprehensive error reporting

### Dynamic Table Layout
- **3-Column Grid**: Improved visibility over previous 2-column layout
- **Responsive Design**: Adapts to screen sizes (falls back to 2 columns on mobile)
- **Accent Styling**: Red "Choose Files" buttons for better visibility
- **Schema-Driven**: Table generation based on v2 hierarchical structure

---

## 🏗️ **Schema Administration System**

### Hierarchical Tactic Schema Management
- **Schema Structure**: Product → Subproduct → Tactic Type hierarchy (v2)
- **Location**: `/schema-admin/` directory with dedicated web interface
- **Purpose**: Centralized management of campaign tactic mappings and AI analysis context

### Product-Level Management
- **Product Configuration**:
  - Product name and auto-generated slug
  - Platform clusters (Facebook, YouTube, MadHive, etc.)
  - Supported mediums (Display, Video, Audio, CTV, OTT)
  - Key Performance Indicators (CPM, CTR, Conversions, Completion Rate)
  - Tactic alias glossary for normalization
  - Notes and documentation

### Subproduct-Level Management  
- **Subproduct Configuration**:
  - Data value mapping for report link generation
  - Filename stem for CSV pattern matching
  - Platform inheritance from parent products
  - Tactic type definitions with codes and aliases
  - Table structure definitions with headers and validation rules
  - Lumina extractor configurations

### Advanced Tactic Management
- **Tactic Alias System**:
  - Product-level glossary (RON → Run of Network, AAT → Advanced Audience Targeting)
  - Subproduct-specific tactic types with codes and aliases
  - Normalization functions for consistent tactic identification
  - Multi-level alias resolution with priority scoring

### AI Context Inheritance
- **Effective Context Rollup**:
  - Platform clusters inherited from Product to Subproduct
  - AI guidelines merged across hierarchy levels
  - Benchmark inheritance with subproduct overrides
  - Platform-specific notes and constraints
  - Dynamic context generation for enhanced AI analysis

### Schema Admin Interface Features
- **Dual-Tab Sidebar**: Switchable views for Products vs Subproducts
- **Real-time Search**: Filter products/subproducts by name, platforms, notes
- **Form Validation**: Comprehensive editing with structured data input
- **Sample Data Loading**: Pre-configured examples based on GPT Tactic Reference CSV
- **Multi-format Export**: JSON, CSV crosswalk, XML, and JavaScript helpers

### Link Generation System
- **Report Links**: `generateReportLink(product, subproduct, orderId, timePeriod, format)`
  - Uses data_value mapping for reportType parameter
  - Integrates with Lumina platform URLs
  - Supports custom time periods and output formats
- **Line Item Links**: `generateLineItemLink(product, lineItemId)`
  - Uses product_slug for URL construction
  - Direct access to Lumina line item details

### Integration & Export Capabilities
1. **JSON Export**: `unified_tactic_schema.json` - Complete v2 schema structure
2. **CSV Crosswalk**: `tactic_crosswalk.csv` - Matches GPT Tactic Reference format
3. **XML Export**: `tactic_schema.xml` - Structured XML for system integration
4. **JavaScript Helpers**: `tactic_schema_helpers.js` - Ready-to-use integration functions

### Main Application Integration
- **CSV File Routing**: `matchCsvToTable(filename, csvHeaders)` with deterministic scoring
- **Tactic Normalization**: `normalizeTacticLabel(label, product, subproduct)` 
- **Context Enhancement**: `getEffectiveAnalysisContext(product, subproduct)`
- **Utility Functions**: Jaccard similarity, slug generation, header matching

---

## 🔧 **Company & Campaign Configuration**

### Company Information Section
- **Auto-Population**: Company name from Lumina API response
- **Industry Selection**: Predefined categories (Home Services, Auto, Healthcare, etc.)
- **Marketing Objectives**: Free-form campaign goals and constraints
- **Additional Notes**: Special considerations, exclusions, audiences

### Analysis Time Range (Repositioned)
- **Preset Options**: 30, 60, 90, 120, 150, 180 days
- **Custom Date Range**: User-defined start/end dates with duration calculator
- **Visual Feedback**: Duration display with color coding (green=valid, red=invalid)
- **Integration**: Automatically updates Lumina platform buttons when changed

---

## 🚀 **Dynamic Lumina Platform Integration**

### Smart Button Generation
- **Line Item Buttons**: Direct links to lineItem details in Lumina platform
  - URL Format: `https://townsquarelumina.com/lumina/view/lineitem/{slugified-product}/{lineitemId}`
  - Color: Blue (#3b82f6)

- **Reporting Buttons**: Links to performance reports with time range integration
  - URL Format: `https://townsquarelumina.com/lumina/view/reports/max?reportType={type}&woOrderNumber={number}&timePeriod={period}`
  - Color: Green (#10b981)
  - **Time Range Integration**: Automatically includes selected date ranges in URLs

### Intelligent URL Construction
- **Product Name Slugification**: Converts product names to URL-safe formats
- **Time Period Mapping**: Converts UI selections to Lumina API parameters
- **Wide Orbit Integration**: Uses woOrderNumber from lineItem data
- **Real-time Updates**: Buttons refresh when time range changes

---

## 📋 **Performance Tables by Tactic**

### Tactic Card Features
- **Status Display**: Color-coded status badges in card headers
- **LineItem Details Section**: 
  - Product, Sub-Product, Tactic Type Special
  - Date ranges (start/end dates)
  - Individual lineItem status tracking
- **JSON Response Viewer**: Collapsible section showing complete lineItem rawData
- **Lumina Platform Buttons**: Direct access to Line Item and Reports views

### Table Management
- **Dynamic Table Generation**: Based on detected tactics and CSV headers data
- **Progress Tracking**: Upload completion per tactic (e.g., "3/9 uploaded")
- **File Auto-Sorting**: Bulk uploads automatically route to correct tables

---

## 🤖 **AI Analysis Engine**

### Anthropic Claude Integration
- **Model**: claude-3-5-sonnet with enhanced context
- **Rich Context**: Includes complete lineItem details, status, dates, and product information
- **Schema-Enhanced Context**: 
  - Effective context inheritance from Product → Subproduct hierarchy
  - Platform-specific constraints and notes
  - Benchmark targets with goal/warning thresholds
  - Tactic normalization for consistent analysis
  - AI guidelines merged across hierarchy levels
- **Analysis Components**:
  - Executive Summary
  - Performance Analysis (per tactic with normalized names)
  - Trend Analysis with benchmark comparisons
  - Strategic Recommendations based on platform constraints
  - Data Visualizations with KPI-specific formatting

### AI Configuration Options
- **Temperature Control**: Creativity vs. precision slider (0.0-1.0)
- **Tone Selection**: Concise, Professional, Conversational, Encouraging, Casual
- **Custom Instructions**: Additional prompt modifications
- **Chart Control**: Option to hide/show visualizations
- **Schema Integration**: Automatic context enhancement from tactic schema v2

---

## 🎨 **User Interface & Design**

### Theme System
- **Dual Themes**: Light and dark mode with system preference detection
- **Persistent Settings**: Theme choice saved in localStorage
- **Color Variables**: CSS custom properties for consistent theming

### Progressive Workflow
- **Section Organization**: Campaign Data → Company Info → Time Range → File Uploads → AI Config
- **Collapsible Sections**: Auto-expand after campaign loading, manual collapse available
- **Step-by-Step Flow**: Guided process from data input to AI analysis

### Status & Feedback Systems
- **Toast Notifications**: Success/error/warning messages with auto-dismiss
- **Loading States**: Progress indicators during API calls
- **Real-time Validation**: Input validation with immediate feedback

---

## 🔒 **Security & Configuration**

### API Security
- **Environment Variables**: API keys stored in .env files
- **CORS Handling**: Comprehensive .htaccess configuration for SiteGround
- **Input Sanitization**: All user inputs cleaned and validated
- **File Upload Restrictions**: CSV-only, 10MB max file size

### Deployment Configuration
- **Root .htaccess**: CORS headers, security headers, caching, compression
- **API .htaccess**: Specific API directory configuration
- **PHP Settings**: Upload limits, execution time, memory limits
- **Error Handling**: Graceful failure with user-friendly messages

---

## 📊 **Analysis & Reporting Features**

### Analysis Output
- **Structured Sections**: Executive Summary, Performance Analysis, Trends, Recommendations
- **Metrics Dashboard**: Key performance indicators with change tracking
- **Chart Generation**: Dynamic visualizations based on uploaded data
- **Timestamp Tracking**: Analysis generation time and context

### Export & Sharing
- **Clipboard Integration**: Copy formatted analysis text
- **Print Optimization**: Clean layouts for physical documents
- **Results Navigation**: Dedicated results view with mobile-optimized navigation

---

## 🔄 **Workflow & State Management**

### Campaign Loading Flow
1. **Lumina URL Input** → Order ID extraction
2. **API Call** → Campaign data fetch
3. **Tactic Detection** → LineItem processing and mapping
4. **UI Updates** → Status chips, tactic cards, company auto-fill
5. **File Upload Preparation** → Dynamic table generation

### Analysis Flow
1. **Data Validation** → Ensure campaign data and uploads present
2. **Context Building** → Combine campaign, company, tactic, and file data
3. **AI Processing** → Send enriched context to Claude API
4. **Results Display** → Parse and present structured analysis
5. **Export Options** → Enable sharing and documentation

---

## 📈 **Performance & Optimization**

### Frontend Optimization
- **Lazy Loading**: Components load as needed
- **Progress Indicators**: Real-time feedback during processing
- **Memory Management**: Efficient data structures and cleanup
- **Caching Strategy**: LocalStorage for settings and temporary data

### Backend Optimization
- **API Caching**: Intelligent request handling
- **Error Recovery**: Retry logic for failed API calls
- **Resource Management**: Proper file handling and cleanup

---

## 🚧 **Current Limitations & Future Enhancements**

### Known Limitations
- **Supabase Integration**: Currently configured but not required for core functionality
- **Single Campaign**: Processes one campaign at a time
- **CSV Format**: Requires specific CSV structure for optimal processing (mitigated by Jaccard similarity matching)

### Enhancement Opportunities
- **Multi-Campaign Analysis**: Comparative analysis across campaigns
- **Advanced Visualizations**: Interactive charts and geographic mapping
- **Automated Reporting**: Scheduled analysis generation
- **API Integrations**: Direct connections with Facebook, Google, MadHive platforms
- **Schema Versioning**: Migration tools for schema updates
- **Real-time Analytics**: Live campaign performance monitoring
- **Template System**: Pre-configured analysis templates by industry
- **Bulk Import**: CSV-to-schema conversion tools for rapid setup

---

## 🔧 **Technical Specifications**

### File Structure
```
/
├── index.html              # Main application (SPA)
├── api/                    # PHP backend endpoints
│   ├── config.php         # Configuration and utilities
│   ├── lumina.php         # Campaign data API
│   ├── tactics.php        # Tactic detection API
│   └── analyze.php        # AI analysis endpoint
├── schema-admin/          # Schema administration system
│   ├── index.html         # Schema admin interface
│   ├── README.md          # Documentation and usage guide
│   ├── test_integration.html # Integration testing suite
│   └── sample_data.js     # Sample schema data
├── context/               # Reference data and documentation
│   ├── tactic-training/   # Enhanced tactic categories
│   └── reporting-data-tables/ # CSV headers and table definitions
├── uploads/               # CSV file storage
├── logs/                  # Application logs
├── .htaccess              # Apache configuration
└── .env                   # Environment variables
```

### API Endpoints
- **POST /api/lumina.php**: Fetch campaign data from Lumina API
- **POST /api/tactics.php**: Detect and process tactics from campaign data
- **POST /api/analyze.php**: Generate AI analysis with complete context

### Schema Admin Endpoints
- **GET /schema-admin/**: Schema administration interface
- **GET /schema-admin/test_integration.html**: Integration testing suite
- **Export Functions**: Multi-format schema export (JSON, CSV, XML, JS)
- **Integration Helpers**: Ready-to-use JavaScript functions for main app

### Dependencies
- **PHP 7.4+**: Server-side processing
- **cURL Extension**: API communication
- **Apache mod_rewrite**: URL handling and CORS

---

*Last Updated: August 2025 - This document reflects all application features including the comprehensive Schema Administration System v2. The schema admin provides hierarchical Product → Subproduct → Tactic Type management with advanced file routing, AI context inheritance, and multi-format export capabilities.*