# Supabase Integration

## Overview

| | |
|---|---|
| **Service** | Supabase (PostgreSQL) |
| **Purpose** | Primary database for schema data, reports, and feedback |
| **Documentation** | [supabase.com/docs](https://supabase.com/docs) |
| **Dashboard** | [supabase.com/dashboard](https://supabase.com/dashboard) |

## Configuration

### Environment Variables

| Variable | Purpose | Location | Required |
|----------|---------|----------|----------|
| `SUPABASE_URL` | Supabase project URL | Worker secrets | Yes |
| `SUPABASE_SERVICE_KEY` | Service role key (full access) | Worker secrets | Yes |

### Frontend Client (Read-only)
The frontend uses the Supabase anon key hardcoded in `src/lib/supabase.ts`:
- URL: `https://ggxbjxouyhntdbgcnvcu.supabase.co`
- Anon Key: `sb_publishable_...` (public, limited permissions)

## Implementation

### Files
- `src/lib/supabase.ts` - Frontend client (anon key, read operations)
- `workers/src/services/supabase.ts` - Worker client (service key, full access)
- `migrations/*.sql` - Database schema migrations

### SDK
- **Package**: `@supabase/supabase-js`
- **Version**: `^2.90.1` (frontend), `^2.48.1` (worker)

### Initialization

**Frontend (read-only):**
```typescript
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ggxbjxouyhntdbgcnvcu.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_...'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
```

**Worker (full access):**
```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export function createSupabaseClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
```

## Database Schema

### Core Tables
| Table | Purpose |
|-------|---------|
| `platforms` | Marketing platforms (Google, Facebook, etc.) |
| `platform_quirks` | Platform-specific notes and gotchas |
| `platform_kpis` | KPI definitions per platform |
| `platform_thresholds` | Performance threshold values |
| `platform_buyer_notes` | Buyer-specific notes |
| `industries` | Industry classifications |
| `industry_benchmarks` | Industry-specific benchmarks |
| `industry_insights` | Industry-specific insights |
| `industry_seasonality` | Seasonal patterns |
| `products` | Product categories |
| `subproducts` | Sub-product classifications |
| `tactic_types` | Tactic type definitions |
| `mediums` | Ad medium types |
| `soul_documents` | AI prompt templates |
| `soul_document_versions` | Versioned prompt content |

### Reports Tables
| Table | Purpose |
|-------|---------|
| `reports` | Report metadata |
| `report_feedback` | User feedback on reports |
| `kv_sync_log` | KV cache sync audit log |

## Usage Examples

### Fetch Platforms with Related Data
```typescript
const { data: platforms, error } = await supabase
  .from('platforms')
  .select(`
    *,
    quirks:platform_quirks(*),
    kpis:platform_kpis(*),
    thresholds:platform_thresholds(*),
    buyer_notes:platform_buyer_notes(*)
  `)
  .eq('is_active', true)
  .order('name')
```

### Save Report Feedback
```typescript
const { error } = await supabase
  .from('report_feedback')
  .insert({
    report_id: reportId,
    feedback_type: 'thumbs_up',
    comment: 'Great analysis!'
  })
```

## Error Handling

| Error Code | Cause | Solution |
|------------|-------|----------|
| `PGRST116` | Row not found | Handle as null result |
| `42P01` | Table doesn't exist | Run migrations |
| `42501` | Insufficient permissions | Check RLS policies |

## Security

- **Frontend**: Uses anon key with RLS policies limiting access
- **Worker**: Uses service key (bypasses RLS) for admin operations
- **Secrets**: Service key stored in Cloudflare secrets, never exposed to client

## Known Issues

- No RLS policies currently enforced (using public schema)
- Service key in worker has full access (acceptable for trusted backend)

## Changelog

- 2025-01-17: Added performance tables migration
- 2025-01-19: Added mediums table, updated tactic_types
