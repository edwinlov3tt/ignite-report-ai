# Cloudflare Workers Integration

## Overview

| | |
|---|---|
| **Service** | Cloudflare Workers |
| **Purpose** | Primary API backend for Report.AI |
| **Documentation** | [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers) |
| **Dashboard** | [dash.cloudflare.com](https://dash.cloudflare.com) |

## Configuration

### Worker Configuration (`wrangler.toml`)

```toml
name = "report-ai-api"
main = "src/index.ts"
compatibility_date = "2025-01-15"
compatibility_flags = ["nodejs_compat"]
account_id = "6f162004d5bd40500b824a2f7f5a1a13"
```

### Secrets (via `wrangler secret put`)

| Variable | Purpose | Required |
|----------|---------|----------|
| `ANTHROPIC_API_KEY` | Claude API authentication | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Yes |
| `FALLBACK_DB_URL` | PostgreSQL fallback connection | No |

### Environment Variables (wrangler.toml [vars])

| Variable | Purpose | Value |
|----------|---------|-------|
| `ENVIRONMENT` | Runtime environment | production/development |
| `LUMINA_API_URL` | Lumina API endpoint | https://api.edwinlovett.com/order |

## KV Namespaces

| Binding | Namespace ID | Purpose |
|---------|-------------|---------|
| `PLATFORMS_KV` | ac01dea648864dfcaa08db74ddd62d29 | Cached platform data |
| `INDUSTRIES_KV` | a7935cf1de0545d48ae3b6964478ed2c | Cached industry data |
| `SOUL_DOCS_KV` | c0ac7f5b165945e3af670b89e314c835 | Cached soul documents |
| `SCHEMA_KV` | 8cdafb49808d42abad58d299cd7c722c | Cached schema |
| `LUMINA_CACHE_KV` | c8134f5a14514c56854840c5c009b18d | Lumina response cache |

## R2 Buckets

| Binding | Bucket Name | Purpose |
|---------|-------------|---------|
| `REPORTS_R2` | report-ai-reports | Generated report storage |

## Implementation

### Files
- `workers/src/index.ts` - Hono router entry point
- `workers/src/routes/*.ts` - API route handlers
- `workers/src/services/*.ts` - Service layer (Anthropic, Supabase)
- `workers/src/storage/*.ts` - KV and R2 operations
- `workers/wrangler.toml` - Cloudflare configuration

### Framework
- **Hono**: Lightweight web framework for Workers
- **Version**: `^4.7.0`

### Middleware
```typescript
app.use('*', cors({
  origin: (origin) => {
    if (origin?.startsWith('http://localhost:')) return origin
    const allowed = ['https://report-ai.vercel.app', 'https://report-ai.edwinlovett.com']
    return allowed.includes(origin) ? origin : allowed[0]
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))
app.use('*', logger())
app.use('*', prettyJSON())
```

## API Routes

### Main Routes
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Health check (returns service info) |
| GET | `/health` | Health status |
| POST | `/analyze` | AI campaign analysis |
| POST | `/lumina` | Lumina API proxy |
| POST | `/feedback` | Submit report feedback |
| GET | `/reports/:id` | Retrieve stored report |

### Schema Routes
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/schema/products` | Get all products |
| GET | `/schema/platforms` | Get all platforms |
| GET | `/schema/industries` | Get all industries |
| GET | `/schema/soul-docs` | Get soul documents |

### Admin Routes
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/admin/publish` | Sync Supabase to KV |
| POST | `/admin/sync` | Manual DB sync |
| GET | `/admin/sync/status` | Sync status |

## Cron Triggers

```toml
[triggers]
crons = ["0 3 * * *"]  # Daily at 3 AM UTC
```

**Purpose**: Automatically sync all Supabase data to KV cache for fast reads.

## Deployment

```bash
cd workers

# Development
npm run dev           # Local dev server

# Deployment
npm run deploy        # Deploy to development
npm run deploy:prod   # Deploy to production

# Setup
npm run kv:create     # Create all KV namespaces
npm run r2:create     # Create R2 bucket
```

## Worker URL

- **Production**: `https://report-ai-api.edwin-6f1.workers.dev`

## Error Handling

```typescript
app.onError((err, c) => {
  console.error(`Error: ${err.message}`, err.stack)
  return c.json({
    error: 'Internal Server Error',
    message: c.env.ENVIRONMENT === 'development' ? err.message : 'An error occurred',
  }, 500)
})
```

## Rate Limits

| Limit | Free Tier | Paid |
|-------|-----------|------|
| Requests/day | 100,000 | 10M+ |
| CPU time/request | 10ms | 50ms |
| KV reads/day | 100,000 | 10M+ |
| R2 Class A ops/mo | 1M | Unlimited |

## Monitoring

- **Logs**: Cloudflare dashboard → Workers → Logs
- **Analytics**: Cloudflare dashboard → Workers → Analytics
- **Real-time**: `wrangler tail` for live logs

## Known Issues

- Cold starts may add latency on first request (~50ms)
- KV eventually consistent (may see stale data briefly after writes)

## Changelog

- 2025-01-17: Initial Hono-based worker deployed
- 2025-01-17: Added cron trigger for daily sync
- 2025-01-18: Added admin routes for KV management
