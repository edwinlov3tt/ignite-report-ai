<?php
/**
 * Enhanced Campaign Analysis API v2
 * Features context-aware AI integration with schema intelligence
 * 
 * This endpoint orchestrates the complete AI analysis pipeline:
 * 1. Campaign data processing and validation
 * 2. Schema-aware tactic detection and enrichment  
 * 3. Context building and inheritance
 * 4. Intelligent model selection
 * 5. Advanced prompt construction
 * 6. AI analysis execution with streaming support
 * 7. Response processing and validation
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../Database.php';
require_once '../core/AdvancedAnalysisOrchestrator.php';

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
    
    // Validate required fields
    $requiredFields = ['campaignData', 'companyInfo', 'aiConfig'];
    foreach ($requiredFields as $field) {
        if (!isset($input[$field])) {
            throw new Exception("Missing required field: {$field}", 400);
        }
    }
    
    // Initialize analysis orchestrator
    $orchestrator = new AdvancedAnalysisOrchestrator();
    
    // Generate unique analysis ID
    $analysisId = 'analysis_' . uniqid() . '_' . time();
    
    // Check if streaming is requested
    $streamingEnabled = $input['streamingEnabled'] ?? false;
    
    if ($streamingEnabled) {
        // Set up server-sent events for streaming
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Connection: keep-alive');
        
        // Start streaming analysis
        $result = $orchestrator->executeStreamingAnalysis($analysisId, $input);
        
    } else {
        // Execute standard analysis
        $result = $orchestrator->executeAnalysis($analysisId, $input);
        
        // Return complete analysis result
        echo json_encode([
            'success' => true,
            'data' => $result
        ], JSON_PRETTY_PRINT);
    }
    
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
    
    // Log error for debugging
    error_log("Campaign Analysis v2 Error: " . $e->getMessage() . " | " . $e->getTraceAsString());
}
?>