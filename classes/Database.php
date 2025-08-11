<?php

/**
 * Database Connection Class for Word Builder Game
 * Updated for Railway.app deployment
 */
class Database {
    
    private static $instance = null;
    private $connection;
    private $host;
    private $database;
    private $username;
    private $password;
    private $port;
    private $charset;
    
    /**
     * Private constructor to implement singleton pattern
     */
    private function __construct() {
        $this->loadConfig();
        $this->connect();
    }
    
    /**
     * Get singleton instance of Database class
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Load database configuration from Railway environment variables
     */
    private function loadConfig() {
        // Railway provides these environment variables
        $this->host = $_ENV['MYSQL_HOST'] ?? getenv('MYSQL_HOST') ?? 'localhost';
        $this->database = $_ENV['MYSQL_DATABASE'] ?? getenv('MYSQL_DATABASE') ?? 'word_builder_game';
        $this->username = $_ENV['MYSQL_USER'] ?? getenv('MYSQL_USER') ?? 'root';
        $this->password = $_ENV['MYSQL_PASSWORD'] ?? getenv('MYSQL_PASSWORD') ?? '';
        $this->port = $_ENV['MYSQL_PORT'] ?? getenv('MYSQL_PORT') ?? '3306';
        $this->charset = 'utf8mb4';
        
        // For local development, check DB_* variables as fallback
        if ($this->host === 'localhost') {
            $this->host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?? $this->host;
            $this->database = $_ENV['DB_DATABASE'] ?? getenv('DB_DATABASE') ?? $this->database;
            $this->username = $_ENV['DB_USERNAME'] ?? getenv('DB_USERNAME') ?? $this->username;
            $this->password = $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?? $this->password;
            $this->port = $_ENV['DB_PORT'] ?? getenv('DB_PORT') ?? $this->port;
        }
        
        // Debug output (remove in production)
        error_log("Database Config - Host: {$this->host}, Port: {$this->port}, Database: {$this->database}, User: {$this->username}");
    }
    
    /**
     * Establish PDO database connection
     */
    private function connect() {
        try {
            // Build DSN - keep host and port separate for Railway
            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->database};charset={$this->charset}";
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$this->charset}",
                PDO::ATTR_TIMEOUT => 30,
            ];
            
            // Railway internal network doesn't need SSL
            if (strpos($this->host, 'railway.internal') !== false) {
                // Disable SSL for Railway internal connections
                $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
            }
            
            error_log("Attempting connection to: {$dsn}");
            
            $this->connection = new PDO($dsn, $this->username, $this->password, $options);
            
            // Test the connection
            $this->connection->query("SELECT 1");
            
            error_log("Database connection successful!");
            
        } catch (PDOException $e) {
            $errorMsg = "Database connection failed: " . $e->getMessage();
            error_log($errorMsg);
            error_log("DSN: mysql:host={$this->host};port={$this->port};dbname={$this->database}");
            throw new Exception($errorMsg);
        }
    }
    
    /**
     * Debug method to show current configuration
     */
    public function debugConfig() {
        return [
            'host' => $this->host,
            'port' => $this->port,
            'database' => $this->database,
            'username' => $this->username,
            'password' => $this->password ? '[SET]' : '[NOT SET]',
            'charset' => $this->charset,
            'environment_vars' => [
                'MYSQL_HOST' => getenv('MYSQL_HOST') ?: '[NOT SET]',
                'MYSQL_DATABASE' => getenv('MYSQL_DATABASE') ?: '[NOT SET]',
                'MYSQL_USER' => getenv('MYSQL_USER') ?: '[NOT SET]',
                'MYSQL_PASSWORD' => getenv('MYSQL_PASSWORD') ? '[SET]' : '[NOT SET]',
                'MYSQL_PORT' => getenv('MYSQL_PORT') ?: '[NOT SET]',
                'RAILWAY_ENVIRONMENT' => getenv('RAILWAY_ENVIRONMENT') ?: '[NOT SET]',
            ],
            'connection_test' => $this->testConnection() ? 'SUCCESS' : 'FAILED'
        ];
    }
    
    /**
     * Get the PDO connection instance
     */
    public function getConnection() {
        if ($this->connection === null) {
            $this->connect();
        }
        return $this->connection;
    }
    
    /**
     * Test database connection
     */
    public function testConnection() {
        try {
            if ($this->connection === null) {
                $this->connect();
            }
            $result = $this->connection->query("SELECT 1 as test")->fetch();
            return $result['test'] == 1;
        } catch (Exception $e) {
            error_log("Connection test failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Execute a prepared statement with parameters
     */
    public function execute($query, $params = []) {
        try {
            if ($this->connection === null) {
                $this->connect();
            }
            
            $stmt = $this->connection->prepare($query);
            
            foreach ($params as $key => $value) {
                $paramType = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
                $paramKey = is_string($key) ? $key : $key + 1;
                if (is_string($key) && substr($key, 0, 1) !== ':') {
                    $paramKey = ':' . $key;
                }
                $stmt->bindValue($paramKey, $value, $paramType);
            }
            
            $stmt->execute();
            return $stmt;
            
        } catch (PDOException $e) {
            error_log("Query execution failed: " . $e->getMessage());
            throw new Exception("Database query failed: " . $e->getMessage());
        }
    }
    
    /**
     * Fetch single row from database
     */
    public function fetchRow($query, $params = []) {
        $stmt = $this->execute($query, $params);
        return $stmt->fetch();
    }
    
    /**
     * Fetch all rows from database
     */
    public function fetchAll($query, $params = []) {
        $stmt = $this->execute($query, $params);
        return $stmt->fetchAll();
    }
    
    /**
     * Insert data and return last insert ID
     */
    public function insert($query, $params = []) {
        $this->execute($query, $params);
        return $this->connection->lastInsertId();
    }
    
    /**
     * Update data and return affected rows count
     */
    public function update($query, $params = []) {
        $stmt = $this->execute($query, $params);
        return $stmt->rowCount();
    }
    
    /**
     * Delete data and return affected rows count
     */
    public function delete($query, $params = []) {
        $stmt = $this->execute($query, $params);
        return $stmt->rowCount();
    }
    
    /**
     * Begin database transaction
     */
    public function beginTransaction() {
        return $this->connection->beginTransaction();
    }
    
    /**
     * Commit database transaction
     */
    public function commit() {
        return $this->connection->commit();
    }
    
    /**
     * Rollback database transaction
     */
    public function rollback() {
        return $this->connection->rollback();
    }
    
    /**
     * Get list of tables in database
     */
    public function getTableList() {
        try {
            $tables = $this->fetchAll("SHOW TABLES");
            $key = "Tables_in_{$this->database}";
            return array_column($tables, $key);
        } catch (Exception $e) {
            error_log("Failed to get table list: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Create table helper for initial setup
     */
    public function createTablesIfNotExist() {
        $tables = [
            'sessions' => "
                CREATE TABLE IF NOT EXISTS sessions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id VARCHAR(255) UNIQUE NOT NULL,
                    user_data TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ",
            'progress' => "
                CREATE TABLE IF NOT EXISTS progress (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id VARCHAR(255) NOT NULL,
                    level INT DEFAULT 1,
                    score INT DEFAULT 0,
                    words_completed INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ",
            'word_attempts' => "
                CREATE TABLE IF NOT EXISTS word_attempts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id VARCHAR(255) NOT NULL,
                    word VARCHAR(100) NOT NULL,
                    is_correct BOOLEAN DEFAULT FALSE,
                    attempts INT DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            "
        ];
        
        $created = [];
        foreach ($tables as $tableName => $sql) {
            try {
                $this->connection->exec($sql);
                $created[$tableName] = true;
                error_log("Table '{$tableName}' created or already exists");
            } catch (PDOException $e) {
                $created[$tableName] = false;
                error_log("Failed to create table '{$tableName}': " . $e->getMessage());
            }
        }
        
        return $created;
    }
    
    private function __clone() {}
    
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}