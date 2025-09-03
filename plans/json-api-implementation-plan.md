# JSON API Implementation Plan for Cached Reports

## Executive Summary
Add a JSON format parameter to the existing report system to enable programmatic access to cached marketing research reports for use in campaign analysis, AI context provision, and third-party integrations.

## 1. Implementation Overview

### Endpoint Enhancement
- **Current**: `https://ignite.edwinlovett.com/research/?company=domain.com`
- **Clean JSON API**: `https://ignite.edwinlovett.com/research/?company=domain.com&format=json`
- **Direct API**: `https://ignite.edwinlovett.com/research/claude-api.php?company=domain.com&format=json`

Both URLs work identically. The clean URL automatically routes to the API when the `company` parameter is present.

### Difficulty Level: **Low-Medium** (3/10)
- Leverages existing caching infrastructure
- Minimal changes to current codebase
- No database schema changes required
- Backward compatible implementation

## 2. Technical Considerations

### A. Data Privacy & Security
- **Contact Data Exclusion**: Remove all PII/contact information from JSON response
- **Rate Limiting**: Apply existing rate limits (20/hour per IP)
- **Authentication**: Consider API key requirement for future iterations
- **CORS Headers**: Configure for specific allowed origins

### B. Data Structure Considerations
```json
{
  "success": true,
  "cached": true,
  "cache_date": "2024-01-15T10:30:00Z",
  "cache_age_days": 5,
  "domain": "californiaclosets.com",
  "report": {
    "companyInfo": {
      "name": "California Closets",
      "industry": "Home Organization & Storage",
      "headquarters": "...",
      "website": "californiaclosets.com"
    },
    "marketResearch": { /* ... */ },
    "competitorAnalysis": { /* ... */ },
    "marketingInsights": { /* ... */ },
    "socialMedia": { /* ... */ },
    "adLibrary": { /* ... */ },
    "compliance": { /* ... */ }
  },
  "metadata": {
    "generation_cost": 0.0456,
    "model_used": "claude-sonnet-4",
    "api_version": "1.0"
  }
}
```

### C. Excluded Data
- `decisionMakers` array (PII protection)
- `enrichment_data` (contains emails/phones)
- Internal `report_id` 
- Database timestamps (except cache date)

## 3. Breaking Changes Assessment

### No Breaking Changes Expected ✅
- Default behavior unchanged (HTML response)
- Existing URLs continue to work
- Database structure unchanged
- Caching mechanism unaffected

### Minor Considerations
- Response headers will differ for JSON (application/json vs text/html)
- Error responses need JSON format when format=json

## 4. Implementation Details

### Phase 1: Core Implementation
**File**: `claude-api.php`

```php
// Add to existing claude-api.php after line checking for cached report

// Check if JSON format requested
$format = strtolower($_GET['format'] ?? 'html');
$isJsonRequest = ($format === 'json');

if ($isJsonRequest) {
    // Set JSON headers
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: https://ignite.edwinlovett.com');
    header('X-Content-Type-Options: nosniff');
    
    if ($cached_report) {
        // Prepare JSON response
        $json_response = [
            'success' => true,
            'cached' => true,
            'cache_date' => $cached_report['query_date'],
            'cache_age_days' => floor((time() - strtotime($cached_report['query_date'])) / 86400),
            'domain' => $domain,
            'report' => sanitizeReportForJson($cached_report['research_data']),
            'metadata' => [
                'generation_cost' => floatval($cached_report['report_cost'] ?? 0),
                'model_used' => $cached_report['model_used'] ?? 'unknown',
                'api_version' => '1.0'
            ]
        ];
        
        echo json_encode($json_response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    } else {
        // No cached report
        echo json_encode([
            'success' => false,
            'error' => 'No cached report found for this domain',
            'domain' => $domain,
            'suggestion' => 'Generate a report first by visiting without format=json parameter'
        ], JSON_PRETTY_PRINT);
        exit;
    }
}

// Helper function to sanitize report
function sanitizeReportForJson($report_data) {
    $report = is_string($report_data) ? json_decode($report_data, true) : $report_data;
    
    // Remove sensitive data
    unset($report['companyInfo']['decisionMakers']);
    unset($report['enrichment_data']);
    unset($report['decision_makers']);
    unset($report['contacts']);
    
    // Remove any email/phone fields recursively
    $report = removePersonalInfo($report);
    
    return $report;
}

function removePersonalInfo($data) {
    if (!is_array($data)) return $data;
    
    $pii_keys = ['email', 'emails', 'phone', 'phones', 'linkedin', 'personal_linkedin'];
    
    foreach ($data as $key => &$value) {
        if (in_array(strtolower($key), $pii_keys)) {
            unset($data[$key]);
        } elseif (is_array($value)) {
            $value = removePersonalInfo($value);
        }
    }
    
    return $data;
}
```

### Phase 2: Error Handling
```php
// Update error responses when format=json
if ($isJsonRequest && !$domain) {
    echo json_encode([
        'success' => false,
        'error' => 'Domain parameter required',
        'usage' => 'Add ?company=domain.com&format=json to the URL'
    ], JSON_PRETTY_PRINT);
    exit;
}
```

## 5. Backward Compatibility for Cached Reports

### Existing Cached Reports ✅
- **Will Work**: All existing cached reports remain accessible
- **Data Structure**: Already stored as JSON in database
- **No Migration Needed**: Sanitization happens at request time

### Future Updates
- When reports are regenerated, they'll work with JSON format automatically
- No special handling needed for newer vs older reports
- Version field in metadata allows future format evolution

## 6. Client Implementation Examples

### JavaScript/Fetch
```javascript
async function getMarketingReport(companyUrl) {
    // Extract domain from any URL format
    const url = new URL(companyUrl);
    const domain = url.searchParams.get('company') || url.hostname;
    
    // Build API URL (clean URL structure)
    const apiUrl = `https://ignite.edwinlovett.com/research/?company=${encodeURIComponent(domain)}&format=json`;
    
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.success) {
            console.log('Company:', data.report.companyInfo.name);
            console.log('Industry:', data.report.companyInfo.industry);
            console.log('Cached:', data.cache_age_days, 'days ago');
            return data.report;
        } else {
            console.error('Error:', data.error);
            return null;
        }
    } catch (error) {
        console.error('Failed to fetch report:', error);
        return null;
    }
}

// Usage
getMarketingReport('https://ignite.edwinlovett.com/research/?company=californiaclosets.com');
// Or just domain
getMarketingReport('californiaclosets.com');
```

### Python
```python
import requests
from urllib.parse import urlparse, parse_qs

def get_marketing_report(company_url):
    # Extract domain from URL
    if company_url.startswith('http'):
        parsed = urlparse(company_url)
        domain = parse_qs(parsed.query).get('company', [parsed.netloc])[0]
    else:
        domain = company_url
    
    # Build API URL
    api_url = f"https://ignite.edwinlovett.com/research/"
    params = {
        'company': domain,
        'format': 'json'
    }
    
    try:
        response = requests.get(api_url, params=params)
        data = response.json()
        
        if data['success']:
            print(f"Company: {data['report']['companyInfo']['name']}")
            print(f"Cached: {data['cache_age_days']} days ago")
            return data['report']
        else:
            print(f"Error: {data['error']}")
            return None
    except Exception as e:
        print(f"Failed to fetch report: {e}")
        return None

# Usage
report = get_marketing_report('californiaclosets.com')
```

### cURL
```bash
# Simple cURL command
curl "https://ignite.edwinlovett.com/research/?company=californiaclosets.com&format=json" | jq .

# With error handling
#!/bin/bash
DOMAIN="californiaclosets.com"
RESPONSE=$(curl -s "https://ignite.edwinlovett.com/research/?company=${DOMAIN}&format=json")

if [ $? -eq 0 ]; then
    echo "$RESPONSE" | jq '.report.companyInfo'
else
    echo "Failed to fetch report"
fi
```

### PHP Integration
```php
function getMarketingReport($companyUrl) {
    // Extract domain
    $parsed = parse_url($companyUrl);
    parse_str($parsed['query'] ?? '', $params);
    $domain = $params['company'] ?? $parsed['host'] ?? $companyUrl;
    
    // Build API URL
    $apiUrl = 'https://ignite.edwinlovett.com/research/?' . http_build_query([
        'company' => $domain,
        'format' => 'json'
    ]);
    
    // Fetch with timeout
    $context = stream_context_create([
        'http' => [
            'timeout' => 10,
            'header' => 'User-Agent: Marketing-Analysis/1.0'
        ]
    ]);
    
    $response = @file_get_contents($apiUrl, false, $context);
    
    if ($response === false) {
        return ['error' => 'Failed to fetch report'];
    }
    
    $data = json_decode($response, true);
    
    if ($data['success']) {
        return $data['report'];
    }
    
    return ['error' => $data['error'] ?? 'Unknown error'];
}
```

## 7. Use Cases

### A. Campaign Performance Analysis
```javascript
// Combine report data with campaign metrics
async function analyzeCampaignWithContext(campaignData, companyDomain) {
    const report = await getMarketingReport(companyDomain);
    
    return {
        campaign: campaignData,
        context: {
            industry: report.companyInfo.industry,
            competitors: report.competitorAnalysis,
            marketPosition: report.marketingInsights,
            socialPresence: report.socialMedia
        }
    };
}
```

### B. AI Context Enrichment
```javascript
// Provide context to AI for better analysis
async function getAIContext(domain) {
    const report = await getMarketingReport(domain);
    
    const context = `
Company: ${report.companyInfo.name}
Industry: ${report.companyInfo.industry}
Key Competitors: ${report.competitorAnalysis.map(c => c.name).join(', ')}
Marketing Focus: ${report.marketingInsights.summary}
    `;
    
    return context;
}
```

### C. Bulk Reporting Dashboard
```javascript
// Fetch multiple reports for portfolio analysis
async function getPortfolioReports(domains) {
    const reports = await Promise.all(
        domains.map(domain => getMarketingReport(domain))
    );
    
    return reports.filter(r => r !== null);
}
```

## 8. Future Enhancements

### Version 1.1
- Add `fields` parameter to select specific report sections
- Example: `&format=json&fields=companyInfo,competitors`

### Version 1.2
- Webhook support for report updates
- GraphQL endpoint for flexible queries
- Batch API for multiple domains

### Version 2.0
- API key authentication
- Usage analytics per API key
- Rate limiting per API key
- Paid tier with higher limits

## 9. Testing Checklist

### Pre-Launch Testing
- [ ] JSON format returns valid JSON
- [ ] HTML format still works (backward compatibility)
- [ ] Contact data properly excluded
- [ ] Error responses in JSON format
- [ ] CORS headers properly set
- [ ] Cache headers appropriate
- [ ] Rate limiting applies to JSON requests

### Integration Testing
- [ ] JavaScript client works
- [ ] Python client works
- [ ] cURL examples work
- [ ] Error handling works correctly
- [ ] Domain extraction from various URL formats

## 10. Documentation Updates Needed

### Files to Update
1. `README.md` - Add API section
2. `CLAUDE.md` - Document JSON endpoint
3. Create `API.md` - Dedicated API documentation
4. Update main application to show API access info

### Example API Documentation
```markdown
## API Access

Get cached reports in JSON format:

```
GET /research/?company={domain}&format=json
```

Returns marketing research data excluding personal information.

### Parameters
- `company` (required): Domain name to retrieve report for
- `format` (optional): Response format, `json` or `html` (default)

### Response
- `200 OK`: Cached report found and returned
- `404 Not Found`: No cached report exists
- `429 Too Many Requests`: Rate limit exceeded
```

## Implementation Timeline

### Day 1
- Implement core JSON response functionality
- Add data sanitization functions
- Test with existing cached reports

### Day 2
- Add error handling for JSON format
- Implement CORS headers
- Create client examples

### Day 3
- Testing and debugging
- Documentation updates
- Deploy to production

## Risk Assessment

### Low Risk ✅
- No database changes needed
- Backward compatible
- Uses existing infrastructure
- Simple implementation

### Mitigations
- Thorough testing before deployment
- Monitor initial API usage
- Quick rollback plan if issues arise
- Rate limiting prevents abuse

## Success Metrics

### Week 1
- Zero breaking changes to existing functionality
- Successful JSON responses for all cached reports
- No PII leakage in JSON responses

### Month 1
- Track API usage patterns
- Monitor performance impact
- Gather user feedback for improvements

### Quarter 1
- Evaluate need for authentication
- Consider premium features
- Plan v2.0 enhancements based on usage