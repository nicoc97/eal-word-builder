<?php

/**
 * Word Builder Game Installation Script
 * 
 * This script sets up the database and verifies the installation for the
 * EAL word building game. It creates the necessary tables and inserts
 * sample data for development and testing.
 * 
 * Usage: php setup/install.php
 */

require_once __DIR__ . '/../classes/Database.php';

echo "Word Builder Game - Database Setup\n";
echo "==================================\n\n";

try {
    // Test database connection
    echo "Testing database connection...\n";
    $db = Database::getInstance();
    
    if (!$db->testConnection()) {
        throw new Exception("Database connection test failed");
    }
    echo "✓ Database connection successful\n\n";
    
    // Read and execute setup SQL
    echo "Setting up database tables...\n";
    $sqlFile = __DIR__ . '/../database/setup.sql';
    
    if (!file_exists($sqlFile)) {
        throw new Exception("Setup SQL file not found: " . $sqlFile);
    }
    
    $sql = file_get_contents($sqlFile);
    
    // Split SQL into individual statements
    $statements = array_filter(
        array_map('trim', explode(';', $sql)),
        function($stmt) {
            return !empty($stmt) && !preg_match('/^--/', $stmt);
        }
    );
    
    $connection = $db->getConnection();
    
    foreach ($statements as $statement) {
        if (trim($statement)) {
            try {
                $connection->exec($statement);
                echo "✓ Executed: " . substr(trim($statement), 0, 50) . "...\n";
            } catch (PDOException $e) {
                // Skip errors for existing tables/data
                if (strpos($e->getMessage(), 'already exists') === false && 
                    strpos($e->getMessage(), 'Duplicate entry') === false) {
                    throw $e;
                }
                echo "- Skipped: " . substr(trim($statement), 0, 50) . "... (already exists)\n";
            }
        }
    }
    
    echo "\n";
    
    // Verify schema
    echo "Verifying database schema...\n";
    if (!$db->verifySchema()) {
        throw new Exception("Schema verification failed");
    }
    echo "✓ All required tables present\n\n";
    
    // Display table information
    echo "Database tables created:\n";
    $tables = $db->getTableList();
    foreach ($tables as $table) {
        $count = $db->fetchRow("SELECT COUNT(*) as count FROM `$table`")['count'];
        echo "  - $table ($count records)\n";
    }
    
    echo "\n✓ Installation completed successfully!\n";
    echo "\nNext steps:\n";
    echo "1. Configure your web server to serve the application\n";
    echo "2. Update database credentials in config/database.php if needed\n";
    echo "3. Test the application by accessing the game interface\n";
    
} catch (Exception $e) {
    echo "\n✗ Installation failed: " . $e->getMessage() . "\n";
    echo "\nTroubleshooting:\n";
    echo "1. Ensure MySQL is running and accessible\n";
    echo "2. Check database credentials in config/database.php\n";
    echo "3. Verify the database 'word_builder_game' exists\n";
    echo "4. Ensure PHP has PDO MySQL extension enabled\n";
    exit(1);
}