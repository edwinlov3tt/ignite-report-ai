-- Report.AI Cloudflare Workers Backend
-- Initial Database Schema for Supabase
-- Run this migration in Supabase Dashboard SQL Editor

-- ============================================
-- PLATFORMS
-- ============================================

CREATE TABLE IF NOT EXISTS platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_quirks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID REFERENCES platforms(id) ON DELETE CASCADE,
  quirk TEXT NOT NULL,
  impact_level VARCHAR(20) CHECK (impact_level IN ('high', 'medium', 'low')) NOT NULL,
  recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID REFERENCES platforms(id) ON DELETE CASCADE,
  kpi_name VARCHAR(255) NOT NULL,
  typical_range VARCHAR(100),
  good_threshold DECIMAL,
  bad_threshold DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID REFERENCES platforms(id) ON DELETE CASCADE,
  metric_name VARCHAR(255) NOT NULL,
  threshold_type VARCHAR(20) CHECK (threshold_type IN ('minimum', 'maximum', 'range')) NOT NULL,
  value DECIMAL NOT NULL,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_buyer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID REFERENCES platforms(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDUSTRIES
-- ============================================

CREATE TABLE IF NOT EXISTS industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS industry_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_id UUID REFERENCES industries(id) ON DELETE CASCADE,
  metric_name VARCHAR(255) NOT NULL,
  benchmark_value DECIMAL NOT NULL,
  unit VARCHAR(50),
  source VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS industry_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_id UUID REFERENCES industries(id) ON DELETE CASCADE,
  insight TEXT NOT NULL,
  category VARCHAR(100),
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS industry_seasonality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_id UUID REFERENCES industries(id) ON DELETE CASCADE,
  period VARCHAR(100) NOT NULL,
  impact VARCHAR(20) CHECK (impact IN ('high', 'medium', 'low')) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SOUL DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS soul_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type VARCHAR(50) CHECK (doc_type IN ('system_prompt', 'agent_persona', 'skill')) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS soul_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES soul_documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, version)
);

-- ============================================
-- PRODUCTS & TACTICS (SCHEMA)
-- ============================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  data_value VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subproducts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  data_value VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tactic_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subproduct_id UUID REFERENCES subproducts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  data_value VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REPORTS & FEEDBACK
-- ============================================

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY,
  campaign_id VARCHAR(100),
  r2_key VARCHAR(500) NOT NULL,
  model_used VARCHAR(100) NOT NULL,
  agent_strategy VARCHAR(50) CHECK (agent_strategy IN ('single_call', 'multi_agent')) NOT NULL,
  soul_doc_versions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  feedback_type VARCHAR(20) CHECK (feedback_type IN ('thumbs_up', 'thumbs_down')) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- KV SYNC LOG
-- ============================================

CREATE TABLE IF NOT EXISTS kv_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace VARCHAR(50) NOT NULL,
  keys_synced INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_platforms_code ON platforms(code);
CREATE INDEX IF NOT EXISTS idx_platforms_active ON platforms(is_active);
CREATE INDEX IF NOT EXISTS idx_platform_quirks_platform ON platform_quirks(platform_id);
CREATE INDEX IF NOT EXISTS idx_platform_quirks_impact ON platform_quirks(impact_level);

CREATE INDEX IF NOT EXISTS idx_industries_code ON industries(code);
CREATE INDEX IF NOT EXISTS idx_industries_active ON industries(is_active);
CREATE INDEX IF NOT EXISTS idx_industry_benchmarks_industry ON industry_benchmarks(industry_id);

CREATE INDEX IF NOT EXISTS idx_soul_docs_slug ON soul_documents(slug);
CREATE INDEX IF NOT EXISTS idx_soul_docs_active ON soul_documents(is_active);
CREATE INDEX IF NOT EXISTS idx_soul_doc_versions_published ON soul_document_versions(is_published);

CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_subproducts_product ON subproducts(product_id);
CREATE INDEX IF NOT EXISTS idx_tactic_types_subproduct ON tactic_types(subproduct_id);

CREATE INDEX IF NOT EXISTS idx_reports_campaign ON reports(campaign_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_report_feedback_report ON report_feedback(report_id);

CREATE INDEX IF NOT EXISTS idx_kv_sync_log_namespace ON kv_sync_log(namespace);
CREATE INDEX IF NOT EXISTS idx_kv_sync_log_synced ON kv_sync_log(synced_at);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_platforms_updated_at
  BEFORE UPDATE ON platforms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_industries_updated_at
  BEFORE UPDATE ON industries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_soul_documents_updated_at
  BEFORE UPDATE ON soul_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subproducts_updated_at
  BEFORE UPDATE ON subproducts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tactic_types_updated_at
  BEFORE UPDATE ON tactic_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default soul document
INSERT INTO soul_documents (doc_type, name, slug)
VALUES ('system_prompt', 'Campaign Analyst', 'campaign-analyst')
ON CONFLICT (slug) DO NOTHING;

-- Insert default version for campaign-analyst
INSERT INTO soul_document_versions (document_id, version, content, is_published, published_at)
SELECT id, 1,
'You are an expert digital marketing analyst specializing in campaign performance analysis.

Your role is to:
1. Analyze campaign performance data thoroughly
2. Identify key trends, successes, and areas for improvement
3. Provide actionable recommendations based on industry best practices
4. Consider platform-specific nuances and limitations
5. Deliver insights in a clear, professional format

Always be specific with your analysis, citing actual metrics from the data provided.
Focus on insights that will help improve campaign performance and ROI.

When analyzing campaigns:
- Start with a high-level executive summary
- Break down performance by platform and tactic
- Highlight top performers and underperformers
- Identify optimization opportunities
- Provide specific, actionable recommendations
- Consider budget allocation efficiency
- Note any data quality or tracking issues observed',
true, NOW()
FROM soul_documents
WHERE slug = 'campaign-analyst'
ON CONFLICT DO NOTHING;

-- Insert sample platforms
INSERT INTO platforms (code, name, description) VALUES
  ('facebook', 'Facebook', 'Meta Facebook advertising platform'),
  ('instagram', 'Instagram', 'Meta Instagram advertising platform'),
  ('google_ads', 'Google Ads', 'Google advertising platform including Search, Display, and YouTube'),
  ('youtube', 'YouTube', 'YouTube video advertising'),
  ('linkedin', 'LinkedIn', 'LinkedIn B2B advertising platform'),
  ('twitter', 'Twitter/X', 'Twitter/X advertising platform'),
  ('tiktok', 'TikTok', 'TikTok short-form video advertising'),
  ('snapchat', 'Snapchat', 'Snapchat advertising platform'),
  ('pinterest', 'Pinterest', 'Pinterest visual discovery advertising'),
  ('amazon_ads', 'Amazon Ads', 'Amazon advertising platform'),
  ('programmatic', 'Programmatic Display', 'Programmatic display advertising (DSPs)'),
  ('ctv', 'Connected TV', 'Connected TV and OTT advertising'),
  ('streaming_audio', 'Streaming Audio', 'Audio streaming advertising (Spotify, Pandora, etc.)')
ON CONFLICT (code) DO NOTHING;

-- Insert sample industries
INSERT INTO industries (code, name, description) VALUES
  ('automotive', 'Automotive', 'Automotive industry including dealerships and manufacturers'),
  ('retail', 'Retail', 'Retail and e-commerce businesses'),
  ('healthcare', 'Healthcare', 'Healthcare and medical services'),
  ('finance', 'Financial Services', 'Banking, insurance, and financial services'),
  ('technology', 'Technology', 'Technology and software companies'),
  ('education', 'Education', 'Education institutions and EdTech'),
  ('real_estate', 'Real Estate', 'Real estate and property services'),
  ('travel', 'Travel & Hospitality', 'Travel, tourism, and hospitality'),
  ('food_beverage', 'Food & Beverage', 'Food service and beverage industry'),
  ('entertainment', 'Entertainment', 'Entertainment and media industry')
ON CONFLICT (code) DO NOTHING;
