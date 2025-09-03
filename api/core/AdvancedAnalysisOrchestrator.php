<?php
/**
 * Advanced Analysis Orchestrator
 * Central coordinator for the enhanced AI analysis pipeline
 */

require_once __DIR__ . '/AIContextManager.php';
require_once __DIR__ . '/AdvancedPromptBuilder.php';
require_once __DIR__ . '/EnhancedAIModelsConfig.php';
require_once dirname(__DIR__) . '/tactics.php';

class AdvancedAnalysisOrchestrator {
    private $database;
    private $contextManager;
    private $promptBuilder;
    private $modelsConfig;
    private $tacticDetector;
    
    public function __construct($database = null) {
        $this->database = $database ?: new Database();
        $this->contextManager = new AIContextManager($this->database);
        $this->promptBuilder = new AdvancedPromptBuilder($this->database);
        $this->modelsConfig = new EnhancedAIModelsConfig($this->database);
        $this->tacticDetector = new TacticDetector();
    }
    
    /**
     * Execute complete AI analysis pipeline
     */
    public function executeAnalysis($analysisId, $requestData) {
        $startTime = microtime(true);
        
        try {
            // Step 1: Process and validate campaign data
            $this->updateAnalysisStatus($analysisId, 'processing', 'data_processing');
            $processedCampaign = $this->processCampaignData($requestData['campaignData']);
            
            // Step 2: Schema-aware tactic detection
            $this->updateAnalysisStatus($analysisId, 'processing', 'tactic_detection');
            $enrichedTactics = $this->detectAndEnrichTactics($processedCampaign);
            
            // Step 3: Build enriched AI context
            $this->updateAnalysisStatus($analysisId, 'processing', 'context_building');
            $aiContext = $this->buildAIContext($enrichedTactics, $requestData['companyInfo'], $processedCampaign);
            
            // Step 4: Intelligent model selection
            $this->updateAnalysisStatus($analysisId, 'processing', 'model_selection');
            $selectedModel = $this->selectOptimalModel($aiContext, $requestData['requirements'] ?? []);
            
            // Step 5: Advanced prompt construction
            $this->updateAnalysisStatus($analysisId, 'processing', 'prompt_construction');
            $optimizedPrompt = $this->buildOptimizedPrompt($aiContext, $requestData['aiConfig']);
            
            // Step 6: Execute AI analysis
            $this->updateAnalysisStatus($analysisId, 'processing', 'ai_analysis');
            $analysisResult = $this->executeAIAnalysis($selectedModel, $optimizedPrompt, $requestData['aiConfig']);
            
            // Step 7: Post-process and validate result
            $this->updateAnalysisStatus($analysisId, 'processing', 'post_processing');
            $validatedResult = $this->validateAndEnrichResult($analysisResult, $aiContext, $analysisId);
            
            // Step 8: Track performance metrics
            $processingTime = microtime(true) - $startTime;
            $this->trackAnalysisPerformance($analysisId, $selectedModel, $optimizedPrompt, $validatedResult, $processingTime);
            
            // Step 9: Update final status
            $this->updateAnalysisStatus($analysisId, 'completed', 'completed');
            
            return [
                'analysis_id' => $analysisId,
                'status' => 'completed',
                'analysis' => $validatedResult,
                'metadata' => [
                    'model_used' => $selectedModel['primary'],
                    'processing_time' => round($processingTime, 2),
                    'context_size' => $optimizedPrompt['metadata']['context_size'] ?? 0,
                    'tactics_analyzed' => count($enrichedTactics),
                    'quality_score' => $this->calculateQualityScore($validatedResult),
                    'schema_version' => date('Y.m.d'),
                    'timestamp' => date('c')
                ]
            ];
            
        } catch (Exception $e) {
            $this->updateAnalysisStatus($analysisId, 'failed', 'error');
            $this->logAnalysisError($analysisId, $e);
            throw $e;
        }
    }
    
    /**
     * Execute streaming analysis with real-time updates
     */
    public function executeStreamingAnalysis($analysisId, $requestData) {
        $this->sendStreamingUpdate($analysisId, 'started', 'Analysis pipeline initiated');
        
        try {
            // Process campaign data with streaming updates
            $this->sendStreamingUpdate($analysisId, 'processing', 'Processing campaign data...');
            $processedCampaign = $this->processCampaignData($requestData['campaignData']);
            $this->sendStreamingUpdate($analysisId, 'processing', 'Campaign data processed', ['campaign_metrics' => $this->getCampaignSummary($processedCampaign)]);
            
            // Detect tactics with progress updates
            $this->sendStreamingUpdate($analysisId, 'processing', 'Detecting tactics...');
            $enrichedTactics = $this->detectAndEnrichTactics($processedCampaign);
            $this->sendStreamingUpdate($analysisId, 'processing', 'Tactics detected', ['tactics_found' => array_keys($enrichedTactics)]);
            
            // Build context with streaming feedback
            $this->sendStreamingUpdate($analysisId, 'processing', 'Building analysis context...');
            $aiContext = $this->buildAIContext($enrichedTactics, $requestData['companyInfo'], $processedCampaign);
            $this->sendStreamingUpdate($analysisId, 'processing', 'Context assembled', ['context_size' => strlen(json_encode($aiContext))]);
            
            // Model selection feedback
            $this->sendStreamingUpdate($analysisId, 'processing', 'Selecting optimal AI model...');
            $selectedModel = $this->selectOptimalModel($aiContext, $requestData['requirements'] ?? []);
            $this->sendStreamingUpdate($analysisId, 'processing', 'Model selected', ['model' => $selectedModel['primary']]);
            
            // Prompt construction with details
            $this->sendStreamingUpdate($analysisId, 'processing', 'Constructing analysis prompt...');
            $optimizedPrompt = $this->buildOptimizedPrompt($aiContext, $requestData['aiConfig']);
            $this->sendStreamingUpdate($analysisId, 'processing', 'Prompt optimized', ['prompt_size' => strlen($optimizedPrompt['prompt'])]);
            
            // AI analysis with progress
            $this->sendStreamingUpdate($analysisId, 'processing', 'Executing AI analysis...', ['estimated_time' => '30-60 seconds']);
            $analysisResult = $this->executeAIAnalysis($selectedModel, $optimizedPrompt, $requestData['aiConfig']);
            $this->sendStreamingUpdate($analysisId, 'processing', 'AI analysis completed');
            
            // Final processing
            $this->sendStreamingUpdate($analysisId, 'processing', 'Validating and finalizing results...');
            $validatedResult = $this->validateAndEnrichResult($analysisResult, $aiContext, $analysisId);
            
            // Send final result
            $this->sendStreamingUpdate($analysisId, 'completed', 'Analysis completed successfully', [
                'analysis' => $validatedResult,
                'metadata' => [
                    'model_used' => $selectedModel['primary'],
                    'tactics_analyzed' => count($enrichedTactics),
                    'schema_version' => date('Y.m.d')
                ]
            ]);
            
        } catch (Exception $e) {
            $this->sendStreamingUpdate($analysisId, 'error', $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Process and validate campaign data
     */
    public function processCampaignData($campaignData) {
        // Validate required fields
        if (empty($campaignData['lineItems'])) {
            throw new Exception('Campaign data must include lineItems', 400);
        }
        
        // Normalize campaign data structure
        $processed = [
            'campaignName' => $campaignData['campaignName'] ?? 'Unnamed Campaign',
            'order_id' => $this->extractOrderId($campaignData),
            'lineItems' => $this->normalizeLineItems($campaignData['lineItems']),
            'metadata' => [
                'processed_at' => date('c'),
                'line_items_count' => count($campaignData['lineItems']),
                'data_source' => $campaignData['source'] ?? 'lumina'
            ]
        ];
        
        return $processed;
    }
    
    /**
     * Detect and enrich tactics using schema intelligence
     */
    public function detectAndEnrichTactics($processedCampaign) {
        // Use existing tactic detection logic but enhance with schema context
        $detectedTactics = $this->tacticDetector->detectTactics($processedCampaign);
        
        $enrichedTactics = [];
        foreach ($detectedTactics as $tactic) {
            // Get schema context for this tactic
            $schemaContext = $this->contextManager->buildTacticContext($tactic, $processedCampaign);
            
            $enrichedTactics[$tactic['slug']] = array_merge($tactic, [
                'schema_context' => $schemaContext,
                'enrichment_timestamp' => date('c')
            ]);
        }
        
        return $enrichedTactics;
    }
    
    /**
     * Build comprehensive AI context
     */
    public function buildAIContext($enrichedTactics, $companyInfo, $campaignData) {
        return $this->contextManager->buildEnrichedContext($campaignData, $enrichedTactics, $companyInfo);
    }
    
    /**
     * Select optimal AI model for analysis
     */
    public function selectOptimalModel($aiContext, $requirements = []) {
        $contextSize = $this->estimateContextSize($aiContext);
        $requirements['context_size'] = $contextSize;
        $requirements['analysis_type'] = $requirements['analysis_type'] ?? 'comprehensive';
        
        return $this->modelsConfig->selectOptimalModel($aiContext, $requirements);
    }
    
    /**
     * Build optimized prompt for AI analysis
     */
    public function buildOptimizedPrompt($aiContext, $aiConfig) {
        return $this->promptBuilder->buildAnalysisPrompt($aiContext['campaign_overview'], $aiContext, $aiConfig);
    }
    
    /**
     * Execute AI analysis with the selected model
     */
    public function executeAIAnalysis($selectedModel, $optimizedPrompt, $aiConfig) {
        $modelConfig = $this->modelsConfig->getModelConfig($selectedModel['primary']);
        
        if (!$modelConfig) {
            throw new Exception('Model configuration not found', 500);
        }
        
        // Execute based on provider
        switch ($modelConfig['provider']) {
            case 'anthropic':
                return $this->executeClaudeAnalysis($modelConfig, $optimizedPrompt, $aiConfig);
            case 'google':
                return $this->executeGeminiAnalysis($modelConfig, $optimizedPrompt, $aiConfig);
            case 'openai':
                return $this->executeGPTAnalysis($modelConfig, $optimizedPrompt, $aiConfig);
            default:
                throw new Exception('Unsupported AI provider', 500);
        }
    }
    
    /**
     * Execute Claude analysis
     */
    private function executeClaudeAnalysis($modelConfig, $optimizedPrompt, $aiConfig) {
        $apiKey = $modelConfig['api_key'];
        if (empty($apiKey)) {
            throw new Exception('Anthropic API key not configured', 500);
        }
        
        $data = [
            'model' => array_keys($modelConfig['models'])[0], // Get first model
            'max_tokens' => 4000,
            'temperature' => $aiConfig['temperature'] ?? 0.7,
            'messages' => [
                [
                    'role' => 'user',
                    'content' => $optimizedPrompt['prompt']
                ]
            ]
        ];
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => 'https://api.anthropic.com/v1/messages',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'x-api-key: ' . $apiKey,
                'anthropic-version: 2023-06-01'
            ],
            CURLOPT_TIMEOUT => 120
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception('Claude API request failed: ' . $response, $httpCode);
        }
        
        $result = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON response from Claude API', 500);
        }
        
        return [
            'content' => $result['content'][0]['text'] ?? '',
            'usage' => $result['usage'] ?? [],
            'model' => $result['model'] ?? '',
            'provider' => 'anthropic'
        ];
    }
    
    /**
     * Validate and enrich analysis result
     */
    public function validateAndEnrichResult($analysisResult, $aiContext, $analysisId) {
        // Basic validation
        if (empty($analysisResult['content'])) {
            throw new Exception('AI analysis returned empty content', 500);
        }
        
        // Structure the analysis content
        $structuredResult = $this->structureAnalysisContent($analysisResult['content']);
        
        // Add context metadata
        $structuredResult['metadata'] = [
            'analysis_id' => $analysisId,
            'generated_at' => date('c'),
            'model_info' => [
                'provider' => $analysisResult['provider'],
                'model' => $analysisResult['model'],
                'usage' => $analysisResult['usage'] ?? []
            ],
            'context_summary' => [
                'tactics_analyzed' => count($aiContext['tactics'] ?? []),
                'benchmarks_applied' => count($aiContext['global_benchmarks'] ?? []),
                'company_context' => !empty($aiContext['company_context']['company_name'])
            ]
        ];
        
        return $structuredResult;
    }
    
    // Helper methods
    private function updateAnalysisStatus($analysisId, $status, $stage) {
        try {
            $stmt = $this->database->getConnection()->prepare("
                INSERT INTO analysis_performance (analysis_id, status, created_at) 
                VALUES (?, ?, NOW()) 
                ON DUPLICATE KEY UPDATE status = ?, updated_at = NOW()
            ");
            $stmt->execute([$analysisId, $status, $status]);
        } catch (Exception $e) {
            error_log("Failed to update analysis status: " . $e->getMessage());
        }
    }
    
    private function sendStreamingUpdate($analysisId, $status, $message, $data = null) {
        $update = [
            'id' => $analysisId,
            'status' => $status,
            'message' => $message,
            'timestamp' => date('c')
        ];
        
        if ($data !== null) {
            $update['data'] = $data;
        }
        
        echo "data: " . json_encode($update) . "\n\n";
        ob_flush();
        flush();
    }
    
    private function extractOrderId($campaignData) {
        // Extract order ID from various possible locations
        return $campaignData['order_id'] ?? $campaignData['orderId'] ?? $campaignData['id'] ?? 'unknown';
    }
    
    private function normalizeLineItems($lineItems) {
        $normalized = [];
        foreach ($lineItems as $item) {
            $normalized[] = [
                'name' => $item['name'] ?? 'Unnamed Item',
                'status' => $item['status'] ?? 'unknown',
                'companyName' => $item['companyName'] ?? 'Unknown Company',
                'raw_data' => $item
            ];
        }
        return $normalized;
    }
    
    private function estimateContextSize($context) {
        return strlen(json_encode($context)) * 0.75; // Rough token estimation
    }
    
    private function getCampaignSummary($campaign) {
        return [
            'name' => $campaign['campaignName'],
            'line_items' => count($campaign['lineItems']),
            'order_id' => $campaign['order_id']
        ];
    }
    
    private function calculateQualityScore($result) {
        // Simple quality scoring based on content length and structure
        $content = $result['content'] ?? '';
        $score = min(100, strlen($content) / 50); // Basic scoring
        return round($score, 2);
    }
    
    private function trackAnalysisPerformance($analysisId, $selectedModel, $prompt, $result, $processingTime) {
        try {
            $this->modelsConfig->trackModelPerformance($selectedModel['primary'], [
                'analysis_id' => $analysisId,
                'temperature' => 0.7,
                'prompt_tokens' => strlen($prompt['prompt']) / 4, // Rough estimation
                'completion_tokens' => strlen($result['content'] ?? '') / 4,
                'quality_score' => $this->calculateQualityScore($result),
                'processing_time' => $processingTime,
                'status' => 'completed'
            ]);
        } catch (Exception $e) {
            error_log("Failed to track performance: " . $e->getMessage());
        }
    }
    
    private function structureAnalysisContent($content) {
        // Basic content structuring - could be enhanced with more sophisticated parsing
        return [
            'content' => $content,
            'structured' => $this->parseStructuredContent($content)
        ];
    }
    
    private function parseStructuredContent($content) {
        // Parse content into sections - simplified implementation
        $sections = [];
        $lines = explode("\n", $content);
        $currentSection = null;
        
        foreach ($lines as $line) {
            $line = trim($line);
            if (preg_match('/^#{1,3}\s+(.+)$/', $line, $matches)) {
                $currentSection = strtolower(str_replace(' ', '_', $matches[1]));
                $sections[$currentSection] = [];
            } elseif (!empty($line) && $currentSection) {
                $sections[$currentSection][] = $line;
            }
        }
        
        return $sections;
    }
    
    private function logAnalysisError($analysisId, $error) {
        error_log("Analysis Error [{$analysisId}]: " . $error->getMessage());
        
        try {
            $stmt = $this->database->getConnection()->prepare("
                UPDATE analysis_performance 
                SET status = 'failed', error_count = error_count + 1, updated_at = NOW() 
                WHERE analysis_id = ?
            ");
            $stmt->execute([$analysisId]);
        } catch (Exception $e) {
            error_log("Failed to log analysis error: " . $e->getMessage());
        }
    }
    
    // Placeholder methods for other providers
    private function executeGeminiAnalysis($modelConfig, $optimizedPrompt, $aiConfig) {
        throw new Exception('Gemini integration not yet implemented', 501);
    }
    
    private function executeGPTAnalysis($modelConfig, $optimizedPrompt, $aiConfig) {
        throw new Exception('GPT integration not yet implemented', 501);
    }
}

/**
 * Simple Tactic Detector - integrates with existing tactics.php logic
 */
class TacticDetector {
    public function detectTactics($campaignData) {
        // Use existing tactic detection logic from tactics.php
        // This is a simplified version - would integrate with the actual tactics detection
        $tactics = [];
        
        foreach ($campaignData['lineItems'] as $index => $lineItem) {
            $tactics[] = [
                'name' => 'Detected Tactic ' . ($index + 1),
                'slug' => 'detected_tactic_' . ($index + 1),
                'platform' => 'Unknown',
                'data_value' => 'unknown',
                'status' => $lineItem['status'] ?? 'active',
                'source_line_item' => $lineItem
            ];
        }
        
        return $tactics;
    }
}
?>