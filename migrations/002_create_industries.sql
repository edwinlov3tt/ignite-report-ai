-- ============================================
-- Industry Knowledge Tables
-- Migration: 002_create_industries.sql
-- ============================================

-- industries
-- Industry verticals for benchmark and insight organization
CREATE TABLE IF NOT EXISTS industries (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50) COMMENT 'Icon name for UI display',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_industries_code (code),
  INDEX idx_industries_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- industry_benchmarks
-- Performance benchmarks by industry, platform, and metric
CREATE TABLE IF NOT EXISTS industry_benchmarks (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  industry_id VARCHAR(36) NOT NULL,
  platform_id VARCHAR(36) COMMENT 'Optional: specific platform',
  tactic_id VARCHAR(36) COMMENT 'Optional: specific tactic type',
  metric VARCHAR(100) NOT NULL COMMENT 'Metric name (CTR, CPC, ROAS, etc.)',
  p25 DECIMAL(15,4) COMMENT '25th percentile value',
  p50 DECIMAL(15,4) NOT NULL COMMENT 'Median (50th percentile) value',
  p75 DECIMAL(15,4) COMMENT '75th percentile value',
  sample_size INT COMMENT 'Number of campaigns in sample',
  confidence DECIMAL(5,4) COMMENT 'Statistical confidence (0-1)',
  quarter VARCHAR(10) NOT NULL COMMENT 'Time period (e.g., Q1 2025)',
  source VARCHAR(200) COMMENT 'Data source',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE,
  FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE SET NULL,
  INDEX idx_benchmarks_industry (industry_id),
  INDEX idx_benchmarks_platform (platform_id),
  INDEX idx_benchmarks_metric (metric),
  INDEX idx_benchmarks_quarter (quarter)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- industry_insights
-- Qualitative industry knowledge and trends
CREATE TABLE IF NOT EXISTS industry_insights (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  industry_id VARCHAR(36) NOT NULL,
  insight_type ENUM('trend', 'strategy', 'audience', 'creative', 'budget', 'other') NOT NULL DEFAULT 'other',
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  ai_instruction TEXT COMMENT 'How AI should apply this insight',
  source VARCHAR(200),
  source_url VARCHAR(500),
  valid_from DATE COMMENT 'When this insight became relevant',
  valid_until DATE COMMENT 'When this insight expires (if applicable)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE,
  INDEX idx_insights_industry (industry_id),
  INDEX idx_insights_type (insight_type),
  INDEX idx_insights_validity (valid_from, valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- industry_seasonality
-- Seasonal patterns and their impact on performance/costs
CREATE TABLE IF NOT EXISTS industry_seasonality (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  industry_id VARCHAR(36) NOT NULL,
  period_type ENUM('month', 'quarter', 'holiday', 'event') NOT NULL,
  period_value VARCHAR(50) NOT NULL COMMENT 'e.g., "December", "Q4", "Black Friday"',
  impact ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium',
  cpm_modifier DECIMAL(5,4) COMMENT 'Multiplier for CPM (e.g., 1.35 = +35%)',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE,
  INDEX idx_seasonality_industry (industry_id),
  INDEX idx_seasonality_period (period_type, period_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Seed Data: Common Industries
-- ============================================

INSERT INTO industries (id, name, code, description, icon) VALUES
  ('ind-automotive', 'Automotive', 'automotive', 'Vehicle manufacturers, dealerships, and automotive services', 'car'),
  ('ind-retail', 'Retail & E-commerce', 'retail', 'Online and physical retail stores', 'shopping-cart'),
  ('ind-healthcare', 'Healthcare', 'healthcare', 'Hospitals, clinics, and healthcare providers', 'heart-pulse'),
  ('ind-finance', 'Financial Services', 'finance', 'Banks, insurance, and financial institutions', 'banknote'),
  ('ind-travel', 'Travel & Hospitality', 'travel', 'Hotels, airlines, and travel agencies', 'plane'),
  ('ind-education', 'Education', 'education', 'Schools, universities, and online learning', 'graduation-cap'),
  ('ind-tech', 'Technology', 'technology', 'Software, hardware, and tech services', 'laptop'),
  ('ind-realestate', 'Real Estate', 'real_estate', 'Property sales, rentals, and management', 'home'),
  ('ind-food', 'Food & Beverage', 'food_beverage', 'Restaurants, food delivery, and CPG', 'utensils'),
  ('ind-entertainment', 'Entertainment', 'entertainment', 'Media, gaming, and streaming services', 'tv')
ON DUPLICATE KEY UPDATE name = VALUES(name);
