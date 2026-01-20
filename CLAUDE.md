# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Report.AI** - A web application for analyzing digital marketing campaign performance using AI. The application integrates with Lumina API for campaign data extraction and uses Anthropic's Claude API for intelligent analysis.

**Tech Stack**: React 19, TypeScript, Vite 7, Tailwind CSS 4, Zustand, Vercel (deployment)

## Development Commands

```bash
npm run dev      # Start development server (port 3000)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Project Structure

```
/report-ai/
├── src/
│   ├── components/      # React components
│   │   ├── steps/       # Wizard step components
│   │   ├── Layout.tsx   # App layout with header/footer
│   │   └── ProgressStepper.tsx
│   ├── pages/           # Page components
│   ├── store/           # Zustand state management
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities (fileParser, etc.)
│   ├── types/           # TypeScript type definitions
│   └── api/             # API client functions
├── api/                 # Vercel serverless functions
│   ├── lumina.ts        # Lumina API proxy
│   └── analyze.ts       # Claude AI analysis endpoint
├── _legacy/             # Old PHP/HTML application (reference)
└── public/              # Static assets
```

## Core Architecture

### Frontend (React SPA)
- **5-Step Wizard**: Campaign Data → Time Range → Company Info → Performance Data → AI Analysis
- **State Management**: Zustand with localStorage persistence
- **File Processing**: Papa Parse (Web Workers) + JSZip for ZIP extraction
- **Styling**: Tailwind CSS v4 with design tokens

### Backend (Vercel Serverless)
- **`/api/lumina`**: Proxies requests to Lumina API, processes campaign data
- **`/api/analyze`**: Calls Claude API with campaign context

## Key Features

### File Processing (Improved)
- **CSV Parsing**: Papa Parse with Web Worker support for large files
- **ZIP Extraction**: JSZip for in-browser extraction (no server upload needed)
- **Auto-sorting**: Jaccard similarity algorithm for tactic matching
- **Progress tracking**: Real-time feedback during processing

### State Management
```typescript
// Access state anywhere
const campaignData = useAppStore((state) => state.campaignData)
const setCampaignData = useAppStore((state) => state.setCampaignData)
```

### AI Analysis
- **Models**: Claude Sonnet 4, Claude Opus 4
- **Configurable**: Temperature, tone, custom instructions
- **Streaming**: Support for streaming responses (to be implemented)

## Environment Variables

```env
ANTHROPIC_API_KEY=your-api-key
```

## Deployment

### Vercel (Recommended)
```bash
vercel          # Deploy to preview
vercel --prod   # Deploy to production
```

### Configuration
- `vercel.json` - Vercel deployment settings
- SPA routing configured with rewrites

## Legacy Reference

The original PHP/HTML application is preserved in `_legacy/` for reference:
- `_legacy/api/` - Original PHP endpoints
- `_legacy/script.js` - Original frontend logic
- `_legacy/context/` - Schema and training data

## Development Guidelines

### Component Patterns
- Use functional components with hooks
- Colocate related code (component + styles + tests)
- Prefer composition over inheritance

### State Updates
- Use Zustand selectors for performance
- Update state immutably
- Persist only necessary state to localStorage

### File Parsing
- Always use Web Workers for large CSVs
- Handle parsing errors gracefully
- Validate headers before processing

## Documentation Protocol

This project uses an automated documentation system. Follow these protocols to keep documentation current and accurate.

### Quick Reference

| Command | When to Use | Example |
|---------|-------------|---------|
| `/doc` | After every coding session | `/doc` |
| `/issue` | When you find a bug or edge case | `/issue API timeout on large payloads` |
| `/decision` | When you make a technical choice | `/decision Using Redis over Memcached` |
| `/service` | When you add/modify external service | `/service Stripe` |
| `/audit` | Full project analysis (periodic) | `/audit` |
| `/doc-status` | Check documentation health | `/doc-status` |
| `/handoff` | Before sharing with another dev | `/handoff` |

### Documentation Locations

| Document | Purpose | Update Frequency |
|----------|---------|------------------|
| `.claude/docs/CHANGELOG.md` | What changed and when | Every session |
| `.claude/docs/KNOWN_ISSUES.md` | Bugs, edge cases, tech debt | When discovered |
| `.claude/docs/DECISIONS.md` | Why things were built this way | When deciding |
| `.claude/docs/ARCHITECTURE.md` | System overview, env vars | When structure changes |
| `.claude/docs/services/*.md` | External service integrations | When services change |
| `.claude/docs/components/*.md` | Internal component docs | When components change |

### Workflow Rules

**After Every Coding Session**: Run `/doc` to update CHANGELOG.md with what was done, flag any new issues discovered, and update affected service/component docs.

**When You Encounter a Bug or Edge Case**: Run `/issue [description]` immediately. Don't trust your memory.

**When You Make a Non-Obvious Technical Decision**: Run `/decision [what you decided]` to capture context for future developers.

**When You Add or Modify External Services**: Run `/service [service name]` to document the integration.

**Before Handing Off to Another Developer**: Run `/handoff` to generate a comprehensive onboarding document.

### Issue Severity Guide

| Level | Description | Example |
|-------|-------------|---------|
| CRITICAL | System unusable, data loss risk | Auth completely broken |
| HIGH | Major feature broken, no workaround | Checkout fails silently |
| MEDIUM | Feature impaired, workaround exists | Export works but slow |
| LOW | Minor inconvenience | Typo in error message |

### Decision Recording Guide

Record a decision when:
- Choosing between technologies (e.g., "Why Cloudflare over Vercel")
- Designing data models or APIs
- Setting up infrastructure
- Establishing patterns that will be repeated
- Making tradeoffs that won't be obvious later

Don't record:
- Obvious choices (standard patterns)
- Temporary implementations
- Personal preferences without project impact

## Sessions System Behaviors

@CLAUDE.sessions.md
