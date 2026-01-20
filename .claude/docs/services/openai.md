# OpenAI Integration

Service documentation for OpenAI GPT-5.2 integration in Schema Curator.

**Last Updated**: 2025-01-20

---

## Overview

Used by the Schema Curator for:
- Entity extraction from text/URLs
- Industry research synthesis
- Structured data generation

## Configuration

### Environment Variable
```bash
# Set via wrangler secret
wrangler secret put OPENAI_API_KEY
```

### Client Location
`workers/src/services/curator/openai.ts`

## Usage

### Structured Outputs
We use OpenAI's Structured Outputs feature with strict JSON schema:

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-5.2-2025-12-11',
  max_completion_tokens: 4096,
  temperature: 0.3,
  messages: [...],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'industry_research_result',
      strict: true,
      schema: {
        // JSON Schema with additionalProperties: false
      }
    }
  }
})
```

### Model
- **Model ID**: `gpt-5.2-2025-12-11`
- **Context**: 128K tokens
- **Features**: Structured outputs, function calling

## Endpoints Using OpenAI

| Endpoint | Purpose |
|----------|---------|
| `POST /curator/extract` | Extract entities from text/URL |
| `POST /curator/research` | Synthesize web research into structured data |

## Schema Definitions

### Industry Research Schema
Located in `workers/src/routes/curator/research.ts`:
- `industry` - Basic info (code, name, description, icon)
- `benchmarks` - CPC, CPA, CTR, CPM, ROAS ranges
- `seasonality` - Peak/slow months, quarterly trends
- `buyer_notes` - Targeting and persona notes
- `insights` - Array of topic/content/confidence

## Rate Limits & Costs

- **Rate Limit**: Tier-based (check OpenAI dashboard)
- **Estimated Cost**: ~$0.02 per research query (GPT-5.2)
- **Token Tracking**: Stored in `research_metadata.tokens_used`

## Error Handling

```typescript
try {
  const response = await openai.chat.completions.create(...)
} catch (error) {
  if (error instanceof OpenAI.APIError) {
    // Handle rate limits, auth errors, etc.
  }
}
```

## References

- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
