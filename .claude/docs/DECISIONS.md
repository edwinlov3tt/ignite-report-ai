# Architectural Decisions

Record of significant technical decisions and their context. This helps future developers understand *why* things were built a certain way.

---

## Decisions

---

## React 19 + Vite 7 over Next.js
- **Date**: 2025-01-XX
- **Status**: Accepted

### Context
Needed to build a campaign analysis SPA. Evaluated Next.js, Vite+React, and Create React App. The application is primarily client-side with simple API proxy needs.

### Decision
Use React 19 with Vite 7 for faster development and simpler deployment. Serverless functions handle backend needs.

### Alternatives Considered
1. **Next.js 15**
   - Pros: Full-stack framework, SSR support, built-in API routes
   - Cons: Heavier for pure SPA, more complex configuration
   - Rejected because: SPA pattern sufficient, simpler Vite setup preferred

2. **Create React App**
   - Pros: Established tooling
   - Cons: Deprecated/unmaintained, slower HMR
   - Rejected because: Vite is the modern standard

### Consequences
- **Positive**: Fast HMR, simple configuration, modern tooling
- **Negative**: No SSR (acceptable for this use case)
- **Neutral**: Vercel handles serverless functions separately

---

## Zustand over Redux/Context
- **Date**: 2025-01-XX
- **Status**: Accepted

### Context
Needed state management for multi-step wizard with persistence. State includes campaign data, files, configuration, and results.

### Decision
Use Zustand with persist middleware for simple, performant state management with localStorage persistence.

### Alternatives Considered
1. **Redux Toolkit**
   - Pros: Established pattern, extensive ecosystem
   - Cons: More boilerplate, steeper learning curve
   - Rejected because: Overkill for application complexity

2. **React Context + useReducer**
   - Pros: No dependencies, built-in
   - Cons: Re-render issues, manual persistence
   - Rejected because: Zustand provides better DX and performance

### Consequences
- **Positive**: Minimal boilerplate, built-in persistence, selective state partitioning
- **Negative**: Less structured than Redux for very large apps
- **Neutral**: Team needs to learn Zustand patterns

---

## Jaccard Similarity for File Auto-Sorting
- **Date**: 2025-01-XX
- **Status**: Accepted

### Context
Users upload multiple CSV files that need to be matched to the correct marketing tactics. Manual sorting is error-prone and time-consuming.

### Decision
Use Jaccard similarity algorithm to compare CSV headers against known tactic schemas, auto-sorting files with confidence scores.

### Alternatives Considered
1. **Exact Filename Matching**
   - Pros: Simple implementation
   - Cons: Filenames vary wildly, unreliable
   - Rejected because: Too rigid for real-world file naming

2. **ML-based Classification**
   - Pros: Could learn patterns
   - Cons: Requires training data, complex
   - Rejected because: Jaccard provides sufficient accuracy without ML complexity

### Consequences
- **Positive**: Accurate auto-sorting based on column structure
- **Negative**: May misclassify files with unusual headers (requires manual correction)
- **Neutral**: Confidence threshold determines auto-sort vs. manual assignment

---

## Cloudflare Workers over Vercel Serverless (Revised)
- **Date**: 2025-01-17
- **Status**: Accepted (supersedes previous Vercel-only decision)

### Context
Initial backend used Vercel serverless functions. As requirements grew (KV caching, R2 storage, scheduled tasks, edge performance), a more capable edge platform was needed.

### Decision
Use Cloudflare Workers with Hono framework as the primary backend, keeping Vercel serverless as fallback.

### Alternatives Considered
1. **Keep Vercel-only**
   - Pros: Single platform, simpler deployment
   - Cons: No native KV, no R2, no cron triggers, slower cold starts
   - Rejected because: Missing critical infrastructure features

2. **AWS Lambda + DynamoDB**
   - Pros: Extensive AWS ecosystem
   - Cons: More complex setup, higher latency, higher cost
   - Rejected because: Cloudflare offers simpler DX for edge workloads

### Consequences
- **Positive**: Edge performance (<50ms globally), native KV/R2, cron triggers, prompt caching
- **Negative**: Two deployment targets (Vercel frontend, Cloudflare backend)
- **Neutral**: Team needs familiarity with both platforms

---

## Supabase over Direct PostgreSQL
- **Date**: 2025-01-16
- **Status**: Accepted

### Context
Needed a database for schema configuration, reports, and feedback. Options included self-hosted PostgreSQL, managed services, or Supabase.

### Decision
Use Supabase for PostgreSQL with built-in auth, real-time, and admin UI.

### Alternatives Considered
1. **Self-hosted PostgreSQL**
   - Pros: Full control, no vendor lock-in
   - Cons: DevOps overhead, scaling complexity
   - Rejected because: Too much infrastructure management

2. **PlanetScale (MySQL)**
   - Pros: Branching, edge reads
   - Cons: MySQL syntax differences, no foreign keys
   - Rejected because: PostgreSQL preferred for relational features

3. **Neon (Serverless Postgres)**
   - Pros: Serverless scaling, branching
   - Cons: Newer platform, less mature
   - Rejected because: Supabase offers more tooling (auth, storage, realtime)

### Consequences
- **Positive**: Instant API, admin dashboard, auth ready, generous free tier
- **Negative**: Vendor lock-in for Supabase-specific features
- **Neutral**: Need to manage RLS policies for security

---

## Hono over Express for Workers
- **Date**: 2025-01-17
- **Status**: Accepted

### Context
Needed a web framework for Cloudflare Workers. Express doesn't work well in Workers environment.

### Decision
Use Hono as the web framework - purpose-built for edge environments.

### Alternatives Considered
1. **Express (via adapter)**
   - Pros: Familiar API
   - Cons: Not optimized for Workers, larger bundle
   - Rejected because: Poor fit for edge runtime

2. **Itty-router**
   - Pros: Tiny, simple
   - Cons: Less middleware, smaller ecosystem
   - Rejected because: Hono offers better DX while still being lightweight

### Consequences
- **Positive**: Fast, lightweight, excellent TypeScript support, built-in middleware
- **Negative**: Smaller community than Express
- **Neutral**: Team learns new framework (low learning curve)

---

## When to Record

✅ **Record when:**
- Choosing between technologies or frameworks
- Designing data models or API structures
- Setting up deployment or infrastructure
- Establishing patterns that will be repeated
- Making tradeoffs that won't be obvious later

❌ **Don't record:**
- Obvious industry-standard choices
- Temporary implementations
- Personal style preferences

---

## Decision Template

```markdown
## [Title - What Was Decided]
- **Date**: YYYY-MM-DD
- **Status**: Proposed | Accepted | Deprecated | Superseded by [X]

### Context
What situation or problem required this decision? What constraints existed?
What were we trying to achieve?

### Decision
What was chosen and the primary reason why. (1-3 sentences)

### Alternatives Considered
1. **[Option A]**: Brief description
   - Pros: [benefits]
   - Cons: [drawbacks]
   - Rejected because: [reason]

### Consequences
- **Positive**: What we gain from this decision
- **Negative**: What we give up or must handle as a result
- **Neutral**: Other implications worth noting
```
