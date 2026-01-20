-- Migration 006: Rename curator JSONB columns to avoid conflicts
-- The industries table has JSONB columns that conflict with related table aliases
-- Rename them to curator_* prefix to distinguish from relational data
-- Run this in Supabase Dashboard SQL Editor

-- Rename benchmarks → curator_benchmarks
ALTER TABLE industries
  RENAME COLUMN benchmarks TO curator_benchmarks;

-- Rename seasonality → curator_seasonality
ALTER TABLE industries
  RENAME COLUMN seasonality TO curator_seasonality;

-- Rename insights → curator_insights
ALTER TABLE industries
  RENAME COLUMN insights TO curator_insights;

-- buyer_notes and research_metadata don't conflict, but rename for consistency
-- buyer_notes stays as is (no conflict)
-- research_metadata stays as is (no conflict)

-- Add comments for clarity
COMMENT ON COLUMN industries.curator_benchmarks IS 'AI-researched benchmark data (CPC, CPA, CTR, CPM, ROAS ranges) from Schema Curator';
COMMENT ON COLUMN industries.curator_seasonality IS 'AI-researched seasonality patterns (peak/slow months, quarterly trends) from Schema Curator';
COMMENT ON COLUMN industries.curator_insights IS 'AI-researched industry insights (topics, confidence) from Schema Curator';
COMMENT ON COLUMN industries.buyer_notes IS 'AI-researched buyer persona notes from Schema Curator';
COMMENT ON COLUMN industries.research_metadata IS 'Metadata about the AI research (sources, query, tokens used)';
