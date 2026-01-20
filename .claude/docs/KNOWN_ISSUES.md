# Known Issues

Track bugs, edge cases, and technical debt. This is the goldmine for developer handoffs.

**Last Audit**: 2025-01-20

## Active Issues

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
