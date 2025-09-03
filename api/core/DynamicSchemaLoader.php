<?php
/**
 * Dynamic Schema Loader
 * Handles intelligent schema loading with caching and versioning
 */

class DynamicSchemaLoader {
    private $database;
    private $cacheManager;
    private $schemaVersioning;
    
    public function __construct($database) {
        $this->database = $database;
        $this->cacheManager = new PerformanceCacheManager();
        $this->schemaVersioning = new SchemaVersionManager();
    }
    
    /**
     * Get complete schema context for a tactic
     */
    public function getSchemaForTactic($tacticIdentifier) {
        // Check cache first
        $cacheKey = "schema_context_{$tacticIdentifier}";
        $cached = $this->cacheManager->getContext($cacheKey);
        
        if ($cached && !$this->schemaVersioning->hasChanged($tacticIdentifier)) {
            return $cached;
        }
        
        // Load from database with joins
        $schema = $this->loadFullSchemaContext($tacticIdentifier);
        
        // Cache for performance
        if ($schema) {
            $this->cacheManager->setContext($cacheKey, $schema, 3600); // 1 hour
        }
        
        return $schema;
    }
    
    /**
     * Load full schema context with all joins
     */
    private function loadFullSchemaContext($tacticIdentifier) {
        try {
            $pdo = $this->database->getConnection();
            $sql = "
                SELECT DISTINCT
                    p.name as product_name,
                    p.ai_guidelines,
                    p.ai_prompt,
                    sp.name as subproduct_name,
                    sp.notes as subproduct_notes,
                    pt.table_name,
                    pt.table_slug,
                    pt.file_name,
                    pt.headers,
                    pt.aliases,
                    pt.validator_config,
                    b.metric_name,
                    b.goal_value,
                    b.warning_threshold,
                    tac.analysis_guidelines,
                    tac.performance_kpis,
                    tac.common_issues,
                    tac.optimization_strategies
                FROM subproducts sp
                JOIN products p ON sp.product_id = p.id
                JOIN performance_tables pt ON sp.id = pt.subproduct_id
                LEFT JOIN benchmarks b ON p.id = b.product_id AND b.is_active = 1
                LEFT JOIN tactic_types tt ON sp.id = tt.subproduct_id
                LEFT JOIN tactic_ai_context tac ON tt.id = tac.tactic_type_id
                WHERE sp.slug = ? OR pt.file_name LIKE ? OR pt.table_slug = ?
                ORDER BY p.id, sp.id, pt.id
            ";
            
            $stmt = $pdo->prepare($sql);
            $likePattern = "%{$tacticIdentifier}%";
            $stmt->execute([$tacticIdentifier, $likePattern, $tacticIdentifier]);
            
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($results)) {
                // Try alternative lookup methods
                return $this->alternativeSchemaLookup($tacticIdentifier);
            }
            
            return $results;
            
        } catch (PDOException $e) {
            error_log("Schema loading error: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Alternative schema lookup for edge cases
     */
    private function alternativeSchemaLookup($tacticIdentifier) {
        try {
            $pdo = $this->database->getConnection();
            
            // Try looking up by data_value in enhanced tactic categories
            $sql = "
                SELECT DISTINCT
                    p.name as product_name,
                    p.ai_guidelines,
                    sp.name as subproduct_name,
                    pt.table_name,
                    pt.file_name,
                    pt.headers
                FROM performance_tables pt
                JOIN subproducts sp ON pt.subproduct_id = sp.id
                JOIN products p ON sp.product_id = p.id
                WHERE pt.file_name LIKE ? OR sp.slug LIKE ?
                LIMIT 10
            ";
            
            $stmt = $pdo->prepare($sql);
            $likePattern = "%{$tacticIdentifier}%";
            $stmt->execute([$likePattern, $likePattern]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (PDOException $e) {
            error_log("Alternative schema lookup error: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Get all available tactic schemas for overview
     */
    public function getAllTacticSchemas() {
        $cacheKey = "all_tactic_schemas";
        $cached = $this->cacheManager->getContext($cacheKey);
        
        if ($cached) {
            return $cached;
        }
        
        try {
            $pdo = $this->database->getConnection();
            $sql = "
                SELECT 
                    sp.slug as tactic_identifier,
                    sp.name as tactic_name,
                    p.name as product_name,
                    COUNT(pt.id) as table_count
                FROM subproducts sp
                JOIN products p ON sp.product_id = p.id
                LEFT JOIN performance_tables pt ON sp.id = pt.subproduct_id
                GROUP BY sp.id
                ORDER BY p.name, sp.name
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $schemas = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $this->cacheManager->setContext($cacheKey, $schemas, 1800); // 30 minutes
            return $schemas;
            
        } catch (PDOException $e) {
            error_log("Failed to load all tactic schemas: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Validate schema completeness for a tactic
     */
    public function validateTacticSchema($tacticIdentifier) {
        $schema = $this->getSchemaForTactic($tacticIdentifier);
        
        if (!$schema) {
            return [
                'valid' => false,
                'errors' => ['Schema not found'],
                'warnings' => []
            ];
        }
        
        $errors = [];
        $warnings = [];
        
        // Check for required components
        $hasAnalysisGuidelines = false;
        $hasPerformanceKpis = false;
        $hasBenchmarks = false;
        
        foreach ($schema as $row) {
            if (!empty($row['analysis_guidelines'])) {
                $hasAnalysisGuidelines = true;
            }
            if (!empty($row['performance_kpis'])) {
                $hasPerformanceKpis = true;
            }
            if (!empty($row['goal_value'])) {
                $hasBenchmarks = true;
            }
        }
        
        if (!$hasAnalysisGuidelines) {
            $warnings[] = 'No analysis guidelines defined';
        }
        if (!$hasPerformanceKpis) {
            $warnings[] = 'No performance KPIs defined';
        }
        if (!$hasBenchmarks) {
            $warnings[] = 'No benchmarks defined';
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'warnings' => $warnings,
            'completeness_score' => $this->calculateCompletenessScore($schema)
        ];
    }
    
    private function calculateCompletenessScore($schema) {
        if (!$schema) return 0;
        
        $score = 50; // Base score for having schema
        
        foreach ($schema as $row) {
            if (!empty($row['analysis_guidelines'])) $score += 15;
            if (!empty($row['performance_kpis'])) $score += 15;
            if (!empty($row['goal_value'])) $score += 10;
            if (!empty($row['ai_guidelines'])) $score += 10;
        }
        
        return min(100, $score);
    }
}

/**
 * Schema Version Manager
 * Tracks schema changes for cache invalidation
 */
class SchemaVersionManager {
    private $database;
    private $lastChecked = [];
    
    public function __construct($database = null) {
        $this->database = $database ?: new Database();
    }
    
    public function hasChanged($tacticIdentifier) {
        $lastModified = $this->getLastModified($tacticIdentifier);
        $lastCheck = $this->lastChecked[$tacticIdentifier] ?? 0;
        
        $this->lastChecked[$tacticIdentifier] = time();
        
        return $lastModified > $lastCheck;
    }
    
    private function getLastModified($tacticIdentifier) {
        try {
            $pdo = $this->database->getConnection();
            $sql = "
                SELECT MAX(GREATEST(
                    COALESCE(p.updated_at, p.created_at),
                    COALESCE(sp.updated_at, sp.created_at),
                    COALESCE(pt.updated_at, pt.created_at)
                )) as last_modified
                FROM subproducts sp
                JOIN products p ON sp.product_id = p.id
                LEFT JOIN performance_tables pt ON sp.id = pt.subproduct_id
                WHERE sp.slug = ?
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$tacticIdentifier]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return strtotime($result['last_modified'] ?? 'now');
            
        } catch (PDOException $e) {
            error_log("Failed to check schema version: " . $e->getMessage());
            return time(); // Force refresh on error
        }
    }
}
?>