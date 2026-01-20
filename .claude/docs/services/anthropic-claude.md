# Anthropic Claude Integration

## Overview

| | |
|---|---|
| **Service** | Anthropic Claude API |
| **Purpose** | AI-powered campaign performance analysis |
| **Documentation** | [docs.anthropic.com](https://docs.anthropic.com) |
| **Dashboard** | [console.anthropic.com](https://console.anthropic.com) |

## Configuration

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `ANTHROPIC_API_KEY` | API authentication key | Yes |

### Setup
1. Create account at console.anthropic.com
2. Generate API key in dashboard
3. Add to Vercel environment variables: `ANTHROPIC_API_KEY`

## Implementation

### Files
- `api/analyze.ts` - Serverless function that calls Claude API

### SDK
- **Package**: `@anthropic-ai/sdk`
- **Version**: `^0.71.2`

### Initialization
```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  temperature: 0.5,
  messages: [{ role: 'user', content: prompt }],
})
```

## Usage Examples

### Campaign Analysis
```typescript
// From api/analyze.ts
const message = await anthropic.messages.create({
  model: config.model || 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  temperature: config.temperature || 0.5,
  messages: [{ role: 'user', content: prompt }],
})

const content = message.content[0]
const responseText = content.type === 'text' ? content.text : ''
```

## Available Models

| Model | Purpose | Notes |
|-------|---------|-------|
| `claude-sonnet-4-20250514` | Default analysis model | Good balance of speed/quality |
| `claude-opus-4-20250514` | Premium model | Higher quality, slower |

## Rate Limits & Quotas

| Operation | Limit |
|-----------|-------|
| Requests per minute | Varies by tier |
| Input tokens | 200K (Sonnet 4) |
| Output tokens | 4096 (configured) |

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| 401 | Invalid API key | Check `ANTHROPIC_API_KEY` env var |
| 429 | Rate limited | Implement exponential backoff |
| 500 | API error | Retry with backoff |
| `overloaded_error` | High demand | Retry after delay |

## Monitoring

- **Logs**: Vercel function logs
- **Metrics**: Anthropic console usage dashboard
- **Alerts**: Set up in Anthropic console

## Cost Considerations

- Current tier: Pay-as-you-go
- Cost drivers: Token usage (input + output)
- Estimate: ~$0.003 per 1K input tokens (Sonnet 4)

## Known Issues

- Streaming not implemented (shows loading spinner during generation)
- Long analyses may timeout on Vercel free tier

## Changelog

- 2025-01-XX: Initial integration with Claude Sonnet 4
