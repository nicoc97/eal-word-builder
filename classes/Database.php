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
     * Load database configuration from environment variables with .env file support
     */
    private function loadConfig() {
        // Load .env file if it exists (for local development)
        $this->loadDotEnv();
        
        // Railway provides these environment variables
        $this->host = $_ENV['MYSQL_HOST'] ?? getenv('MYSQL_HOST') ?? 'localhost';
        $this->database = $_ENV['MYSQL_DATABASE'] ?? getenv('MYSQL_DATABASE') ?? 'word_builder_game';
        $this->username = $_ENV['MYSQL_USER'] ?? getenv('MYSQL_USER') ?? 'root';
        $this->password = $_ENV['MYSQL_PASSWORD'] ?? getenv('MYSQL_PASSWORD') ?? '';
        $this->port = $_ENV['MYSQL_PORT'] ?? getenv('MYSQL_PORT') ?? '3306';
        $this->charset = 'utf8mb4';
        
        // For local development, check DB_* variables as fallback
        if ($this->host === 'localhost' || empty(getenv('MYSQL_HOST'))) {
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
     * Load .env file if it exists
     */
    private function loadDotEnv() {
        $envFile = dirname(__DIR__) . '/.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) {
                    continue; // Skip comments
                }
                
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);
                
                // Remove quotes if present
                if (preg_match('/^".*"$/', $value) || preg_match('/^\'.*\'$/', $value)) {
                    $value = substr($value, 1, -1);
                }
                
                if (!array_key_exists($name, $_ENV)) {
                    $_ENV[$name] = $value;
                    putenv("$name=$value");
                }
            }
        }
    }
    
    /**
     * Establish PDO database connection
     */
    private function connect() {
        try {
            // Force TCP connection for Docker - use 127.0.0.1 instead of localhost
            $host = ($this->host === 'localhost') ? '127.0.0.1' : $this->host;
            
            // Build DSN - keep host and port separate for Railway
            $dsn = "mysql:host={$host};port={$this->port};dbname={$this->database};charset={$this->charset}";
            
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
     * Create a record in the database
     * 
     * @param string $table Table name
     * @param array $data Data to insert
     * @return int|false Last insert ID or false on failure
     */
    public function create($table, $data) {
        try {
            if (empty($data)) {
                return false;
            }
            
            $fields = array_keys($data);
            $placeholders = ':' . implode(', :', $fields);
            $fieldList = implode(', ', $fields);
            
            $query = "INSERT INTO `{$table}` ({$fieldList}) VALUES ({$placeholders})";
            
            $params = [];
            foreach ($data as $key => $value) {
                $params[':' . $key] = $value;
            }
            
            $this->execute($query, $params);
            return $this->connection->lastInsertId();
            
        } catch (Exception $e) {
            error_log("Failed to create record in {$table}: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Read records from database with conditions
     * 
     * @param string $table Table name
     * @param array $conditions Associative array of conditions
     * @param string $orderBy Order by clause (optional)
     * @param int $limit Limit results (optional)
     * @return array Array of records
     */
    public function read($table, $conditions = [], $orderBy = null, $limit = null) {
        try {
            $query = "SELECT * FROM `{$table}`";
            $params = [];
            
            if (!empty($conditions)) {
                $whereClauses = [];
                foreach ($conditions as $field => $value) {
                    $whereClauses[] = "`{$field}` = :{$field}";
                    $params[':' . $field] = $value;
                }
                $query .= " WHERE " . implode(' AND ', $whereClauses);
            }
            
            if ($orderBy) {
                $query .= " ORDER BY {$orderBy}";
            }
            
            if ($limit) {
                $query .= " LIMIT {$limit}";
            }
            
            return $this->fetchAll($query, $params);
            
        } catch (Exception $e) {
            error_log("Failed to read from {$table}: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Find a single record
     * 
     * @param string $table Table name
     * @param array $conditions Conditions
     * @return array|false Single record or false if not found
     */
    public function find($table, $conditions) {
        $results = $this->read($table, $conditions, null, 1);
        return !empty($results) ? $results[0] : false;
    }
    
    /**
     * Update records in database
     * 
     * @param string $table Table name
     * @param array $data Data to update
     * @param array $conditions Update conditions
     * @return int Number of affected rows
     */
    public function updateRecord($table, $data, $conditions) {
        try {
            if (empty($data) || empty($conditions)) {
                return 0;
            }
            
            $setClauses = [];
            $params = [];
            
            // Build SET clauses
            foreach ($data as $field => $value) {
                $setClauses[] = "`{$field}` = :set_{$field}";
                $params[':set_' . $field] = $value;
            }
            
            // Build WHERE clauses
            $whereClauses = [];
            foreach ($conditions as $field => $value) {
                $whereClauses[] = "`{$field}` = :where_{$field}";
                $params[':where_' . $field] = $value;
            }
            
            $query = "UPDATE `{$table}` SET " . implode(', ', $setClauses) . 
                     " WHERE " . implode(' AND ', $whereClauses);
            
            $stmt = $this->execute($query, $params);
            return $stmt->rowCount();
            
        } catch (Exception $e) {
            error_log("Failed to update {$table}: " . $e->getMessage());
            return 0;
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
    
    /**
     * Verify that all required tables exist with correct schema
     * 
     * @return bool True if schema is valid
     */
    public function verifySchema() {
        try {
            $requiredTables = ['sessions', 'progress', 'word_attempts'];
            $existingTables = $this->getTableList();
            
            foreach ($requiredTables as $table) {
                if (!in_array($table, $existingTables)) {
                    error_log("Missing table: {$table}");
                    return false;
                }
            }
            
            // Verify key columns exist
            $progressColumns = $this->getTableColumns('progress');
            $requiredProgressColumns = [
                'session_id', 'level', 'words_completed', 
                'total_attempts', 'correct_attempts', 'current_streak', 
                'best_streak', 'time_spent'
            ];
            
            foreach ($requiredProgressColumns as $column) {
                if (!in_array($column, $progressColumns)) {
                    error_log("Missing column in progress table: {$column}");
                    return false;
                }
            }
            
            return true;
            
        } catch (Exception $e) {
            error_log("Schema verification failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get column names for a table
     * 
     * @param string $table Table name
     * @return array Array of column names
     */
    public function getTableColumns($table) {
        try {
            $columns = $this->fetchAll("DESCRIBE `{$table}`");
            return array_column($columns, 'Field');
        } catch (Exception $e) {
            error_log("Failed to get columns for table {$table}: " . $e->getMessage());
            return [];
        }
    }
    
    private function __clone() {}
    
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}