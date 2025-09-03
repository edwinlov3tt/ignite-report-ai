<?php
/**
 * Schema CRUD API Endpoints for Report.AI
 * Handles all schema management operations
 */

// Set headers for CORS and JSON response
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'SchemaManager.php';
require_once 'pregenerated-schema.php';

try {
    $schemaManager = new SchemaManager();
    $pregeneratedSchema = new PregeneratedSchema();
    
    // Parse request
    $method = $_SERVER['REQUEST_METHOD'];
    $path = $_GET['path'] ?? '';
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Route the request
    switch ($method) {
        case 'GET':
            handleGetRequest($schemaManager, $path, $pregeneratedSchema);
            break;
            
        case 'POST':
            handlePostRequest($schemaManager, $path, $input, $pregeneratedSchema);
            break;
            
        case 'PUT':
            handlePutRequest($schemaManager, $path, $input, $pregeneratedSchema);
            break;
            
        case 'DELETE':
            handleDeleteRequest($schemaManager, $path);
            break;
            
        default:
            throw new Exception("Method not allowed", 405);
    }
    
} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    http_response_code($statusCode);
    
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}

/**
 * Handle GET requests
 */
function handleGetRequest($schemaManager, $path, $pregeneratedSchema = null) {
    $response = ['success' => true];
    
    switch ($path) {
        case 'products':
        case '':
            // Get pregenerated schema for fast loading
            $response['data'] = $pregeneratedSchema->getStoredSchema()['products'];
            break;
            
        case 'export':
            // Export schema as JSON
            $response['data'] = $schemaManager->exportToJson();
            break;
            
        case 'versions':
            // Get schema versions
            $limit = $_GET['limit'] ?? 10;
            $response['data'] = $schemaManager->getSchemaVersions($limit);
            break;
            
        default:
            // Check if requesting specific product
            if (preg_match('/^product\/(\d+)$/', $path, $matches)) {
                $productId = $matches[1];
                $products = $schemaManager->getAllProducts();
                $product = array_filter($products, function($p) use ($productId) {
                    return $p['id'] == $productId;
                });
                
                if (empty($product)) {
                    throw new Exception("Product not found", 404);
                }
                
                $response['data'] = array_values($product)[0];
            } else {
                throw new Exception("Invalid path", 400);
            }
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT);
}

/**
 * Handle POST requests
 */
function handlePostRequest($schemaManager, $path, $input, $pregeneratedSchema = null) {
    $response = ['success' => true];
    
    switch ($path) {
        case 'product':
            // Create new product
            $productId = $schemaManager->createProduct($input);
            $response['data'] = ['id' => $productId];
            $response['message'] = 'Product created successfully';
            break;
            
        case 'subproduct':
            // Create new subproduct
            if (!isset($input['product_id'])) {
                throw new Exception("Product ID required", 400);
            }
            $subproductId = $schemaManager->createSubproduct($input['product_id'], $input);
            $response['data'] = ['id' => $subproductId];
            $response['message'] = 'Subproduct created successfully';
            break;
            
        case 'tactic-type':
            // Create new tactic type
            if (!isset($input['subproduct_id'])) {
                throw new Exception("Subproduct ID required", 400);
            }
            $tacticTypeId = $schemaManager->createTacticType($input['subproduct_id'], $input);
            $response['data'] = ['id' => $tacticTypeId];
            $response['message'] = 'Tactic type created successfully';
            break;
            
        case 'lumina-extractor':
            // Create new Lumina extractor
            if (!isset($input['product_id'])) {
                throw new Exception("Product ID required", 400);
            }
            $extractorId = $schemaManager->createLuminaExtractor($input['product_id'], $input);
            $response['data'] = ['id' => $extractorId];
            $response['message'] = 'Lumina extractor created successfully';
            break;
            
        case 'benchmark':
            // Create new benchmark
            if (!isset($input['product_id'])) {
                throw new Exception("Product ID required", 400);
            }
            $benchmarkId = $schemaManager->createBenchmark($input['product_id'], $input);
            $response['data'] = ['id' => $benchmarkId];
            $response['message'] = 'Benchmark created successfully';
            break;
            
        case 'import':
            // Import schema from JSON
            $schemaManager->importFromJson($input);
            $response['message'] = 'Schema imported successfully';
            break;
            
        case 'save-version':
            // Save current schema as version
            $description = $input['description'] ?? null;
            $versionId = $schemaManager->saveSchemaVersion($description);
            $response['data'] = ['version_id' => $versionId];
            $response['message'] = 'Schema version saved';
            break;
            
        case 'restore-version':
            // Restore schema from version
            if (!isset($input['version_id'])) {
                throw new Exception("Version ID required", 400);
            }
            $schemaManager->restoreSchemaVersion($input['version_id']);
            $response['message'] = 'Schema version restored successfully';
            break;
            
        default:
            throw new Exception("Invalid path", 400);
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT);
}

/**
 * Handle PUT requests
 */
function handlePutRequest($schemaManager, $path, $input, $pregeneratedSchema = null) {
    $response = ['success' => true];
    
    if (preg_match('/^product\/(\d+)$/', $path, $matches)) {
        // Update product
        $productId = $matches[1];
        $schemaManager->updateProduct($productId, $input);
        $response['message'] = 'Product updated successfully';
        
    } elseif (preg_match('/^subproduct\/(\d+)$/', $path, $matches)) {
        // Update subproduct
        $subproductId = $matches[1];
        $schemaManager->updateSubproduct($subproductId, $input);
        $response['message'] = 'Subproduct updated successfully';
        
    } elseif (preg_match('/^tactic-type\/(\d+)$/', $path, $matches)) {
        // Update tactic type
        $tacticTypeId = $matches[1];
        $schemaManager->updateTacticType($tacticTypeId, $input);
        $response['message'] = 'Tactic type updated successfully';
        
    } else {
        throw new Exception("Invalid path", 400);
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT);
}

/**
 * Handle DELETE requests
 */
function handleDeleteRequest($schemaManager, $path) {
    $response = ['success' => true];
    
    if (preg_match('/^product\/(\d+)$/', $path, $matches)) {
        // Delete product
        $productId = $matches[1];
        $schemaManager->deleteProduct($productId);
        $response['message'] = 'Product deleted successfully';
        
    } elseif (preg_match('/^subproduct\/(\d+)$/', $path, $matches)) {
        // Delete subproduct
        $subproductId = $matches[1];
        $schemaManager->deleteSubproduct($subproductId);
        $response['message'] = 'Subproduct deleted successfully';
        
    } elseif (preg_match('/^tactic-type\/(\d+)$/', $path, $matches)) {
        // Delete tactic type
        $tacticTypeId = $matches[1];
        $schemaManager->deleteTacticType($tacticTypeId);
        $response['message'] = 'Tactic type deleted successfully';
        
    } else {
        throw new Exception("Invalid path", 400);
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT);
}
?>