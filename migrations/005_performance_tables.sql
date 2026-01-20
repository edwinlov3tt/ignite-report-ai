-- ============================================
-- Performance Tables Schema
-- Stores expected performance report tables for each SubProduct
-- Used for file detection and header matching
-- ============================================

-- Performance Tables (linked to SubProducts)
CREATE TABLE IF NOT EXISTS performance_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subproduct_id UUID NOT NULL REFERENCES subproducts(id) ON DELETE CASCADE,
  table_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  headers TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique table names per subproduct
  UNIQUE(subproduct_id, table_name)
);

-- Table Validators (linked to SubProducts)
-- Defines validation rules for what tables are required
CREATE TABLE IF NOT EXISTS table_validators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subproduct_id UUID NOT NULL REFERENCES subproducts(id) ON DELETE CASCADE UNIQUE,
  required_tables TEXT[] DEFAULT '{}',
  minimum_tables INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add KPI and Medium columns to subproducts if not exists
ALTER TABLE subproducts
  ADD COLUMN IF NOT EXISTS kpis TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS medium VARCHAR(255),
  ADD COLUMN IF NOT EXISTS alias_code VARCHAR(255);

-- Add targeting_options to subproducts (for things like RON, AAT, WTG, etc.)
ALTER TABLE subproducts
  ADD COLUMN IF NOT EXISTS targeting_options TEXT[] DEFAULT '{}';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_tables_subproduct
  ON performance_tables(subproduct_id);

CREATE INDEX IF NOT EXISTS idx_performance_tables_file_name
  ON performance_tables(file_name);

-- Enable Row Level Security
ALTER TABLE performance_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_validators ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public read, authenticated write)
CREATE POLICY "Public read access for performance_tables"
  ON performance_tables FOR SELECT
  USING (true);

CREATE POLICY "Authenticated insert for performance_tables"
  ON performance_tables FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated update for performance_tables"
  ON performance_tables FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated delete for performance_tables"
  ON performance_tables FOR DELETE
  USING (true);

CREATE POLICY "Public read access for table_validators"
  ON table_validators FOR SELECT
  USING (true);

CREATE POLICY "Authenticated insert for table_validators"
  ON table_validators FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated update for table_validators"
  ON table_validators FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated delete for table_validators"
  ON table_validators FOR DELETE
  USING (true);

-- Comments
COMMENT ON TABLE performance_tables IS 'Expected performance report tables for each SubProduct, used for file detection';
COMMENT ON COLUMN performance_tables.table_name IS 'Display name like "Monthly Performance" or "Campaign Performance"';
COMMENT ON COLUMN performance_tables.file_name IS 'Expected file name pattern like "report-emailmarketing-monthly-performance"';
COMMENT ON COLUMN performance_tables.headers IS 'Array of expected column headers for validation';
COMMENT ON COLUMN performance_tables.is_required IS 'Whether this table is required for complete reporting';

COMMENT ON TABLE table_validators IS 'Validation rules for what performance tables are required per SubProduct';
COMMENT ON COLUMN table_validators.required_tables IS 'Array of table_name values that must be present';
COMMENT ON COLUMN table_validators.minimum_tables IS 'Minimum number of tables required';
