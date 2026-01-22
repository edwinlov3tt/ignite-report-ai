/**
 * Curator Routes Index
 * Registers all Schema Curator API endpoints
 */

import { Hono } from 'hono'
import type { Env } from '../../types/bindings'
import { handleExtract, handleGetSession } from './extract'
import commitRouter from './commit'
import researchRouter from './research'
import productResearchRouter from './productResearch'
import sourcesRouter from './sources'
import feedbackRouter from './feedback'

// Create a sub-router for curator endpoints
const curatorRouter = new Hono<{ Bindings: Env }>()

// Extraction endpoints
curatorRouter.post('/extract', handleExtract)
curatorRouter.get('/session/:id', handleGetSession)

// Research endpoint (legacy - AI-powered industry seeding)
curatorRouter.route('/research', researchRouter)

// Product Research endpoint (new - research-first mode)
curatorRouter.route('/research/product', productResearchRouter)

// Commit endpoint
curatorRouter.route('/commit', commitRouter)

// Sources endpoint (centralized source repository)
curatorRouter.route('/sources', sourcesRouter)

// Feedback endpoint (continuous learning)
curatorRouter.route('/feedback', feedbackRouter)

// Future endpoints
// curatorRouter.post('/preview', handlePreview)
// curatorRouter.post('/rollback', handleRollback)
// curatorRouter.get('/whitelist', handleGetWhitelist)

export { curatorRouter }
