<?php
/**
 * Direct Table Creation for Report.AI
 * Creates all database tables using direct PDO execution
 */

// Set headers for CORS and JSON response
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'Database.php';

try {
    // Initialize database connection
    $db = new Database();
    $connection = $db->connect();
    
    $results = [
        'success' => true,
        'message' => 'Database tables created successfully',
        'tables' => [],
        'execution_time' => 0
    ];
    
    $startTime = microtime(true);
    
    // Define all table creation statements directly
    $tableStatements = [
        'products' => "
            CREATE TABLE IF NOT EXISTS `products` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `name` VARCHAR(255) NOT NULL UNIQUE,
                `slug` VARCHAR(255) NOT NULL UNIQUE,
                `platforms` TEXT COMMENT 'JSON array of platforms',
                `notes` TEXT,
                `ai_guidelines` TEXT,
                `ai_prompt` TEXT,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX `idx_products_slug` (`slug`),
                INDEX `idx_products_created` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'subproducts' => "
            CREATE TABLE IF NOT EXISTS `subproducts` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `product_id` INT NOT NULL,
                `name` VARCHAR(255) NOT NULL,
                `slug` VARCHAR(255) NOT NULL,
                `platforms` TEXT COMMENT 'JSON array, inherits from product',
                `notes` TEXT,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
                INDEX `idx_subproducts_product` (`product_id`),
                INDEX `idx_subproducts_slug` (`slug`),
                UNIQUE KEY `unique_subproduct_per_product` (`product_id`, `slug`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'tactic_types' => "
            CREATE TABLE IF NOT EXISTS `tactic_types` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `subproduct_id` INT NOT NULL,
                `name` VARCHAR(255) NOT NULL,
                `slug` VARCHAR(255) NOT NULL,
                `data_value` VARCHAR(255) NOT NULL COMMENT 'e.g., youtube_placements',
                `filename_stem` VARCHAR(255) NOT NULL COMMENT 'e.g., placements',
                `expected_filenames` TEXT COMMENT 'JSON array of expected filenames',
                `aliases` TEXT COMMENT 'JSON array of alias names',
                `headers` TEXT COMMENT 'JSON array of expected CSV headers',
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (`subproduct_id`) REFERENCES `subproducts`(`id`) ON DELETE CASCADE,
                INDEX `idx_tactic_types_subproduct` (`subproduct_id`),
                INDEX `idx_tactic_types_slug` (`slug`),
                INDEX `idx_tactic_types_data_value` (`data_value`),
                INDEX `idx_tactic_types_filename_stem` (`filename_stem`),
                UNIQUE KEY `unique_tactic_per_subproduct` (`subproduct_id`, `slug`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'lumina_extractors' => "
            CREATE TABLE IF NOT EXISTS `lumina_extractors` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `product_id` INT NOT NULL,
                `name` VARCHAR(255) NOT NULL,
                `path` VARCHAR(500) NOT NULL COMMENT 'JSON path like lineItems[].product',
                `when_conditions` TEXT COMMENT 'JSON conditions for extraction',
                `aggregate_type` ENUM('first', 'unique', 'sum', 'join') DEFAULT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
                INDEX `idx_extractors_product` (`product_id`),
                INDEX `idx_extractors_name` (`name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'benchmarks' => "
            CREATE TABLE IF NOT EXISTS `benchmarks` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `product_id` INT NOT NULL,
                `metric_name` VARCHAR(255) NOT NULL,
                `goal_value` DECIMAL(10,4) NOT NULL,
                `warning_threshold` DECIMAL(10,4) NOT NULL,
                `unit` ENUM('percentage', 'ratio', 'USD', 'count', 'seconds') NOT NULL,
                `direction` ENUM('higher_better', 'lower_better') NOT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
                INDEX `idx_benchmarks_product` (`product_id`),
                INDEX `idx_benchmarks_metric` (`metric_name`),
                UNIQUE KEY `unique_metric_per_product` (`product_id`, `metric_name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'campaigns' => "
            CREATE TABLE IF NOT EXISTS `campaigns` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `order_id` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Lumina order ID (24-char hex)',
                `company_name` VARCHAR(255) NOT NULL,
                `wide_orbit_number` VARCHAR(255),
                `status` VARCHAR(100),
                `start_date` DATE,
                `end_date` DATE,
                `raw_data` LONGTEXT COMMENT 'Complete JSON response from Lumina API',
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX `idx_campaigns_order_id` (`order_id`),
                INDEX `idx_campaigns_company` (`company_name`),
                INDEX `idx_campaigns_dates` (`start_date`, `end_date`),
                INDEX `idx_campaigns_created` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'reports' => "
            CREATE TABLE IF NOT EXISTS `reports` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `campaign_id` INT NOT NULL,
                `share_token` VARCHAR(32) NOT NULL UNIQUE COMMENT 'Random token for public sharing',
                `report_title` VARCHAR(255) NOT NULL,
                `analysis_date_start` DATE NOT NULL,
                `analysis_date_end` DATE NOT NULL,
                `ai_model` VARCHAR(100) NOT NULL DEFAULT 'claude-sonnet-4-20250514',
                `temperature` DECIMAL(2,1) NOT NULL DEFAULT 0.5,
                `tone` VARCHAR(50) NOT NULL DEFAULT 'professional',
                `custom_instructions` TEXT,
                `analysis_content` LONGTEXT COMMENT 'Structured JSON analysis from AI',
                `html_content` LONGTEXT COMMENT 'Rendered HTML content for display',
                `is_public` BOOLEAN DEFAULT FALSE,
                `view_count` INT DEFAULT 0,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE,
                INDEX `idx_reports_campaign` (`campaign_id`),
                INDEX `idx_reports_share_token` (`share_token`),
                INDEX `idx_reports_dates` (`analysis_date_start`, `analysis_date_end`),
                INDEX `idx_reports_created` (`created_at`),
                INDEX `idx_reports_public` (`is_public`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'company_research' => "
            CREATE TABLE IF NOT EXISTS `company_research` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `company_name` VARCHAR(255) NOT NULL,
                `industry` VARCHAR(255),
                `research_url` VARCHAR(500),
                `raw_research_data` LONGTEXT COMMENT 'Original data fetched from research API',
                `edited_research_data` LONGTEXT COMMENT 'User-modified research data',
                `campaign_goals` TEXT,
                `additional_notes` TEXT,
                `last_research_fetch` TIMESTAMP NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX `idx_research_company` (`company_name`),
                INDEX `idx_research_industry` (`industry`),
                INDEX `idx_research_updated` (`updated_at`),
                UNIQUE KEY `unique_company_research` (`company_name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'uploaded_files' => "
            CREATE TABLE IF NOT EXISTS `uploaded_files` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `report_id` INT NOT NULL,
                `tactic_type_id` INT,
                `original_filename` VARCHAR(255) NOT NULL,
                `file_size` INT NOT NULL,
                `headers_detected` TEXT COMMENT 'JSON array of detected CSV headers',
                `row_count` INT DEFAULT 0,
                `file_hash` VARCHAR(64) NOT NULL COMMENT 'SHA256 hash for deduplication',
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE CASCADE,
                FOREIGN KEY (`tactic_type_id`) REFERENCES `tactic_types`(`id`) ON DELETE SET NULL,
                INDEX `idx_files_report` (`report_id`),
                INDEX `idx_files_tactic` (`tactic_type_id`),
                INDEX `idx_files_hash` (`file_hash`),
                INDEX `idx_files_created` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'case_studies' => "
            CREATE TABLE IF NOT EXISTS `case_studies` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `report_id` INT NOT NULL,
                `title` VARCHAR(255) NOT NULL,
                `description` TEXT NOT NULL,
                `industry_category` VARCHAR(100) NOT NULL,
                `performance_metrics` TEXT COMMENT 'JSON object with key performance indicators',
                `lessons_learned` TEXT NOT NULL,
                `is_featured` BOOLEAN DEFAULT FALSE,
                `anonymized_data` LONGTEXT COMMENT 'Sanitized version for public sharing',
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE CASCADE,
                INDEX `idx_case_studies_report` (`report_id`),
                INDEX `idx_case_studies_industry` (`industry_category`),
                INDEX `idx_case_studies_featured` (`is_featured`),
                INDEX `idx_case_studies_created` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'system_settings' => "
            CREATE TABLE IF NOT EXISTS `system_settings` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `setting_key` VARCHAR(100) NOT NULL UNIQUE,
                `setting_value` TEXT,
                `setting_type` ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
                `description` TEXT,
                `is_public` BOOLEAN DEFAULT FALSE COMMENT 'Whether this setting can be exposed to frontend',
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX `idx_settings_key` (`setting_key`),
                INDEX `idx_settings_public` (`is_public`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        "
    ];
    
    // Create each table
    foreach ($tableStatements as $tableName => $sql) {
        $tableResult = [
            'table' => $tableName,
            'status' => 'creating',
            'execution_time' => 0,
            'error' => null
        ];
        
        try {
            $tableStart = microtime(true);
            $db->executeQuery($sql);
            $tableEnd = microtime(true);
            
            $tableResult['status'] = 'created';
            $tableResult['execution_time'] = round(($tableEnd - $tableStart) * 1000, 2);
            
        } catch (Exception $e) {
            $tableResult['status'] = 'failed';
            $tableResult['error'] = $e->getMessage();
            $results['success'] = false;
            
            error_log("Table {$tableName} creation failed: " . $e->getMessage());
        }
        
        $results['tables'][] = $tableResult;
    }
    
    // Insert default system settings
    try {
        $defaultSettings = [
            ['app_name', 'Report.AI', 'string', 'Application name', 1],
            ['app_version', '1.0.0', 'string', 'Current application version', 1],
            ['schema_version', '2.0', 'string', 'Current schema version', 1],
            ['default_ai_model', 'claude-sonnet-4-20250514', 'string', 'Default AI model for analysis', 1],
            ['default_temperature', '0.5', 'number', 'Default AI temperature setting', 1],
            ['default_tone', 'professional', 'string', 'Default analysis tone', 1],
            ['max_file_size', '10485760', 'number', 'Maximum file upload size in bytes (10MB)', 1],
            ['enable_case_studies', 'true', 'boolean', 'Enable case study generation', 1],
            ['enable_public_sharing', 'true', 'boolean', 'Enable public report sharing', 1],
            ['analytics_retention_days', '365', 'number', 'Days to retain analytics data', 0]
        ];
        
        $insertSQL = "INSERT IGNORE INTO `system_settings` (`setting_key`, `setting_value`, `setting_type`, `description`, `is_public`) VALUES (?, ?, ?, ?, ?)";
        
        $settingsInserted = 0;
        foreach ($defaultSettings as $setting) {
            $stmt = $db->executeQuery($insertSQL, $setting);
            if ($stmt->rowCount() > 0) {
                $settingsInserted++;
            }
        }
        
        $results['settings_inserted'] = $settingsInserted;
        
    } catch (Exception $e) {
        $results['settings_error'] = $e->getMessage();
        error_log("Default settings insertion failed: " . $e->getMessage());
    }
    
    $endTime = microtime(true);
    $results['execution_time'] = round(($endTime - $startTime) * 1000, 2);
    
    // Get final database status
    try {
        $tablesQuery = "SHOW TABLES";
        $stmt = $db->executeQuery($tablesQuery);
        $tables = $stmt->fetchAll();
        
        $results['final_table_count'] = count($tables);
        $results['table_list'] = array_map(function($table) {
            return array_values($table)[0];
        }, $tables);
        
    } catch (Exception $e) {
        $results['table_list_error'] = $e->getMessage();
    }
    
    // Log the result
    error_log("Table creation result: " . json_encode($results));
    
    echo json_encode($results, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    $errorResult = [
        'success' => false,
        'message' => 'Table creation failed: ' . $e->getMessage(),
        'error_time' => date('Y-m-d H:i:s')
    ];
    
    error_log("Table creation error: " . json_encode($errorResult));
    
    http_response_code(500);
    echo json_encode($errorResult, JSON_PRETTY_PRINT);
}
?>