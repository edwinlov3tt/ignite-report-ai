<?php
/**
 * Database Migration Runner for Report.AI
 * Runs all SQL migration files to create database schema
 */

// Set headers for CORS and JSON response
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'Database.php';

try {
    // Initialize database connection
    $db = new Database();
    $connection = $db->connect();
    
    $results = [
        'success' => true,
        'message' => 'Database migrations completed successfully',
        'migrations' => [],
        'total_migrations' => 0,
        'tables_created' => 0,
        'execution_time' => 0
    ];
    
    $startTime = microtime(true);
    
    // Get list of migration files
    $migrationsDir = __DIR__ . '/migrations/';
    $migrationFiles = glob($migrationsDir . '*.sql');
    sort($migrationFiles); // Ensure they run in order
    
    if (empty($migrationFiles)) {
        throw new Exception('No migration files found in migrations directory');
    }
    
    $results['total_migrations'] = count($migrationFiles);
    
    // Run each migration
    foreach ($migrationFiles as $migrationFile) {
        $filename = basename($migrationFile);
        $migrationResult = [
            'file' => $filename,
            'status' => 'running',
            'tables_created' => 0,
            'execution_time' => 0,
            'error' => null
        ];
        
        try {
            $migrationStart = microtime(true);
            
            // Read the SQL file
            $sql = file_get_contents($migrationFile);
            
            if (empty($sql)) {
                throw new Exception("Migration file {$filename} is empty");
            }
            
            // Split SQL into individual statements
            $statements = array_filter(
                array_map('trim', explode(';', $sql)),
                function($statement) {
                    return !empty($statement) && !preg_match('/^--/', $statement);
                }
            );
            
            $tablesCreated = 0;
            
            // Execute each statement
            foreach ($statements as $statement) {
                if (trim($statement)) {
                    $db->executeQuery($statement . ';');
                    
                    // Count CREATE TABLE statements
                    if (preg_match('/^\s*CREATE TABLE/i', $statement)) {
                        $tablesCreated++;
                    }
                }
            }
            
            $migrationEnd = microtime(true);
            $migrationResult['status'] = 'completed';
            $migrationResult['tables_created'] = $tablesCreated;
            $migrationResult['execution_time'] = round(($migrationEnd - $migrationStart) * 1000, 2);
            $results['tables_created'] += $tablesCreated;
            
        } catch (Exception $e) {
            $migrationResult['status'] = 'failed';
            $migrationResult['error'] = $e->getMessage();
            $results['success'] = false;
            
            error_log("Migration {$filename} failed: " . $e->getMessage());
        }
        
        $results['migrations'][] = $migrationResult;
    }
    
    $endTime = microtime(true);
    $results['execution_time'] = round(($endTime - $startTime) * 1000, 2);
    
    // Get final database status
    try {
        $tablesQuery = "SHOW TABLES";
        $stmt = $db->executeQuery($tablesQuery);
        $tables = $stmt->fetchAll();
        
        $results['final_table_count'] = count($tables);
        $results['tables'] = array_map(function($table) {
            return array_values($table)[0];
        }, $tables);
        
    } catch (Exception $e) {
        $results['table_list_error'] = $e->getMessage();
    }
    
    // Log the migration result
    error_log("Database migrations result: " . json_encode($results));
    
    // Set appropriate HTTP status
    if (!$results['success']) {
        http_response_code(500);
    }
    
    echo json_encode($results, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    $errorResult = [
        'success' => false,
        'message' => 'Database migration failed: ' . $e->getMessage(),
        'error_time' => date('Y-m-d H:i:s')
    ];
    
    error_log("Database migration error: " . json_encode($errorResult));
    
    http_response_code(500);
    echo json_encode($errorResult, JSON_PRETTY_PRINT);
}
?>