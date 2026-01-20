# Tavily Search Integration

Service documentation for Tavily Search API integration in Schema Curator.

**Last Updated**: 2025-01-20

---

## Overview

Used by the Schema Curator Research mode to gather industry intelligence:
- Digital advertising benchmarks
- Seasonality patterns
- Buyer personas
- Industry insights

## Configuration

### Environment Variable
```bash
# Set via wrangler secret
wrangler secret put TAVILY_API_KEY
```

### Client Location
`workers/src/services/curator/webResearch.ts`

## Usage

### Basic Search
```typescript
async function tavilySearch(
  apiKey: string,
  query: string,
  options?: {
    include_answer?: boolean
    include_domains?: string[]
    max_results?: number
  }
): Promise<TavilySearchResult>
```

### Specialized Search Functions

| Function | Purpose | Domain Focus |
|----------|---------|--------------|
| `searchBenchmarks()` | CPC, CPA, CTR benchmarks | wordstream.com, hubspot.com, statista.com |
| `searchSeasonality()` | Peak/slow periods | General search |
| `searchBuyerPersonas()` | Target audience insights | General search |
| `searchIndustryInsights()` | Market trends | emarketer.com, statista.com |

### Aggregated Research
```typescript
const research = await conductIndustryResearch(env, {
  industry_name: 'Electric Services',
  company_name: 'Acme Electric', // optional
  include_benchmarks: true,
  include_seasonality: true,
  include_buyer_notes: true,
  include_insights: true,
})
```

## API Response Format

```typescript
interface TavilySearchResult {
  answer?: string       // AI-synthesized answer
  results: {
    title: string
    url: string
    content: string     // Relevant snippet
    score: number       // Relevance score
  }[]
}
```

## Domain Whitelist

Trusted domains are stored in `curator_domain_whitelist` table:
- `meta.com`, `google.com` - Authoritative (platform docs)
- `wordstream.com`, `hubspot.com` - Standard (benchmarks)
- `statista.com`, `emarketer.com` - Authoritative (research)

## Rate Limits & Costs

- **Free Tier**: 1,000 searches/month
- **Rate Limit**: 100 requests/minute
- **Response**: Includes up to 10 results per query

## Error Handling

```typescript
const response = await fetch('https://api.tavily.com/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    api_key: apiKey,
    query,
    include_answer: true,
    max_results: 5,
  }),
})

if (!response.ok) {
  throw new Error(`Tavily search failed: ${response.status}`)
}
```

## References

- [Tavily Documentation](https://docs.tavily.com)
- [Tavily API Reference](https://docs.tavily.com/api-reference)
