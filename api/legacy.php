<?php
/**
 * Legacy API Adapter for Query Parameter Style Requests
 * Handles frontend requests like: api/index.php?endpoint=progress&sessionId=123
 */

// Check if we have query parameters
if (!isset($_GET['endpoint'])) {
    // No endpoint specified, forward to main API
    include __DIR__ . '/index.php';
    exit;
}

$endpoint = $_GET['endpoint'];

// Route based on endpoint parameter
switch ($endpoint) {
    case 'progress':
        if (isset($_GET['sessionId'])) {
            // GET /api/progress/{sessionId}
            $_SERVER['REQUEST_URI'] = '/api/progress/' . $_GET['sessionId'];
        } else {
            $_SERVER['REQUEST_URI'] = '/api/progress';
        }
        break;
        
    case 'words':
        $level = $_GET['level'] ?? '1';
        $query = '';
        if (isset($_GET['count'])) {
            $query .= '?count=' . $_GET['count'];
        }
        if (isset($_GET['category'])) {
            $query .= ($query ? '&' : '?') . 'category=' . $_GET['category'];
        }
        $_SERVER['REQUEST_URI'] = '/api/words/' . $level . $query;
        break;
        
    case 'levels':
        $_SERVER['REQUEST_URI'] = '/api/levels';
        break;
        
    case 'teacher':
        $action = $_GET['action'] ?? 'sessions';
        $_SERVER['REQUEST_URI'] = '/api/teacher/' . $action;
        break;
        
    default:
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'Unknown endpoint: ' . $endpoint
        ]);
        exit;
}

// Forward to main API handler
include __DIR__ . '/index.php';
?>