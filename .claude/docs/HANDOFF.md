# Developer Handoff Document

**Project**: Report.AI
**Generated**: 2025-01-21
**Repository**: https://github.com/edwinlov3tt/ignite-report-ai.git
**Branch**: main

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/edwinlov3tt/ignite-report-ai.git
cd report-ai
npm install

# Start frontend
npm run dev                    # http://localhost:3000

# Start worker (separate terminal)
cd workers
npm install
npm run dev                    # http://localhost:8787
```

### Required Environment Variables

**Cloudflare Workers** (`wrangler secret put`):
```
ANTHROPIC_API_KEY     # Claude API for AI analysis
OPENAI_API_KEY        # GPT-5.2 for Schema Curator
TAVILY_API_KEY        # Web research for industry data
SUPABASE_URL          # Database URL
SUPABASE_SERVICE_KEY  # Database service key
```

---

## Project Overview

Report.AI is a web application for analyzing digital marketing campaign performance using AI. It combines:

1. **Campaign Analysis Wizard** - 5-step workflow to analyze Lumina campaign data
2. **Schema Admin** - Manage platforms, industries, products, and AI prompts
3. **Schema Curator** - AI-powered system to research and enrich schema data

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite 7 |
| UI | Tailwind CSS 4 |
| State | Zustand (localStorage persistence) |
| Backend | Cloudflare Workers + Hono |
| Database | Supabase (PostgreSQL + pgvector) |
| AI - Analysis | Anthropic Claude (Sonnet 4, Opus 4) |
| AI - Curator | OpenAI GPT-5.2 + Tavily Search |
| Hosting | Vercel (frontend) + Cloudflare (API) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vercel)                         │
│  React 19 + Vite 7 + Tailwind CSS                               │
│  ├── Campaign Wizard (5 steps)                                   │
│  ├── Schema Admin (Products/Platforms/Industries)                │
│  └── Schema Curator (AI-powered research)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CLOUDFLARE WORKERS (API)                       │
│  Hono Framework + TypeScript                                     │
│  ├── /analyze          → Claude AI analysis                      │
│  ├── /lumina           → Campaign data proxy                     │
│  ├── /schema/*         → Schema CRUD operations                  │
│  ├── /curator/extract  → Smart extraction (semantic matching)    │
│  ├── /curator/research → Web research (Tavily + GPT synthesis)   │
│  └── /curator/commit   → Save entities with audit trail          │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Supabase   │    │ Cloudflare KV    │    │ Cloudflare R2   │
│ (PostgreSQL │    │ (Schema cache)   │    │ (Report storage)│
│ + pgvector) │    └──────────────────┘    └─────────────────┘
└─────────────┘
```

### Data Flow

**Campaign Analysis:**
```
User Input → Lumina API → File Upload → Jaccard Sorting → Claude Analysis → R2 Storage
```

**Schema Curator (Smart Mode):**
```
Content Input → Semantic Matching (pgvector) → GPT-5.2 Intent Detection → Action Proposals → Review → Commit
```

---

## Current State

### Recently Completed (2025-01-21)

**Schema Curator - Smart Extraction Mode**

Enhanced the Schema Curator to intelligently recognize when content should enrich existing entities vs. create new ones:

- **Semantic Matching**: Uses pgvector embeddings to find existing entities that match input content
- **Intent Detection**: Classifies intent as `enrichment`, `creation`, `mixed`, or `unclear`
- **Multi-Output Actions**: Single input can produce multiple actions (create + enrich + research)
- **Action Types**: `create_entity`, `update_field`, `add_enrichment`, `research_fill`
- **Enrichment Types**: `platform_quirk`, `industry_insight`, `platform_buyer_note`, `platform_kpi`

**Key Files Created/Modified:**
- `workers/src/services/curator/semanticMatch.ts` - Semantic entity matching
- `workers/src/services/curator/openai.ts` - Smart extraction prompts
- `workers/src/routes/curator/extract.ts` - Smart mode handler
- `workers/src/routes/curator/commit.ts` - Enrichment commit handlers
- `workers/src/types/curator.ts` - Type definitions
- `workers/migrations/009_curator_matching.sql` - pgvector match functions

### Active Work

None currently in progress.

### Known Issues

| Severity | Issue | Location |
|----------|-------|----------|
| MEDIUM | Streaming responses not implemented | `api/analyze.ts` |
| LOW | Industry insights/seasonality missing update functions | `industriesApi.ts` |
| LOW | Soul document versions cannot be deleted | `soulDocumentsApi.ts` |
| LOW | Legacy API proxy in development mode | `vite.config.ts` |

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| **Cloudflare Workers over Vercel** | Edge performance, native KV/R2, cron triggers |
| **Supabase over direct PostgreSQL** | Managed service, built-in auth, admin UI |
| **Hono over Express** | Purpose-built for Workers, lightweight |
| **OpenAI Structured Outputs** | Guaranteed valid JSON, no parsing errors |
| **Tavily over other search APIs** | Pre-processed answers, domain filtering |
| **JSONB columns for curator data** | Atomic updates, flexible schema evolution |

See `.claude/docs/DECISIONS.md` for full context on each decision.

---

## External Services

### Anthropic Claude
- **Purpose**: AI-powered campaign analysis
- **Models**: Sonnet 4, Opus 4, Haiku
- **Config**: `workers/src/services/anthropic.ts`
- **Features**: Prompt caching for repeated context

### OpenAI GPT-5.2
- **Purpose**: Schema Curator extraction and synthesis
- **Config**: `workers/src/services/curator/openai.ts`
- **Features**: Structured outputs with strict JSON schema

### Tavily Search
- **Purpose**: Web research for industry intelligence
- **Config**: `workers/src/services/curator/webResearch.ts`
- **Rate Limit**: 1,000 searches/month (free tier)

### Supabase
- **Purpose**: PostgreSQL database with pgvector
- **Dashboard**: https://supabase.com/dashboard
- **Extensions**: pgvector for semantic search

### Lumina API
- **Purpose**: Campaign data extraction
- **Endpoint**: https://api.edwinlovett.com/order
- **Response Cached**: In KV for 24 hours

---

## Environment Variables

### Cloudflare Worker Secrets

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API authentication |
| `OPENAI_API_KEY` | GPT-5.2 for Schema Curator |
| `TAVILY_API_KEY` | Tavily Search API |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |

### KV Namespaces (wrangler.toml)

| Binding | Purpose |
|---------|---------|
| `PLATFORMS_KV` | Cached platform data |
| `INDUSTRIES_KV` | Cached industry data |
| `SOUL_DOCS_KV` | Cached soul documents |
| `SCHEMA_KV` | Cached schema (products/subproducts) |
| `LUMINA_CACHE_KV` | Lumina API response cache |

### R2 Buckets

| Binding | Purpose |
|---------|---------|
| `REPORTS_R2` | Generated report storage |

---

## Development Workflow

### Frontend

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # ESLint checks
```

### Workers

```bash
cd workers
npm run dev           # Local development
npm run deploy        # Deploy to development
npm run deploy:prod   # Deploy to production
wrangler secret put X # Add secrets
wrangler tail         # Live logs
```

### Database

```bash
# Apply migrations manually in Supabase SQL editor
# Files in: workers/migrations/*.sql
```

### Testing the Curator

```bash
# Smart extraction test
curl -X POST http://localhost:8787/curator/extract \
  -H "Content-Type: application/json" \
  -d '{
    "content": "In the roofing industry, impression share for SEM is one of the most valuable insights",
    "content_type": "text",
    "mode": "smart"
  }'
```

---

## Deployment

### Frontend (Vercel)

```bash
vercel --prod
```

- Framework: Vite
- Build: `npm run build`
- Output: `dist`
- SPA routing via rewrites

### Backend (Cloudflare Workers)

```bash
cd workers
npm run deploy:prod
```

- Cron trigger: `0 3 * * *` (daily sync to KV)
- Production URL: `https://report-ai-api.edwin-6f1.workers.dev`

---

## Troubleshooting

### "Session not found" on Curator Extract
The session may have expired or never existed. Create a new session by omitting `session_id`.

### Semantic matching returns no results
Ensure embeddings are generated for platforms:
```bash
curl -X POST http://localhost:8787/embeddings/generate \
  -d '{"table": "platforms"}'
```

### OpenAI Structured Outputs Error
If you see "Missing property in required", ensure ALL properties in your JSON schema are listed in the `required` array when using `strict: true`.

### KV Cache Stale
Trigger manual sync:
```bash
curl -X POST https://report-ai-api.edwin-6f1.workers.dev/admin/sync
```

### Supabase Connection Issues
Check secrets are set correctly:
```bash
wrangler secret list
```

---

## Directory Structure

```
report-ai/
├── src/                    # Frontend source
│   ├── components/         # React components
│   │   ├── steps/          # Wizard step components
│   │   └── admin/          # Admin UI components
│   ├── pages/              # Page components
│   │   └── admin/          # Schema admin pages
│   ├── store/              # Zustand state
│   ├── lib/                # API clients, utilities
│   └── types/              # TypeScript types
├── workers/                # Cloudflare Workers backend
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   │   ├── curator/    # Schema Curator routes
│   │   │   └── admin/      # Admin routes
│   │   ├── services/       # Service layer
│   │   │   └── curator/    # Curator services
│   │   ├── storage/        # KV and R2 operations
│   │   └── types/          # Worker types
│   ├── migrations/         # SQL migrations
│   └── wrangler.toml       # Cloudflare config
├── api/                    # Vercel serverless (legacy fallback)
├── .claude/                # Claude Code configuration
│   ├── docs/               # Project documentation
│   │   ├── ARCHITECTURE.md
│   │   ├── CHANGELOG.md
│   │   ├── DECISIONS.md
│   │   ├── KNOWN_ISSUES.md
│   │   └── services/       # External service docs
│   └── commands/           # Slash commands
└── _legacy/                # Original PHP/HTML (reference only)
```

---

## Next Steps / Recommendations

### High Priority

1. **Implement Streaming Responses** - Analysis requests show no progress until complete. Add SSE streaming for Claude responses.

2. **Add RLS Policies to Supabase** - Currently using public schema without row-level security. Add policies for production security.

3. **Complete Curator Frontend** - The smart extraction backend is complete but the SchemaCuratorPage UI needs updating to display action-based results.

### Medium Priority

4. **Add Update Functions for Industry Insights/Seasonality** - Currently can only delete and re-add entries.

5. **Add Embedding Generation Cron** - Auto-generate embeddings for new entities on a schedule.

6. **Implement Research Mode UI** - Connect the Tavily-based research to the Curator frontend.

### Future Enhancements

7. **PowerPoint Upload Feature** - Plan exists at `.claude/plans/mellow-sauteeing-bengio.md` for PPTX table extraction.

8. **Multi-tenant Support** - Add organization/team isolation if needed.

---

## Documentation

| Document | Location |
|----------|----------|
| Architecture | `.claude/docs/ARCHITECTURE.md` |
| Changelog | `.claude/docs/CHANGELOG.md` |
| Decisions | `.claude/docs/DECISIONS.md` |
| Known Issues | `.claude/docs/KNOWN_ISSUES.md` |
| Supabase | `.claude/docs/services/supabase.md` |
| Cloudflare Workers | `.claude/docs/services/cloudflare-workers.md` |
| OpenAI | `.claude/docs/services/openai.md` |
| Tavily | `.claude/docs/services/tavily.md` |

---

## Contact

**Repository Owner**: Edwin Lovett
**Issues**: https://github.com/edwinlov3tt/ignite-report-ai/issues
