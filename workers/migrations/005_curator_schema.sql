-- Schema Curator Agent Tables
-- Migration 005: Curator system for AI-powered schema management
-- Run this in Supabase Dashboard SQL Editor

-- ============================================
-- 1. SCHEMA_PROVENANCE: Field-level source tracking
-- Tracks where each field value came from
-- ============================================
CREATE TABLE IF NOT EXISTS schema_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,      -- 'platform', 'industry', 'product', 'soul_doc'
  entity_id UUID NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  source_type VARCHAR(50) NOT NULL,      -- 'file', 'url', 'web_research', 'ai_generated', 'manual'
  source_url TEXT,
  source_snippet TEXT,                   -- Relevant text excerpt from source
  ai_model VARCHAR(100),                 -- Model used for extraction/generation
  ai_confidence DECIMAL(3,2),            -- 0.00 to 1.00
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_source_type CHECK (source_type IN ('file', 'url', 'web_research', 'ai_generated', 'manual')),
  CONSTRAINT valid_entity_type CHECK (entity_type IN ('platform', 'industry', 'product', 'subproduct', 'tactic_type', 'soul_doc')),
  CONSTRAINT valid_confidence CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1))
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_provenance_entity ON schema_provenance(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_provenance_field ON schema_provenance(entity_id, field_name);
CREATE INDEX IF NOT EXISTS idx_provenance_created ON schema_provenance(created_at DESC);

-- ============================================
-- 2. SCHEMA_AUDIT_LOG: Full change history for rollback
-- Captures all changes with before/after snapshots
-- ============================================
CREATE TABLE IF NOT EXISTS schema_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation VARCHAR(20) NOT NULL,        -- 'create', 'update'
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  field_changes JSONB NOT NULL,          -- { field: { old: x, new: y } }
  full_snapshot JSONB NOT NULL,          -- Complete entity state after change
  batch_id UUID,                         -- Groups related changes
  changed_by VARCHAR(100) NOT NULL,      -- 'curator_session:uuid' or 'admin:user'
  is_rolled_back BOOLEAN DEFAULT FALSE,
  rolled_back_at TIMESTAMP WITH TIME ZONE,
  rolled_back_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_operation CHECK (operation IN ('create', 'update')),
  CONSTRAINT valid_audit_entity_type CHECK (entity_type IN ('platform', 'industry', 'product', 'subproduct', 'tactic_type', 'soul_doc'))
);

-- Indexes for audit queries and rollback
CREATE INDEX IF NOT EXISTS idx_audit_entity ON schema_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_batch ON schema_audit_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON schema_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_rollback ON schema_audit_log(is_rolled_back) WHERE is_rolled_back = FALSE;

-- ============================================
-- 3. CURATOR_DOMAIN_WHITELIST: Trusted research sources
-- Controls which domains are trusted for web research
-- ============================================
CREATE TABLE IF NOT EXISTS curator_domain_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) NOT NULL UNIQUE,
  trust_level VARCHAR(20) DEFAULT 'standard',  -- 'authoritative', 'standard', 'limited'
  categories TEXT[],                           -- ['advertising', 'technology', 'industry']
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_trust_level CHECK (trust_level IN ('authoritative', 'standard', 'limited'))
);

-- Index for domain lookups
CREATE INDEX IF NOT EXISTS idx_whitelist_domain ON curator_domain_whitelist(domain);
CREATE INDEX IF NOT EXISTS idx_whitelist_active ON curator_domain_whitelist(is_active) WHERE is_active = TRUE;

-- Seed initial trusted domains for digital advertising
INSERT INTO curator_domain_whitelist (domain, trust_level, categories) VALUES
  ('meta.com', 'authoritative', ARRAY['advertising', 'platform']),
  ('facebook.com', 'authoritative', ARRAY['advertising', 'platform']),
  ('google.com', 'authoritative', ARRAY['advertising', 'platform']),
  ('ads.google.com', 'authoritative', ARRAY['advertising', 'platform']),
  ('support.google.com', 'authoritative', ARRAY['advertising', 'platform', 'documentation']),
  ('business.linkedin.com', 'authoritative', ARRAY['advertising', 'platform']),
  ('advertising.amazon.com', 'authoritative', ARRAY['advertising', 'platform', 'ecommerce']),
  ('tiktok.com', 'authoritative', ARRAY['advertising', 'platform']),
  ('ads.tiktok.com', 'authoritative', ARRAY['advertising', 'platform']),
  ('snapchat.com', 'authoritative', ARRAY['advertising', 'platform']),
  ('pinterest.com', 'authoritative', ARRAY['advertising', 'platform']),
  ('ads.twitter.com', 'authoritative', ARRAY['advertising', 'platform']),
  ('business.x.com', 'authoritative', ARRAY['advertising', 'platform']),
  ('searchengineland.com', 'standard', ARRAY['advertising', 'news']),
  ('adexchanger.com', 'standard', ARRAY['advertising', 'news']),
  ('marketingland.com', 'standard', ARRAY['advertising', 'news']),
  ('emarketer.com', 'authoritative', ARRAY['advertising', 'research']),
  ('statista.com', 'authoritative', ARRAY['research', 'benchmarks']),
  ('wordstream.com', 'standard', ARRAY['advertising', 'benchmarks']),
  ('hubspot.com', 'standard', ARRAY['marketing', 'benchmarks'])
ON CONFLICT (domain) DO NOTHING;

-- ============================================
-- 4. CURATOR_SESSIONS: Chat/context persistence
-- Maintains conversation state and pending items
-- ============================================
CREATE TABLE IF NOT EXISTS curator_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) DEFAULT 'active',   -- 'active', 'completed', 'abandoned'
  messages JSONB DEFAULT '[]'::jsonb,    -- Chat history [{role, content, timestamp}]
  pending_items JSONB DEFAULT '[]'::jsonb, -- Items awaiting approval
  committed_items JSONB DEFAULT '[]'::jsonb, -- Items successfully committed
  tokens_used INTEGER DEFAULT 0,
  tokens_limit INTEGER DEFAULT 500000,   -- ~$10/day budget
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_session_status CHECK (status IN ('active', 'completed', 'abandoned'))
);

-- Index for active sessions and cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_status ON curator_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_activity ON curator_sessions(last_activity_at DESC);

-- ============================================
-- 5. Update trigger for curator_domain_whitelist
-- ============================================
CREATE OR REPLACE FUNCTION update_whitelist_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whitelist_updated_at
  BEFORE UPDATE ON curator_domain_whitelist
  FOR EACH ROW
  EXECUTE FUNCTION update_whitelist_timestamp();

-- ============================================
-- 6. Function to clean up old/abandoned sessions
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_abandoned_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE curator_sessions
  SET status = 'abandoned'
  WHERE status = 'active'
    AND last_activity_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. RLS Policies (if RLS is enabled)
-- ============================================
-- Enable RLS on new tables
ALTER TABLE schema_provenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE curator_domain_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE curator_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for worker)
CREATE POLICY "Service role has full access to provenance"
  ON schema_provenance FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to audit_log"
  ON schema_audit_log FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to whitelist"
  ON curator_domain_whitelist FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to sessions"
  ON curator_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- Allow anon read access to whitelist (for frontend validation)
CREATE POLICY "Public can read active whitelist domains"
  ON curator_domain_whitelist FOR SELECT
  USING (is_active = TRUE);
