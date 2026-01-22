-- Field Discovery System
-- Tracks discovered fields from Lumina API responses for schema intelligence

-- Table to store discovered fields and their metadata
CREATE TABLE IF NOT EXISTS lumina_discovered_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_path TEXT NOT NULL UNIQUE,
  data_types TEXT[] NOT NULL DEFAULT '{}',
  sample_values JSONB DEFAULT '[]',
  frequency FLOAT NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  is_nested BOOLEAN NOT NULL DEFAULT FALSE,
  parent_path TEXT,
  relevance_score FLOAT,
  suggested_extractor_name TEXT,
  suggested_aggregation TEXT,
  status TEXT DEFAULT 'discovered' CHECK (status IN ('discovered', 'reviewed', 'approved', 'ignored')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_lumina_fields_path ON lumina_discovered_fields(field_path);
CREATE INDEX IF NOT EXISTS idx_lumina_fields_status ON lumina_discovered_fields(status);
CREATE INDEX IF NOT EXISTS idx_lumina_fields_relevance ON lumina_discovered_fields(relevance_score DESC NULLS LAST);

-- Table to log each field discovery run
CREATE TABLE IF NOT EXISTS lumina_field_discovery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  company_name TEXT,
  fields_discovered INTEGER NOT NULL DEFAULT 0,
  new_fields INTEGER NOT NULL DEFAULT 0,
  updated_fields INTEGER NOT NULL DEFAULT 0,
  line_item_count INTEGER NOT NULL DEFAULT 0,
  discovery_duration_ms INTEGER,
  field_summary JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying logs by order
CREATE INDEX IF NOT EXISTS idx_discovery_log_order ON lumina_field_discovery_log(order_id);
CREATE INDEX IF NOT EXISTS idx_discovery_log_created ON lumina_field_discovery_log(created_at DESC);

-- Table for extractor suggestions (AI-generated)
CREATE TABLE IF NOT EXISTS lumina_extractor_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_path TEXT NOT NULL,
  suggested_name TEXT NOT NULL,
  aggregation_type TEXT NOT NULL CHECK (aggregation_type IN ('sum', 'avg', 'first', 'last', 'concat', 'unique', 'count')),
  when_conditions JSONB,
  description TEXT,
  confidence FLOAT NOT NULL DEFAULT 0,
  is_new BOOLEAN NOT NULL DEFAULT TRUE,
  existing_match TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'modified')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  source_order_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for pending suggestions
CREATE INDEX IF NOT EXISTS idx_extractor_suggestions_status ON lumina_extractor_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_extractor_suggestions_confidence ON lumina_extractor_suggestions(confidence DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_lumina_discovered_fields_updated_at ON lumina_discovered_fields;
CREATE TRIGGER update_lumina_discovered_fields_updated_at
    BEFORE UPDATE ON lumina_discovered_fields
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lumina_extractor_suggestions_updated_at ON lumina_extractor_suggestions;
CREATE TRIGGER update_lumina_extractor_suggestions_updated_at
    BEFORE UPDATE ON lumina_extractor_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (for service role access)
ALTER TABLE lumina_discovered_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE lumina_field_discovery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE lumina_extractor_suggestions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access to discovered fields"
  ON lumina_discovered_fields
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to discovery log"
  ON lumina_field_discovery_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to extractor suggestions"
  ON lumina_extractor_suggestions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
