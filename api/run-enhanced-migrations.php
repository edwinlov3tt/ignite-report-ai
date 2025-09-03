<?php
/**
 * Run Enhanced AI Control Migrations
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once 'Database.php';

try {
    $db = new Database();
    $connection = $db->connect();
    
    // Read and execute the enhanced migration
    $migrationFile = __DIR__ . '/migrations/004_enhanced_ai_control.sql';
    $sql = file_get_contents($migrationFile);
    
    // Split into individual statements
    $statements = array_filter(
        array_map('trim', preg_split('/;\s*$/m', $sql)),
        function($stmt) { 
            return !empty($stmt) && !preg_match('/^--/', $stmt); 
        }
    );
    
    $results = ['success' => true, 'executed' => 0, 'tables_created' => []];
    
    foreach ($statements as $statement) {
        if (trim($statement)) {
            try {
                $db->executeQuery($statement);
                $results['executed']++;
                
                if (preg_match('/CREATE TABLE.*?`(\w+)`/i', $statement, $matches)) {
                    $results['tables_created'][] = $matches[1];
                }
            } catch (Exception $e) {
                // Table might already exist, continue
                error_log("Migration statement warning: " . $e->getMessage());
            }
        }
    }
    
    $results['message'] = "Enhanced AI control migrations completed";
    echo json_encode($results, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>