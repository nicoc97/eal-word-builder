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
    'host' => 'localhost',
    'database' => 'word_builder_game',
    'username' => 'root',
    'password' => '', // Set appropriate password for production
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