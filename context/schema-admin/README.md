# Schema Administrator Documentation

## Overview

The Schema Administrator is a comprehensive web-based tool for managing the unified tactic schema that powers the Report.AI's file routing, analysis, and AI features. It provides a visual interface for defining products, tables, Lumina extractors, and AI configurations without editing JSON files directly.

**Access URL**: `/schema-admin/`

## Key Features

### 1. Product Management
- **Add/Edit/Delete Products**: Manage marketing products (YouTube, Meta, SEM, etc.)
- **Auto-slugging**: Product names automatically convert to URL-safe slugs
- **Platform Association**: Link products to their platforms
- **Real-time Search**: Filter products instantly as you type
- **Notes & Documentation**: Add context for each product

### 2. Table Configuration
Each product can have multiple tables defining expected data structures:
- **Table Title & Slug**: Human-readable names with auto-generated slugs
- **Expected Filenames**: Define exact filenames for deterministic matching
- **Aliases**: Alternative names for fuzzy matching
- **Headers**: Required CSV column headers (one per line)
- **Validators**: JSON-based validation rules (optional)

### 3. CSV Helper Tools
- **Header Inference**: Upload a CSV to automatically extract headers
- **Filename Testing**: Test how a filename would route to products/tables
- **Header Matching**: Test CSV headers against defined schemas with Jaccard similarity scoring

### 4. Lumina Extractors
Define data extraction paths from Lumina API responses:
- **Path Syntax**: Dot notation with array support (`lineItems[].product`)
- **Conditional Extraction**: `when` clauses for filtering
- **Aggregation**: Options include `first`, `unique`, `sum`, `join`
- **Live Testing**: Paste JSON payloads to test extractors in real-time

### 5. AI Configuration
Customize how AI analyzes each product:
- **Guidelines**: High-level analysis instructions
- **Analysis Prompt**: Custom prompt overrides
- **Platform Notes**: Platform-specific constraints and tips
- **Benchmarks**: Define KPI goals, warning thresholds, units, and directions

### 6. Import/Export
- **Import Legacy**: Converts old `csv-headers.json` to unified schema
- **Import Schema**: Load previously exported unified schemas
- **Export**: Generate `unified_tactic_schema.json` for production use

## Quick Start Guide

### Creating Your First Product

1. **Click "+ Add Product"** in the sidebar
2. Enter a product name (e.g., "YouTube")
3. Click on the new product in the list
4. Fill in the **Basic Info** tab:
   - Platforms: YouTube, Google Ads
   - Notes: Any relevant context

### Adding Tables

1. Navigate to the **Tables** tab
2. Click **"+ Add Table"**
3. Configure the table:
   ```
   Title: Monthly Performance
   Filenames: 
     report-youtube-monthly-performance.csv
     youtube-monthly.csv
   Headers:
     Date
     Impressions
     Clicks
     CTR
     Conversions
   ```
4. Click **"Save Table"**

### Setting Up Lumina Extractors

1. Go to the **Lumina Extractors** tab
2. Click **"+ Add Extractor"**
3. Configure:
   ```
   Name: Campaign Names
   Path: lineItems[].campaignName
   When: {"product": "YouTube"}
   Aggregate: unique
   ```
4. Test with sample JSON

### Defining Benchmarks

1. Navigate to **AI Config** tab
2. Click **"+ Add Benchmark"**
3. Enter:
   ```
   Metric: View Rate
   Goal: 0.25
   Warn Below: 0.15
   Unit: ratio
   Direction: Higher Better
   ```

## Workflow Integration

### 1. File Routing (Bulk Sorter)

The schema powers automatic file routing with this priority:

1. **Exact Filename Match**: Check `tables[*].filenames`
2. **Alias Match**: Check `tables[*].aliases`
3. **Pattern Match**: `report-{product}-{table}*.csv`
4. **Header Similarity**: Jaccard similarity ≥ 0.6

Example usage in your app:
```javascript
// Load schema
const schema = await fetch('unified_tactic_schema.json').then(r => r.json());

// Find matching table for a file
function findTableForFile(filename, csvHeaders) {
  for (const [productName, product] of Object.entries(schema.products)) {
    for (const table of product.tables) {
      // Check exact filename
      if (table.filenames.includes(filename)) {
        return { product: productName, table: table.title };
      }
      // Check headers if no filename match
      if (csvHeaders && jaccardSimilarity(csvHeaders, table.headers) >= 0.6) {
        return { product: productName, table: table.title };
      }
    }
  }
  return null;
}
```

### 2. AI Analysis Enhancement

Use the schema to enhance AI analysis:

```javascript
// Get product-specific AI config
const product = schema.products['YouTube'];
const guidelines = product.ai.guidelines;
const benchmarks = product.ai.benchmarks;

// Check metrics against benchmarks
function checkBenchmark(metric, value) {
  const benchmark = benchmarks[metric];
  if (!benchmark) return null;
  
  const belowWarning = benchmark.direction === 'higher_better' 
    ? value < benchmark.warn_below 
    : value > benchmark.warn_below;
    
  return {
    status: belowWarning ? 'warning' : 'good',
    goal: benchmark.goal,
    unit: benchmark.unit
  };
}
```

### 3. Lumina Data Processing

Execute extractors on API responses:

```javascript
// Process Lumina payload with extractors
function processLuminaData(payload, product) {
  const results = {};
  
  for (const extractor of product.lumina.extractors) {
    // Check conditions
    if (extractor.when && !matchesConditions(payload, extractor.when)) {
      continue;
    }
    
    // Extract data
    const value = extractPath(payload, extractor.path);
    
    // Apply aggregation
    results[extractor.name] = aggregate(value, extractor.aggregate);
  }
  
  return results;
}
```

## Data Schema Reference

### Unified Schema Structure

```json
{
  "version": 1,
  "products": {
    "ProductName": {
      "product_slug": "productname",
      "platforms": ["Platform1", "Platform2"],
      "notes": "Product notes",
      "tables": [
        {
          "title": "Table Name",
          "table_slug": "table-name",
          "filenames": ["exact-file.csv"],
          "aliases": ["alternative", "names"],
          "headers": ["Column1", "Column2"],
          "validator": {
            "required": ["Column1"],
            "minColumns": 5
          }
        }
      ],
      "lumina": {
        "extractors": [
          {
            "name": "Extractor Name",
            "path": "data.path[].field",
            "when": {"condition": "value"},
            "aggregate": "unique"
          }
        ]
      },
      "ai": {
        "guidelines": "Analysis instructions",
        "analysis_prompt": "Custom prompt",
        "platforms": {
          "Platform1": {
            "notes": "Platform-specific notes",
            "constraints": ["constraint1"]
          }
        },
        "benchmarks": {
          "Metric": {
            "goal": 0.5,
            "warn_below": 0.3,
            "unit": "percentage",
            "direction": "higher_better"
          }
        }
      }
    }
  }
}
```

## Testing Features

### Filename Mapping Test

1. Go to **Testing** tab
2. Enter a filename (e.g., `report-youtube-placements-august.csv`)
3. Click **Test Mapping**
4. View results showing:
   - Matching products/tables
   - Match scores (100 = exact, 90 = pattern, 80 = alias)
   - Match types

### CSV Header Test

1. Upload a CSV file
2. System extracts headers automatically
3. Shows best matching tables with:
   - Similarity scores
   - Matching headers
   - Missing required headers

## Tips & Best Practices

### 1. Naming Conventions
- Use consistent product names across your system
- Keep table names descriptive but concise
- Follow the `report-{product}-{table}-*.csv` pattern for filenames

### 2. Header Management
- List headers exactly as they appear in CSVs
- Include all required columns in validators
- Use the "Infer from CSV" feature to ensure accuracy

### 3. Benchmark Settings
- Set realistic goals based on historical data
- Warning thresholds should trigger actionable alerts
- Use appropriate units (ratio, percentage, USD, etc.)

### 4. Search Functionality
- Search works across product names, platforms, and notes
- Press ESC to clear search quickly
- Search is case-insensitive

### 5. Regular Maintenance
- Export schemas regularly for backup
- Review and update benchmarks quarterly
- Test new file patterns before deployment

## Troubleshooting

### Common Issues

**Issue**: Files not routing correctly
- **Solution**: Check exact filenames first, then test with the Filename Mapping tool

**Issue**: Headers not matching
- **Solution**: Use CSV Header Test to see similarity scores; may need to lower threshold

**Issue**: Extractors returning null
- **Solution**: Test with actual JSON payload; check path syntax and when conditions

**Issue**: Search not finding products
- **Solution**: Search includes product names, platforms, and notes - check all fields

### Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile: Responsive design, all features work

### Data Persistence
- All changes are in-memory until exported
- Use Import/Export for persistence
- Browser refresh will lose unsaved changes

## Keyboard Shortcuts

- **ESC**: Clear search field
- **Tab**: Navigate between form fields
- **Enter**: Submit forms (when focused)

## Security Considerations

- No data is sent to external servers
- All processing happens client-side
- Exported schemas should be stored securely
- API keys should never be stored in schemas

## Support & Updates

For issues or feature requests:
1. Check this documentation first
2. Test with the built-in testing tools
3. Export your schema for debugging
4. Report issues with:
   - Browser and version
   - Steps to reproduce
   - Expected vs actual behavior
   - Exported schema (sanitized)

## Version History

- **v1.0**: Initial release with core features
- Products, tables, extractors, AI config
- Import/export functionality
- Testing tools
- Real-time search

---

*Last Updated: Current Version*
*Schema Admin is part of the Report.AI suite*