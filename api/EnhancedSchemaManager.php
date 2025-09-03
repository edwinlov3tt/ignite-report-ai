<?php
/**
 * Enhanced Schema Manager with Full AI Control
 * Handles advanced schema operations including AI testing and report sections
 */

require_once 'Database.php';
require_once 'SchemaManager.php';

class EnhancedSchemaManager extends SchemaManager {
    
    public function __construct() {
        parent::__construct();
    }
    
    /**
     * Get all report sections configuration
     */
    public function getReportSections() {
        return $this->db->fetchAll("
            SELECT * FROM report_sections 
            ORDER BY display_order ASC
        ");
    }
    
    /**
     * Save report section configuration
     */
    public function saveReportSection($data) {
        if (isset($data['id'])) {
            return $this->updateReportSection($data['id'], $data);
        } else {
            return $this->createReportSection($data);
        }
    }
    
    /**
     * Create new report section
     */
    public function createReportSection($data) {
        return $this->db->insert("
            INSERT INTO report_sections 
            (section_key, section_name, display_order, is_enabled, is_required, 
             default_instructions, data_sources, output_format, min_length, max_length)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ", [
            $data['section_key'],
            $data['section_name'],
            $data['display_order'] ?? 100,
            $data['is_enabled'] ?? true,
            $data['is_required'] ?? false,
            $data['default_instructions'] ?? null,
            json_encode($data['data_sources'] ?? []),
            $data['output_format'] ?? null,
            $data['min_length'] ?? null,
            $data['max_length'] ?? null
        ]);
    }
    
    /**
     * Update report section
     */
    public function updateReportSection($sectionId, $data) {
        return $this->db->update("
            UPDATE report_sections 
            SET section_name = ?, display_order = ?, is_enabled = ?, is_required = ?,
                default_instructions = ?, data_sources = ?, output_format = ?,
                min_length = ?, max_length = ?, updated_at = NOW()
            WHERE id = ?
        ", [
            $data['section_name'],
            $data['display_order'] ?? 100,
            $data['is_enabled'] ?? true,
            $data['is_required'] ?? false,
            $data['default_instructions'] ?? null,
            json_encode($data['data_sources'] ?? []),
            $data['output_format'] ?? null,
            $data['min_length'] ?? null,
            $data['max_length'] ?? null,
            $sectionId
        ]);
    }
    
    /**
     * Get product-specific section overrides
     */
    public function getProductSections($productId) {
        return $this->db->fetchAll("
            SELECT rs.*, prs.is_enabled as override_enabled, 
                   prs.custom_instructions, prs.custom_data_sources,
                   prs.custom_min_length, prs.custom_max_length,
                   prs.display_order as override_order
            FROM report_sections rs
            LEFT JOIN product_report_sections prs 
                ON rs.id = prs.section_id AND prs.product_id = ?
            ORDER BY COALESCE(prs.display_order, rs.display_order)
        ", [$productId]);
    }
    
    /**
     * Save product section override
     */
    public function saveProductSectionOverride($productId, $sectionId, $data) {
        // Check if override exists
        $existing = $this->db->fetchOne("
            SELECT id FROM product_report_sections 
            WHERE product_id = ? AND section_id = ?
        ", [$productId, $sectionId]);
        
        if ($existing) {
            return $this->db->update("
                UPDATE product_report_sections 
                SET is_enabled = ?, custom_instructions = ?, custom_data_sources = ?,
                    custom_min_length = ?, custom_max_length = ?, display_order = ?
                WHERE product_id = ? AND section_id = ?
            ", [
                $data['is_enabled'] ?? true,
                $data['custom_instructions'] ?? null,
                json_encode($data['custom_data_sources'] ?? null),
                $data['custom_min_length'] ?? null,
                $data['custom_max_length'] ?? null,
                $data['display_order'] ?? null,
                $productId,
                $sectionId
            ]);
        } else {
            return $this->db->insert("
                INSERT INTO product_report_sections 
                (product_id, section_id, is_enabled, custom_instructions, 
                 custom_data_sources, custom_min_length, custom_max_length, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ", [
                $productId,
                $sectionId,
                $data['is_enabled'] ?? true,
                $data['custom_instructions'] ?? null,
                json_encode($data['custom_data_sources'] ?? null),
                $data['custom_min_length'] ?? null,
                $data['custom_max_length'] ?? null,
                $data['display_order'] ?? null
            ]);
        }
    }
    
    /**
     * Get AI global settings
     */
    public function getAIGlobalSettings() {
        $settings = $this->db->fetchAll("
            SELECT * FROM ai_global_settings 
            ORDER BY category, setting_key
        ");
        
        // Transform to key-value pairs by category
        $result = [];
        foreach ($settings as $setting) {
            if (!isset($result[$setting['category']])) {
                $result[$setting['category']] = [];
            }
            
            $value = $setting['setting_value'];
            // Convert based on type
            switch ($setting['setting_type']) {
                case 'number':
                    $value = floatval($value);
                    break;
                case 'boolean':
                    $value = $value === 'true' || $value === '1';
                    break;
                case 'json':
                    $value = json_decode($value, true);
                    break;
            }
            
            $result[$setting['category']][$setting['setting_key']] = [
                'value' => $value,
                'description' => $setting['description'],
                'type' => $setting['setting_type']
            ];
        }
        
        return $result;
    }
    
    /**
     * Save AI global setting
     */
    public function saveAIGlobalSetting($key, $value, $type = 'text', $category = 'general', $description = null) {
        // Convert value based on type
        if ($type === 'boolean') {
            $value = $value ? 'true' : 'false';
        } elseif ($type === 'json' && is_array($value)) {
            $value = json_encode($value);
        }
        
        // Use INSERT ... ON DUPLICATE KEY UPDATE
        return $this->db->executeQuery("
            INSERT INTO ai_global_settings 
            (setting_key, setting_value, setting_type, category, description)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            setting_value = VALUES(setting_value),
            setting_type = VALUES(setting_type),
            category = VALUES(category),
            description = VALUES(description),
            updated_at = NOW()
        ", [$key, $value, $type, $category, $description]);
    }
    
    /**
     * Get merged configuration for a product/subproduct
     * This handles the inheritance chain: Global → Product → Subproduct
     */
    public function getMergedConfiguration($productId = null, $subproductId = null) {
        $config = [
            'ai_settings' => $this->getAIGlobalSettings(),
            'sections' => $this->getReportSections(),
            'product_config' => null,
            'subproduct_config' => null
        ];
        
        if ($productId) {
            $product = $this->db->fetchOne("
                SELECT * FROM products WHERE id = ?
            ", [$productId]);
            
            if ($product) {
                $product['platforms'] = json_decode($product['platforms'] ?? '[]', true);
                $product['default_sections'] = json_decode($product['default_sections'] ?? '[]', true);
                $product['section_overrides'] = json_decode($product['section_overrides'] ?? '{}', true);
                $config['product_config'] = $product;
                
                // Get product-specific section overrides
                $config['sections'] = $this->getProductSections($productId);
            }
        }
        
        if ($subproductId) {
            $subproduct = $this->db->fetchOne("
                SELECT * FROM subproducts WHERE id = ?
            ", [$subproductId]);
            
            if ($subproduct) {
                $subproduct['platforms'] = json_decode($subproduct['platforms'] ?? '[]', true);
                $subproduct['default_sections'] = json_decode($subproduct['default_sections'] ?? '[]', true);
                $subproduct['section_overrides'] = json_decode($subproduct['section_overrides'] ?? '{}', true);
                
                // Merge with product config if inherit_from_product is true
                if ($subproduct['inherit_from_product'] && $config['product_config']) {
                    // Merge AI guidelines
                    if (empty($subproduct['ai_guidelines'])) {
                        $subproduct['ai_guidelines'] = $config['product_config']['ai_guidelines'];
                    } else {
                        $subproduct['ai_guidelines'] = $config['product_config']['ai_guidelines'] . "\n\n" . $subproduct['ai_guidelines'];
                    }
                    
                    // Merge platforms
                    if (empty($subproduct['platforms'])) {
                        $subproduct['platforms'] = $config['product_config']['platforms'];
                    }
                }
                
                $config['subproduct_config'] = $subproduct;
                
                // Get subproduct-specific section overrides
                $config['sections'] = $this->getSubproductSections($subproductId);
            }
        }
        
        return $config;
    }
    
    /**
     * Get subproduct-specific section overrides
     */
    public function getSubproductSections($subproductId) {
        return $this->db->fetchAll("
            SELECT rs.*, srs.is_enabled as override_enabled, 
                   srs.custom_instructions, srs.custom_data_sources,
                   srs.custom_min_length, srs.custom_max_length,
                   srs.display_order as override_order
            FROM report_sections rs
            LEFT JOIN subproduct_report_sections srs 
                ON rs.id = srs.section_id AND srs.subproduct_id = ?
            ORDER BY COALESCE(srs.display_order, rs.display_order)
        ", [$subproductId]);
    }
    
    /**
     * Create AI test configuration
     */
    public function createTestConfig($data) {
        return $this->db->insert("
            INSERT INTO ai_test_configs 
            (config_name, test_scenario, product_id, subproduct_id, test_data,
             ai_model, temperature, tone, custom_instructions, enabled_sections)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ", [
            $data['config_name'],
            $data['test_scenario'] ?? null,
            $data['product_id'] ?? null,
            $data['subproduct_id'] ?? null,
            json_encode($data['test_data'] ?? []),
            $data['ai_model'] ?? 'claude-sonnet-4-20250514',
            $data['temperature'] ?? 0.7,
            $data['tone'] ?? 'professional',
            $data['custom_instructions'] ?? null,
            json_encode($data['enabled_sections'] ?? [])
        ]);
    }
    
    /**
     * Get test configurations
     */
    public function getTestConfigs($productId = null, $subproductId = null) {
        $sql = "SELECT * FROM ai_test_configs WHERE 1=1";
        $params = [];
        
        if ($productId) {
            $sql .= " AND product_id = ?";
            $params[] = $productId;
        }
        
        if ($subproductId) {
            $sql .= " AND subproduct_id = ?";
            $params[] = $subproductId;
        }
        
        $sql .= " ORDER BY created_at DESC";
        
        $configs = $this->db->fetchAll($sql, $params);
        
        // Decode JSON fields
        foreach ($configs as &$config) {
            $config['test_data'] = json_decode($config['test_data'] ?? '{}', true);
            $config['enabled_sections'] = json_decode($config['enabled_sections'] ?? '[]', true);
            $config['last_test_result'] = json_decode($config['last_test_result'] ?? 'null', true);
        }
        
        return $configs;
    }
    
    /**
     * Run AI test with configuration
     */
    public function runAITest($configId) {
        $config = $this->db->fetchOne("
            SELECT * FROM ai_test_configs WHERE id = ?
        ", [$configId]);
        
        if (!$config) {
            throw new Exception("Test configuration not found");
        }
        
        // Decode test data
        $testData = json_decode($config['test_data'], true);
        
        // Get merged configuration
        $mergedConfig = $this->getMergedConfiguration(
            $config['product_id'],
            $config['subproduct_id']
        );
        
        // Build the test prompt based on configuration
        $testPrompt = $this->buildTestPrompt($config, $mergedConfig, $testData);
        
        // Here you would call your AI API with the test prompt
        // For now, return a mock response
        $testResult = [
            'prompt' => $testPrompt,
            'configuration' => $mergedConfig,
            'test_data' => $testData,
            'timestamp' => date('Y-m-d H:i:s'),
            'model' => $config['ai_model'],
            'temperature' => $config['temperature'],
            'tone' => $config['tone']
        ];
        
        // Save test result
        $this->db->update("
            UPDATE ai_test_configs 
            SET last_test_result = ?, last_test_at = NOW()
            WHERE id = ?
        ", [json_encode($testResult), $configId]);
        
        return $testResult;
    }
    
    /**
     * Build test prompt from configuration
     */
    private function buildTestPrompt($config, $mergedConfig, $testData) {
        $prompt = "";
        
        // Add global AI settings
        if (isset($mergedConfig['ai_settings']['prompts']['master_analysis_prompt'])) {
            $prompt .= $mergedConfig['ai_settings']['prompts']['master_analysis_prompt']['value'] . "\n\n";
        }
        
        // Add product/subproduct guidelines
        if ($mergedConfig['product_config']) {
            $prompt .= "Product Context: " . $mergedConfig['product_config']['ai_guidelines'] . "\n\n";
        }
        
        if ($mergedConfig['subproduct_config']) {
            $prompt .= "Subproduct Context: " . $mergedConfig['subproduct_config']['ai_guidelines'] . "\n\n";
        }
        
        // Add custom instructions
        if ($config['custom_instructions']) {
            $prompt .= "Custom Instructions: " . $config['custom_instructions'] . "\n\n";
        }
        
        // Add test data context
        $prompt .= "Test Data:\n" . json_encode($testData, JSON_PRETTY_PRINT) . "\n\n";
        
        // Add section requirements
        $enabledSections = json_decode($config['enabled_sections'] ?? '[]', true);
        if (!empty($enabledSections)) {
            $prompt .= "Generate analysis for the following sections:\n";
            foreach ($mergedConfig['sections'] as $section) {
                if (in_array($section['section_key'], $enabledSections)) {
                    $prompt .= "- " . $section['section_name'] . ": " . $section['default_instructions'] . "\n";
                }
            }
        }
        
        return $prompt;
    }
}