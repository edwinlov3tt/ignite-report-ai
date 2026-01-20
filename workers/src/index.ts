/**
 * Report.AI Cloudflare Worker
 * Main entry point with Hono router
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import type { Env } from './types/bindings'
import { handleAnalyze } from './routes/analyze'
import { handleLumina } from './routes/lumina'
import { handleFeedback } from './routes/feedback'
import { handlePublish } from './routes/admin/publish'
import { handleSync, handleSyncStatus } from './routes/admin/sync'
import { handleGetReport } from './routes/reports'
import { handleGetProducts, handleGetPlatforms, handleGetIndustries, handleGetSoulDocs } from './routes/schema'
import { syncAllToFallback } from './services/sync'

// Create Hono app with typed bindings
const app = new Hono<{ Bindings: Env }>()

// Middleware
app.use('*', cors({
  origin: (origin) => {
    // Allow any localhost port for development
    if (origin && origin.startsWith('http://localhost:')) return origin
    // Allow production domains
    const allowed = ['https://report-ai.vercel.app', 'https://report-ai.edwinlovett.com']
    return allowed.includes(origin) ? origin : allowed[0]
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.use('*', logger())
app.use('*', prettyJSON())

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'report-ai-worker',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT,
  })
})

app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// Main API Routes
app.post('/analyze', handleAnalyze)
app.post('/lumina', handleLumina)
app.post('/feedback', handleFeedback)
app.get('/reports/:id', handleGetReport)

// Schema Routes (for Schema Admin frontend)
app.get('/schema/products', handleGetProducts)
app.get('/schema/platforms', handleGetPlatforms)
app.get('/schema/industries', handleGetIndustries)
app.get('/schema/soul-docs', handleGetSoulDocs)

// Admin Routes (protected in production)
app.post('/admin/publish', handlePublish)
app.post('/admin/sync', handleSync)
app.get('/admin/sync/status', handleSyncStatus)

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error(`Error: ${err.message}`, err.stack)
  return c.json({
    error: 'Internal Server Error',
    message: c.env.ENVIRONMENT === 'development' ? err.message : 'An error occurred',
  }, 500)
})

// Scheduled handler for cron triggers
async function scheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  console.log(`Cron triggered at ${new Date(event.scheduledTime).toISOString()}`)

  try {
    const result = await syncAllToFallback(env)
    console.log('Daily sync completed:', {
      success: result.success,
      tables: Object.entries(result.tables).map(([name, r]) => ({
        name,
        success: r.success,
        rows: r.rowsSynced,
      })),
    })
  } catch (error) {
    console.error('Daily sync failed:', error)
  }
}

export default {
  fetch: app.fetch,
  scheduled,
}
