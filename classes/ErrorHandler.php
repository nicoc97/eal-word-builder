<?php

/**
 * Comprehensive Error Handler for Word Builder Game
 * 
 * Provides centralized error handling, input validation, and security measures
 * for the EAL word building game backend. This class implements robust error
 * management with graceful degradation and detailed logging.
 * 
 * Key Features:
 * - Standardized error responses with appropriate HTTP status codes
 * - Input validation with XSS and SQL injection prevention
 * - Graceful database failure handling
 * - Security-focused error logging without exposing sensitive data
 * - Rate limiting and abuse prevention
 * 
 * @author Word Builder Game
 * @version 1.0
 */

class ErrorHandler {
    
    private static $instance = null;
    private $logFile;
    private $rateLimitStore = [];
    
    /**
     * Private constructor for singleton pattern
     */
    private function __construct() {
        $this->logFile = __DIR__ . '/../logs/error.log';
        $this->ensureLogDirectory();
        $this->setupErrorHandling();
    }
    
    /**
     * Get singleton instance
     * 
     * @return ErrorHandler
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Setup global error and exception handling
     */
    private function setupErrorHandling() {
        // Set custom error handler
        set_error_handler([$this, 'handleError']);
        
        // Set custom exception handler
        set_exception_handler([$this, 'handleException']);
        
        // Register shutdown function for fatal errors
        register_shutdown_function([$this, 'handleShutdown']);
    }
    
    /**
     * Validate and sanitize input data
     * 
     * @param array $data Input data to validate
     * @param array $rules Validation rules
     * @return array Validation result with errors and sanitized data
     */
    public function validateInput($data, $rules) {
        $errors = [];
        $sanitized = [];
        
        foreach ($rules as $field => $rule) {
            $value = $data[$field] ?? null;
            
            // Check required fields
            if (isset($rule['required']) && $rule['required'] && empty($value)) {
                $errors[$field] = "Field '{$field}' is required";
                continue;
            }
            
            // Skip validation if field is not required and empty
            if (empty($value) && (!isset($rule['required']) || !$rule['required'])) {
                $sanitized[$field] = null;
                continue;
            }
            
            // Apply validation rules
            $fieldErrors = $this->validateField($field, $value, $rule);
            if (!empty($fieldErrors)) {
                $errors[$field] = $fieldErrors;
                continue;
            }
            
            // Sanitize the value
            $sanitized[$field] = $this->sanitizeValue($value, $rule);
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'data' => $sanitized
        ];
    }
    
    /**
     * Validate individual field
     * 
     * @param string $field Field name
     * @param mixed $value Field value
     * @param array $rule Validation rule
     * @return array Field validation errors
     */
    private function validateField($field, $value, $rule) {
        $errors = [];
        
        // Type validation
        if (isset($rule['type'])) {
            switch ($rule['type']) {
                case 'string':
                    if (!is_string($value)) {
                        $errors[] = "Field '{$field}' must be a string";
                    }
                    break;
                case 'integer':
                    if (!is_numeric($value) || (int)$value != $value) {
                        $errors[] = "Field '{$field}' must be an integer";
                    }
                    break;
                case 'float':
                    if (!is_numeric($value)) {
                        $errors[] = "Field '{$field}' must be a number";
                    }
                    break;
                case 'boolean':
                    if (!is_bool($value) && !in_array($value, [0, 1, '0', '1', 'true', 'false'])) {
                        $errors[] = "Field '{$field}' must be a boolean";
                    }
                    break;
                case 'email':
                    if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                        $errors[] = "Field '{$field}' must be a valid email address";
                    }
                    break;
                case 'session_id':
                    if (!$this->isValidSessionId($value)) {
                        $errors[] = "Field '{$field}' must be a valid session ID";
                    }
                    break;
            }
        }
        
        // Length validation
        if (isset($rule['min_length']) && strlen($value) < $rule['min_length']) {
            $errors[] = "Field '{$field}' must be at least {$rule['min_length']} characters";
        }
        
        if (isset($rule['max_length']) && strlen($value) > $rule['max_length']) {
            $errors[] = "Field '{$field}' must be no more than {$rule['max_length']} characters";
        }
        
        // Numeric range validation
        if (isset($rule['min']) && is_numeric($value) && $value < $rule['min']) {
            $errors[] = "Field '{$field}' must be at least {$rule['min']}";
        }
        
        if (isset($rule['max']) && is_numeric($value) && $value > $rule['max']) {
            $errors[] = "Field '{$field}' must be no more than {$rule['max']}";
        }
        
        // Pattern validation
        if (isset($rule['pattern']) && !preg_match($rule['pattern'], $value)) {
            $errors[] = "Field '{$field}' format is invalid";
        }
        
        // Custom validation
        if (isset($rule['custom']) && is_callable($rule['custom'])) {
            $customResult = $rule['custom']($value);
            if ($customResult !== true) {
                $errors[] = is_string($customResult) ? $customResult : "Field '{$field}' is invalid";
            }
        }
        
        return $errors;
    }
    
    /**
     * Sanitize input value
     * 
     * @param mixed $value Value to sanitize
     * @param array $rule Sanitization rules
     * @return mixed Sanitized value
     */
    private function sanitizeValue($value, $rule) {
        // XSS prevention - escape HTML entities
        if (is_string($value)) {
            $value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
        }
        
        // Trim whitespace for strings
        if (is_string($value) && (!isset($rule['preserve_whitespace']) || !$rule['preserve_whitespace'])) {
            $value = trim($value);
        }
        
        // Type casting
        if (isset($rule['type'])) {
            switch ($rule['type']) {
                case 'integer':
                    $value = (int) $value;
                    break;
                case 'float':
                    $value = (float) $value;
                    break;
                case 'boolean':
                    $value = in_array($value, [1, '1', 'true', true], true);
                    break;
            }
        }
        
        // Additional sanitization
        if (isset($rule['sanitize'])) {
            switch ($rule['sanitize']) {
                case 'alphanumeric':
                    $value = preg_replace('/[^a-zA-Z0-9]/', '', $value);
                    break;
                case 'filename':
                    $value = preg_replace('/[^a-zA-Z0-9._-]/', '', $value);
                    break;
                case 'slug':
                    $value = strtolower(preg_replace('/[^a-zA-Z0-9-]/', '-', $value));
                    $value = preg_replace('/-+/', '-', $value);
                    $value = trim($value, '-');
                    break;
            }
        }
        
        return $value;
    }
    
    /**
     * Check if session ID is valid format
     * 
     * @param string $sessionId Session ID to validate
     * @return bool True if valid
     */
    private function isValidSessionId($sessionId) {
        // Session ID should be alphanumeric with hyphens, reasonable length
        return preg_match('/^[a-zA-Z0-9-]{10,100}$/', $sessionId);
    }
    
    /**
     * Handle database connection failures gracefully
     * 
     * @param Exception $e Database exception
     * @return array Fallback response
     */
    public function handleDatabaseFailure($e) {
        $this->logError('Database connection failed', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return [
            'success' => false,
            'error' => 'Service temporarily unavailable. Please try again later.',
            'error_code' => 'DB_CONNECTION_FAILED',
            'timestamp' => date('c'),
            'fallback_mode' => true
        ];
    }
    
    /**
     * Rate limiting check
     * 
     * @param string $identifier Client identifier (IP, session, etc.)
     * @param int $maxRequests Maximum requests allowed
     * @param int $timeWindow Time window in seconds
     * @return bool True if request is allowed
     */
    public function checkRateLimit($identifier, $maxRequests = 100, $timeWindow = 3600) {
        $now = time();
        $windowStart = $now - $timeWindow;
        
        // Clean old entries
        if (isset($this->rateLimitStore[$identifier])) {
            $this->rateLimitStore[$identifier] = array_filter(
                $this->rateLimitStore[$identifier],
                function($timestamp) use ($windowStart) {
                    return $timestamp > $windowStart;
                }
            );
        } else {
            $this->rateLimitStore[$identifier] = [];
        }
        
        // Check if limit exceeded
        if (count($this->rateLimitStore[$identifier]) >= $maxRequests) {
            $this->logError('Rate limit exceeded', [
                'identifier' => $identifier,
                'requests' => count($this->rateLimitStore[$identifier]),
                'limit' => $maxRequests,
                'window' => $timeWindow
            ]);
            return false;
        }
        
        // Add current request
        $this->rateLimitStore[$identifier][] = $now;
        return true;
    }
    
    /**
     * Generate secure error response
     * 
     * @param string $message Error message
     * @param int $statusCode HTTP status code
     * @param array $details Additional error details (for logging only)
     * @param bool $includeTrace Whether to include stack trace (development only)
     * @return array Error response
     */
    public function generateErrorResponse($message, $statusCode = 400, $details = [], $includeTrace = false) {
        // Log the error with full details
        $this->logError($message, array_merge($details, [
            'status_code' => $statusCode,
            'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
            'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'ip_address' => $this->getClientIP()
        ]));
        
        // Prepare response (sanitized for client)
        $response = [
            'success' => false,
            'error' => $message,
            'error_code' => $this->getErrorCode($statusCode),
            'timestamp' => date('c')
        ];
        
        // Include trace only in development mode
        if ($includeTrace && $this->isDevelopmentMode()) {
            $response['trace'] = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS);
        }
        
        // Set appropriate HTTP status code
        http_response_code($statusCode);
        
        return $response;
    }
    
    /**
     * Handle PHP errors
     * 
     * @param int $severity Error severity
     * @param string $message Error message
     * @param string $file File where error occurred
     * @param int $line Line number where error occurred
     * @return bool True to prevent default PHP error handler
     */
    public function handleError($severity, $message, $file, $line) {
        // Don't handle suppressed errors (@)
        if (!(error_reporting() & $severity)) {
            return false;
        }
        
        $severityName = $this->getSeverityName($severity);
        
        $this->logError("PHP {$severityName}: {$message}", [
            'file' => $file,
            'line' => $line,
            'severity' => $severity
        ]);
        
        // For fatal errors, send error response
        if (in_array($severity, [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR])) {
            $this->sendErrorResponse('Internal server error', 500);
        }
        
        return true;
    }
    
    /**
     * Handle uncaught exceptions
     * 
     * @param Throwable $exception Uncaught exception
     */
    public function handleException($exception) {
        $this->logError('Uncaught exception: ' . $exception->getMessage(), [
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString()
        ]);
        
        $this->sendErrorResponse('Internal server error', 500);
    }
    
    /**
     * Handle fatal errors during shutdown
     */
    public function handleShutdown() {
        $error = error_get_last();
        
        if ($error && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE])) {
            $this->logError('Fatal error: ' . $error['message'], [
                'file' => $error['file'],
                'line' => $error['line'],
                'type' => $error['type']
            ]);
            
            $this->sendErrorResponse('Internal server error', 500);
        }
    }
    
    /**
     * Log error with context
     * 
     * @param string $message Error message
     * @param array $context Additional context
     */
    private function logError($message, $context = []) {
        $logEntry = [
            'timestamp' => date('c'),
            'message' => $message,
            'context' => $context
        ];
        
        $logLine = json_encode($logEntry) . PHP_EOL;
        
        // Write to log file
        file_put_contents($this->logFile, $logLine, FILE_APPEND | LOCK_EX);
        
        // Also log to PHP error log in development
        if ($this->isDevelopmentMode()) {
            error_log($message . ' - Context: ' . json_encode($context));
        }
    }
    
    /**
     * Send error response and exit
     * 
     * @param string $message Error message
     * @param int $statusCode HTTP status code
     */
    private function sendErrorResponse($message, $statusCode) {
        if (!headers_sent()) {
            header('Content-Type: application/json');
            http_response_code($statusCode);
        }
        
        echo json_encode($this->generateErrorResponse($message, $statusCode));
        exit;
    }
    
    /**
     * Get client IP address
     * 
     * @return string Client IP address
     */
    private function getClientIP() {
        $ipKeys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
        
        foreach ($ipKeys as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = $_SERVER[$key];
                // Handle comma-separated IPs (X-Forwarded-For)
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }
    
    /**
     * Get error code from HTTP status
     * 
     * @param int $statusCode HTTP status code
     * @return string Error code
     */
    private function getErrorCode($statusCode) {
        $codes = [
            400 => 'BAD_REQUEST',
            401 => 'UNAUTHORIZED',
            403 => 'FORBIDDEN',
            404 => 'NOT_FOUND',
            405 => 'METHOD_NOT_ALLOWED',
            422 => 'VALIDATION_ERROR',
            429 => 'RATE_LIMIT_EXCEEDED',
            500 => 'INTERNAL_SERVER_ERROR',
            503 => 'SERVICE_UNAVAILABLE'
        ];
        
        return $codes[$statusCode] ?? 'UNKNOWN_ERROR';
    }
    
    /**
     * Get severity name from PHP error constant
     * 
     * @param int $severity Error severity constant
     * @return string Severity name
     */
    private function getSeverityName($severity) {
        $severities = [
            E_ERROR => 'Error',
            E_WARNING => 'Warning',
            E_PARSE => 'Parse Error',
            E_NOTICE => 'Notice',
            E_CORE_ERROR => 'Core Error',
            E_CORE_WARNING => 'Core Warning',
            E_COMPILE_ERROR => 'Compile Error',
            E_COMPILE_WARNING => 'Compile Warning',
            E_USER_ERROR => 'User Error',
            E_USER_WARNING => 'User Warning',
            E_USER_NOTICE => 'User Notice',
            E_STRICT => 'Strict Standards',
            E_RECOVERABLE_ERROR => 'Recoverable Error',
            E_DEPRECATED => 'Deprecated',
            E_USER_DEPRECATED => 'User Deprecated'
        ];
        
        return $severities[$severity] ?? 'Unknown';
    }
    
    /**
     * Check if running in development mode
     * 
     * @return bool True if in development mode
     */
    private function isDevelopmentMode() {
        return (
            (isset($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'development') ||
            (isset($_ENV['APP_DEBUG']) && $_ENV['APP_DEBUG'] === 'true') ||
            (defined('WP_DEBUG') && WP_DEBUG) ||
            ini_get('display_errors')
        );
    }
    
    /**
     * Ensure log directory exists
     */
    private function ensureLogDirectory() {
        $logDir = dirname($this->logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
    }
    
    /**
     * Prevent cloning
     */
    private function __clone() {}
    
    /**
     * Prevent unserialization
     */
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}