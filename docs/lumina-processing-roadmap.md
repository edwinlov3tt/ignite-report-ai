# Lumina Data Processing Roadmap

## Overview

This document outlines strategies for improving how Report.AI processes and displays Lumina campaign data, including an AI-powered system for automatic extractor discovery.

---

## 1. AI-Powered Backend System: Schema Intelligence Agent

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    LUMINA DATA INGESTION                        │
│                                                                 │
│  Raw Lumina JSON ──► Field Discovery Agent (Haiku) ──► Schema  │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ 1. FIELD DISCOVERY                                          │
│  │    • Scan all unique field paths in lineItems              │
│  │    • Identify nested objects (tactics.aat, audience, etc)  │
│  │    • Track field frequency across line items               │
│  └─────────────────────────────────────────────────────────────┘
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ 2. VALUE ANALYSIS (Haiku - fast, cheap)                    │
│  │    • Detect data types (string, number, date, array)       │
│  │    • Identify patterns (emails, URLs, IDs, currencies)     │
│  │    • Sample unique values for each field                   │
│  │    • Score relevance: "Is this useful for analysis?"       │
│  └─────────────────────────────────────────────────────────────┘
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ 3. EXTRACTOR SUGGESTION                                     │
│  │    Compare discovered fields against existing extractors:  │
│  │    • Match: "totalBudget" → existing "budget" extractor    │
│  │    • New: "cbContractedItems" → suggest new extractor      │
│  │    • Conditional: "tactics.aat" → when product=Display     │
│  └─────────────────────────────────────────────────────────────┘
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ 4. AUTO-GENERATE EXTRACTOR CONFIGS                         │
│  │    {                                                        │
│  │      "name": "contracted_views",                            │
│  │      "path": "cbContractedItems",                          │
│  │      "when_conditions": { "kpi": "CPV" },                  │
│  │      "aggregate_type": "sum",                              │
│  │      "description": "Total contracted video views"         │
│  │    }                                                        │
│  └─────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Components

#### A. Field Discovery Worker

Runs automatically on each Lumina fetch to discover new fields.

```typescript
interface FieldStats {
  path: string           // e.g., "tactics.aat.aatSegment1"
  count: number          // How many line items have this field
  types: Set<string>     // Data types found (string, number, etc.)
  samples: any[]         // Sample values (max 5)
  isNested: boolean      // Is this inside an object/array
  frequency: number      // Percentage of line items with this field
}

async function discoverFields(lineItems: any[]): Promise<FieldStats[]> {
  const fieldMap = new Map<string, FieldStats>()

  for (const item of lineItems) {
    walkObject(item, '', (path, value) => {
      const stats = fieldMap.get(path) || {
        path,
        count: 0,
        types: new Set(),
        samples: [],
        isNested: path.includes('.'),
        frequency: 0
      }
      stats.count++
      stats.types.add(typeof value)
      if (stats.samples.length < 5 && !stats.samples.includes(value)) {
        stats.samples.push(value)
      }
      fieldMap.set(path, stats)
    })
  }

  // Calculate frequency
  for (const stats of fieldMap.values()) {
    stats.frequency = stats.count / lineItems.length
  }

  return Array.from(fieldMap.values())
}

function walkObject(obj: any, prefix: string, callback: (path: string, value: any) => void) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      walkObject(value, path, callback)
    } else {
      callback(path, value)
    }
  }
}
```

#### B. AI Relevance Scoring (Claude Haiku)

Fast, cheap model to score field relevance for marketing analysis.

```typescript
const HAIKU_PROMPT = `
You are analyzing Lumina campaign management data fields for a marketing analytics platform.

Fields discovered from campaign line items:
{{FIELDS}}

For each field, evaluate:
1. **Relevance Score (0-10)**: How useful is this for campaign performance analysis?
   - 10: Critical metric (budget, impressions, clicks, conversions)
   - 7-9: Important context (dates, platforms, targeting)
   - 4-6: Useful metadata (names, IDs, status)
   - 1-3: Internal/system fields
   - 0: Not useful for analysis

2. **Extractor Name**: snake_case name for the extractor (e.g., "total_budget", "contracted_impressions")

3. **Aggregation Type**: How to combine values across line items
   - sum: Add up (budgets, impressions)
   - avg: Average (rates, percentages)
   - first: Take first value (campaign name, company)
   - last: Take most recent
   - concat: Combine strings
   - unique: Collect unique values

4. **Conditions**: When to extract (always, or specific conditions)
   - "always" - extract for all line items
   - {"product": "YouTube"} - only when product is YouTube
   - {"kpi": "CPV"} - only for CPV campaigns

Respond in JSON format:
{
  "suggestions": [
    {
      "path": "field.path",
      "relevance": 8,
      "extractor_name": "suggested_name",
      "aggregation": "sum",
      "conditions": "always",
      "description": "Brief description of what this extracts"
    }
  ]
}

Focus on fields that would help with:
- Budget analysis and spend tracking
- Performance metrics (impressions, clicks, views, conversions)
- Targeting information (audience, geo, keywords)
- Campaign structure (products, tactics, platforms)
- Timeline and pacing
`

async function scoreFieldRelevance(fields: FieldStats[]): Promise<ExtractorSuggestion[]> {
  const fieldsSummary = fields
    .filter(f => f.frequency > 0.1) // Only fields in >10% of items
    .map(f => `- ${f.path}: ${Array.from(f.types).join('|')} (${Math.round(f.frequency * 100)}% coverage, samples: ${f.samples.slice(0, 3).join(', ')})`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: HAIKU_PROMPT.replace('{{FIELDS}}', fieldsSummary)
    }]
  })

  return JSON.parse(response.content[0].text).suggestions
}
```

#### C. Extractor Auto-Generation

```typescript
interface SuggestedExtractor {
  name: string
  path: string
  when_conditions?: Record<string, string | string[]>
  aggregate_type: 'sum' | 'avg' | 'first' | 'last' | 'concat' | 'unique'
  description: string
  confidence: number      // AI confidence score (0-1)
  is_new: boolean         // True if no matching existing extractor
  existing_match?: string // Name of existing extractor if matched
}

async function generateExtractorConfigs(
  suggestions: ExtractorSuggestion[],
  existingExtractors: LuminaExtractor[]
): Promise<SuggestedExtractor[]> {
  const results: SuggestedExtractor[] = []

  for (const suggestion of suggestions) {
    // Check for existing extractor match
    const existingMatch = existingExtractors.find(e =>
      e.path === suggestion.path ||
      e.name === suggestion.extractor_name ||
      similarity(e.name, suggestion.extractor_name) > 0.8
    )

    results.push({
      name: suggestion.extractor_name,
      path: suggestion.path,
      when_conditions: suggestion.conditions === 'always' ? undefined : suggestion.conditions,
      aggregate_type: suggestion.aggregation,
      description: suggestion.description,
      confidence: suggestion.relevance / 10,
      is_new: !existingMatch,
      existing_match: existingMatch?.name
    })
  }

  return results.filter(r => r.confidence >= 0.5) // Only return confident suggestions
}
```

### Database Schema for Extractor Suggestions

```sql
CREATE TABLE lumina_extractor_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  suggested_name TEXT NOT NULL,
  aggregation_type TEXT NOT NULL,
  when_conditions JSONB,
  description TEXT,
  confidence FLOAT NOT NULL,
  is_new BOOLEAN NOT NULL,
  existing_match TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  source_order_id TEXT -- Which order triggered this suggestion
);

CREATE TABLE lumina_field_discovery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  fields_discovered INTEGER NOT NULL,
  new_fields INTEGER NOT NULL,
  field_stats JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Admin UI for Reviewing Suggestions

```
┌─────────────────────────────────────────────────────────────────┐
│ Lumina Extractor Suggestions                    [Auto-Approve] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  NEW SUGGESTIONS (3)                                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 📊 contracted_views                           Confidence: 92%│
│  │ Path: cbContractedItems                                    │ │
│  │ Aggregation: sum | Conditions: when kpi = "CPV"           │ │
│  │ "Total contracted video views for CPV campaigns"          │ │
│  │                                                            │ │
│  │ [✓ Approve] [✗ Reject] [Edit] [Preview Data]              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 📊 geo_radius                                 Confidence: 78%│
│  │ Path: tactics.geo.geoRadius                               │ │
│  │ Aggregation: first | Conditions: when tactics.geo exists  │ │
│  │ "Geofencing radius for GEO targeted campaigns"            │ │
│  │                                                            │ │
│  │ [✓ Approve] [✗ Reject] [Edit] [Preview Data]              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  MATCHED TO EXISTING (5)                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ✓ totalBudget → budget (existing)                         │ │
│  │ ✓ contractedImpressions → impressions (existing)          │ │
│  │ ✓ startDate → flight_start (existing)                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Processing Improvements

### Key Fields to Extract

| Lumina Field | Display Name | Type | Aggregation | Notes |
|-------------|--------------|------|-------------|-------|
| `product` | Product | string | group | Primary grouping |
| `subProduct` | Sub-Product | string | group | Secondary grouping |
| `tacticTypeSpecial` | Tactics | string/array | unique | Can be array! |
| `totalBudget` | Total Budget | number | sum | Campaign total |
| `monthlyBudget` | Monthly Budget | number | sum | Per month |
| `adjustedTotalBudget` | Adjusted Budget | number | sum | After changes |
| `startDate` | Start Date | date | min | Earliest |
| `endDate` | End Date | date | max | Latest |
| `platforms` | Platform | string | unique | Madhive, Google, etc |
| `kpi` | KPI | string | unique | CPM, CPV, CTR |
| `contractedImpressions` | Impressions Goal | number | sum | Display/Video |
| `cbContractedItems` | Views/Clicks Goal | number | sum | CPV/CPC |
| `cpm` | CPM Rate | number | avg | Cost per 1000 |
| `status` | Status | string | mode | Live, Pending, etc |
| `campaignInitiative` | Initiative | string | group | Sub-campaign |
| `displayName` | Display Name | string | first | Human-readable |
| `geoTargetingType` | Geo Type | string | unique | Zip, DMA, etc |
| `tactics.aat` | AAT Targeting | object | extract | Audience segments |
| `tactics.kwt` | Keyword Targeting | object | extract | Keyword segments |
| `tactics.geo` | Geo Targeting | object | extract | Address files |

### Handling Complex Fields

#### tacticTypeSpecial (String OR Array)
```typescript
function normalizeTacticTypes(value: string | string[] | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  return [value]
}

// Usage
const tactics = normalizeTacticTypes(lineItem.tacticTypeSpecial)
// "AAT" → ["AAT"]
// ["AAT", "KWT", "GEO"] → ["AAT", "KWT", "GEO"]
```

#### Nested Tactics Object
```typescript
interface TacticsData {
  aat?: {
    aatSegment1?: { details: string }
    splitNames?: Array<{ type: string; name: string }>
  }
  kwt?: {
    kwtSegment1?: string
    kwtSegmentDetails1?: string
    splitNames?: Array<{ type: string; name: string }>
  }
  geo?: {
    geoRadius?: string
    addressFile?: Array<{ originalFileName: string }>
    splitNames?: Array<{ type: string; name: string }>
  }
}

function extractTacticsInfo(tactics: TacticsData): TacticsSummary {
  return {
    hasAAT: !!tactics.aat,
    hasKWT: !!tactics.kwt,
    hasGEO: !!tactics.geo,
    aatSegments: tactics.aat?.aatSegment1?.details,
    kwtKeywords: tactics.kwt?.kwtSegmentDetails1,
    geoRadius: tactics.geo?.geoRadius,
    tacticTypes: [
      tactics.aat && 'AAT',
      tactics.kwt && 'KWT',
      tactics.geo && 'GEO'
    ].filter(Boolean)
  }
}
```

---

## 3. Derived Metrics

Calculate additional useful metrics from raw data:

```typescript
interface DerivedMetrics {
  // Budget metrics
  budgetPerDay: number           // totalBudget / campaignDays
  budgetPerMonth: number         // totalBudget / campaignMonths

  // Efficiency metrics
  costPerThousand: number        // totalBudget / (impressions / 1000)
  impressionsPerDollar: number   // impressions / totalBudget

  // Campaign structure
  campaignDays: number           // endDate - startDate
  campaignMonths: number         // Rounded months

  // Pacing
  dailyImpressionGoal: number    // contractedImpressions / campaignDays
  weeklyBudgetGoal: number       // totalBudget / campaignWeeks
}

function calculateDerivedMetrics(lineItem: LuminaLineItem): DerivedMetrics {
  const startDate = new Date(lineItem.startDate)
  const endDate = new Date(lineItem.endDate)
  const campaignDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
  const campaignMonths = campaignDays / 30

  const impressions = lineItem.contractedImpressions || 0
  const budget = lineItem.totalBudget || 0

  return {
    budgetPerDay: budget / campaignDays,
    budgetPerMonth: budget / campaignMonths,
    costPerThousand: impressions > 0 ? (budget / impressions) * 1000 : 0,
    impressionsPerDollar: budget > 0 ? impressions / budget : 0,
    campaignDays,
    campaignMonths: Math.round(campaignMonths),
    dailyImpressionGoal: impressions / campaignDays,
    weeklyBudgetGoal: budget / (campaignDays / 7)
  }
}
```

---

## 4. Implementation Phases

### Phase 1: UI Improvements ✅ COMPLETE
- [x] Grouped tactic cards view
- [x] Budget summary per product group
- [x] Status badges with color coding
- [x] Collapse/expand for initiatives
- [x] Quick stats bar

### Phase 2: Field Discovery System ✅ COMPLETE
- [x] Create field discovery worker function
- [x] Log discovered fields to database
- [x] Track new/changed fields over time
- [x] Alert when new fields appear (via /field-discovery/new endpoint)

### Phase 3: AI Extractor Suggestions ✅ COMPLETE
- [x] Implement Haiku relevance scoring
- [x] Auto-generate extractor configs
- [x] Create API routes for admin review
- [x] Build approval workflow (approve/reject/bulk-approve/export)

### Phase 4: Continuous Learning
- [ ] Track which extractors are actually used
- [ ] Feedback loop: approved suggestions improve AI
- [ ] Auto-approve high-confidence suggestions
- [ ] Deprecate unused extractors

---

## 5. API Endpoints

### New Endpoints Needed

```typescript
// Field Discovery
POST /api/lumina/discover-fields
Body: { orderId: string }
Response: { fields: FieldStats[], newFields: string[] }

// Get Extractor Suggestions
GET /api/extractors/suggestions
Query: { status?: 'pending' | 'approved' | 'rejected' }
Response: { suggestions: SuggestedExtractor[] }

// Approve/Reject Suggestion
POST /api/extractors/suggestions/:id/review
Body: { action: 'approve' | 'reject', modifications?: Partial<Extractor> }

// Preview Extractor Data
POST /api/extractors/preview
Body: { path: string, conditions?: object, orderId: string }
Response: { values: any[], count: number }
```

---

## 6. Cost Estimates

### Haiku Usage for Field Scoring
- ~500 tokens input per request (field list)
- ~1000 tokens output (JSON response)
- Cost: ~$0.0004 per request
- If run on every unique order: ~$0.40 per 1000 orders

### Storage
- Field discovery logs: ~1KB per order
- Extractor suggestions: ~500 bytes each
- Minimal storage impact

---

## Notes

- The Haiku model is ideal for this task: fast, cheap, good at structured output
- Field discovery should be incremental (only log new fields)
- Admin review is important initially; can auto-approve once confident
- Consider versioning extractors for backwards compatibility
