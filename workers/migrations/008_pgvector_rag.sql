-- Report.AI pgvector RAG Migration
-- Adds vector embeddings for semantic search across key tables
-- Run this in Supabase Dashboard SQL Editor

-- ============================================
-- ENABLE PGVECTOR EXTENSION
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- ADD EMBEDDING COLUMNS TO KEY TABLES
-- ============================================

-- Platform Quirks: Semantic search for relevant quirks by campaign context
ALTER TABLE platform_quirks
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_text TEXT,  -- Text that was embedded (for debugging)
  ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ;

-- Industries: Find similar industries when exact match doesn't exist
ALTER TABLE industries
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_text TEXT,
  ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ;

-- Industry Insights: Semantic search for relevant insights
ALTER TABLE industry_insights
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_text TEXT,
  ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ;

-- Products: Match Lumina tactic names to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_text TEXT,
  ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ;

-- Tactic Types: Match Lumina tactic names to specific tactics
ALTER TABLE tactic_types
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_text TEXT,
  ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ;

-- Soul Document Versions: Chunked semantic retrieval of guidance
ALTER TABLE soul_document_versions
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_text TEXT,
  ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ;

-- Lumina Discovered Fields: Match fields to extractors
ALTER TABLE lumina_discovered_fields
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ;

-- ============================================
-- SOUL DOCUMENT CHUNKS (For fine-grained retrieval)
-- ============================================
-- Split long soul documents into semantic chunks for precise retrieval
CREATE TABLE IF NOT EXISTS soul_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID REFERENCES soul_document_versions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  embedding vector(1536),
  embedded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(version_id, chunk_index)
);

-- ============================================
-- VECTOR SEARCH INDEXES (IVFFlat for performance)
-- ============================================
-- Use IVFFlat index for approximate nearest neighbor search
-- Lists = sqrt(n) where n is expected number of rows

CREATE INDEX IF NOT EXISTS idx_platform_quirks_embedding
  ON platform_quirks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

CREATE INDEX IF NOT EXISTS idx_industries_embedding
  ON industries
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

CREATE INDEX IF NOT EXISTS idx_industry_insights_embedding
  ON industry_insights
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

CREATE INDEX IF NOT EXISTS idx_products_embedding
  ON products
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

CREATE INDEX IF NOT EXISTS idx_tactic_types_embedding
  ON tactic_types
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

CREATE INDEX IF NOT EXISTS idx_soul_doc_versions_embedding
  ON soul_document_versions
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

CREATE INDEX IF NOT EXISTS idx_soul_doc_chunks_embedding
  ON soul_document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 20);

CREATE INDEX IF NOT EXISTS idx_lumina_fields_embedding
  ON lumina_discovered_fields
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 20);

-- ============================================
-- VECTOR SEARCH FUNCTIONS
-- ============================================

-- Match platform quirks by semantic similarity
CREATE OR REPLACE FUNCTION match_platform_quirks(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  platform_filter uuid DEFAULT NULL,
  min_similarity float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  platform_id uuid,
  title text,
  description text,
  ai_instruction text,
  impact text,
  quirk_type text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pq.id,
    pq.platform_id,
    pq.title,
    pq.description,
    pq.ai_instruction,
    pq.impact,
    pq.quirk_type,
    1 - (pq.embedding <=> query_embedding) as similarity
  FROM platform_quirks pq
  WHERE
    pq.embedding IS NOT NULL
    AND (platform_filter IS NULL OR pq.platform_id = platform_filter)
    AND 1 - (pq.embedding <=> query_embedding) >= min_similarity
  ORDER BY pq.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Match industries by semantic similarity (for fallback benchmarks)
CREATE OR REPLACE FUNCTION match_similar_industries(
  query_embedding vector(1536),
  match_count int DEFAULT 3,
  min_similarity float DEFAULT 0.6
)
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  description text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.code,
    i.name,
    i.description,
    1 - (i.embedding <=> query_embedding) as similarity
  FROM industries i
  WHERE
    i.embedding IS NOT NULL
    AND i.is_active = true
    AND 1 - (i.embedding <=> query_embedding) >= min_similarity
  ORDER BY i.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Match tactics by semantic similarity (for Lumina matching)
CREATE OR REPLACE FUNCTION match_tactics(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  min_similarity float DEFAULT 0.5
)
RETURNS TABLE (
  tactic_id uuid,
  tactic_name text,
  tactic_data_value text,
  subproduct_id uuid,
  subproduct_name text,
  product_id uuid,
  product_name text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tt.id as tactic_id,
    tt.name as tactic_name,
    tt.data_value as tactic_data_value,
    sp.id as subproduct_id,
    sp.name as subproduct_name,
    p.id as product_id,
    p.name as product_name,
    1 - (tt.embedding <=> query_embedding) as similarity
  FROM tactic_types tt
  JOIN subproducts sp ON tt.subproduct_id = sp.id
  JOIN products p ON sp.product_id = p.id
  WHERE
    tt.embedding IS NOT NULL
    AND tt.is_active = true
    AND sp.is_active = true
    AND p.is_active = true
    AND 1 - (tt.embedding <=> query_embedding) >= min_similarity
  ORDER BY tt.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Match soul document chunks by semantic similarity
CREATE OR REPLACE FUNCTION match_soul_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  doc_type_filter text DEFAULT NULL,
  min_similarity float DEFAULT 0.5
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_name text,
  document_type text,
  chunk_content text,
  chunk_index int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id as chunk_id,
    sd.id as document_id,
    sd.name as document_name,
    sd.doc_type as document_type,
    sc.content as chunk_content,
    sc.chunk_index,
    1 - (sc.embedding <=> query_embedding) as similarity
  FROM soul_document_chunks sc
  JOIN soul_document_versions sv ON sc.version_id = sv.id
  JOIN soul_documents sd ON sv.document_id = sd.id
  WHERE
    sc.embedding IS NOT NULL
    AND sv.is_published = true
    AND sd.is_active = true
    AND (doc_type_filter IS NULL OR sd.doc_type = doc_type_filter)
    AND 1 - (sc.embedding <=> query_embedding) >= min_similarity
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Match industry insights by semantic similarity
CREATE OR REPLACE FUNCTION match_industry_insights(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  industry_filter uuid DEFAULT NULL,
  insight_type_filter text DEFAULT NULL,
  min_similarity float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  industry_id uuid,
  industry_name text,
  title text,
  content text,
  ai_instruction text,
  insight_type text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ii.id,
    ii.industry_id,
    i.name as industry_name,
    ii.title,
    ii.content,
    ii.ai_instruction,
    ii.insight_type,
    1 - (ii.embedding <=> query_embedding) as similarity
  FROM industry_insights ii
  JOIN industries i ON ii.industry_id = i.id
  WHERE
    ii.embedding IS NOT NULL
    AND (industry_filter IS NULL OR ii.industry_id = industry_filter)
    AND (insight_type_filter IS NULL OR ii.insight_type = insight_type_filter)
    AND 1 - (ii.embedding <=> query_embedding) >= min_similarity
  ORDER BY ii.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Match discovered fields for extractor suggestions
CREATE OR REPLACE FUNCTION match_discovered_fields(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  min_similarity float DEFAULT 0.6
)
RETURNS TABLE (
  id uuid,
  field_path text,
  data_types text[],
  frequency float,
  sample_values jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    df.id,
    df.field_path,
    df.data_types,
    df.frequency,
    df.sample_values,
    1 - (df.embedding <=> query_embedding) as similarity
  FROM lumina_discovered_fields df
  WHERE
    df.embedding IS NOT NULL
    AND 1 - (df.embedding <=> query_embedding) >= min_similarity
  ORDER BY df.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- HYBRID SEARCH: Combine keyword + vector
-- ============================================

-- Hybrid search for platform quirks (keyword + semantic)
CREATE OR REPLACE FUNCTION hybrid_search_quirks(
  search_query text,
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  platform_filter uuid DEFAULT NULL,
  keyword_weight float DEFAULT 0.3,
  semantic_weight float DEFAULT 0.7
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  ai_instruction text,
  impact text,
  combined_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pq.id,
    pq.title,
    pq.description,
    pq.ai_instruction,
    pq.impact,
    (
      keyword_weight * COALESCE(ts_rank(
        to_tsvector('english', COALESCE(pq.title, '') || ' ' || COALESCE(pq.description, '')),
        plainto_tsquery('english', search_query)
      ), 0) +
      semantic_weight * (1 - (pq.embedding <=> query_embedding))
    ) as combined_score
  FROM platform_quirks pq
  WHERE
    pq.embedding IS NOT NULL
    AND (platform_filter IS NULL OR pq.platform_id = platform_filter)
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- ============================================
-- EMBEDDING TRACKING TABLE
-- ============================================
-- Track embedding generation jobs and costs
CREATE TABLE IF NOT EXISTS embedding_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  model TEXT DEFAULT 'text-embedding-3-small',
  tokens_used INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(table_name, record_id)
);

CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status ON embedding_jobs(status);
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_table ON embedding_jobs(table_name);

-- ============================================
-- HELPER: Get records needing embeddings
-- ============================================
CREATE OR REPLACE FUNCTION get_records_needing_embeddings(
  target_table text,
  batch_size int DEFAULT 50
)
RETURNS TABLE (
  record_id uuid,
  text_to_embed text
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF target_table = 'platform_quirks' THEN
    RETURN QUERY
    SELECT pq.id,
           COALESCE(pq.title, '') || ' ' || COALESCE(pq.description, '') || ' ' || COALESCE(pq.ai_instruction, '')
    FROM platform_quirks pq
    WHERE pq.embedding IS NULL
    LIMIT batch_size;

  ELSIF target_table = 'industries' THEN
    RETURN QUERY
    SELECT i.id,
           i.name || ' ' || COALESCE(i.description, '')
    FROM industries i
    WHERE i.embedding IS NULL AND i.is_active = true
    LIMIT batch_size;

  ELSIF target_table = 'industry_insights' THEN
    RETURN QUERY
    SELECT ii.id,
           COALESCE(ii.title, '') || ' ' || COALESCE(ii.content, '') || ' ' || COALESCE(ii.ai_instruction, '')
    FROM industry_insights ii
    WHERE ii.embedding IS NULL
    LIMIT batch_size;

  ELSIF target_table = 'products' THEN
    RETURN QUERY
    SELECT p.id,
           p.name || ' ' || COALESCE(p.data_value, '')
    FROM products p
    WHERE p.embedding IS NULL AND p.is_active = true
    LIMIT batch_size;

  ELSIF target_table = 'tactic_types' THEN
    RETURN QUERY
    SELECT tt.id,
           tt.name || ' ' || COALESCE(tt.data_value, '') || ' ' ||
           (SELECT sp.name || ' ' || p.name
            FROM subproducts sp
            JOIN products p ON sp.product_id = p.id
            WHERE sp.id = tt.subproduct_id)
    FROM tactic_types tt
    WHERE tt.embedding IS NULL AND tt.is_active = true
    LIMIT batch_size;

  ELSIF target_table = 'lumina_discovered_fields' THEN
    RETURN QUERY
    SELECT df.id,
           df.field_path || ' ' || array_to_string(df.data_types, ' ')
    FROM lumina_discovered_fields df
    WHERE df.embedding IS NULL
    LIMIT batch_size;

  END IF;
END;
$$;

-- ============================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================
ALTER TABLE soul_document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedding_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on soul_document_chunks"
  ON soul_document_chunks FOR SELECT
  USING (true);

CREATE POLICY "Allow public read on embedding_jobs"
  ON embedding_jobs FOR SELECT
  USING (true);

CREATE POLICY "Allow service insert/update on soul_document_chunks"
  ON soul_document_chunks FOR ALL
  USING (true);

CREATE POLICY "Allow service insert/update on embedding_jobs"
  ON embedding_jobs FOR ALL
  USING (true);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON FUNCTION match_platform_quirks IS 'Semantic search for platform quirks by campaign context';
COMMENT ON FUNCTION match_similar_industries IS 'Find similar industries when exact match not available';
COMMENT ON FUNCTION match_tactics IS 'Match Lumina tactic names to schema via semantic similarity';
COMMENT ON FUNCTION match_soul_chunks IS 'Retrieve relevant soul document chunks for context assembly';
COMMENT ON FUNCTION match_industry_insights IS 'Semantic search for relevant industry insights';
COMMENT ON FUNCTION hybrid_search_quirks IS 'Combined keyword + semantic search for quirks';
