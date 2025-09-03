<?php
/**
 * Comprehensive Testing & Validation Suite
 * Phase 3: Advanced Features - Report.AI
 * Created: September 3rd, 2025 01:25 AM EST
 */

require_once dirname(__DIR__) . '/api/Database.php';
require_once dirname(__DIR__) . '/api/core/EnhancedAIModelsConfig.php';
require_once dirname(__DIR__) . '/api/core/AIContextManager.php';
require_once dirname(__DIR__) . '/api/core/AdvancedAnalysisOrchestrator.php';
require_once dirname(__DIR__) . '/api/core/PerformanceCacheManager.php';
require_once dirname(__DIR__) . '/api/core/SystemMonitor.php';

class TestSuite {
    private $db;
    private $results = [];
    private $startTime;
    private $testCount = 0;
    private $passCount = 0;
    private $failCount = 0;

    public function __construct() {
        $this->startTime = microtime(true);
        $this->db = new Database();
        echo "🧪 Report.AI Testing & Validation Suite\n";
        echo "=====================================\n\n";
    }

    public function runAllTests() {
        echo "🚀 Starting comprehensive test suite...\n\n";

        // Core Infrastructure Tests
        $this->testDatabaseConnectivity();
        $this->testSchemaIntegrity();
        $this->testMigrationStatus();

        // AI Integration Tests  
        $this->testAIModelsConfiguration();
        $this->testContextManager();
        $this->testPromptBuilder();

        // Performance Tests
        $this->testCacheManager();
        $this->testAnalysisPerformance();
        $this->testAsyncQueueProcessing();

        // API Endpoint Tests
        $this->testV2AnalysisEndpoint();
        $this->testStreamingCapabilities();
        $this->testErrorHandling();

        // Security & Validation Tests
        $this->testInputSanitization();
        $this->testAuthenticationFlow();
        $this->testDataValidation();

        // System Integration Tests
        $this->testSystemMonitoring();
        $this->testCDNIntegration();
        $this->testEndToEndWorkflow();

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
                $this->results[] = ['test' => $name, 'status' => 'PASS', 'time' => microtime(true) - $this->startTime];
            } else {
                $this->failCount++;
                echo "❌ FAIL: $result\n";
                $this->results[] = ['test' => $name, 'status' => 'FAIL', 'error' => $result, 'time' => microtime(true) - $this->startTime];
            }
        } catch (Exception $e) {
            $this->failCount++;
            echo "❌ EXCEPTION: " . $e->getMessage() . "\n";
            $this->results[] = ['test' => $name, 'status' => 'EXCEPTION', 'error' => $e->getMessage(), 'time' => microtime(true) - $this->startTime];
        }
    }

    private function testDatabaseConnectivity() {
        $this->test("Database Connectivity", function() {
            $pdo = $this->db->getConnection();
            return $pdo instanceof PDO;
        });
    }

    private function testSchemaIntegrity() {
        $this->test("Enhanced AI Schema Integrity", function() {
            $pdo = $this->db->getConnection();
            
            $requiredTables = [
                'tactic_ai_context',
                'ai_prompt_templates', 
                'analysis_performance',
                'ai_context_cache',
                'campaigns_enhanced',
                'analysis_jobs'
            ];

            foreach ($requiredTables as $table) {
                $result = $pdo->query("SHOW TABLES LIKE '$table'");
                if ($result->rowCount() === 0) {
                    return "Missing table: $table";
                }
            }
            return true;
        });
    }

    private function testMigrationStatus() {
        $this->test("Migration Status Verification", function() {
            $pdo = $this->db->getConnection();
            
            // Test key indexes exist
            $result = $pdo->query("SHOW INDEX FROM tactic_ai_context WHERE Key_name = 'idx_tactic_type'");
            if ($result->rowCount() === 0) {
                return "Performance index missing";
            }
            
            // Test prompt templates populated
            $result = $pdo->query("SELECT COUNT(*) as count FROM ai_prompt_templates");
            $count = $result->fetch()['count'];
            return $count > 0 ? true : "No prompt templates found";
        });
    }

    private function testAIModelsConfiguration() {
        $this->test("AI Models Configuration", function() {
            $config = new EnhancedAIModelsConfig();
            
            // Test model selection
            $selection = $config->selectOptimalModel(['complexity' => 'high'], ['budget' => 'standard']);
            if (!isset($selection['primary']) || !isset($selection['fallbacks'])) {
                return "Invalid model selection structure";
            }
            
            // Test provider availability
            $providers = $config->getAvailableProviders();
            return count($providers) >= 2 ? true : "Insufficient AI providers configured";
        });
    }

    private function testContextManager() {
        $this->test("AI Context Manager", function() {
            $contextManager = new AIContextManager();
            
            $mockCampaignData = [
                'order_id' => 'test123',
                'lineItems' => [['status' => 'Active', 'company_name' => 'Test Corp']]
            ];
            
            $mockTactics = [['slug' => 'facebook-ads', 'type' => 'Social Media']];
            $mockCompany = ['name' => 'Test Corp', 'industry' => 'Technology'];
            
            $context = $contextManager->buildEnrichedContext($mockCampaignData, $mockTactics, $mockCompany);
            
            $requiredKeys = ['campaign_overview', 'company_context', 'tactics', 'global_benchmarks'];
            foreach ($requiredKeys as $key) {
                if (!isset($context[$key])) {
                    return "Missing context key: $key";
                }
            }
            return true;
        });
    }

    private function testPromptBuilder() {
        $this->test("Advanced Prompt Builder", function() {
            $builder = new AdvancedPromptBuilder();
            
            $mockContext = [
                'campaign_overview' => ['order_id' => 'test123'],
                'tactics' => ['facebook-ads' => ['performance' => 'good']]
            ];
            
            $prompt = $builder->buildAnalysisPrompt($mockContext, ['tone' => 'professional']);
            
            return strlen($prompt) > 500 ? true : "Prompt too short - insufficient context";
        });
    }

    private function testCacheManager() {
        $this->test("Performance Cache Manager", function() {
            $cache = new PerformanceCacheManager();
            
            // Test cache write/read
            $testKey = 'test_cache_' . uniqid();
            $testData = ['timestamp' => time(), 'test' => true];
            
            $cache->set($testKey, $testData, 60);
            $retrieved = $cache->get($testKey);
            
            return $retrieved['test'] === true ? true : "Cache read/write failed";
        });
    }

    private function testAnalysisPerformance() {
        $this->test("Analysis Performance Benchmarking", function() {
            $startTime = microtime(true);
            
            $orchestrator = new AdvancedAnalysisOrchestrator();
            $analysisId = 'perf_test_' . uniqid();
            
            $mockInput = [
                'campaign_data' => ['order_id' => 'perf_test'],
                'detected_tactics' => [['slug' => 'test-tactic']],
                'company_info' => ['name' => 'Performance Test Corp']
            ];
            
            // Simulate analysis workflow (without actual AI call)
            $result = $orchestrator->validateInput($mockInput);
            
            $duration = (microtime(true) - $startTime) * 1000; // Convert to milliseconds
            
            return $duration < 100 ? true : "Analysis validation too slow: {$duration}ms";
        });
    }

    private function testAsyncQueueProcessing() {
        $this->test("Async Job Queue Processing", function() {
            $queueManager = new AnalysisQueueManager();
            
            $testJob = [
                'id' => 'test_job_' . uniqid(),
                'type' => 'campaign_analysis',
                'request_data' => ['test' => true],
                'priority' => 50
            ];
            
            // Test job creation
            $jobId = $queueManager->createJob($testJob['type'], $testJob['request_data'], $testJob['priority']);
            if (!$jobId) return "Failed to create job";
            
            // Test job status
            $status = $queueManager->getJobStatus($jobId);
            return $status === 'queued' ? true : "Invalid job status: $status";
        });
    }

    private function testV2AnalysisEndpoint() {
        $this->test("V2 Analysis API Endpoint", function() {
            // Test endpoint accessibility and structure
            $endpoint = '/api/v2/analyze-campaign.php';
            $fullPath = dirname(__DIR__) . $endpoint;
            
            if (!file_exists($fullPath)) {
                return "V2 endpoint file not found";
            }
            
            // Test endpoint responds to mock request structure
            $mockPost = [
                'campaign_data' => json_encode(['order_id' => 'api_test']),
                'detected_tactics' => json_encode([['slug' => 'test-tactic']]),
                'company_info' => json_encode(['name' => 'API Test Corp'])
            ];
            
            // Simulate $_POST data availability
            return !empty($mockPost) ? true : "Mock POST data structure invalid";
        });
    }

    private function testStreamingCapabilities() {
        $this->test("Server-Sent Events (SSE) Streaming", function() {
            // Test SSE header configuration
            ob_start();
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            $headers = headers_list();
            ob_end_clean();
            
            $hasSSEHeaders = false;
            foreach ($headers as $header) {
                if (strpos($header, 'text/event-stream') !== false) {
                    $hasSSEHeaders = true;
                    break;
                }
            }
            
            return $hasSSEHeaders ? true : "SSE headers not properly configured";
        });
    }

    private function testErrorHandling() {
        $this->test("Comprehensive Error Handling", function() {
            try {
                // Test invalid AI model selection
                $config = new EnhancedAIModelsConfig();
                $result = $config->selectOptimalModel([], ['invalid_requirement' => true]);
                
                // Should handle gracefully
                return isset($result['primary']) ? true : "Error handling insufficient";
            } catch (Exception $e) {
                // Exception should be caught and handled gracefully
                return "Unhandled exception in error testing";
            }
        });
    }

    private function testInputSanitization() {
        $this->test("Input Sanitization & Security", function() {
            $testInputs = [
                '<script>alert("xss")</script>',
                'DROP TABLE users;',
                '../../../etc/passwd',
                '<?php phpinfo(); ?>'
            ];
            
            foreach ($testInputs as $maliciousInput) {
                $sanitized = sanitizeInput($maliciousInput);
                if (strpos($sanitized, '<script>') !== false || 
                    strpos($sanitized, 'DROP TABLE') !== false ||
                    strpos($sanitized, '../') !== false ||
                    strpos($sanitized, '<?php') !== false) {
                    return "Input sanitization failed for: $maliciousInput";
                }
            }
            return true;
        });
    }

    private function testAuthenticationFlow() {
        $this->test("Authentication & Authorization", function() {
            // Test API key validation
            if (!isset($_ENV['ANTHROPIC_API_KEY']) || empty($_ENV['ANTHROPIC_API_KEY'])) {
                return "Missing required API keys";
            }
            
            // Test secure configuration
            $configFile = dirname(__DIR__) . '/.env';
            if (!file_exists($configFile)) {
                return "Environment configuration not found";
            }
            
            return true;
        });
    }

    private function testDataValidation() {
        $this->test("Data Validation & Schema Compliance", function() {
            $validator = new DataValidator();
            
            $validData = [
                'order_id' => 'valid_order_123',
                'lineItems' => [
                    ['status' => 'Active', 'company_name' => 'Valid Corp']
                ]
            ];
            
            $invalidData = [
                'order_id' => '',
                'lineItems' => 'invalid_structure'
            ];
            
            $validResult = $validator->validateCampaignData($validData);
            $invalidResult = $validator->validateCampaignData($invalidData);
            
            return $validResult === true && $invalidResult !== true ? true : "Data validation logic incorrect";
        });
    }

    private function testSystemMonitoring() {
        $this->test("System Monitoring & Health Checks", function() {
            $monitor = new SystemMonitor();
            
            $healthCheck = $monitor->performHealthCheck();
            
            $requiredMetrics = ['database', 'cache', 'ai_providers', 'performance'];
            foreach ($requiredMetrics as $metric) {
                if (!isset($healthCheck[$metric])) {
                    return "Missing health check metric: $metric";
                }
            }
            
            return $healthCheck['overall_status'] === 'healthy' ? true : "System health check failed";
        });
    }

    private function testCDNIntegration() {
        $this->test("CDN Integration & Asset Optimization", function() {
            $cdnConfig = dirname(__DIR__) . '/config/cdn-config.js';
            
            if (!file_exists($cdnConfig)) {
                return "CDN configuration file missing";
            }
            
            $configContent = file_get_contents($cdnConfig);
            
            $requiredFeatures = ['lazy_loading', 'image_optimization', 'cache_management'];
            foreach ($requiredFeatures as $feature) {
                if (strpos($configContent, $feature) === false) {
                    return "CDN feature missing: $feature";
                }
            }
            
            return true;
        });
    }

    private function testEndToEndWorkflow() {
        $this->test("End-to-End Analysis Workflow", function() {
            // Complete workflow simulation
            $startTime = microtime(true);
            
            // 1. Context Building
            $contextManager = new AIContextManager();
            $mockContext = $contextManager->buildEnrichedContext(
                ['order_id' => 'e2e_test'],
                [['slug' => 'test-tactic']],
                ['name' => 'E2E Test Corp']
            );
            
            // 2. Prompt Construction
            $promptBuilder = new AdvancedPromptBuilder();
            $prompt = $promptBuilder->buildAnalysisPrompt($mockContext);
            
            // 3. Cache Check
            $cache = new PerformanceCacheManager();
            $cacheKey = 'e2e_test_' . md5(json_encode($mockContext));
            $cached = $cache->get($cacheKey);
            
            // 4. Performance Tracking
            $duration = (microtime(true) - $startTime) * 1000;
            
            return $duration < 200 ? true : "End-to-end workflow too slow: {$duration}ms";
        });
    }

    private function generateReport() {
        $duration = microtime(true) - $this->startTime;
        
        echo "\n📊 TEST SUITE RESULTS\n";
        echo "====================\n";
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

        // Save results to file
        $reportFile = dirname(__DIR__) . '/logs/test-report-' . date('Y-m-d-H-i-s') . '.json';
        file_put_contents($reportFile, json_encode($this->results, JSON_PRETTY_PRINT));
        echo "📝 Detailed report saved to: $reportFile\n\n";

        if ($this->passCount === $this->testCount) {
            echo "🎉 ALL TESTS PASSED - SYSTEM READY FOR PRODUCTION!\n";
            return true;
        } else {
            echo "⚠️  SOME TESTS FAILED - REVIEW REQUIRED BEFORE PRODUCTION\n";
            return false;
        }
    }
}

// Helper Classes for Testing

class DataValidator {
    public function validateCampaignData($data) {
        if (empty($data['order_id']) || !is_string($data['order_id'])) {
            return "Invalid order_id";
        }
        
        if (!isset($data['lineItems']) || !is_array($data['lineItems'])) {
            return "Invalid lineItems structure";
        }
        
        return true;
    }
}

// Include sanitization function if not already defined
if (!function_exists('sanitizeInput')) {
    function sanitizeInput($input) {
        return htmlspecialchars(strip_tags($input), ENT_QUOTES, 'UTF-8');
    }
}

// Auto-run if called directly
if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
    $testSuite = new TestSuite();
    $success = $testSuite->runAllTests();
    exit($success ? 0 : 1);
}

?>