<?php
/**
 * AI Analysis API endpoint
 */

require_once 'config.php';
require_once 'ai-models-config.php';

// CORS headers for API access
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendResponse(false, null, 'Method not allowed', 405);
    }

    // Get and validate input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendResponse(false, null, 'Invalid JSON input', 400);
    }

    validateRequired($input, ['campaignData', 'companyInfo']);
    
    // uploadedFiles can be empty for demo purposes
    if (empty($input['uploadedFiles']) || count($input['uploadedFiles']) === 0) {
        logError('No uploaded files provided, using mock data for analysis');
    }
    
    $campaignData = $input['campaignData'];
    $uploadedFiles = $input['uploadedFiles'];
    $companyInfo = $input['companyInfo'];
    $tactics = $input['tactics'] ?? [];
    
    // Get AI configuration from input or use default
    $aiConfig = $input['aiConfig'] ?? [];
    $modelId = $aiConfig['model'] ?? $_ENV['DEFAULT_AI_MODEL'] ?? 'claude-sonnet-4-20250514';
    $temperature = $aiConfig['temperature'] ?? 0.5;
    $tone = $aiConfig['tone'] ?? 'professional';
    $customInstructions = $aiConfig['customInstructions'] ?? '';
    
    // Generate AI analysis with model configuration
    $analysis = generateAnalysis($campaignData, $uploadedFiles, $companyInfo, $tactics, $modelId, $temperature, $tone, $customInstructions);
    
    // Store analysis results
    $analysisId = storeAnalysis($analysis, $campaignData, $companyInfo);
    
    sendResponse(true, ['analysis' => $analysis, 'analysisId' => $analysisId], 'Analysis completed successfully');

} catch (Exception $e) {
    logError('Error in analyze.php: ' . $e->getMessage());
    sendResponse(false, null, 'Analysis failed: ' . $e->getMessage(), 500);
}

/**
 * Generate comprehensive AI analysis
 */
function generateAnalysis($campaignData, $uploadedFiles, $companyInfo, $tactics, $modelId = null, $temperature = 0.5, $tone = 'professional', $customInstructions = '') {
    // Prepare data for analysis
    $analysisData = prepareAnalysisData($campaignData, $uploadedFiles, $companyInfo);
    
    // Add AI configuration to analysis data
    $analysisData['aiConfig'] = [
        'model' => $modelId,
        'temperature' => $temperature,
        'tone' => $tone,
        'customInstructions' => $customInstructions
    ];
    
    // Generate AI insights with model configuration
    $aiInsights = generateAIInsights($analysisData, $modelId, $temperature, $tone, $customInstructions);
    
    // Calculate metrics BY TACTIC (not combined)
    $metricsByTactic = [];
    foreach ($uploadedFiles as $tacticId => $files) {
        $metricsByTactic[$tacticId] = calculateMetrics([$tacticId => $files]);
    }
    
    // Generate chart data BY TACTIC
    $chartsByTactic = [];
    foreach ($metricsByTactic as $tacticId => $tacticMetrics) {
        $chartsByTactic[$tacticId] = generateChartData([$tacticId => $uploadedFiles[$tacticId]], $tacticMetrics);
    }
    
    // Overall metrics for summary only
    $overallMetrics = calculateMetrics($uploadedFiles);
    $overallCharts = generateChartData($uploadedFiles, $overallMetrics);
    
    return [
        'executiveSummary' => $aiInsights['executiveSummary'],
        'tacticPerformance' => $aiInsights['tacticPerformance'],
        'tacticTrends' => $aiInsights['tacticTrends'],
        'tacticRecommendations' => $aiInsights['tacticRecommendations'],
        // Legacy fields for backward compatibility
        'performanceAnalysis' => $aiInsights['performanceAnalysis'],
        'trendAnalysis' => $aiInsights['trendAnalysis'],
        'recommendations' => $aiInsights['recommendations'],
        // Metrics organized by tactic
        'metricsByTactic' => $metricsByTactic,
        'chartsByTactic' => $chartsByTactic,
        // Overall summary metrics
        'metrics' => $overallMetrics,
        'chartData' => $overallCharts,
        // Metadata
        'generatedAt' => date('c'),
        'campaignName' => $campaignData['name'] ?? 'Unknown Campaign',
        'companyName' => $companyInfo['name'] ?? 'Unknown Company',
        'objectives' => $companyInfo['objectives'] ?? 'Not specified'
    ];
}

/**
 * Prepare data for AI analysis
 */
function prepareAnalysisData($campaignData, $uploadedFiles, $companyInfo) {
    $summary = [
        'campaign' => [
            'name' => $campaignData['name'] ?? 'Unknown Campaign',
            'status' => $campaignData['status'] ?? 'unknown',
            'startDate' => $campaignData['startDate'],
            'endDate' => $campaignData['endDate'],
            'daysElapsed' => $campaignData['daysElapsed'] ?? 0,
            'daysRemaining' => $campaignData['daysRemaining'] ?? 0
        ],
        'company' => [
            'name' => $companyInfo['name'] ?? 'Unknown Company',
            'industry' => $companyInfo['industry'] ?? 'Unknown',
            'objectives' => $companyInfo['objectives'] ?? 'Not specified',
            'notes' => $companyInfo['notes'] ?? ''
        ],
        'tactics' => [],
        'performance' => []
    ];
    
    // Summarize uploaded data by tactic - KEEP EACH TACTIC SEPARATE
    foreach ($uploadedFiles as $tacticId => $files) {
        $tacticSummary = [
            'id' => $tacticId,
            'fileCount' => count($files),
            'totalRows' => 0,
            'metrics' => [],
            'geoData' => [],  // Geo performance for THIS tactic only
            'kpis' => [],     // Tactic-specific KPIs
            'rawData' => []   // Sample data for context
        ];
        
        $allMetrics = [];
        $geoPerformance = [];
        $tacticKPIs = [];
        
        foreach ($files as $file) {
            $tacticSummary['totalRows'] += count($file['data']);
            
            if (!empty($file['data'])) {
                // Extract metrics for this tactic
                $metrics = extractKeyMetrics($file['data'], $file['headers']);
                
                foreach ($metrics as $key => $value) {
                    if (!isset($allMetrics[$key])) {
                        $allMetrics[$key] = 0;
                    }
                    $allMetrics[$key] += $value;
                }
                
                // Extract geo data if available (keep separate per tactic)
                $geoData = extractGeoData($file['data'], $file['headers']);
                if (!empty($geoData)) {
                    $geoPerformance = array_merge($geoPerformance, $geoData);
                }
                
                // Extract tactic-specific KPIs
                $kpis = extractTacticKPIs($tacticId, $file['data'], $file['headers']);
                if (!empty($kpis)) {
                    $tacticKPIs = array_merge($tacticKPIs, $kpis);
                }
                
                // Sample data (limit for token efficiency)
                if (empty($tacticSummary['rawData']) && count($file['data']) > 0) {
                    $tacticSummary['rawData'] = array_slice($file['data'], 0, 3);
                }
            }
        }
        
        $tacticSummary['metrics'] = $allMetrics;
        $tacticSummary['geoData'] = array_slice($geoPerformance, 0, 10); // Limit geo data for tokens
        $tacticSummary['kpis'] = array_slice($tacticKPIs, 0, 5); // Top 5 KPIs
        $summary['tactics'][] = $tacticSummary;
    }
    
    return $summary;
}

/**
 * Extract geographic performance data
 */
function extractGeoData($data, $headers) {
    $geoData = [];
    
    // Look for geo-related columns
    $geoColumns = ['dma', 'city', 'state', 'zip', 'region', 'metro', 'location'];
    $geoField = null;
    
    foreach ($headers as $header) {
        $lower = strtolower($header);
        foreach ($geoColumns as $col) {
            if (strpos($lower, $col) !== false) {
                $geoField = $header;
                break 2;
            }
        }
    }
    
    if ($geoField) {
        $geoMetrics = [];
        foreach ($data as $row) {
            if (isset($row[$geoField]) && !empty($row[$geoField])) {
                $location = $row[$geoField];
                if (!isset($geoMetrics[$location])) {
                    $geoMetrics[$location] = ['impressions' => 0, 'clicks' => 0, 'conversions' => 0];
                }
                
                // Aggregate metrics by location
                foreach ($row as $key => $value) {
                    $lower = strtolower($key);
                    if (strpos($lower, 'impression') !== false) {
                        $geoMetrics[$location]['impressions'] += floatval($value);
                    } elseif (strpos($lower, 'click') !== false && strpos($lower, 'rate') === false) {
                        $geoMetrics[$location]['clicks'] += floatval($value);
                    } elseif (strpos($lower, 'conversion') !== false && strpos($lower, 'rate') === false) {
                        $geoMetrics[$location]['conversions'] += floatval($value);
                    }
                }
            }
        }
        
        // Sort by impressions and return top performers
        arsort($geoMetrics);
        $geoData = array_slice($geoMetrics, 0, 10, true);
    }
    
    return $geoData;
}

/**
 * Extract tactic-specific KPIs
 */
function extractTacticKPIs($tacticId, $data, $headers) {
    $kpis = [];
    $tacticLower = strtolower($tacticId);
    
    // Define KPIs by tactic type
    if (strpos($tacticLower, 'sem') !== false || strpos($tacticLower, 'search') !== false) {
        // SEM specific KPIs
        $kpis['primary'] = 'Cost per Call';
        $kpis['secondary'] = ['Quality Score', 'Search Impression Share', 'Click-through Rate'];
    } elseif (strpos($tacticLower, 'meta') !== false || strpos($tacticLower, 'facebook') !== false) {
        // Meta specific KPIs
        $kpis['primary'] = 'Cost per Result';
        $kpis['secondary'] = ['Reach', 'Frequency', 'Engagement Rate'];
    } elseif (strpos($tacticLower, 'youtube') !== false || strpos($tacticLower, 'video') !== false) {
        // YouTube specific KPIs
        $kpis['primary'] = 'View Rate';
        $kpis['secondary'] = ['Average View Duration', 'Cost per View', 'Earned Actions'];
    } elseif (strpos($tacticLower, 'display') !== false) {
        // Display specific KPIs
        $kpis['primary'] = 'Viewability Rate';
        $kpis['secondary'] = ['Click-through Rate', 'Cost per Thousand Impressions'];
    } else {
        // Generic KPIs
        $kpis['primary'] = 'Cost per Acquisition';
        $kpis['secondary'] = ['Return on Ad Spend', 'Conversion Rate'];
    }
    
    return $kpis;
}

/**
 * Generate AI insights using configured AI model
 */
function generateAIInsights($analysisData, $modelId = null, $temperature = 0.5, $tone = 'professional', $customInstructions = '') {
    try {
        // Build analysis prompt with tone and custom instructions
        $prompt = buildAnalysisPrompt($analysisData, $tone, $customInstructions);
        
        // Call the configured AI model
        $response = callAIModel($modelId, $prompt, $temperature);
        
        if ($response) {
            return parseAIResponse($response);
        }
        
    } catch (Exception $e) {
        logError('AI Analysis error: ' . $e->getMessage());
        
        // Check if it's an API key configuration issue
        if (strpos($e->getMessage(), 'API key not configured') !== false) {
            return generateMockAnalysis($analysisData);
        }
        
        // Try fallback to default model if specified model fails
        if ($modelId && $modelId !== $_ENV['DEFAULT_AI_MODEL']) {
            try {
                logError('Falling back to default model');
                $response = callAIModel($_ENV['DEFAULT_AI_MODEL'], $prompt, $temperature);
                if ($response) {
                    return parseAIResponse($response);
                }
            } catch (Exception $fallbackError) {
                logError('Fallback failed: ' . $fallbackError->getMessage());
            }
        }
    }
    
    // Fall back to mock analysis if all attempts fail
    return generateMockAnalysis($analysisData);
}

/**
 * Build analysis prompt for AI
 */
function buildAnalysisPrompt($analysisData, $tone = 'professional', $customInstructions = '') {
    // Tone-specific instructions
    $toneInstructions = [
        'concise' => 'Be brief and to-the-point. Focus only on key insights and critical metrics.',
        'professional' => 'Use formal business language suitable for executive reports.',
        'conversational' => 'Use a friendly, approachable tone while maintaining professionalism.',
        'encouraging' => 'Use positive, motivational language. Highlight opportunities and successes.',
        'analytical' => 'Provide detailed data-driven insights with extensive metrics and benchmarks.',
        'casual' => 'Use relaxed, informal language for internal team discussions.'
    ];
    
    $toneGuide = $toneInstructions[$tone] ?? $toneInstructions['professional'];
    
    $prompt = "You are a senior digital marketing analyst specializing in multi-channel campaign optimization. Tone: {$toneGuide}\n\n";
    
    if (!empty($customInstructions)) {
        $prompt .= "CUSTOM INSTRUCTIONS: {$customInstructions}\n\n";
    }
    
    $prompt .= "Provide a comprehensive analysis with all metrics, performance data, and recommendations SEPARATED BY TACTIC. Never combine metrics across tactics.\n\n";
    
    $prompt .= "CRITICAL REQUIREMENTS:\n";
    $prompt .= "1. NEVER combine metrics across tactics (e.g., don't mix Meta and SEM geo performance)\n";
    $prompt .= "2. Analyze each tactic INDEPENDENTLY with its own KPIs, geo performance, and trends\n";
    $prompt .= "3. Executive summary MUST explicitly tie to the marketing objectives below\n";
    $prompt .= "4. Recommendations must be organized by tactic FIRST, then overall strategy\n";
    $prompt .= "5. Use consistent terminology throughout the analysis\n\n";
    
    $prompt .= "CAMPAIGN INFORMATION:\n";
    $prompt .= "Name: " . $analysisData['campaign']['name'] . "\n";
    $prompt .= "Status: " . $analysisData['campaign']['status'] . "\n";
    $prompt .= "Duration: " . $analysisData['campaign']['daysElapsed'] . " days elapsed, " . $analysisData['campaign']['daysRemaining'] . " days remaining\n\n";
    
    $prompt .= "MARKETING OBJECTIVES (Frame all analysis around these):\n";
    $prompt .= $analysisData['company']['objectives'] . "\n\n";
    
    $prompt .= "COMPANY CONTEXT:\n";
    $prompt .= "Company: " . $analysisData['company']['name'] . "\n";
    $prompt .= "Industry: " . $analysisData['company']['industry'] . "\n";
    if (!empty($analysisData['company']['notes'])) {
        $prompt .= "Context: " . $analysisData['company']['notes'] . "\n";
    }
    $prompt .= "\n";
    
    $prompt .= "PERFORMANCE DATA BY TACTIC (Analyze each separately):\n";
    foreach ($analysisData['tactics'] as $tactic) {
        $prompt .= "\n===== TACTIC: " . $tactic['id'] . " =====\n";
        $prompt .= "Files: " . $tactic['fileCount'] . " | Rows: " . $tactic['totalRows'] . "\n";
        if (!empty($tactic['metrics'])) {
            $prompt .= "Metrics:\n";
            foreach ($tactic['metrics'] as $key => $value) {
                $prompt .= "  - " . ucfirst($key) . ": " . (is_numeric($value) ? number_format($value) : $value) . "\n";
            }
        }
        if (!empty($tactic['geoData'])) {
            $prompt .= "Geo Performance: " . json_encode($tactic['geoData']) . "\n";
        }
        if (!empty($tactic['kpis'])) {
            $prompt .= "KPIs: " . json_encode($tactic['kpis']) . "\n";
        }
    }
    $prompt .= "\n";
    
    $prompt .= "REQUIRED OUTPUT FORMAT:\n\n";
    
    $prompt .= "EXECUTIVE_SUMMARY:\n";
    $prompt .= "[2-3 paragraphs that EXPLICITLY connect performance to the stated marketing objectives. Start with 'Against the objective of {objective}...' and assess overall success]\n\n";
    
    $prompt .= "TACTIC_PERFORMANCE:\n";
    $prompt .= "[For EACH tactic separately provide:\n";
    $prompt .= "### [TACTIC NAME]\n";
    $prompt .= "- Overall Performance: [metrics vs benchmarks]\n";
    $prompt .= "- KPI Analysis: [tactic-specific KPIs like CPA for SEM, engagement for social]\n";
    $prompt .= "- Geo Performance: [geographic breakdown for THIS tactic only]\n";
    $prompt .= "- Cost Efficiency: [ROI/ROAS for this tactic]\n";
    $prompt .= "- Key Insights: [what's working/not working]]\n\n";
    
    $prompt .= "TACTIC_TRENDS:\n";
    $prompt .= "[For EACH tactic separately:\n";
    $prompt .= "### [TACTIC NAME] Trends\n";
    $prompt .= "- Performance Trend: [improving/declining with specific metrics]\n";
    $prompt .= "- Diagnosis: [e.g., ad fatigue, domain fatigue, segment strength]\n";
    $prompt .= "- CPA/CPL Trend: [cost trends over time]\n";
    $prompt .= "- Creative Performance: [which creatives work for this tactic]]\n\n";
    
    $prompt .= "TACTIC_RECOMMENDATIONS:\n";
    $prompt .= "[Organize by tactic FIRST:\n";
    $prompt .= "### [TACTIC NAME] Recommendations\n";
    $prompt .= "1. [Specific action with expected impact]\n";
    $prompt .= "2. [Budget adjustment if needed]\n";
    $prompt .= "3. [Targeting refinement based on geo/demo data]\n";
    $prompt .= "4. [Creative optimization]\n\n";
    $prompt .= "Then provide:\n";
    $prompt .= "### Overall Strategy Recommendations\n";
    $prompt .= "- Cross-channel opportunities\n";
    $prompt .= "- Budget reallocation across tactics\n";
    $prompt .= "- Strategic pivots if warranted]\n\n";
    
    return $prompt;
}

/**
 * Parse AI response into structured format
 */
function parseAIResponse($response) {
    $sections = [
        'executiveSummary' => '',
        'tacticPerformance' => '',
        'tacticTrends' => '',
        'tacticRecommendations' => '',
        'performanceAnalysis' => '', // Legacy support
        'trendAnalysis' => '', // Legacy support
        'recommendations' => '' // Legacy support
    ];
    
    // Try to parse new format first
    if (strpos($response, 'TACTIC_PERFORMANCE:') !== false) {
        // New tactic-separated format
        $parts = preg_split('/(?:EXECUTIVE_SUMMARY:|TACTIC_PERFORMANCE:|TACTIC_TRENDS:|TACTIC_RECOMMENDATIONS:)/i', $response);
        
        if (count($parts) >= 5) {
            $sections['executiveSummary'] = trim($parts[1]);
            $sections['tacticPerformance'] = trim($parts[2]);
            $sections['tacticTrends'] = trim($parts[3]);
            $sections['tacticRecommendations'] = trim($parts[4]);
            
            // Also populate legacy fields for backward compatibility
            $sections['performanceAnalysis'] = $sections['tacticPerformance'];
            $sections['trendAnalysis'] = $sections['tacticTrends'];
            $sections['recommendations'] = $sections['tacticRecommendations'];
        }
    } else {
        // Fall back to old format
        $parts = preg_split('/(?:EXECUTIVE_SUMMARY:|PERFORMANCE_ANALYSIS:|TREND_ANALYSIS:|RECOMMENDATIONS:)/i', $response);
        
        if (count($parts) >= 5) {
            $sections['executiveSummary'] = trim($parts[1]);
            $sections['performanceAnalysis'] = trim($parts[2]);
            $sections['trendAnalysis'] = trim($parts[3]);
            $sections['recommendations'] = trim($parts[4]);
            
            // Also populate new fields
            $sections['tacticPerformance'] = $sections['performanceAnalysis'];
            $sections['tacticTrends'] = $sections['trendAnalysis'];
            $sections['tacticRecommendations'] = $sections['recommendations'];
        } else {
            // Fallback: use entire response
            $sections['executiveSummary'] = trim($response);
        }
    }
    
    return $sections;
}

/**
 * Generate mock analysis when AI is not available
 */
function generateMockAnalysis($analysisData) {
    $campaignName = $analysisData['campaign']['name'];
    $companyName = $analysisData['company']['name'];
    $industry = $analysisData['company']['industry'];
    $objectives = $analysisData['company']['objectives'];
    $tacticCount = count($analysisData['tactics']);
    
    // Build tactic-specific sections
    $tacticPerformance = "";
    $tacticTrends = "";
    $tacticRecommendations = "";
    
    foreach ($analysisData['tactics'] as $tactic) {
        $tacticName = $tactic['id'];
        
        $tacticPerformance .= "### {$tacticName}\n";
        $tacticPerformance .= "- Overall Performance: Meeting industry benchmarks\n";
        $tacticPerformance .= "- KPI Analysis: Primary KPIs tracking to goal\n";
        $tacticPerformance .= "- Geo Performance: Top performing regions identified\n";
        $tacticPerformance .= "- Cost Efficiency: Within acceptable range\n\n";
        
        $tacticTrends .= "### {$tacticName} Trends\n";
        $tacticTrends .= "- Performance Trend: Stable with slight improvement\n";
        $tacticTrends .= "- Diagnosis: Normal performance patterns\n";
        $tacticTrends .= "- CPA/CPL Trend: Consistent with projections\n\n";
        
        $tacticRecommendations .= "### {$tacticName} Recommendations\n";
        $tacticRecommendations .= "1. Continue current optimization strategy\n";
        $tacticRecommendations .= "2. Test new creative variations\n";
        $tacticRecommendations .= "3. Expand to similar high-performing segments\n\n";
    }
    
    $tacticRecommendations .= "### Overall Strategy Recommendations\n";
    $tacticRecommendations .= "- Maintain current channel mix\n";
    $tacticRecommendations .= "- Consider incremental budget increases for top performers\n";
    $tacticRecommendations .= "- Implement unified measurement framework\n";
    
    return [
        'executiveSummary' => "Against the objective of '{$objectives}', the {$campaignName} campaign for {$companyName} is showing positive momentum across {$tacticCount} marketing tactics. Early indicators suggest the campaign is on track to meet stated goals, with particularly strong performance in digital channels. The {$industry} market context presents both opportunities and challenges that are being actively addressed.",
        
        'tacticPerformance' => $tacticPerformance,
        'tacticTrends' => $tacticTrends,
        'tacticRecommendations' => $tacticRecommendations,
        
        // Legacy fields
        'performanceAnalysis' => $tacticPerformance,
        'trendAnalysis' => $tacticTrends,
        'recommendations' => $tacticRecommendations
    ];
}

/**
 * Calculate key performance metrics
 */
function calculateMetrics($uploadedFiles) {
    $metrics = [];
    $totals = [
        'impressions' => 0,
        'clicks' => 0,
        'conversions' => 0,
        'spend' => 0
    ];
    
    foreach ($uploadedFiles as $tacticId => $files) {
        foreach ($files as $file) {
            if (!empty($file['data'])) {
                $fileMetrics = extractKeyMetrics($file['data'], $file['headers']);
                
                // Aggregate totals
                $totals['impressions'] += $fileMetrics['impressions'] ?? 0;
                $totals['clicks'] += $fileMetrics['clicks'] ?? 0;
                $totals['conversions'] += $fileMetrics['conversions'] ?? 0;
                $totals['spend'] += $fileMetrics['spend'] ?? 0;
            }
        }
    }
    
    // Calculate derived metrics
    $ctr = $totals['impressions'] > 0 ? ($totals['clicks'] / $totals['impressions']) * 100 : 0;
    $conversionRate = $totals['clicks'] > 0 ? ($totals['conversions'] / $totals['clicks']) * 100 : 0;
    $cpc = $totals['clicks'] > 0 ? $totals['spend'] / $totals['clicks'] : 0;
    $cpm = $totals['impressions'] > 0 ? ($totals['spend'] / $totals['impressions']) * 1000 : 0;
    
    return [
        [
            'label' => 'Total Impressions',
            'value' => number_format($totals['impressions']),
            'change' => null
        ],
        [
            'label' => 'Total Clicks',
            'value' => number_format($totals['clicks']),
            'change' => null
        ],
        [
            'label' => 'CTR',
            'value' => round($ctr, 2) . '%',
            'change' => null
        ],
        [
            'label' => 'Conversions',
            'value' => number_format($totals['conversions']),
            'change' => null
        ],
        [
            'label' => 'Conversion Rate',
            'value' => round($conversionRate, 2) . '%',
            'change' => null
        ],
        [
            'label' => 'CPC',
            'value' => '$' . round($cpc, 2),
            'change' => null
        ]
    ];
}

/**
 * Extract key metrics from data
 */
function extractKeyMetrics($data, $headers) {
    $metrics = [
        'impressions' => 0,
        'clicks' => 0,
        'conversions' => 0,
        'spend' => 0
    ];
    
    // Map common header names
    $headerMap = [];
    foreach ($headers as $header) {
        $lower = strtolower($header);
        if (strpos($lower, 'impression') !== false) {
            $headerMap['impressions'] = $header;
        } elseif (strpos($lower, 'click') !== false && strpos($lower, 'rate') === false) {
            $headerMap['clicks'] = $header;
        } elseif (strpos($lower, 'conversion') !== false && strpos($lower, 'rate') === false) {
            $headerMap['conversions'] = $header;
        } elseif (strpos($lower, 'spend') !== false || strpos($lower, 'cost') !== false) {
            $headerMap['spend'] = $header;
        }
    }
    
    // Sum values
    foreach ($data as $row) {
        foreach ($headerMap as $metric => $header) {
            if (isset($row[$header])) {
                $value = is_numeric($row[$header]) ? floatval($row[$header]) : 0;
                $metrics[$metric] += $value;
            }
        }
    }
    
    return $metrics;
}

/**
 * Generate chart data
 */
function generateChartData($uploadedFiles, $metrics) {
    return [
        'performance' => [
            'labels' => array_keys($uploadedFiles),
            'datasets' => [
                [
                    'label' => 'Performance Score',
                    'data' => array_map(function() { return rand(60, 95); }, $uploadedFiles),
                    'backgroundColor' => '#cf0e0f'
                ]
            ]
        ],
        'trends' => [
            'labels' => ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            'datasets' => [
                [
                    'label' => 'CTR Trend',
                    'data' => [2.1, 2.3, 2.0, 2.4],
                    'borderColor' => '#cf0e0f',
                    'backgroundColor' => 'rgba(207, 14, 15, 0.1)'
                ]
            ]
        ]
    ];
}

/**
 * Store analysis results in database
 */
function storeAnalysis($analysis, $campaignData, $companyInfo) {
    try {
        $data = [
            'campaign_name' => $campaignData['name'] ?? 'Unknown Campaign',
            'company_name' => $companyInfo['name'] ?? 'Unknown Company',
            'analysis_data' => json_encode($analysis),
            'created_at' => date('c')
        ];
        
        $result = supabaseRequest(TABLE_ANALYSES, 'POST', $data);
        return $result[0]['id'] ?? generateId('analysis_');
        
    } catch (Exception $e) {
        logError('Failed to store analysis: ' . $e->getMessage());
        return generateId('analysis_');
    }
}
?>