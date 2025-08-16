<?php
/**
 * Database Setup for Railway Deployment
 * Visit this page once to set up the database tables
 */

// Include database class
require_once __DIR__ . '/classes/Database.php';

echo "<h1>EAL Word Builder - Database Setup</h1>";

try {
    // Test database connection
    $db = Database::getInstance();
    
    if (!$db->testConnection()) {
        throw new Exception("Cannot connect to database");
    }
    
    echo "<p>✅ Database connection successful</p>";
    
    // Check if tables exist
    if ($db->verifySchema()) {
        echo "<p>✅ Database tables already exist - setup complete!</p>";
        echo '<p><a href="/">Go to App</a> | <a href="/teacher.html">Teacher Dashboard</a></p>';
        exit;
    }
    
    echo "<p>⚙️ Setting up database tables...</p>";
    
    // Read and execute setup SQL
    $sqlFile = __DIR__ . '/database/setup.sql';
    if (!file_exists($sqlFile)) {
        throw new Exception("Setup SQL file not found");
    }
    
    $sql = file_get_contents($sqlFile);
    
    // Split SQL into individual statements
    $statements = array_filter(
        array_map('trim', explode(';', $sql)),
        function($stmt) {
            return !empty($stmt) && !preg_match('/^\s*--/', $stmt);
        }
    );
    
    $pdo = $db->getConnection();
    
    foreach ($statements as $statement) {
        if (trim($statement)) {
            try {
                $pdo->exec($statement);
            } catch (PDOException $e) {
                // Ignore "table already exists" errors
                if (strpos($e->getMessage(), 'already exists') === false) {
                    throw $e;
                }
            }
        }
    }
    
    // Verify setup
    if ($db->verifySchema()) {
        echo "<p>✅ Database setup completed successfully!</p>";
        echo "<p>🎉 Your EAL Word Builder app is now ready!</p>";
        echo '<p><a href="/">Go to App</a> | <a href="/teacher.html">Teacher Dashboard</a></p>';
    } else {
        throw new Exception("Setup verification failed");
    }
    
} catch (Exception $e) {
    echo "<p>❌ Setup failed: " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p>Please check your database configuration and try again.</p>";
}
?>