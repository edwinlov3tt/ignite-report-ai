-- ============================================
-- Soul Documents Tables
-- Migration: 003_create_soul_documents.sql
-- Version-controlled prompts, personas, and templates
-- ============================================

-- soul_documents
-- Core document definitions
CREATE TABLE IF NOT EXISTS soul_documents (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  doc_type ENUM('system_prompt', 'agent_persona', 'skill', 'template') NOT NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_docs_type (doc_type),
  INDEX idx_docs_slug (slug),
  INDEX idx_docs_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- soul_document_versions
-- Version history for each document
CREATE TABLE IF NOT EXISTS soul_document_versions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  document_id VARCHAR(36) NOT NULL,
  version INT NOT NULL COMMENT 'Incrementing version number',
  content MEDIUMTEXT NOT NULL COMMENT 'Full prompt/persona content',
  change_summary VARCHAR(500) COMMENT 'Brief description of changes',
  changed_by VARCHAR(100) NOT NULL,
  is_published BOOLEAN DEFAULT false COMMENT 'Whether this is the active version',
  published_at TIMESTAMP NULL COMMENT 'When this version was published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES soul_documents(id) ON DELETE CASCADE,
  UNIQUE KEY uk_doc_version (document_id, version),
  INDEX idx_versions_document (document_id),
  INDEX idx_versions_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- soul_document_tests
-- Test cases for validating prompts
CREATE TABLE IF NOT EXISTS soul_document_tests (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  document_id VARCHAR(36) NOT NULL,
  name VARCHAR(200) NOT NULL,
  input_data JSON NOT NULL COMMENT 'Test input data/context',
  expected_behavior TEXT COMMENT 'Description of expected output behavior',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES soul_documents(id) ON DELETE CASCADE,
  INDEX idx_tests_document (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- soul_document_test_results
-- Historical test execution results
CREATE TABLE IF NOT EXISTS soul_document_test_results (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  test_id VARCHAR(36) NOT NULL,
  version_id VARCHAR(36) NOT NULL,
  output MEDIUMTEXT NOT NULL COMMENT 'AI-generated output',
  tokens_used INT COMMENT 'Total tokens consumed',
  latency_ms INT COMMENT 'Response time in milliseconds',
  rating TINYINT COMMENT 'Manual quality rating 1-5',
  notes TEXT COMMENT 'Evaluator notes',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES soul_document_tests(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES soul_document_versions(id) ON DELETE CASCADE,
  INDEX idx_results_test (test_id),
  INDEX idx_results_version (version_id),
  INDEX idx_results_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Seed Data: Starter Documents
-- ============================================

-- Insert a starter system prompt
INSERT INTO soul_documents (id, doc_type, name, slug, description) VALUES
  ('doc-campaign-analyst', 'system_prompt', 'Campaign Analyst', 'campaign-analyst', 'Primary system prompt for campaign analysis tasks'),
  ('doc-friendly-persona', 'agent_persona', 'Friendly Analyst', 'friendly-analyst', 'Warm, encouraging persona for client-facing analysis'),
  ('doc-benchmark-skill', 'skill', 'Benchmark Comparison', 'benchmark-comparison', 'Skill for comparing metrics against industry benchmarks'),
  ('doc-executive-template', 'template', 'Executive Summary', 'executive-summary', 'Template for generating executive summaries')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert initial version for campaign analyst
INSERT INTO soul_document_versions (id, document_id, version, content, change_summary, changed_by, is_published, published_at) VALUES
  ('ver-campaign-analyst-1', 'doc-campaign-analyst', 1,
   'You are an expert digital marketing analyst specializing in campaign performance analysis.\n\n## Your Role\nAnalyze marketing campaign data and provide actionable insights to improve performance.\n\n## Guidelines\n1. Always start with a high-level executive summary\n2. Focus on metrics that matter for the campaign objective\n3. Provide specific, actionable recommendations\n4. Use industry benchmarks when available\n5. Flag any anomalies or areas of concern\n\n## Tone\nProfessional but accessible. Avoid jargon when possible.',
   'Initial version with core guidelines',
   'system',
   true,
   CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE content = VALUES(content);
