<?php
/**
 * Context Inheritance Manager
 * Handles hierarchical context inheritance from products down to tactics
 */

class ContextInheritanceManager {
    private $inheritanceRules;
    
    public function __construct() {
        $this->initializeInheritanceRules();
    }
    
    /**
     * Build inherited context from hierarchical schema data
     */
    public function buildInheritedContext($tacticSchema) {
        if (!$tacticSchema || empty($tacticSchema)) {
            return $this->getEmptyContext();
        }
        
        // Group schema data by hierarchy level
        $groupedData = $this->groupSchemaByHierarchy($tacticSchema);
        
        $inheritedContext = [
            // Product-level context (highest priority for global rules)
            'product_guidelines' => $this->buildProductContext($groupedData),
            
            // Subproduct-level context (tactic-specific rules)
            'subproduct_context' => $this->buildSubproductContext($groupedData),
            
            // Table-level context (data structure expectations)
            'table_context' => $this->buildTableContext($groupedData),
            
            // AI-specific context (analysis instructions)
            'ai_context' => $this->buildAIContext($groupedData),
            
            // Benchmark context (performance expectations)
            'benchmark_context' => $this->buildBenchmarkContext($groupedData),
            
            // Merged analysis guidelines
            'analysis_guidelines' => $this->mergeAnalysisGuidelines($groupedData),
            
            // Performance KPIs with inheritance
            'performance_kpis' => $this->mergePerformanceKPIs($groupedData),
            
            // File processing expectations
            'file_expectations' => $this->buildFileExpectations($groupedData)
        ];
        
        return $this->applyInheritanceRules($inheritedContext);
    }
    
    /**
     * Group schema data by hierarchy levels
     */
    private function groupSchemaByHierarchy($tacticSchema) {
        $grouped = [
            'products' => [],
            'subproducts' => [],
            'tables' => [],
            'benchmarks' => [],
            'ai_context' => []
        ];
        
        foreach ($tacticSchema as $row) {
            // Product level
            if (!empty($row['product_name'])) {
                $productKey = $row['product_name'];
                $grouped['products'][$productKey] = [
                    'name' => $row['product_name'],
                    'ai_guidelines' => $row['ai_guidelines'] ?? '',
                    'ai_prompt' => $row['ai_prompt'] ?? ''
                ];
            }
            
            // Subproduct level
            if (!empty($row['subproduct_name'])) {
                $subproductKey = $row['subproduct_name'];
                $grouped['subproducts'][$subproductKey] = [
                    'name' => $row['subproduct_name'],
                    'notes' => $row['subproduct_notes'] ?? '',
                    'product' => $row['product_name'] ?? ''
                ];
            }
            
            // Table level
            if (!empty($row['table_name'])) {
                $tableKey = $row['table_slug'] ?: $row['table_name'];
                $grouped['tables'][$tableKey] = [
                    'name' => $row['table_name'],
                    'slug' => $row['table_slug'] ?? '',
                    'file_name' => $row['file_name'] ?? '',
                    'headers' => $this->parseJsonField($row['headers']),
                    'aliases' => $this->parseJsonField($row['aliases']),
                    'validator_config' => $this->parseJsonField($row['validator_config'])
                ];
            }
            
            // Benchmarks
            if (!empty($row['metric_name'])) {
                $grouped['benchmarks'][] = [
                    'metric' => $row['metric_name'],
                    'goal' => $row['goal_value'],
                    'warning' => $row['warning_threshold']
                ];
            }
            
            // AI Context
            if (!empty($row['analysis_guidelines']) || !empty($row['performance_kpis'])) {
                $grouped['ai_context'][] = [
                    'analysis_guidelines' => $row['analysis_guidelines'] ?? '',
                    'performance_kpis' => $this->parseJsonField($row['performance_kpis']),
                    'common_issues' => $this->parseJsonField($row['common_issues']),
                    'optimization_strategies' => $this->parseJsonField($row['optimization_strategies'])
                ];
            }
        }
        
        return $grouped;
    }
    
    /**
     * Build product-level context
     */
    private function buildProductContext($groupedData) {
        $productContext = [];
        
        foreach ($groupedData['products'] as $product) {
            $productContext['ai_guidelines'] = $this->combineGuidelines(
                $productContext['ai_guidelines'] ?? '',
                $product['ai_guidelines']
            );
            
            $productContext['ai_prompt'] = $this->combinePrompts(
                $productContext['ai_prompt'] ?? '',
                $product['ai_prompt']
            );
            
            $productContext['product_names'][] = $product['name'];
        }
        
        return $productContext;
    }
    
    /**
     * Build subproduct-level context
     */
    private function buildSubproductContext($groupedData) {
        $subproductContext = [
            'notes' => [],
            'specializations' => []
        ];
        
        foreach ($groupedData['subproducts'] as $subproduct) {
            if (!empty($subproduct['notes'])) {
                $subproductContext['notes'][] = $subproduct['notes'];
            }
            
            $subproductContext['specializations'][] = [
                'name' => $subproduct['name'],
                'product' => $subproduct['product']
            ];
        }
        
        return $subproductContext;
    }
    
    /**
     * Build table-level context
     */
    private function buildTableContext($groupedData) {
        $tableContext = [
            'tables' => [],
            'all_headers' => [],
            'file_patterns' => []
        ];
        
        foreach ($groupedData['tables'] as $table) {
            $tableContext['tables'][] = $table;
            
            // Collect all possible headers
            if (is_array($table['headers'])) {
                $tableContext['all_headers'] = array_merge(
                    $tableContext['all_headers'],
                    $table['headers']
                );
            }
            
            // Collect file patterns
            if (!empty($table['file_name'])) {
                $tableContext['file_patterns'][] = $table['file_name'];
            }
        }
        
        $tableContext['all_headers'] = array_unique($tableContext['all_headers']);
        
        return $tableContext;
    }
    
    /**
     * Build AI-specific context
     */
    private function buildAIContext($groupedData) {
        $aiContext = [
            'combined_guidelines' => [],
            'all_kpis' => [],
            'common_issues' => [],
            'optimization_strategies' => []
        ];
        
        foreach ($groupedData['ai_context'] as $context) {
            if (!empty($context['analysis_guidelines'])) {
                $aiContext['combined_guidelines'][] = $context['analysis_guidelines'];
            }
            
            if (is_array($context['performance_kpis'])) {
                $aiContext['all_kpis'] = array_merge(
                    $aiContext['all_kpis'],
                    $context['performance_kpis']
                );
            }
            
            if (is_array($context['common_issues'])) {
                $aiContext['common_issues'] = array_merge(
                    $aiContext['common_issues'],
                    $context['common_issues']
                );
            }
            
            if (is_array($context['optimization_strategies'])) {
                $aiContext['optimization_strategies'] = array_merge(
                    $aiContext['optimization_strategies'],
                    $context['optimization_strategies']
                );
            }
        }
        
        // Remove duplicates and clean up
        $aiContext['all_kpis'] = array_unique($aiContext['all_kpis']);
        $aiContext['common_issues'] = array_unique($aiContext['common_issues']);
        $aiContext['optimization_strategies'] = array_unique($aiContext['optimization_strategies']);
        
        return $aiContext;
    }
    
    /**
     * Build benchmark context with inheritance
     */
    private function buildBenchmarkContext($groupedData) {
        $benchmarkContext = [];
        
        foreach ($groupedData['benchmarks'] as $benchmark) {
            $metric = $benchmark['metric'];
            $benchmarkContext[$metric] = [
                'goal_value' => $benchmark['goal'],
                'warning_threshold' => $benchmark['warning'],
                'interpretation' => $this->getBenchmarkInterpretation($metric, $benchmark)
            ];
        }
        
        return $benchmarkContext;
    }
    
    /**
     * Merge analysis guidelines with proper hierarchy
     */
    private function mergeAnalysisGuidelines($groupedData) {
        $guidelines = [];
        
        // Product-level guidelines (highest priority)
        foreach ($groupedData['products'] as $product) {
            if (!empty($product['ai_guidelines'])) {
                $guidelines['product_level'][] = $product['ai_guidelines'];
            }
        }
        
        // AI context guidelines (most specific)
        foreach ($groupedData['ai_context'] as $context) {
            if (!empty($context['analysis_guidelines'])) {
                $guidelines['tactic_level'][] = $context['analysis_guidelines'];
            }
        }
        
        // Combine into final guideline text
        $guidelines['combined'] = $this->combineAllGuidelines($guidelines);
        
        return $guidelines;
    }
    
    /**
     * Merge performance KPIs with inheritance
     */
    private function mergePerformanceKPIs($groupedData) {
        $allKPIs = [];
        $prioritizedKPIs = [];
        
        // Collect KPIs from AI context (most specific)
        foreach ($groupedData['ai_context'] as $context) {
            if (is_array($context['performance_kpis'])) {
                $allKPIs = array_merge($allKPIs, $context['performance_kpis']);
            }
        }
        
        // Add benchmark metrics as KPIs
        foreach ($groupedData['benchmarks'] as $benchmark) {
            $allKPIs[] = $benchmark['metric'];
        }
        
        // Prioritize KPIs based on inheritance rules
        $allKPIs = array_unique($allKPIs);
        foreach ($allKPIs as $kpi) {
            $prioritizedKPIs[$kpi] = [
                'name' => $kpi,
                'priority' => $this->getKPIPriority($kpi),
                'has_benchmark' => $this->hasBenchmark($kpi, $groupedData['benchmarks'])
            ];
        }
        
        // Sort by priority
        uasort($prioritizedKPIs, function($a, $b) {
            return $b['priority'] <=> $a['priority'];
        });
        
        return $prioritizedKPIs;
    }
    
    /**
     * Build file processing expectations
     */
    private function buildFileExpectations($groupedData) {
        $expectations = [
            'required_tables' => [],
            'file_patterns' => [],
            'header_requirements' => [],
            'validation_rules' => []
        ];
        
        foreach ($groupedData['tables'] as $table) {
            $expectations['required_tables'][] = $table['name'];
            
            if (!empty($table['file_name'])) {
                $expectations['file_patterns'][] = $table['file_name'];
            }
            
            if (is_array($table['headers'])) {
                $expectations['header_requirements'][$table['name']] = $table['headers'];
            }
            
            if (is_array($table['validator_config'])) {
                $expectations['validation_rules'][$table['name']] = $table['validator_config'];
            }
        }
        
        return $expectations;
    }
    
    /**
     * Apply inheritance rules to resolve conflicts
     */
    private function applyInheritanceRules($context) {
        // Apply priority rules: tactic-level > subproduct-level > product-level
        
        // Override product guidelines with more specific ones
        if (!empty($context['analysis_guidelines']['tactic_level'])) {
            $context['primary_guidelines'] = implode("\n\n", $context['analysis_guidelines']['tactic_level']);
        } elseif (!empty($context['analysis_guidelines']['product_level'])) {
            $context['primary_guidelines'] = implode("\n\n", $context['analysis_guidelines']['product_level']);
        } else {
            $context['primary_guidelines'] = 'Use standard digital marketing analysis best practices.';
        }
        
        return $context;
    }
    
    // Helper methods
    private function parseJsonField($jsonString) {
        if (empty($jsonString)) return [];
        return json_decode($jsonString, true) ?: [];
    }
    
    private function combineGuidelines($existing, $new) {
        if (empty($existing)) return $new;
        if (empty($new)) return $existing;
        return $existing . "\n\n" . $new;
    }
    
    private function combinePrompts($existing, $new) {
        if (empty($existing)) return $new;
        if (empty($new)) return $existing;
        return $existing . "\n" . $new;
    }
    
    private function getBenchmarkInterpretation($metric, $benchmark) {
        $interpretations = [
            'ctr' => "CTR above {$benchmark['goal']}% is excellent, below {$benchmark['warning']}% needs attention",
            'cpm' => "CPM below ${$benchmark['goal']} is great, above ${$benchmark['warning']} may indicate inefficiency",
            'conversion_rate' => "Conversion rate above {$benchmark['goal']}% shows strong performance"
        ];
        
        return $interpretations[strtolower($metric)] ?? "Monitor this metric against the goal of {$benchmark['goal']}";
    }
    
    private function combineAllGuidelines($guidelines) {
        $combined = [];
        
        if (!empty($guidelines['product_level'])) {
            $combined[] = "PRODUCT-LEVEL GUIDELINES:\n" . implode("\n", $guidelines['product_level']);
        }
        
        if (!empty($guidelines['tactic_level'])) {
            $combined[] = "TACTIC-SPECIFIC GUIDELINES:\n" . implode("\n", $guidelines['tactic_level']);
        }
        
        return implode("\n\n", $combined);
    }
    
    private function getKPIPriority($kpi) {
        $priorities = [
            'conversion_rate' => 100,
            'cpa' => 95,
            'roas' => 90,
            'ctr' => 85,
            'cpm' => 80,
            'impressions' => 70,
            'clicks' => 75
        ];
        
        return $priorities[strtolower($kpi)] ?? 50;
    }
    
    private function hasBenchmark($kpi, $benchmarks) {
        foreach ($benchmarks as $benchmark) {
            if (strtolower($benchmark['metric']) === strtolower($kpi)) {
                return true;
            }
        }
        return false;
    }
    
    private function getEmptyContext() {
        return [
            'product_guidelines' => ['ai_guidelines' => '', 'product_names' => []],
            'subproduct_context' => ['notes' => [], 'specializations' => []],
            'table_context' => ['tables' => [], 'all_headers' => [], 'file_patterns' => []],
            'ai_context' => ['combined_guidelines' => [], 'all_kpis' => []],
            'benchmark_context' => [],
            'analysis_guidelines' => ['combined' => 'Use standard analysis practices.'],
            'performance_kpis' => [],
            'file_expectations' => ['required_tables' => [], 'file_patterns' => []]
        ];
    }
    
    private function initializeInheritanceRules() {
        $this->inheritanceRules = [
            'priority_order' => ['tactic', 'subproduct', 'product'],
            'merge_strategies' => [
                'guidelines' => 'append',
                'kpis' => 'merge_unique',
                'benchmarks' => 'override'
            ]
        ];
    }
}
?>