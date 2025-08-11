<?php
echo "<h1>Database Debug Info</h1>";

echo "<h2>Environment Variables:</h2>";
echo "<pre>";
echo "DB_HOST: " . ($_ENV['DB_HOST'] ?? 'NOT SET') . "\n";
echo "DB_DATABASE: " . ($_ENV['DB_DATABASE'] ?? 'NOT SET') . "\n";
echo "DB_USERNAME: " . ($_ENV['DB_USERNAME'] ?? 'NOT SET') . "\n";
echo "DB_PASSWORD: " . (isset($_ENV['DB_PASSWORD']) ? '[SET]' : 'NOT SET') . "\n";
echo "DB_PORT: " . ($_ENV['DB_PORT'] ?? 'NOT SET') . "\n";
echo "</pre>";

echo "<h2>Database Config:</h2>";
$config = include __DIR__ . '/config/database.php';
echo "<pre>";
print_r($config);
echo "</pre>";

echo "<h2>Connection Test:</h2>";
try {
    require_once __DIR__ . '/classes/Database.php';
    $db = Database::getInstance();
    $pdo = $db->getConnection();
    echo "✅ Database connection successful!";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage();
}
?>