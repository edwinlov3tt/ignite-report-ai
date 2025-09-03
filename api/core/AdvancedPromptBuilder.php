<?php
/**
 * Advanced Prompt Builder System
 * Constructs intelligent AI prompts using schema context, templates, and dynamic content
 */

require_once 'AIContextManager.php';
require_once 'EnhancedAIModelsConfig.php';

class AdvancedPromptBuilder {
    private $contextManager;
    private $templateEngine;
    private $database;
    private $toneProfiles;
    
    public function __construct($database = null) {
        $this->database = $database ?: new Database();
        $this->contextManager = new AIContextManager($this->database);
        $this->templateEngine = new PromptTemplateEngine($this->database);
        $this->initializeToneProfiles();
    }
    
    /**
     * Build comprehensive AI analysis prompt
     */
    public function buildAnalysisPrompt($campaignData, $enrichedContext, $aiConfig) {
        // Get base role definition with tone
        $basePrompt = $this->getBaseRoleDefinition($aiConfig['tone'] ?? 'professional');
        
        // Build schema-aware context
        $schemaContext = $this->buildSchemaContext($enrichedContext);
        
        // Build dynamic benchmarking context
        $benchmarkContext = $this->buildBenchmarkContext($enrichedContext);
        
        // Build tactic-specific instructions
        $tacticInstructions = $this->buildTacticInstructions($enrichedContext);
        
        // Build company-specific context
        $companyContext = $this->buildCompanyContext($enrichedContext);
        
        // Assemble final prompt
        $finalPrompt = $this->templateEngine->render('comprehensive_analysis', [
            'base_role' => $basePrompt,
            'schema_context' => $schemaContext,
            'benchmark_context' => $benchmarkContext,
            'tactic_instructions' => $tacticInstructions,
            'company_context' => $companyContext,
            'campaign_data' => $this->formatCampaignData($campaignData),
            'analysis_requirements' => $this->buildAnalysisRequirements($aiConfig),
            'custom_instructions' => $aiConfig['customInstructions'] ?? '',
            'output_format' => $this->getOutputFormatInstructions($aiConfig)
        ]);
        
        // Validate and optimize prompt
        $optimizedPrompt = $this->optimizePrompt($finalPrompt, $aiConfig);
        
        return [
            'prompt' => $optimizedPrompt,
            'metadata' => [
                'context_size' => strlen($optimizedPrompt),
                'tactics_count' => count($enrichedContext['tactics'] ?? []),
                'template_version' => $this->templateEngine->getVersion(),
                'tone' => $aiConfig['tone'] ?? 'professional'
            ]
        ];
    }
    
    /**
     * Get base role definition with tone configuration
     */
    private function getBaseRoleDefinition($tone) {
        $toneInstructions = $this->toneProfiles[$tone] ?? $this->toneProfiles['professional'];
        
        // Get base role template from database
        $baseTemplate = $this->templateEngine->getTemplate('base_role');
        
        return $this->templateEngine->render('base_role', [
            'tone_instructions' => $toneInstructions,
            'expertise_level' => 'expert',
            'analysis_approach' => $this->getAnalysisApproach($tone)
        ]);
    }
    
    /**
     * Build schema-aware context section
     */
    private function buildSchemaContext($enrichedContext) {
        $schemaContext = [];
        
        // Product-level guidelines
        if (!empty($enrichedContext['global_benchmarks'])) {
            $schemaContext['product_expertise'] = $this->formatProductExpertise($enrichedContext);
        }
        
        // Tactic-specific context
        $tacticContext = [];
        foreach ($enrichedContext['tactics'] ?? [] as $tacticSlug => $tactic) {
            $tacticContext[] = $this->formatTacticContext($tacticSlug, $tactic);
        }
        $schemaContext['tactic_expertise'] = implode("\n\n", $tacticContext);
        
        // File expectations context
        $schemaContext['data_expectations'] = $this->formatDataExpectations($enrichedContext);
        
        return $schemaContext;
    }
    
    /**
     * Build benchmark context with intelligent interpretation
     */
    private function buildBenchmarkContext($enrichedContext) {
        $benchmarkContext = [
            'industry_standards' => [],
            'performance_thresholds' => [],
            'interpretation_guidelines' => []
        ];
        
        foreach ($enrichedContext['global_benchmarks'] ?? [] as $product => $metrics) {
            foreach ($metrics as $metric => $values) {
                $benchmarkContext['performance_thresholds'][] = [
                    'metric' => $metric,
                    'goal' => $values['goal'],
                    'warning' => $values['warning'],
                    'interpretation' => $this->generateBenchmarkInterpretation($metric, $values)
                ];
            }
        }
        
        // Add tactic-specific benchmarks
        foreach ($enrichedContext['tactics'] ?? [] as $tactic) {
            if (!empty($tactic['benchmarks'])) {
                foreach ($tactic['benchmarks'] as $metric => $benchmark) {
                    $benchmarkContext['tactic_benchmarks'][] = [
                        'tactic' => $tactic['tactic_info']['name'],
                        'metric' => $metric,
                        'benchmark' => $benchmark
                    ];
                }
            }
        }
        
        return $benchmarkContext;
    }
    
    /**
     * Build tactic-specific instructions
     */
    private function buildTacticInstructions($enrichedContext) {
        $instructions = [];
        
        foreach ($enrichedContext['tactics'] ?? [] as $tacticSlug => $tactic) {
            $tacticName = $tactic['tactic_info']['name'] ?? $tacticSlug;
            
            $instruction = [
                'tactic_name' => $tacticName,
                'primary_kpis' => $this->extractPrimaryKPIs($tactic),
                'analysis_focus' => $this->getAnalysisFocus($tactic),
                'common_issues' => $this->getCommonIssues($tactic),
                'optimization_strategies' => $this->getOptimizationStrategies($tactic),
                'file_context' => $this->buildFileContext($tactic)
            ];
            
            $instructions[] = $this->templateEngine->render('tactic_instruction', $instruction);
        }
        
        return implode("\n\n", $instructions);
    }
    
    /**
     * Build company-specific context
     */
    private function buildCompanyContext($enrichedContext) {
        $companyInfo = $enrichedContext['company_context'] ?? [];
        
        return [
            'company_profile' => $this->formatCompanyProfile($companyInfo),
            'industry_context' => $this->getIndustryContext($companyInfo['industry'] ?? 'General'),
            'business_objectives' => $this->formatBusinessObjectives($companyInfo),
            'target_audience_insights' => $this->getTargetAudienceInsights($companyInfo)
        ];
    }
    
    /**
     * Format campaign data for prompt inclusion
     */
    private function formatCampaignData($campaignData) {
        return [
            'campaign_overview' => [
                'name' => $campaignData['campaignName'] ?? 'Unnamed Campaign',
                'order_id' => $campaignData['order_id'] ?? 'Unknown',
                'line_items_count' => count($campaignData['lineItems'] ?? []),
                'date_range' => $this->extractDateRange($campaignData)
            ],
            'line_items_summary' => $this->summarizeLineItems($campaignData['lineItems'] ?? []),
            'detected_platforms' => $this->extractPlatforms($campaignData),
            'campaign_objective' => $this->inferCampaignObjective($campaignData)
        ];
    }
    
    /**
     * Build analysis requirements section
     */
    private function buildAnalysisRequirements($aiConfig) {
        $requirements = [
            'analysis_depth' => $aiConfig['analysis_depth'] ?? 'comprehensive',
            'focus_areas' => $aiConfig['focus_areas'] ?? ['performance', 'optimization', 'insights'],
            'output_sections' => [
                'executive_summary' => true,
                'performance_analysis' => true,
                'trend_analysis' => true,
                'recommendations' => true,
                'tactical_breakdowns' => true
            ],
            'critical_rules' => [
                'Never combine metrics across different tactics',
                'Always reference specific KPIs and benchmarks',
                'Ground insights in actual data provided',
                'Connect performance to marketing objectives',
                'Provide quantified impact recommendations'
            ]
        ];
        
        return $requirements;
    }
    
    /**
     * Get output format instructions
     */
    private function getOutputFormatInstructions($aiConfig) {
        $format = $aiConfig['output_format'] ?? 'structured';
        
        $formats = [
            'structured' => $this->getStructuredFormatInstructions(),
            'executive' => $this->getExecutiveFormatInstructions(),
            'detailed' => $this->getDetailedFormatInstructions(),
            'tactical' => $this->getTacticalFormatInstructions()
        ];
        
        return $formats[$format] ?? $formats['structured'];
    }
    
    /**
     * Optimize prompt for model and performance
     */
    private function optimizePrompt($prompt, $aiConfig) {
        $optimizations = [];
        
        // Compress repetitive content
        $prompt = $this->compressRepetitiveContent($prompt);
        
        // Ensure critical instructions are prominent
        $prompt = $this->emphasizeCriticalInstructions($prompt);
        
        // Add model-specific optimizations
        if (!empty($aiConfig['model'])) {
            $prompt = $this->applyModelOptimizations($prompt, $aiConfig['model']);
        }
        
        // Validate prompt length
        $prompt = $this->validatePromptLength($prompt, $aiConfig);
        
        return $prompt;
    }
    
    // Helper methods
    private function initializeToneProfiles() {
        $this->toneProfiles = [
            'professional' => 'Maintain a professional, authoritative tone. Use industry terminology appropriately. Be direct and actionable.',
            'concise' => 'Be extremely concise and to-the-point. Focus on key insights and actionable recommendations only.',
            'detailed' => 'Provide comprehensive analysis with detailed explanations. Include context and reasoning behind insights.',
            'executive' => 'Write for C-level executives. Focus on business impact, ROI, and strategic implications.',
            'technical' => 'Use technical language appropriate for marketing specialists. Include specific metrics and tactical details.',
            'consultative' => 'Adopt a consultative advisory tone. Provide strategic guidance and ask relevant questions.'
        ];
    }
    
    private function formatProductExpertise($enrichedContext) {
        // Format product-level expertise and guidelines
        $expertise = [];
        
        if (!empty($enrichedContext['analysis_guidelines']['base_role'])) {
            $expertise[] = $enrichedContext['analysis_guidelines']['base_role'];
        }
        
        return implode("\n", $expertise);
    }
    
    private function formatTacticContext($tacticSlug, $tactic) {
        $context = "### {$tactic['tactic_info']['name']} Expertise:\n";
        
        if (!empty($tactic['analysis_prompt_additions']['guidelines'])) {
            $context .= "Guidelines: " . implode('; ', $tactic['analysis_prompt_additions']['guidelines']) . "\n";
        }
        
        if (!empty($tactic['analysis_prompt_additions']['kpis'])) {
            $context .= "Primary KPIs: " . implode(', ', $tactic['analysis_prompt_additions']['kpis']) . "\n";
        }
        
        return $context;
    }
    
    private function formatDataExpectations($enrichedContext) {
        $expectations = "EXPECTED DATA STRUCTURE:\n";
        
        foreach ($enrichedContext['tactics'] ?? [] as $tactic) {
            if (!empty($tactic['file_expectations'])) {
                foreach ($tactic['file_expectations'] as $file) {
                    $expectations .= "- {$file['table_name']}: " . implode(', ', $file['required_headers']) . "\n";
                }
            }
        }
        
        return $expectations;
    }
    
    private function generateBenchmarkInterpretation($metric, $values) {
        $interpretations = [
            'ctr' => "CTR above {$values['goal']}% indicates strong audience engagement",
            'cpm' => "CPM below \${$values['goal']} shows cost-efficient reach",
            'conversion_rate' => "Conversion rate above {$values['goal']}% demonstrates effective funnel performance"
        ];
        
        return $interpretations[strtolower($metric)] ?? "Monitor {$metric} against goal of {$values['goal']}";
    }
    
    private function extractPrimaryKPIs($tactic) {
        if (!empty($tactic['analysis_prompt_additions']['kpis'])) {
            return array_slice($tactic['analysis_prompt_additions']['kpis'], 0, 3); // Top 3 KPIs
        }
        return ['impressions', 'clicks', 'conversions']; // Default
    }
    
    private function getAnalysisFocus($tactic) {
        $tacticName = strtolower($tactic['tactic_info']['name'] ?? '');
        
        $focuses = [
            'display' => 'Viewability, creative performance, audience targeting efficiency',
            'video' => 'Completion rates, engagement metrics, brand lift',
            'search' => 'Keyword performance, quality scores, ROAS optimization',
            'social' => 'Engagement rates, social proof, viral coefficient'
        ];
        
        foreach ($focuses as $type => $focus) {
            if (strpos($tacticName, $type) !== false) {
                return $focus;
            }
        }
        
        return 'Overall performance efficiency and optimization opportunities';
    }
    
    private function getCommonIssues($tactic) {
        if (!empty($tactic['analysis_prompt_additions']['common_issues'])) {
            return $tactic['analysis_prompt_additions']['common_issues'];
        }
        return ['Low CTR', 'High CPA', 'Poor audience targeting'];
    }
    
    private function getOptimizationStrategies($tactic) {
        if (!empty($tactic['analysis_prompt_additions']['optimization_strategies'])) {
            return $tactic['analysis_prompt_additions']['optimization_strategies'];
        }
        return ['A/B test creatives', 'Refine targeting', 'Adjust bidding strategy'];
    }
    
    private function buildFileContext($tactic) {
        $context = [];
        if (!empty($tactic['file_expectations'])) {
            foreach ($tactic['file_expectations'] as $file) {
                $context[] = $file['table_name'] . ' (' . count($file['required_headers']) . ' columns)';
            }
        }
        return implode(', ', $context);
    }
    
    private function getStructuredFormatInstructions() {
        return "Structure your response with clear sections: Executive Summary, Performance Analysis (by tactic), Key Insights, and Recommendations. Use bullet points and subheadings.";
    }
    
    // Additional helper methods for optimization, formatting, etc.
    private function compressRepetitiveContent($prompt) {
        // Remove duplicate phrases and consolidate similar content
        return $prompt;
    }
    
    private function emphasizeCriticalInstructions($prompt) {
        // Make critical analysis rules more prominent
        return $prompt;
    }
    
    private function applyModelOptimizations($prompt, $model) {
        // Apply model-specific optimizations
        return $prompt;
    }
    
    private function validatePromptLength($prompt, $aiConfig) {
        // Ensure prompt fits within model limits
        return $prompt;
    }
}

/**
 * Prompt Template Engine
 * Handles template rendering and management
 */
class PromptTemplateEngine {
    private $database;
    private $templates = [];
    private $version = '2025.03.01';
    
    public function __construct($database) {
        $this->database = $database;
        $this->loadTemplates();
    }
    
    public function render($templateName, $variables = []) {
        $template = $this->templates[$templateName] ?? '';
        
        foreach ($variables as $key => $value) {
            if (is_array($value)) {
                $value = $this->renderArray($value);
            } elseif (is_object($value)) {
                $value = $this->renderObject($value);
            }
            
            $template = str_replace("{{$key}}", $value, $template);
        }
        
        return $template;
    }
    
    public function getTemplate($templateName) {
        return $this->templates[$templateName] ?? '';
    }
    
    public function getVersion() {
        return $this->version;
    }
    
    private function loadTemplates() {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT template_name, content 
                FROM ai_prompt_templates 
                WHERE is_active = 1
                ORDER BY priority DESC
            ");
            $stmt->execute();
            
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->templates[$row['template_name']] = $row['content'];
            }
        } catch (Exception $e) {
            error_log("Failed to load prompt templates: " . $e->getMessage());
        }
        
        // Add default templates if database is empty
        if (empty($this->templates)) {
            $this->loadDefaultTemplates();
        }
    }
    
    private function loadDefaultTemplates() {
        $this->templates = [
            'base_role' => 'You are an expert digital marketing analyst specializing in multi-channel campaign optimization.',
            'comprehensive_analysis' => '{{base_role}}\n\n{{schema_context}}\n\n{{benchmark_context}}\n\n{{tactic_instructions}}\n\nAnalyze the provided campaign data and provide comprehensive insights.',
            'tactic_instruction' => '### {{tactic_name}} Analysis:\n- Primary KPIs: {{primary_kpis}}\n- Focus: {{analysis_focus}}\n- File Context: {{file_context}}'
        ];
    }
    
    private function renderArray($array) {
        if (empty($array)) return '';
        return is_string($array[0]) ? implode(', ', $array) : json_encode($array);
    }
    
    private function renderObject($object) {
        if (is_object($object)) {
            return json_encode($object);
        }
        return (string) $object;
    }
}
?>