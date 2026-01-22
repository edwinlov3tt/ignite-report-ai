# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - Current Development

### Added
- **PPTX Integration**: PowerPoint extraction and preview capabilities
- **Enhanced Curator**: Product research and semantic matching features
- **Advanced Analytics**: Performance tables and comprehensive data audit tools
- **Vector Search**: Embeddings-based content discovery with pgvector
- **Field Discovery**: Automatic schema field detection from Lumina data
- **Extractor Suggestions**: AI-powered data extraction recommendations

### Modified (In Progress)
- 24 files with ongoing enhancements across frontend and backend
- Worker routes for curator services and schema APIs
- Enhanced state management with new data types
- Updated design tokens and component styles

---

## 2025-01-20

### Schema Curator Agent - AI-Powered Industry Research

#### Added - New Feature: Schema Curator
- **SchemaCuratorPage** (`src/pages/admin/SchemaCuratorPage.tsx`) - New admin page for AI-powered schema data management
- **Research Mode** - Natural language queries to seed industries with rich data (e.g., "Create industry for Electric Services with benchmarks")
- **Text/URL/File Input Modes** - Multiple ways to extract schema entities
- **Field-by-field Review UI** - Approve/reject extracted fields before committing

#### Added - Worker Backend (Curator Routes)
- `workers/src/routes/curator/index.ts` - Curator route registration
- `workers/src/routes/curator/extract.ts` - Text/URL parsing with OpenAI GPT-5.2
- `workers/src/routes/curator/research.ts` - Tavily web search + GPT-5.2 synthesis
- `workers/src/routes/curator/commit.ts` - Save approved entities with audit trail

#### Added - Worker Services
- `workers/src/services/curator/openai.ts` - OpenAI client with structured outputs
- `workers/src/services/curator/webResearch.ts` - Tavily API integration for industry research
- `workers/src/services/curator/audit.ts` - Provenance and audit log management

#### Added - Database Schema (Migration 005)
- `schema_provenance` - Field-level source tracking
- `schema_audit_log` - Full change history for rollback
- `curator_domain_whitelist` - Trusted research sources
- `curator_sessions` - Chat/context persistence

#### Added - Industry Research Fields (Migration 006)
- `curator_benchmarks` JSONB - CPC, CPA, CTR, CPM, ROAS ranges
- `curator_seasonality` JSONB - Peak/slow months, quarterly trends, holiday impact
- `curator_insights` JSONB - AI-generated insights with confidence scores
- `buyer_notes` TEXT - Buyer persona and targeting notes
- `research_metadata` JSONB - Sources, tokens used, query context

#### Added - IndustryDetailPage "AI Research" Tab
- Displays curator-generated research data
- Benchmark cards with min/max/avg ranges
- Seasonality badges for peak/slow months
- Quarterly trend descriptions
- Buyer notes with formatted display
- Insights with confidence scores
- Clickable source links

#### Changed
- Updated `Industry` type in `src/types/admin.ts` and `src/lib/industriesApi.ts` to include curator fields
- Updated `industriesApi.getIndustry()` and `getIndustries()` to fetch curator JSONB columns
- AdminSidebar now includes "Curator" navigation item

#### Technical Details
- **OpenAI Structured Outputs**: Uses `json_schema` response format with `strict: true`
- **Tavily Search**: Specialized queries for benchmarks, seasonality, buyer personas
- **Column Renaming**: Renamed JSONB columns from `benchmarks`→`curator_benchmarks` to avoid conflicts with relational table aliases

---

## 2025-01-19

### Major Audit - Architecture Documentation Update

#### Updated
- **ARCHITECTURE.md** - Comprehensive rewrite reflecting current dual-backend architecture:
  - Added Cloudflare Workers as primary backend (was missing)
  - Added Supabase as database layer
  - Added all KV namespaces and R2 bucket documentation
  - Updated directory structure to include workers/, migrations/, admin components
  - Added Schema Admin flow diagram
  - Added cron job documentation
  - Updated all environment variables (frontend, worker secrets, wrangler.toml vars)

#### Documented
- **External Services**: Supabase, Cloudflare Workers, Cloudflare KV, Cloudflare R2
- **57 TypeScript/TSX files** in src/ (~20,880 lines)
- **Workers backend** (~3,331 lines of TypeScript)

---

## 2025-01-17

### Schema Admin - Feature Cleanup

#### Removed
- **Benchmarks section from ProductDetailPage** - Benchmarks belong in Industries, not Products
- Test modal and `runTest()` from SoulDocumentEditorPage - Tests feature not yet implemented

#### Stubbed (Coming Soon)
- **Lumina Extractors tab** (ProductDetailPage) - Shows planned features for Lumina API data extraction configuration
- **Tests tab** (SoulDocumentEditorPage) - Shows planned features for prompt testing with sample inputs
- **Validation Rules tab** (SubProductDetailPage) - Shows planned features for analysis validation rules

#### Implemented
- **Industry Edit modal** - Update name, code, description via modal form
- **Industry Delete button** - Delete industry with confirmation (cascades to benchmarks/insights/seasonality)
- **Full Products rich schema** - Added slug, platforms, notes, ai_guidelines, ai_prompt fields
- **Full SubProducts rich schema** - Added slug, platforms, notes fields
- **Full TacticTypes rich schema** - Added slug, filename_stem, headers, aliases fields

### Database Migrations Applied
- `products_rich_schema` - Added new columns to products, subproducts, tactic_types tables
- `add_missing_columns` - Added description to soul_documents, change_summary/changed_by to versions, icon to industries

### Documentation
- Created `API_REFERENCE.md` - Complete CRUD function reference for all Schema Admin APIs

---

## 2025-01-16

### Documentation System
- Installed claude-docs-system with slash commands
- Created `.claude/docs/` documentation structure
- Added documentation protocol to CLAUDE.md
- Generated initial project audit

### Schema Fixes
- Fixed schema array/JSON parsing issue causing console warnings (commit a2a5461)

---

## 2025-01-XX (Initial Development)

### Added - Core Application
- React 19 + TypeScript + Vite 7 setup
- 5-step wizard workflow for campaign analysis
- Zustand state management with localStorage persistence
- Tailwind CSS 4 with design tokens

### Added - File Processing
- Papa Parse integration for CSV parsing (Web Worker support)
- JSZip for in-browser ZIP extraction
- Jaccard similarity algorithm for automatic file-to-tactic sorting

### Added - API Integration
- Lumina API proxy for campaign data fetching
- Claude API integration for AI-powered analysis
- Vercel serverless function architecture

### Added - UI Components
- Progress stepper with 5-step navigation
- Drag-and-drop file upload zones
- Error modal with dismissible UI
- Markdown rendering for analysis results

### Added - Admin Pages
- Schema Admin page for managing tactic schemas
- Sections Manager for report sections
- AI Testing sandbox for prompt experimentation

---

## Format Guide

- **Added**: New features or functionality
- **Changed**: Changes to existing functionality
- **Fixed**: Bug fixes
- **Removed**: Removed features or functionality
- **Security**: Security-related changes
- **Deprecated**: Features marked for future removal
