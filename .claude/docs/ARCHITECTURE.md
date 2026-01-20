# Architecture Overview

System design and technical reference for Report.AI.

**Last Updated**: 2025-01-19

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React 19.2 + TypeScript 5.9 | Single Page Application with React Router |
| UI Framework | Tailwind CSS 4.1 | Design tokens via CSS variables |
| State Management | Zustand 5.0 | Persisted to localStorage |
| Build Tool | Vite 7.3 | HMR, path aliases (@/), dev proxy |
| Backend (Primary) | Cloudflare Workers + Hono | Edge functions with KV & R2 storage |
| Backend (Legacy) | Vercel Serverless Functions | TypeScript handlers (fallback) |
| Database | Supabase (PostgreSQL) | Primary data store with RLS |
| AI | Anthropic Claude API | Sonnet 4, Opus 4, Haiku models |
| External API | Lumina API | Campaign data extraction |
| Hosting | Vercel (frontend) / Cloudflare (API) | SPA + Edge workers |

---

## Directory Structure

```
report-ai/
├── src/                           # Frontend source
│   ├── App.tsx                    # Main app with routing and error modal
│   ├── main.tsx                   # React entry point with BrowserRouter
│   ├── index.css                  # Global styles and design tokens (~12K lines)
│   ├── components/
│   │   ├── Layout.tsx             # App layout with header/footer
│   │   ├── ProgressStepper.tsx    # 5-step wizard navigation
│   │   ├── Footer.tsx             # App footer
│   │   ├── steps/                 # Wizard step components
│   │   │   ├── StepCampaign.tsx   # Step 1: Campaign data input
│   │   │   ├── StepTimeRange.tsx  # Step 2: Date range selection
│   │   │   ├── StepCompany.tsx    # Step 3: Company configuration
│   │   │   ├── StepPerformance.tsx # Step 4: File upload & sorting
│   │   │   └── StepAnalysis.tsx   # Step 5: AI analysis
│   │   └── admin/                 # Admin UI components
│   │       ├── AdminLayout.tsx    # Admin page layout with sidebar
│   │       ├── AdminSidebar.tsx   # Navigation sidebar
│   │       ├── DataTable.tsx      # Reusable data tables
│   │       ├── Modal.tsx          # Modal dialog component
│   │       └── ...                # Form components, badges, etc.
│   ├── pages/
│   │   ├── HomePage.tsx           # Main wizard page
│   │   ├── SectionsManagerPage.tsx # Report sections editor
│   │   ├── AITestingPage.tsx      # AI prompt testing sandbox
│   │   └── admin/                 # Schema Admin pages
│   │       ├── AdminOverviewPage.tsx
│   │       ├── ProductsPage.tsx
│   │       ├── PlatformsPage.tsx
│   │       ├── IndustriesPage.tsx
│   │       ├── SoulDocumentsPage.tsx
│   │       └── ImportExportPage.tsx
│   ├── store/
│   │   └── useAppStore.ts         # Zustand store with persistence
│   ├── lib/
│   │   ├── fileParser.ts          # CSV parsing (Papa Parse) + ZIP (JSZip)
│   │   ├── supabase.ts            # Supabase client config
│   │   ├── schemaApi.ts           # Schema CRUD API client
│   │   ├── platformsApi.ts        # Platforms API client
│   │   ├── industriesApi.ts       # Industries API client
│   │   ├── soulDocumentsApi.ts    # Soul Documents API client
│   │   └── importExport/          # CSV import/export utilities
│   ├── config/
│   │   └── api.ts                 # API endpoint configuration
│   └── types/
│       ├── index.ts               # Main type definitions
│       └── admin.ts               # Admin-specific types
├── workers/                       # Cloudflare Workers backend
│   ├── src/
│   │   ├── index.ts               # Hono router entry point
│   │   ├── routes/
│   │   │   ├── analyze.ts         # Claude AI analysis endpoint
│   │   │   ├── lumina.ts          # Lumina API proxy
│   │   │   ├── schema.ts          # Schema data endpoints
│   │   │   ├── reports.ts         # Report storage (R2)
│   │   │   ├── feedback.ts        # Report feedback
│   │   │   └── admin/             # Admin routes
│   │   ├── services/
│   │   │   ├── anthropic.ts       # Claude API client with caching
│   │   │   ├── supabase.ts        # Supabase database client
│   │   │   └── sync.ts            # DB-to-KV sync service
│   │   ├── storage/
│   │   │   ├── kv.ts              # KV namespace operations
│   │   │   └── r2.ts              # R2 bucket operations
│   │   ├── context/
│   │   │   └── assembler.ts       # Context assembly for AI
│   │   └── types/
│   │       └── bindings.ts        # Env type definitions
│   └── wrangler.toml              # Cloudflare config
├── api/                           # Vercel serverless (legacy fallback)
│   ├── analyze.ts                 # Claude AI analysis
│   └── lumina.ts                  # Lumina API proxy
├── migrations/                    # Database migrations
│   ├── 001_create_platforms.sql
│   ├── 002_create_industries.sql
│   ├── 003_create_soul_documents.sql
│   ├── 005_performance_tables.sql
│   ├── 006_create_mediums.sql
│   └── 007_update_tactic_types.sql
├── supabase/                      # Supabase config
├── public/                        # Static assets
├── _legacy/                       # Original PHP/HTML application (reference)
└── .claude/                       # Claude Code configuration
    ├── commands/                  # Slash commands
    ├── docs/                      # Project documentation
    ├── agents/                    # Specialized agents
    └── skills/                    # Custom skills (report-ai-skill)
```

---

## Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `useAppStore` | Central state management with localStorage persistence | `src/store/useAppStore.ts` |
| `fileParser` | CSV parsing (Papa Parse) and ZIP extraction (JSZip) | `src/lib/fileParser.ts` |
| `StepCampaign` | Campaign ID input, Lumina API integration | `src/components/steps/StepCampaign.tsx` |
| `StepPerformance` | File upload, drag-drop, auto-sorting with Jaccard similarity | `src/components/steps/StepPerformance.tsx` |
| `StepAnalysis` | AI model selection, analysis generation | `src/components/steps/StepAnalysis.tsx` |
| `AdminLayout` | Schema admin page container with sidebar navigation | `src/components/admin/AdminLayout.tsx` |
| `anthropic.ts` | Claude API client with prompt caching | `workers/src/services/anthropic.ts` |
| `supabase.ts` | Database client for Supabase interactions | `workers/src/services/supabase.ts` |

---

## Data Flow

### Campaign Analysis Flow
```
1. User Input (Campaign ID)
       ↓
2. Lumina API (Worker: /lumina → api.edwinlovett.com/order)
       ↓
3. Campaign Data + Detected Tactics → Zustand Store
       ↓
4. User uploads CSV/ZIP files
       ↓
5. File Parser (Web Worker) → Auto-sort via Jaccard Similarity
       ↓
6. User configures analysis (model, tone, instructions)
       ↓
7. Claude API (Worker: /analyze → Anthropic)
       ↓
8. Report stored in R2, metadata in Supabase
       ↓
9. Analysis Results → Display in Markdown
```

### Schema Admin Flow
```
1. Frontend fetches schema data via API
       ↓
2. Worker reads from KV cache (fast) or Supabase (fallback)
       ↓
3. Admin makes changes via UI
       ↓
4. Changes written to Supabase
       ↓
5. Publish triggers KV cache sync
```

---

## External Services

| Service | Purpose | Docs |
|---------|---------|------|
| Anthropic Claude | AI-powered campaign analysis | [docs.anthropic.com](https://docs.anthropic.com) |
| Supabase | PostgreSQL database + auth | [supabase.com/docs](https://supabase.com/docs) |
| Cloudflare Workers | Edge API functions | [developers.cloudflare.com](https://developers.cloudflare.com) |
| Cloudflare KV | Key-value cache storage | Part of Workers |
| Cloudflare R2 | Object storage for reports | Part of Workers |
| Lumina API | Campaign data extraction | Internal API (edwinlovett.com) |
| Vercel | Frontend hosting | [vercel.com/docs](https://vercel.com/docs) |

---

## Environment Variables

### Frontend (Vite)
| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_WORKER_API_URL` | Cloudflare Worker base URL | No (has default) |
| `VITE_LEGACY_API_URL` | Legacy API fallback | No |

### Cloudflare Worker (Secrets via `wrangler secret put`)
| Variable | Purpose | Required |
|----------|---------|----------|
| `ANTHROPIC_API_KEY` | Claude API authentication | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Yes |
| `FALLBACK_DB_URL` | PostgreSQL fallback connection | No |

### Cloudflare Worker (wrangler.toml vars)
| Variable | Purpose | Value |
|----------|---------|-------|
| `ENVIRONMENT` | Runtime environment | production/development |
| `LUMINA_API_URL` | Lumina API endpoint | https://api.edwinlovett.com/order |

### KV Namespaces
| Binding | Purpose |
|---------|---------|
| `PLATFORMS_KV` | Cached platform data |
| `INDUSTRIES_KV` | Cached industry data |
| `SOUL_DOCS_KV` | Cached soul documents |
| `SCHEMA_KV` | Cached schema (products/subproducts/tactics) |
| `LUMINA_CACHE_KV` | Lumina API response cache |

### R2 Buckets
| Binding | Bucket Name | Purpose |
|---------|-------------|---------|
| `REPORTS_R2` | report-ai-reports | Generated report storage |

---

## Deployment

### Frontend (Vercel)
```bash
vercel --prod
```

Configuration in `vercel.json`:
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- SPA routing via rewrites

### Backend (Cloudflare Workers)
```bash
cd workers
npm run deploy        # Deploy to development
npm run deploy:prod   # Deploy to production
```

### Local Development
```bash
# Frontend
npm run dev          # Start dev server on port 3000
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint checks

# Workers
npm run worker:dev   # Start local worker dev server
npm run worker:setup # Initial setup (install, create KV & R2)
```

---

## Cron Jobs

The worker has a scheduled trigger configured in `wrangler.toml`:
- **Schedule**: `0 3 * * *` (3 AM UTC daily)
- **Purpose**: Sync all Supabase data to KV cache for fast reads

---

## Security Considerations

- **API Keys**: Stored in Cloudflare secrets (never in client code)
- **Database**: Supabase RLS policies + service key only in worker
- **Frontend DB Access**: Uses Supabase anon key with limited permissions
- **Input Validation**: Order ID validated as 24-char hex string
- **CORS**: Configured in Worker middleware (localhost, production domains)
- **State**: Campaign data persisted to localStorage (clear on sensitive operations)

---

## Performance

- **File Parsing**: Web Workers via Papa Parse prevent UI blocking on large CSVs
- **Edge Computing**: Cloudflare Workers provide <50ms latency globally
- **KV Caching**: Schema data cached in KV for fast reads, synced daily
- **Prompt Caching**: Claude API ephemeral cache for repeated context
- **State Persistence**: Selective state partitioning in Zustand (not persisting results)
- **Lazy Loading**: Admin pages separated from main wizard flow
- **Vite Build**: Tree-shaking, code splitting, sourcemaps enabled
