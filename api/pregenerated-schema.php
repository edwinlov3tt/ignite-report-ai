<?php
/**
 * Pregenerated Schema Management for Report.AI
 * Stores complete schema as JSON for fast loading
 */

require_once 'Database.php';

class PregeneratedSchema {
    private $db;
    
    public function __construct() {
        $this->db = new Database();
    }
    
    /**
     * Generate complete schema from database and store as JSON
     */
    public function generateSchema() {
        try {
            $conn = $this->db->connect();
            
            // Get all products with subproducts and performance tables
            $sql = "
                SELECT 
                    p.id, p.name, p.slug, p.platforms, p.notes, p.ai_guidelines,
                    sp.id as subproduct_id, sp.name as subproduct_name, sp.slug as subproduct_slug,
                    sp.platforms as subproduct_platforms, sp.notes as subproduct_notes, 
                    sp.table_validator,
                    pt.id as table_id, pt.table_name, pt.table_slug, pt.file_name, 
                    pt.headers, pt.aliases, pt.validator_config
                FROM products p
                LEFT JOIN subproducts sp ON p.id = sp.product_id
                LEFT JOIN performance_tables pt ON sp.id = pt.subproduct_id
                ORDER BY p.name, sp.name, pt.table_name
            ";
            
            $stmt = $conn->query($sql);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Transform into hierarchical structure
            $schema = $this->transformToHierarchy($results);
            
            // Store in database
            $this->storeSchema($schema);
            
            return $schema;
            
        } catch (Exception $e) {
            error_log("Error generating schema: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Get stored schema from database
     */
    public function getStoredSchema() {
        try {
            $conn = $this->db->connect();
            
            // Check if schema_cache table exists
            $tableCheck = $conn->query("SHOW TABLES LIKE 'schema_cache'");
            if ($tableCheck->rowCount() == 0) {
                $this->createCacheTable();
            }
            
            $stmt = $conn->query("SELECT schema_data FROM schema_cache WHERE cache_key = 'main' ORDER BY created_at DESC LIMIT 1");
            $result = $stmt->fetch();
            
            if ($result) {
                return json_decode($result['schema_data'], true);
            }
            
            // No cached schema, generate new one
            return $this->generateSchema();
            
        } catch (Exception $e) {
            error_log("Error getting stored schema: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Transform flat results into hierarchical structure
     */
    private function transformToHierarchy($results) {
        $products = [];
        
        foreach ($results as $row) {
            $productId = $row['id'];
            
            // Initialize product if not exists
            if (!isset($products[$productId])) {
                $products[$productId] = [
                    'id' => $productId,
                    'name' => $row['name'],
                    'slug' => $row['slug'],
                    'platforms' => json_decode($row['platforms'] ?? '[]', true),
                    'notes' => $row['notes'],
                    'ai_guidelines' => $row['ai_guidelines'],
                    'subproducts' => []
                ];
            }
            
            // Add subproduct if exists
            if ($row['subproduct_id']) {
                $subproductId = $row['subproduct_id'];
                
                if (!isset($products[$productId]['subproducts'][$subproductId])) {
                    $products[$productId]['subproducts'][$subproductId] = [
                        'id' => $subproductId,
                        'name' => $row['subproduct_name'],
                        'slug' => $row['subproduct_slug'],
                        'platforms' => json_decode($row['subproduct_platforms'] ?? '[]', true),
                        'notes' => $row['subproduct_notes'],
                        'table_validator' => json_decode($row['table_validator'] ?? '{}', true),
                        'performance_tables' => []
                    ];
                }
                
                // Add performance table if exists
                if ($row['table_id']) {
                    $products[$productId]['subproducts'][$subproductId]['performance_tables'][] = [
                        'id' => $row['table_id'],
                        'table_name' => $row['table_name'],
                        'table_slug' => $row['table_slug'],
                        'file_name' => $row['file_name'],
                        'headers' => json_decode($row['headers'] ?? '[]', true),
                        'aliases' => json_decode($row['aliases'] ?? '[]', true),
                        'validator_config' => json_decode($row['validator_config'] ?? '{}', true)
                    ];
                }
            }
        }
        
        // Convert to array format
        return [
            'version' => 3,
            'generated_at' => date('Y-m-d H:i:s'),
            'database_backed' => true,
            'products' => array_values($products)
        ];
    }
    
    /**
     * Store schema in cache table
     */
    private function storeSchema($schema) {
        $conn = $this->db->connect();
        
        $stmt = $conn->prepare("
            INSERT INTO schema_cache (cache_key, schema_data, created_at) 
            VALUES ('main', ?, NOW())
            ON DUPLICATE KEY UPDATE 
            schema_data = VALUES(schema_data), 
            created_at = NOW()
        ");
        
        $stmt->execute([json_encode($schema, JSON_PRETTY_PRINT)]);
    }
    
    /**
     * Create cache table if not exists
     */
    private function createCacheTable() {
        $conn = $this->db->connect();
        
        $sql = "
            CREATE TABLE IF NOT EXISTS schema_cache (
                id INT AUTO_INCREMENT PRIMARY KEY,
                cache_key VARCHAR(255) NOT NULL UNIQUE,
                schema_data LONGTEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_cache_key (cache_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ";
        
        $conn->exec($sql);
    }
    
    /**
     * Invalidate cache (trigger regeneration on next request)
     */
    public function invalidateCache() {
        $conn = $this->db->connect();
        $stmt = $conn->prepare("DELETE FROM schema_cache WHERE cache_key = 'main'");
        $stmt->execute();
    }
}