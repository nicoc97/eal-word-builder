<?php

/**
 * Database Configuration for Word Builder Game
 * 
 * This configuration file provides database connection settings for the EAL
 * word building game. It supports both development and production environments
 * with secure credential management.
 * 
 * For production deployment:
 * - Use environment variables instead of this file
 * - Ensure proper file permissions (600)
 * - Never commit credentials to version control
 */

return [
    // Database connection settings
    'host' => getenv('DB_HOST') ?: (getenv('MYSQL_HOST') ?: 'localhost'),
    'database' => getenv('DB_DATABASE') ?: (getenv('MYSQL_DATABASE') ?: 'word_builder_game'),
    'username' => getenv('DB_USERNAME') ?: (getenv('MYSQL_USER') ?: 'root'),
    'password' => getenv('DB_PASSWORD') ?: (getenv('MYSQL_PASSWORD') ?: ''),
    'charset' => 'utf8mb4',
    
    // Connection options for performance and security
    'options' => [
        'persistent' => true, // Enable connection pooling
        'timeout' => 30, // Connection timeout in seconds
        'ssl_verify' => false // Set to true in production with proper SSL setup
    ],
    
    // Development vs Production settings
    'environment' => [
        'development' => [
            'debug' => true,
            'log_queries' => true
        ],
        'production' => [
            'debug' => false,
            'log_queries' => false,
            'ssl_required' => true
        ]
    ]
];