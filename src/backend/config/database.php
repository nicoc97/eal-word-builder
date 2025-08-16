<?php
/**
 * Database Configuration for Railway Deployment
 * 
 * This configuration automatically detects Railway environment variables
 * Falls back to local development settings when not on Railway
 */

// Detect Railway environment
$isRailway = getenv('RAILWAY_ENVIRONMENT') !== false || getenv('MYSQL_HOST') !== false;

if ($isRailway) {
    // Railway production settings
    return [
        'host' => getenv('MYSQL_HOST'),
        'port' => getenv('MYSQL_PORT') ?: '3306',
        'database' => getenv('MYSQL_DATABASE'),
        'username' => getenv('MYSQL_USER'),
        'password' => getenv('MYSQL_PASSWORD'),
        'charset' => 'utf8mb4',
        'options' => [
            'persistent' => false,  // Don't use persistent connections on Railway
            'timeout' => 30,
            'ssl_verify' => false   // Railway internal network doesn't need SSL
        ]
    ];
} else {
    // Local development settings
    return [
        'host' => getenv('DB_HOST') ?: '127.0.0.1',
        'port' => getenv('DB_PORT') ?: '3306',
        'database' => getenv('DB_DATABASE') ?: 'word_builder_game',
        'username' => getenv('DB_USERNAME') ?: 'root',
        'password' => getenv('DB_PASSWORD') ?: '',
        'charset' => 'utf8mb4',
        'options' => [
            'persistent' => true,
            'timeout' => 30,
            'ssl_verify' => false
        ]
    ];
}