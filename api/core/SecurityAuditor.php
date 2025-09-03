<?php
/**
 * Security Auditor
 * Comprehensive security scanning and hardening system
 * Phase 4: Production Deployment - Report.AI
 * Created: September 3rd, 2025 01:35 AM EST
 */

require_once 'Database.php';
require_once 'SystemMonitor.php';

class SecurityAuditor {
    private $database;
    private $systemMonitor;
    private $vulnerabilities = [];
    private $securityScore = 0;
    private $criticalIssues = 0;
    private $warningIssues = 0;
    
    // Security configuration
    private $securityConfig = [
        'min_password_length' => 12,
        'require_2fa' => true,
        'session_timeout' => 3600, // 1 hour
        'max_login_attempts' => 5,
        'rate_limit_requests' => 100, // per minute
        'allowed_file_types' => ['csv', 'json'],
        'max_file_size' => 10485760, // 10MB
        'require_https' => true
    ];

    public function __construct($database = null) {
        $this->database = $database ?: new Database();
        $this->systemMonitor = new SystemMonitor($this->database);
    }

    /**
     * Run comprehensive security audit
     */
    public function runSecurityAudit() {
        echo "🔒 Starting Security Audit & Hardening...\n";
        echo "========================================\n\n";
        
        $startTime = microtime(true);
        
        // Core security checks
        $this->auditInputValidation();
        $this->auditSQLInjectionPrevention();
        $this->auditXSSPrevention();
        $this->auditAPIKeySecurity();
        $this->auditFileUploadSecurity();
        $this->auditSessionSecurity();
        $this->auditDatabaseSecurity();
        $this->auditHTTPSConfiguration();
        $this->auditErrorHandling();
        $this->auditRateLimiting();
        
        // Calculate security score
        $this->calculateSecurityScore();
        
        $duration = microtime(true) - $startTime;
        $this->generateSecurityReport($duration);
        
        return [
            'security_score' => $this->securityScore,
            'vulnerabilities' => $this->vulnerabilities,
            'critical_issues' => $this->criticalIssues,
            'warning_issues' => $this->warningIssues,
            'audit_duration' => round($duration, 2)
        ];
    }

    private function auditInputValidation() {
        echo "🔍 Auditing Input Validation... ";
        
        $validationIssues = 0;
        
        // Check for sanitizeInput function
        if (!function_exists('sanitizeInput')) {
            $this->addVulnerability('CRITICAL', 'Missing sanitizeInput function', 'Input validation');
            $validationIssues++;
        }
        
        // Check API endpoints for input validation
        $apiFiles = glob(dirname(__DIR__) . '/api/*.php');
        foreach ($apiFiles as $file) {
            $content = file_get_contents($file);
            
            // Check for $_POST usage without sanitization
            if (strpos($content, '$_POST') !== false && strpos($content, 'sanitizeInput') === false) {
                $this->addVulnerability('HIGH', 'Unsanitized $_POST usage', basename($file));
                $validationIssues++;
            }
            
            // Check for $_GET usage without sanitization
            if (strpos($content, '$_GET') !== false && strpos($content, 'sanitizeInput') === false) {
                $this->addVulnerability('HIGH', 'Unsanitized $_GET usage', basename($file));
                $validationIssues++;
            }
        }
        
        echo $validationIssues === 0 ? "✅ SECURE\n" : "⚠️  {$validationIssues} issues found\n";
    }

    private function auditSQLInjectionPrevention() {
        echo "🔍 Auditing SQL Injection Prevention... ";
        
        $sqlIssues = 0;
        $coreFiles = glob(dirname(__DIR__) . '/api/core/*.php');
        
        foreach ($coreFiles as $file) {
            $content = file_get_contents($file);
            
            // Check for prepared statements usage
            if (strpos($content, 'query(') !== false && strpos($content, 'prepare(') === false) {
                // Check if it's a simple query without user input
                if (strpos($content, '$_') !== false || strpos($content, '$') !== false) {
                    $this->addVulnerability('CRITICAL', 'Potential SQL injection vulnerability', basename($file));
                    $sqlIssues++;
                }
            }
            
            // Check for string concatenation in SQL
            if (preg_match('/[\'"]\s*\.\s*\$/', $content)) {
                $this->addVulnerability('HIGH', 'SQL string concatenation detected', basename($file));
                $sqlIssues++;
            }
        }
        
        echo $sqlIssues === 0 ? "✅ SECURE\n" : "⚠️  {$sqlIssues} issues found\n";
    }

    private function auditXSSPrevention() {
        echo "🔍 Auditing XSS Prevention... ";
        
        $xssIssues = 0;
        $frontendFiles = array_merge(
            glob(dirname(__DIR__) . '/*.html'),
            glob(dirname(__DIR__) . '/*.js'),
            glob(dirname(__DIR__) . '/api/*.php')
        );
        
        foreach ($frontendFiles as $file) {
            $content = file_get_contents($file);
            
            // Check for innerHTML usage without sanitization
            if (strpos($content, 'innerHTML') !== false && strpos($content, 'textContent') === false) {
                if (strpos($content, 'sanitize') === false && strpos($content, 'htmlspecialchars') === false) {
                    $this->addVulnerability('MEDIUM', 'Potential XSS via innerHTML', basename($file));
                    $xssIssues++;
                }
            }
            
            // Check for echo without htmlspecialchars in PHP
            if (pathinfo($file, PATHINFO_EXTENSION) === 'php') {
                if (strpos($content, 'echo ') !== false && strpos($content, 'htmlspecialchars') === false) {
                    // Only flag if echoing variables
                    if (preg_match('/echo\s+\$/', $content)) {
                        $this->addVulnerability('MEDIUM', 'Unescaped output detected', basename($file));
                        $xssIssues++;
                    }
                }
            }
        }
        
        echo $xssIssues === 0 ? "✅ SECURE\n" : "⚠️  {$xssIssues} issues found\n";
    }

    private function auditAPIKeySecurity() {
        echo "🔍 Auditing API Key Security... ";
        
        $apiIssues = 0;
        
        // Check environment configuration
        $envFile = dirname(__DIR__) . '/.env';
        if (file_exists($envFile)) {
            $envContent = file_get_contents($envFile);
            
            // Check if API keys are properly configured
            if (strpos($envContent, 'ANTHROPIC_API_KEY') === false) {
                $this->addVulnerability('CRITICAL', 'Missing Anthropic API key configuration', '.env');
                $apiIssues++;
            }
            
            // Check file permissions
            $permissions = substr(sprintf('%o', fileperms($envFile)), -4);
            if ($permissions !== '0600' && $permissions !== '0400') {
                $this->addVulnerability('HIGH', 'Insecure .env file permissions', '.env');
                $apiIssues++;
            }
        } else {
            $this->addVulnerability('CRITICAL', 'Missing .env configuration file', 'Environment');
            $apiIssues++;
        }
        
        // Check for hardcoded API keys in code
        $allFiles = array_merge(
            glob(dirname(__DIR__) . '/api/*.php'),
            glob(dirname(__DIR__) . '/api/core/*.php')
        );
        
        foreach ($allFiles as $file) {
            $content = file_get_contents($file);
            if (preg_match('/["\']sk-[a-zA-Z0-9]{40,}["\']/', $content)) {
                $this->addVulnerability('CRITICAL', 'Hardcoded API key detected', basename($file));
                $apiIssues++;
            }
        }
        
        echo $apiIssues === 0 ? "✅ SECURE\n" : "⚠️  {$apiIssues} issues found\n";
    }

    private function auditFileUploadSecurity() {
        echo "🔍 Auditing File Upload Security... ";
        
        $uploadIssues = 0;
        $uploadDirs = [
            dirname(__DIR__) . '/uploads',
            dirname(__DIR__) . '/temp',
            dirname(__DIR__) . '/files'
        ];
        
        foreach ($uploadDirs as $dir) {
            if (is_dir($dir)) {
                // Check directory permissions
                $permissions = substr(sprintf('%o', fileperms($dir)), -4);
                if ($permissions === '0777') {
                    $this->addVulnerability('HIGH', 'Insecure directory permissions', basename($dir));
                    $uploadIssues++;
                }
                
                // Check for .htaccess protection
                $htaccessFile = $dir . '/.htaccess';
                if (!file_exists($htaccessFile)) {
                    $this->addVulnerability('MEDIUM', 'Missing .htaccess protection', basename($dir));
                    $uploadIssues++;
                }
            }
        }
        
        echo $uploadIssues === 0 ? "✅ SECURE\n" : "⚠️  {$uploadIssues} issues found\n";
    }

    private function auditSessionSecurity() {
        echo "🔍 Auditing Session Security... ";
        
        $sessionIssues = 0;
        
        // Check PHP session configuration
        if (ini_get('session.cookie_httponly') !== '1') {
            $this->addVulnerability('MEDIUM', 'Session cookies not HTTP-only', 'PHP Configuration');
            $sessionIssues++;
        }
        
        if (ini_get('session.cookie_secure') !== '1') {
            $this->addVulnerability('MEDIUM', 'Session cookies not secure', 'PHP Configuration');
            $sessionIssues++;
        }
        
        if (ini_get('session.use_strict_mode') !== '1') {
            $this->addVulnerability('LOW', 'Session strict mode not enabled', 'PHP Configuration');
            $sessionIssues++;
        }
        
        echo $sessionIssues === 0 ? "✅ SECURE\n" : "⚠️  {$sessionIssues} issues found\n";
    }

    private function auditDatabaseSecurity() {
        echo "🔍 Auditing Database Security... ";
        
        $dbIssues = 0;
        
        try {
            $pdo = $this->database->getConnection();
            
            // Check database user permissions
            $stmt = $pdo->query("SELECT USER() as current_user");
            $result = $stmt->fetch();
            
            if (strpos($result['current_user'], 'root') !== false) {
                $this->addVulnerability('HIGH', 'Using root database user', 'Database');
                $dbIssues++;
            }
            
            // Check for information_schema access
            try {
                $stmt = $pdo->query("SELECT COUNT(*) FROM information_schema.tables");
                $this->addVulnerability('LOW', 'Database user has information_schema access', 'Database');
                $dbIssues++;
            } catch (PDOException $e) {
                // Good - no access to information_schema
            }
            
        } catch (Exception $e) {
            $this->addVulnerability('CRITICAL', 'Database connection failed during audit', 'Database');
            $dbIssues++;
        }
        
        echo $dbIssues === 0 ? "✅ SECURE\n" : "⚠️  {$dbIssues} issues found\n";
    }

    private function auditHTTPSConfiguration() {
        echo "🔍 Auditing HTTPS Configuration... ";
        
        $httpsIssues = 0;
        
        // Check if running on HTTPS
        $isHTTPS = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || 
                   (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
        
        if (!$isHTTPS && php_sapi_name() !== 'cli') {
            $this->addVulnerability('HIGH', 'Not running on HTTPS', 'Configuration');
            $httpsIssues++;
        }
        
        // Check for HSTS headers
        $configFiles = glob(dirname(__DIR__) . '/api/*.php');
        $hstsFound = false;
        
        foreach ($configFiles as $file) {
            $content = file_get_contents($file);
            if (strpos($content, 'Strict-Transport-Security') !== false) {
                $hstsFound = true;
                break;
            }
        }
        
        if (!$hstsFound) {
            $this->addVulnerability('MEDIUM', 'Missing HSTS headers', 'Configuration');
            $httpsIssues++;
        }
        
        echo $httpsIssues === 0 ? "✅ SECURE\n" : "⚠️  {$httpsIssues} issues found\n";
    }

    private function auditErrorHandling() {
        echo "🔍 Auditing Error Handling... ";
        
        $errorIssues = 0;
        
        // Check if error display is disabled in production
        if (ini_get('display_errors') === '1') {
            $this->addVulnerability('MEDIUM', 'Error display enabled', 'PHP Configuration');
            $errorIssues++;
        }
        
        // Check for proper error logging
        $logDir = dirname(__DIR__) . '/logs';
        if (!is_dir($logDir) || !is_writable($logDir)) {
            $this->addVulnerability('LOW', 'Error logging not properly configured', 'Configuration');
            $errorIssues++;
        }
        
        echo $errorIssues === 0 ? "✅ SECURE\n" : "⚠️  {$errorIssues} issues found\n";
    }

    private function auditRateLimiting() {
        echo "🔍 Auditing Rate Limiting... ";
        
        $rateLimitIssues = 0;
        
        // Check for rate limiting implementation
        $apiFiles = glob(dirname(__DIR__) . '/api/*.php');
        $rateLimitFound = false;
        
        foreach ($apiFiles as $file) {
            $content = file_get_contents($file);
            if (strpos($content, 'rate_limit') !== false || strpos($content, 'RateLimit') !== false) {
                $rateLimitFound = true;
                break;
            }
        }
        
        if (!$rateLimitFound) {
            $this->addVulnerability('MEDIUM', 'No rate limiting implementation found', 'API Security');
            $rateLimitIssues++;
        }
        
        echo $rateLimitIssues === 0 ? "✅ SECURE\n" : "⚠️  {$rateLimitIssues} issues found\n";
    }

    private function addVulnerability($severity, $description, $location) {
        $this->vulnerabilities[] = [
            'severity' => $severity,
            'description' => $description,
            'location' => $location,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        if ($severity === 'CRITICAL') {
            $this->criticalIssues++;
        } elseif ($severity === 'HIGH' || $severity === 'MEDIUM') {
            $this->warningIssues++;
        }
    }

    private function calculateSecurityScore() {
        // Base score of 100, deduct points for issues
        $this->securityScore = 100;
        $this->securityScore -= ($this->criticalIssues * 20); // -20 per critical
        $this->securityScore -= ($this->warningIssues * 5);   // -5 per warning
        
        $this->securityScore = max(0, $this->securityScore);
    }

    private function generateSecurityReport($duration) {
        echo "\n🔒 SECURITY AUDIT RESULTS\n";
        echo "========================\n";
        echo "🎯 Security Score: {$this->securityScore}/100\n";
        echo "🚨 Critical Issues: {$this->criticalIssues}\n";
        echo "⚠️  Warning Issues: {$this->warningIssues}\n";
        echo "⏱️  Audit Duration: " . round($duration, 2) . " seconds\n\n";

        if (!empty($this->vulnerabilities)) {
            echo "📋 SECURITY ISSUES FOUND:\n";
            echo "-------------------------\n";
            foreach ($this->vulnerabilities as $vuln) {
                echo "• [{$vuln['severity']}] {$vuln['description']} - {$vuln['location']}\n";
            }
            echo "\n";
        }

        // Security recommendations
        echo "💡 SECURITY RECOMMENDATIONS:\n";
        echo "----------------------------\n";
        echo "1. Implement Web Application Firewall (WAF)\n";
        echo "2. Set up automated security monitoring\n";
        echo "3. Regular security updates and patches\n";
        echo "4. Implement 2FA for admin access\n";
        echo "5. Regular security audits and penetration testing\n\n";

        if ($this->securityScore >= 90) {
            echo "🎉 EXCELLENT SECURITY POSTURE - READY FOR PRODUCTION!\n\n";
        } elseif ($this->securityScore >= 75) {
            echo "✅ GOOD SECURITY - MINOR IMPROVEMENTS RECOMMENDED\n\n";
        } else {
            echo "⚠️  SECURITY IMPROVEMENTS REQUIRED BEFORE PRODUCTION\n\n";
        }
    }

    /**
     * Generate security hardening script
     */
    public function generateHardeningScript() {
        $script = "#!/bin/bash\n";
        $script .= "# Security Hardening Script - Generated by SecurityAuditor\n";
        $script .= "# Report.AI Production Security Setup\n\n";
        
        $script .= "# Set secure file permissions\n";
        $script .= "chmod 600 .env\n";
        $script .= "chmod 755 api/\n";
        $script .= "chmod 644 api/*.php\n\n";
        
        $script .= "# Create secure upload directories\n";
        $script .= "mkdir -p uploads temp\n";
        $script .= "chmod 755 uploads temp\n";
        $script .= "echo 'deny from all' > uploads/.htaccess\n";
        $script .= "echo 'deny from all' > temp/.htaccess\n\n";
        
        $script .= "# Set up log directory\n";
        $script .= "mkdir -p logs\n";
        $script .= "chmod 755 logs\n";
        $script .= "touch logs/error.log logs/security.log\n";
        $script .= "chmod 644 logs/*.log\n\n";
        
        file_put_contents(dirname(__DIR__) . '/security-hardening.sh', $script);
        chmod(dirname(__DIR__) . '/security-hardening.sh', 0755);
        
        echo "📝 Security hardening script created: security-hardening.sh\n";
    }
}

// Auto-run if called directly
if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
    $auditor = new SecurityAuditor();
    $results = $auditor->runSecurityAudit();
    $auditor->generateHardeningScript();
    exit($results['security_score'] >= 75 ? 0 : 1);
}

?>