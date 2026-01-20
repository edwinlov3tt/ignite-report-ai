-- ============================================
-- Platform Knowledge Tables
-- Migration: 001_create_platforms.sql
-- ============================================

-- platforms
-- Core platform definitions (Facebook, Google, TikTok, etc.)
CREATE TABLE IF NOT EXISTS platforms (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  category ENUM('social', 'search', 'display', 'video', 'programmatic', 'other') NOT NULL DEFAULT 'other',
  logo_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_platforms_code (code),
  INDEX idx_platforms_category (category),
  INDEX idx_platforms_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- platform_quirks
-- Platform-specific behaviors, limitations, and gotchas
CREATE TABLE IF NOT EXISTS platform_quirks (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  platform_id VARCHAR(36) NOT NULL,
  quirk_type ENUM('attribution', 'targeting', 'bidding', 'reporting', 'creative', 'other') NOT NULL DEFAULT 'other',
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  impact ENUM('high', 'medium', 'low') DEFAULT 'medium',
  ai_instruction TEXT COMMENT 'Instructions for AI on how to handle this quirk',
  applies_to_tactics JSON COMMENT 'Array of tactic IDs this quirk applies to',
  source VARCHAR(200) COMMENT 'Where this information came from',
  contributed_by VARCHAR(100),
  verified_by VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE,
  INDEX idx_quirks_platform (platform_id),
  INDEX idx_quirks_type (quirk_type),
  INDEX idx_quirks_impact (impact)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- platform_kpis
-- Primary and secondary KPIs by campaign objective
CREATE TABLE IF NOT EXISTS platform_kpis (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  platform_id VARCHAR(36) NOT NULL,
  objective VARCHAR(100) NOT NULL COMMENT 'Campaign objective (awareness, conversions, etc.)',
  primary_kpis JSON NOT NULL COMMENT 'Array of primary KPI names',
  secondary_kpis JSON COMMENT 'Array of secondary KPI names',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE,
  INDEX idx_kpis_platform (platform_id),
  UNIQUE KEY uk_platform_objective (platform_id, objective)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- platform_thresholds
-- Warning and critical thresholds for metrics
CREATE TABLE IF NOT EXISTS platform_thresholds (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  platform_id VARCHAR(36) NOT NULL,
  metric VARCHAR(100) NOT NULL,
  warning_value DECIMAL(15,4),
  critical_value DECIMAL(15,4),
  direction ENUM('above', 'below') NOT NULL COMMENT 'above = bad when above threshold, below = bad when below',
  context TEXT COMMENT 'Contextual explanation of the threshold',
  tactic_id VARCHAR(36) COMMENT 'Optional: specific tactic this threshold applies to',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE,
  INDEX idx_thresholds_platform (platform_id),
  INDEX idx_thresholds_metric (metric)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- platform_buyer_notes
-- Crowdsourced tips, warnings, and best practices from media buyers
CREATE TABLE IF NOT EXISTS platform_buyer_notes (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  platform_id VARCHAR(36) NOT NULL,
  note_type ENUM('tip', 'warning', 'gotcha', 'best_practice') NOT NULL DEFAULT 'tip',
  content TEXT NOT NULL,
  tactic_id VARCHAR(36) COMMENT 'Optional: specific tactic this note applies to',
  contributed_by VARCHAR(100) NOT NULL,
  upvotes INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  verified_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE,
  INDEX idx_notes_platform (platform_id),
  INDEX idx_notes_type (note_type),
  INDEX idx_notes_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Seed Data: Common Platforms
-- ============================================

INSERT INTO platforms (id, name, code, category) VALUES
  ('plt-facebook', 'Facebook', 'facebook', 'social'),
  ('plt-google-ads', 'Google Ads', 'google_ads', 'search'),
  ('plt-tiktok', 'TikTok', 'tiktok', 'social'),
  ('plt-linkedin', 'LinkedIn', 'linkedin', 'social'),
  ('plt-dv360', 'DV360', 'dv360', 'programmatic'),
  ('plt-youtube', 'YouTube', 'youtube', 'video'),
  ('plt-instagram', 'Instagram', 'instagram', 'social'),
  ('plt-snapchat', 'Snapchat', 'snapchat', 'social'),
  ('plt-pinterest', 'Pinterest', 'pinterest', 'social'),
  ('plt-twitter', 'Twitter/X', 'twitter', 'social')
ON DUPLICATE KEY UPDATE name = VALUES(name);
