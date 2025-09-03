<?php
/**
 * Production Configuration Manager
 * Automated production environment setup and configuration
 * Phase 4: Production Deployment - Report.AI
 * Created: September 3rd, 2025 01:45 AM EST
 */

require_once 'Database.php';
require_once 'SystemMonitor.php';
require_once 'SecurityAuditor.php';

class ProductionConfigManager {
    private $database;
    private $systemMonitor;
    private $securityAuditor;
    private $configPath;
    private $productionConfig;
    private $setupResults = [];
    
    // Production configuration defaults
    private $defaultConfig = [
        'environment' => 'production',
        'debug_mode' => false,
        'error_reporting' => E_ERROR | E_WARNING,
        'display_errors' => false,
        'log_errors' => true,
        'max_execution_time' => 300,
        'memory_limit' => '512M',
        'upload_max_filesize' => '10M',
        'post_max_size' => '20M',
        'session_cookie_secure' => true,
        'session_cookie_httponly' => true,
        'session_use_strict_mode' => true,
        'opcache_enable' => true,
        'opcache_memory_consumption' => 128,
        'backup_enabled' => true,
        'backup_retention_days' => 30,
        'monitoring_enabled' => true,
        'health_check_interval' => 300, // 5 minutes
        'rate_limiting_enabled' => true,
        'rate_limit_requests_per_minute' => 100
    ];

    public function __construct($database = null) {
        $this->database = $database ?: new Database();
        $this->systemMonitor = new SystemMonitor($this->database);
        $this->securityAuditor = new SecurityAuditor($this->database);
        $this->configPath = dirname(dirname(__DIR__)) . '/config/production.json';
        $this->loadProductionConfig();
    }

    /**
     * Run complete production environment setup
     */
    public function setupProductionEnvironment() {
        echo "🚀 Setting Up Production Environment...\n";
        echo "======================================\n\n";
        
        $startTime = microtime(true);
        
        // Core setup tasks
        $this->setupDirectoryStructure();
        $this->configurePHPSettings();
        $this->setupErrorLogging();
        $this->setupPerformanceMonitoring();
        $this->setupBackupSystem();
        $this->setupHealthCheckEndpoints();
        $this->setupSecurityMeasures();
        $this->setupCacheConfiguration();
        $this->validateProductionReadiness();
        
        $duration = microtime(true) - $startTime;
        $this->generateSetupReport($duration);
        
        return [
            'setup_successful' => $this->isSetupSuccessful(),
            'setup_results' => $this->setupResults,
            'production_config' => $this->productionConfig,
            'setup_duration' => round($duration, 2)
        ];
    }

    private function loadProductionConfig() {
        if (file_exists($this->configPath)) {
            $this->productionConfig = array_merge(
                $this->defaultConfig,
                json_decode(file_get_contents($this->configPath), true) ?: []
            );
        } else {
            $this->productionConfig = $this->defaultConfig;
        }
    }

    private function setupDirectoryStructure() {
        echo "📁 Setting up directory structure... ";
        
        $directories = [
            'logs' => dirname(dirname(__DIR__)) . '/logs',
            'temp' => dirname(dirname(__DIR__)) . '/temp',
            'uploads' => dirname(dirname(__DIR__)) . '/uploads',
            'cache' => dirname(dirname(__DIR__)) . '/cache',
            'backups' => dirname(dirname(__DIR__)) . '/backups',
            'config' => dirname(dirname(__DIR__)) . '/config'
        ];
        
        $errors = 0;
        
        foreach ($directories as $name => $path) {
            if (!is_dir($path)) {
                if (!mkdir($path, 0755, true)) {
                    $errors++;
                    continue;
                }
            }
            
            // Set proper permissions
            chmod($path, 0755);
            
            // Create .htaccess for security
            if (in_array($name, ['logs', 'temp', 'uploads', 'backups'])) {
                $htaccessPath = $path . '/.htaccess';
                if (!file_exists($htaccessPath)) {
                    file_put_contents($htaccessPath, "Order Deny,Allow\nDeny from all\n");
                }
            }
            
            // Create index.php to prevent directory listing
            $indexPath = $path . '/index.php';
            if (!file_exists($indexPath)) {
                file_put_contents($indexPath, "<?php http_response_code(403); exit('Access denied'); ?>");
            }
        }
        
        $this->setupResults['directory_structure'] = $errors === 0 ? 'SUCCESS' : 'PARTIAL';
        echo $errors === 0 ? "✅ Success\n" : "⚠️  {$errors} errors\n";
    }

    private function configurePHPSettings() {
        echo "⚙️  Configuring PHP settings... ";
        
        $settings = [
            'display_errors' => $this->productionConfig['display_errors'] ? 'On' : 'Off',
            'log_errors' => $this->productionConfig['log_errors'] ? 'On' : 'Off',
            'max_execution_time' => $this->productionConfig['max_execution_time'],
            'memory_limit' => $this->productionConfig['memory_limit'],
            'upload_max_filesize' => $this->productionConfig['upload_max_filesize'],
            'post_max_size' => $this->productionConfig['post_max_size'],
            'session.cookie_secure' => $this->productionConfig['session_cookie_secure'] ? '1' : '0',
            'session.cookie_httponly' => $this->productionConfig['session_cookie_httponly'] ? '1' : '0',
            'session.use_strict_mode' => $this->productionConfig['session_use_strict_mode'] ? '1' : '0'
        ];
        
        $applied = 0;
        $total = count($settings);
        
        foreach ($settings as $setting => $value) {
            if (ini_set($setting, $value) !== false) {
                $applied++;
            }
        }
        
        // Set error reporting level
        error_reporting($this->productionConfig['error_reporting']);
        
        $this->setupResults['php_settings'] = $applied === $total ? 'SUCCESS' : 'PARTIAL';
        echo $applied === $total ? "✅ Success\n" : "⚠️  {$applied}/{$total} applied\n";
    }

    private function setupErrorLogging() {
        echo "📝 Setting up error logging... ";
        
        $logDir = dirname(dirname(__DIR__)) . '/logs';
        $errors = 0;
        
        // Configure PHP error log
        $errorLogPath = $logDir . '/php_errors.log';
        ini_set('error_log', $errorLogPath);
        
        if (!is_writable($logDir)) {
            chmod($logDir, 0755);
        }
        
        // Create log rotation script
        $rotateScript = $logDir . '/rotate_logs.sh';
        $rotateContent = "#!/bin/bash\n";
        $rotateContent .= "# Log rotation script - Generated by ProductionConfigManager\n";
        $rotateContent .= "cd " . $logDir . "\n";
        $rotateContent .= "find . -name '*.log' -size +10M -exec gzip {} \;\n";
        $rotateContent .= "find . -name '*.gz' -mtime +30 -delete\n";
        
        file_put_contents($rotateScript, $rotateContent);
        chmod($rotateScript, 0755);
        
        // Create custom error handler
        $errorHandlerPath = dirname(__DIR__) . '/core/ProductionErrorHandler.php';
        $this->createErrorHandler($errorHandlerPath);
        
        // Test logging
        $testLogPath = $logDir . '/application.log';
        $logEntry = date('Y-m-d H:i:s') . " [INFO] Production error logging setup completed\n";
        
        if (file_put_contents($testLogPath, $logEntry, FILE_APPEND | LOCK_EX) === false) {
            $errors++;
        }
        
        $this->setupResults['error_logging'] = $errors === 0 ? 'SUCCESS' : 'FAIL';
        echo $errors === 0 ? "✅ Success\n" : "❌ Failed\n";
    }

    private function createErrorHandler($filePath) {
        $errorHandlerContent = "<?php\n";
        $errorHandlerContent .= "/**\n * Production Error Handler\n * Custom error logging for production environment\n */\n\n";
        $errorHandlerContent .= "class ProductionErrorHandler {\n";
        $errorHandlerContent .= "    private static \$logPath;\n\n";
        $errorHandlerContent .= "    public static function init(\$logDir) {\n";
        $errorHandlerContent .= "        self::\$logPath = \$logDir . '/application.log';\n";
        $errorHandlerContent .= "        set_error_handler([__CLASS__, 'handleError']);\n";
        $errorHandlerContent .= "        set_exception_handler([__CLASS__, 'handleException']);\n";
        $errorHandlerContent .= "        register_shutdown_function([__CLASS__, 'handleFatalError']);\n";
        $errorHandlerContent .= "    }\n\n";
        $errorHandlerContent .= "    public static function handleError(\$errno, \$errstr, \$errfile, \$errline) {\n";
        $errorHandlerContent .= "        \$timestamp = date('Y-m-d H:i:s');\n";
        $errorHandlerContent .= "        \$level = self::getErrorLevel(\$errno);\n";
        $errorHandlerContent .= "        \$message = \"[\$timestamp] [\$level] \$errstr in \$errfile on line \$errline\";\n";
        $errorHandlerContent .= "        error_log(\$message . PHP_EOL, 3, self::\$logPath);\n";
        $errorHandlerContent .= "        return true;\n";
        $errorHandlerContent .= "    }\n\n";
        $errorHandlerContent .= "    public static function handleException(\$exception) {\n";
        $errorHandlerContent .= "        \$timestamp = date('Y-m-d H:i:s');\n";
        $errorHandlerContent .= "        \$message = \"[\$timestamp] [EXCEPTION] \" . \$exception->getMessage() . \" in \" . \$exception->getFile() . \" on line \" . \$exception->getLine();\n";
        $errorHandlerContent .= "        error_log(\$message . PHP_EOL, 3, self::\$logPath);\n";
        $errorHandlerContent .= "    }\n\n";
        $errorHandlerContent .= "    public static function handleFatalError() {\n";
        $errorHandlerContent .= "        \$error = error_get_last();\n";
        $errorHandlerContent .= "        if (\$error && in_array(\$error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR])) {\n";
        $errorHandlerContent .= "            \$timestamp = date('Y-m-d H:i:s');\n";
        $errorHandlerContent .= "            \$message = \"[\$timestamp] [FATAL] \" . \$error['message'] . \" in \" . \$error['file'] . \" on line \" . \$error['line'];\n";
        $errorHandlerContent .= "            error_log(\$message . PHP_EOL, 3, self::\$logPath);\n";
        $errorHandlerContent .= "        }\n";
        $errorHandlerContent .= "    }\n\n";
        $errorHandlerContent .= "    private static function getErrorLevel(\$errno) {\n";
        $errorHandlerContent .= "        switch (\$errno) {\n";
        $errorHandlerContent .= "            case E_ERROR: return 'ERROR';\n";
        $errorHandlerContent .= "            case E_WARNING: return 'WARNING';\n";
        $errorHandlerContent .= "            case E_NOTICE: return 'NOTICE';\n";
        $errorHandlerContent .= "            default: return 'UNKNOWN';\n";
        $errorHandlerContent .= "        }\n";
        $errorHandlerContent .= "    }\n";
        $errorHandlerContent .= "}\n";
        $errorHandlerContent .= "?>";
        
        file_put_contents($filePath, $errorHandlerContent);
    }

    private function setupPerformanceMonitoring() {
        echo "📊 Setting up performance monitoring... ";
        
        $monitoringDir = dirname(dirname(__DIR__)) . '/monitoring';
        if (!is_dir($monitoringDir)) {
            mkdir($monitoringDir, 0755, true);
        }
        
        // Create monitoring configuration
        $monitoringConfig = [
            'enabled' => $this->productionConfig['monitoring_enabled'],
            'health_check_interval' => $this->productionConfig['health_check_interval'],
            'metrics_retention_days' => 7,
            'alert_thresholds' => [
                'response_time_ms' => 1000,
                'error_rate_percent' => 5,
                'memory_usage_percent' => 80,
                'disk_usage_percent' => 85
            ],
            'notification_email' => 'admin@example.com'
        ];
        
        $configPath = $monitoringDir . '/config.json';
        file_put_contents($configPath, json_encode($monitoringConfig, JSON_PRETTY_PRINT));
        
        // Create monitoring cron script
        $cronScript = $monitoringDir . '/monitor.php';
        $this->createMonitoringScript($cronScript);
        
        $this->setupResults['performance_monitoring'] = 'SUCCESS';
        echo "✅ Success\n";
    }

    private function createMonitoringScript($filePath) {
        $scriptContent = "<?php\n";
        $scriptContent .= "/**\n * Production Monitoring Cron Script\n */\n\n";
        $scriptContent .= "require_once dirname(__DIR__) . '/api/core/SystemMonitor.php';\n\n";
        $scriptContent .= "\$monitor = new SystemMonitor();\n";
        $scriptContent .= "\$healthCheck = \$monitor->performHealthCheck();\n\n";
        $scriptContent .= "// Log results\n";
        $scriptContent .= "\$logEntry = date('Y-m-d H:i:s') . ' [MONITOR] ' . json_encode(\$healthCheck) . PHP_EOL;\n";
        $scriptContent .= "file_put_contents(dirname(__DIR__) . '/logs/monitoring.log', \$logEntry, FILE_APPEND | LOCK_EX);\n\n";
        $scriptContent .= "// Check for alerts\n";
        $scriptContent .= "if (\$healthCheck['overall_status'] !== 'healthy') {\n";
        $scriptContent .= "    // Send alert notification\n";
        $scriptContent .= "    error_log('ALERT: System health check failed - ' . json_encode(\$healthCheck));\n";
        $scriptContent .= "}\n";
        $scriptContent .= "?>";
        
        file_put_contents($filePath, $scriptContent);
        chmod($filePath, 0755);
    }

    private function setupBackupSystem() {
        echo "💾 Setting up backup system... ";
        
        if (!$this->productionConfig['backup_enabled']) {
            echo "⏩ Disabled\n";
            $this->setupResults['backup_system'] = 'DISABLED';
            return;
        }
        
        $backupDir = dirname(dirname(__DIR__)) . '/backups';
        $errors = 0;
        
        // Create backup script
        $backupScript = $backupDir . '/backup.sh';
        $backupContent = "#!/bin/bash\n";
        $backupContent .= "# Automated backup script - Generated by ProductionConfigManager\n";
        $backupContent .= "BACKUP_DIR=\"" . $backupDir . "\"\n";
        $backupContent .= "DATE=\$(date +%Y%m%d_%H%M%S)\n";
        $backupContent .= "RETENTION_DAYS=" . $this->productionConfig['backup_retention_days'] . "\n\n";
        $backupContent .= "# Database backup\n";
        $backupContent .= "mysqldump --single-transaction --routines --triggers \$DB_NAME > \$BACKUP_DIR/database_\$DATE.sql\n";
        $backupContent .= "gzip \$BACKUP_DIR/database_\$DATE.sql\n\n";
        $backupContent .= "# File backup\n";
        $backupContent .= "tar -czf \$BACKUP_DIR/files_\$DATE.tar.gz ../api ../config ../logs\n\n";
        $backupContent .= "# Cleanup old backups\n";
        $backupContent .= "find \$BACKUP_DIR -name '*.gz' -mtime +\$RETENTION_DAYS -delete\n";
        $backupContent .= "find \$BACKUP_DIR -name '*.tar.gz' -mtime +\$RETENTION_DAYS -delete\n";
        
        if (file_put_contents($backupScript, $backupContent) === false) {
            $errors++;
        } else {
            chmod($backupScript, 0755);
        }
        
        // Create backup restore script
        $restoreScript = $backupDir . '/restore.sh';
        $restoreContent = "#!/bin/bash\n";
        $restoreContent .= "# Backup restore script\n";
        $restoreContent .= "if [ -z \"\$1\" ]; then\n";
        $restoreContent .= "    echo \"Usage: \$0 <backup_date>\"\n";
        $restoreContent .= "    echo \"Available backups:\"\n";
        $restoreContent .= "    ls -la " . $backupDir . "/*.gz | awk '{print \$9}'\n";
        $restoreContent .= "    exit 1\n";
        $restoreContent .= "fi\n\n";
        $restoreContent .= "BACKUP_DATE=\$1\n";
        $restoreContent .= "echo \"Restoring backup from \$BACKUP_DATE...\"\n";
        $restoreContent .= "gunzip -c " . $backupDir . "/database_\$BACKUP_DATE.sql.gz | mysql \$DB_NAME\n";
        $restoreContent .= "tar -xzf " . $backupDir . "/files_\$BACKUP_DATE.tar.gz\n";
        $restoreContent .= "echo \"Restore completed.\"\n";
        
        if (file_put_contents($restoreScript, $restoreContent) === false) {
            $errors++;
        } else {
            chmod($restoreScript, 0755);
        }
        
        $this->setupResults['backup_system'] = $errors === 0 ? 'SUCCESS' : 'PARTIAL';
        echo $errors === 0 ? "✅ Success\n" : "⚠️  {$errors} errors\n";
    }

    private function setupHealthCheckEndpoints() {
        echo "🏥 Setting up health check endpoints... ";
        
        $healthCheckPath = dirname(__DIR__) . '/health-check.php';
        $healthCheckContent = "<?php\n";
        $healthCheckContent .= "/**\n * Production Health Check Endpoint\n * Returns system health status in JSON format\n */\n\n";
        $healthCheckContent .= "header('Content-Type: application/json');\n";
        $healthCheckContent .= "header('Cache-Control: no-cache, no-store, must-revalidate');\n\n";
        $healthCheckContent .= "require_once 'core/SystemMonitor.php';\n\n";
        $healthCheckContent .= "try {\n";
        $healthCheckContent .= "    \$monitor = new SystemMonitor();\n";
        $healthCheckContent .= "    \$healthCheck = \$monitor->performHealthCheck();\n";
        $healthCheckContent .= "    \$httpCode = \$healthCheck['overall_status'] === 'healthy' ? 200 : 503;\n";
        $healthCheckContent .= "    http_response_code(\$httpCode);\n";
        $healthCheckContent .= "    echo json_encode(\$healthCheck, JSON_PRETTY_PRINT);\n";
        $healthCheckContent .= "} catch (Exception \$e) {\n";
        $healthCheckContent .= "    http_response_code(500);\n";
        $healthCheckContent .= "    echo json_encode([\n";
        $healthCheckContent .= "        'status' => 'error',\n";
        $healthCheckContent .= "        'message' => 'Health check failed',\n";
        $healthCheckContent .= "        'timestamp' => date('Y-m-d H:i:s')\n";
        $healthCheckContent .= "    ], JSON_PRETTY_PRINT);\n";
        $healthCheckContent .= "}\n";
        $healthCheckContent .= "?>";
        
        $success = file_put_contents($healthCheckPath, $healthCheckContent) !== false;
        
        // Create status endpoint
        $statusPath = dirname(__DIR__) . '/status.php';
        $statusContent = "<?php\n";
        $statusContent .= "/**\n * Simple Status Endpoint\n * Quick status check without full health check\n */\n\n";
        $statusContent .= "header('Content-Type: application/json');\n";
        $statusContent .= "echo json_encode([\n";
        $statusContent .= "    'status' => 'online',\n";
        $statusContent .= "    'timestamp' => date('c'),\n";
        $statusContent .= "    'version' => '1.0.0',\n";
        $statusContent .= "    'environment' => 'production'\n";
        $statusContent .= "], JSON_PRETTY_PRINT);\n";
        $statusContent .= "?>";
        
        $success = $success && (file_put_contents($statusPath, $statusContent) !== false);
        
        $this->setupResults['health_check_endpoints'] = $success ? 'SUCCESS' : 'FAIL';
        echo $success ? "✅ Success\n" : "❌ Failed\n";
    }

    private function setupSecurityMeasures() {
        echo "🔐 Setting up security measures... ";
        
        // Run security audit and apply fixes
        $securityResults = $this->securityAuditor->runSecurityAudit();
        
        // Generate and apply security hardening
        $this->securityAuditor->generateHardeningScript();
        
        // Create security headers configuration
        $securityHeaders = dirname(__DIR__) . '/security-headers.php';
        $headersContent = "<?php\n";
        $headersContent .= "/**\n * Security Headers Configuration\n */\n\n";
        $headersContent .= "// Security headers\n";
        $headersContent .= "header('X-Content-Type-Options: nosniff');\n";
        $headersContent .= "header('X-Frame-Options: DENY');\n";
        $headersContent .= "header('X-XSS-Protection: 1; mode=block');\n";
        $headersContent .= "header('Referrer-Policy: strict-origin-when-cross-origin');\n";
        $headersContent .= "header('Content-Security-Policy: default-src \\'self\\'; script-src \\'self\\' \\'unsafe-inline\\'; style-src \\'self\\' \\'unsafe-inline\\';');\n\n";
        $headersContent .= "// HTTPS enforcement\n";
        $headersContent .= "if (!isset(\$_SERVER['HTTPS']) || \$_SERVER['HTTPS'] !== 'on') {\n";
        $headersContent .= "    \$redirectURL = 'https://' . \$_SERVER['HTTP_HOST'] . \$_SERVER['REQUEST_URI'];\n";
        $headersContent .= "    header(\"Location: \$redirectURL\");\n";
        $headersContent .= "    exit();\n";
        $headersContent .= "}\n";
        $headersContent .= "?>";
        
        $success = file_put_contents($securityHeaders, $headersContent) !== false;
        
        $this->setupResults['security_measures'] = $success && ($securityResults['security_score'] >= 75) ? 'SUCCESS' : 'PARTIAL';
        echo $success ? "✅ Success\n" : "⚠️  Partial\n";
    }

    private function setupCacheConfiguration() {
        echo "🚀 Setting up cache configuration... ";
        
        $cacheDir = dirname(dirname(__DIR__)) . '/cache';
        $errors = 0;
        
        // Create cache subdirectories
        $cacheDirs = ['templates', 'data', 'sessions', 'opcache'];
        foreach ($cacheDirs as $dir) {
            $fullPath = $cacheDir . '/' . $dir;
            if (!is_dir($fullPath)) {
                if (!mkdir($fullPath, 0755, true)) {
                    $errors++;
                }
            }
        }
        
        // Create cache configuration file
        $cacheConfig = [
            'default_ttl' => 3600,
            'max_memory_mb' => 128,
            'cleanup_probability' => 0.01,
            'redis' => [
                'enabled' => false,
                'host' => '127.0.0.1',
                'port' => 6379
            ],
            'opcache' => [
                'enabled' => $this->productionConfig['opcache_enable'],
                'memory_consumption' => $this->productionConfig['opcache_memory_consumption']
            ]
        ];
        
        $configPath = $cacheDir . '/config.json';
        if (file_put_contents($configPath, json_encode($cacheConfig, JSON_PRETTY_PRINT)) === false) {
            $errors++;
        }
        
        // Configure OPcache if enabled
        if ($this->productionConfig['opcache_enable']) {
            ini_set('opcache.enable', '1');
            ini_set('opcache.memory_consumption', $this->productionConfig['opcache_memory_consumption']);
            ini_set('opcache.interned_strings_buffer', '8');
            ini_set('opcache.max_accelerated_files', '4000');
            ini_set('opcache.validate_timestamps', '0'); // Disable for production
            ini_set('opcache.save_comments', '0');
        }
        
        $this->setupResults['cache_configuration'] = $errors === 0 ? 'SUCCESS' : 'PARTIAL';
        echo $errors === 0 ? "✅ Success\n" : "⚠️  {$errors} errors\n";
    }

    private function validateProductionReadiness() {
        echo "🎯 Validating production readiness... ";
        
        $checks = [
            'directory_structure' => $this->setupResults['directory_structure'] === 'SUCCESS',
            'php_settings' => $this->setupResults['php_settings'] === 'SUCCESS',
            'error_logging' => $this->setupResults['error_logging'] === 'SUCCESS',
            'performance_monitoring' => $this->setupResults['performance_monitoring'] === 'SUCCESS',
            'health_check_endpoints' => $this->setupResults['health_check_endpoints'] === 'SUCCESS',
            'cache_configuration' => $this->setupResults['cache_configuration'] !== 'FAIL'
        ];
        
        $passed = array_filter($checks);
        $readiness = count($passed) / count($checks);
        
        $this->setupResults['production_readiness'] = $readiness >= 0.9 ? 'READY' : ($readiness >= 0.7 ? 'PARTIAL' : 'NOT_READY');
        echo $readiness >= 0.9 ? "✅ Ready\n" : "⚠️  Not fully ready\n";
    }

    private function isSetupSuccessful() {
        $successfulComponents = 0;
        $totalComponents = 0;
        
        foreach ($this->setupResults as $result) {
            $totalComponents++;
            if ($result === 'SUCCESS' || $result === 'READY') {
                $successfulComponents++;
            }
        }
        
        return $totalComponents > 0 && ($successfulComponents / $totalComponents) >= 0.8;
    }

    private function generateSetupReport($duration) {
        echo "\n🚀 PRODUCTION SETUP RESULTS\n";
        echo "==========================\n";
        echo "⏱️  Setup Duration: " . round($duration, 2) . " seconds\n";
        echo "🎯 Overall Success: " . ($this->isSetupSuccessful() ? 'YES' : 'NO') . "\n\n";

        echo "📋 COMPONENT STATUS:\n";
        echo "------------------\n";
        foreach ($this->setupResults as $component => $status) {
            $icon = $status === 'SUCCESS' || $status === 'READY' ? '✅' : 
                   ($status === 'PARTIAL' || $status === 'DISABLED' ? '⚠️ ' : '❌');
            echo "$icon " . ucwords(str_replace('_', ' ', $component)) . ": $status\n";
        }
        echo "\n";

        if ($this->isSetupSuccessful()) {
            echo "🎉 PRODUCTION ENVIRONMENT READY!\n\n";
        } else {
            echo "⚠️  PRODUCTION SETUP REQUIRES ATTENTION\n\n";
        }

        // Save production configuration
        file_put_contents($this->configPath, json_encode($this->productionConfig, JSON_PRETTY_PRINT));
        echo "📝 Configuration saved to: config/production.json\n\n";
    }

    /**
     * Get production configuration
     */
    public function getProductionConfig() {
        return $this->productionConfig;
    }

    /**
     * Update production configuration
     */
    public function updateProductionConfig($updates) {
        $this->productionConfig = array_merge($this->productionConfig, $updates);
        return file_put_contents($this->configPath, json_encode($this->productionConfig, JSON_PRETTY_PRINT)) !== false;
    }
}

// Auto-run if called directly
if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
    $configManager = new ProductionConfigManager();
    $results = $configManager->setupProductionEnvironment();
    exit($results['setup_successful'] ? 0 : 1);
}

?>