<?php

/**
 * Database Connection Class for Word Builder Game
 * 
 * Provides secure PDO-based database connectivity with connection management,
 * error handling, and prepared statement support for the EAL word building game.
 * 
 * This class implements security best practices including:
 * - Prepared statements to prevent SQL injection
 * - Connection pooling for performance
 * - Proper error handling and logging
 * - Transaction support for data integrity
 * 
 * @author Word Builder Game
 * @version 1.0
 */
class Database {
    
    private static $instance = null;
    private $connection;
    private $host;
    private $database;
    private $username;
    private $password;
    private $charset;
    
    /**
     * Private constructor to implement singleton pattern
     * Prevents direct instantiation and ensures single database connection
     */
    private function __construct() {
        // Load database configuration
        $this->loadConfig();
        $this->connect();
    }
    
    /**
     * Get singleton instance of Database class
     * Implements connection pooling by reusing single instance
     * 
     * @return Database Single instance of database connection
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Load database configuration from environment or config file
     * Updated to support Railway.app's MYSQL_ environment variables
     */
    private function loadConfig() {
        // Load from Railway.app environment variables (MYSQL_*) with fallbacks to standard DB_* variables
        $this->host = $_ENV['MYSQL_HOST'] ?? $_ENV['DB_HOST'] ?? 'localhost';
        $this->database = $_ENV['MYSQL_DATABASE'] ?? $_ENV['DB_NAME'] ?? $_ENV['DB_DATABASE'] ?? 'word_builder_game';
        $this->username = $_ENV['MYSQL_USER'] ?? $_ENV['DB_USER'] ?? $_ENV['DB_USERNAME'] ?? 'root';
        $this->password = $_ENV['MYSQL_PASSWORD'] ?? $_ENV['DB_PASS'] ?? $_ENV['DB_PASSWORD'] ?? '';
        
        // Handle port - Railway typically uses 3306
        $port = $_ENV['MYSQL_PORT'] ?? $_ENV['DB_PORT'] ?? 3306;
        $this->host = $this->host . (($port != 3306) ? ":$port" : '');
        
        $this->charset = $_ENV['DB_CHARSET'] ?? 'utf8mb4';
        
        // Alternative: Load from config file if environment variables not available
        if (file_exists(__DIR__ . '/../config/database.php')) {
            $config = require __DIR__ . '/../config/database.php';
            $this->host = $config['host'] ?? $this->host;
            $this->database = $config['database'] ?? $this->database;
            $this->username = $config['username'] ?? $this->username;
            $this->password = $config['password'] ?? $this->password;
            $this->charset = $config['charset'] ?? $this->charset;
        }
    }
    
    /**
     * Establish PDO database connection with enhanced security settings
     * Updated for Railway.app compatibility
     */
    private function connect() {
        try {
            $dsn = "mysql:host={$this->host};dbname={$this->database};charset={$this->charset}";
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false, // Use real prepared statements for security
                PDO::ATTR_PERSISTENT => false, // Disable persistent connections for Railway
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$this->charset}",
                PDO::ATTR_TIMEOUT => 30, // Connection timeout
                PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true, // Buffer queries for better memory management
                PDO::MYSQL_ATTR_FOUND_ROWS => true, // Return matched rows instead of changed rows
            ];
            
            // Railway-specific SSL settings
            $isRailway = !empty($_ENV['RAILWAY_ENVIRONMENT']) || !empty($_ENV['MYSQL_HOST']);
            
            if ($isRailway) {
                // Railway's internal network doesn't require SSL verification
                $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
            } else {
                // Add SSL options for production environments
                if (isset($_ENV['DB_SSL_REQUIRED']) && $_ENV['DB_SSL_REQUIRED'] === 'true') {
                    $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
                    $options[PDO::MYSQL_ATTR_SSL_CA] = $_ENV['DB_SSL_CA'] ?? null;
                }
            }
            
            $this->connection = new PDO($dsn, $this->username, $this->password, $options);
            
            // Set additional security settings
            $this->connection->exec("SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION'");
            
        } catch (PDOException $e) {
            // Log error securely without exposing credentials
            error_log("Database connection failed: " . $e->getMessage() . " | Host: " . $this->host . " | Database: " . $this->database);
            throw new Exception("Database connection failed. Please check configuration.");
        }
    }
    
    /**
     * Debug method to show current configuration
     * Remove this method in production!
     */
    public function debugConfig() {
        return [
            'host' => $this->host,
            'database' => $this->database,
            'username' => $this->username,
            'password' => $this->password ? '[SET]' : '[NOT SET]',
            'charset' => $this->charset,
            'environment_vars' => [
                'MYSQL_HOST' => $_ENV['MYSQL_HOST'] ?? '[NOT SET]',
                'MYSQL_DATABASE' => $_ENV['MYSQL_DATABASE'] ?? '[NOT SET]',
                'MYSQL_USER' => $_ENV['MYSQL_USER'] ?? '[NOT SET]',
                'MYSQL_PASSWORD' => !empty($_ENV['MYSQL_PASSWORD']) ? '[SET]' : '[NOT SET]',
                'MYSQL_PORT' => $_ENV['MYSQL_PORT'] ?? '[NOT SET]',
                'RAILWAY_ENVIRONMENT' => $_ENV['RAILWAY_ENVIRONMENT'] ?? '[NOT SET]',
            ]
        ];
    }
    
    /**
     * Get the PDO connection instance
     * 
     * @return PDO Active database connection
     */
    public function getConnection() {
        // Check if connection is still alive
        if ($this->connection === null) {
            $this->connect();
        }
        return $this->connection;
    }
    
    /**
     * Execute a prepared statement with parameters and enhanced security
     * Provides secure way to execute queries with user input
     * 
     * @param string $query SQL query with placeholders
     * @param array $params Parameters to bind to query
     * @return PDOStatement Executed statement
     * @throws Exception If query execution fails
     */
    public function execute($query, $params = []) {
        try {
            // Validate query for basic security (prevent some SQL injection attempts)
            $this->validateQuery($query);
            
            // Reconnect if connection was lost
            if ($this->connection === null) {
                $this->connect();
            }
            
            $stmt = $this->connection->prepare($query);
            
            // Bind parameters with explicit types for better security
            foreach ($params as $key => $value) {
                $paramType = $this->getParamType($value);
                $stmt->bindValue(is_string($key) ? ":$key" : $key, $value, $paramType);
            }
            
            $stmt->execute();
            return $stmt;
            
        } catch (PDOException $e) {
            // Log error with sanitized information
            $sanitizedQuery = preg_replace('/\b(password|token|secret)\s*=\s*[\'"][^\'"]*[\'"]/', '$1=***', $query);
            error_log("Query execution failed: " . $e->getMessage() . " Query: " . $sanitizedQuery);
            throw new Exception("Database query failed: " . $e->getMessage());
        }
    }
    
    /**
     * Validate SQL query for basic security checks
     * Prevents some common SQL injection patterns
     * 
     * @param string $query SQL query to validate
     * @throws Exception If query contains suspicious patterns
     */
    private function validateQuery($query) {
        // List of dangerous SQL patterns to block
        $dangerousPatterns = [
            '/;\s*(drop|alter|create|truncate)\s+/i',
            '/union\s+select/i',
            '/\/\*.*\*\//s', // Block SQL comments
            '/--\s*[^\r\n]*/i', // Block SQL line comments
        ];
        
        foreach ($dangerousPatterns as $pattern) {
            if (preg_match($pattern, $query)) {
                error_log("Blocked potentially dangerous query: " . substr($query, 0, 100));
                throw new Exception("Query contains potentially dangerous patterns");
            }
        }
    }
    
    /**
     * Determine appropriate PDO parameter type for value
     * 
     * @param mixed $value Value to determine type for
     * @return int PDO parameter type constant
     */
    private function getParamType($value) {
        if (is_int($value)) {
            return PDO::PARAM_INT;
        } elseif (is_bool($value)) {
            return PDO::PARAM_BOOL;
        } elseif (is_null($value)) {
            return PDO::PARAM_NULL;
        } else {
            return PDO::PARAM_STR;
        }
    }
    
    /**
     * Fetch single row from database
     * 
     * @param string $query SQL query
     * @param array $params Query parameters
     * @return array|false Single row or false if not found
     */
    public function fetchRow($query, $params = []) {
        $stmt = $this->execute($query, $params);
        return $stmt->fetch();
    }
    
    /**
     * Fetch all rows from database
     * 
     * @param string $query SQL query
     * @param array $params Query parameters
     * @return array Array of rows
     */
    public function fetchAll($query, $params = []) {
        $stmt = $this->execute($query, $params);
        return $stmt->fetchAll();
    }
    
    /**
     * Insert data and return last insert ID
     * 
     * @param string $query INSERT query
     * @param array $params Query parameters
     * @return string Last insert ID
     */
    public function insert($query, $params = []) {
        $this->execute($query, $params);
        return $this->connection->lastInsertId();
    }
    
    /**
     * Update data and return affected rows count
     * 
     * @param string $query UPDATE query
     * @param array $params Query parameters
     * @return int Number of affected rows
     */
    public function update($query, $params = []) {
        $stmt = $this->execute($query, $params);
        return $stmt->rowCount();
    }
    
    /**
     * Delete data and return affected rows count
     * 
     * @param string $query DELETE query
     * @param array $params Query parameters
     * @return int Number of affected rows
     */
    public function delete($query, $params = []) {
        $stmt = $this->execute($query, $params);
        return $stmt->rowCount();
    }
    
    /**
     * Begin database transaction
     * Essential for maintaining data integrity in progress tracking
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
     * Check if currently in a transaction
     * 
     * @return bool True if in transaction
     */
    public function inTransaction() {
        return $this->connection->inTransaction();
    }
    
    /**
     * Test database connection and basic functionality
     * Useful for health checks and setup verification
     * 
     * @return bool True if database is accessible and functional
     */
    public function testConnection() {
        try {
            $result = $this->fetchRow("SELECT 1 as test");
            return $result['test'] === 1;
        } catch (Exception $e) {
            error_log("Database connection test failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get database schema information for setup verification
     * Checks if required tables exist for the word builder game
     * 
     * @return array List of existing tables
     */
    public function getTableList() {
        try {
            $tables = $this->fetchAll("SHOW TABLES");
            return array_column($tables, "Tables_in_{$this->database}");
        } catch (Exception $e) {
            error_log("Failed to get table list: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Verify that all required tables exist for the word builder game
     * Essential for ensuring proper database setup
     * 
     * @return bool True if all required tables exist
     */
    public function verifySchema() {
        $requiredTables = ['sessions', 'progress', 'word_attempts'];
        $existingTables = $this->getTableList();
        
        foreach ($requiredTables as $table) {
            if (!in_array($table, $existingTables)) {
                error_log("Required table missing: " . $table);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Generic CRUD Operations for all tables
     * These methods provide standardised database operations for the word builder game
     */
    
    /**
     * Create a new record in specified table
     * 
     * @param string $table Table name
     * @param array $data Associative array of column => value pairs
     * @return string Last insert ID
     * @throws Exception If insert fails
     */
    public function create($table, $data) {
        if (empty($data)) {
            throw new Exception("No data provided for insert");
        }
        
        $columns = implode(', ', array_keys($data));
        $placeholders = ':' . implode(', :', array_keys($data));
        
        $query = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";
        
        return $this->insert($query, $data);
    }
    
    /**
     * Read records from specified table with optional conditions
     * 
     * @param string $table Table name
     * @param array $conditions WHERE conditions as column => value pairs
     * @param string $orderBy ORDER BY clause (optional)
     * @param int $limit LIMIT clause (optional)
     * @return array Array of matching records
     */
    public function read($table, $conditions = [], $orderBy = '', $limit = null) {
        $query = "SELECT * FROM {$table}";
        $params = [];
        
        if (!empty($conditions)) {
            $whereClause = [];
            foreach ($conditions as $column => $value) {
                $whereClause[] = "{$column} = :{$column}";
                $params[$column] = $value;
            }
            $query .= " WHERE " . implode(' AND ', $whereClause);
        }
        
        if (!empty($orderBy)) {
            $query .= " ORDER BY {$orderBy}";
        }
        
        if ($limit !== null) {
            $query .= " LIMIT {$limit}";
        }
        
        return $this->fetchAll($query, $params);
    }
    
    /**
     * Update records in specified table
     * 
     * @param string $table Table name
     * @param array $data Data to update as column => value pairs
     * @param array $conditions WHERE conditions as column => value pairs
     * @return int Number of affected rows
     * @throws Exception If no conditions provided or update fails
     */
    public function updateRecord($table, $data, $conditions) {
        if (empty($conditions)) {
            throw new Exception("Update conditions are required for security");
        }
        
        if (empty($data)) {
            throw new Exception("No data provided for update");
        }
        
        $setClause = [];
        $params = [];
        
        foreach ($data as $column => $value) {
            $setClause[] = "{$column} = :set_{$column}";
            $params["set_{$column}"] = $value;
        }
        
        $whereClause = [];
        foreach ($conditions as $column => $value) {
            $whereClause[] = "{$column} = :where_{$column}";
            $params["where_{$column}"] = $value;
        }
        
        $query = "UPDATE {$table} SET " . implode(', ', $setClause) . 
                 " WHERE " . implode(' AND ', $whereClause);
        
        return $this->update($query, $params);
    }
    
    /**
     * Delete records from specified table
     * 
     * @param string $table Table name
     * @param array $conditions WHERE conditions as column => value pairs
     * @return int Number of affected rows
     * @throws Exception If no conditions provided or delete fails
     */
    public function deleteRecord($table, $conditions) {
        if (empty($conditions)) {
            throw new Exception("Delete conditions are required for security");
        }
        
        $whereClause = [];
        $params = [];
        
        foreach ($conditions as $column => $value) {
            $whereClause[] = "{$column} = :{$column}";
            $params[$column] = $value;
        }
        
        $query = "DELETE FROM {$table} WHERE " . implode(' AND ', $whereClause);
        
        return $this->delete($query, $params);
    }
    
    /**
     * Find a single record by ID or conditions
     * 
     * @param string $table Table name
     * @param mixed $id Primary key value or array of conditions
     * @param string $primaryKey Primary key column name (default: 'id')
     * @return array|false Single record or false if not found
     */
    public function find($table, $id, $primaryKey = 'id') {
        if (is_array($id)) {
            // Multiple conditions provided
            $conditions = $id;
        } else {
            // Single ID provided
            $conditions = [$primaryKey => $id];
        }
        
        $results = $this->read($table, $conditions, '', 1);
        return !empty($results) ? $results[0] : false;
    }
    
    /**
     * Count records in table with optional conditions
     * 
     * @param string $table Table name
     * @param array $conditions WHERE conditions as column => value pairs
     * @return int Number of matching records
     */
    public function count($table, $conditions = []) {
        $query = "SELECT COUNT(*) as count FROM {$table}";
        $params = [];
        
        if (!empty($conditions)) {
            $whereClause = [];
            foreach ($conditions as $column => $value) {
                $whereClause[] = "{$column} = :{$column}";
                $params[$column] = $value;
            }
            $query .= " WHERE " . implode(' AND ', $whereClause);
        }
        
        $result = $this->fetchRow($query, $params);
        return (int) $result['count'];
    }
    
    /**
     * Execute raw SQL query with enhanced error handling
     * Use with caution - prefer the CRUD methods above for security
     * 
     * @param string $query Raw SQL query
     * @param array $params Query parameters
     * @return PDOStatement Executed statement
     * @throws Exception If query execution fails
     */
    public function query($query, $params = []) {
        // Log query for debugging in development
        if (isset($_ENV['APP_DEBUG']) && $_ENV['APP_DEBUG'] === 'true') {
            error_log("Executing query: " . $query . " with params: " . json_encode($params));
        }
        
        return $this->execute($query, $params);
    }
    
    /**
     * Get connection statistics for monitoring
     * Useful for performance monitoring and debugging
     * 
     * @return array Connection statistics
     */
    public function getConnectionStats() {
        try {
            $stats = $this->fetchAll("SHOW STATUS LIKE 'Connections'");
            $processlist = $this->fetchAll("SHOW PROCESSLIST");
            
            return [
                'total_connections' => $stats[0]['Value'] ?? 0,
                'active_connections' => count($processlist),
                'connection_alive' => $this->testConnection(),
                'in_transaction' => $this->inTransaction()
            ];
        } catch (Exception $e) {
            error_log("Failed to get connection stats: " . $e->getMessage());
            return [
                'error' => 'Unable to retrieve connection statistics'
            ];
        }
    }
    
    /**
     * Prevent cloning of singleton instance
     */
    private function __clone() {}
    
    /**
     * Prevent unserialization of singleton instance
     */
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}