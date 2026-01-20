# Report.AI Schema Admin: Complete Architecture Guide

## Executive Summary

This document outlines a production-ready architecture for your Schema Admin system that:
- Collects and stores marketing intelligence by industry, platform, and tactic
- Delivers context to Claude efficiently using prompt caching and progressive disclosure
- Uses a multi-agent architecture with specialized "expert" agents
- Runs on Cloudflare Workers for global edge performance

---

## 1. Data Collection & Storage Architecture

### Database Schema Design

```sql
-- ============================================
-- CORE KNOWLEDGE TABLES
-- ============================================

-- Industries (top-level segmentation)
CREATE TABLE industries (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,          -- 'automotive', 'healthcare', 'ecommerce'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_industry_id INT REFERENCES industries(id),  -- For sub-industries
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Industry-specific benchmarks
CREATE TABLE industry_benchmarks (
    id SERIAL PRIMARY KEY,
    industry_id INT REFERENCES industries(id),
    platform VARCHAR(50) NOT NULL,              -- 'facebook', 'google', 'programmatic'
    tactic_type VARCHAR(100),                   -- 'retargeting', 'prospecting', 'brand'
    metric_name VARCHAR(50) NOT NULL,           -- 'cpm', 'ctr', 'cpa', 'roas'
    benchmark_low DECIMAL(10,4),
    benchmark_mid DECIMAL(10,4),                -- Median/expected
    benchmark_high DECIMAL(10,4),
    sample_size INT,                            -- How many campaigns informed this
    confidence_score DECIMAL(3,2),              -- 0.00 to 1.00
    quarter VARCHAR(10),                        -- 'Q4-2024'
    source VARCHAR(100),                        -- 'internal', 'comscore', 'buyer_input'
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(industry_id, platform, tactic_type, metric_name, quarter)
);

-- ============================================
-- PLATFORM KNOWLEDGE
-- ============================================

CREATE TABLE platforms (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),                       -- 'social', 'search', 'programmatic', 'ctv'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Platform-specific quirks and guidelines
CREATE TABLE platform_knowledge (
    id SERIAL PRIMARY KEY,
    platform_id INT REFERENCES platforms(id),
    knowledge_type VARCHAR(50) NOT NULL,        -- 'quirk', 'best_practice', 'limitation', 'optimization_tip'
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    severity VARCHAR(20),                       -- 'critical', 'important', 'informational'
    applies_to_tactics TEXT[],                  -- ['retargeting', 'prospecting']
    source_type VARCHAR(50),                    -- 'dcm', 'buyer', 'documentation'
    source_user_id INT,
    verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Platform-tactic specific KPIs
CREATE TABLE platform_tactic_kpis (
    id SERIAL PRIMARY KEY,
    platform_id INT REFERENCES platforms(id),
    tactic_type VARCHAR(100) NOT NULL,
    primary_kpis TEXT[] NOT NULL,               -- ['ctr', 'cpm', 'frequency']
    secondary_kpis TEXT[],
    warning_indicators JSONB,                   -- {"ctr_below": 0.5, "frequency_above": 8}
    optimization_focus TEXT,
    analysis_guidance TEXT,                     -- Specific guidance for AI
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- REPORT ANALYTICS (Learning Loop)
-- ============================================

-- Track every generated report
CREATE TABLE generated_reports (
    id SERIAL PRIMARY KEY,
    report_uuid UUID UNIQUE NOT NULL,
    
    -- Context captured
    campaign_id VARCHAR(100),
    industry_id INT REFERENCES industries(id),
    company_name VARCHAR(200),
    company_size VARCHAR(50),
    
    -- What was analyzed
    platforms_analyzed TEXT[],
    tactics_analyzed TEXT[],
    date_range_start DATE,
    date_range_end DATE,
    
    -- Performance data snapshot (for benchmark updates)
    performance_metrics JSONB,                  -- Raw KPIs per tactic
    
    -- AI analysis metadata
    ai_model_used VARCHAR(50),
    prompt_tokens_used INT,
    completion_tokens_used INT,
    processing_time_ms INT,
    schema_version VARCHAR(20),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

-- Track AI-generated insights
CREATE TABLE report_insights (
    id SERIAL PRIMARY KEY,
    report_id INT REFERENCES generated_reports(id),
    
    insight_type VARCHAR(50) NOT NULL,          -- 'observation', 'recommendation', 'warning'
    tactic_type VARCHAR(100),
    platform VARCHAR(50),
    
    insight_text TEXT NOT NULL,
    confidence_score DECIMAL(3,2),
    
    -- For learning
    metrics_referenced JSONB,                   -- What data drove this insight
    benchmark_compared VARCHAR(100),            -- Which benchmark was used
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Human feedback on reports
CREATE TABLE report_feedback (
    id SERIAL PRIMARY KEY,
    report_id INT REFERENCES generated_reports(id),
    insight_id INT REFERENCES report_insights(id),  -- Can be report-level or insight-level
    
    feedback_type VARCHAR(50) NOT NULL,         -- 'accuracy', 'actionability', 'relevance'
    rating INT CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    correction_text TEXT,                       -- What should it have said?
    
    user_role VARCHAR(50),                      -- 'buyer', 'seller', 'dcm', 'client'
    user_id INT,
    
    -- For learning extraction
    should_update_benchmark BOOLEAN DEFAULT FALSE,
    should_create_platform_knowledge BOOLEAN DEFAULT FALSE,
    processed_for_learning BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TACTIC ANALYSIS CONTEXT (Your Schema Admin)
-- ============================================

-- Enhanced version of your existing structure
CREATE TABLE tactic_analysis_context (
    id SERIAL PRIMARY KEY,
    product_slug VARCHAR(100) NOT NULL,
    subproduct_slug VARCHAR(100),
    tactic_type VARCHAR(100),
    
    -- AI Guidance (hierarchical - can be at any level)
    analysis_instructions TEXT,                 -- Main prompt instructions
    chain_of_thought_guidance TEXT,             -- How to reason about this tactic
    output_format_requirements JSONB,           -- What sections to include
    
    -- What to look for
    critical_metrics TEXT[],
    warning_thresholds JSONB,
    optimization_priorities TEXT[],
    
    -- Examples for few-shot learning
    example_good_analysis TEXT,
    example_bad_analysis TEXT,
    
    -- Cache configuration
    cache_priority INT DEFAULT 50,              -- Higher = more important to cache
    context_token_estimate INT,                 -- Approximate size for budgeting
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(product_slug, subproduct_slug, tactic_type)
);
```

### Data Collection Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATA COLLECTION PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │  REPORT GENERATED │───▶│ CAPTURE METRICS  │───▶│ STORE IN DB      │  │
│  │  (Real-time)      │    │ - Platform data  │    │ - generated_     │  │
│  │                   │    │ - KPIs           │    │   reports        │  │
│  │                   │    │ - AI insights    │    │ - report_insights│  │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘  │
│                                                           │              │
│                                                           ▼              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │  BUYER/SELLER    │───▶│ FEEDBACK FORM    │───▶│ STORE FEEDBACK   │  │
│  │  REVIEWS REPORT  │    │ - Rate insights  │    │ - report_feedback│  │
│  │  (Human Loop)    │    │ - Add corrections│    │                  │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘  │
│                                                           │              │
│                                                           ▼              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    NIGHTLY LEARNING JOB                           │  │
│  │  1. Aggregate performance metrics by industry/platform/tactic     │  │
│  │  2. Calculate new benchmark ranges (percentiles)                  │  │
│  │  3. Extract validated platform knowledge from corrections         │  │
│  │  4. Update confidence scores based on sample sizes                │  │
│  │  5. Flag insights with low ratings for prompt review              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                           │              │
│                                                           ▼              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │ UPDATE BENCHMARKS│    │ UPDATE PLATFORM  │    │ REFINE AI        │  │
│  │ industry_        │    │ platform_        │    │ tactic_analysis_ │  │
│  │ benchmarks       │    │ knowledge        │    │ context          │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Request Flow Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE REQUEST FLOW                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  STEP 1: WEB APP REQUEST                                                │
│  ───────────────────────                                                 │
│  User uploads CSVs + enters company info + selects date range           │
│                          │                                               │
│                          ▼                                               │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ POST /api/analyze                                               │    │
│  │ {                                                               │    │
│  │   campaign_url: "https://lumina.townsquare.com/orders/12345",  │    │
│  │   company: { name, industry, size, goals },                    │    │
│  │   date_range: { start, end },                                  │    │
│  │   files: [{ name, content, detected_tactic }]                  │    │
│  │ }                                                               │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                          │                                               │
│                          ▼                                               │
│  STEP 2: CLOUDFLARE WORKER (Orchestrator)                               │
│  ────────────────────────────────────────                               │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ a) Validate request & authenticate                              │    │
│  │ b) Detect tactics from filenames using Schema                   │    │
│  │ c) Fetch campaign metadata from Lumina API                      │    │
│  │ d) Route to appropriate AI pipeline                             │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                          │                                               │
│                          ▼                                               │
│  STEP 3: CONTEXT ASSEMBLY (Pre-AI)                                      │
│  ─────────────────────────────────                                      │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ Query database for:                                             │    │
│  │  • Industry benchmarks (industry_benchmarks)                    │    │
│  │  • Platform knowledge (platform_knowledge)                      │    │
│  │  • Tactic-specific guidance (tactic_analysis_context)          │    │
│  │  • Platform-tactic KPIs (platform_tactic_kpis)                 │    │
│  │                                                                 │    │
│  │ Build context payload with token budgets                        │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                          │                                               │
│                          ▼                                               │
│  STEP 4: MULTI-AGENT PROCESSING                                         │
│  ──────────────────────────────                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│  │  │ PLATFORM    │  │ INDUSTRY    │  │ TACTIC      │             │   │
│  │  │ EXPERT      │  │ EXPERT      │  │ EXPERT      │             │   │
│  │  │             │  │             │  │             │             │   │
│  │  │ Knows FB,   │  │ Knows auto, │  │ Knows       │             │   │
│  │  │ Google,     │  │ healthcare, │  │ retargeting,│             │   │
│  │  │ programmatic│  │ ecommerce   │  │ prospecting │             │   │
│  │  │ quirks      │  │ benchmarks  │  │ optimization│             │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │   │
│  │         │                │                │                     │   │
│  │         └────────────────┼────────────────┘                     │   │
│  │                          ▼                                      │   │
│  │                 ┌─────────────────┐                             │   │
│  │                 │   ORCHESTRATOR  │                             │   │
│  │                 │   AGENT         │                             │   │
│  │                 │                 │                             │   │
│  │                 │ Synthesizes all │                             │   │
│  │                 │ expert inputs   │                             │   │
│  │                 │ into final      │                             │   │
│  │                 │ report          │                             │   │
│  │                 └─────────────────┘                             │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                          │                                               │
│                          ▼                                               │
│  STEP 5: RESPONSE & STORAGE                                             │
│  ──────────────────────────                                             │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ a) Stream response back to web app                              │    │
│  │ b) Store report in generated_reports                            │    │
│  │ c) Extract and store insights in report_insights                │    │
│  │ d) Return report_uuid for feedback collection                   │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Efficient Context Delivery (Don't Overwhelm the LLM)

### The Problem
Your system has potentially thousands of tokens of context:
- Industry benchmarks
- Platform quirks
- Tactic guidelines
- Company information
- Historical performance data

**You cannot send it all every time.** Claude has a 200K context window but:
1. More context = more cost (input tokens aren't free)
2. More context = slower responses (TTFB increases)
3. Irrelevant context = worse outputs (needle in haystack problem)

### The Solution: Layered Context with Prompt Caching

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CONTEXT LAYERING STRATEGY                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  LAYER 1: STATIC SYSTEM PROMPT (Cached - 1hr TTL)                       │
│  ═══════════════════════════════════════════════                        │
│  ~2,000-4,000 tokens                                                    │
│  • Core analyst persona and capabilities                                │
│  • Universal analysis framework                                         │
│  • Output structure requirements                                        │
│  • Chain-of-thought guidance                                            │
│                                                                          │
│  cache_control: { "type": "ephemeral", "ttl": "1h" }                   │
│                                                                          │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                                          │
│  LAYER 2: PLATFORM EXPERTISE (Cached - 5min TTL)                        │
│  ═══════════════════════════════════════════════                        │
│  ~1,000-3,000 tokens per platform                                       │
│  • Platform-specific quirks and limitations                             │
│  • Platform-tactic KPI definitions                                      │
│  • Optimization guidelines                                              │
│                                                                          │
│  Load ONLY for platforms in current campaign                            │
│  cache_control: { "type": "ephemeral" }  // 5min default               │
│                                                                          │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                                          │
│  LAYER 3: INDUSTRY CONTEXT (Cached - 5min TTL)                          │
│  ═════════════════════════════════════════════                          │
│  ~500-1,500 tokens                                                      │
│  • Industry-specific benchmarks                                         │
│  • Industry norms and expectations                                      │
│  • Seasonal patterns                                                    │
│                                                                          │
│  Load ONLY for the campaign's industry                                  │
│  cache_control: { "type": "ephemeral" }                                │
│                                                                          │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                                          │
│  LAYER 4: DYNAMIC REQUEST DATA (Never Cached)                           │
│  ════════════════════════════════════════════                           │
│  Variable size                                                          │
│  • Company information                                                  │
│  • Campaign metadata from Lumina                                        │
│  • CSV performance data                                                 │
│  • User's specific question/focus                                       │
│                                                                          │
│  No cache_control - unique per request                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Token Budget Management

```javascript
// Context Budget Manager
class ContextBudgetManager {
    constructor() {
        this.MAX_CONTEXT_TOKENS = 50000;  // Leave room for response
        this.RESERVED_FOR_RESPONSE = 8000;
        this.AVAILABLE_BUDGET = this.MAX_CONTEXT_TOKENS - this.RESERVED_FOR_RESPONSE;
    }

    allocateBudget(requestData) {
        const budgets = {
            system_prompt: 4000,        // Fixed - always needed
            platform_context: 0,        // Calculated based on platforms
            industry_context: 1500,     // Fixed per industry
            tactic_guidance: 0,         // Calculated based on tactics
            performance_data: 0,        // Calculated based on file sizes
            company_context: 500,       // Fixed
            user_query: 200             // Fixed
        };

        // Calculate platform budget (max 3000 tokens per platform)
        const platformCount = requestData.platforms.length;
        budgets.platform_context = Math.min(platformCount * 2000, 6000);

        // Calculate tactic budget
        const tacticCount = requestData.tactics.length;
        budgets.tactic_guidance = Math.min(tacticCount * 1000, 4000);

        // Remaining budget goes to performance data
        const usedBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
        budgets.performance_data = this.AVAILABLE_BUDGET - usedBudget;

        return budgets;
    }

    // Compress performance data if over budget
    compressPerformanceData(csvData, maxTokens) {
        // Strategy 1: Sample rows if too many
        // Strategy 2: Remove low-importance columns
        // Strategy 3: Aggregate to summary statistics
        // Return compressed version
    }
}
```

### XML-Structured Prompt Template

```xml
<system>
<role>
You are an expert digital marketing analyst specializing in multi-channel 
campaign optimization. You provide actionable, data-driven insights grounded 
in actual performance metrics and industry benchmarks.
</role>

<analysis_framework>
For each tactic analyzed, you MUST:
1. Compare metrics to provided benchmarks
2. Identify specific optimization opportunities
3. Provide quantified recommendations with expected impact
4. Flag any warning indicators
</analysis_framework>

<output_requirements>
- Ground ALL insights in the provided data
- Reference specific metrics and benchmarks
- Never combine metrics across different tactics
- Each recommendation must have an expected outcome
</output_requirements>

<chain_of_thought>
Before providing your analysis, consider:
1. What are the PRIMARY KPIs for each tactic?
2. How does performance compare to benchmarks?
3. What specific factors might explain over/under performance?
4. What is the single highest-impact optimization?
</chain_of_thought>
</system>

<platform_expertise platform="{{PLATFORM_NAME}}">
{{PLATFORM_KNOWLEDGE}}
</platform_expertise>

<industry_benchmarks industry="{{INDUSTRY_NAME}}">
{{INDUSTRY_BENCHMARK_TABLE}}
</industry_benchmarks>

<tactic_guidance tactic="{{TACTIC_TYPE}}">
{{TACTIC_SPECIFIC_INSTRUCTIONS}}
</tactic_guidance>

<campaign_context>
<company>
{{COMPANY_INFO}}
</company>

<campaign_metadata>
{{LUMINA_DATA}}
</campaign_metadata>

<performance_data>
{{CSV_DATA_FORMATTED}}
</performance_data>
</campaign_context>

<user_request>
{{USER_QUESTION_OR_DEFAULT}}
</user_request>
```

---

## 4. Cloudflare Worker Architecture with Multi-Agent System

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE WORKER ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│    WEB APP                                                               │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  CLOUDFLARE WORKER: /api/analyze                                 │   │
│  │  (Entry Point - Orchestrator)                                    │   │
│  │                                                                  │   │
│  │  • Request validation                                            │   │
│  │  • Authentication                                                │   │
│  │  • Route to appropriate handler                                  │   │
│  └──────────────────────────┬──────────────────────────────────────┘   │
│                             │                                           │
│           ┌─────────────────┼─────────────────┐                        │
│           ▼                 ▼                 ▼                         │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                   │
│  │ D1 Database │   │ KV Store    │   │ R2 Storage  │                   │
│  │             │   │             │   │             │                   │
│  │ • Benchmarks│   │ • Cache     │   │ • Report    │                   │
│  │ • Platform  │   │ • Sessions  │   │   archives  │                   │
│  │   knowledge │   │ • Rate      │   │ • CSV       │                   │
│  │ • Reports   │   │   limits    │   │   uploads   │                   │
│  └─────────────┘   └─────────────┘   └─────────────┘                   │
│                             │                                           │
│                             ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  CONTEXT ASSEMBLY SERVICE                                        │   │
│  │                                                                  │   │
│  │  • Queries D1 for relevant context                              │   │
│  │  • Manages token budgets                                         │   │
│  │  • Builds layered prompt structure                              │   │
│  └──────────────────────────┬──────────────────────────────────────┘   │
│                             │                                           │
│                             ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  AI ORCHESTRATOR                                                 │   │
│  │  (Multi-Agent Coordinator)                                       │   │
│  │                                                                  │   │
│  │  Decides: Single-agent or Multi-agent based on complexity       │   │
│  └──────────────────────────┬──────────────────────────────────────┘   │
│                             │                                           │
│           ┌─────────────────┴─────────────────┐                        │
│           ▼                                   ▼                         │
│  ┌─────────────────────┐          ┌─────────────────────┐              │
│  │  SIMPLE PATH        │          │  MULTI-AGENT PATH   │              │
│  │  (1-2 tactics,      │          │  (3+ tactics,       │              │
│  │   single platform)  │          │   multi-platform)   │              │
│  │                     │          │                     │              │
│  │  Single Claude call │          │  Parallel expert    │              │
│  │  with full context  │          │  calls + synthesis  │              │
│  └─────────────────────┘          └─────────────────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Multi-Agent System Design

```javascript
// agents/types.ts
interface AgentConfig {
    name: string;
    expertise: string[];
    systemPrompt: string;
    contextLoader: (requestData: any) => Promise<string>;
    outputSchema: object;
}

interface AgentResponse {
    agent: string;
    insights: Insight[];
    recommendations: Recommendation[];
    warnings: Warning[];
    confidence: number;
    tokensUsed: number;
}

// Agent Definitions
const AGENTS: Record<string, AgentConfig> = {
    // Platform Expert Agents
    'facebook-expert': {
        name: 'Facebook/Meta Expert',
        expertise: ['facebook', 'instagram', 'meta'],
        systemPrompt: `You are a Facebook/Meta advertising specialist...`,
        contextLoader: loadFacebookContext,
        outputSchema: platformInsightSchema
    },
    
    'google-expert': {
        name: 'Google Ads Expert',
        expertise: ['google', 'youtube', 'search', 'display'],
        systemPrompt: `You are a Google Ads specialist...`,
        contextLoader: loadGoogleContext,
        outputSchema: platformInsightSchema
    },
    
    'programmatic-expert': {
        name: 'Programmatic Expert',
        expertise: ['programmatic', 'dsp', 'madhive', 'ttd'],
        systemPrompt: `You are a programmatic advertising specialist...`,
        contextLoader: loadProgrammaticContext,
        outputSchema: platformInsightSchema
    },

    // Industry Expert Agents
    'automotive-expert': {
        name: 'Automotive Industry Expert',
        expertise: ['automotive', 'auto', 'dealership'],
        systemPrompt: `You are an automotive marketing specialist...`,
        contextLoader: loadAutomotiveContext,
        outputSchema: industryInsightSchema
    },

    // Synthesis Agent
    'orchestrator': {
        name: 'Report Orchestrator',
        expertise: ['synthesis', 'reporting'],
        systemPrompt: `You synthesize insights from multiple experts...`,
        contextLoader: loadOrchestratorContext,
        outputSchema: finalReportSchema
    }
};
```

### Cloudflare Worker Implementation

```typescript
// src/worker.ts
import { Hono } from 'hono';
import { Anthropic } from '@anthropic-ai/sdk';

interface Env {
    ANTHROPIC_API_KEY: string;
    DB: D1Database;
    KV: KVNamespace;
    R2: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>();

// Main analysis endpoint
app.post('/api/analyze', async (c) => {
    const env = c.env;
    const requestData = await c.req.json();
    
    // 1. Validate and authenticate
    const validation = validateRequest(requestData);
    if (!validation.valid) {
        return c.json({ error: validation.error }, 400);
    }

    // 2. Detect tactics and determine complexity
    const detectedTactics = await detectTactics(requestData.files, env.DB);
    const complexity = assessComplexity(detectedTactics, requestData);

    // 3. Choose processing path
    if (complexity === 'simple') {
        return await handleSimpleAnalysis(requestData, detectedTactics, env, c);
    } else {
        return await handleMultiAgentAnalysis(requestData, detectedTactics, env, c);
    }
});

// Simple analysis (single Claude call)
async function handleSimpleAnalysis(
    requestData: any,
    tactics: DetectedTactic[],
    env: Env,
    c: any
) {
    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    
    // Build context with caching
    const context = await buildContext(requestData, tactics, env.DB);
    
    // Make API call with prompt caching
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000,
        system: [
            {
                type: 'text',
                text: context.staticSystemPrompt,
                cache_control: { type: 'ephemeral' }  // Cache for 5 min
            },
            {
                type: 'text',
                text: context.platformContext,
                cache_control: { type: 'ephemeral' }
            }
        ],
        messages: [
            {
                role: 'user',
                content: context.dynamicContent
            }
        ]
    });

    // Store report and return
    const reportId = await storeReport(response, requestData, env.DB);
    
    return c.json({
        report: response.content[0].text,
        report_id: reportId,
        usage: response.usage
    });
}

// Multi-agent analysis
async function handleMultiAgentAnalysis(
    requestData: any,
    tactics: DetectedTactic[],
    env: Env,
    c: any
) {
    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    
    // Determine which expert agents to invoke
    const requiredAgents = determineRequiredAgents(tactics, requestData);
    
    // Run expert agents in parallel
    const expertPromises = requiredAgents.map(agentId => 
        runExpertAgent(agentId, requestData, tactics, anthropic, env)
    );
    
    const expertResponses = await Promise.all(expertPromises);
    
    // Synthesize with orchestrator agent
    const finalReport = await runOrchestratorAgent(
        expertResponses,
        requestData,
        anthropic,
        env
    );
    
    // Store and return
    const reportId = await storeMultiAgentReport(
        finalReport,
        expertResponses,
        requestData,
        env.DB
    );
    
    return c.json({
        report: finalReport.content,
        expert_insights: expertResponses.map(r => ({
            agent: r.agent,
            summary: r.summary
        })),
        report_id: reportId,
        usage: calculateTotalUsage(expertResponses, finalReport)
    });
}

// Expert agent execution
async function runExpertAgent(
    agentId: string,
    requestData: any,
    tactics: DetectedTactic[],
    anthropic: Anthropic,
    env: Env
): Promise<AgentResponse> {
    const agentConfig = AGENTS[agentId];
    
    // Load agent-specific context
    const context = await agentConfig.contextLoader({
        requestData,
        tactics: tactics.filter(t => 
            agentConfig.expertise.some(e => t.platform.includes(e))
        ),
        db: env.DB
    });
    
    // Call Claude with agent's system prompt
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4000,
        system: [
            {
                type: 'text',
                text: agentConfig.systemPrompt,
                cache_control: { type: 'ephemeral' }
            },
            {
                type: 'text',
                text: context,
                cache_control: { type: 'ephemeral' }
            }
        ],
        messages: [
            {
                role: 'user',
                content: buildAgentPrompt(requestData, agentConfig)
            }
        ]
    });
    
    // Parse structured output
    return parseAgentResponse(response, agentId);
}

// Orchestrator synthesis
async function runOrchestratorAgent(
    expertResponses: AgentResponse[],
    requestData: any,
    anthropic: Anthropic,
    env: Env
): Promise<any> {
    const orchestratorPrompt = `
<expert_analyses>
${expertResponses.map(r => `
<expert name="${r.agent}">
<insights>
${r.insights.map(i => `- ${i.text}`).join('\n')}
</insights>
<recommendations>
${r.recommendations.map(rec => `- ${rec.text} (Impact: ${rec.expectedImpact})`).join('\n')}
</recommendations>
<warnings>
${r.warnings.map(w => `- ${w.text}`).join('\n')}
</warnings>
</expert>
`).join('\n')}
</expert_analyses>

<synthesis_instructions>
Create a unified campaign analysis report that:
1. Synthesizes insights across all expert analyses
2. Prioritizes recommendations by expected impact
3. Identifies cross-platform opportunities
4. Presents a cohesive narrative, not disjointed sections
5. Includes specific next steps with responsible parties
</synthesis_instructions>

<company_context>
${JSON.stringify(requestData.company)}
</company_context>
`;

    return await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000,
        system: AGENTS['orchestrator'].systemPrompt,
        messages: [{ role: 'user', content: orchestratorPrompt }]
    });
}

export default app;
```

### Agent Skills Implementation (Progressive Disclosure)

For your Schema Admin, you can structure knowledge as "Skills" that Claude loads on-demand:

```
/skills/
├── platforms/
│   ├── facebook/
│   │   ├── SKILL.md              # Main instructions
│   │   ├── quirks.md             # Platform quirks
│   │   ├── benchmarks.json       # Current benchmarks
│   │   └── optimization-tips.md  # Optimization guidance
│   ├── google/
│   │   ├── SKILL.md
│   │   └── ...
│   └── programmatic/
│       ├── SKILL.md
│       └── ...
├── industries/
│   ├── automotive/
│   │   ├── SKILL.md
│   │   ├── benchmarks.json
│   │   └── seasonal-patterns.md
│   └── healthcare/
│       └── ...
└── tactics/
    ├── retargeting/
    │   ├── SKILL.md
    │   └── optimization-playbook.md
    └── prospecting/
        └── ...
```

**Example SKILL.md:**

```yaml
---
name: facebook-advertising
description: >
  Expert knowledge for analyzing Facebook/Meta advertising campaigns.
  Use when analyzing campaigns that include Facebook, Instagram, or
  Meta Audience Network placements.
triggers:
  - facebook
  - instagram
  - meta
  - fb
---

# Facebook Advertising Analysis

## Platform Quirks

<critical_knowledge>
- Learning phase requires 50 conversions per week per ad set
- iOS 14.5+ tracking limitations affect conversion attribution
- Frequency above 3x in 7 days typically indicates audience saturation
- Video views use 3-second threshold by default
</critical_knowledge>

## Primary KPIs by Objective

| Objective | Primary KPIs | Warning Thresholds |
|-----------|--------------|-------------------|
| Awareness | CPM, Reach, Frequency | CPM > $15, Frequency > 4 |
| Traffic | CPC, CTR, Landing Page Views | CTR < 1%, LPV rate < 70% |
| Conversions | CPA, ROAS, Conv Rate | CPA > 2x target, ROAS < 2 |

## Analysis Instructions

When analyzing Facebook campaigns:

1. **Check Learning Status**: Note if any ad sets are in learning or learning limited
2. **Frequency Analysis**: Flag if 7-day frequency exceeds 3
3. **Placement Performance**: Compare Automatic vs Manual placements
4. **Audience Overlap**: Note if multiple ad sets might have overlap
5. **Attribution Window**: Consider 7-day click, 1-day view limitations

For detailed benchmarks, see: benchmarks.json
For optimization strategies, see: optimization-tips.md
```

---

## 5. API Endpoint Specification

```typescript
// types.ts
interface AnalyzeRequest {
    campaign_url: string;
    company: {
        name: string;
        industry: string;           // Maps to industry slug
        size: 'startup' | 'smb' | 'enterprise';
        goals?: string;
    };
    date_range: {
        start: string;              // ISO date
        end: string;
    };
    files: Array<{
        name: string;
        content: string;            // Base64 or raw CSV
        detected_tactic?: string;   // Optional pre-detection
    }>;
    options?: {
        focus_areas?: string[];     // Specific areas to analyze
        comparison_period?: string; // For trend analysis
        output_format?: 'detailed' | 'executive' | 'recommendations_only';
    };
}

interface AnalyzeResponse {
    report_id: string;
    report: {
        executive_summary: string;
        sections: Array<{
            title: string;
            content: string;
            tactic?: string;
            platform?: string;
        }>;
        recommendations: Array<{
            priority: 'high' | 'medium' | 'low';
            action: string;
            expected_impact: string;
            owner?: string;
        }>;
        warnings: Array<{
            severity: 'critical' | 'warning' | 'info';
            message: string;
            metric?: string;
            value?: number;
        }>;
    };
    metadata: {
        tactics_analyzed: string[];
        platforms_analyzed: string[];
        benchmarks_used: string[];
        processing_time_ms: number;
        tokens_used: {
            input: number;
            cached: number;
            output: number;
        };
    };
    feedback_url: string;           // URL for collecting feedback
}
```

---

## 6. Cost Optimization Summary

| Strategy | Implementation | Expected Savings |
|----------|----------------|------------------|
| Prompt Caching (Static) | 1-hour TTL on system prompt | 90% on repeated requests |
| Prompt Caching (Platform) | 5-min TTL on platform context | 75% on same-platform requests |
| Context Layering | Only load relevant context | 40-60% token reduction |
| Token Budgeting | Compress data when over budget | Prevent runaway costs |
| Multi-Agent Parallelism | Run experts concurrently | 50% latency reduction |
| Model Selection | Use Haiku for experts, Sonnet for synthesis | 60% cost on expert calls |

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up Cloudflare Worker with D1 database
- [ ] Implement core schema tables
- [ ] Create single-agent analysis endpoint
- [ ] Implement prompt caching

### Phase 2: Knowledge Base (Weeks 3-4)
- [ ] Populate platform knowledge tables
- [ ] Add industry benchmarks
- [ ] Implement tactic detection from filenames
- [ ] Create context assembly service

### Phase 3: Multi-Agent (Weeks 5-6)
- [ ] Implement expert agent definitions
- [ ] Create orchestrator synthesis
- [ ] Add parallel execution
- [ ] Implement complexity routing

### Phase 4: Learning Loop (Weeks 7-8)
- [ ] Add report storage and tracking
- [ ] Implement feedback collection UI
- [ ] Create nightly learning job
- [ ] Add benchmark auto-updates

### Phase 5: Optimization (Weeks 9-10)
- [ ] Tune token budgets based on real usage
- [ ] Optimize caching TTLs
- [ ] Add A/B testing for prompts
- [ ] Implement cost monitoring dashboard
