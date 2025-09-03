<?php
/**
 * Enhanced AI Models Configuration System
 * Provides intelligent model selection, fallback systems, and performance tracking
 */

class EnhancedAIModelsConfig {
    private $database;
    private $models;
    private $performanceMetrics;
    private $fallbackStrategy;
    
    public function __construct($database = null) {
        $this->database = $database ?: new Database();
        $this->initializeModels();
        $this->loadPerformanceMetrics();
        $this->fallbackStrategy = ['claude', 'gemini', 'gpt'];
    }
    
    private function initializeModels() {
        $this->models = [
            'claude' => [
                'provider' => 'anthropic',
                'models' => [
                    'claude-3-5-sonnet-20241022' => [
                        'name' => 'Claude 3.5 Sonnet',
                        'max_tokens' => 8192,
                        'context_window' => 200000,
                        'cost_per_1k_input' => 0.003,
                        'cost_per_1k_output' => 0.015,
                        'strengths' => ['analysis', 'reasoning', 'structured_output'],
                        'optimal_for' => ['complex_analysis', 'detailed_reports'],
                        'priority' => 100
                    ],
                    'claude-3-haiku-20240307' => [
                        'name' => 'Claude 3 Haiku',
                        'max_tokens' => 4096,
                        'context_window' => 200000,
                        'cost_per_1k_input' => 0.00025,
                        'cost_per_1k_output' => 0.00125,
                        'strengths' => ['speed', 'efficiency', 'cost'],
                        'optimal_for' => ['quick_summaries', 'simple_analysis'],
                        'priority' => 80
                    ]
                ],
                'api_key_env' => 'ANTHROPIC_API_KEY',
                'endpoint' => 'https://api.anthropic.com/v1/messages'
            ],
            'gemini' => [
                'provider' => 'google',
                'models' => [
                    'gemini-1.5-pro-latest' => [
                        'name' => 'Gemini 1.5 Pro',
                        'max_tokens' => 8192,
                        'context_window' => 2000000,
                        'cost_per_1k_input' => 0.00125,
                        'cost_per_1k_output' => 0.00375,
                        'strengths' => ['large_context', 'multimodal', 'reasoning'],
                        'optimal_for' => ['large_datasets', 'comprehensive_analysis'],
                        'priority' => 90
                    ],
                    'gemini-1.5-flash' => [
                        'name' => 'Gemini 1.5 Flash',
                        'max_tokens' => 8192,
                        'context_window' => 1000000,
                        'cost_per_1k_input' => 0.000075,
                        'cost_per_1k_output' => 0.0003,
                        'strengths' => ['speed', 'cost', 'efficiency'],
                        'optimal_for' => ['quick_insights', 'batch_processing'],
                        'priority' => 70
                    ]
                ],
                'api_key_env' => 'GEMINI_API_KEY',
                'endpoint' => 'https://generativelanguage.googleapis.com/v1beta/models'
            ],
            'gpt' => [
                'provider' => 'openai',
                'models' => [
                    'gpt-4o-2024-08-06' => [
                        'name' => 'GPT-4o',
                        'max_tokens' => 16384,
                        'context_window' => 128000,
                        'cost_per_1k_input' => 0.0025,
                        'cost_per_1k_output' => 0.01,
                        'strengths' => ['versatility', 'reasoning', 'structured_output'],
                        'optimal_for' => ['balanced_analysis', 'creative_insights'],
                        'priority' => 85
                    ],
                    'gpt-4o-mini' => [
                        'name' => 'GPT-4o Mini',
                        'max_tokens' => 16384,
                        'context_window' => 128000,
                        'cost_per_1k_input' => 0.00015,
                        'cost_per_1k_output' => 0.0006,
                        'strengths' => ['cost', 'speed', 'efficiency'],
                        'optimal_for' => ['quick_analysis', 'cost_sensitive'],
                        'priority' => 75
                    ]
                ],
                'api_key_env' => 'OPENAI_API_KEY',
                'endpoint' => 'https://api.openai.com/v1/chat/completions'
            ]
        ];
    }
    
    private function loadPerformanceMetrics() {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT model_used, 
                       AVG(analysis_quality_score) as avg_quality,
                       AVG(processing_time_seconds) as avg_time,
                       COUNT(*) as usage_count,
                       (SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*)) as success_rate
                FROM analysis_performance 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY model_used
            ");
            $stmt->execute();
            
            $this->performanceMetrics = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->performanceMetrics[$row['model_used']] = $row;
            }
        } catch (Exception $e) {
            error_log("Failed to load performance metrics: " . $e->getMessage());
            $this->performanceMetrics = [];
        }
    }
    
    public function selectOptimalModel($context, $requirements = []) {
        $analysisType = $requirements['analysis_type'] ?? 'comprehensive';
        $budget = $requirements['budget'] ?? 'standard';
        $priority = $requirements['priority'] ?? 'balanced';
        $contextSize = $this->estimateContextSize($context);
        
        $scored_models = [];
        
        foreach ($this->models as $provider => $config) {
            foreach ($config['models'] as $modelId => $modelInfo) {
                $score = $this->calculateModelScore($modelId, $modelInfo, [
                    'context_size' => $contextSize,
                    'analysis_type' => $analysisType,
                    'budget' => $budget,
                    'priority' => $priority
                ]);
                
                $scored_models[$modelId] = [
                    'provider' => $provider,
                    'model_info' => $modelInfo,
                    'score' => $score,
                    'config' => $config
                ];
            }
        }
        
        // Sort by score descending
        uasort($scored_models, function($a, $b) {
            return $b['score'] <=> $a['score'];
        });
        
        // Return top choice with fallback options
        $models = array_keys($scored_models);
        return [
            'primary' => $models[0],
            'fallbacks' => array_slice($models, 1, 2),
            'config' => $scored_models[$models[0]]
        ];
    }
    
    private function calculateModelScore($modelId, $modelInfo, $requirements) {
        $score = $modelInfo['priority']; // Base priority
        
        // Performance history boost
        if (isset($this->performanceMetrics[$modelId])) {
            $metrics = $this->performanceMetrics[$modelId];
            $score += ($metrics['avg_quality'] * 20); // Quality bonus
            $score += ($metrics['success_rate'] * 30); // Reliability bonus
            $score -= ($metrics['avg_time'] * 2); // Speed penalty
        }
        
        // Context size compatibility
        if ($requirements['context_size'] > $modelInfo['context_window'] * 0.8) {
            $score -= 50; // Heavy penalty for near-limit context
        }
        
        // Cost optimization
        if ($requirements['budget'] === 'low') {
            $score += (1 / ($modelInfo['cost_per_1k_output'] + 0.001)) * 10;
        }
        
        // Analysis type matching
        $analysisType = $requirements['analysis_type'];
        if (in_array($analysisType, $modelInfo['optimal_for'])) {
            $score += 25;
        }
        
        // Strength matching
        $strengthBonus = [
            'comprehensive' => ['analysis', 'reasoning', 'structured_output'],
            'quick' => ['speed', 'efficiency'],
            'detailed' => ['analysis', 'large_context']
        ];
        
        if (isset($strengthBonus[$analysisType])) {
            $matches = array_intersect($strengthBonus[$analysisType], $modelInfo['strengths']);
            $score += count($matches) * 15;
        }
        
        return max(0, $score);
    }
    
    private function estimateContextSize($context) {
        $size = 0;
        if (is_string($context)) {
            $size = strlen($context) * 0.75; // Rough token estimation
        } else if (is_array($context)) {
            $size = strlen(json_encode($context)) * 0.75;
        }
        return $size;
    }
    
    public function getModelConfig($modelId) {
        foreach ($this->models as $provider => $config) {
            if (isset($config['models'][$modelId])) {
                return [
                    'provider' => $provider,
                    'model_info' => $config['models'][$modelId],
                    'api_key' => getenv($config['api_key_env']),
                    'endpoint' => $config['endpoint']
                ];
            }
        }
        return null;
    }
    
    public function trackModelPerformance($modelId, $metrics) {
        try {
            $stmt = $this->database->getConnection()->prepare("
                INSERT INTO analysis_performance 
                (analysis_id, model_used, temperature, prompt_tokens, completion_tokens, 
                 analysis_quality_score, processing_time_seconds, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $metrics['analysis_id'],
                $modelId,
                $metrics['temperature'] ?? 0.7,
                $metrics['prompt_tokens'] ?? 0,
                $metrics['completion_tokens'] ?? 0,
                $metrics['quality_score'] ?? 0.0,
                $metrics['processing_time'] ?? 0.0,
                $metrics['status'] ?? 'completed'
            ]);
        } catch (Exception $e) {
            error_log("Failed to track model performance: " . $e->getMessage());
        }
    }
    
    public function getFallbackModel($failedModelId, $context, $requirements) {
        // Remove failed model from consideration
        $availableProviders = $this->fallbackStrategy;
        $failedProvider = null;
        
        foreach ($this->models as $provider => $config) {
            if (isset($config['models'][$failedModelId])) {
                $failedProvider = $provider;
                break;
            }
        }
        
        if ($failedProvider) {
            $availableProviders = array_diff($availableProviders, [$failedProvider]);
        }
        
        // Select best model from remaining providers
        $requirements['fallback'] = true;
        return $this->selectOptimalModel($context, $requirements);
    }
    
    public function getProviderStatus() {
        $status = [];
        foreach ($this->models as $provider => $config) {
            $apiKey = getenv($config['api_key_env']);
            $status[$provider] = [
                'configured' => !empty($apiKey),
                'models_count' => count($config['models']),
                'last_used' => $this->getLastUsage($provider)
            ];
        }
        return $status;
    }
    
    private function getLastUsage($provider) {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT MAX(created_at) as last_used
                FROM analysis_performance 
                WHERE model_used LIKE ?
            ");
            $stmt->execute(["%{$provider}%"]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['last_used'];
        } catch (Exception $e) {
            return null;
        }
    }
}
?>