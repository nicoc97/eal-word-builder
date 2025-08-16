<?php

/**
 * Simple API Test Script
 * 
 * Tests the basic functionality of the Word Builder Game API endpoints
 * to ensure they are working correctly.
 */

require_once __DIR__ . '/../classes/Database.php';

echo "<h1>Word Builder Game API Test</h1>\n";

// Test database connection
echo "<h2>1. Database Connection Test</h2>\n";
try {
    $db = Database::getInstance();
    if ($db->testConnection()) {
        echo "✅ Database connection successful<br>\n";
        
        // Check if tables exist
        if ($db->verifySchema()) {
            echo "✅ Database schema verified<br>\n";
        } else {
            echo "❌ Database schema incomplete<br>\n";
        }
    } else {
        echo "❌ Database connection failed<br>\n";
    }
} catch (Exception $e) {
    echo "❌ Database error: " . $e->getMessage() . "<br>\n";
}

// Test API endpoints
echo "<h2>2. API Endpoint Tests</h2>\n";

$baseUrl = 'http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . '/';

// Test endpoints
$endpoints = [
    'GET /' => $baseUrl,
    'GET /levels' => $baseUrl . 'levels',
    'GET /words/1' => $baseUrl . 'words/1',
    'GET /teacher/sessions' => $baseUrl . 'teacher/sessions'
];

foreach ($endpoints as $description => $url) {
    echo "<h3>Testing: {$description}</h3>\n";
    
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => 'Content-Type: application/json',
            'timeout' => 10
        ]
    ]);
    
    $response = @file_get_contents($url, false, $context);
    
    if ($response !== false) {
        $data = json_decode($response, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            if (isset($data['success']) && $data['success']) {
                echo "✅ Success<br>\n";
                echo "<pre>" . htmlspecialchars(json_encode($data, JSON_PRETTY_PRINT)) . "</pre>\n";
            } else {
                echo "❌ API returned error: " . ($data['error'] ?? 'Unknown error') . "<br>\n";
            }
        } else {
            echo "❌ Invalid JSON response<br>\n";
            echo "<pre>" . htmlspecialchars(substr($response, 0, 500)) . "</pre>\n";
        }
    } else {
        echo "❌ Failed to connect to endpoint<br>\n";
    }
    
    echo "<hr>\n";
}

echo "<h2>3. Class Tests</h2>\n";

// Test WordManager
echo "<h3>WordManager Test</h3>\n";
try {
    require_once __DIR__ . '/../classes/WordManager.php';
    $wordManager = new WordManager();
    
    $words = $wordManager->getWordsForLevel(1, 5);
    echo "✅ WordManager: Retrieved " . count($words) . " words for level 1<br>\n";
    
    if (!empty($words)) {
        $testWord = $words[0]['word'];
        $validation = $wordManager->validateWord($testWord, $testWord);
        if ($validation['correct']) {
            echo "✅ WordManager: Word validation working<br>\n";
        } else {
            echo "❌ WordManager: Word validation failed<br>\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ WordManager error: " . $e->getMessage() . "<br>\n";
}

// Test ProgressManager
echo "<h3>ProgressManager Test</h3>\n";
try {
    require_once __DIR__ . '/../classes/ProgressManager.php';
    $progressManager = new ProgressManager();
    
    $testSessionId = 'test-session-' . uniqid();
    
    // Test saving progress
    $progressData = [
        'words_completed' => 1,
        'total_attempts' => 1,
        'correct_attempts' => 1,
        'time_spent' => 30,
        'current_streak' => 1
    ];
    
    $saved = $progressManager->saveProgress($testSessionId, 1, $progressData);
    if ($saved) {
        echo "✅ ProgressManager: Progress saved successfully<br>\n";
        
        // Test retrieving progress
        $retrieved = $progressManager->getProgress($testSessionId, 1);
        if ($retrieved) {
            echo "✅ ProgressManager: Progress retrieved successfully<br>\n";
        } else {
            echo "❌ ProgressManager: Failed to retrieve progress<br>\n";
        }
    } else {
        echo "❌ ProgressManager: Failed to save progress<br>\n";
    }
    
} catch (Exception $e) {
    echo "❌ ProgressManager error: " . $e->getMessage() . "<br>\n";
}

// Test TeacherManager
echo "<h3>TeacherManager Test</h3>\n";
try {
    require_once __DIR__ . '/../classes/TeacherManager.php';
    $teacherManager = new TeacherManager();
    
    $sessions = $teacherManager->getAllSessions();
    echo "✅ TeacherManager: Retrieved " . count($sessions) . " sessions<br>\n";
    
} catch (Exception $e) {
    echo "❌ TeacherManager error: " . $e->getMessage() . "<br>\n";
}

echo "<h2>Test Complete</h2>\n";
echo "<p>If all tests show ✅, the API is ready for use!</p>\n";
?>