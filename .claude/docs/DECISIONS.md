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

## Vercel Serverless over Express Server
- **Date**: 2025-01-XX
- **Status**: Accepted

### Context
Backend needs are limited: proxy Lumina API calls and call Claude API. Full server seemed excessive.

### Decision
Use Vercel serverless functions for API endpoints, avoiding dedicated server infrastructure.

### Alternatives Considered
1. **Express/Fastify Server**
   - Pros: Full control, traditional architecture
   - Cons: Requires separate hosting, more infrastructure
   - Rejected because: Only 2 endpoints needed

2. **Cloudflare Workers**
   - Pros: Edge compute, fast cold starts
   - Cons: Different ecosystem from Vercel hosting
   - Rejected because: Vercel hosting + serverless is unified

### Consequences
- **Positive**: Zero infrastructure management, automatic scaling
- **Negative**: Cold starts on infrequent requests
- **Neutral**: Limited to Vercel's function constraints

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
