<?php
/**
 * Performance Cache Manager
 * Multi-layer caching system for maximum performance
 * Layers: Memory -> Redis -> File -> Database
 */

class PerformanceCacheManager {
    private $memoryCache;
    private $redisClient;
    private $fileCache;
    private $database;
    private $cacheConfig;
    
    public function __construct($database = null) {
        $this->database = $database ?: new Database();
        $this->memoryCache = [];
        $this->initializeRedis();
        $this->initializeFileCache();
        $this->cacheConfig = $this->loadCacheConfig();
    }
    
    /**
     * Get cached data with multi-layer strategy
     */
    public function get($key, $ttl = 3600) {
        // L1: Memory cache (fastest)
        if (isset($this->memoryCache[$key])) {
            $cached = $this->memoryCache[$key];
            if ($cached['expires'] > time()) {
                $this->recordCacheHit('memory', $key);
                return $cached['data'];
            } else {
                unset($this->memoryCache[$key]);
            }
        }
        
        // L2: Redis cache (fast network)
        if ($this->redisClient) {
            try {
                $redisData = $this->redisClient->get($key);
                if ($redisData !== false) {
                    $data = json_decode($redisData, true);
                    // Promote to memory cache
                    $this->setMemoryCache($key, $data, min($ttl, 300)); // Max 5 min in memory
                    $this->recordCacheHit('redis', $key);
                    return $data;
                }
            } catch (Exception $e) {
                error_log("Redis cache error: " . $e->getMessage());
            }
        }
        
        // L3: File cache (local disk)
        $fileData = $this->getFileCache($key);
        if ($fileData !== null) {
            // Promote to higher cache layers
            $this->setMemoryCache($key, $fileData, min($ttl, 300));
            if ($this->redisClient) {
                $this->setRedisCache($key, $fileData, $ttl);
            }
            $this->recordCacheHit('file', $key);
            return $fileData;
        }
        
        // L4: Database cache (last resort)
        $dbData = $this->getDatabaseCache($key);
        if ($dbData !== null) {
            // Promote to all cache layers
            $this->setMemoryCache($key, $dbData, min($ttl, 300));
            if ($this->redisClient) {
                $this->setRedisCache($key, $dbData, $ttl);
            }
            $this->setFileCache($key, $dbData, $ttl);
            $this->recordCacheHit('database', $key);
            return $dbData;
        }
        
        $this->recordCacheMiss($key);
        return null;
    }
    
    /**
     * Set data in all appropriate cache layers
     */
    public function set($key, $data, $ttl = 3600) {
        // Always set in memory (short TTL)
        $this->setMemoryCache($key, $data, min($ttl, 300));
        
        // Set in Redis if available
        if ($this->redisClient) {
            $this->setRedisCache($key, $data, $ttl);
        }
        
        // Set in file cache for persistence
        $this->setFileCache($key, $data, $ttl);
        
        // Store in database for long-term caching
        if ($ttl > 3600) { // Only for long-term data
            $this->setDatabaseCache($key, $data, $ttl);
        }
        
        $this->recordCacheSet($key, strlen(json_encode($data)));
    }
    
    /**
     * Delete from all cache layers
     */
    public function delete($key) {
        // Remove from memory
        unset($this->memoryCache[$key]);
        
        // Remove from Redis
        if ($this->redisClient) {
            try {
                $this->redisClient->del($key);
            } catch (Exception $e) {
                error_log("Redis delete error: " . $e->getMessage());
            }
        }
        
        // Remove from file cache
        $this->deleteFileCache($key);
        
        // Remove from database cache
        $this->deleteDatabaseCache($key);
    }
    
    /**
     * Invalidate cache entry (alias for delete)
     */
    public function invalidate($key) {
        return $this->delete($key);
    }
    
    /**
     * Clear all caches
     */
    public function clearAll() {
        // Clear memory
        $this->memoryCache = [];
        
        // Clear Redis
        if ($this->redisClient) {
            try {
                $this->redisClient->flushdb();
            } catch (Exception $e) {
                error_log("Redis clear error: " . $e->getMessage());
            }
        }
        
        // Clear file cache
        $this->clearFileCache();
        
        // Clear database cache
        $this->clearDatabaseCache();
    }
    
    /**
     * Get cache statistics
     */
    public function getStats() {
        $stats = [
            'memory' => [
                'size' => count($this->memoryCache),
                'hits' => $this->getCacheHits('memory'),
                'misses' => $this->getCacheMisses('memory')
            ],
            'file' => [
                'size' => $this->getFileCacheSize(),
                'hits' => $this->getCacheHits('file'),
                'misses' => $this->getCacheMisses('file')
            ],
            'database' => [
                'size' => $this->getDatabaseCacheSize(),
                'hits' => $this->getCacheHits('database'),
                'misses' => $this->getCacheMisses('database')
            ],
            'overall' => [
                'hit_ratio' => $this->calculateHitRatio(),
                'memory_usage' => $this->getMemoryUsage()
            ]
        ];
        
        if ($this->redisClient) {
            $stats['redis'] = [
                'connected' => true,
                'hits' => $this->getCacheHits('redis'),
                'misses' => $this->getCacheMisses('redis')
            ];
        }
        
        return $stats;
    }
    
    // Memory Cache Operations
    private function setMemoryCache($key, $data, $ttl) {
        $this->memoryCache[$key] = [
            'data' => $data,
            'expires' => time() + $ttl
        ];
        
        // Limit memory cache size
        if (count($this->memoryCache) > 1000) {
            $this->evictOldestMemoryCache();
        }
    }
    
    private function evictOldestMemoryCache() {
        $oldest = null;
        $oldestTime = PHP_INT_MAX;
        
        foreach ($this->memoryCache as $key => $cache) {
            if ($cache['expires'] < $oldestTime) {
                $oldestTime = $cache['expires'];
                $oldest = $key;
            }
        }
        
        if ($oldest) {
            unset($this->memoryCache[$oldest]);
        }
    }
    
    // Redis Cache Operations
    private function initializeRedis() {
        if (!class_exists('Redis')) {
            $this->redisClient = null;
            return;
        }
        
        try {
            $this->redisClient = new Redis();
            $host = getenv('REDIS_HOST') ?: 'localhost';
            $port = getenv('REDIS_PORT') ?: 6379;
            
            if (!$this->redisClient->connect($host, $port, 2)) {
                $this->redisClient = null;
                return;
            }
            
            // Test connection
            $this->redisClient->ping();
            
        } catch (Exception $e) {
            error_log("Redis initialization failed: " . $e->getMessage());
            $this->redisClient = null;
        }
    }
    
    private function setRedisCache($key, $data, $ttl) {
        if (!$this->redisClient) return;
        
        try {
            $this->redisClient->setex($key, $ttl, json_encode($data));
        } catch (Exception $e) {
            error_log("Redis set error: " . $e->getMessage());
        }
    }
    
    // File Cache Operations  
    private function initializeFileCache() {
        $this->fileCacheDir = sys_get_temp_dir() . '/report_ai_cache/';
        if (!is_dir($this->fileCacheDir)) {
            mkdir($this->fileCacheDir, 0755, true);
        }
    }
    
    private function getFileCache($key) {
        $filePath = $this->fileCacheDir . md5($key) . '.cache';
        
        if (!file_exists($filePath)) {
            return null;
        }
        
        $data = file_get_contents($filePath);
        $cached = json_decode($data, true);
        
        if ($cached && $cached['expires'] > time()) {
            return $cached['data'];
        }
        
        // Expired, delete file
        unlink($filePath);
        return null;
    }
    
    private function setFileCache($key, $data, $ttl) {
        $filePath = $this->fileCacheDir . md5($key) . '.cache';
        
        $cacheData = [
            'data' => $data,
            'expires' => time() + $ttl,
            'created' => time()
        ];
        
        file_put_contents($filePath, json_encode($cacheData));
    }
    
    private function deleteFileCache($key) {
        $filePath = $this->fileCacheDir . md5($key) . '.cache';
        if (file_exists($filePath)) {
            unlink($filePath);
        }
    }
    
    private function clearFileCache() {
        $files = glob($this->fileCacheDir . '*.cache');
        foreach ($files as $file) {
            unlink($file);
        }
    }
    
    private function getFileCacheSize() {
        $files = glob($this->fileCacheDir . '*.cache');
        return count($files);
    }
    
    // Database Cache Operations
    private function getDatabaseCache($key) {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT context_data, expires_at 
                FROM ai_context_cache 
                WHERE cache_key = ? AND expires_at > NOW()
            ");
            $stmt->execute([$key]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result) {
                return json_decode($result['context_data'], true);
            }
        } catch (Exception $e) {
            error_log("Database cache get error: " . $e->getMessage());
        }
        
        return null;
    }
    
    private function setDatabaseCache($key, $data, $ttl) {
        try {
            $stmt = $this->database->getConnection()->prepare("
                INSERT INTO ai_context_cache 
                (cache_key, context_data, expires_at, created_at) 
                VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND), NOW())
                ON DUPLICATE KEY UPDATE 
                context_data = VALUES(context_data),
                expires_at = VALUES(expires_at)
            ");
            $stmt->execute([$key, json_encode($data), $ttl]);
        } catch (Exception $e) {
            error_log("Database cache set error: " . $e->getMessage());
        }
    }
    
    private function deleteDatabaseCache($key) {
        try {
            $stmt = $this->database->getConnection()->prepare("
                DELETE FROM ai_context_cache WHERE cache_key = ?
            ");
            $stmt->execute([$key]);
        } catch (Exception $e) {
            error_log("Database cache delete error: " . $e->getMessage());
        }
    }
    
    private function clearDatabaseCache() {
        try {
            $this->database->getConnection()->exec("DELETE FROM ai_context_cache");
        } catch (Exception $e) {
            error_log("Database cache clear error: " . $e->getMessage());
        }
    }
    
    private function getDatabaseCacheSize() {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT COUNT(*) as count FROM ai_context_cache WHERE expires_at > NOW()
            ");
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] ?? 0;
        } catch (Exception $e) {
            return 0;
        }
    }
    
    // Statistics and Monitoring
    private function recordCacheHit($layer, $key) {
        // Record cache hit statistics (could be enhanced with more detailed logging)
        $this->updateCacheStats($layer, 'hits', 1);
    }
    
    private function recordCacheMiss($key) {
        $this->updateCacheStats('overall', 'misses', 1);
    }
    
    private function recordCacheSet($key, $size) {
        $this->updateCacheStats('overall', 'sets', 1);
        $this->updateCacheStats('overall', 'data_size', $size);
    }
    
    private function updateCacheStats($layer, $metric, $value) {
        // Simple in-memory statistics tracking
        if (!isset($this->cacheStats)) {
            $this->cacheStats = [];
        }
        
        if (!isset($this->cacheStats[$layer])) {
            $this->cacheStats[$layer] = [];
        }
        
        if (!isset($this->cacheStats[$layer][$metric])) {
            $this->cacheStats[$layer][$metric] = 0;
        }
        
        $this->cacheStats[$layer][$metric] += $value;
    }
    
    private function getCacheHits($layer) {
        return $this->cacheStats[$layer]['hits'] ?? 0;
    }
    
    private function getCacheMisses($layer) {
        return $this->cacheStats[$layer]['misses'] ?? 0;
    }
    
    private function calculateHitRatio() {
        $totalHits = 0;
        $totalMisses = 0;
        
        foreach (['memory', 'redis', 'file', 'database'] as $layer) {
            $totalHits += $this->getCacheHits($layer);
            $totalMisses += $this->getCacheMisses($layer);
        }
        
        $total = $totalHits + $totalMisses;
        return $total > 0 ? round(($totalHits / $total) * 100, 2) : 0;
    }
    
    private function getMemoryUsage() {
        return [
            'current' => memory_get_usage(true),
            'peak' => memory_get_peak_usage(true),
            'cache_entries' => count($this->memoryCache)
        ];
    }
    
    private function loadCacheConfig() {
        return [
            'memory_max_entries' => 1000,
            'memory_max_ttl' => 300, // 5 minutes
            'redis_default_ttl' => 3600, // 1 hour  
            'file_default_ttl' => 7200, // 2 hours
            'database_default_ttl' => 86400 // 24 hours
        ];
    }
    
    /**
     * Specialized caching methods for common use cases
     */
    
    public function cacheAnalysisResult($analysisId, $result, $ttl = 3600) {
        $this->set("analysis_result_{$analysisId}", $result, $ttl);
    }
    
    public function getCachedAnalysisResult($analysisId) {
        return $this->get("analysis_result_{$analysisId}");
    }
    
    public function cacheSchemaContext($tacticIdentifier, $context, $ttl = 7200) {
        $this->set("schema_context_{$tacticIdentifier}", $context, $ttl);
    }
    
    public function getCachedSchemaContext($tacticIdentifier) {
        return $this->get("schema_context_{$tacticIdentifier}");
    }
    
    public function cacheCampaignData($orderId, $data, $ttl = 1800) {
        $this->set("campaign_data_{$orderId}", $data, $ttl);
    }
    
    public function getCachedCampaignData($orderId) {
        return $this->get("campaign_data_{$orderId}");
    }
}
?>