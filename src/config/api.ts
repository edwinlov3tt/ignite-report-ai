/**
 * API Configuration
 * Centralizes API endpoints for the application
 */

// Worker API base URL - use environment variable or default to production
const WORKER_API_URL = import.meta.env.VITE_API_URL || 'https://report-ai-api.edwin-6f1.workers.dev'

// Supabase configuration
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ggxbjxouyhntdbgcnvcu.supabase.co'
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ouxCoxZjAtsLHO4L-sToJA_I6hoHsAm'

// Legacy API URL (for development fallback)
const LEGACY_API_URL = import.meta.env.VITE_LEGACY_API_URL || ''

export const API_CONFIG = {
  // Cloudflare Worker endpoints
  worker: {
    base: WORKER_API_URL,
    analyze: `${WORKER_API_URL}/analyze`,
    lumina: `${WORKER_API_URL}/lumina`,
    feedback: `${WORKER_API_URL}/feedback`,
    reports: (id: string) => `${WORKER_API_URL}/reports/${id}`,
    health: `${WORKER_API_URL}/health`,
  },

  // Legacy endpoints (if needed for fallback)
  legacy: {
    base: LEGACY_API_URL,
    analyze: `${LEGACY_API_URL}/api/analyze.php`,
  },

  // Use worker by default
  useWorker: true,
}

/**
 * Get the active analyze endpoint
 */
export function getAnalyzeEndpoint(): string {
  return API_CONFIG.useWorker ? API_CONFIG.worker.analyze : API_CONFIG.legacy.analyze
}

/**
 * Get the Lumina endpoint
 */
export function getLuminaEndpoint(): string {
  return API_CONFIG.worker.lumina
}
