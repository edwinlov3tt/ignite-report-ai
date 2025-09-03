<?php
/**
 * Configuration file for Report.AI
 */

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS headers for API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://ignite.edwinlovett.com');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Supabase configuration
define('SUPABASE_URL', 'https://your-project.supabase.co');
define('SUPABASE_ANON_KEY', 'your-anon-key-here');
define('SUPABASE_SERVICE_KEY', 'your-service-key-here'); // For server-side operations

// Load environment variables from .env file
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

// Anthropic API configuration
define('ANTHROPIC_API_KEY', $_ENV['ANTHROPIC_API_KEY'] ?? 'your-anthropic-api-key-here');
define('ANTHROPIC_API_URL', 'https://api.anthropic.com/v1/messages');

// Lumina API configuration
define('LUMINA_API_URL', 'https://api.edwinlovett.com/order');

// Application settings
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_FILE_TYPES', ['csv']);
define('UPLOAD_DIR', '../uploads/');

// Database tables (Supabase)
define('TABLE_CAMPAIGNS', 'campaigns');
define('TABLE_UPLOADS', 'uploads');
define('TABLE_ANALYSES', 'analyses');
define('TABLE_TACTICS', 'tactics');

/**
 * Send JSON response
 */
function sendResponse($success, $data = null, $message = null, $code = 200) {
    http_response_code($code);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('c')
    ]);
    exit();
}

/**
 * Validate required parameters
 */
function validateRequired($data, $required) {
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            sendResponse(false, null, "Missing required field: {$field}", 400);
        }
    }
}

/**
 * Sanitize input data
 */
function sanitizeInput($data) {
    if (is_array($data)) {
        return array_map('sanitizeInput', $data);
    }
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

/**
 * Make HTTP request with cURL
 */
function makeHttpRequest($url, $data = null, $headers = []) {
    $ch = curl_init();
    
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_SSL_VERIFYPEER => false
    ]);
    
    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, is_array($data) ? json_encode($data) : $data);
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    
    curl_close($ch);
    
    if ($error) {
        throw new Exception("HTTP request failed: {$error}");
    }
    
    return [
        'body' => $response,
        'code' => $httpCode
    ];
}

/**
 * Supabase API helper
 */
function supabaseRequest($endpoint, $method = 'GET', $data = null) {
    $url = SUPABASE_URL . '/rest/v1/' . $endpoint;
    
    $headers = [
        'Content-Type: application/json',
        'apikey: ' . SUPABASE_ANON_KEY,
        'Authorization: Bearer ' . SUPABASE_SERVICE_KEY
    ];
    
    $ch = curl_init();
    
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CUSTOMREQUEST => $method
    ]);
    
    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    
    curl_close($ch);
    
    if ($error) {
        throw new Exception("Supabase request failed: {$error}");
    }
    
    $decodedResponse = json_decode($response, true);
    
    if ($httpCode >= 400) {
        throw new Exception("Supabase error: " . ($decodedResponse['message'] ?? 'Unknown error'));
    }
    
    return $decodedResponse;
}

/**
 * Log error to file
 */
function logError($message, $context = []) {
    $logFile = '../logs/error.log';
    $timestamp = date('Y-m-d H:i:s');
    $contextStr = !empty($context) ? ' Context: ' . json_encode($context) : '';
    $logMessage = "[{$timestamp}] {$message}{$contextStr}" . PHP_EOL;
    
    // Create logs directory if it doesn't exist
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
}

/**
 * Generate unique ID
 */
function generateId($prefix = '') {
    return $prefix . uniqid() . '_' . random_int(1000, 9999);
}

/**
 * Validate file upload
 */
function validateFileUpload($file) {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('File upload error: ' . $file['error']);
    }
    
    if ($file['size'] > MAX_FILE_SIZE) {
        throw new Exception('File too large. Maximum size: ' . (MAX_FILE_SIZE / 1024 / 1024) . 'MB');
    }
    
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, ALLOWED_FILE_TYPES)) {
        throw new Exception('Invalid file type. Allowed types: ' . implode(', ', ALLOWED_FILE_TYPES));
    }
    
    return true;
}

/**
 * Create upload directory if it doesn't exist
 */
if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0777, true);
}

/**
 * Create logs directory if it doesn't exist
 */
if (!is_dir('../logs')) {
    mkdir('../logs', 0777, true);
}
?>