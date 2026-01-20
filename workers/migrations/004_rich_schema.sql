-- Report.AI Rich Schema Migration
-- Aligns database with frontend design from docs/report-ai-admin.md
-- Run this in Supabase Dashboard SQL Editor

-- ============================================
-- PLATFORMS: Add category and logo_url
-- ============================================
ALTER TABLE platforms
  ADD COLUMN IF NOT EXISTS category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ============================================
-- PLATFORM_QUIRKS: Add rich fields
-- ============================================
ALTER TABLE platform_quirks
  ADD COLUMN IF NOT EXISTS quirk_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS ai_instruction TEXT,
  ADD COLUMN IF NOT EXISTS source VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contributed_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS applies_to_tactics TEXT[];

-- Migrate existing data: quirk → title and description
UPDATE platform_quirks
SET title = LEFT(quirk, 255),
    description = quirk,
    quirk_type = 'reporting'
WHERE title IS NULL AND quirk IS NOT NULL;

-- Rename impact_level to impact for consistency
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'platform_quirks' AND column_name = 'impact_level') THEN
    ALTER TABLE platform_quirks RENAME COLUMN impact_level TO impact;
  END IF;
END $$;

-- ============================================
-- PLATFORM_KPIS: Add objective-based structure
-- ============================================
ALTER TABLE platform_kpis
  ADD COLUMN IF NOT EXISTS objective VARCHAR(50),
  ADD COLUMN IF NOT EXISTS primary_kpis JSONB,
  ADD COLUMN IF NOT EXISTS secondary_kpis JSONB,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Migrate existing data
UPDATE platform_kpis
SET objective = 'general',
    primary_kpis = jsonb_build_array(kpi_name),
    notes = CONCAT('Range: ', COALESCE(typical_range, 'N/A'), ' | Good: ', COALESCE(good_threshold::text, 'N/A'), ' | Bad: ', COALESCE(bad_threshold::text, 'N/A'))
WHERE objective IS NULL AND kpi_name IS NOT NULL;

-- ============================================
-- PLATFORM_THRESHOLDS: Add warning/critical split
-- ============================================
ALTER TABLE platform_thresholds
  ADD COLUMN IF NOT EXISTS metric VARCHAR(255),
  ADD COLUMN IF NOT EXISTS warning_value DECIMAL,
  ADD COLUMN IF NOT EXISTS critical_value DECIMAL,
  ADD COLUMN IF NOT EXISTS direction VARCHAR(20),
  ADD COLUMN IF NOT EXISTS tactic_id UUID;

-- Migrate existing data
UPDATE platform_thresholds
SET metric = metric_name,
    warning_value = value,
    critical_value = value * 1.5,
    direction = CASE WHEN threshold_type = 'minimum' THEN 'below' ELSE 'above' END
WHERE metric IS NULL AND metric_name IS NOT NULL;

-- ============================================
-- PLATFORM_BUYER_NOTES: Add rich fields
-- ============================================
ALTER TABLE platform_buyer_notes
  ADD COLUMN IF NOT EXISTS note_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS contributed_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tactic_id UUID;

-- Migrate existing data
UPDATE platform_buyer_notes
SET note_type = 'tip',
    content = note,
    contributed_by = 'system'
WHERE note_type IS NULL AND note IS NOT NULL;

-- ============================================
-- INDUSTRY_BENCHMARKS: Add percentiles and references
-- ============================================
ALTER TABLE industry_benchmarks
  ADD COLUMN IF NOT EXISTS metric VARCHAR(255),
  ADD COLUMN IF NOT EXISTS p25 DECIMAL,
  ADD COLUMN IF NOT EXISTS p50 DECIMAL,
  ADD COLUMN IF NOT EXISTS p75 DECIMAL,
  ADD COLUMN IF NOT EXISTS sample_size INTEGER,
  ADD COLUMN IF NOT EXISTS confidence DECIMAL,
  ADD COLUMN IF NOT EXISTS quarter VARCHAR(20),
  ADD COLUMN IF NOT EXISTS platform_id UUID REFERENCES platforms(id),
  ADD COLUMN IF NOT EXISTS tactic_id UUID,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Migrate existing data
UPDATE industry_benchmarks
SET metric = metric_name,
    p50 = benchmark_value,
    p25 = benchmark_value * 0.75,
    p75 = benchmark_value * 1.25,
    quarter = 'Q1 2025'
WHERE metric IS NULL AND metric_name IS NOT NULL;

-- ============================================
-- INDUSTRY_INSIGHTS: Add structured fields
-- ============================================
ALTER TABLE industry_insights
  ADD COLUMN IF NOT EXISTS insight_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS ai_instruction TEXT,
  ADD COLUMN IF NOT EXISTS source VARCHAR(255),
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS valid_from DATE,
  ADD COLUMN IF NOT EXISTS valid_until DATE;

-- Migrate existing data
UPDATE industry_insights
SET insight_type = COALESCE(category, 'trend'),
    title = LEFT(insight, 255),
    content = insight
WHERE insight_type IS NULL AND insight IS NOT NULL;

-- ============================================
-- INDUSTRY_SEASONALITY: Add period structure and modifier
-- ============================================
ALTER TABLE industry_seasonality
  ADD COLUMN IF NOT EXISTS period_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS period_value VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cpm_modifier DECIMAL;

-- Migrate existing data
UPDATE industry_seasonality
SET period_type = 'event',
    period_value = period
WHERE period_type IS NULL AND period IS NOT NULL;

-- ============================================
-- Add indexes for new columns
-- ============================================
CREATE INDEX IF NOT EXISTS idx_platform_quirks_type ON platform_quirks(quirk_type);
CREATE INDEX IF NOT EXISTS idx_platform_kpis_objective ON platform_kpis(objective);
CREATE INDEX IF NOT EXISTS idx_platform_thresholds_metric ON platform_thresholds(metric);
CREATE INDEX IF NOT EXISTS idx_platform_buyer_notes_type ON platform_buyer_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_industry_benchmarks_metric ON industry_benchmarks(metric);
CREATE INDEX IF NOT EXISTS idx_industry_benchmarks_platform ON industry_benchmarks(platform_id);
CREATE INDEX IF NOT EXISTS idx_industry_insights_type ON industry_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_industry_seasonality_type ON industry_seasonality(period_type);
