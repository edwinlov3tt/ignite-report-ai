<?php
/**
 * AI Models Configuration
 * Central configuration for all AI models and their settings
 */

// Load environment variables manually (more robust than parse_ini_file)
$envPath = dirname(__DIR__) . '/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Parse key=value pairs
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Remove quotes from value if present
            if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
                $value = substr($value, 1, -1);
            }
            
            $_ENV[$key] = $value;
        }
    }
}

// AI Model Definitions
$AI_MODELS = [
    'claude-sonnet-4-20250514' => [
        'provider' => 'anthropic',
        'name' => 'Claude Sonnet 4',
        'model_id' => 'claude-3-5-sonnet-20241022',
        'max_tokens' => 8192,
        'default_temperature' => 0.5,
        'api_key_env' => 'ANTHROPIC_API_KEY',
        'endpoint' => 'https://api.anthropic.com/v1/messages',
        'headers' => [
            'anthropic-version' => '2023-06-01',
            'anthropic-beta' => 'messages-2023-12-15'
        ],
        'description' => 'Advanced reasoning with balanced performance and speed'
    ],
    'claude-opus-4-1-20250805' => [
        'provider' => 'anthropic',
        'name' => 'Claude Opus 4.1',
        'model_id' => 'claude-3-opus-20240229',
        'max_tokens' => 4096,
        'default_temperature' => 0.5,
        'api_key_env' => 'ANTHROPIC_API_KEY',
        'endpoint' => 'https://api.anthropic.com/v1/messages',
        'headers' => [
            'anthropic-version' => '2023-06-01',
            'anthropic-beta' => 'messages-2023-12-15'
        ],
        'description' => 'Most capable model for complex analysis'
    ],
    'claude-3-7-sonnet-20250219' => [
        'provider' => 'anthropic',
        'name' => 'Claude 3.7 Sonnet',
        'model_id' => 'claude-3-sonnet-20240229',
        'max_tokens' => 4096,
        'default_temperature' => 0.5,
        'api_key_env' => 'ANTHROPIC_API_KEY',
        'endpoint' => 'https://api.anthropic.com/v1/messages',
        'headers' => [
            'anthropic-version' => '2023-06-01'
        ],
        'description' => 'Balanced performance for standard analysis'
    ],
    'gemini-2.5-pro' => [
        'provider' => 'google',
        'name' => 'Gemini 2.5 Pro',
        'model_id' => 'gemini-1.5-pro',
        'max_tokens' => 8192,
        'default_temperature' => 0.5,
        'api_key_env' => 'GOOGLE_AI_API_KEY',
        'endpoint' => 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
        'description' => 'Google\'s advanced model with multimodal capabilities'
    ],
    'gemini-2.5-flash-lite' => [
        'provider' => 'google',
        'name' => 'Gemini 2.5 Flash Lite',
        'model_id' => 'gemini-1.5-flash',
        'max_tokens' => 4096,
        'default_temperature' => 0.5,
        'api_key_env' => 'GOOGLE_AI_API_KEY',
        'endpoint' => 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
        'description' => 'Fast, efficient model for quick analysis'
    ],
    'gpt-5-2025-08-07' => [
        'provider' => 'openai',
        'name' => 'ChatGPT 5',
        'model_id' => 'gpt-4-turbo-preview',
        'max_tokens' => 4096,
        'default_temperature' => 0.5,
        'api_key_env' => 'OPENAI_API_KEY',
        'endpoint' => 'https://api.openai.com/v1/chat/completions',
        'description' => 'OpenAI\'s latest model with enhanced capabilities'
    ]
];

// Get default model from environment
$DEFAULT_MODEL = $_ENV['DEFAULT_AI_MODEL'] ?? 'claude-sonnet-4-20250514';

/**
 * Get AI model configuration
 */
function getAIModelConfig($modelId = null) {
    global $AI_MODELS, $DEFAULT_MODEL;
    
    if (!$modelId) {
        $modelId = $DEFAULT_MODEL;
    }
    
    if (!isset($AI_MODELS[$modelId])) {
        throw new Exception("Unknown AI model: $modelId");
    }
    
    $config = $AI_MODELS[$modelId];
    
    // Get API key
    $apiKeyEnv = $config['api_key_env'];
    $apiKey = $_ENV[$apiKeyEnv] ?? null;
    
    if (!$apiKey || $apiKey === 'your-' . strtolower($config['provider']) . '-api-key-here') {
        throw new Exception("API key not configured for {$config['provider']}. Please set {$apiKeyEnv} in .env file.");
    }
    
    $config['api_key'] = $apiKey;
    
    return $config;
}

/**
 * Get all available models
 */
function getAvailableModels() {
    global $AI_MODELS;
    
    $available = [];
    foreach ($AI_MODELS as $id => $config) {
        $apiKeyEnv = $config['api_key_env'];
        $apiKey = $_ENV[$apiKeyEnv] ?? null;
        
        // Check if API key is configured
        $isConfigured = $apiKey && !str_starts_with($apiKey, 'your-');
        
        $available[] = [
            'id' => $id,
            'name' => $config['name'],
            'provider' => $config['provider'],
            'description' => $config['description'],
            'configured' => $isConfigured
        ];
    }
    
    return $available;
}

/**
 * Call AI model API
 */
function callAIModel($modelId, $prompt, $temperature = null, $maxTokens = null) {
    $config = getAIModelConfig($modelId);
    
    $temperature = $temperature ?? $config['default_temperature'];
    $maxTokens = $maxTokens ?? $config['max_tokens'];
    
    switch ($config['provider']) {
        case 'anthropic':
            return callAnthropicAPI($config, $prompt, $temperature, $maxTokens);
        case 'google':
            return callGoogleAPI($config, $prompt, $temperature, $maxTokens);
        case 'openai':
            return callOpenAIAPI($config, $prompt, $temperature, $maxTokens);
        default:
            throw new Exception("Unsupported provider: {$config['provider']}");
    }
}

/**
 * Call Anthropic API
 */
function callAnthropicAPI($config, $prompt, $temperature, $maxTokens) {
    $headers = [
        'Content-Type: application/json',
        'x-api-key: ' . $config['api_key']
    ];
    
    // Add additional headers if specified
    if (isset($config['headers'])) {
        foreach ($config['headers'] as $key => $value) {
            $headers[] = "$key: $value";
        }
    }
    
    $data = [
        'model' => $config['model_id'],
        'max_tokens' => $maxTokens,
        'temperature' => $temperature,
        'messages' => [
            ['role' => 'user', 'content' => $prompt]
        ]
    ];
    
    $ch = curl_init($config['endpoint']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        $error = json_decode($response, true);
        throw new Exception("Anthropic API error: " . ($error['error']['message'] ?? $response));
    }
    
    $result = json_decode($response, true);
    return $result['content'][0]['text'] ?? '';
}

/**
 * Call Google AI API
 */
function callGoogleAPI($config, $prompt, $temperature, $maxTokens) {
    $endpoint = str_replace('{model}', $config['model_id'], $config['endpoint']);
    $endpoint .= '?key=' . $config['api_key'];
    
    $data = [
        'contents' => [
            [
                'parts' => [
                    ['text' => $prompt]
                ]
            ]
        ],
        'generationConfig' => [
            'temperature' => $temperature,
            'maxOutputTokens' => $maxTokens
        ]
    ];
    
    $ch = curl_init($endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        $error = json_decode($response, true);
        throw new Exception("Google AI API error: " . ($error['error']['message'] ?? $response));
    }
    
    $result = json_decode($response, true);
    return $result['candidates'][0]['content']['parts'][0]['text'] ?? '';
}

/**
 * Call OpenAI API
 */
function callOpenAIAPI($config, $prompt, $temperature, $maxTokens) {
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $config['api_key']
    ];
    
    $data = [
        'model' => $config['model_id'],
        'messages' => [
            ['role' => 'user', 'content' => $prompt]
        ],
        'temperature' => $temperature,
        'max_tokens' => $maxTokens
    ];
    
    $ch = curl_init($config['endpoint']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        $error = json_decode($response, true);
        throw new Exception("OpenAI API error: " . ($error['error']['message'] ?? $response));
    }
    
    $result = json_decode($response, true);
    return $result['choices'][0]['message']['content'] ?? '';
}