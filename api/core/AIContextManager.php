<?php
/**
 * AI Context Management System
 * Handles dynamic schema loading, context inheritance, and intelligent filtering
 */

require_once 'DynamicSchemaLoader.php';
require_once 'ContextInheritanceManager.php';

class AIContextManager {
    private $schemaLoader;
    private $inheritanceManager;
    private $database;
    private $cacheManager;
    
    public function __construct($database = null) {
        $this->database = $database ?: new Database();
        $this->schemaLoader = new DynamicSchemaLoader($this->database);
        $this->inheritanceManager = new ContextInheritanceManager();
        $this->cacheManager = new PerformanceCacheManager();
    }
    
    /**
     * Build enriched context for AI analysis
     */
    public function buildEnrichedContext($campaignData, $detectedTactics, $companyInfo) {
        $enrichedContext = [
            'campaign_overview' => $this->buildCampaignOverview($campaignData),
            'company_context' => $this->buildCompanyContext($companyInfo),
            'tactics' => [],
            'global_benchmarks' => $this->getGlobalBenchmarks(),
            'analysis_guidelines' => $this->getGlobalAnalysisGuidelines()
        ];
        
        foreach ($detectedTactics as $tactic) {
            $tacticContext = $this->buildTacticContext($tactic, $campaignData);
            $enrichedContext['tactics'][$tactic['slug']] = $tacticContext;
        }
        
        // Cache the context for performance
        $this->cacheEnrichedContext($campaignData['order_id'] ?? 'unknown', $enrichedContext);
        
        return $enrichedContext;
    }
    
    /**
     * Build context for a specific tactic
     */
    private function buildTacticContext($tactic, $campaignData) {
        // Get schema context for this specific tactic
        $tacticSchema = $this->schemaLoader->getSchemaForTactic($tactic['data_value']);
        
        if (!$tacticSchema) {
            error_log("No schema found for tactic: " . $tactic['data_value']);
            return $this->buildFallbackTacticContext($tactic);
        }
        
        // Build inherited context
        $inheritedContext = $this->inheritanceManager->buildInheritedContext($tacticSchema);
        
        // Add tactic-specific data
        $tacticContext = array_merge($inheritedContext, [
            'tactic_info' => [
                'name' => $tactic['name'],
                'platform' => $tactic['platform'],
                'data_value' => $tactic['data_value'],
                'status' => $tactic['status'] ?? 'active'
            ],
            'performance_data' => $this->extractTacticPerformanceData($tactic, $campaignData),
            'file_expectations' => $this->buildFileExpectations($tacticSchema),
            'analysis_prompt_additions' => $this->buildAnalysisPromptAdditions($tacticSchema)
        ]);
        
        return $tacticContext;
    }
    
    /**
     * Build campaign overview context
     */
    private function buildCampaignOverview($campaignData) {
        return [
            'campaign_name' => $campaignData['campaignName'] ?? 'Unknown Campaign',
            'order_id' => $campaignData['order_id'] ?? null,
            'line_items_count' => count($campaignData['lineItems'] ?? []),
            'total_tactics' => $this->countUniqueTactics($campaignData),
            'campaign_objective' => $this->extractCampaignObjective($campaignData),
            'date_range' => $this->extractDateRange($campaignData),
            'platforms' => $this->extractPlatforms($campaignData)
        ];
    }
    
    /**
     * Build company context
     */
    private function buildCompanyContext($companyInfo) {
        return [
            'company_name' => $companyInfo['name'] ?? 'Unknown Company',
            'industry' => $companyInfo['industry'] ?? 'General',
            'company_size' => $companyInfo['size'] ?? 'Medium',
            'marketing_goals' => $companyInfo['goals'] ?? 'Brand Awareness',
            'budget_tier' => $this->estimateBudgetTier($companyInfo),
            'target_audience' => $companyInfo['target_audience'] ?? 'General Consumer'
        ];
    }
    
    /**
     * Extract performance data for a specific tactic
     */
    private function extractTacticPerformanceData($tactic, $campaignData) {
        $performanceData = [];
        
        // Find matching line items for this tactic
        $lineItems = $campaignData['lineItems'] ?? [];
        foreach ($lineItems as $lineItem) {
            if ($this->isLineItemForTactic($lineItem, $tactic)) {
                $performanceData[] = [
                    'line_item_name' => $lineItem['name'] ?? 'Unnamed',
                    'status' => $lineItem['status'] ?? 'unknown',
                    'company_name' => $lineItem['companyName'] ?? 'Unknown',
                    'raw_data' => $lineItem
                ];
            }
        }
        
        return $performanceData;
    }
    
    /**
     * Build file expectations based on schema
     */
    private function buildFileExpectations($tacticSchema) {
        $expectations = [];
        
        foreach ($tacticSchema as $table) {
            $expectations[] = [
                'table_name' => $table['table_name'] ?? 'Unknown Table',
                'expected_filename' => $table['file_name'] ?? 'unknown',
                'required_headers' => json_decode($table['headers'] ?? '[]', true),
                'optional_headers' => json_decode($table['optional_headers'] ?? '[]', true),
                'validation_rules' => json_decode($table['validator_config'] ?? '[]', true)
            ];
        }
        
        return $expectations;
    }
    
    /**
     * Build analysis prompt additions from schema
     */
    private function buildAnalysisPromptAdditions($tacticSchema) {
        $additions = [];
        
        foreach ($tacticSchema as $row) {
            if (!empty($row['analysis_guidelines'])) {
                $additions['guidelines'][] = $row['analysis_guidelines'];
            }
            
            if (!empty($row['performance_kpis'])) {
                $kpis = json_decode($row['performance_kpis'], true);
                $additions['kpis'] = array_merge($additions['kpis'] ?? [], $kpis);
            }
            
            if (!empty($row['ai_guidelines'])) {
                $additions['ai_guidelines'][] = $row['ai_guidelines'];
            }
        }
        
        return $additions;
    }
    
    /**
     * Build fallback context when schema is not found
     */
    private function buildFallbackTacticContext($tactic) {
        return [
            'tactic_info' => [
                'name' => $tactic['name'],
                'platform' => $tactic['platform'],
                'data_value' => $tactic['data_value'],
                'status' => $tactic['status'] ?? 'active'
            ],
            'fallback_mode' => true,
            'analysis_guidelines' => 'Analyze this tactic using general digital marketing best practices.',
            'performance_kpis' => ['impressions', 'clicks', 'conversions', 'cost'],
            'file_expectations' => [],
            'benchmarks' => $this->getFallbackBenchmarks()
        ];
    }
    
    /**
     * Get global analysis guidelines
     */
    private function getGlobalAnalysisGuidelines() {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT content, variables 
                FROM ai_prompt_templates 
                WHERE template_type = 'base_role' AND is_active = 1 
                ORDER BY priority DESC 
                LIMIT 1
            ");
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result) {
                return [
                    'base_role' => $result['content'],
                    'variables' => json_decode($result['variables'] ?? '{}', true)
                ];
            }
        } catch (Exception $e) {
            error_log("Failed to load global analysis guidelines: " . $e->getMessage());
        }
        
        return $this->getFallbackGlobalGuidelines();
    }
    
    /**
     * Get global benchmarks
     */
    private function getGlobalBenchmarks() {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT product_name, metric_name, goal_value, warning_threshold
                FROM benchmarks b
                JOIN products p ON b.product_id = p.id
                WHERE b.is_active = 1
            ");
            $stmt->execute();
            
            $benchmarks = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $benchmarks[$row['product_name']][$row['metric_name']] = [
                    'goal' => $row['goal_value'],
                    'warning' => $row['warning_threshold']
                ];
            }
            
            return $benchmarks;
        } catch (Exception $e) {
            error_log("Failed to load global benchmarks: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Cache enriched context for performance
     */
    private function cacheEnrichedContext($campaignId, $context) {
        $cacheKey = "enriched_context_{$campaignId}";
        $this->cacheManager->setContext($cacheKey, $context, 3600); // 1 hour cache
    }
    
    /**
     * Get cached enriched context
     */
    public function getCachedEnrichedContext($campaignId) {
        $cacheKey = "enriched_context_{$campaignId}";
        return $this->cacheManager->getContext($cacheKey);
    }
    
    // Helper methods
    private function countUniqueTactics($campaignData) {
        $tactics = [];
        foreach ($campaignData['lineItems'] ?? [] as $lineItem) {
            $tactic = $this->extractTacticFromLineItem($lineItem);
            if ($tactic) {
                $tactics[$tactic] = true;
            }
        }
        return count($tactics);
    }
    
    private function extractCampaignObjective($campaignData) {
        // Try to infer objective from line items
        $lineItems = $campaignData['lineItems'] ?? [];
        if (!empty($lineItems)) {
            $firstItem = $lineItems[0];
            return $firstItem['status'] ?? 'Brand Awareness';
        }
        return 'General Marketing';
    }
    
    private function extractDateRange($campaignData) {
        // Extract date range from campaign data
        // This would need to be implemented based on actual Lumina data structure
        return [
            'start' => date('Y-m-d', strtotime('-30 days')),
            'end' => date('Y-m-d')
        ];
    }
    
    private function extractPlatforms($campaignData) {
        $platforms = [];
        foreach ($campaignData['lineItems'] ?? [] as $lineItem) {
            // Extract platform information from line item
            $platform = $this->inferPlatformFromLineItem($lineItem);
            if ($platform) {
                $platforms[$platform] = true;
            }
        }
        return array_keys($platforms);
    }
    
    private function isLineItemForTactic($lineItem, $tactic) {
        // Logic to determine if a line item belongs to a specific tactic
        // This would need to match the tactic detection logic
        return true; // Simplified for now
    }
    
    private function extractTacticFromLineItem($lineItem) {
        // Extract tactic identifier from line item
        // This would integrate with the existing tactic detection system
        return 'unknown';
    }
    
    private function inferPlatformFromLineItem($lineItem) {
        // Infer platform from line item data
        return 'Unknown Platform';
    }
    
    private function estimateBudgetTier($companyInfo) {
        // Estimate budget tier based on company info
        $size = $companyInfo['size'] ?? 'medium';
        $mapping = [
            'small' => 'low',
            'medium' => 'standard', 
            'large' => 'high',
            'enterprise' => 'premium'
        ];
        return $mapping[strtolower($size)] ?? 'standard';
    }
    
    private function getFallbackBenchmarks() {
        return [
            'ctr' => ['goal' => 2.0, 'warning' => 1.0],
            'cpm' => ['goal' => 5.0, 'warning' => 10.0],
            'conversion_rate' => ['goal' => 3.0, 'warning' => 1.5]
        ];
    }
    
    private function getFallbackGlobalGuidelines() {
        return [
            'base_role' => 'You are a digital marketing analyst. Provide clear, actionable insights based on the campaign data.',
            'variables' => []
        ];
    }
}

/**
 * Performance Cache Manager for Context System
 */
class PerformanceCacheManager {
    private $cache;
    
    public function __construct() {
        $this->cache = []; // In-memory cache for now
    }
    
    public function setContext($key, $context, $ttl = 3600) {
        $this->cache[$key] = [
            'data' => $context,
            'expires' => time() + $ttl
        ];
    }
    
    public function getContext($key) {
        if (isset($this->cache[$key])) {
            if ($this->cache[$key]['expires'] > time()) {
                return $this->cache[$key]['data'];
            } else {
                unset($this->cache[$key]);
            }
        }
        return null;
    }
}
?>