<?php
/**
 * AI Models API endpoint
 * Returns available AI models and their configuration status
 */

require_once 'config.php';
require_once 'ai-models-config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Get all available models
    $models = getAvailableModels();
    
    // Get current default model
    $defaultModel = $_ENV['DEFAULT_AI_MODEL'] ?? 'claude-sonnet-4-20250514';
    
    sendResponse(true, [
        'models' => $models,
        'defaultModel' => $defaultModel
    ], 'Models retrieved successfully');
    
} catch (Exception $e) {
    logError('Error in models.php: ' . $e->getMessage());
    sendResponse(false, null, 'Failed to retrieve models: ' . $e->getMessage(), 500);
}