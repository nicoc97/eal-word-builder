<?php
/**
 * Enhanced Database Debug Script for Railway Deployment
 */

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

?>
<!DOCTYPE html>
<html>
<head>
    <title>Database Debug Info</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        h2 { color: #666; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
        .success { color: green; font-weight: bold; }
        .error { color: red; font-weight: bold; }
        .warning { color: orange; font-weight: bold; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>

<h1>🔧 Database Debug Information</h1>

<h2>1. Environment Variables</h2>
<table>
    <tr>
        <th>Variable</th>
        <th>Value</th>
        <th>Status</th>
    </tr>
    <?php
    $envVars = [
        'MYSQL_HOST', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_PORT',
        'DB_HOST', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD', 'DB_PORT',
        'RAILWAY_ENVIRONMENT', 'RAILWAY_PROJECT_ID', 'RAILWAY_SERVICE_ID'
    ];
    
    foreach ($envVars as $var) {
        $value = getenv($var);
        $displayValue = $value;
        
        // Hide password values
        if (strpos($var, 'PASSWORD') !== false) {
            $displayValue = $value ? '[SET - ' . strlen($value) . ' chars]' : 'NOT SET';
        } elseif (!$value) {
            $displayValue = 'NOT SET';
        }
        
        $status = $value ? '<span class="success">✓</span>' : '<span class="error">✗</span>';
        
        echo "<tr>";
        echo "<td><strong>{$var}</strong></td>";
        echo "<td>{$displayValue}</td>";
        echo "<td>{$status}</td>";
        echo "</tr>";
    }
    ?>
</table>

<h2>2. Detected Configuration</h2>
<?php
$config = [
    'host' => getenv('MYSQL_HOST') ?: getenv('DB_HOST') ?: 'localhost',
    'database' => getenv('MYSQL_DATABASE') ?: getenv('DB_DATABASE') ?: 'word_builder_game',
    'username' => getenv('MYSQL_USER') ?: getenv('DB_USERNAME') ?: 'root',
    'password' => getenv('MYSQL_PASSWORD') ?: getenv('DB_PASSWORD') ?: '',
    'port' => getenv('MYSQL_PORT') ?: getenv('DB_PORT') ?: '3306',
];

echo "<pre>";
echo "Host:     " . $config['host'] . "\n";
echo "Port:     " . $config['port'] . "\n";
echo "Database: " . $config['database'] . "\n";
echo "Username: " . $config['username'] . "\n";
echo "Password: " . ($config['password'] ? '[SET]' : '[NOT SET]') . "\n";
echo "</pre>";

// Check if running on Railway
$isRailway = getenv('RAILWAY_ENVIRONMENT') !== false;
if ($isRailway) {
    echo '<p class="success">✓ Running on Railway environment</p>';
} else {
    echo '<p class="warning">⚠ Not running on Railway (local environment)</p>';
}
?>

<h2>3. Connection Tests</h2>

<h3>Test 1: Basic PDO Connection</h3>
<?php
try {
    $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset=utf8mb4";
    echo "<p>DSN: <code>{$dsn}</code></p>";
    
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];
    
    $pdo = new PDO($dsn, $config['username'], $config['password'], $options);
    
    echo '<p class="success">✓ Basic PDO connection successful!</p>';
    
    // Test query
    $result = $pdo->query("SELECT VERSION() as version, DATABASE() as db")->fetch();
    echo "<pre>";
    echo "MySQL Version: " . $result['version'] . "\n";
    echo "Current Database: " . $result['db'] . "\n";
    echo "</pre>";
    
} catch (PDOException $e) {
    echo '<p class="error">✗ PDO Connection failed: ' . htmlspecialchars($e->getMessage()) . '</p>';
    
    // Additional error details
    echo "<details>";
    echo "<summary>Error Details</summary>";
    echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
    echo "</details>";
}
?>

<h3>Test 2: Database Class Connection</h3>
<?php
try {
    require_once __DIR__ . '/classes/Database.php';
    
    $db = Database::getInstance();
    
    echo '<p class="success">✓ Database class instantiated successfully!</p>';
    
    $debugInfo = $db->debugConfig();
    echo "<pre>";
    print_r($debugInfo);
    echo "</pre>";
    
    if ($db->testConnection()) {
        echo '<p class="success">✓ Database class connection test passed!</p>';
    } else {
        echo '<p class="error">✗ Database class connection test failed!</p>';
    }
    
} catch (Exception $e) {
    echo '<p class="error">✗ Database class error: ' . htmlspecialchars($e->getMessage()) . '</p>';
}
?>

<h3>Test 3: Table Structure</h3>
<?php
if (isset($db) && $db->testConnection()) {
    try {
        $tables = $db->getTableList();
        
        if (empty($tables)) {
            echo '<p class="warning">⚠ No tables found in database. Creating tables...</p>';
            
            $created = $db->createTablesIfNotExist();
            echo "<pre>";
            print_r($created);
            echo "</pre>";
            
            // Re-check tables
            $tables = $db->getTableList();
        }
        
        if (!empty($tables)) {
            echo '<p class="success">✓ Found ' . count($tables) . ' table(s) in database:</p>';
            echo "<ul>";
            foreach ($tables as $table) {
                echo "<li>{$table}</li>";
            }
            echo "</ul>";
        }
        
    } catch (Exception $e) {
        echo '<p class="error">✗ Table check error: ' . htmlspecialchars($e->getMessage()) . '</p>';
    }
}
?>

<h2>4. Troubleshooting Guide</h2>
<div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
    <h4>Common Railway Issues:</h4>
    <ul>
        <li><strong>Connection refused:</strong> Ensure MySQL service is deployed and running in Railway</li>
        <li><strong>Authentication failed:</strong> Check that MYSQL_PASSWORD is correctly set in Railway variables</li>
        <li><strong>Unknown host:</strong> Use mysql.railway.internal for internal connections</li>
        <li><strong>Database not found:</strong> The database name in Railway is usually "railway"</li>
    </ul>
    
    <h4>Railway Connection Settings:</h4>
    <ul>
        <li>Internal Host: <code>mysql.railway.internal</code></li>
        <li>Default Port: <code>3306</code></li>
        <li>Default Database: <code>railway</code></li>
        <li>Default User: <code>root</code></li>
    </ul>
</div>

</body>
</html>