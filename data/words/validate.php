<?php
/**
 * Word Data Validation Script
 * Validates the JSON structure for word data files
 * Ensures compliance with EAL learning requirements
 */

function validateWordData() {
    $errors = [];
    $levels = [1, 2, 3];
    
    // Validate index file
    $indexPath = __DIR__ . '/index.json';
    if (!file_exists($indexPath)) {
        $errors[] = "Missing index.json file";
        return $errors;
    }
    
    $indexData = json_decode(file_get_contents($indexPath), true);
    if (!$indexData) {
        $errors[] = "Invalid JSON in index.json";
        return $errors;
    }
    
    // Validate each level file
    foreach ($levels as $level) {
        $filePath = __DIR__ . "/level_{$level}.json";
        
        if (!file_exists($filePath)) {
            $errors[] = "Missing level_{$level}.json file";
            continue;
        }
        
        $data = json_decode(file_get_contents($filePath), true);
        if (!$data) {
            $errors[] = "Invalid JSON in level_{$level}.json";
            continue;
        }
        
        // Validate required fields
        $requiredFields = ['level', 'name', 'description', 'words'];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field])) {
                $errors[] = "Missing required field '{$field}' in level_{$level}.json";
            }
        }
        
        // Validate words array
        if (isset($data['words']) && is_array($data['words'])) {
            foreach ($data['words'] as $index => $word) {
                $wordErrors = validateWord($word, $level, $index);
                $errors = array_merge($errors, $wordErrors);
            }
        }
        
        // Validate categories are present
        $categories = array_unique(array_column($data['words'], 'category'));
        $expectedCategories = ['animals', 'objects', 'actions'];
        foreach ($expectedCategories as $category) {
            if (!in_array($category, $categories)) {
                $errors[] = "Level {$level} missing words from category: {$category}";
            }
        }
    }
    
    return $errors;
}

function validateWord($word, $level, $index) {
    $errors = [];
    $requiredFields = ['word', 'image', 'phonetic', 'difficulty', 'category', 'letters', 'hints'];
    
    foreach ($requiredFields as $field) {
        if (!isset($word[$field])) {
            $errors[] = "Level {$level}, word {$index}: Missing required field '{$field}'";
        }
    }
    
    // Validate word structure
    if (isset($word['word']) && isset($word['letters'])) {
        $expectedLetters = str_split(strtolower($word['word']));
        if ($word['letters'] !== $expectedLetters) {
            $errors[] = "Level {$level}, word {$index}: Letters array doesn't match word '{$word['word']}'";
        }
    }
    
    // Validate difficulty matches level
    if (isset($word['difficulty']) && $word['difficulty'] != $level) {
        $errors[] = "Level {$level}, word {$index}: Difficulty mismatch - expected {$level}, got {$word['difficulty']}";
    }
    
    // Validate category
    $validCategories = ['animals', 'objects', 'actions'];
    if (isset($word['category']) && !in_array($word['category'], $validCategories)) {
        $errors[] = "Level {$level}, word {$index}: Invalid category '{$word['category']}'";
    }
    
    // Validate phonetic notation format (basic check for IPA brackets)
    if (isset($word['phonetic']) && !preg_match('/^\/.*\/$/', $word['phonetic'])) {
        $errors[] = "Level {$level}, word {$index}: Phonetic notation should be in IPA format with forward slashes";
    }
    
    return $errors;
}

// Run validation
$errors = validateWordData();

if (empty($errors)) {
    echo "✅ All word data files are valid!\n";
    echo "📊 Validation Summary:\n";
    
    // Show statistics
    for ($level = 1; $level <= 3; $level++) {
        $data = json_decode(file_get_contents(__DIR__ . "/level_{$level}.json"), true);
        $wordCount = count($data['words']);
        $categories = array_count_values(array_column($data['words'], 'category'));
        
        echo "   Level {$level}: {$wordCount} words (";
        echo "Animals: {$categories['animals']}, ";
        echo "Objects: {$categories['objects']}, ";
        echo "Actions: {$categories['actions']})\n";
    }
} else {
    echo "❌ Validation errors found:\n";
    foreach ($errors as $error) {
        echo "   - {$error}\n";
    }
    exit(1);
}
?>