<?php
/**
 * Database Migration Runner
 * Executes the enhanced AI schema migration
 */

require_once 'Database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    echo "🚀 Starting Enhanced AI Schema Migration...\n";
    
    // Read migration file
    $migrationFile = $argv[1] ?? '001_enhanced_ai_schema.sql';
    $migrationSQL = file_get_contents(__DIR__ . '/migrations/' . $migrationFile);
    
    // Clean and split SQL statements
    $migrationSQL = preg_replace('/--.*$/m', '', $migrationSQL); // Remove comments
    $statements = preg_split('/;\s*$/m', $migrationSQL); // Split on semicolons at end of lines
    $statements = array_filter(array_map('trim', $statements), function($stmt) { 
        return !empty($stmt) && strlen($stmt) > 10; 
    });
    
    $success = 0;
    $errors = 0;
    
    foreach ($statements as $sql) {
        if (empty(trim($sql))) continue;
        
        try {
            $result = $pdo->exec($sql);
            $success++;
            echo "✅ Executed: " . substr(trim($sql), 0, 50) . "...\n";
        } catch (PDOException $e) {
            $errors++;
            echo "❌ Error: " . $e->getMessage() . "\n";
            echo "   SQL: " . substr(trim($sql), 0, 100) . "...\n";
        }
    }
    
    echo "\n📊 Migration Results:\n";
    echo "✅ Successful statements: $success\n";
    echo "❌ Failed statements: $errors\n";
    
    if ($errors === 0) {
        echo "🎉 Migration completed successfully!\n";
    } else {
        echo "⚠️  Migration completed with some errors.\n";
    }
    
} catch (Exception $e) {
    echo "💥 Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>