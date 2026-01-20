-- ============================================
-- Mediums Table
-- Migration: 006_create_mediums.sql
-- ============================================

-- mediums
-- Reusable list of advertising mediums with descriptions for AI prompts
CREATE TABLE IF NOT EXISTS mediums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT COMMENT 'Description used in AI prompts to explain this medium type',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mediums_code ON mediums(code);
CREATE INDEX IF NOT EXISTS idx_mediums_active ON mediums(is_active);

-- ============================================
-- Seed Data: Common Mediums
-- ============================================

INSERT INTO mediums (name, code, description, sort_order) VALUES
  ('Display', 'display', 'Banner ads, rich media ads, and other visual advertisements shown on websites and apps. Focus on impressions, CTR, viewability, and brand awareness metrics.', 1),
  ('Video', 'video', 'Video advertisements including pre-roll, mid-roll, and outstream formats. Key metrics include completion rate, view-through rate, and engagement.', 2),
  ('Audio', 'audio', 'Audio advertisements on streaming services, podcasts, and digital radio. Focus on listen-through rate, frequency, and reach.', 3),
  ('Native', 'native', 'Content that matches the form and function of the platform it appears on. Emphasize engagement metrics and content consumption patterns.', 4),
  ('Search', 'search', 'Text-based ads shown in search engine results. Focus on click-through rate, quality score, conversion rate, and ROAS.', 5),
  ('Social', 'social', 'Advertisements on social media platforms. Consider engagement (likes, shares, comments), reach, and platform-specific metrics.', 6),
  ('Email', 'email', 'Email marketing campaigns. Key metrics include open rate, click rate, conversion rate, and deliverability.', 7),
  ('Connected TV', 'ctv', 'Streaming TV advertisements on connected devices. Focus on completion rate, reach, frequency, and household targeting.', 8),
  ('OTT', 'ott', 'Over-the-top streaming content advertisements. Similar to CTV but may include mobile streaming. Focus on video completion and cross-device reach.', 9),
  ('Streaming', 'streaming', 'General streaming advertisements across video and audio platforms. Consider platform-specific behaviors and completion rates.', 10)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- ============================================
-- Update products table to use mediums array
-- ============================================

-- Add mediums column if not exists (array of medium codes)
ALTER TABLE products ADD COLUMN IF NOT EXISTS mediums TEXT[];

-- Migrate existing medium values to mediums array
UPDATE products
SET mediums = ARRAY[medium]
WHERE medium IS NOT NULL AND medium != '' AND mediums IS NULL;

-- Update subproducts table similarly
ALTER TABLE subproducts ADD COLUMN IF NOT EXISTS mediums TEXT[];

UPDATE subproducts
SET mediums = ARRAY[medium]
WHERE medium IS NOT NULL AND medium != '' AND mediums IS NULL;

-- Note: Keep the old 'medium' column for backward compatibility during transition
-- Can be dropped in a future migration after frontend is fully updated
