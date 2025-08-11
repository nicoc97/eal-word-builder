<?php

// Legacy support for query parameter style requests
if (isset($_GET['endpoint']) && !defined('PROCESSING_LEGACY')) {
    define('PROCESSING_LEGACY', true);
    include __DIR__ . '/legacy.php';
    exit;
}

/**
 * RESTful API Router for Word Builder Game
 * 
 * COMPREHENSIVE API DOCUMENTATION
 * 
 * This API provides endpoints for the EAL Word Builder Game, supporting both student
 * gameplay and teacher dashboard functionality. All endpoints follow REST principles
 * with proper HTTP status codes, standardized JSON responses, and comprehensive
 * error handling.
 * 
 * ============================================================================
 * STUDENT GAME API ENDPOINTS
 * ============================================================================
 * 
 * GET /api/progress/{sessionId}
 * Purpose: Load student progress data for session continuation
 * Parameters:
 *   - sessionId (path): Unique session identifier (alphanumeric, 10-100 chars)
 * Response: {
 *   "success": true,
 *   "data": {
 *     "session_id": "session_123",
 *     "current_level": 2,
 *     "total_score": 150,
 *     "levels": [
 *       {
 *         "level": 1,
 *         "words_completed": 10,
 *         "accuracy": 0.85,
 *         "best_streak": 5
 *       }
 *     ]
 *   }
 * }
 * Error Codes: 400 (Invalid session ID), 404 (Session not found), 500 (Server error)
 * 
 * POST /api/progress
 * Purpose: Save student game progress and performance data
 * Request Body: {
 *   "session_id": "session_123",
 *   "level": 2,
 *   "words_completed": 5,
 *   "total_attempts": 8,
 *   "correct_attempts": 6,
 *   "time_spent": 300,
 *   "current_streak": 3,
 *   "word_attempt": {
 *     "word": "cat",
 *     "success": true,
 *     "time_taken": 15,
 *     "user_input": "cat"
 *   }
 * }
 * Response: {
 *   "success": true,
 *   "message": "Progress saved successfully"
 * }
 * Error Codes: 400 (Invalid data), 422 (Validation error), 500 (Server error)
 * 
 * GET /api/words/{level}
 * Purpose: Retrieve words for specified difficulty level
 * Parameters:
 *   - level (path): Difficulty level (1-10)
 *   - count (query): Number of words to return (1-50, default: 10)
 *   - category (query): Word category filter (animals, objects, actions, etc.)
 * Response: {
 *   "success": true,
 *   "data": {
 *     "level": 1,
 *     "count": 5,
 *     "category": "animals",
 *     "words": [
 *       {
 *         "word": "cat",
 *         "image": "/images/cat.jpg",
 *         "phonetic": "/kæt/",
 *         "difficulty": 1,
 *         "category": "animals"
 *       }
 *     ]
 *   }
 * }
 * Error Codes: 400 (Invalid level), 404 (No words found), 500 (Server error)
 * 
 * GET /api/levels
 * Purpose: Get available difficulty levels with metadata
 * Response: {
 *   "success": true,
 *   "data": [
 *     {
 *       "level": 1,
 *       "name": "Simple CVC Words",
 *       "description": "Basic consonant-vowel-consonant words",
 *       "example_words": ["cat", "dog", "pen"],
 *       "categories": ["animals", "objects"]
 *     }
 *   ]
 * }
 * 
 * ============================================================================
 * TEACHER DASHBOARD API ENDPOINTS
 * ============================================================================
 * 
 * GET /api/teacher/sessions
 * Purpose: Get overview of all student sessions for teacher dashboard
 * Response: {
 *   "success": true,
 *   "data": {
 *     "total_sessions": 15,
 *     "sessions": [
 *       {
 *         "session_id": "session_123",
 *         "student_name": "John Doe",
 *         "created_at": "2024-01-15T10:30:00Z",
 *         "last_active": "2024-01-15T11:45:00Z",
 *         "current_level": 2,
 *         "total_words_completed": 25,
 *         "average_accuracy": 0.82,
 *         "is_active": true
 *       }
 *     ]
 *   }
 * }
 * 
 * GET /api/teacher/progress/{sessionId}
 * Purpose: Get detailed progress analytics for specific student
 * Response: {
 *   "success": true,
 *   "data": {
 *     "session_info": {
 *       "session_id": "session_123",
 *       "student_name": "John Doe",
 *       "created_at": "2024-01-15T10:30:00Z"
 *     },
 *     "progress": {
 *       "current_level": 2,
 *       "total_score": 150,
 *       "accuracy": 0.85,
 *       "performance_metrics": {
 *         "improvement_trend": "improving",
 *         "confidence_level": "building",
 *         "recommended_action": "continue_current_level"
 *       }
 *     },
 *     "recent_attempts": [...]
 *   }
 * }
 * 
 * POST /api/teacher/session
 * Purpose: Create new student session
 * Request Body: {
 *   "student_name": "Jane Smith"
 * }
 * Response: {
 *   "success": true,
 *   "data": {
 *     "session_id": "session_456",
 *     "student_name": "Jane Smith",
 *     "created_at": "2024-01-15T12:00:00Z"
 *   }
 * }
 * 
 * GET /api/teacher/errors/{sessionId}
 * Purpose: Get error pattern analysis for pedagogical insights
 * Response: {
 *   "success": true,
 *   "data": {
 *     "total_errors": 12,
 *     "patterns": [
 *       {
 *         "type": "vowel_confusion",
 *         "frequency": 5,
 *         "description": "Confusion between similar vowel sounds",
 *         "affected_words": ["cat", "cut", "cot"],
 *         "avg_time": 25.4
 *       }
 *     ],
 *     "recommendations": [
 *       {
 *         "priority": "high",
 *         "strategy": "Focus on vowel sound discrimination",
 *         "activities": ["Minimal pair exercises", "Phonetic awareness games"]
 *       }
 *     ]
 *   }
 * }
 * 
 * ============================================================================
 * SECURITY FEATURES
 * ============================================================================
 * 
 * - Rate limiting: 100 requests per hour per IP
 * - Input validation and sanitization for all endpoints
 * - XSS prevention through output encoding
 * - SQL injection prevention using prepared statements
 * - CORS policy restricting origins to localhost/development
 * - Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
 * - Session ID format validation (alphanumeric, 10-100 characters)
 * - Request size limits (1MB maximum)
 * - Comprehensive error logging without exposing sensitive data
 * 
 * ============================================================================
 * ERROR RESPONSE FORMAT
 * ============================================================================
 * 
 * All error responses follow this standardized format:
 * {
 *   "success": false,
 *   "error": "Human-readable error message",
 *   "error_code": "MACHINE_READABLE_CODE",
 *   "timestamp": "2024-01-15T12:00:00Z"
 * }
 * 
 * Common HTTP Status Codes:
 * - 200: Success
 * - 400: Bad Request (invalid parameters)
 * - 401: Unauthorized
 * - 404: Not Found
 * - 405: Method Not Allowed
 * - 422: Validation Error
 * - 429: Rate Limit Exceeded
 * - 500: Internal Server Error
 * - 503: Service Unavailable (database issues)
 * 
 * @author Word Builder Game
 * @version 1.0
 */

// Set error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors to client
ini_set('log_errors', 1);

// Include required classes
require_once __DIR__ . '/../classes/Database.php';
require_once __DIR__ . '/../classes/ProgressManager.php';
require_once __DIR__ . '/../classes/WordManager.php';
require_once __DIR__ . '/../classes/ErrorHandler.php';

// Initialize error handler
$errorHandler = ErrorHandler::getInstance();

/**
 * API Response Helper Class
 * Standardizes API responses with consistent format and proper HTTP status codes
 */
if (!class_exists('APIResponse')) {
class APIResponse {
    
    /**
     * Send successful response with data
     * 
     * @param mixed $data Response data
     * @param int $statusCode HTTP status code (default: 200)
     * @param string $message Optional success message
     */
    public static function success($data = null, $statusCode = 200, $message = null) {
        // Security headers
        self::setSecurityHeaders();
        
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        
        $response = [
            'success' => true,
            'timestamp' => date('c')
        ];
        
        if ($message !== null) {
            $response['message'] = self::sanitizeOutput($message);
        }
        
        if ($data !== null) {
            $response['data'] = self::sanitizeOutput($data);
        }
        
        echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    /**
     * Send error response with appropriate HTTP status
     * 
     * @param string $message Error message
     * @param int $statusCode HTTP status code (default: 400)
     * @param array $details Optional error details
     */
    public static function error($message, $statusCode = 400, $details = null) {
        $errorHandler = ErrorHandler::getInstance();
        
        // Generate secure error response
        $response = $errorHandler->generateErrorResponse($message, $statusCode, $details ?? []);
        
        // Security headers
        self::setSecurityHeaders();
        header('Content-Type: application/json; charset=utf-8');
        
        echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    /**
     * Send validation error response
     * 
     * @param array $validationErrors Array of validation error messages
     */
    public static function validationError($validationErrors) {
        self::error('Validation failed', 422, [
            'validation_errors' => $validationErrors
        ]);
    }
    
    /**
     * Send rate limit exceeded response
     */
    public static function rateLimitExceeded() {
        self::error('Too many requests. Please try again later.', 429);
    }
    
    /**
     * Send database error response with fallback
     * 
     * @param Exception $e Database exception
     */
    public static function databaseError($e) {
        $errorHandler = ErrorHandler::getInstance();
        $fallbackResponse = $errorHandler->handleDatabaseFailure($e);
        
        self::setSecurityHeaders();
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(503);
        
        echo json_encode($fallbackResponse, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    /**
     * Set security headers
     */
    private static function setSecurityHeaders() {
        // Prevent XSS attacks
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        
        // CORS headers (restrictive)
        $allowedOrigins = [
            'http://localhost',
            'http://127.0.0.1',
            'https://localhost'
        ];
        
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (in_array($origin, $allowedOrigins)) {
            header("Access-Control-Allow-Origin: {$origin}");
        }
        
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Max-Age: 86400');
        
        // Prevent caching of sensitive data
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
    }
    
    /**
     * Sanitize output data to prevent XSS
     * 
     * @param mixed $data Data to sanitize
     * @return mixed Sanitized data
     */
    private static function sanitizeOutput($data) {
        if (is_string($data)) {
            return htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
        } elseif (is_array($data)) {
            return array_map([self::class, 'sanitizeOutput'], $data);
        } elseif (is_object($data)) {
            $sanitized = new stdClass();
            foreach ($data as $key => $value) {
                $sanitized->$key = self::sanitizeOutput($value);
            }
            return $sanitized;
        }
        
        return $data;
    }
}
}

/**
 * API Router Class
 * Handles request routing, method validation, and parameter extraction
 */
if (!class_exists('APIRouter')) {
class APIRouter {
    
    private $method;
    private $path;
    private $pathSegments;
    private $progressManager;
    private $wordManager;
    private $errorHandler;
    
    /**
     * Constructor - Initialize router with request data
     */
    public function __construct() {
        // Initialize error handler
        $this->errorHandler = ErrorHandler::getInstance();
        
        // Rate limiting check
        $clientIP = $this->getClientIP();
        if (!$this->errorHandler->checkRateLimit($clientIP, 100, 3600)) {
            APIResponse::rateLimitExceeded();
        }
        
        // Set CORS headers for frontend access
        $this->setCORSHeaders();
        
        // Handle preflight requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
        
        // Validate request method
        $allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
        if (!in_array($_SERVER['REQUEST_METHOD'], $allowedMethods)) {
            APIResponse::error('Method not allowed', 405);
        }
        
        // Initialize request data
        $this->method = $_SERVER['REQUEST_METHOD'];
        $this->path = $this->getRequestPath();
        $this->pathSegments = explode('/', trim($this->path, '/'));
        
        // Validate path segments for security
        foreach ($this->pathSegments as $segment) {
            if (!$this->isValidPathSegment($segment)) {
                APIResponse::error('Invalid request path', 400);
            }
        }
        
        // Initialize managers with error handling
        try {
            $this->progressManager = new ProgressManager();
            $this->wordManager = new WordManager();
        } catch (Exception $e) {
            APIResponse::databaseError($e);
        }
    }
    
    /**
     * Set CORS headers for cross-origin requests
     */
    private function setCORSHeaders() {
        // More restrictive CORS policy for security
        $allowedOrigins = [
            'http://localhost',
            'http://127.0.0.1',
            'https://localhost'
        ];
        
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (in_array($origin, $allowedOrigins)) {
            header("Access-Control-Allow-Origin: {$origin}");
        }
        
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Max-Age: 86400'); // 24 hours
        header('Access-Control-Allow-Credentials: true');
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
     * Validate path segment for security
     * 
     * @param string $segment Path segment to validate
     * @return bool True if valid
     */
    private function isValidPathSegment($segment) {
        // Allow empty segments, alphanumeric, hyphens, underscores
        return empty($segment) || preg_match('/^[a-zA-Z0-9_-]+$/', $segment);
    }
    
    /**
     * Extract request path from URL
     * 
     * @return string Clean request path
     */
    private function getRequestPath() {
        $path = $_SERVER['REQUEST_URI'];
        
        // Remove query string
        if (($pos = strpos($path, '?')) !== false) {
            $path = substr($path, 0, $pos);
        }
        
        // Remove /api prefix if present
        $path = preg_replace('/^\/api/', '', $path);
        
        return $path;
    }
    
    /**
     * Get and validate JSON input
     * 
     * @return array Parsed JSON data
     * @throws Exception If JSON is invalid
     */
    private function getJSONInput() {
        $input = file_get_contents('php://input');
        
        if (empty($input)) {
            APIResponse::error('Request body is required', 400);
        }
        
        // Check content length to prevent large payloads
        $maxSize = 1024 * 1024; // 1MB
        if (strlen($input) > $maxSize) {
            APIResponse::error('Request body too large', 413);
        }
        
        $data = json_decode($input, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            APIResponse::error('Invalid JSON: ' . json_last_error_msg(), 400);
        }
        
        return $data;
    }
    
    /**
     * Validate session ID format
     * 
     * @param string $sessionId Session ID to validate
     * @return bool True if valid
     */
    private function isValidSessionId($sessionId) {
        return preg_match('/^[a-zA-Z0-9_-]{10,100}$/', $sessionId);
    }
    
    /**
     * Route request to appropriate handler
     */
    public function route() {
        try {
            // Validate database connection with fallback
            $db = Database::getInstance();
            if (!$db->testConnection()) {
                APIResponse::databaseError(new Exception('Database connection test failed'));
            }
            
            // Route based on path segments
            if (empty($this->pathSegments[0])) {
                $this->handleRoot();
            } elseif ($this->pathSegments[0] === 'progress') {
                $this->handleProgressRoutes();
            } elseif ($this->pathSegments[0] === 'words') {
                $this->handleWordsRoutes();
            } elseif ($this->pathSegments[0] === 'levels') {
                $this->handleLevelsRoutes();
            } elseif ($this->pathSegments[0] === 'teacher') {
                $this->handleTeacherRoutes();
            } else {
                APIResponse::error('Endpoint not found', 404);
            }
            
        } catch (PDOException $e) {
            // Database-specific errors
            APIResponse::databaseError($e);
        } catch (Exception $e) {
            // General errors
            $this->errorHandler->logError("API routing error: " . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            APIResponse::error('Internal server error', 500);
        }
    }
    
    /**
     * Handle root API endpoint - API information
     */
    private function handleRoot() {
        if ($this->method !== 'GET') {
            APIResponse::error('Method not allowed', 405);
        }
        
        APIResponse::success([
            'name' => 'Word Builder Game API',
            'version' => '1.0',
            'description' => 'RESTful API for EAL word building game',
            'endpoints' => [
                'student' => [
                    'GET /api/progress/{sessionId}' => 'Load student progress',
                    'POST /api/progress' => 'Save game progress',
                    'GET /api/words/{level}' => 'Get words for level',
                    'GET /api/levels' => 'Get available difficulty levels'
                ],
                'teacher' => [
                    'GET /api/teacher/sessions' => 'Get all sessions overview',
                    'GET /api/teacher/progress/{sessionId}' => 'Get detailed student progress',
                    'POST /api/teacher/session' => 'Create new student session',
                    'GET /api/teacher/errors/{sessionId}' => 'Get error pattern analysis'
                ]
            ]
        ]);
    }
    
    /**
     * Handle progress-related routes
     * GET /api/progress/{sessionId} - Load student progress
     * POST /api/progress - Save game progress
     */
    private function handleProgressRoutes() {
        if ($this->method === 'GET') {
            $this->getProgress();
        } elseif ($this->method === 'POST') {
            $this->saveProgress();
        } else {
            APIResponse::error('Method not allowed', 405);
        }
    }
    
    /**
     * Handle words-related routes
     * GET /api/words/{level} - Get words for level
     */
    private function handleWordsRoutes() {
        if ($this->method === 'GET') {
            $this->getWords();
        } else {
            APIResponse::error('Method not allowed', 405);
        }
    }
    
    /**
     * Handle levels-related routes
     * GET /api/levels - Get available difficulty levels
     */
    private function handleLevelsRoutes() {
        if ($this->method === 'GET') {
            $this->getLevels();
        } else {
            APIResponse::error('Method not allowed', 405);
        }
    }
    
    /**
     * Handle teacher dashboard routes
     */
    private function handleTeacherRoutes() {
        if (count($this->pathSegments) < 2) {
            APIResponse::error('Teacher endpoint not specified', 400);
        }
        
        $teacherEndpoint = $this->pathSegments[1];
        
        switch ($teacherEndpoint) {
            case 'sessions':
                $this->handleTeacherSessions();
                break;
            case 'progress':
                $this->handleTeacherProgress();
                break;
            case 'session':
                $this->handleTeacherSession();
                break;
            case 'errors':
                $this->handleTeacherErrors();
                break;
            case 'timeline':
                $this->handleTeacherTimeline();
                break;
            case 'report':
                $this->handleTeacherReport();
                break;
            case 'analytics':
                $this->handleTeacherAnalytics();
                break;
            default:
                APIResponse::error('Teacher endpoint not found', 404);
        }
    }
    
    /**
     * Get student progress
     * GET /api/progress/{sessionId}
     */
    private function getProgress() {
        if (count($this->pathSegments) < 2) {
            APIResponse::error('Session ID is required', 400);
        }
        
        $sessionId = $this->pathSegments[1];
        
        // Validate session ID format
        if (!$this->isValidSessionId($sessionId)) {
            APIResponse::error('Invalid session ID format', 400);
        }
        
        // Additional security: check session ID length
        if (strlen($sessionId) > 100) {
            APIResponse::error('Session ID too long', 400);
        }
        
        try {
            $progress = $this->progressManager->getProgress($sessionId);
            
            if ($progress === false) {
                // Return empty progress for new sessions
                APIResponse::success([
                    'session_id' => htmlspecialchars($sessionId, ENT_QUOTES, 'UTF-8'),
                    'current_level' => 1,
                    'total_score' => 0,
                    'levels' => []
                ], 200, 'No progress found - starting fresh');
            }
            
            APIResponse::success($progress);
            
        } catch (PDOException $e) {
            APIResponse::databaseError($e);
        } catch (Exception $e) {
            $this->errorHandler->logError('Failed to load progress', [
                'session_id' => $sessionId,
                'error' => $e->getMessage()
            ]);
            APIResponse::error('Failed to load progress', 500);
        }
    }
    
    /**
     * Save game progress
     * POST /api/progress
     */
    private function saveProgress() {
        $input = $this->getJSONInput();
        
        // Define validation rules
        $validationRules = [
            'session_id' => [
                'required' => true,
                'type' => 'session_id',
                'max_length' => 100
            ],
            'level' => [
                'required' => true,
                'type' => 'integer',
                'min' => 1,
                'max' => 10
            ],
            'words_completed' => [
                'type' => 'integer',
                'min' => 0,
                'max' => 1000
            ],
            'total_attempts' => [
                'type' => 'integer',
                'min' => 0,
                'max' => 10000
            ],
            'correct_attempts' => [
                'type' => 'integer',
                'min' => 0,
                'max' => 10000
            ],
            'time_spent' => [
                'type' => 'integer',
                'min' => 0,
                'max' => 86400 // Max 24 hours
            ],
            'current_streak' => [
                'type' => 'integer',
                'min' => 0,
                'max' => 1000
            ]
        ];
        
        // Validate input
        $validation = $this->errorHandler->validateInput($input, $validationRules);
        
        if (!$validation['valid']) {
            APIResponse::validationError($validation['errors']);
        }
        
        $sanitizedData = $validation['data'];
        
        // Additional business logic validation
        if (isset($sanitizedData['correct_attempts']) && isset($sanitizedData['total_attempts'])) {
            if ($sanitizedData['correct_attempts'] > $sanitizedData['total_attempts']) {
                APIResponse::validationError(['correct_attempts' => 'Cannot exceed total attempts']);
            }
        }
        
        try {
            // Extract progress data
            $progressData = [];
            $progressFields = ['words_completed', 'total_attempts', 'correct_attempts', 'time_spent', 'current_streak'];
            
            foreach ($progressFields as $field) {
                if (isset($sanitizedData[$field])) {
                    $progressData[$field] = $sanitizedData[$field];
                }
            }
            
            // Include word attempt data if provided (with validation)
            if (isset($input['word_attempt']) && is_array($input['word_attempt'])) {
                $wordAttemptRules = [
                    'word' => ['required' => true, 'type' => 'string', 'max_length' => 50],
                    'success' => ['required' => true, 'type' => 'boolean'],
                    'time_taken' => ['type' => 'integer', 'min' => 0, 'max' => 300],
                    'user_input' => ['type' => 'string', 'max_length' => 100]
                ];
                
                $wordValidation = $this->errorHandler->validateInput($input['word_attempt'], $wordAttemptRules);
                if ($wordValidation['valid']) {
                    $progressData['word_attempt'] = $wordValidation['data'];
                }
            }
            
            $success = $this->progressManager->saveProgress(
                $sanitizedData['session_id'],
                $sanitizedData['level'],
                $progressData
            );
            
            if ($success) {
                APIResponse::success(null, 200, 'Progress saved successfully');
            } else {
                APIResponse::error('Failed to save progress', 500);
            }
            
        } catch (PDOException $e) {
            APIResponse::databaseError($e);
        } catch (Exception $e) {
            $this->errorHandler->logError('Failed to save progress', [
                'session_id' => $sanitizedData['session_id'] ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            APIResponse::error('Failed to save progress', 500);
        }
    }
    
    /**
     * Get words for specified level
     * GET /api/words/{level}
     */
    private function getWords() {
        if (count($this->pathSegments) < 2) {
            APIResponse::error('Level is required', 400);
        }
        
        $level = $this->pathSegments[1];
        
        // Validate level
        if (!is_numeric($level) || $level < 1 || $level > 10) {
            APIResponse::error('Level must be between 1 and 10', 400);
        }
        
        // Validate and sanitize query parameters
        $queryRules = [
            'count' => [
                'type' => 'integer',
                'min' => 1,
                'max' => 50
            ],
            'category' => [
                'type' => 'string',
                'max_length' => 20,
                'pattern' => '/^[a-zA-Z_]+$/'
            ]
        ];
        
        $queryValidation = $this->errorHandler->validateInput($_GET, $queryRules);
        
        if (!$queryValidation['valid']) {
            APIResponse::validationError($queryValidation['errors']);
        }
        
        $count = $queryValidation['data']['count'] ?? 10;
        $category = $queryValidation['data']['category'] ?? null;
        
        try {
            $words = $this->wordManager->getWordsForLevel((int) $level, $count, $category);
            
            if (empty($words)) {
                APIResponse::error('No words found for the specified criteria', 404);
            }
            
            APIResponse::success([
                'level' => (int) $level,
                'count' => count($words),
                'category' => $category,
                'words' => $words
            ]);
            
        } catch (Exception $e) {
            $this->errorHandler->logError('Failed to load words for level', [
                'level' => $level,
                'count' => $count,
                'category' => $category,
                'error' => $e->getMessage()
            ]);
            APIResponse::error('Failed to load words for level', 500);
        }
    }
    
    /**
     * Get available difficulty levels
     * GET /api/levels
     */
    private function getLevels() {
        try {
            // For now, return static level data
            // In a full implementation, this could be dynamic based on available word data
            $levels = [
                [
                    'level' => 1,
                    'name' => 'Simple CVC Words',
                    'description' => 'Basic consonant-vowel-consonant words for beginners',
                    'example_words' => ['cat', 'dog', 'pen'],
                    'categories' => $this->wordManager->getAvailableCategories(1)
                ],
                [
                    'level' => 2,
                    'name' => 'CVCC and CCVC Words',
                    'description' => 'Words with consonant clusters for intermediate learners',
                    'example_words' => ['fish', 'tree', 'frog'],
                    'categories' => $this->wordManager->getAvailableCategories(2)
                ],
                [
                    'level' => 3,
                    'name' => 'Complex Words',
                    'description' => 'Longer words and complex patterns for advanced learners',
                    'example_words' => ['house', 'water', 'happy'],
                    'categories' => $this->wordManager->getAvailableCategories(3)
                ]
            ];
            
            APIResponse::success($levels);
            
        } catch (Exception $e) {
            APIResponse::error('Failed to load levels', 500);
        }
    }
    
    /**
     * Handle teacher sessions endpoint
     * GET /api/teacher/sessions - Get all sessions overview
     */
    private function handleTeacherSessions() {
        if ($this->method !== 'GET') {
            APIResponse::error('Method not allowed', 405);
        }
        
        try {
            $db = Database::getInstance();
            
            // Get all sessions with basic progress info
            $query = "
                SELECT 
                    s.session_id,
                    s.student_name,
                    s.created_at,
                    s.last_active,
                    COALESCE(MAX(p.level), 1) as current_level,
                    COALESCE(SUM(p.words_completed), 0) as total_words_completed,
                    COALESCE(AVG(p.correct_attempts / NULLIF(p.total_attempts, 0)), 0) as average_accuracy
                FROM sessions s
                LEFT JOIN progress p ON s.session_id = p.session_id
                GROUP BY s.session_id, s.student_name, s.created_at, s.last_active
                ORDER BY s.last_active DESC
            ";
            
            $sessions = $db->fetchAll($query);
            
            // Format the data
            foreach ($sessions as &$session) {
                $session['current_level'] = (int) $session['current_level'];
                $session['total_words_completed'] = (int) $session['total_words_completed'];
                $session['average_accuracy'] = round((float) $session['average_accuracy'], 2);
                $session['is_active'] = (strtotime($session['last_active']) > strtotime('-1 hour'));
            }
            
            APIResponse::success([
                'total_sessions' => count($sessions),
                'sessions' => $sessions
            ]);
            
        } catch (Exception $e) {
            APIResponse::error('Failed to load sessions', 500);
        }
    }
    
    /**
     * Handle teacher progress endpoint
     * GET /api/teacher/progress/{sessionId} - Get detailed student progress
     */
    private function handleTeacherProgress() {
        if ($this->method !== 'GET') {
            APIResponse::error('Method not allowed', 405);
        }
        
        if (count($this->pathSegments) < 3) {
            APIResponse::error('Session ID is required', 400);
        }
        
        $sessionId = $this->pathSegments[2];
        
        if (!$this->isValidSessionId($sessionId)) {
            APIResponse::error('Invalid session ID format', 400);
        }
        
        try {
            // Get session info first
            $db = Database::getInstance();
            $sessionInfo = $db->find('sessions', ['session_id' => $sessionId]);
            
            if (!$sessionInfo) {
                APIResponse::error('Session not found', 404);
            }
            
            // Get detailed progress (may be empty for new sessions)
            $progress = $this->progressManager->getProgress($sessionId);
            
            // If no progress yet, return empty progress structure
            if ($progress === false) {
                $progress = [
                    'current_level' => 1,
                    'total_score' => 0,
                    'levels' => []
                ];
            }
            
            // Get recent word attempts for detailed analysis
            $recentAttempts = $db->read('word_attempts', 
                ['session_id' => $sessionId], 
                'created_at DESC', 
                20
            );
            
            APIResponse::success([
                'session_info' => $sessionInfo,
                'progress' => $progress,
                'recent_attempts' => $recentAttempts
            ]);
            
        } catch (Exception $e) {
            APIResponse::error('Failed to load detailed progress', 500);
        }
    }
    
    /**
     * Handle teacher session creation
     * POST /api/teacher/session - Create new student session
     */
    private function handleTeacherSession() {
        if ($this->method !== 'POST') {
            APIResponse::error('Method not allowed', 405);
        }
        
        $input = $this->getJSONInput();
        
        // Validate required fields
        if (!isset($input['student_name']) || empty(trim($input['student_name']))) {
            APIResponse::validationError(['Student name is required']);
        }
        
        $studentName = trim($input['student_name']);
        
        // Validate student name
        if (strlen($studentName) < 2 || strlen($studentName) > 50) {
            APIResponse::validationError(['Student name must be between 2 and 50 characters']);
        }
        
        try {
            $db = Database::getInstance();
            
            // Generate unique session ID
            $sessionId = $this->generateSessionId();
            
            // Create session record
            $sessionData = [
                'session_id' => $sessionId,
                'student_name' => $studentName,
                'created_at' => date('Y-m-d H:i:s'),
                'last_active' => date('Y-m-d H:i:s')
            ];
            
            $db->create('sessions', $sessionData);
            
            APIResponse::success([
                'session_id' => $sessionId,
                'student_name' => $studentName,
                'created_at' => $sessionData['created_at']
            ], 201, 'Student session created successfully');
            
        } catch (Exception $e) {
            APIResponse::error('Failed to create session', 500);
        }
    }
    
    /**
     * Handle teacher error analysis endpoint
     * GET /api/teacher/errors/{sessionId} - Get error pattern analysis
     */
    private function handleTeacherErrors() {
        if ($this->method !== 'GET') {
            APIResponse::error('Method not allowed', 405);
        }
        
        if (count($this->pathSegments) < 3) {
            APIResponse::error('Session ID is required', 400);
        }
        
        $sessionId = $this->pathSegments[2];
        
        if (!$this->isValidSessionId($sessionId)) {
            APIResponse::error('Invalid session ID format', 400);
        }
        
        try {
            $db = Database::getInstance();
            
            // Get error patterns from word attempts
            $errorQuery = "
                SELECT 
                    error_pattern,
                    COUNT(*) as frequency,
                    AVG(time_taken) as avg_time,
                    GROUP_CONCAT(DISTINCT word) as affected_words
                FROM word_attempts 
                WHERE session_id = :session_id AND success = 0 AND error_pattern IS NOT NULL
                GROUP BY error_pattern
                ORDER BY frequency DESC
            ";
            
            $errorPatterns = $db->fetchAll($errorQuery, ['session_id' => $sessionId]);
            
            // Get overall error statistics
            $statsQuery = "
                SELECT 
                    COUNT(*) as total_attempts,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_attempts,
                    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_attempts,
                    AVG(time_taken) as avg_time_per_attempt
                FROM word_attempts 
                WHERE session_id = :session_id
            ";
            
            $stats = $db->fetchRow($statsQuery, ['session_id' => $sessionId]);
            
            // Calculate accuracy
            $accuracy = $stats['total_attempts'] > 0 ? 
                $stats['successful_attempts'] / $stats['total_attempts'] : 0;
            
            APIResponse::success([
                'session_id' => $sessionId,
                'error_patterns' => $errorPatterns,
                'statistics' => [
                    'total_attempts' => (int) $stats['total_attempts'],
                    'successful_attempts' => (int) $stats['successful_attempts'],
                    'failed_attempts' => (int) $stats['failed_attempts'],
                    'accuracy' => round($accuracy, 2),
                    'avg_time_per_attempt' => round((float) $stats['avg_time_per_attempt'], 1)
                ]
            ]);
            
        } catch (Exception $e) {
            APIResponse::error('Failed to load error analysis', 500);
        }
    }
    
    /**
     * Handle teacher timeline endpoint
     * GET /api/teacher/timeline/{sessionId} - Get session activity timeline
     */
    private function handleTeacherTimeline() {
        if ($this->method !== 'GET') {
            APIResponse::error('Method not allowed', 405);
        }
        
        if (count($this->pathSegments) < 3) {
            APIResponse::error('Session ID is required', 400);
        }
        
        $sessionId = $this->pathSegments[2];
        $days = isset($_GET['days']) ? (int) $_GET['days'] : 7;
        
        if (!$this->isValidSessionId($sessionId)) {
            APIResponse::error('Invalid session ID format', 400);
        }
        
        if ($days < 1 || $days > 30) {
            APIResponse::error('Days must be between 1 and 30', 400);
        }
        
        try {
            $db = Database::getInstance();
            $startDate = date('Y-m-d H:i:s', strtotime("-{$days} days"));
            
            $query = "
                SELECT 
                    DATE(created_at) as activity_date,
                    COUNT(*) as total_attempts,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_attempts,
                    AVG(time_taken) as avg_time,
                    COUNT(DISTINCT word) as unique_words
                FROM word_attempts 
                WHERE session_id = :session_id AND created_at >= :start_date
                GROUP BY DATE(created_at)
                ORDER BY activity_date ASC
            ";
            
            $timeline = $db->fetchAll($query, [
                'session_id' => $sessionId,
                'start_date' => $startDate
            ]);
            
            // Fill in missing dates with zero activity
            $completeTimeline = $this->fillTimelineGaps($timeline, $days);
            
            APIResponse::success([
                'session_id' => $sessionId,
                'period_days' => $days,
                'timeline' => $completeTimeline
            ]);
            
        } catch (Exception $e) {
            APIResponse::error('Failed to load timeline data', 500);
        }
    }
    
    /**
     * Handle teacher report endpoint
     * GET /api/teacher/report/{sessionId} - Generate progress report
     */
    private function handleTeacherReport() {
        if ($this->method !== 'GET') {
            APIResponse::error('Method not allowed', 405);
        }
        
        if (count($this->pathSegments) < 3) {
            APIResponse::error('Session ID is required', 400);
        }
        
        $sessionId = $this->pathSegments[2];
        $format = isset($_GET['format']) ? $_GET['format'] : 'summary';
        
        if (!$this->isValidSessionId($sessionId)) {
            APIResponse::error('Invalid session ID format', 400);
        }
        
        if (!in_array($format, ['summary', 'detailed', 'printable'])) {
            APIResponse::error('Invalid report format', 400);
        }
        
        try {
            $db = Database::getInstance();
            
            // Get session info
            $sessionInfo = $db->find('sessions', ['session_id' => $sessionId]);
            if (!$sessionInfo) {
                APIResponse::error('Session not found', 404);
            }
            
            // Get progress data
            $progress = $this->progressManager->getProgress($sessionId);
            
            // Get analytics
            $analytics = $this->calculateSessionAnalytics($sessionId);
            
            // Generate report based on format
            $reportData = [
                'session_id' => $sessionId,
                'student_name' => $sessionInfo['student_name'],
                'report_date' => date('c'),
                'format' => $format,
                'data' => [
                    'current_level' => $progress['current_level'] ?? 1,
                    'total_words' => $progress['total_words_completed'] ?? 0,
                    'accuracy' => $analytics['accuracy'] ?? 0,
                    'total_time' => $progress['total_time_spent'] ?? 0,
                    'accuracy_trend' => $analytics['accuracy_trend'] ?? 'stable',
                    'speed_trend' => $analytics['speed_trend'] ?? 'stable',
                    'difficulty_progression' => $analytics['difficulty_progression'] ?? 'appropriate',
                    'recommendations' => $this->generateRecommendations($analytics)
                ]
            ];
            
            APIResponse::success($reportData);
            
        } catch (Exception $e) {
            APIResponse::error('Failed to generate report', 500);
        }
    }
    
    /**
     * Handle teacher analytics endpoint
     * GET /api/teacher/analytics/{type} - Get various analytics
     */
    private function handleTeacherAnalytics() {
        if ($this->method !== 'GET') {
            APIResponse::error('Method not allowed', 405);
        }
        
        if (count($this->pathSegments) < 3) {
            APIResponse::error('Analytics type is required', 400);
        }
        
        $analyticsType = $this->pathSegments[2];
        
        try {
            switch ($analyticsType) {
                case 'comparative':
                    $this->getComparativeAnalytics();
                    break;
                case 'activity':
                    $this->getActivityAnalytics();
                    break;
                default:
                    APIResponse::error('Analytics type not found', 404);
            }
            
        } catch (Exception $e) {
            APIResponse::error('Failed to load analytics', 500);
        }
    }
    
    /**
     * Get comparative analytics across all sessions
     */
    private function getComparativeAnalytics() {
        $db = Database::getInstance();
        
        $query = "
            SELECT 
                COUNT(DISTINCT s.session_id) as total_sessions,
                AVG(COALESCE(p.correct_attempts / NULLIF(p.total_attempts, 0), 0)) as avg_accuracy,
                AVG(COALESCE(p.time_spent / NULLIF(p.words_completed, 0), 0)) as avg_time_per_word,
                MAX(p.level) as highest_level_reached,
                SUM(p.words_completed) as total_words_completed
            FROM sessions s
            LEFT JOIN progress p ON s.session_id = p.session_id
        ";
        
        $overall = $db->fetchRow($query);
        
        // Get common error patterns
        $errorQuery = "
            SELECT 
                error_pattern,
                COUNT(*) as frequency,
                COUNT(DISTINCT session_id) as affected_students
            FROM word_attempts 
            WHERE success = 0 AND error_pattern IS NOT NULL
            GROUP BY error_pattern 
            ORDER BY frequency DESC 
            LIMIT 10
        ";
        
        $commonErrors = $db->fetchAll($errorQuery);
        
        APIResponse::success([
            'overall_statistics' => $overall,
            'common_error_patterns' => $commonErrors,
            'analysis_date' => date('c')
        ]);
    }
    
    /**
     * Get activity analytics
     */
    private function getActivityAnalytics() {
        $db = Database::getInstance();
        
        $today = date('Y-m-d');
        
        $query = "
            SELECT 
                COUNT(DISTINCT s.session_id) as total_sessions,
                COUNT(DISTINCT CASE WHEN DATE(s.last_active) = :today THEN s.session_id END) as active_today,
                COUNT(DISTINCT CASE WHEN s.last_active >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN s.session_id END) as active_this_week,
                AVG(COALESCE(p.words_completed, 0)) as avg_words_per_session
            FROM sessions s
            LEFT JOIN progress p ON s.session_id = p.session_id
        ";
        
        $activity = $db->fetchRow($query, ['today' => $today]);
        
        APIResponse::success([
            'total_sessions' => (int) $activity['total_sessions'],
            'active_today' => (int) $activity['active_today'],
            'active_this_week' => (int) $activity['active_this_week'],
            'avg_words_per_session' => round((float) $activity['avg_words_per_session'], 1),
            'analysis_date' => date('c')
        ]);
    }
    
    /**
     * Fill timeline gaps with zero activity days
     */
    private function fillTimelineGaps($timeline, $days) {
        $completeTimeline = [];
        $existingDates = array_column($timeline, 'activity_date');
        
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            
            $existingIndex = array_search($date, $existingDates);
            
            if ($existingIndex !== false) {
                $completeTimeline[] = $timeline[$existingIndex];
            } else {
                $completeTimeline[] = [
                    'activity_date' => $date,
                    'total_attempts' => 0,
                    'successful_attempts' => 0,
                    'avg_time' => 0,
                    'unique_words' => 0
                ];
            }
        }
        
        return $completeTimeline;
    }
    
    /**
     * Calculate session analytics
     */
    private function calculateSessionAnalytics($sessionId) {
        $db = Database::getInstance();
        
        $query = "
            SELECT 
                COUNT(*) as total_attempts,
                SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_attempts,
                AVG(time_taken) as avg_time
            FROM word_attempts 
            WHERE session_id = :session_id
        ";
        
        $stats = $db->fetchRow($query, ['session_id' => $sessionId]);
        
        $accuracy = $stats['total_attempts'] > 0 ? 
            $stats['successful_attempts'] / $stats['total_attempts'] : 0;
        
        return [
            'total_attempts' => (int) $stats['total_attempts'],
            'successful_attempts' => (int) $stats['successful_attempts'],
            'accuracy' => round($accuracy, 2),
            'avg_time' => round((float) $stats['avg_time'], 1),
            'accuracy_trend' => 'stable', // Simplified for demo
            'speed_trend' => 'stable',
            'difficulty_progression' => 'appropriate'
        ];
    }
    
    /**
     * Generate recommendations based on analytics
     */
    private function generateRecommendations($analytics) {
        $recommendations = [];
        
        if ($analytics['accuracy'] < 0.6) {
            $recommendations[] = [
                'strategy' => 'Focus on accuracy improvement',
                'activities' => ['Repeat current level words', 'Use visual cues', 'Slow down pace']
            ];
        }
        
        if ($analytics['accuracy'] > 0.8) {
            $recommendations[] = [
                'strategy' => 'Ready for progression',
                'activities' => ['Introduce next level', 'Add time challenges', 'Explore word families']
            ];
        }
        
        return $recommendations;
    }
    
    /**
     * Generate unique session ID
     * 
     * @return string Unique session identifier
     */
    private function generateSessionId() {
        return 'session-' . uniqid() . '-' . bin2hex(random_bytes(4));
    }
}
}

// Initialize and run the router
try {
    $router = new APIRouter();
    $router->route();
} catch (Exception $e) {
    error_log("Fatal API error: " . $e->getMessage());
    APIResponse::error('Service temporarily unavailable', 503);
}