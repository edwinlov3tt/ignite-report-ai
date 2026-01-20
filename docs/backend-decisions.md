# Backend Architecture Decisions & Questions

Before implementing the Cloudflare Workers backend with orchestrated prompt building, I need your input on the following decisions.

---

## 1. Infrastructure & Deployment

### Q1.1: Cloudflare vs Vercel Backend
The architecture guide suggests Cloudflare Workers with D1/KV/R2. You currently have Vercel serverless functions (`api/analyze.ts`, `api/lumina.ts`).

**Options:**
- **A) Migrate fully to Cloudflare Workers** - Benefits: edge performance, D1 for SQLite, KV for caching, R2 for storage. Requires rewriting existing API.
- **B) Hybrid approach** - Keep Vercel for frontend deployment, add Cloudflare Workers for analysis backend. More complex routing.
- **C) Stay with Vercel** - Use Vercel Postgres/KV instead. Simpler deployment but less edge optimization.

**Recommendation:** Option A (full Cloudflare) aligns with the architecture guide and provides the best prompt caching support.

**Your choice:** Option A

---

### Q1.2: Database Schema Location
Where should the schema data (platforms, industries, benchmarks) live?

**Options:**
- **A) Cloudflare D1** - SQLite at the edge, synced from Schema Admin
- **B) External Postgres** (Supabase/Neon) - More features, accessible from both frontend and workers
- **C) Dual sync** - Schema Admin writes to Supabase, workers sync to D1 for read performance

**Your choice:** 

---

## 2. Orchestrator Architecture

### Q2.1: Orchestration Strategy
How should the system decide what context to include in prompts?

**Options:**
- **A) Code-based orchestrator** - TypeScript logic that assembles context based on detected tactics, industry, and platforms. Deterministic, predictable, easier to debug.
- **B) AI orchestrator** - First Claude call to analyze request and determine what context/agents to invoke. More flexible, but adds latency and cost.
- **C) Hybrid** - Code-based routing for known patterns, AI orchestrator for edge cases.

**Recommendation:** Option A for MVP, with hooks for Option C later.

**Your choice:** ___

---

### Q2.2: Multi-Agent Strategy
The architecture suggests parallel expert agents (platform expert, industry expert, tactic expert). How many agents should we use?

**Options:**
- **A) Single comprehensive call** - One Claude call with all relevant context. Simpler, faster for most campaigns.
- **B) Multi-agent for complex** - Route to multi-agent only when 3+ platforms or 5+ tactics. Single agent otherwise.
- **C) Always multi-agent** - Parallel experts for every request. Most comprehensive but highest cost.

**Recommendation:** Option B - complexity-based routing matches the architecture guide.

**Your choice:** ___

---

### Q2.3: Agent Model Selection
Which Claude models should agents use?

**Options:**
- **A) All Sonnet** - Consistent quality, moderate cost
- **B) Haiku for experts, Sonnet for synthesis** - 60% cost savings on expert calls per architecture guide
- **C) Opus for complex, Sonnet default** - Best quality for difficult campaigns
- **D) Configurable per request** - Let users choose model tier

**Recommendation:** Option B for production, Option D for admin/testing.

**Your choice:** ___

---

## 3. Context & Prompt Building

### Q3.1: Context Assembly Priority
When token budget is exceeded, what context should be prioritized?

**Current Schema Admin entities:**
- Products → SubProducts → TacticTypes
- Platforms → Quirks, KPIs, Thresholds, BuyerNotes
- Industries → Benchmarks, Insights, Seasonality

**Proposed priority (high to low):**
1. System prompt + output requirements
2. Relevant platform quirks (high impact only)
3. Industry benchmarks for detected metrics
4. Tactic-specific guidance
5. Platform KPIs and thresholds
6. Industry insights and seasonality
7. Buyer notes and low-impact quirks

**Does this priority order match your expectations?** ___

**Any adjustments?** ___

---

### Q3.2: Prompt Caching Strategy
What should be cached vs. dynamic?

**Proposed caching layers:**

| Layer | Content | TTL | Cache Key |
|-------|---------|-----|-----------|
| L1: System | Core analyst persona, output format | 1 hour | `system_v{version}` |
| L2: Platform | Platform quirks, KPIs by platform | 5 min | `platform_{code}` |
| L3: Industry | Benchmarks, insights by industry | 5 min | `industry_{code}` |
| L4: Dynamic | Campaign data, CSV content | None | - |

**Agree with this structure?** ___

---

### Q3.3: Soul Documents Integration
The Schema Admin has "Soul Documents" (system prompts, agent personas, skills, templates). Should these be:

**Options:**
- **A) Source of truth** - Soul Documents table provides all prompt templates, versioned
- **B) Supplementary** - Core prompts hardcoded, Soul Documents for customization layer
- **C) Hybrid** - Some prompts from Soul Documents, some from code

**Your choice:** ___

---

## 4. Data Flow & Learning

### Q4.1: Report Storage
Should generated reports be stored?

**Options:**
- **A) Store all reports** - Full analytics, learning loop, audit trail. Requires R2/storage.
- **B) Store metadata only** - Track tokens, latency, tactics analyzed. No full report storage.
- **C) Opt-in storage** - User chooses whether to save report for team reference.

**Your choice:** ___

---

### Q4.2: Feedback Collection
The architecture includes a learning loop. How should feedback be collected?

**Options:**
- **A) In-app rating** - Thumbs up/down + optional comment after each report
- **B) Detailed feedback form** - Rate accuracy, actionability, relevance with corrections
- **C) Passive signals** - Track copy events, time on page, regeneration requests
- **D) Skip for MVP** - Focus on core analysis first

**Your choice:** ___

---

### Q4.3: Benchmark Updates
Should benchmarks auto-update from campaign data?

**Options:**
- **A) Manual only** - Admin reviews and updates benchmarks quarterly
- **B) Suggested updates** - System proposes benchmark changes, admin approves
- **C) Auto-update with threshold** - Auto-update when sample size reaches 20+ campaigns
- **D) Skip for MVP**

**Your choice:** ___

---

## 5. API & Integration

### Q5.1: Lumina API Integration
Current implementation proxies to `api.edwinlovett.com/order`. Should the worker:

**Options:**
- **A) Keep proxy pattern** - Worker calls Lumina API, extracts needed data
- **B) Pre-fetch and cache** - Cache Lumina campaign data in KV (5-10 min TTL)
- **C) Direct client call** - Frontend calls Lumina directly, sends data to analyze API

**Your choice:** ___

---

### Q5.2: Response Format
What should the analysis API return?

**Options:**
- **A) Markdown text only** - Simple, renderable in frontend
- **B) Structured JSON** - Sections, recommendations, warnings as structured data
- **C) Both** - Structured JSON with `raw_markdown` field
- **D) Streaming** - Server-sent events for real-time output

**Recommendation:** Option C for flexibility, add Option D later.

**Your choice:** ___

---

### Q5.3: File Processing Location
Where should CSV parsing happen?

**Current:** Frontend parses CSVs with PapaParse/Web Workers

**Options:**
- **A) Keep frontend parsing** - Send parsed JSON to API
- **B) Move to worker** - Send raw files, parse in Cloudflare Worker
- **C) Hybrid** - Frontend parses, worker validates and transforms

**Your choice:** ___

---

## 6. Schema Admin Integration

### Q6.1: Data Sync Mechanism
How should Schema Admin data reach the workers?

**Options:**
- **A) Direct DB queries** - Workers query D1/Postgres directly at request time
- **B) Sync on publish** - When admin saves, push to KV cache with versioning
- **C) Periodic sync** - Cron job every 5 min syncs latest schema to edge cache
- **D) API-based fetch** - Workers fetch from Schema Admin API endpoints

**Your choice:** ___

---

### Q6.2: Tactic Detection
The system needs to match uploaded files to tactics. Current approach uses filename stems and headers.

**Should this detection:**
- **A) Use Schema data only** - TacticTypes table drives detection
- **B) Add AI fallback** - If no match, ask Claude to classify the file
- **C) Manual override** - Always let user confirm/change detected tactic

**Your choice:** ___

---

## 7. Development Approach

### Q7.1: Implementation Phase
The architecture guide suggests 5 phases over 10 weeks. For initial deployment:

**What's the minimum viable backend?**

I propose:
1. Single Cloudflare Worker with D1
2. Code-based orchestrator (no multi-agent yet)
3. Context from platforms, industries, tactics tables
4. Prompt caching with layered structure
5. Structured JSON response

**Agree with this MVP scope?** ___

**What else is must-have for v1?** ___

---

### Q7.2: Testing Strategy
How should the backend be tested before production?

**Options:**
- **A) Postman/Manual testing** - Test API endpoints manually
- **B) Integration tests** - Vitest/Jest tests against real API
- **C) Test harness in Schema Admin** - AI Testing page in admin UI
- **D) All of the above**

**Your choice:** ___

---

## Summary: Key Decisions Needed

| # | Decision | Your Choice |
|---|----------|-------------|
| 1.1 | Infrastructure (Cloudflare/Vercel/Hybrid) | |
| 1.2 | Database location | |
| 2.1 | Orchestration (Code/AI/Hybrid) | |
| 2.2 | Multi-agent strategy | |
| 2.3 | Model selection | |
| 3.1 | Context priority | |
| 3.2 | Caching layers | |
| 3.3 | Soul Documents role | |
| 4.1 | Report storage | |
| 4.2 | Feedback collection | |
| 4.3 | Benchmark updates | |
| 5.1 | Lumina integration | |
| 5.2 | Response format | |
| 5.3 | File processing location | |
| 6.1 | Data sync mechanism | |
| 6.2 | Tactic detection | |
| 7.1 | MVP scope confirmation | |
| 7.2 | Testing strategy | |

---

## Additional Context Needed

1. **Lumina API details** - Do we have documentation for the Lumina API? What fields are available?

2. **Existing benchmarks** - Do you have historical benchmark data to seed the system, or start from scratch?

3. **User authentication** - Should the analysis API be authenticated? If so, what mechanism (API keys, JWT, etc.)?

4. **Rate limiting** - Expected request volume? Should we implement rate limiting?

5. **Cost constraints** - Is there a per-request budget we should target (e.g., max $0.50/report)?

---

Please fill in your choices above or respond with your decisions, and I'll proceed with the implementation.
