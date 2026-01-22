# Known Issues

Track bugs, edge cases, and technical debt. This is the goldmine for developer handoffs.

**Last Audit**: 2025-01-22

## Active Issues

### 🟡 MEDIUM - TODO Comments in Codebase Indicate Missing User Auth
- **Location**: `workers/src/routes/curator/feedback.ts:67`, `workers/src/routes/curator/commit.ts:773`
- **Symptom**: Hardcoded user identification `marked_by: 'admin'` and `changedBy = 'curator_agent'`
- **Root Cause**: No authentication system implemented yet
- **Impact**: All feedback marked as admin, all schema changes attributed to curator agent
- **Workaround**: Manual tracking of actual users and sessions
- **Proper Fix**: Implement user authentication and pass actual user context
- **Added**: 2025-01-22

### 🟢 LOW - Debug Limitation in Embeddings Service
- **Location**: `workers/src/services/embeddings.ts:165`
- **Symptom**: Storing only first 1000 chars in `embedding_text` for debugging
- **Root Cause**: Debug limitation comment indicates temporary truncation
- **Impact**: Truncated embedding context may affect search quality analysis
- **Workaround**: Full text still embedded, only storage truncated for debugging
- **Proper Fix**: Remove debug limitation or make configurable
- **Added**: 2025-01-22

### ✅ RESOLVED - Hardcoded URLs Throughout Codebase
- **Location**: Multiple files with hardcoded API base URLs
- **Files**: 
  - `src/pages/AITestingPage.tsx:27`
  - `src/pages/admin/SourcesPage.tsx:14`
  - `src/pages/admin/SchemaCuratorPage.tsx:28`
  - `src/lib/extractorSuggestionsApi.ts:6`
  - `src/lib/supabase.ts:9` (hardcoded Supabase URL)
- **Impact**: Difficult to change API endpoints, environment-specific configuration
- **Resolution**: 
  - Created centralized API configuration in `src/config/api.ts`
  - All components now import from centralized config
  - Created comprehensive `.env.example` file with all environment variables
  - Updated all files to use `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Added**: 2025-01-22
- **Resolved**: 2025-01-22

### 🟡 MEDIUM - Multiple Migration Directories with Potential Conflicts
- **Location**: Four different migration directories
- **Directories**: 
  - `/migrations/` (7 files, 001-007)
  - `/workers/migrations/` (11 files, 001-011)
  - `/supabase/migrations/` (1 file)
  - `/_legacy/api/migrations/` (4 files)
- **Impact**: Potential confusion about migration order and dependencies
- **Workaround**: Follow workers/migrations/ as primary source
- **Proper Fix**: Consolidate migrations or clearly document precedence
- **Added**: 2025-01-22

### 🟢 LOW - Git Branch Workflow Confusion
- **Location**: Current branch: `example` with extensive uncommitted changes
- **Symptom**: 24 modified files and 35 untracked files on non-main branch
- **Impact**: Unclear which changes are ready for production vs experimental
- **Workaround**: Manual review and selective commits
- **Proper Fix**: Clean up branch state and establish clear git workflow
- **Added**: 2025-01-22

### 🟢 LOW - No Environment Variables Documentation
- **Location**: Missing .env.example file
- **Impact**: New developers struggle with environment setup
- **Required Variables**: 
  - Frontend: VITE_WORKER_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
  - Workers: ANTHROPIC_API_KEY, OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
- **Workaround**: Manual environment setup using architecture documentation
- **Proper Fix**: Create comprehensive .env.example with documentation
- **Added**: 2025-01-22

## Active Issues (From Previous Audit)

### 🟢 LOW - Industry Insights/Seasonality Missing Update Functions
- **Location**: `src/lib/industriesApi.ts`
- **Symptom**: Cannot edit insights or seasonality entries, only delete
- **Root Cause**: `updateInsight()` and `updateSeasonality()` not implemented
- **Workaround**: Delete and re-add the entry with updated values
- **Proper Fix**: Implement update functions in API and add edit modals in UI
- **Added**: 2025-01-17

### 🟢 LOW - Soul Document Version Cannot Be Deleted
- **Location**: `src/lib/soulDocumentsApi.ts`
- **Symptom**: Cannot delete individual versions, only entire documents
- **Root Cause**: `deleteVersion()` not implemented
- **Workaround**: Version history is append-only (by design for audit trail)
- **Proper Fix**: Consider if deletion is even desirable given audit requirements
- **Added**: 2025-01-17

### 🟡 MEDIUM - Streaming Responses Not Implemented
- **Location**: `api/analyze.ts` - Claude API integration
- **Symptom**: Long analysis requests show no progress until complete
- **Root Cause**: Using synchronous `messages.create()` instead of streaming
- **Workaround**: Loading spinner shown during analysis
- **Proper Fix**: Implement streaming with `stream: true` and SSE to client
- **Added**: 2025-01-16

### 🟢 LOW - Legacy API Proxy in Development
- **Location**: `vite.config.ts:19-23`
- **Symptom**: Dev mode proxies to `ignite.edwinlovett.com/report-ai`
- **Root Cause**: Development relies on legacy PHP backend
- **Workaround**: Works for development purposes
- **Proper Fix**: Fully migrate to Vercel serverless functions
- **Added**: 2025-01-16

### 🟢 LOW - Console Warnings on Schema Parsing
- **Location**: `src/lib/schemaApi.ts`, `src/lib/sectionsApi.ts`
- **Symptom**: Console warnings when parsing schema arrays
- **Root Cause**: Fixed in commit a2a5461, may resurface with edge cases
- **Workaround**: Warnings don't affect functionality
- **Proper Fix**: Add defensive parsing for all schema formats
- **Added**: 2025-01-16

---

## Resolved Issues

### [RESOLVED] Debug Console Logs in StepAnalysis
- **Location**: `src/components/steps/StepAnalysis.tsx`
- **Resolution**: Removed 3 debug console.log statements, kept console.error for error handling
- **Resolved**: 2025-01-19

### [RESOLVED] Schema array/JSON parsing issue
- **Location**: Schema parsing utilities
- **Resolution**: Fixed JSON parsing logic
- **Commit**: a2a5461
- **Resolved**: 2025-01-16

---

## Severity Guide

| Level | Description | Response Time |
|-------|-------------|---------------|
| 🔴 **CRITICAL** | System unusable, data loss risk, security vulnerability | Fix immediately |
| 🟠 **HIGH** | Major feature broken, no workaround available | Fix this sprint |
| 🟡 **MEDIUM** | Feature impaired but workaround exists | Fix when possible |
| 🟢 **LOW** | Minor inconvenience, cosmetic issues | Fix eventually |

## Issue Template

```markdown
### [SEVERITY] Brief Descriptive Title
- **Location**: `path/to/file.ts` - `functionName()`
- **Symptom**: What happens when this issue occurs
- **Root Cause**: Why it happens (or "Investigation needed")
- **Workaround**: Temporary fix (or "None")
- **Proper Fix**: What needs to be done to resolve permanently
- **Reproduction**: Steps to trigger (optional)
- **Added**: YYYY-MM-DD
```

## Resolution Template

When resolving an issue, move it to Resolved Issues:

```markdown
### [RESOLVED] Issue Title
- **Location**: `path/to/file.ts`
- **Resolution**: How it was fixed
- **Commit/PR**: [reference]
- **Resolved**: YYYY-MM-DD
```
