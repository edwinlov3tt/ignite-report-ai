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
import { handleGetProducts, handleGetPlatforms, handleGetIndustries, handleGetSoulDocs, handleGetPerformanceTables } from './routes/schema'
import { curatorRouter } from './routes/curator'
import { syncAllToFallback } from './services/sync'
import {
  handleDiscover,
  handleGetFields,
  handleGetLogs,
  handleGetNewFields,
  handleUpdateFieldStatus,
  handleGetStats,
} from './routes/fieldDiscovery'
import {
  handleGenerateSuggestions,
  handleGetSuggestions,
  handleGetSuggestionStats,
  handleApproveSuggestion,
  handleRejectSuggestion,
  handleBulkApprove,
  handlePreviewSuggestion,
  handleExportSuggestions,
} from './routes/extractorSuggestions'
import {
  handleGenerateEmbeddings,
  handleGenerateAllEmbeddings,
  handleEmbedSoulDocument,
  handleGetEmbeddingStats,
  handleSemanticSearch,
  handleMatchTactic,
} from './routes/embeddings'

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
app.get('/schema/performance-tables', handleGetPerformanceTables)

// Admin Routes (protected in production)
app.post('/admin/publish', handlePublish)
app.post('/admin/sync', handleSync)
app.get('/admin/sync/status', handleSyncStatus)

// Curator Routes (Schema Curator Agent)
app.route('/curator', curatorRouter)

// Field Discovery Routes (Schema Intelligence)
app.post('/field-discovery/discover', handleDiscover)
app.get('/field-discovery/fields', handleGetFields)
app.get('/field-discovery/logs', handleGetLogs)
app.get('/field-discovery/new', handleGetNewFields)
app.get('/field-discovery/stats', handleGetStats)
app.put('/field-discovery/fields/:path/status', handleUpdateFieldStatus)

// Extractor Suggestions Routes (AI-powered)
app.post('/extractor-suggestions/generate', handleGenerateSuggestions)
app.get('/extractor-suggestions', handleGetSuggestions)
app.get('/extractor-suggestions/stats', handleGetSuggestionStats)
app.get('/extractor-suggestions/export', handleExportSuggestions)
app.post('/extractor-suggestions/bulk-approve', handleBulkApprove)
app.get('/extractor-suggestions/:id/preview', handlePreviewSuggestion)
app.post('/extractor-suggestions/:id/approve', handleApproveSuggestion)
app.post('/extractor-suggestions/:id/reject', handleRejectSuggestion)

// Embeddings Routes (RAG-enhanced semantic search)
app.post('/embeddings/generate', handleGenerateEmbeddings)
app.post('/embeddings/generate-all', handleGenerateAllEmbeddings)
app.post('/embeddings/soul-document/:versionId', handleEmbedSoulDocument)
app.get('/embeddings/stats', handleGetEmbeddingStats)
app.post('/embeddings/search', handleSemanticSearch)
app.post('/embeddings/match-tactic', handleMatchTactic)

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
