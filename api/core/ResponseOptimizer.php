<?php
/**
 * Response Optimizer
 * Handles response compression, pagination, caching headers, and performance optimizations
 */

class ResponseOptimizer {
    private $compressionEnabled;
    private $cacheHeaders;
    private $maxResponseSize;
    
    public function __construct() {
        $this->compressionEnabled = extension_loaded('zlib');
        $this->maxResponseSize = 5 * 1024 * 1024; // 5MB
        $this->initializeCacheHeaders();
    }
    
    /**
     * Optimize analysis response for performance
     */
    public function optimizeAnalysisResponse($analysis) {
        $startTime = microtime(true);
        
        // 1. Compress analysis data structure
        $compressedAnalysis = $this->compressAnalysisData($analysis);
        
        // 2. Create lazy loading references for large content
        $lazyLoadRefs = $this->createLazyLoadReferences($compressedAnalysis);
        
        // 3. Implement pagination for large datasets
        $paginatedData = $this->createPagination($compressedAnalysis);
        
        // 4. Generate client-side caching headers
        $cacheHeaders = $this->generateCacheHeaders($analysis);
        
        // 5. Add performance metadata
        $performanceMetrics = $this->generatePerformanceMetrics($analysis, $startTime);
        
        $optimizedResponse = [
            'analysis' => $compressedAnalysis,
            'lazy_load' => $lazyLoadRefs,
            'pagination' => $paginatedData,
            'performance' => $performanceMetrics,
            'cache_info' => [
                'etag' => $cacheHeaders['etag'],
                'last_modified' => $cacheHeaders['last_modified'],
                'cache_control' => $cacheHeaders['cache_control'],
                'expires' => $cacheHeaders['expires']
            ],
            'optimization_info' => [
                'compressed' => $this->compressionEnabled,
                'size_reduction' => $this->calculateSizeReduction($analysis, $compressedAnalysis),
                'lazy_loading_enabled' => !empty($lazyLoadRefs),
                'pagination_enabled' => !empty($paginatedData)
            ]
        ];
        
        // Set response headers
        $this->setResponseHeaders($cacheHeaders);
        
        return $optimizedResponse;
    }
    
    /**
     * Compress analysis data by removing redundancy and optimizing structure
     */
    private function compressAnalysisData($analysis) {
        $compressed = [];
        
        // Extract and compress main content
        if (isset($analysis['content'])) {
            $compressed['content'] = $this->compressTextContent($analysis['content']);
        }
        
        // Compress structured data
        if (isset($analysis['structured'])) {
            $compressed['structured'] = $this->compressStructuredData($analysis['structured']);
        }
        
        // Preserve critical metadata with compression
        if (isset($analysis['metadata'])) {
            $compressed['metadata'] = $this->compressMetadata($analysis['metadata']);
        }
        
        // Remove empty sections
        $compressed = array_filter($compressed, function($value) {
            return !empty($value);
        });
        
        return $compressed;
    }
    
    /**
     * Create references for lazy loading large content sections
     */
    private function createLazyLoadReferences($analysis) {
        $lazyRefs = [];
        $sizeThreshold = 50000; // 50KB threshold
        
        foreach ($analysis as $section => $content) {
            if (is_string($content) && strlen($content) > $sizeThreshold) {
                $refId = $this->generateLazyLoadId($section);
                $lazyRefs[$section] = [
                    'ref_id' => $refId,
                    'size' => strlen($content),
                    'type' => 'text',
                    'endpoint' => "/api/v2/analysis-content/{$refId}",
                    'preview' => substr($content, 0, 500) . '...'
                ];
                
                // Store full content for lazy loading
                $this->storeLazyLoadContent($refId, $content);
            }
        }
        
        return $lazyRefs;
    }
    
    /**
     * Create pagination for large datasets
     */
    private function createPagination($analysis) {
        $pagination = [];
        
        // Check for large structured sections that could benefit from pagination
        if (isset($analysis['structured'])) {
            foreach ($analysis['structured'] as $section => $data) {
                if (is_array($data) && count($data) > 100) {
                    $pagination[$section] = [
                        'total_items' => count($data),
                        'page_size' => 50,
                        'total_pages' => ceil(count($data) / 50),
                        'current_page' => 1,
                        'has_more' => count($data) > 50,
                        'next_page_url' => "/api/v2/analysis-section/{$section}?page=2"
                    ];
                    
                    // Replace large array with first page
                    $analysis['structured'][$section] = array_slice($data, 0, 50);
                }
            }
        }
        
        return $pagination;
    }
    
    /**
     * Generate cache headers for client-side caching
     */
    private function generateCacheHeaders($analysis) {
        $content = json_encode($analysis);
        
        return [
            'etag' => '"' . md5($content) . '"',
            'last_modified' => gmdate('D, d M Y H:i:s', time()) . ' GMT',
            'cache_control' => 'public, max-age=1800, must-revalidate', // 30 minutes
            'expires' => gmdate('D, d M Y H:i:s', time() + 1800) . ' GMT',
            'vary' => 'Accept-Encoding, Accept'
        ];
    }
    
    /**
     * Generate performance metrics
     */
    private function generatePerformanceMetrics($analysis, $startTime) {
        $processingTime = microtime(true) - $startTime;
        
        return [
            'optimization_time_ms' => round($processingTime * 1000, 2),
            'original_size_bytes' => strlen(json_encode($analysis)),
            'optimized_size_bytes' => strlen(json_encode($analysis)), // Would be different after compression
            'compression_ratio' => $this->calculateCompressionRatio($analysis),
            'sections_optimized' => $this->countOptimizedSections($analysis),
            'lazy_load_sections' => $this->countLazyLoadSections($analysis),
            'cache_efficiency' => $this->estimateCacheEfficiency($analysis)
        ];
    }
    
    /**
     * Compress text content by removing redundancy
     */
    private function compressTextContent($content) {
        // Remove extra whitespace and normalize
        $compressed = preg_replace('/\s+/', ' ', trim($content));
        
        // Remove redundant phrases (basic implementation)
        $redundantPhrases = [
            'In conclusion, ',
            'Furthermore, ',
            'Additionally, ',
            'It should be noted that ',
            'As mentioned earlier, '
        ];
        
        foreach ($redundantPhrases as $phrase) {
            $compressed = str_replace($phrase, '', $compressed);
        }
        
        return $compressed;
    }
    
    /**
     * Compress structured data by removing empty values and optimizing keys
     */
    private function compressStructuredData($structured) {
        $compressed = [];
        
        foreach ($structured as $section => $data) {
            if (is_array($data)) {
                // Remove empty arrays and null values
                $filteredData = array_filter($data, function($item) {
                    return !empty($item) || $item === 0 || $item === '0';
                });
                
                if (!empty($filteredData)) {
                    $compressed[$section] = array_values($filteredData); // Reindex array
                }
            } elseif (!empty($data)) {
                $compressed[$section] = $data;
            }
        }
        
        return $compressed;
    }
    
    /**
     * Compress metadata by removing non-essential information
     */
    private function compressMetadata($metadata) {
        // Keep only essential metadata
        $essential = [
            'analysis_id',
            'generated_at',
            'model_info',
            'context_summary'
        ];
        
        $compressed = [];
        foreach ($essential as $key) {
            if (isset($metadata[$key])) {
                $compressed[$key] = $metadata[$key];
            }
        }
        
        return $compressed;
    }
    
    /**
     * Set HTTP response headers
     */
    private function setResponseHeaders($cacheHeaders) {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            
            // Cache headers
            header('ETag: ' . $cacheHeaders['etag']);
            header('Last-Modified: ' . $cacheHeaders['last_modified']);
            header('Cache-Control: ' . $cacheHeaders['cache_control']);
            header('Expires: ' . $cacheHeaders['expires']);
            header('Vary: ' . $cacheHeaders['vary']);
            
            // Compression headers
            if ($this->compressionEnabled && $this->shouldCompress()) {
                header('Content-Encoding: gzip');
            }
            
            // Performance headers
            header('X-Performance-Optimized: true');
            header('X-Cache-Strategy: multi-layer');
        }
    }
    
    /**
     * Generate unique ID for lazy loading content
     */
    private function generateLazyLoadId($section) {
        return 'lazy_' . md5($section . time() . uniqid());
    }
    
    /**
     * Store content for lazy loading (could use cache or separate storage)
     */
    private function storeLazyLoadContent($refId, $content) {
        // Store in file cache or database for retrieval
        $cacheDir = sys_get_temp_dir() . '/report_ai_lazy/';
        if (!is_dir($cacheDir)) {
            mkdir($cacheDir, 0755, true);
        }
        
        file_put_contents($cacheDir . $refId . '.txt', $content);
    }
    
    /**
     * Calculate size reduction percentage
     */
    private function calculateSizeReduction($original, $compressed) {
        $originalSize = strlen(json_encode($original));
        $compressedSize = strlen(json_encode($compressed));
        
        if ($originalSize == 0) return 0;
        
        return round((($originalSize - $compressedSize) / $originalSize) * 100, 2);
    }
    
    /**
     * Calculate compression ratio
     */
    private function calculateCompressionRatio($data) {
        if (!$this->compressionEnabled) return 1.0;
        
        $original = json_encode($data);
        $compressed = gzcompress($original);
        
        return round(strlen($original) / strlen($compressed), 2);
    }
    
    /**
     * Count optimized sections
     */
    private function countOptimizedSections($analysis) {
        $count = 0;
        foreach ($analysis as $section => $content) {
            if (is_string($content) && strlen($content) > 1000) {
                $count++;
            }
        }
        return $count;
    }
    
    /**
     * Count lazy load sections
     */
    private function countLazyLoadSections($analysis) {
        $count = 0;
        $sizeThreshold = 50000;
        
        foreach ($analysis as $section => $content) {
            if (is_string($content) && strlen($content) > $sizeThreshold) {
                $count++;
            }
        }
        return $count;
    }
    
    /**
     * Estimate cache efficiency
     */
    private function estimateCacheEfficiency($analysis) {
        // Simple heuristic based on content stability
        $stability = 85; // Assume 85% cache hit rate for analysis content
        
        // Adjust based on analysis type and size
        if (isset($analysis['metadata']['model_info']['provider'])) {
            $stability += 5; // Structured responses are more cacheable
        }
        
        return min(100, $stability);
    }
    
    /**
     * Check if response should be compressed
     */
    private function shouldCompress() {
        if (!$this->compressionEnabled) return false;
        
        // Check Accept-Encoding header
        $acceptEncoding = $_SERVER['HTTP_ACCEPT_ENCODING'] ?? '';
        return strpos($acceptEncoding, 'gzip') !== false;
    }
    
    /**
     * Initialize default cache headers
     */
    private function initializeCacheHeaders() {
        $this->cacheHeaders = [
            'default_max_age' => 1800, // 30 minutes
            'must_revalidate' => true,
            'public_cache' => true,
            'vary_headers' => ['Accept-Encoding', 'Accept']
        ];
    }
    
    /**
     * Handle conditional requests (304 Not Modified)
     */
    public function handleConditionalRequest($analysis) {
        $etag = '"' . md5(json_encode($analysis)) . '"';
        $lastModified = gmdate('D, d M Y H:i:s', time()) . ' GMT';
        
        // Check If-None-Match header
        $ifNoneMatch = $_SERVER['HTTP_IF_NONE_MATCH'] ?? '';
        if ($ifNoneMatch === $etag) {
            http_response_code(304);
            header('ETag: ' . $etag);
            header('Last-Modified: ' . $lastModified);
            exit;
        }
        
        // Check If-Modified-Since header
        $ifModifiedSince = $_SERVER['HTTP_IF_MODIFIED_SINCE'] ?? '';
        if ($ifModifiedSince === $lastModified) {
            http_response_code(304);
            header('ETag: ' . $etag);
            header('Last-Modified: ' . $lastModified);
            exit;
        }
        
        return false; // Not a conditional request or content has changed
    }
    
    /**
     * Optimize response for specific client capabilities
     */
    public function optimizeForClient($analysis, $clientCapabilities = []) {
        $optimized = $analysis;
        
        // Reduce content for mobile clients
        if (isset($clientCapabilities['mobile']) && $clientCapabilities['mobile']) {
            $optimized = $this->optimizeForMobile($optimized);
        }
        
        // Adjust for bandwidth constraints
        if (isset($clientCapabilities['low_bandwidth']) && $clientCapabilities['low_bandwidth']) {
            $optimized = $this->optimizeForLowBandwidth($optimized);
        }
        
        return $optimized;
    }
    
    /**
     * Mobile-specific optimizations
     */
    private function optimizeForMobile($analysis) {
        // Reduce text content length for mobile screens
        if (isset($analysis['content']) && is_string($analysis['content'])) {
            if (strlen($analysis['content']) > 5000) {
                $analysis['content'] = substr($analysis['content'], 0, 4500) . '... [Continue reading on desktop]';
            }
        }
        
        return $analysis;
    }
    
    /**
     * Low bandwidth optimizations
     */
    private function optimizeForLowBandwidth($analysis) {
        // Remove non-essential sections
        $nonEssential = ['detailed_metrics', 'supplementary_data', 'debug_info'];
        
        foreach ($nonEssential as $section) {
            unset($analysis[$section]);
        }
        
        return $analysis;
    }
    
    /**
     * Stream large responses in chunks
     */
    public function streamResponse($data, $chunkSize = 8192) {
        if (!headers_sent()) {
            header('Content-Type: application/json');
            header('Transfer-Encoding: chunked');
        }
        
        $jsonData = json_encode($data);
        $chunks = str_split($jsonData, $chunkSize);
        
        foreach ($chunks as $chunk) {
            echo dechex(strlen($chunk)) . "\r\n";
            echo $chunk . "\r\n";
            flush();
            ob_flush();
        }
        
        // End chunked encoding
        echo "0\r\n\r\n";
    }
}
?>