# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Report.AI** - A web application for analyzing digital marketing campaign performance using AI. The application integrates with Lumina API for campaign data extraction and uses Anthropic's Claude API for intelligent analysis.

**Tech Stack**: PHP 7.4+, Vanilla JavaScript, HTML/CSS, Anthropic Claude API, Supabase (optional), No npm dependencies

## Development Commands

### Local Development
```bash
php -S localhost:8000    # Start local development server
```

### Testing & Verification
```bash
./verify_deployment.sh   # Run deployment verification tests
```

### URLs
- **Production**: https://ignite.edwinlovett.com/report-ai/
- **Schema Admin**: https://ignite.edwinlovett.com/report-ai/schema-admin/
- **API Testing**: Open `/api/test-config.php` in browser

## Core Architecture

### Frontend (Single Page Application)
- **Progressive Workflow**: Campaign Data → Company Config → File Uploads → AI Analysis
- **State Management**: `campaignData` object holds fetched campaign information
- **Theme System**: Light/dark mode with localStorage persistence
- **File Processing**: Multi-level CSV upload with automatic table routing

### Backend APIs
- **Lumina Integration**: Fetches campaign data from `https://api.edwinlovett.com/order?query={orderID}`
- **Tactic Detection**: Maps lineItems to standardized tactics using `enhanced_tactic_categories.json`
- **AI Analysis**: Sends enriched context to Claude API for comprehensive campaign analysis

### Schema Management System
- **Hierarchical Structure**: Product → Subproduct → Tactic Type (v2)
- **File Routing**: Deterministic CSV matching with Jaccard similarity scoring
- **AI Context Enhancement**: Effective context inheritance from product hierarchy
- **Access**: `/schema-admin/` provides visual interface for schema management

## Key Features

### Campaign Data Processing
- **URL Extraction**: Parses 24-character hex ObjectIDs from Lumina URLs
- **LineItem Processing**: Extracts status, company name, and metadata
- **Tactic Mapping**: Uses `enhanced_tactic_categories.json` for product/subproduct classification

### CSV File Management
- **Bulk Upload**: Auto-sorts files across tactics using filename patterns
- **Smart Routing**: Priority system (Exact → Alias → Pattern → Header similarity)
- **Progress Tracking**: Visual indicators per tactic showing upload completion

### AI Analysis
- **Model**: claude-sonnet-4-20250514 with configurable temperature and tone
- **Enhanced Context**: Includes complete lineItem details, schema context, and benchmarks
- **Output Sections**: Executive Summary, Performance Analysis, Trends, Recommendations

## Environment Setup

### Required Environment Variables (.env)
```
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### Optional Supabase Configuration
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

## Development Guidelines

### CSS Architecture
- **Design Tokens**: All colors, spacing, and typography use CSS custom properties
- **Theme Support**: Dark mode implemented via `[data-theme="dark"]` selector
- **Component System**: Modular styles with clear naming conventions

### JavaScript Patterns
- **Event-Driven**: Uses addEventListener for user interactions
- **Progressive Enhancement**: Sections reveal as workflow progresses
- **Error Handling**: Graceful failure with user-friendly messages

### PHP Best Practices
- **Input Sanitization**: All user inputs cleaned via `sanitizeInput()`
- **Error Logging**: Centralized logging to `logs/error.log`
- **CORS Configuration**: Proper headers for API communication

## File Upload System

### Supported Patterns
- **Deterministic**: `report-{product}-{table}-*.csv`
- **Exact Match**: Files listed in schema table definitions
- **Header Similarity**: Jaccard coefficient ≥ 0.6 for fuzzy matching

### Upload Validation
- **File Types**: CSV only
- **Size Limit**: 10MB maximum
- **Header Validation**: Against schema definitions

## API Endpoints

### POST /context/api/lumina.php
Fetches campaign data from Lumina API
- **Input**: `{"url": "lumina_order_url"}`
- **Output**: Campaign data with lineItems array

### POST /context/api/tactics.php  
Detects tactics from campaign data
- **Input**: Campaign data object
- **Output**: Detected tactics with status and metadata

### POST /context/api/analyze.php
Generates AI analysis
- **Input**: Complete campaign context (data + files + config)
- **Output**: Structured analysis sections

## Schema Administration

### Access and Usage
- **URL**: `/schema-admin/`
- **Purpose**: Visual management of tactic schema without JSON editing
- **Export**: Generates `unified_tactic_schema.json` for production

### Key Functions
- **Product Management**: Add/edit products with platforms and notes
- **Table Configuration**: Define CSV structures and validation rules
- **Lumina Extractors**: Map API response paths to data fields
- **AI Configuration**: Set benchmarks and analysis guidelines

## Important File Paths

### Production Deployment
- **FTP Host**: c1100784.sgvps.net
- **FTP User**: edwin@edwinlovett.com
- **Deploy Path**: /ignite.edwinlovett.com/public_html/report-ai/

### Key Schema Files
- `context/tactic-training/enhanced_tactic_categories.json` - Tactic categorization
- `unified_tactic_schema.json` - Generated from Schema Admin
- `context/tactic-training/payload-reference-lumina.json` - Lumina API response reference
## Sessions System Behaviors

@CLAUDE.sessions.md
