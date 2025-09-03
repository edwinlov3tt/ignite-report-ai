<?php
/**
 * Simplified Test Suite for Core Components
 * Phase 3: Testing & Validation - CLI Safe Version
 */

// Isolated testing - only test core classes without HTTP dependencies
class SimpleTestSuite {
    private $results = [];
    private $startTime;
    private $testCount = 0;
    private $passCount = 0;
    private $failCount = 0;

    public function __construct() {
        $this->startTime = microtime(true);
        echo "🧪 Report.AI Core Component Testing Suite\n";
        echo "========================================\n\n";
    }

    public function runCoreTests() {
        echo "🚀 Starting core component tests...\n\n";

        // Basic Infrastructure Tests
        $this->testDatabaseConnection();
        $this->testFileSystem();
        $this->testEnvironmentVariables();
        
        // Core Class Tests (without HTTP dependencies)
        $this->testDatabaseClass();
        $this->testSystemMonitorClass();
        $this->testCacheManagerClass();
        
        // Schema and Migration Tests
        $this->testDatabaseSchema();
        $this->testMigrationFiles();
        
        $this->generateReport();
    }

    private function test($name, $callback) {
        $this->testCount++;
        echo "🔍 Testing: $name... ";
        
        try {
            $result = $callback();
            if ($result === true) {
                $this->passCount++;
                echo "✅ PASS\n";
                $this->results[] = ['test' => $name, 'status' => 'PASS'];
            } else {
                $this->failCount++;
                echo "❌ FAIL: $result\n";
                $this->results[] = ['test' => $name, 'status' => 'FAIL', 'error' => $result];
            }
        } catch (Exception $e) {
            $this->failCount++;
            echo "❌ EXCEPTION: " . $e->getMessage() . "\n";
            $this->results[] = ['test' => $name, 'status' => 'EXCEPTION', 'error' => $e->getMessage()];
        }
    }

    private function testDatabaseConnection() {
        $this->test("Database Connection", function() {
            // Load environment
            if (file_exists(dirname(__DIR__) . '/.env')) {
                $lines = file(dirname(__DIR__) . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    if (strpos($line, '=') !== false && !str_starts_with(trim($line), '#')) {
                        list($key, $value) = explode('=', $line, 2);
                        $_ENV[trim($key)] = trim($value);
                    }
                }
            }
            
            $host = $_ENV['DB_HOST'] ?? 'localhost';
            $database = $_ENV['DB_NAME'] ?? '';
            $username = $_ENV['DB_USER'] ?? '';
            $password = $_ENV['DB_PASS'] ?? '';
            
            if (empty($database) || empty($username)) {
                return "Database credentials not configured";
            }
            
            try {
                $pdo = new PDO("mysql:host=$host;dbname=$database", $username, $password);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                return true;
            } catch (PDOException $e) {
                return "Database connection failed: " . $e->getMessage();
            }
        });
    }

    private function testFileSystem() {
        $this->test("Critical File Structure", function() {
            $criticalFiles = [
                dirname(__DIR__) . '/api/Database.php',
                dirname(__DIR__) . '/api/core/SystemMonitor.php',
                dirname(__DIR__) . '/api/migrations/001_enhanced_ai_schema.sql',
                dirname(__DIR__) . '/config/cdn-config.js'
            ];
            
            foreach ($criticalFiles as $file) {
                if (!file_exists($file)) {
                    return "Missing critical file: " . basename($file);
                }
            }
            return true;
        });
    }

    private function testEnvironmentVariables() {
        $this->test("Environment Configuration", function() {
            $envFile = dirname(__DIR__) . '/.env';
            if (!file_exists($envFile)) {
                return "Environment file (.env) not found";
            }
            
            $content = file_get_contents($envFile);
            $requiredVars = ['ANTHROPIC_API_KEY', 'DB_HOST', 'DB_NAME', 'DB_USER'];
            
            foreach ($requiredVars as $var) {
                if (strpos($content, $var) === false) {
                    return "Missing environment variable: $var";
                }
            }
            return true;
        });
    }

    private function testDatabaseClass() {
        $this->test("Database Class Functionality", function() {
            if (!class_exists('Database')) {
                require_once dirname(__DIR__) . '/api/Database.php';
            }
            
            try {
                $db = new Database();
                return method_exists($db, 'getConnection') ? true : "Database class missing getConnection method";
            } catch (Exception $e) {
                return "Database class instantiation failed: " . $e->getMessage();
            }
        });
    }

    private function testSystemMonitorClass() {
        $this->test("SystemMonitor Class", function() {
            $monitorFile = dirname(__DIR__) . '/api/core/SystemMonitor.php';
            if (!file_exists($monitorFile)) {
                return "SystemMonitor.php not found";
            }
            
            $content = file_get_contents($monitorFile);
            $requiredMethods = ['performHealthCheck', 'getDatabaseMetrics', 'getCacheMetrics'];
            
            foreach ($requiredMethods as $method) {
                if (strpos($content, $method) === false) {
                    return "SystemMonitor missing method: $method";
                }
            }
            return true;
        });
    }

    private function testCacheManagerClass() {
        $this->test("PerformanceCacheManager Class", function() {
            $cacheFile = dirname(__DIR__) . '/api/core/PerformanceCacheManager.php';
            if (!file_exists($cacheFile)) {
                return "PerformanceCacheManager.php not found";
            }
            
            $content = file_get_contents($cacheFile);
            $requiredMethods = ['get', 'set', 'invalidate'];
            
            foreach ($requiredMethods as $method) {
                if (strpos($content, "function $method") === false) {
                    return "PerformanceCacheManager missing method: $method";
                }
            }
            return true;
        });
    }

    private function testDatabaseSchema() {
        $this->test("Enhanced Database Schema", function() {
            $schemaFile = dirname(__DIR__) . '/api/migrations/001_enhanced_ai_schema.sql';
            if (!file_exists($schemaFile)) {
                return "Schema migration file not found";
            }
            
            $schema = file_get_contents($schemaFile);
            $requiredTables = [
                'tactic_ai_context',
                'ai_prompt_templates',
                'analysis_performance', 
                'ai_context_cache',
                'campaigns_enhanced',
                'analysis_jobs'
            ];
            
            foreach ($requiredTables as $table) {
                if (strpos($schema, $table) === false) {
                    return "Schema missing table: $table";
                }
            }
            return true;
        });
    }

    private function testMigrationFiles() {
        $this->test("Migration System", function() {
            $migrationDir = dirname(__DIR__) . '/api/migrations/';
            $runnerFile = dirname(__DIR__) . '/api/run-migration.php';
            
            if (!is_dir($migrationDir)) {
                return "Migration directory not found";
            }
            
            if (!file_exists($runnerFile)) {
                return "Migration runner not found";
            }
            
            $migrations = glob($migrationDir . '*.sql');
            return count($migrations) >= 3 ? true : "Insufficient migration files found";
        });
    }

    private function generateReport() {
        $duration = microtime(true) - $this->startTime;
        
        echo "\n📊 CORE COMPONENT TEST RESULTS\n";
        echo "==============================\n";
        echo "Total Tests: {$this->testCount}\n";
        echo "✅ Passed: {$this->passCount}\n";
        echo "❌ Failed: {$this->failCount}\n";
        echo "⏱️  Duration: " . round($duration, 2) . " seconds\n";
        echo "🎯 Success Rate: " . round(($this->passCount / $this->testCount) * 100, 1) . "%\n\n";

        if ($this->failCount > 0) {
            echo "❌ FAILED TESTS:\n";
            echo "--------------\n";
            foreach ($this->results as $result) {
                if ($result['status'] !== 'PASS') {
                    echo "• {$result['test']}: {$result['status']}";
                    if (isset($result['error'])) {
                        echo " - {$result['error']}";
                    }
                    echo "\n";
                }
            }
            echo "\n";
        }

        if ($this->passCount === $this->testCount) {
            echo "🎉 ALL CORE TESTS PASSED - SYSTEM FOUNDATION IS SOLID!\n";
            echo "✨ Ready to proceed with Phase 4: Production Deployment\n\n";
            return true;
        } else {
            echo "⚠️  SOME TESTS FAILED - REVIEW REQUIRED\n\n";
            return false;
        }
    }
}

// Auto-run if called directly
if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
    $testSuite = new SimpleTestSuite();
    $success = $testSuite->runCoreTests();
    exit($success ? 0 : 1);
}

?>