/**
 * Supabase Client for Frontend
 * Uses anon key for browser-safe read operations
 */

import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, API_CONFIG } from '@/config/api'

// Create the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Worker API URL for operations that need the service key
export const WORKER_API_URL = API_CONFIG.worker.base

/**
 * Publish changes to KV cache via worker
 */
export async function publishToKV(namespace: 'platforms' | 'industries' | 'mediums' | 'soul_docs' | 'schema' | 'all'): Promise<{
  success: boolean
  synced?: number
  error?: string
}> {
  try {
    const response = await fetch(`${WORKER_API_URL}/admin/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ namespace }),
    })
    return await response.json()
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
