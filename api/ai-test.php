<?php
/**
 * AI Testing API endpoint
 * For testing AI models and configurations from Schema Admin
 */

require_once 'config.php';
require_once 'ai-models-config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
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

    validateRequired($input, ['prompt']);
    
    $prompt = $input['prompt'];
    $modelId = $input['model'] ?? $_ENV['DEFAULT_AI_MODEL'] ?? 'claude-sonnet-4-20250514';
    $temperature = $input['temperature'] ?? 0.5;
    $maxTokens = $input['maxTokens'] ?? 2048;
    
    // Call the AI model
    $response = callAIModel($modelId, $prompt, $temperature, $maxTokens);
    
    // Get model configuration for response metadata
    $modelConfig = getAIModelConfig($modelId);
    
    sendResponse(true, [
        'response' => $response,
        'model' => [
            'id' => $modelId,
            'name' => $modelConfig['name'],
            'provider' => $modelConfig['provider']
        ],
        'configuration' => [
            'temperature' => $temperature,
            'maxTokens' => $maxTokens
        ],
        'timestamp' => date('c')
    ], 'AI test completed successfully');

} catch (Exception $e) {
    logError('Error in ai-test.php: ' . $e->getMessage());
    sendResponse(false, null, 'AI test failed: ' . $e->getMessage(), 500);
}