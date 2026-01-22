-- Report.AI Research Guidance Columns Migration
-- Adds AI research guidance fields to products and subproducts tables
-- Run this in Supabase Dashboard SQL Editor

-- ============================================
-- PRODUCTS: Add research guidance fields
-- ============================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS platforms TEXT[],
  ADD COLUMN IF NOT EXISTS mediums TEXT[],
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS ai_guidelines TEXT,
  ADD COLUMN IF NOT EXISTS ai_prompt TEXT,
  -- Research guidance fields (from Schema Curator)
  ADD COLUMN IF NOT EXISTS chain_of_thought_guidance TEXT[],
  ADD COLUMN IF NOT EXISTS analysis_instructions TEXT[],
  ADD COLUMN IF NOT EXISTS example_good_analysis TEXT[],
  ADD COLUMN IF NOT EXISTS example_bad_analysis TEXT[],
  ADD COLUMN IF NOT EXISTS critical_metrics TEXT[],
  ADD COLUMN IF NOT EXISTS optimization_priorities TEXT[],
  ADD COLUMN IF NOT EXISTS important_constraints TEXT;

-- ============================================
-- SUBPRODUCTS: Add research guidance fields
-- ============================================
ALTER TABLE subproducts
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS platforms TEXT[],
  ADD COLUMN IF NOT EXISTS mediums TEXT[],
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS kpis TEXT[],
  ADD COLUMN IF NOT EXISTS medium VARCHAR(100),
  ADD COLUMN IF NOT EXISTS alias_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS targeting_options JSONB,
  -- Research guidance fields (from Schema Curator)
  ADD COLUMN IF NOT EXISTS chain_of_thought_guidance TEXT[],
  ADD COLUMN IF NOT EXISTS analysis_instructions TEXT[],
  ADD COLUMN IF NOT EXISTS example_good_analysis TEXT[],
  ADD COLUMN IF NOT EXISTS example_bad_analysis TEXT[],
  ADD COLUMN IF NOT EXISTS critical_metrics TEXT[],
  ADD COLUMN IF NOT EXISTS optimization_priorities TEXT[],
  ADD COLUMN IF NOT EXISTS important_constraints TEXT;

-- ============================================
-- INDEXES for common queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_has_guidance
  ON products ((chain_of_thought_guidance IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_subproducts_has_guidance
  ON subproducts ((chain_of_thought_guidance IS NOT NULL));

-- ============================================
-- COMMENTS for documentation
-- ============================================
COMMENT ON COLUMN products.chain_of_thought_guidance IS 'AI-generated step-by-step reasoning process for analyzing this product';
COMMENT ON COLUMN products.analysis_instructions IS 'Specific instructions for what to analyze and how';
COMMENT ON COLUMN products.example_good_analysis IS 'Examples of good analysis practices';
COMMENT ON COLUMN products.example_bad_analysis IS 'Anti-patterns and mistakes to avoid';
COMMENT ON COLUMN products.critical_metrics IS 'Must-track metrics for this product type';
COMMENT ON COLUMN products.optimization_priorities IS 'Ordered list of optimization areas';
COMMENT ON COLUMN products.important_constraints IS 'Business rules, limitations, and data constraints';

COMMENT ON COLUMN subproducts.chain_of_thought_guidance IS 'AI-generated step-by-step reasoning for this specific subproduct';
COMMENT ON COLUMN subproducts.analysis_instructions IS 'Subproduct-specific analysis instructions';
COMMENT ON COLUMN subproducts.example_good_analysis IS 'Subproduct-specific good analysis examples';
COMMENT ON COLUMN subproducts.example_bad_analysis IS 'Subproduct-specific anti-patterns';
COMMENT ON COLUMN subproducts.critical_metrics IS 'Critical metrics specific to this subproduct';
COMMENT ON COLUMN subproducts.optimization_priorities IS 'Optimization priorities for this subproduct';
COMMENT ON COLUMN subproducts.important_constraints IS 'Constraints specific to this subproduct';
