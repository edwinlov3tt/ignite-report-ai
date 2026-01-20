# Report.AI Cloudflare Worker

Backend API for Report.AI campaign analysis, running on Cloudflare Workers.

## Architecture

- **Cloudflare Workers** - Serverless edge runtime
- **Cloudflare KV** - Edge-cached context (platforms, industries, soul docs)
- **Cloudflare R2** - Report storage
- **Supabase** - PostgreSQL source of truth
- **Anthropic Claude** - AI analysis (Haiku for experts, Sonnet for synthesis)

## Quick Start

### Prerequisites

1. Cloudflare account with Workers enabled
2. Wrangler CLI installed globally: `npm install -g wrangler`
3. Supabase project created
4. Anthropic API key

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Login to Cloudflare
wrangler login

# 3. Create KV namespaces and R2 bucket
npm run kv:create
npm run r2:create

# 4. Update wrangler.toml with the KV namespace IDs from step 3

# 5. Set secrets
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY

# 6. Run database migration in Supabase Dashboard
# Copy migrations/001_initial_schema.sql into SQL Editor and run

# 7. Deploy
npm run deploy
```

## API Endpoints

### POST /analyze
Analyze campaign data with AI.

```json
{
  "campaignData": {
    "orderId": "12345",
    "orderName": "Q1 Campaign",
    "startDate": "2025-01-01",
    "endDate": "2025-03-31"
  },
  "companyConfig": {
    "companyName": "Acme Corp",
    "industry": "retail",
    "customInstructions": "Focus on ROAS"
  },
  "files": {
    "performance": { "data": [...], "headers": [...], "tactics": [...] }
  },
  "config": {
    "model": "claude-sonnet-4-20250514"
  }
}
```

### POST /lumina
Fetch campaign data from Lumina API with caching.

```json
{
  "orderId": "12345",
  "forceRefresh": false
}
```

### POST /feedback
Submit feedback on a generated report.

```json
{
  "reportId": "uuid",
  "feedbackType": "thumbs_up",
  "comment": "Very helpful analysis!"
}
```

### GET /reports/:id
Retrieve a stored report.

Query params:
- `metadata=true` - Return only metadata, not full content

### POST /admin/publish
Sync data from Supabase to KV.

```json
{
  "namespace": "platforms" | "industries" | "soul_docs" | "schema" | "all"
}
```

## Development

```bash
# Run locally
npm run dev

# Deploy to Cloudflare
npm run deploy

# View logs
npm run tail
```

## Project Structure

```
workers/
├── src/
│   ├── index.ts                 # Main Hono router
│   ├── types/
│   │   └── bindings.ts          # Env type definitions
│   ├── routes/
│   │   ├── analyze.ts           # POST /analyze
│   │   ├── lumina.ts            # POST /lumina
│   │   ├── feedback.ts          # POST /feedback
│   │   ├── reports.ts           # GET /reports/:id
│   │   └── admin/
│   │       └── publish.ts       # POST /admin/publish
│   ├── services/
│   │   ├── anthropic.ts         # Claude API client
│   │   └── supabase.ts          # Supabase client
│   ├── storage/
│   │   ├── kv.ts                # KV helpers
│   │   └── r2.ts                # R2 report storage
│   ├── context/
│   │   └── assembler.ts         # Context assembly logic
│   └── orchestrator/
│       └── router.ts            # Multi-agent routing
├── migrations/
│   └── 001_initial_schema.sql   # Supabase schema
├── wrangler.toml                # Cloudflare config
├── package.json
└── tsconfig.json
```

## Multi-Agent System

For complex campaigns (3+ tactics or 2+ platforms), the system uses a multi-agent approach:

1. **Complexity Assessment** - Evaluate campaign complexity
2. **Expert Selection** - Choose relevant expert agents
3. **Parallel Analysis** - Run Haiku-powered experts in parallel
4. **Synthesis** - Sonnet combines expert outputs into cohesive report

### Expert Agents

- **Paid Social Expert** - Facebook, Instagram, LinkedIn, TikTok, etc.
- **Search & SEM Expert** - Google Ads Search, PPC campaigns
- **Display & Programmatic Expert** - Banner, native, DSP campaigns
- **Video & CTV Expert** - YouTube, Connected TV, OTT
- **E-commerce & Retail Expert** - Amazon, shopping campaigns

## KV Key Patterns

```
PLATFORMS_KV:
  platform:{code}           → Full platform with nested quirks/kpis
  platforms:list            → ["facebook", "google_ads", ...]

INDUSTRIES_KV:
  industry:{code}           → Full industry with benchmarks/insights
  industries:list           → ["automotive", "retail", ...]

SOUL_DOCS_KV:
  soul_doc:{slug}           → Published version content
  soul_doc:{slug}:v{ver}    → Version-specific

SCHEMA_KV:
  schema:full               → Complete product/tactic hierarchy
  schema:tactic:{data_value} → Quick tactic lookup

LUMINA_CACHE_KV:
  lumina:{orderId}          → Cached Lumina response (10 min TTL)
```

## Environment Variables

Set in wrangler.toml `[vars]`:
- `ENVIRONMENT` - "development" or "production"
- `LUMINA_API_URL` - Lumina API endpoint

Set as secrets:
- `ANTHROPIC_API_KEY` - Claude API key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key
