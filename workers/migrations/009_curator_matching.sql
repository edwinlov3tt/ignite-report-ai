-- Report.AI Curator Matching Functions Migration
-- Adds semantic matching functions for the smart curator
-- Run this in Supabase Dashboard SQL Editor

-- ============================================
-- ADD EMBEDDINGS TO PLATFORMS TABLE
-- ============================================
ALTER TABLE platforms
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_text TEXT,
  ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_platforms_embedding
  ON platforms
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

-- ============================================
-- MATCH PLATFORMS BY SEMANTIC SIMILARITY
-- ============================================
CREATE OR REPLACE FUNCTION match_platforms(
  query_embedding vector(1536),
  match_count int DEFAULT 3,
  min_similarity float DEFAULT 0.6
)
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  category text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.code,
    p.name,
    p.category,
    1 - (p.embedding <=> query_embedding) as similarity
  FROM platforms p
  WHERE
    p.embedding IS NOT NULL
    AND p.is_active = true
    AND 1 - (p.embedding <=> query_embedding) >= min_similarity
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- MATCH PRODUCTS BY SEMANTIC SIMILARITY
-- ============================================
CREATE OR REPLACE FUNCTION match_products(
  query_embedding vector(1536),
  match_count int DEFAULT 3,
  min_similarity float DEFAULT 0.6
)
RETURNS TABLE (
  id uuid,
  name text,
  data_value text,
  description text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.data_value,
    p.description,
    1 - (p.embedding <=> query_embedding) as similarity
  FROM products p
  WHERE
    p.embedding IS NOT NULL
    AND p.is_active = true
    AND 1 - (p.embedding <=> query_embedding) >= min_similarity
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- TEXT-BASED PLATFORM MATCHING (Fallback)
-- ============================================
-- For platforms that might not have embeddings yet
CREATE OR REPLACE FUNCTION match_platform_by_name(
  search_name text
)
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  category text,
  match_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Exact match
  SELECT p.id, p.code, p.name, p.category, 'exact'::text as match_type
  FROM platforms p
  WHERE p.is_active = true
    AND (LOWER(p.name) = LOWER(search_name) OR LOWER(p.code) = LOWER(search_name))

  UNION ALL

  -- Partial match (contains)
  SELECT p.id, p.code, p.name, p.category, 'partial'::text as match_type
  FROM platforms p
  WHERE p.is_active = true
    AND (LOWER(p.name) ILIKE '%' || LOWER(search_name) || '%'
         OR LOWER(search_name) ILIKE '%' || LOWER(p.name) || '%')
    AND NOT (LOWER(p.name) = LOWER(search_name) OR LOWER(p.code) = LOWER(search_name))

  LIMIT 5;
END;
$$;

-- ============================================
-- TEXT-BASED INDUSTRY MATCHING (Fallback)
-- ============================================
CREATE OR REPLACE FUNCTION match_industry_by_name(
  search_name text
)
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  match_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Exact match
  SELECT i.id, i.code, i.name, 'exact'::text as match_type
  FROM industries i
  WHERE i.is_active = true
    AND (LOWER(i.name) = LOWER(search_name) OR LOWER(i.code) = LOWER(search_name))

  UNION ALL

  -- Partial match
  SELECT i.id, i.code, i.name, 'partial'::text as match_type
  FROM industries i
  WHERE i.is_active = true
    AND (LOWER(i.name) ILIKE '%' || LOWER(search_name) || '%'
         OR LOWER(search_name) ILIKE '%' || LOWER(i.name) || '%')
    AND NOT (LOWER(i.name) = LOWER(search_name) OR LOWER(i.code) = LOWER(search_name))

  LIMIT 5;
END;
$$;

-- ============================================
-- UPDATE GET_RECORDS_NEEDING_EMBEDDINGS
-- ============================================
-- Add platforms to the embedding helper function
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
  IF target_table = 'platforms' THEN
    RETURN QUERY
    SELECT p.id,
           p.name || ' ' || COALESCE(p.code, '') || ' ' || COALESCE(p.category, '')
    FROM platforms p
    WHERE p.embedding IS NULL AND p.is_active = true
    LIMIT batch_size;

  ELSIF target_table = 'platform_quirks' THEN
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
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION match_platforms IS 'Semantic search for platforms by name/context';
COMMENT ON FUNCTION match_products IS 'Semantic search for products by name/context';
COMMENT ON FUNCTION match_platform_by_name IS 'Text-based platform matching (fallback)';
COMMENT ON FUNCTION match_industry_by_name IS 'Text-based industry matching (fallback)';
