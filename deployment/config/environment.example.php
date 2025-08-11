<?php

/**
 * Environment Configuration Template for Word Builder Game
 * 
 * Copy this file to environment.php and customize for your deployment.
 * This file should be included before database.php to set environment-specific
 * variables and configurations.
 * 
 * SECURITY NOTE: Never commit environment.php to version control.
 * Add environment.php to your .gitignore file.
 */

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

// Automatically detect environment based on server characteristics
function detectEnvironment() {
    // Check for common development indicators
    if (isset($_SERVER['SERVER_NAME']) && 
        (strpos($_SERVER['SERVER_NAME'], 'localhost') !== false ||
         strpos($_SERVER['SERVER_NAME'], '127.0.0.1') !== false ||
         strpos($_SERVER['SERVER_NAME'], '.local') !== false)) {
        return 'development';
    }
    
    // Check for staging indicators
    if (isset($_SERVER['SERVER_NAME']) && 
        (strpos($_SERVER['SERVER_NAME'], 'staging') !== false ||
         strpos($_SERVER['SERVER_NAME'], 'test') !== false)) {
        return 'staging';
    }
    
    // Default to production
    return 'production';
}

// Set current environment
define('APP_ENVIRONMENT', detectEnvironment());

// ============================================================================
// ENVIRONMENT-SPECIFIC CONFIGURATIONS
// ============================================================================

switch (APP_ENVIRONMENT) {
    case 'development':
        // Development environment settings
        define('DB_HOST', 'localhost');
        define('DB_NAME', 'word_builder_game_dev');
        define('DB_USER', 'root');
        define('DB_PASS', '');
        define('DEBUG_MODE', true);
        define('LOG_QUERIES', true);
        define('SSL_REQUIRED', false);
        define('ERROR_REPORTING', E_ALL);
        break;
        
    case 'staging':
        // Staging environment settings
        define('DB_HOST', 'localhost');
        define('DB_NAME', 'word_builder_game_staging');
        define('DB_USER', 'wordbuilder_staging');
        define('DB_PASS', 'staging_password_here');
        define('DEBUG_MODE', true);
        define('LOG_QUERIES', true);
        define('SSL_REQUIRED', true);
        define('ERROR_REPORTING', E_ALL & ~E_NOTICE);
        break;
        
    case 'production':
        // Production environment settings
        define('DB_HOST', 'localhost');
        define('DB_NAME', 'word_builder_game');
        define('DB_USER', 'wordbuilder');
        define('DB_PASS', 'secure_production_password_here');
        define('DEBUG_MODE', false);
        define('LOG_QUERIES', false);
        define('SSL_REQUIRED', true);
        define('ERROR_REPORTING', E_ERROR | E_WARNING | E_PARSE);
        break;
}

// ============================================================================
// SECURITY CONFIGURATIONS
// ============================================================================

// Session security settings
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', SSL_REQUIRED ? 1 : 0);
ini_set('session.use_strict_mode', 1);

// Error reporting
error_reporting(ERROR_REPORTING);
ini_set('display_errors', DEBUG_MODE ? 1 : 0);
ini_set('log_errors', 1);

// Security headers (if not set by web server)
if (!headers_sent()) {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');
    
    if (SSL_REQUIRED) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}

// ============================================================================
// APPLICATION SETTINGS
// ============================================================================

// Timezone setting
date_default_timezone_set('UTC');

// Memory and execution limits
ini_set('memory_limit', '128M');
ini_set('max_execution_time', '30');

// File upload settings (if needed for future features)
ini_set('upload_max_filesize', '10M');
ini_set('post_max_size', '10M');

// ============================================================================
// LOGGING CONFIGURATION
// ============================================================================

// Define log file paths
define('LOG_DIR', __DIR__ . '/../../logs/');
define('ERROR_LOG', LOG_DIR . 'error.log');
define('ACCESS_LOG', LOG_DIR . 'access.log');
define('QUERY_LOG', LOG_DIR . 'queries.log');

// Ensure log directory exists
if (!is_dir(LOG_DIR)) {
    mkdir(LOG_DIR, 0755, true);
}

// Set custom error log
ini_set('error_log', ERROR_LOG);

// ============================================================================
// FEATURE FLAGS
// ============================================================================

// Enable/disable features based on environment
define('ENABLE_TEACHER_DASHBOARD', true);
define('ENABLE_PROGRESS_ANALYTICS', true);
define('ENABLE_AUDIO_FEATURES', true);
define('ENABLE_OFFLINE_MODE', true);

// Development-only features
define('ENABLE_DEBUG_TOOLBAR', APP_ENVIRONMENT === 'development');
define('ENABLE_QUERY_PROFILING', APP_ENVIRONMENT !== 'production');

// ============================================================================
// EXTERNAL SERVICE CONFIGURATIONS
// ============================================================================

// Web Speech API settings
define('SPEECH_API_ENABLED', true);
define('SPEECH_LANGUAGE', 'en-US');

// Future integrations (placeholder)
define('DRUPAL_INTEGRATION_ENABLED', false);
define('DRUPAL_BASE_URL', '');
define('DRUPAL_API_KEY', '');

// ============================================================================
// PERFORMANCE SETTINGS
// ============================================================================

// Database connection pooling
define('DB_PERSISTENT_CONNECTIONS', APP_ENVIRONMENT === 'production');
define('DB_CONNECTION_TIMEOUT', 30);

// Caching settings (for future implementation)
define('CACHE_ENABLED', APP_ENVIRONMENT === 'production');
define('CACHE_TTL', 3600); // 1 hour

// ============================================================================
// MONITORING AND ALERTS
// ============================================================================

// Error threshold for alerts (errors per minute)
define('ERROR_ALERT_THRESHOLD', APP_ENVIRONMENT === 'production' ? 5 : 50);

// Performance monitoring
define('SLOW_QUERY_THRESHOLD', 2.0); // seconds
define('MEMORY_USAGE_ALERT', '100M');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if we're in development mode
 */
function isDevelopment() {
    return APP_ENVIRONMENT === 'development';
}

/**
 * Check if we're in production mode
 */
function isProduction() {
    return APP_ENVIRONMENT === 'production';
}

/**
 * Get environment-specific configuration value
 */
function getEnvConfig($key, $default = null) {
    $configs = [
        'development' => [
            'api_rate_limit' => 1000,
            'session_timeout' => 3600,
            'max_sessions_per_ip' => 10
        ],
        'staging' => [
            'api_rate_limit' => 500,
            'session_timeout' => 1800,
            'max_sessions_per_ip' => 5
        ],
        'production' => [
            'api_rate_limit' => 100,
            'session_timeout' => 1800,
            'max_sessions_per_ip' => 3
        ]
    ];
    
    return $configs[APP_ENVIRONMENT][$key] ?? $default;
}

/**
 * Log application events
 */
function logEvent($message, $level = 'INFO') {
    if (LOG_QUERIES || $level === 'ERROR') {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] [$level] $message" . PHP_EOL;
        file_put_contents(ACCESS_LOG, $logMessage, FILE_APPEND | LOCK_EX);
    }
}

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

// Validate required constants are set
$requiredConstants = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'];
foreach ($requiredConstants as $constant) {
    if (!defined($constant)) {
        die("Environment configuration error: $constant is not defined");
    }
}

// Log environment initialization
logEvent("Environment initialized: " . APP_ENVIRONMENT);