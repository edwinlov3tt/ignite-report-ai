<?php
/**
 * Simple test endpoint to verify API is working
 */

require_once 'config.php';

try {
    // Test basic response
    $testData = [
        'message' => 'API is working correctly',
        'timestamp' => date('c'),
        'server_info' => [
            'php_version' => PHP_VERSION,
            'request_method' => $_SERVER['REQUEST_METHOD'],
            'request_uri' => $_SERVER['REQUEST_URI']
        ]
    ];
    
    sendResponse(true, $testData, 'Test successful');
    
} catch (Exception $e) {
    sendResponse(false, null, 'Test failed: ' . $e->getMessage(), 500);
}
?>