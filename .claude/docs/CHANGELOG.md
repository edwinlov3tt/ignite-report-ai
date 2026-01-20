# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
-

### Changed
-

### Fixed
-

### Removed
-

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
