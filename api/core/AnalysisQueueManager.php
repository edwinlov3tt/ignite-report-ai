<?php
/**
 * Analysis Queue Manager
 * Handles async processing of AI analyses for optimal performance
 */

class AnalysisQueueManager {
    private $database;
    private $queueAdapter;
    private $maxConcurrentJobs;
    private $jobPriorities;
    
    public function __construct($database = null) {
        $this->database = $database ?: new Database();
        $this->maxConcurrentJobs = 5;
        $this->initializeJobPriorities();
        $this->queueAdapter = $this->createQueueAdapter();
    }
    
    /**
     * Queue analysis for background processing
     */
    public function queueAnalysis($analysisRequest) {
        $jobId = $this->generateJobId();
        
        $job = [
            'id' => $jobId,
            'type' => 'campaign_analysis',
            'data' => $analysisRequest,
            'priority' => $this->calculatePriority($analysisRequest),
            'created_at' => time(),
            'attempts' => 0,
            'status' => 'queued',
            'estimated_duration' => $this->estimateProcessingTime($analysisRequest)
        ];
        
        // Store job in database
        $this->storeJob($job);
        
        // Add to processing queue
        $this->queueAdapter->push('analysis_queue', $job);
        
        // Update queue metrics
        $this->updateQueueMetrics();
        
        return [
            'job_id' => $jobId,
            'status' => 'queued',
            'priority' => $job['priority'],
            'estimated_wait_time' => $this->calculateWaitTime(),
            'queue_position' => $this->getQueuePosition($jobId)
        ];
    }
    
    /**
     * Process next job in queue
     */
    public function processNext() {
        if ($this->getCurrentJobCount() >= $this->maxConcurrentJobs) {
            return null; // At capacity
        }
        
        $job = $this->queueAdapter->pop('analysis_queue');
        if (!$job) {
            return null; // No jobs in queue
        }
        
        try {
            // Update job status to processing
            $this->updateJobStatus($job['id'], 'processing');
            
            // Execute the analysis
            $result = $this->executeAnalysis($job);
            
            // Update job with results
            $this->updateJobStatus($job['id'], 'completed', $result);
            
            return $result;
            
        } catch (Exception $e) {
            // Handle job failure
            $this->handleJobFailure($job, $e);
            throw $e;
        }
    }
    
    /**
     * Get job status
     */
    public function getJobStatus($jobId) {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT id, status, progress, result_data, error_message, 
                       created_at, started_at, completed_at, attempts
                FROM analysis_jobs 
                WHERE id = ?
            ");
            $stmt->execute([$jobId]);
            $job = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$job) {
                throw new Exception('Job not found', 404);
            }
            
            $status = [
                'job_id' => $job['id'],
                'status' => $job['status'],
                'progress' => $job['progress'] ?? 0,
                'created_at' => $job['created_at'],
                'started_at' => $job['started_at'],
                'completed_at' => $job['completed_at'],
                'attempts' => $job['attempts']
            ];
            
            if ($job['status'] === 'completed' && $job['result_data']) {
                $status['result'] = json_decode($job['result_data'], true);
            }
            
            if ($job['status'] === 'failed' && $job['error_message']) {
                $status['error'] = $job['error_message'];
            }
            
            // Add queue info for queued jobs
            if ($job['status'] === 'queued') {
                $status['queue_position'] = $this->getQueuePosition($jobId);
                $status['estimated_wait_time'] = $this->calculateWaitTime();
            }
            
            return $status;
            
        } catch (PDOException $e) {
            throw new Exception('Database error retrieving job status', 500);
        }
    }
    
    /**
     * Cancel queued job
     */
    public function cancelJob($jobId) {
        // Remove from queue if still queued
        $this->queueAdapter->remove('analysis_queue', $jobId);
        
        // Update database status
        $this->updateJobStatus($jobId, 'cancelled');
        
        return ['job_id' => $jobId, 'status' => 'cancelled'];
    }
    
    /**
     * Get queue statistics
     */
    public function getQueueStats() {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT 
                    status,
                    COUNT(*) as count,
                    AVG(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as avg_duration
                FROM analysis_jobs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                GROUP BY status
            ");
            $stmt->execute();
            $statusCounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $stats = [
                'queue_depth' => $this->queueAdapter->getQueueSize('analysis_queue'),
                'processing_jobs' => $this->getCurrentJobCount(),
                'max_concurrent' => $this->maxConcurrentJobs,
                'last_24h' => []
            ];
            
            foreach ($statusCounts as $row) {
                $stats['last_24h'][$row['status']] = [
                    'count' => $row['count'],
                    'avg_duration' => round($row['avg_duration'] ?? 0, 1)
                ];
            }
            
            return $stats;
            
        } catch (Exception $e) {
            return ['error' => 'Unable to retrieve queue statistics'];
        }
    }
    
    /**
     * Retry failed job
     */
    public function retryJob($jobId) {
        $job = $this->getJobDetails($jobId);
        
        if (!$job || $job['status'] !== 'failed') {
            throw new Exception('Job cannot be retried', 400);
        }
        
        if ($job['attempts'] >= 3) {
            throw new Exception('Maximum retry attempts reached', 400);
        }
        
        // Reset job status and re-queue
        $job['status'] = 'queued';
        $job['attempts']++;
        $job['error_message'] = null;
        
        $this->updateJobInDatabase($job);
        $this->queueAdapter->push('analysis_queue', $job);
        
        return ['job_id' => $jobId, 'status' => 'queued', 'attempt' => $job['attempts']];
    }
    
    // Priority calculation methods
    private function calculatePriority($request) {
        $priority = 50; // Base priority
        
        // Higher priority for real-time requests
        if ($request['realtime'] ?? false) {
            $priority += 30;
        }
        
        // Higher priority for smaller datasets (faster processing)
        $fileCount = count($request['files'] ?? []);
        if ($fileCount < 5) {
            $priority += 10;
        }
        
        // Higher priority for premium users
        if (($request['userTier'] ?? 'standard') === 'premium') {
            $priority += 20;
        }
        
        // Lower priority for complex analyses
        $complexity = $request['requirements']['complexity'] ?? 'standard';
        if ($complexity === 'detailed') {
            $priority -= 10;
        }
        
        return max(1, min(100, $priority));
    }
    
    private function estimateProcessingTime($request) {
        $baseTime = 30; // 30 seconds base
        
        // Add time based on file count
        $fileCount = count($request['files'] ?? []);
        $baseTime += $fileCount * 5;
        
        // Add time based on complexity
        $complexity = $request['requirements']['complexity'] ?? 'standard';
        switch ($complexity) {
            case 'simple':
                $baseTime *= 0.7;
                break;
            case 'detailed':
                $baseTime *= 1.5;
                break;
            case 'comprehensive':
                $baseTime *= 2.0;
                break;
        }
        
        return round($baseTime);
    }
    
    // Queue adapter methods
    private function createQueueAdapter() {
        // For now, use simple database-based queue
        // Could be enhanced with Redis, RabbitMQ, etc.
        return new DatabaseQueueAdapter($this->database);
    }
    
    private function calculateWaitTime() {
        $queueSize = $this->queueAdapter->getQueueSize('analysis_queue');
        $avgProcessingTime = $this->getAverageProcessingTime();
        $concurrentJobs = $this->maxConcurrentJobs;
        
        // Rough estimate: queue_size / concurrent_jobs * avg_time
        $estimatedSeconds = ($queueSize / $concurrentJobs) * $avgProcessingTime;
        
        return max(0, round($estimatedSeconds));
    }
    
    private function getQueuePosition($jobId) {
        return $this->queueAdapter->getPosition('analysis_queue', $jobId);
    }
    
    private function getCurrentJobCount() {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT COUNT(*) as count 
                FROM analysis_jobs 
                WHERE status = 'processing'
            ");
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] ?? 0;
        } catch (Exception $e) {
            return 0;
        }
    }
    
    private function getAverageProcessingTime() {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT AVG(TIMESTAMPDIFF(SECOND, started_at, completed_at)) as avg_time
                FROM analysis_jobs 
                WHERE status = 'completed' 
                AND completed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ");
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return max(30, $result['avg_time'] ?? 30); // Minimum 30 seconds
        } catch (Exception $e) {
            return 60; // Default estimate
        }
    }
    
    // Job management methods
    private function generateJobId() {
        return 'job_' . uniqid() . '_' . time();
    }
    
    private function storeJob($job) {
        try {
            $stmt = $this->database->getConnection()->prepare("
                INSERT INTO analysis_jobs 
                (id, type, request_data, priority, status, created_at, attempts, estimated_duration) 
                VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)
            ");
            $stmt->execute([
                $job['id'],
                $job['type'],
                json_encode($job['data']),
                $job['priority'],
                $job['status'],
                $job['attempts'],
                $job['estimated_duration']
            ]);
        } catch (PDOException $e) {
            throw new Exception('Failed to store job in database', 500);
        }
    }
    
    private function updateJobStatus($jobId, $status, $result = null) {
        try {
            if ($status === 'processing') {
                $stmt = $this->database->getConnection()->prepare("
                    UPDATE analysis_jobs 
                    SET status = ?, started_at = NOW(), progress = 0
                    WHERE id = ?
                ");
                $stmt->execute([$status, $jobId]);
            } elseif ($status === 'completed') {
                $stmt = $this->database->getConnection()->prepare("
                    UPDATE analysis_jobs 
                    SET status = ?, completed_at = NOW(), progress = 100, result_data = ?
                    WHERE id = ?
                ");
                $stmt->execute([$status, json_encode($result), $jobId]);
            } else {
                $stmt = $this->database->getConnection()->prepare("
                    UPDATE analysis_jobs 
                    SET status = ?, updated_at = NOW()
                    WHERE id = ?
                ");
                $stmt->execute([$status, $jobId]);
            }
        } catch (PDOException $e) {
            error_log("Failed to update job status: " . $e->getMessage());
        }
    }
    
    private function executeAnalysis($job) {
        // Use the AdvancedAnalysisOrchestrator to process the analysis
        require_once 'AdvancedAnalysisOrchestrator.php';
        
        $orchestrator = new AdvancedAnalysisOrchestrator($this->database);
        return $orchestrator->executeAnalysis($job['id'], $job['data']);
    }
    
    private function handleJobFailure($job, $exception) {
        $job['attempts']++;
        
        // Store error details
        try {
            $stmt = $this->database->getConnection()->prepare("
                UPDATE analysis_jobs 
                SET status = 'failed', attempts = ?, error_message = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                $job['attempts'],
                $exception->getMessage(),
                $job['id']
            ]);
        } catch (Exception $e) {
            error_log("Failed to update job failure: " . $e->getMessage());
        }
        
        // Retry logic for retryable errors
        if ($job['attempts'] < 3 && $this->isRetryableError($exception)) {
            // Re-queue job with delay
            $this->queueAdapter->pushDelayed('analysis_queue', $job, 60); // 1 minute delay
        }
    }
    
    private function isRetryableError($exception) {
        $retryableMessages = [
            'API rate limit',
            'Network timeout',
            'Temporary service unavailable',
            'Connection timeout'
        ];
        
        $message = $exception->getMessage();
        foreach ($retryableMessages as $retryable) {
            if (strpos($message, $retryable) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    private function getJobDetails($jobId) {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT * FROM analysis_jobs WHERE id = ?
            ");
            $stmt->execute([$jobId]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            return null;
        }
    }
    
    private function updateJobInDatabase($job) {
        try {
            $stmt = $this->database->getConnection()->prepare("
                UPDATE analysis_jobs 
                SET status = ?, attempts = ?, error_message = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                $job['status'],
                $job['attempts'],
                $job['error_message'],
                $job['id']
            ]);
        } catch (Exception $e) {
            error_log("Failed to update job: " . $e->getMessage());
        }
    }
    
    private function initializeJobPriorities() {
        $this->jobPriorities = [
            'realtime' => 30,
            'premium_user' => 20,
            'small_dataset' => 10,
            'standard' => 0,
            'large_dataset' => -10,
            'batch' => -20
        ];
    }
    
    private function updateQueueMetrics() {
        // Track queue metrics for monitoring
        $queueSize = $this->queueAdapter->getQueueSize('analysis_queue');
        $processingJobs = $this->getCurrentJobCount();
        
        // Could integrate with monitoring service here
        error_log("Queue metrics - Size: {$queueSize}, Processing: {$processingJobs}");
    }
}

/**
 * Simple Database Queue Adapter
 */
class DatabaseQueueAdapter {
    private $database;
    
    public function __construct($database) {
        $this->database = $database;
    }
    
    public function push($queueName, $job) {
        // Jobs are already stored in analysis_jobs table
        return true;
    }
    
    public function pushDelayed($queueName, $job, $delaySeconds) {
        // For delayed jobs, update the created_at timestamp
        try {
            $stmt = $this->database->getConnection()->prepare("
                UPDATE analysis_jobs 
                SET created_at = DATE_ADD(NOW(), INTERVAL ? SECOND), status = 'queued'
                WHERE id = ?
            ");
            $stmt->execute([$delaySeconds, $job['id']]);
        } catch (Exception $e) {
            error_log("Failed to push delayed job: " . $e->getMessage());
        }
    }
    
    public function pop($queueName) {
        try {
            // Get highest priority queued job
            $stmt = $this->database->getConnection()->prepare("
                SELECT id, type, request_data, priority, attempts, created_at
                FROM analysis_jobs 
                WHERE status = 'queued' 
                ORDER BY priority DESC, created_at ASC 
                LIMIT 1
            ");
            $stmt->execute();
            $job = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($job) {
                return [
                    'id' => $job['id'],
                    'type' => $job['type'],
                    'data' => json_decode($job['request_data'], true),
                    'priority' => $job['priority'],
                    'attempts' => $job['attempts']
                ];
            }
        } catch (Exception $e) {
            error_log("Queue pop error: " . $e->getMessage());
        }
        
        return null;
    }
    
    public function getQueueSize($queueName) {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT COUNT(*) as count FROM analysis_jobs WHERE status = 'queued'
            ");
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] ?? 0;
        } catch (Exception $e) {
            return 0;
        }
    }
    
    public function getPosition($queueName, $jobId) {
        try {
            $stmt = $this->database->getConnection()->prepare("
                SELECT COUNT(*) as position
                FROM analysis_jobs 
                WHERE status = 'queued' 
                AND (priority > (SELECT priority FROM analysis_jobs WHERE id = ?) 
                     OR (priority = (SELECT priority FROM analysis_jobs WHERE id = ?) 
                         AND created_at < (SELECT created_at FROM analysis_jobs WHERE id = ?)))
            ");
            $stmt->execute([$jobId, $jobId, $jobId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return ($result['position'] ?? 0) + 1; // 1-based position
        } catch (Exception $e) {
            return 0;
        }
    }
    
    public function remove($queueName, $jobId) {
        // Mark job as cancelled instead of deleting
        try {
            $stmt = $this->database->getConnection()->prepare("
                UPDATE analysis_jobs SET status = 'cancelled' WHERE id = ? AND status = 'queued'
            ");
            $stmt->execute([$jobId]);
            return $stmt->rowCount() > 0;
        } catch (Exception $e) {
            return false;
        }
    }
}
?>