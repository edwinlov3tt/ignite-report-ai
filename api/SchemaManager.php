<?php
/**
 * Schema Manager Class for Report.AI
 * Handles all schema-related database operations
 */

require_once 'Database.php';

class SchemaManager {
    private $db;
    
    public function __construct() {
        $this->db = new Database();
    }
    
    /**
     * Get all products with their complete hierarchy
     */
    public function getAllProducts() {
        try {
            // Get all products
            $products = $this->db->fetchAll("
                SELECT * FROM products 
                ORDER BY name ASC
            ");
            
            // For each product, get subproducts and related data
            foreach ($products as &$product) {
                $product['platforms'] = json_decode($product['platforms'] ?? '[]', true);
                $product['subproducts'] = $this->getSubproductsByProductId($product['id']);
                $product['lumina_extractors'] = $this->getLuminaExtractorsByProductId($product['id']);
                $product['benchmarks'] = $this->getBenchmarksByProductId($product['id']);
            }
            
            return $products;
            
        } catch (Exception $e) {
            error_log("Failed to get products: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Get subproducts for a specific product
     */
    public function getSubproductsByProductId($productId) {
        $subproducts = $this->db->fetchAll("
            SELECT * FROM subproducts 
            WHERE product_id = ? 
            ORDER BY name ASC
        ", [$productId]);
        
        // For each subproduct, get tactic types
        foreach ($subproducts as &$subproduct) {
            $subproduct['platforms'] = json_decode($subproduct['platforms'] ?? '[]', true);
            $subproduct['tactic_types'] = $this->getTacticTypesBySubproductId($subproduct['id']);
        }
        
        return $subproducts;
    }
    
    /**
     * Get tactic types for a specific subproduct
     */
    public function getTacticTypesBySubproductId($subproductId) {
        $tacticTypes = $this->db->fetchAll("
            SELECT * FROM tactic_types 
            WHERE subproduct_id = ? 
            ORDER BY name ASC
        ", [$subproductId]);
        
        // Decode JSON fields
        foreach ($tacticTypes as &$tacticType) {
            $tacticType['expected_filenames'] = json_decode($tacticType['expected_filenames'] ?? '[]', true);
            $tacticType['aliases'] = json_decode($tacticType['aliases'] ?? '[]', true);
            $tacticType['headers'] = json_decode($tacticType['headers'] ?? '[]', true);
        }
        
        return $tacticTypes;
    }
    
    /**
     * Get Lumina extractors for a product
     */
    public function getLuminaExtractorsByProductId($productId) {
        $extractors = $this->db->fetchAll("
            SELECT * FROM lumina_extractors 
            WHERE product_id = ? 
            ORDER BY name ASC
        ", [$productId]);
        
        // Decode JSON fields
        foreach ($extractors as &$extractor) {
            $extractor['when_conditions'] = json_decode($extractor['when_conditions'] ?? '{}', true);
        }
        
        return $extractors;
    }
    
    /**
     * Get benchmarks for a product
     */
    public function getBenchmarksByProductId($productId) {
        return $this->db->fetchAll("
            SELECT * FROM benchmarks 
            WHERE product_id = ? 
            ORDER BY metric_name ASC
        ", [$productId]);
    }
    
    /**
     * Create a new product
     */
    public function createProduct($data) {
        try {
            $this->db->beginTransaction();
            
            $productId = $this->db->insert("
                INSERT INTO products (name, slug, platforms, notes, ai_guidelines, ai_prompt) 
                VALUES (?, ?, ?, ?, ?, ?)
            ", [
                $data['name'],
                $data['slug'],
                json_encode($data['platforms'] ?? []),
                $data['notes'] ?? null,
                $data['ai_guidelines'] ?? null,
                $data['ai_prompt'] ?? null
            ]);
            
            // Add subproducts if provided
            if (isset($data['subproducts']) && is_array($data['subproducts'])) {
                foreach ($data['subproducts'] as $subproduct) {
                    $this->createSubproduct($productId, $subproduct);
                }
            }
            
            // Add extractors if provided
            if (isset($data['lumina_extractors']) && is_array($data['lumina_extractors'])) {
                foreach ($data['lumina_extractors'] as $extractor) {
                    $this->createLuminaExtractor($productId, $extractor);
                }
            }
            
            // Add benchmarks if provided
            if (isset($data['benchmarks']) && is_array($data['benchmarks'])) {
                foreach ($data['benchmarks'] as $benchmark) {
                    $this->createBenchmark($productId, $benchmark);
                }
            }
            
            $this->db->commit();
            return $productId;
            
        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }
    
    /**
     * Create a new subproduct
     */
    public function createSubproduct($productId, $data) {
        $subproductId = $this->db->insert("
            INSERT INTO subproducts (product_id, name, slug, platforms, notes) 
            VALUES (?, ?, ?, ?, ?)
        ", [
            $productId,
            $data['name'],
            $data['slug'],
            json_encode($data['platforms'] ?? []),
            $data['notes'] ?? null
        ]);
        
        // Add tactic types if provided
        if (isset($data['tactic_types']) && is_array($data['tactic_types'])) {
            foreach ($data['tactic_types'] as $tacticType) {
                $this->createTacticType($subproductId, $tacticType);
            }
        }
        
        return $subproductId;
    }
    
    /**
     * Create a new tactic type
     */
    public function createTacticType($subproductId, $data) {
        return $this->db->insert("
            INSERT INTO tactic_types 
            (subproduct_id, name, slug, data_value, filename_stem, expected_filenames, aliases, headers) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ", [
            $subproductId,
            $data['name'],
            $data['slug'],
            $data['data_value'],
            $data['filename_stem'],
            json_encode($data['expected_filenames'] ?? []),
            json_encode($data['aliases'] ?? []),
            json_encode($data['headers'] ?? [])
        ]);
    }
    
    /**
     * Create a new Lumina extractor
     */
    public function createLuminaExtractor($productId, $data) {
        return $this->db->insert("
            INSERT INTO lumina_extractors (product_id, name, path, when_conditions, aggregate_type) 
            VALUES (?, ?, ?, ?, ?)
        ", [
            $productId,
            $data['name'],
            $data['path'],
            json_encode($data['when_conditions'] ?? null),
            $data['aggregate_type'] ?? null
        ]);
    }
    
    /**
     * Create a new benchmark
     */
    public function createBenchmark($productId, $data) {
        return $this->db->insert("
            INSERT INTO benchmarks 
            (product_id, metric_name, goal_value, warning_threshold, unit, direction) 
            VALUES (?, ?, ?, ?, ?, ?)
        ", [
            $productId,
            $data['metric_name'],
            $data['goal_value'],
            $data['warning_threshold'],
            $data['unit'],
            $data['direction']
        ]);
    }
    
    /**
     * Update a product
     */
    public function updateProduct($productId, $data) {
        return $this->db->update("
            UPDATE products 
            SET name = ?, slug = ?, platforms = ?, notes = ?, 
                ai_guidelines = ?, ai_prompt = ?, updated_at = NOW()
            WHERE id = ?
        ", [
            $data['name'],
            $data['slug'],
            json_encode($data['platforms'] ?? []),
            $data['notes'] ?? null,
            $data['ai_guidelines'] ?? null,
            $data['ai_prompt'] ?? null,
            $productId
        ]);
    }
    
    /**
     * Update a subproduct
     */
    public function updateSubproduct($subproductId, $data) {
        return $this->db->update("
            UPDATE subproducts 
            SET name = ?, slug = ?, platforms = ?, notes = ?, updated_at = NOW()
            WHERE id = ?
        ", [
            $data['name'],
            $data['slug'],
            json_encode($data['platforms'] ?? []),
            $data['notes'] ?? null,
            $subproductId
        ]);
    }
    
    /**
     * Update a tactic type
     */
    public function updateTacticType($tacticTypeId, $data) {
        return $this->db->update("
            UPDATE tactic_types 
            SET name = ?, slug = ?, data_value = ?, filename_stem = ?,
                expected_filenames = ?, aliases = ?, headers = ?, updated_at = NOW()
            WHERE id = ?
        ", [
            $data['name'],
            $data['slug'],
            $data['data_value'],
            $data['filename_stem'],
            json_encode($data['expected_filenames'] ?? []),
            json_encode($data['aliases'] ?? []),
            json_encode($data['headers'] ?? []),
            $tacticTypeId
        ]);
    }
    
    /**
     * Delete a product (cascades to subproducts and tactic types)
     */
    public function deleteProduct($productId) {
        return $this->db->delete("DELETE FROM products WHERE id = ?", [$productId]);
    }
    
    /**
     * Delete a subproduct (cascades to tactic types)
     */
    public function deleteSubproduct($subproductId) {
        return $this->db->delete("DELETE FROM subproducts WHERE id = ?", [$subproductId]);
    }
    
    /**
     * Delete a tactic type
     */
    public function deleteTacticType($tacticTypeId) {
        return $this->db->delete("DELETE FROM tactic_types WHERE id = ?", [$tacticTypeId]);
    }
    
    /**
     * Export schema to JSON format (for compatibility with other apps)
     */
    public function exportToJson() {
        $products = $this->getAllProducts();
        
        // Transform to the expected JSON schema format
        $schema = [
            'version' => '2.0',
            'generated_at' => date('Y-m-d H:i:s'),
            'products' => []
        ];
        
        foreach ($products as $product) {
            $exportProduct = [
                'name' => $product['name'],
                'slug' => $product['slug'],
                'platforms' => $product['platforms'],
                'notes' => $product['notes'],
                'ai_guidelines' => $product['ai_guidelines'],
                'ai_prompt' => $product['ai_prompt'],
                'subproducts' => []
            ];
            
            // Add lumina extractors if any
            if (!empty($product['lumina_extractors'])) {
                $exportProduct['lumina_extractors'] = array_map(function($ext) {
                    return [
                        'name' => $ext['name'],
                        'path' => $ext['path'],
                        'when' => $ext['when_conditions'],
                        'aggregate' => $ext['aggregate_type']
                    ];
                }, $product['lumina_extractors']);
            }
            
            // Add benchmarks if any
            if (!empty($product['benchmarks'])) {
                $exportProduct['benchmarks'] = array_map(function($bench) {
                    return [
                        'metric' => $bench['metric_name'],
                        'goal' => floatval($bench['goal_value']),
                        'warning' => floatval($bench['warning_threshold']),
                        'unit' => $bench['unit'],
                        'direction' => $bench['direction']
                    ];
                }, $product['benchmarks']);
            }
            
            // Add subproducts
            foreach ($product['subproducts'] as $subproduct) {
                $exportSubproduct = [
                    'name' => $subproduct['name'],
                    'slug' => $subproduct['slug'],
                    'platforms' => $subproduct['platforms'],
                    'notes' => $subproduct['notes'],
                    'tactic_types' => []
                ];
                
                // Add tactic types
                foreach ($subproduct['tactic_types'] as $tacticType) {
                    $exportSubproduct['tactic_types'][] = [
                        'name' => $tacticType['name'],
                        'slug' => $tacticType['slug'],
                        'data_value' => $tacticType['data_value'],
                        'filename_stem' => $tacticType['filename_stem'],
                        'expected_filenames' => $tacticType['expected_filenames'],
                        'aliases' => $tacticType['aliases'],
                        'headers' => $tacticType['headers']
                    ];
                }
                
                $exportProduct['subproducts'][] = $exportSubproduct;
            }
            
            $schema['products'][] = $exportProduct;
        }
        
        return $schema;
    }
    
    /**
     * Import schema from JSON format
     */
    public function importFromJson($jsonData) {
        try {
            $this->db->beginTransaction();
            
            // Clear existing data if requested
            if (isset($jsonData['clear_existing']) && $jsonData['clear_existing']) {
                $this->db->executeQuery("DELETE FROM products");
            }
            
            // Import products
            foreach ($jsonData['products'] ?? [] as $productData) {
                $this->createProduct($productData);
            }
            
            $this->db->commit();
            return true;
            
        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }
    
    /**
     * Save schema version for tracking
     */
    public function saveSchemaVersion($description = null) {
        $schemaData = $this->exportToJson();
        $version = date('Y.m.d.His'); // Version format: YYYY.MM.DD.HHMMSS
        
        // Deactivate current active version
        $this->db->executeQuery("UPDATE schema_versions SET is_active = FALSE WHERE is_active = TRUE");
        
        // Save new version
        return $this->db->insert("
            INSERT INTO schema_versions (version_number, description, schema_data, is_active, created_by) 
            VALUES (?, ?, ?, TRUE, ?)
        ", [
            $version,
            $description ?? 'Schema snapshot',
            json_encode($schemaData),
            'system'
        ]);
    }
    
    /**
     * Get schema versions
     */
    public function getSchemaVersions($limit = 10) {
        return $this->db->fetchAll("
            SELECT id, version_number, description, is_active, created_by, created_at 
            FROM schema_versions 
            ORDER BY created_at DESC 
            LIMIT ?
        ", [$limit]);
    }
    
    /**
     * Restore schema from version
     */
    public function restoreSchemaVersion($versionId) {
        $version = $this->db->fetchOne("
            SELECT schema_data FROM schema_versions WHERE id = ?
        ", [$versionId]);
        
        if (!$version) {
            throw new Exception("Schema version not found");
        }
        
        $schemaData = json_decode($version['schema_data'], true);
        $schemaData['clear_existing'] = true;
        
        return $this->importFromJson($schemaData);
    }
}