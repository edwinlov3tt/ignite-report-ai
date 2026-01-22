-- Schema Curator Research Mode Evolution
-- Migration 010: Research-first platform with source tracking and continuous learning
-- Run this in Supabase Dashboard SQL Editor

-- ============================================
-- 1. CURATOR_SOURCES: Centralized source repository
-- Stores all sources used in research with authority scoring
-- ============================================
CREATE TABLE IF NOT EXISTS curator_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  title TEXT,
  snippet TEXT,
  authority_tier VARCHAR(20) NOT NULL DEFAULT 'standard',  -- authoritative, standard, user_provided
  authority_score DECIMAL(3,2) DEFAULT 0.7,               -- 1.0 = authoritative, 0.7 = standard, 0.5 = user_provided
  categories TEXT[],
  fetch_count INTEGER DEFAULT 0,
  is_user_provided BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_authority_tier CHECK (authority_tier IN ('authoritative', 'standard', 'user_provided')),
  CONSTRAINT valid_authority_score CHECK (authority_score >= 0 AND authority_score <= 1)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_curator_sources_domain ON curator_sources(domain);
CREATE INDEX IF NOT EXISTS idx_curator_sources_authority ON curator_sources(authority_tier);
CREATE INDEX IF NOT EXISTS idx_curator_sources_categories ON curator_sources USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_curator_sources_created ON curator_sources(created_at DESC);

-- ============================================
-- 2. ENTITY_SOURCES: Many-to-many relationship
-- Links sources to specific entities and fields
-- ============================================
CREATE TABLE IF NOT EXISTS entity_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES curator_sources(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,  -- product, subproduct, platform, industry
  entity_id UUID NOT NULL,
  field_name VARCHAR(100),           -- which field this source supports (null = general entity support)
  citation_text TEXT,                -- specific quote or context from the source
  relevance_score DECIMAL(3,2) DEFAULT 0.8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_entity_source_type CHECK (entity_type IN ('platform', 'industry', 'product', 'subproduct', 'tactic_type'))
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_entity_sources_source ON entity_sources(source_id);
CREATE INDEX IF NOT EXISTS idx_entity_sources_entity ON entity_sources(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_sources_field ON entity_sources(entity_id, field_name);

-- ============================================
-- 3. RESEARCH_SESSIONS: Full research context
-- Stores research sessions with chain of thought
-- ============================================
CREATE TABLE IF NOT EXISTS research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Target entity (at least one required)
  target_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  target_subproduct_id UUID REFERENCES subproducts(id) ON DELETE SET NULL,
  target_platform_id UUID,  -- Can be null, references platforms table
  target_industry_id UUID,  -- Can be null, references industries table

  -- Research configuration
  research_type VARCHAR(50) NOT NULL,  -- product, subproduct, platform, cross_entity
  research_depth VARCHAR(20) DEFAULT 'standard',  -- quick, standard, deep
  user_context TEXT,                   -- user-provided notes before research

  -- Results
  chain_of_thought TEXT NOT NULL,      -- full reasoning narrative (markdown)
  reasoning_steps JSONB,               -- structured steps array
  sources_consulted JSONB,             -- sources with relevance scores
  extracted_fields JSONB,              -- what was extracted
  inheritance_analysis JSONB,          -- product-level vs subproduct-level guidance
  cross_entity_suggestions JSONB,      -- suggestions for related entities

  -- Readiness check results
  readiness_check JSONB,               -- warnings, missing fields, etc.

  -- Usage tracking
  tokens_used INTEGER DEFAULT 0,
  model_used VARCHAR(100),
  duration_ms INTEGER,

  -- Status
  status VARCHAR(20) DEFAULT 'completed',  -- in_progress, completed, failed
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT valid_research_type CHECK (research_type IN ('product', 'subproduct', 'platform', 'industry', 'cross_entity')),
  CONSTRAINT valid_research_depth CHECK (research_depth IN ('quick', 'standard', 'deep')),
  CONSTRAINT valid_research_status CHECK (status IN ('in_progress', 'completed', 'failed'))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_research_sessions_product ON research_sessions(target_product_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_subproduct ON research_sessions(target_subproduct_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_created ON research_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_sessions_status ON research_sessions(status);

-- ============================================
-- 4. RESEARCH_FEEDBACK: Continuous learning
-- Stores good/bad feedback for prompt improvement
-- ============================================
CREATE TABLE IF NOT EXISTS research_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
  feedback_type VARCHAR(20) NOT NULL,  -- good, bad, partial
  field_name VARCHAR(100),             -- optional: feedback on specific field
  feedback_notes TEXT,                 -- optional explanation
  marked_by VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_feedback_type CHECK (feedback_type IN ('good', 'bad', 'partial'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_research_feedback_session ON research_feedback(research_session_id);
CREATE INDEX IF NOT EXISTS idx_research_feedback_type ON research_feedback(feedback_type);

-- ============================================
-- 5. Add authority_score to domain whitelist
-- ============================================
ALTER TABLE curator_domain_whitelist
  ADD COLUMN IF NOT EXISTS authority_score DECIMAL(3,2) DEFAULT 0.7;

-- ============================================
-- 6. Seed/update authoritative sources
-- ============================================
INSERT INTO curator_domain_whitelist (domain, trust_level, authority_score, categories) VALUES
  ('support.google.com', 'authoritative', 1.0, ARRAY['advertising', 'google', 'documentation']),
  ('business.facebook.com', 'authoritative', 1.0, ARRAY['advertising', 'meta', 'documentation']),
  ('ads.tiktok.com', 'authoritative', 1.0, ARRAY['advertising', 'tiktok', 'documentation']),
  ('statista.com', 'authoritative', 1.0, ARRAY['research', 'benchmarks', 'statistics']),
  ('emarketer.com', 'authoritative', 1.0, ARRAY['research', 'trends', 'marketing']),
  ('thinkwithgoogle.com', 'authoritative', 1.0, ARRAY['insights', 'google', 'marketing']),
  ('developers.google.com', 'authoritative', 1.0, ARRAY['advertising', 'google', 'technical']),
  ('developers.facebook.com', 'authoritative', 1.0, ARRAY['advertising', 'meta', 'technical']),
  ('marketing.amazon.com', 'authoritative', 1.0, ARRAY['advertising', 'amazon', 'documentation']),
  ('help.pinterest.com', 'authoritative', 1.0, ARRAY['advertising', 'pinterest', 'documentation']),
  ('business.linkedin.com', 'authoritative', 1.0, ARRAY['advertising', 'linkedin', 'documentation']),
  ('ads.microsoft.com', 'authoritative', 1.0, ARRAY['advertising', 'microsoft', 'documentation']),
  ('thetradedesk.com', 'authoritative', 1.0, ARRAY['advertising', 'programmatic', 'documentation']),
  ('dv360.google.com', 'authoritative', 1.0, ARRAY['advertising', 'programmatic', 'google'])
ON CONFLICT (domain) DO UPDATE SET
  authority_score = EXCLUDED.authority_score,
  categories = EXCLUDED.categories,
  updated_at = NOW();

-- Update existing standard domains with scores
UPDATE curator_domain_whitelist
SET authority_score = CASE
  WHEN trust_level = 'authoritative' THEN 1.0
  WHEN trust_level = 'standard' THEN 0.7
  WHEN trust_level = 'limited' THEN 0.5
  ELSE 0.7
END
WHERE authority_score IS NULL;

-- ============================================
-- 7. Update trigger for curator_sources
-- ============================================
CREATE OR REPLACE FUNCTION update_curator_sources_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS curator_sources_updated_at ON curator_sources;
CREATE TRIGGER curator_sources_updated_at
  BEFORE UPDATE ON curator_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_curator_sources_timestamp();

-- ============================================
-- 8. RLS Policies
-- ============================================
ALTER TABLE curator_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_feedback ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role has full access to curator_sources"
  ON curator_sources FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to entity_sources"
  ON entity_sources FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to research_sessions"
  ON research_sessions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to research_feedback"
  ON research_feedback FOR ALL
  USING (auth.role() = 'service_role');

-- Allow anon read access for frontend
CREATE POLICY "Public can read curator_sources"
  ON curator_sources FOR SELECT
  USING (true);

CREATE POLICY "Public can read research_sessions"
  ON research_sessions FOR SELECT
  USING (true);

-- ============================================
-- 9. Function to increment source fetch count
-- ============================================
CREATE OR REPLACE FUNCTION increment_source_fetch_count(source_url TEXT)
RETURNS UUID AS $$
DECLARE
  result_id UUID;
BEGIN
  UPDATE curator_sources
  SET fetch_count = fetch_count + 1
  WHERE url = source_url
  RETURNING id INTO result_id;

  RETURN result_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. Function to get research feedback patterns
-- ============================================
CREATE OR REPLACE FUNCTION get_feedback_patterns(
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  field_name VARCHAR(100),
  good_count BIGINT,
  bad_count BIGINT,
  total_count BIGINT,
  success_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rf.field_name,
    COUNT(*) FILTER (WHERE rf.feedback_type = 'good') as good_count,
    COUNT(*) FILTER (WHERE rf.feedback_type = 'bad') as bad_count,
    COUNT(*) as total_count,
    ROUND(
      COUNT(*) FILTER (WHERE rf.feedback_type = 'good')::DECIMAL /
      NULLIF(COUNT(*), 0) * 100,
      2
    ) as success_rate
  FROM research_feedback rf
  WHERE rf.field_name IS NOT NULL
  GROUP BY rf.field_name
  ORDER BY total_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 11. View for research session summaries
-- ============================================
CREATE OR REPLACE VIEW research_session_summaries AS
SELECT
  rs.id,
  rs.research_type,
  rs.research_depth,
  rs.status,
  rs.tokens_used,
  rs.created_at,
  p.name as product_name,
  sp.name as subproduct_name,
  COALESCE(
    (SELECT COUNT(*) FROM research_feedback rf WHERE rf.research_session_id = rs.id AND rf.feedback_type = 'good'),
    0
  ) as good_feedback_count,
  COALESCE(
    (SELECT COUNT(*) FROM research_feedback rf WHERE rf.research_session_id = rs.id AND rf.feedback_type = 'bad'),
    0
  ) as bad_feedback_count
FROM research_sessions rs
LEFT JOIN products p ON rs.target_product_id = p.id
LEFT JOIN subproducts sp ON rs.target_subproduct_id = sp.id
ORDER BY rs.created_at DESC;
