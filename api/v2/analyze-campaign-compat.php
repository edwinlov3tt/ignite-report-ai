<?php
/**
 * Compatibility Bridge for v2 Analysis API
 * Adapts frontend payload to work with the enhanced v2 analysis system
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../Database.php';
require_once '../tactics.php';

try {
    // Validate request method
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method allowed', 405);
    }
    
    // Parse request data
    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON in request body', 400);
    }
    
    // Adapt frontend payload to v2 API format
    $adaptedPayload = [
        'campaignData' => $input['campaignData'] ?? [],
        'companyInfo' => $input['companyInfo'] ?? [],
        'aiConfig' => $input['aiConfig'] ?? [
            'model' => 'claude-sonnet-4-20250514',
            'temperature' => 0.7,
            'tone' => 'professional'
        ],
        'requirements' => []
    ];
    
    // Process uploaded files data if present
    if (!empty($input['uploadedFiles'])) {
        // Merge uploaded file data into campaign data for analysis
        $adaptedPayload['campaignData']['uploadedFiles'] = $input['uploadedFiles'];
        $adaptedPayload['campaignData']['hasFileData'] = true;
        
        // Calculate metrics from uploaded files
        $totalRows = 0;
        $fileCount = 0;
        foreach ($input['uploadedFiles'] as $tacticName => $files) {
            foreach ($files as $file) {
                $fileCount++;
                if (isset($file['data']) && is_array($file['data'])) {
                    $totalRows += count($file['data']);
                }
            }
        }
        $adaptedPayload['campaignData']['fileMetrics'] = [
            'totalFiles' => $fileCount,
            'totalDataRows' => $totalRows
        ];
    }
    
    // Include tactics if provided
    if (!empty($input['detectedTactics']) || !empty($input['tactics'])) {
        $tactics = $input['detectedTactics'] ?? $input['tactics'] ?? [];
        $adaptedPayload['campaignData']['detectedTactics'] = $tactics;
    }
    
    // Include market research context
    if (!empty($input['marketResearchContext'])) {
        $adaptedPayload['campaignData']['marketResearchContext'] = $input['marketResearchContext'];
    }
    
    // Include time range if provided
    if (!empty($input['timeRange'])) {
        $adaptedPayload['campaignData']['timeRange'] = $input['timeRange'];
    }
    
    // For now, fall back to the old analyze.php with enhanced processing
    // This ensures compatibility while we transition to the full v2 system
    
    // Build the analysis prompt using the old system's approach
    $campaignContext = buildCampaignContext($adaptedPayload['campaignData'], $adaptedPayload['companyInfo']);
    
    // Execute AI analysis using the old endpoint's logic
    $apiKey = $_ENV['ANTHROPIC_API_KEY'] ?? '';
    if (empty($apiKey)) {
        throw new Exception('AI API key not configured', 500);
    }
    
    // Construct the prompt
    $systemPrompt = "You are a digital marketing analyst specializing in comprehensive campaign performance analysis.";
    $userPrompt = buildAnalysisPrompt($campaignContext, $adaptedPayload['aiConfig']);
    
    // Call Claude API
    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01'
    ]);
    
    $requestData = [
        'model' => $adaptedPayload['aiConfig']['model'] ?? 'claude-3-sonnet-20240229',
        'max_tokens' => 4000,
        'temperature' => $adaptedPayload['aiConfig']['temperature'] ?? 0.7,
        'system' => $systemPrompt,
        'messages' => [
            ['role' => 'user', 'content' => $userPrompt]
        ]
    ];
    
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestData));
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        throw new Exception('AI service error: ' . $response, $httpCode);
    }
    
    $aiResponse = json_decode($response, true);
    if (!isset($aiResponse['content'][0]['text'])) {
        throw new Exception('Invalid AI response format', 500);
    }
    
    // Parse the AI response
    $analysisContent = $aiResponse['content'][0]['text'];
    $sections = parseAnalysisContent($analysisContent);
    
    // Return successful response
    echo json_encode([
        'success' => true,
        'data' => [
            'sections' => $sections,
            'metadata' => [
                'model_used' => $requestData['model'],
                'processing_time' => time(),
                'analysis_id' => 'compat_' . uniqid(),
                'prompt_tokens' => strlen($userPrompt),
                'files_analyzed' => $adaptedPayload['campaignData']['fileMetrics']['totalFiles'] ?? 0
            ]
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode([
        'success' => false,
        'error' => [
            'message' => $e->getMessage(),
            'code' => $e->getCode() ?: 500,
            'timestamp' => date('c')
        ]
    ], JSON_PRETTY_PRINT);
    
    error_log("Analysis Compatibility Error: " . $e->getMessage());
}

/**
 * Build campaign context for analysis
 */
function buildCampaignContext($campaignData, $companyInfo) {
    $context = [
        'campaign' => $campaignData,
        'company' => $companyInfo,
        'hasData' => !empty($campaignData['uploadedFiles'])
    ];
    
    return $context;
}

/**
 * Build analysis prompt
 */
function buildAnalysisPrompt($context, $aiConfig) {
    $tone = $aiConfig['tone'] ?? 'professional';
    $customInstructions = $aiConfig['customInstructions'] ?? '';
    
    $prompt = "Analyze this digital marketing campaign with a {$tone} tone.\n\n";
    
    if (!empty($customInstructions)) {
        $prompt .= "Additional instructions: {$customInstructions}\n\n";
    }
    
    $prompt .= "Campaign Context:\n" . json_encode($context, JSON_PRETTY_PRINT) . "\n\n";
    
    $prompt .= "Please provide a comprehensive analysis including:\n";
    $prompt .= "1. Executive Summary\n";
    $prompt .= "2. Performance Analysis\n";
    $prompt .= "3. Key Insights\n";
    $prompt .= "4. Recommendations\n";
    $prompt .= "5. Next Steps\n\n";
    $prompt .= "Format each section with clear headers using ### for section titles.";
    
    return $prompt;
}

/**
 * Parse AI analysis content into sections
 */
function parseAnalysisContent($content) {
    // Split content by section headers (### or ##)
    $sections = [];
    $lines = explode("\n", $content);
    $currentSection = '';
    $currentContent = [];
    
    foreach ($lines as $line) {
        if (preg_match('/^#{2,3}\s+(.+)/', $line, $matches)) {
            // Save previous section if exists
            if ($currentSection) {
                $sections[] = [
                    'title' => $currentSection,
                    'content' => implode("\n", $currentContent)
                ];
            }
            // Start new section
            $currentSection = trim($matches[1]);
            $currentContent = [];
        } else {
            $currentContent[] = $line;
        }
    }
    
    // Save last section
    if ($currentSection) {
        $sections[] = [
            'title' => $currentSection,
            'content' => implode("\n", $currentContent)
        ];
    }
    
    // If no sections found, create a single section
    if (empty($sections)) {
        $sections[] = [
            'title' => 'Analysis',
            'content' => $content
        ];
    }
    
    return $sections;
}

?>