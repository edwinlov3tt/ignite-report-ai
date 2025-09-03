<?php
/**
 * Test Runner Script
 * Phase 3: Testing & Validation Suite
 * Report.AI Production Testing
 */

// Set error reporting for testing
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Load environment variables
if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && !str_starts_with(trim($line), '#')) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

echo "🧪 Report.AI Test Runner\n";
echo "========================\n";
echo "Environment: " . (isset($_ENV['ANTHROPIC_API_KEY']) ? "Production" : "Development") . "\n";
echo "Timestamp: " . date('Y-m-d H:i:s T') . "\n\n";

// Include and run test suite
require_once 'TestSuite.php';

$testSuite = new TestSuite();
$success = $testSuite->runAllTests();

// Exit with appropriate code
exit($success ? 0 : 1);
?>