# Cloudflare Worker Integration Guide

This guide explains how to deploy Report AI agents as Cloudflare Workers.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────────────────────┐    │
│  │                 │    │         Expert Agents            │    │
│  │   Orchestrator  │───▶│  ┌─────────┐ ┌─────────┐        │    │
│  │     Worker      │    │  │Facebook │ │ Google  │ ...    │    │
│  │                 │◀───│  │ Expert  │ │ Expert  │        │    │
│  └────────┬────────┘    │  └─────────┘ └─────────┘        │    │
│           │             └─────────────────────────────────┘    │
│           │                                                    │
│           ▼                                                    │
│  ┌─────────────────┐    ┌─────────────────────────────────┐    │
│  │    D1 Database  │    │         KV Store                │    │
│  │  (Benchmarks,   │    │  (Cache, Sessions, Context)     │    │
│  │   Knowledge)    │    │                                 │    │
│  └─────────────────┘    └─────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Project Setup

### 1. Initialize Worker Project

```bash
# Create new worker project
npm create cloudflare@latest report-ai-worker

# Install dependencies
cd report-ai-worker
npm install @anthropic-ai/sdk hono
```

### 2. Configure wrangler.toml

```toml
name = "report-ai-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

# D1 Database for knowledge storage
[[d1_databases]]
binding = "DB"
database_name = "report-ai-knowledge"
database_id = "your-database-id"

# KV namespace for caching
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

# R2 bucket for report storage
[[r2_buckets]]
binding = "REPORTS"
bucket_name = "report-ai-reports"

# Secrets (set via wrangler secret put)
# ANTHROPIC_API_KEY
```

### 3. Set Secrets

```bash
# Set API key
wrangler secret put ANTHROPIC_API_KEY
```

## Main Worker Implementation

### Entry Point (src/index.ts)

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Anthropic } from '@anthropic-ai/sdk';
import { analyzeRequest } from './handlers/analyze';
import { runMultiAgentAnalysis } from './handlers/multi-agent';

type Bindings = {
  DB: D1Database;
  CACHE: KVNamespace;
  REPORTS: R2Bucket;
  ANTHROPIC_API_KEY: string;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('*', cors());

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Main analysis endpoint
app.post('/api/analyze', async (c) => {
  const body = await c.req.json();
  
  // Determine complexity
  const complexity = calculateComplexity(body);
  
  if (complexity === 'simple') {
    return analyzeRequest(c, body);
  } else {
    return runMultiAgentAnalysis(c, body);
  }
});

// Agent-specific endpoints
app.post('/api/agents/:agentType/:agentName', async (c) => {
  const { agentType, agentName } = c.req.param();
  const body = await c.req.json();
  
  const result = await runSingleAgent(c, agentType, agentName, body);
  return c.json(result);
});

// Knowledge management
app.get('/api/knowledge/:type', async (c) => {
  const { type } = c.req.param();
  const knowledge = await c.env.DB.prepare(
    'SELECT * FROM knowledge WHERE type = ?'
  ).bind(type).all();
  
  return c.json(knowledge.results);
});

function calculateComplexity(request: any): 'simple' | 'complex' {
  const platformCount = request.platforms?.length || 1;
  const tacticCount = request.tactics?.length || 1;
  
  if (platformCount <= 2 && tacticCount <= 2) {
    return 'simple';
  }
  return 'complex';
}

export default app;
```

### Single Agent Handler

```typescript
// src/handlers/analyze.ts
import { Context } from 'hono';
import Anthropic from '@anthropic-ai/sdk';
import { buildContext } from '../context/builder';
import { getSystemPrompt } from '../prompts/system';

export async function analyzeRequest(c: Context, request: AnalyzeRequest) {
  const anthropic = new Anthropic({
    apiKey: c.env.ANTHROPIC_API_KEY
  });

  // Build context layers
  const context = await buildContext(c.env.DB, {
    platforms: request.platforms,
    industries: request.industries,
    tactics: request.tactics
  });

  // Get cached system prompt
  const systemPrompt = await getSystemPrompt(c.env.CACHE);

  // Call Claude with prompt caching
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8000,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' }
      },
      {
        type: 'text',
        text: context.platformContext,
        cache_control: { type: 'ephemeral' }
      },
      {
        type: 'text',
        text: context.industryContext,
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [
      {
        role: 'user',
        content: buildUserMessage(request)
      }
    ]
  });

  // Store report
  const reportId = crypto.randomUUID();
  await storeReport(c.env.REPORTS, reportId, response);

  return c.json({
    report_id: reportId,
    analysis: response.content[0].text,
    usage: response.usage
  });
}

function buildUserMessage(request: AnalyzeRequest): string {
  return `
<campaign_context>
  <company>${JSON.stringify(request.company)}</company>
  <date_range>${request.dateRange.start} to ${request.dateRange.end}</date_range>
</campaign_context>

<performance_data>
${request.performanceData}
</performance_data>

<analysis_request>
${request.query || 'Provide a comprehensive analysis of this campaign performance.'}
</analysis_request>
`;
}
```

### Multi-Agent Handler

```typescript
// src/handlers/multi-agent.ts
import { Context } from 'hono';
import Anthropic from '@anthropic-ai/sdk';
import { getAgentConfig } from '../agents/registry';

interface AgentResult {
  agent: string;
  type: string;
  output: string;
  tokens: number;
}

export async function runMultiAgentAnalysis(
  c: Context,
  request: AnalyzeRequest
) {
  const anthropic = new Anthropic({
    apiKey: c.env.ANTHROPIC_API_KEY
  });

  // Determine required agents
  const requiredAgents = determineAgents(request);

  // Run expert agents in parallel
  const expertPromises = requiredAgents.map(agent =>
    runExpertAgent(anthropic, c.env, agent, request)
  );

  const expertResults = await Promise.all(expertPromises);

  // Run orchestrator to synthesize
  const finalReport = await runOrchestrator(
    anthropic,
    c.env,
    expertResults,
    request
  );

  // Store report with expert traces
  const reportId = crypto.randomUUID();
  await storeMultiAgentReport(c.env.REPORTS, reportId, {
    expertResults,
    finalReport
  });

  return c.json({
    report_id: reportId,
    report: finalReport,
    agents_used: expertResults.map(r => r.agent),
    total_tokens: expertResults.reduce((sum, r) => sum + r.tokens, 0)
  });
}

function determineAgents(request: AnalyzeRequest): AgentSpec[] {
  const agents: AgentSpec[] = [];

  // Add platform experts
  for (const platform of request.platforms || []) {
    agents.push({
      type: 'platform',
      name: platform,
      model: 'claude-haiku-4-5-20251001'  // Use Haiku for experts
    });
  }

  // Add industry expert
  if (request.industry) {
    agents.push({
      type: 'industry',
      name: request.industry,
      model: 'claude-haiku-4-5-20251001'
    });
  }

  // Add tactic experts
  for (const tactic of request.tactics || []) {
    agents.push({
      type: 'tactic',
      name: tactic,
      model: 'claude-haiku-4-5-20251001'
    });
  }

  return agents;
}

async function runExpertAgent(
  anthropic: Anthropic,
  env: Bindings,
  agent: AgentSpec,
  request: AnalyzeRequest
): Promise<AgentResult> {
  // Load agent config
  const config = await getAgentConfig(env.DB, agent.type, agent.name);

  // Load agent-specific context
  const context = await loadAgentContext(env.DB, agent);

  const response = await anthropic.messages.create({
    model: agent.model,
    max_tokens: 2000,
    system: config.systemPrompt,
    messages: [
      {
        role: 'user',
        content: `
<expertise_context>
${context}
</expertise_context>

<performance_data>
${request.performanceData}
</performance_data>

Analyze this data from your perspective as the ${agent.name} ${agent.type} expert.
Provide specific, quantified insights relevant to your expertise only.
`
      }
    ]
  });

  return {
    agent: agent.name,
    type: agent.type,
    output: response.content[0].text,
    tokens: response.usage.input_tokens + response.usage.output_tokens
  };
}

async function runOrchestrator(
  anthropic: Anthropic,
  env: Bindings,
  expertResults: AgentResult[],
  request: AnalyzeRequest
): Promise<string> {
  // Format expert outputs
  const expertAnalyses = expertResults.map(r => `
<expert_analysis agent="${r.agent}" type="${r.type}">
${r.output}
</expert_analysis>
`).join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',  // Use Sonnet for orchestration
    max_tokens: 4000,
    system: ORCHESTRATOR_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `
<campaign_context>
${JSON.stringify(request.company)}
</campaign_context>

<expert_analyses>
${expertAnalyses}
</expert_analyses>

Synthesize these expert analyses into a cohesive report following 
the output guidelines. Prioritize recommendations by business impact.
`
      }
    ]
  });

  return response.content[0].text;
}

const ORCHESTRATOR_SYSTEM_PROMPT = `You are the Report Orchestrator for the Intelligence Flywheel system.

Your role is to synthesize insights from multiple expert agents into a cohesive, 
actionable report.

Rules:
1. Never duplicate insights - each expert's findings appear once
2. Prioritize recommendations by expected business impact
3. Create a unified narrative, not just concatenated sections
4. Identify cross-cutting themes and opportunities
5. Follow the output guidelines exactly

Output structure:
1. Executive Summary (2-3 sentences)
2. Key Metrics Overview (table with benchmarks)
3. Key Findings (synthesized from experts)
4. Prioritized Recommendations
5. Warnings (if any)
`;
```

## Database Schema

```sql
-- Create tables for knowledge storage
CREATE TABLE platforms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quirks TEXT,  -- JSON array
  kpis TEXT,    -- JSON object
  thresholds TEXT,  -- JSON object
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE industries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  seasonality TEXT,
  benchmarks TEXT,  -- JSON object
  insights TEXT,    -- JSON array
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tactics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  key_metrics TEXT,  -- JSON array
  optimization_focus TEXT,  -- JSON array
  warning_signs TEXT,  -- JSON array
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agent_configs (
  id TEXT PRIMARY KEY,
  agent_type TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  model TEXT DEFAULT 'claude-haiku-4-5-20251001',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_type, agent_name)
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  campaign_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  report_content TEXT,
  agents_used TEXT,  -- JSON array
  tokens_used INTEGER,
  feedback_score INTEGER,
  feedback_notes TEXT
);

-- Index for fast lookups
CREATE INDEX idx_reports_campaign ON reports(campaign_id);
CREATE INDEX idx_agent_configs_lookup ON agent_configs(agent_type, agent_name);
```

## Deployment

```bash
# Deploy to Cloudflare
wrangler deploy

# Deploy to staging
wrangler deploy --env staging

# View logs
wrangler tail
```

## Testing

```bash
# Test health endpoint
curl https://report-ai-worker.your-subdomain.workers.dev/health

# Test analysis
curl -X POST https://report-ai-worker.your-subdomain.workers.dev/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "company": {"name": "Test Co", "industry": "automotive"},
    "platforms": ["facebook"],
    "tactics": ["retargeting"],
    "performanceData": "impressions,clicks,spend\n100000,1500,850",
    "dateRange": {"start": "2024-01-01", "end": "2024-01-31"}
  }'
```
