/**
 * Curator Routes Index
 * Registers all Schema Curator API endpoints
 */

import { Hono } from 'hono'
import type { Env } from '../../types/bindings'
import { handleExtract, handleGetSession } from './extract'
import commitRouter from './commit'
import researchRouter from './research'

// Create a sub-router for curator endpoints
const curatorRouter = new Hono<{ Bindings: Env }>()

// Extraction endpoints
curatorRouter.post('/extract', handleExtract)
curatorRouter.get('/session/:id', handleGetSession)

// Research endpoint (AI-powered industry seeding)
curatorRouter.route('/research', researchRouter)

// Commit endpoint
curatorRouter.route('/commit', commitRouter)

// Future endpoints
// curatorRouter.post('/preview', handlePreview)
// curatorRouter.post('/rollback', handleRollback)
// curatorRouter.get('/whitelist', handleGetWhitelist)

export { curatorRouter }
