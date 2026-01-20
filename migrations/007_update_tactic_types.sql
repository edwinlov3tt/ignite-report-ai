-- Migration: Update tactic_types schema
-- Adds new fields for tactic identification and analysis guidance

-- Add new columns to tactic_types
ALTER TABLE tactic_types
  ADD COLUMN IF NOT EXISTS alias_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS overview TEXT,
  ADD COLUMN IF NOT EXISTS analysis_instructions TEXT,
  ADD COLUMN IF NOT EXISTS lumina_data TEXT[];

-- Migrate existing data: use slug or name for alias_code if not set
UPDATE tactic_types
SET alias_code = UPPER(LEFT(REPLACE(COALESCE(slug, name), '-', ''), 3))
WHERE alias_code IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN tactic_types.alias_code IS 'Short identifier code (e.g., AAT, RON, B2B)';
COMMENT ON COLUMN tactic_types.overview IS 'Brief description of what this tactic type represents';
COMMENT ON COLUMN tactic_types.analysis_instructions IS 'Instructions for AI on how to analyze campaigns using this tactic';
COMMENT ON COLUMN tactic_types.lumina_data IS 'Array of lumina extractor names needed for analysis (inherited from product level)';

-- The old columns (data_value, slug, filename_stem, headers, aliases) are kept for backward compatibility
-- They can be removed in a future migration after all data is migrated to the new schema
