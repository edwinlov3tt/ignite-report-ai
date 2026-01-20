-- RLS Policies for Public Read Access
-- Required for Supabase anon key to read data from browser

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE subproducts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tactic_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_quirks ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_buyer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_seasonality ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_document_versions ENABLE ROW LEVEL SECURITY;

-- Products - Public read, authenticated write
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (true);

CREATE POLICY "Products are editable by authenticated users" ON products
  FOR ALL USING (true);

-- Subproducts
CREATE POLICY "Subproducts are viewable by everyone" ON subproducts
  FOR SELECT USING (true);

CREATE POLICY "Subproducts are editable by authenticated users" ON subproducts
  FOR ALL USING (true);

-- Tactic Types
CREATE POLICY "Tactic types are viewable by everyone" ON tactic_types
  FOR SELECT USING (true);

CREATE POLICY "Tactic types are editable by authenticated users" ON tactic_types
  FOR ALL USING (true);

-- Platforms
CREATE POLICY "Platforms are viewable by everyone" ON platforms
  FOR SELECT USING (true);

CREATE POLICY "Platforms are editable by authenticated users" ON platforms
  FOR ALL USING (true);

-- Platform Quirks
CREATE POLICY "Platform quirks are viewable by everyone" ON platform_quirks
  FOR SELECT USING (true);

CREATE POLICY "Platform quirks are editable by authenticated users" ON platform_quirks
  FOR ALL USING (true);

-- Platform KPIs
CREATE POLICY "Platform KPIs are viewable by everyone" ON platform_kpis
  FOR SELECT USING (true);

CREATE POLICY "Platform KPIs are editable by authenticated users" ON platform_kpis
  FOR ALL USING (true);

-- Platform Thresholds
CREATE POLICY "Platform thresholds are viewable by everyone" ON platform_thresholds
  FOR SELECT USING (true);

CREATE POLICY "Platform thresholds are editable by authenticated users" ON platform_thresholds
  FOR ALL USING (true);

-- Platform Buyer Notes
CREATE POLICY "Platform buyer notes are viewable by everyone" ON platform_buyer_notes
  FOR SELECT USING (true);

CREATE POLICY "Platform buyer notes are editable by authenticated users" ON platform_buyer_notes
  FOR ALL USING (true);

-- Industries
CREATE POLICY "Industries are viewable by everyone" ON industries
  FOR SELECT USING (true);

CREATE POLICY "Industries are editable by authenticated users" ON industries
  FOR ALL USING (true);

-- Industry Benchmarks
CREATE POLICY "Industry benchmarks are viewable by everyone" ON industry_benchmarks
  FOR SELECT USING (true);

CREATE POLICY "Industry benchmarks are editable by authenticated users" ON industry_benchmarks
  FOR ALL USING (true);

-- Industry Insights
CREATE POLICY "Industry insights are viewable by everyone" ON industry_insights
  FOR SELECT USING (true);

CREATE POLICY "Industry insights are editable by authenticated users" ON industry_insights
  FOR ALL USING (true);

-- Industry Seasonality
CREATE POLICY "Industry seasonality are viewable by everyone" ON industry_seasonality
  FOR SELECT USING (true);

CREATE POLICY "Industry seasonality are editable by authenticated users" ON industry_seasonality
  FOR ALL USING (true);

-- Soul Documents
CREATE POLICY "Soul documents are viewable by everyone" ON soul_documents
  FOR SELECT USING (true);

CREATE POLICY "Soul documents are editable by authenticated users" ON soul_documents
  FOR ALL USING (true);

-- Soul Document Versions
CREATE POLICY "Soul document versions are viewable by everyone" ON soul_document_versions
  FOR SELECT USING (true);

CREATE POLICY "Soul document versions are editable by authenticated users" ON soul_document_versions
  FOR ALL USING (true);
