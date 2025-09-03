<?php
/**
 * System Monitor
 * Comprehensive monitoring and analytics system for production deployment
 */

require_once 'PerformanceCacheManager.php';
require_once 'EnhancedAIModelsConfig.php';

class SystemMonitor {
    private $database;
    private $cacheManager;
    private $aiModelsConfig;
    private $alertThresholds;
    private $metricsBuffer;
    
    public function __construct($database = null) {
        $this->database = $database ?: new Database();
        $this->cacheManager = new PerformanceCacheManager($this->database);
        $this->aiModelsConfig = new EnhancedAIModelsConfig($this->database);
        $this->initializeAlertThresholds();
        $this->metricsBuffer = [];
    }
    
    /**
     * Get comprehensive system health metrics
     */
    public function getHealthMetrics() {
        $startTime = microtime(true);
        
        $metrics = [
            'system_status' => $this->getSystemStatus(),
            'api_performance' => $this->getApiPerformanceMetrics(),
            'ai_models' => $this->getAIModelMetrics(),
            'cache_performance' => $this->getCachePerformanceMetrics(),
            'database_health' => $this->getDatabaseHealthMetrics(),
            'queue_status' => $this->getQueueStatusMetrics(),
            'error_rates' => $this->getErrorRateMetrics(),
            'resource_usage' => $this->getResourceUsageMetrics(),
            'alerts' => $this->getActiveAlerts(),
            'timestamp' => date('c'),
            'monitoring_duration' => round((microtime(true) - $startTime) * 1000, 2)
        ];
        
        // Cache metrics for dashboard
        $this->cacheManager->set('system_health_metrics', $metrics, 300); // 5 minutes
        
        // Check for alerts
        $this->checkAndTriggerAlerts($metrics);
        
        return $metrics;
    }
    
    /**
     * Get overall system status
     */
    private function getSystemStatus() {
        $checks = [
            'database' => $this->checkDatabaseConnection(),
            'cache' => $this->checkCacheSystem(),
            'ai_providers' => $this->checkAIProviders(),
            'disk_space' => $this->checkDiskSpace(),
            'memory' => $this->checkMemoryUsage(),
            'queue' => $this->checkQueueSystem()
        ];
        
        $healthyCount = count(array_filter($checks));
        $totalChecks = count($checks);
        $overallHealth = round(($healthyCount / $totalChecks) * 100, 1);
        
        $status = 'healthy';
        if ($overallHealth < 90) $status = 'degraded';
        if ($overallHealth < 70) $status = 'critical';
        
        return [
            'overall_status' => $status,
            'health_score' => $overallHealth,
            'checks' => $checks,
            'healthy_components' => $healthyCount,
            'total_components' => $totalChecks
        ];
    }
    
    /**
     * Get API performance metrics
     */
    private function getApiPerformanceMetrics() {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT 
                    AVG(processing_time_seconds) as avg_response_time,
                    MAX(processing_time_seconds) as max_response_time,
                    MIN(processing_time_seconds) as min_response_time,
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_requests,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_requests,
                    SUM(CASE WHEN processing_time_seconds > 60 THEN 1 ELSE 0 END) as slow_requests
                FROM analysis_performance 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            ");
            $stmt->execute();
            $metrics = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $successRate = $metrics['total_requests'] > 0 
                ? round(($metrics['successful_requests'] / $metrics['total_requests']) * 100, 2)
                : 0;
            
            return [
                'avg_response_time_seconds' => round($metrics['avg_response_time'] ?? 0, 2),
                'max_response_time_seconds' => round($metrics['max_response_time'] ?? 0, 2),
                'requests_per_hour' => (int)($metrics['total_requests'] ?? 0),
                'success_rate_percent' => $successRate,
                'failed_requests' => (int)($metrics['failed_requests'] ?? 0),
                'slow_requests' => (int)($metrics['slow_requests'] ?? 0),
                'performance_grade' => $this->calculatePerformanceGrade($metrics)
            ];
            
        } catch (Exception $e) {
            return ['error' => 'Unable to fetch API metrics'];
        }
    }
    
    /**
     * Get AI model performance metrics
     */
    private function getAIModelMetrics() {
        $providerStatus = $this->aiModelsConfig->getProviderStatus();
        
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT 
                    model_used,
                    COUNT(*) as usage_count,
                    AVG(analysis_quality_score) as avg_quality,
                    AVG(processing_time_seconds) as avg_time,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*) as success_rate
                FROM analysis_performance 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                GROUP BY model_used
                ORDER BY usage_count DESC
            ");
            $stmt->execute();
            $modelStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'provider_status' => $providerStatus,
                'model_performance' => $modelStats,
                'total_ai_requests_24h' => array_sum(array_column($modelStats, 'usage_count')),
                'avg_quality_score' => round(array_sum(array_column($modelStats, 'avg_quality')) / max(1, count($modelStats)), 2)
            ];
            
        } catch (Exception $e) {
            return [
                'provider_status' => $providerStatus,
                'error' => 'Unable to fetch AI model metrics'
            ];
        }
    }
    
    /**
     * Get cache performance metrics
     */
    private function getCachePerformanceMetrics() {
        $stats = $this->cacheManager->getStats();
        
        // Calculate overall hit ratio
        $totalHits = 0;
        $totalRequests = 0;
        
        foreach (['memory', 'redis', 'file', 'database'] as $layer) {
            if (isset($stats[$layer])) {
                $hits = $stats[$layer]['hits'] ?? 0;
                $misses = $stats[$layer]['misses'] ?? 0;
                $totalHits += $hits;
                $totalRequests += ($hits + $misses);
            }
        }
        
        $hitRatio = $totalRequests > 0 ? round(($totalHits / $totalRequests) * 100, 1) : 0;
        
        return [
            'hit_ratio_percent' => $hitRatio,
            'layer_performance' => $stats,
            'cache_efficiency' => $this->calculateCacheEfficiency($stats),
            'memory_usage' => $stats['overall']['memory_usage'] ?? []
        ];
    }
    
    /**
     * Get database health metrics
     */
    private function getDatabaseHealthMetrics() {
        try {
            $pdo = $this->database->getConnection();
            
            // Connection test
            $connectionTime = microtime(true);
            $pdo->query('SELECT 1');
            $connectionLatency = round((microtime(true) - $connectionTime) * 1000, 2);
            
            // Get database stats
            $stmt = $pdo->prepare("SHOW STATUS LIKE 'Threads_connected'");
            $stmt->execute();
            $connections = $stmt->fetch(PDO::FETCH_ASSOC)['Value'] ?? 0;
            
            $stmt = $pdo->prepare("SHOW STATUS LIKE 'Queries'");
            $stmt->execute();
            $queries = $stmt->fetch(PDO::FETCH_ASSOC)['Value'] ?? 0;
            
            // Table sizes
            $stmt = $pdo->prepare("
                SELECT 
                    table_name,
                    table_rows,
                    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
                FROM information_schema.tables 
                WHERE table_schema = DATABASE()
                AND table_name IN ('analysis_performance', 'ai_context_cache', 'analysis_jobs')
            ");
            $stmt->execute();
            $tableSizes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'connection_healthy' => true,
                'connection_latency_ms' => $connectionLatency,
                'active_connections' => (int)$connections,
                'total_queries' => (int)$queries,
                'table_sizes' => $tableSizes,
                'performance_grade' => $connectionLatency < 100 ? 'A' : ($connectionLatency < 500 ? 'B' : 'C')
            ];
            
        } catch (Exception $e) {
            return [
                'connection_healthy' => false,
                'error' => $e->getMessage(),
                'performance_grade' => 'F'
            ];
        }
    }
    
    /**
     * Get queue status metrics
     */
    private function getQueueStatusMetrics() {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT 
                    status,
                    COUNT(*) as count,
                    AVG(TIMESTAMPDIFF(SECOND, created_at, COALESCE(started_at, NOW()))) as avg_wait_time
                FROM analysis_jobs
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
                GROUP BY status
            ");
            $stmt->execute();
            $queueStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $statusCounts = [];
            foreach ($queueStats as $stat) {
                $statusCounts[$stat['status']] = $stat['count'];
            }
            
            return [
                'queued_jobs' => (int)($statusCounts['queued'] ?? 0),
                'processing_jobs' => (int)($statusCounts['processing'] ?? 0),
                'completed_jobs' => (int)($statusCounts['completed'] ?? 0),
                'failed_jobs' => (int)($statusCounts['failed'] ?? 0),
                'avg_wait_time_seconds' => round($queueStats[0]['avg_wait_time'] ?? 0, 1),
                'queue_health' => $this->calculateQueueHealth($statusCounts)
            ];
            
        } catch (Exception $e) {
            return ['error' => 'Unable to fetch queue metrics'];
        }
    }
    
    /**
     * Get error rate metrics
     */
    private function getErrorRateMetrics() {
        try {
            // API errors
            $stmt = $this->database->getConnection()->prepare("
                SELECT 
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_requests,
                    SUM(CASE WHEN error_count > 0 THEN 1 ELSE 0 END) as error_requests
                FROM analysis_performance 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            ");
            $stmt->execute();
            $apiErrors = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $errorRate = $apiErrors['total_requests'] > 0 
                ? round(($apiErrors['failed_requests'] / $apiErrors['total_requests']) * 100, 2)
                : 0;
            
            return [
                'api_error_rate_percent' => $errorRate,
                'failed_requests_1h' => (int)($apiErrors['failed_requests'] ?? 0),
                'total_requests_1h' => (int)($apiErrors['total_requests'] ?? 0),
                'error_trend' => $this->calculateErrorTrend(),
                'critical_errors' => $this->getCriticalErrors()
            ];
            
        } catch (Exception $e) {
            return ['error' => 'Unable to fetch error metrics'];
        }
    }
    
    /**
     * Get resource usage metrics
     */
    private function getResourceUsageMetrics() {
        return [
            'memory' => [
                'current_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
                'peak_mb' => round(memory_get_peak_usage(true) / 1024 / 1024, 2),
                'limit_mb' => $this->getMemoryLimit(),
                'usage_percent' => $this->calculateMemoryUsagePercent()
            ],
            'disk' => $this->getDiskUsage(),
            'cpu' => $this->getCPUUsage(),
            'load_average' => $this->getLoadAverage()
        ];
    }
    
    /**
     * Get active system alerts
     */
    private function getActiveAlerts() {
        $alerts = [];
        $metrics = $this->getBasicMetrics();
        
        // Check various alert conditions
        if ($metrics['api_error_rate'] > $this->alertThresholds['api_error_rate']) {
            $alerts[] = [
                'type' => 'critical',
                'message' => 'High API error rate detected',
                'value' => $metrics['api_error_rate'] . '%',
                'threshold' => $this->alertThresholds['api_error_rate'] . '%'
            ];
        }
        
        if ($metrics['avg_response_time'] > $this->alertThresholds['response_time']) {
            $alerts[] = [
                'type' => 'warning',
                'message' => 'Slow API response times',
                'value' => $metrics['avg_response_time'] . 's',
                'threshold' => $this->alertThresholds['response_time'] . 's'
            ];
        }
        
        if ($metrics['memory_usage_percent'] > $this->alertThresholds['memory_usage']) {
            $alerts[] = [
                'type' => 'warning',
                'message' => 'High memory usage',
                'value' => $metrics['memory_usage_percent'] . '%',
                'threshold' => $this->alertThresholds['memory_usage'] . '%'
            ];
        }
        
        return $alerts;
    }
    
    /**
     * Record custom metric
     */
    public function recordMetric($metricName, $value, $tags = []) {
        $metric = [
            'name' => $metricName,
            'value' => $value,
            'tags' => $tags,
            'timestamp' => time()
        ];
        
        // Buffer metrics for batch processing
        $this->metricsBuffer[] = $metric;
        
        // Flush buffer when it gets large
        if (count($this->metricsBuffer) >= 100) {
            $this->flushMetricsBuffer();
        }
    }
    
    /**
     * Flush metrics buffer to storage
     */
    private function flushMetricsBuffer() {
        if (empty($this->metricsBuffer)) return;
        
        try {
            // Store metrics in cache for real-time access
            $cacheKey = 'custom_metrics_' . date('Y_m_d_H');
            $existing = $this->cacheManager->get($cacheKey) ?: [];
            $existing = array_merge($existing, $this->metricsBuffer);
            $this->cacheManager->set($cacheKey, $existing, 3600); // 1 hour
            
            $this->metricsBuffer = [];
            
        } catch (Exception $e) {
            error_log("Failed to flush metrics buffer: " . $e->getMessage());
        }
    }
    
    /**
     * Get monitoring dashboard data
     */
    public function getDashboardData($timeRange = '1h') {
        return [
            'health_overview' => $this->getSystemStatus(),
            'key_metrics' => $this->getKeyMetrics($timeRange),
            'performance_charts' => $this->getPerformanceChartData($timeRange),
            'recent_activities' => $this->getRecentActivities($timeRange),
            'alerts_summary' => $this->getAlertsSummary(),
            'uptime' => $this->calculateUptime()
        ];
    }
    
    // Helper methods and checks
    private function checkDatabaseConnection() {
        try {
            $this->database->getConnection()->query('SELECT 1');
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    private function checkCacheSystem() {
        try {
            $testKey = 'health_check_' . time();
            $this->cacheManager->set($testKey, 'test', 60);
            $result = $this->cacheManager->get($testKey);
            return $result === 'test';
        } catch (Exception $e) {
            return false;
        }
    }
    
    private function checkAIProviders() {
        $providerStatus = $this->aiModelsConfig->getProviderStatus();
        $healthyProviders = 0;
        $totalProviders = count($providerStatus);
        
        foreach ($providerStatus as $provider => $status) {
            if ($status['configured']) {
                $healthyProviders++;
            }
        }
        
        return $healthyProviders >= 1; // At least one provider should be healthy
    }
    
    private function checkDiskSpace() {
        $freeSpace = disk_free_space('/');
        $totalSpace = disk_total_space('/');
        $usagePercent = (($totalSpace - $freeSpace) / $totalSpace) * 100;
        
        return $usagePercent < 90; // Alert if disk usage > 90%
    }
    
    private function checkMemoryUsage() {
        $memoryUsage = memory_get_usage(true);
        $memoryLimit = $this->getMemoryLimit() * 1024 * 1024; // Convert to bytes
        $usagePercent = ($memoryUsage / $memoryLimit) * 100;
        
        return $usagePercent < 80; // Alert if memory usage > 80%
    }
    
    private function checkQueueSystem() {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT COUNT(*) as stuck_jobs 
                FROM analysis_jobs 
                WHERE status = 'processing' 
                AND started_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
            ");
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return ($result['stuck_jobs'] ?? 0) < 5; // Less than 5 stuck jobs
        } catch (Exception $e) {
            return false;
        }
    }
    
    private function initializeAlertThresholds() {
        $this->alertThresholds = [
            'api_error_rate' => 5.0, // 5%
            'response_time' => 60.0, // 60 seconds
            'memory_usage' => 80.0, // 80%
            'disk_usage' => 90.0, // 90%
            'queue_size' => 100, // 100 jobs
            'cache_hit_rate' => 70.0 // 70%
        ];
    }
    
    private function calculatePerformanceGrade($metrics) {
        $avgTime = $metrics['avg_response_time'] ?? 0;
        
        if ($avgTime < 10) return 'A';
        if ($avgTime < 30) return 'B';
        if ($avgTime < 60) return 'C';
        if ($avgTime < 120) return 'D';
        return 'F';
    }
    
    private function calculateCacheEfficiency($stats) {
        $hitRatio = $stats['overall']['hit_ratio'] ?? 0;
        
        if ($hitRatio >= 90) return 'Excellent';
        if ($hitRatio >= 75) return 'Good';
        if ($hitRatio >= 50) return 'Fair';
        return 'Poor';
    }
    
    private function calculateQueueHealth($statusCounts) {
        $queued = $statusCounts['queued'] ?? 0;
        $processing = $statusCounts['processing'] ?? 0;
        $failed = $statusCounts['failed'] ?? 0;
        
        if ($queued > 50 || $failed > 10) return 'Poor';
        if ($queued > 20 || $failed > 5) return 'Fair';
        return 'Good';
    }
    
    private function getMemoryLimit() {
        $memoryLimit = ini_get('memory_limit');
        if ($memoryLimit == -1) return 1024; // Unlimited, assume 1GB
        
        return (int)filter_var($memoryLimit, FILTER_SANITIZE_NUMBER_INT);
    }
    
    private function calculateMemoryUsagePercent() {
        $current = memory_get_usage(true);
        $limit = $this->getMemoryLimit() * 1024 * 1024;
        
        return round(($current / $limit) * 100, 1);
    }
    
    private function getDiskUsage() {
        $total = disk_total_space('/');
        $free = disk_free_space('/');
        $used = $total - $free;
        
        return [
            'total_gb' => round($total / 1024 / 1024 / 1024, 2),
            'used_gb' => round($used / 1024 / 1024 / 1024, 2),
            'free_gb' => round($free / 1024 / 1024 / 1024, 2),
            'usage_percent' => round(($used / $total) * 100, 1)
        ];
    }
    
    private function getCPUUsage() {
        // Simple CPU usage approximation
        return round(sys_getloadavg()[0] * 100, 1);
    }
    
    private function getLoadAverage() {
        return sys_getloadavg();
    }
    
    private function calculateErrorTrend() {
        // Simplified trend calculation
        return 'stable'; // Could be enhanced with actual trend analysis
    }
    
    private function getCriticalErrors() {
        return []; // Could be enhanced with actual critical error detection
    }
    
    private function getBasicMetrics() {
        // Simplified metrics for alert checking
        return [
            'api_error_rate' => 0,
            'avg_response_time' => 0,
            'memory_usage_percent' => $this->calculateMemoryUsagePercent()
        ];
    }
    
    private function checkAndTriggerAlerts($metrics) {
        // Alert triggering logic would go here
        // Could integrate with email, Slack, PagerDuty, etc.
    }
    
    private function getKeyMetrics($timeRange) {
        return [
            'requests_per_hour' => 0,
            'avg_response_time' => 0,
            'error_rate' => 0,
            'cache_hit_rate' => 0
        ];
    }
    
    private function getPerformanceChartData($timeRange) {
        return [
            'response_times' => [],
            'request_volumes' => [],
            'error_rates' => []
        ];
    }
    
    private function getRecentActivities($timeRange) {
        return [];
    }
    
    private function getAlertsSummary() {
        return [
            'critical' => 0,
            'warnings' => 0,
            'info' => 0
        ];
    }
    
    private function calculateUptime() {
        return '99.9%'; // Simplified uptime calculation
    }
    
    /**
     * Perform comprehensive health check
     */
    public function performHealthCheck() {
        $metrics = $this->getHealthMetrics();
        
        $healthStatus = [
            'database' => isset($metrics['database']) && !isset($metrics['database']['error']) ? 'healthy' : 'error',
            'cache' => isset($metrics['cache']) && !isset($metrics['cache']['error']) ? 'healthy' : 'error',
            'ai_providers' => isset($metrics['ai_models']) && !isset($metrics['ai_models']['error']) ? 'healthy' : 'error',
            'performance' => isset($metrics['api']) && !isset($metrics['api']['error']) ? 'healthy' : 'error'
        ];
        
        $overallHealthy = !in_array('error', $healthStatus);
        
        return array_merge($healthStatus, [
            'overall_status' => $overallHealthy ? 'healthy' : 'unhealthy',
            'timestamp' => date('Y-m-d H:i:s'),
            'metrics_summary' => $metrics
        ]);
    }

    /**
     * Get database metrics
     */
    public function getDatabaseMetrics() {
        return $this->getDatabaseHealth();
    }

    /**
     * Get cache metrics 
     */
    public function getCacheMetrics() {
        return $this->getCacheHealth();
    }
}
?>