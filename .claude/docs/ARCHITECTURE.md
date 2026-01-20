# Architecture Overview

System design and technical reference for Report.AI.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React 19.2 + TypeScript 5.9 | Single Page Application with routing |
| UI Framework | Tailwind CSS 4.1 | Design tokens via CSS variables |
| State Management | Zustand 5.0 | Persisted to localStorage |
| Build Tool | Vite 7.3 | HMR, path aliases (@/), dev proxy |
| Backend | Vercel Serverless Functions | TypeScript handlers |
| AI | Anthropic Claude API | Sonnet 4, Opus 4 models |
| External API | Lumina API | Campaign data extraction |
| Hosting | Vercel | SPA routing configured |

---

## Directory Structure

```
report-ai/
├── src/
│   ├── App.tsx                    # Main app with routing and error modal
│   ├── main.tsx                   # React entry point with BrowserRouter
│   ├── index.css                  # Global styles and design tokens
│   ├── components/
│   │   ├── Layout.tsx             # App layout with header/footer
│   │   ├── ProgressStepper.tsx    # 5-step wizard navigation
│   │   ├── Footer.tsx             # App footer
│   │   └── steps/                 # Wizard step components
│   │       ├── StepCampaign.tsx   # Step 1: Campaign data input
│   │       ├── StepTimeRange.tsx  # Step 2: Date range selection
│   │       ├── StepCompany.tsx    # Step 3: Company configuration
│   │       ├── StepPerformance.tsx # Step 4: File upload & sorting
│   │       └── StepAnalysis.tsx   # Step 5: AI analysis
│   ├── pages/
│   │   ├── HomePage.tsx           # Main wizard page
│   │   ├── SchemaAdminPage.tsx    # Schema management admin
│   │   ├── SectionsManagerPage.tsx # Sections editor
│   │   └── AITestingPage.tsx      # AI testing sandbox
│   ├── store/
│   │   └── useAppStore.ts         # Zustand store with persistence
│   ├── lib/
│   │   ├── fileParser.ts          # CSV parsing and ZIP extraction
│   │   ├── schemaApi.ts           # Schema CRUD API client
│   │   └── sectionsApi.ts         # Sections API client
│   └── types/
│       └── index.ts               # TypeScript type definitions
├── api/                           # Vercel serverless functions
│   ├── analyze.ts                 # Claude AI analysis endpoint
│   └── lumina.ts                  # Lumina API proxy
├── public/                        # Static assets
├── _legacy/                       # Original PHP/HTML application (reference)
└── .claude/                       # Claude Code configuration
    ├── commands/                  # Slash commands
    ├── docs/                      # Project documentation
    ├── agents/                    # Specialized agents
    └── skills/                    # Custom skills
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

---

## Data Flow

```
1. User Input (Campaign ID)
       ↓
2. Lumina API (/api/lumina)
       ↓
3. Campaign Data + Detected Tactics → Zustand Store
       ↓
4. User uploads CSV/ZIP files
       ↓
5. File Parser (Web Worker) → Auto-sort via Jaccard Similarity
       ↓
6. User configures analysis (model, tone, instructions)
       ↓
7. Claude API (/api/analyze)
       ↓
8. Analysis Results → Display in Markdown
```

---

## External Services

| Service | Purpose | Docs |
|---------|---------|------|
| Anthropic Claude | AI-powered campaign analysis | [docs.anthropic.com](https://docs.anthropic.com) |
| Lumina API | Campaign data extraction | Internal API (edwinlovett.com) |
| Vercel | Hosting and serverless functions | [vercel.com/docs](https://vercel.com/docs) |

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `ANTHROPIC_API_KEY` | Claude API authentication | Yes (production) |

**Development Note**: In dev mode, API calls proxy through Vite to `https://ignite.edwinlovett.com/report-ai`

---

## Deployment

### Production (Vercel)
```bash
vercel --prod
```

Configuration in `vercel.json`:
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- SPA routing via rewrites

### Local Development
```bash
npm run dev          # Start dev server on port 3000
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint checks
```

---

## Security Considerations

- **API Keys**: Stored in Vercel environment variables (never in client code)
- **Input Validation**: Order ID validated as 24-char hex string
- **CORS**: Proxied through serverless functions to avoid exposing backend URLs
- **State**: Campaign data persisted to localStorage (clear on sensitive operations)

---

## Performance

- **File Parsing**: Web Workers via Papa Parse prevent UI blocking on large CSVs
- **State Persistence**: Selective state partitioning in Zustand (not persisting results)
- **Lazy Loading**: Admin pages separated from main wizard flow
- **Vite Build**: Tree-shaking, code splitting, sourcemaps enabled
