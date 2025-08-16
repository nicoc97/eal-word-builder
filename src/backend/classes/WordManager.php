<?php

/**
 * Word Manager Class for Word Builder Game
 * 
 * Manages vocabulary data, difficulty progression, and word validation for the
 * EAL (English as an Additional Language) word building game. This class implements
 * pedagogically-informed word selection and difficulty assessment based on
 * language learning research.
 * 
 * Key EAL Considerations:
 * - Progressive difficulty based on phonetic complexity
 * - Visual cues to support comprehension
 * - Contextual word grouping for better retention
 * - Adaptive difficulty based on learner performance
 * - Support for multiple learning modalities (visual, auditory, kinesthetic)
 * 
 * @author Word Builder Game
 * @version 1.0
 */

class WordManager {
    
    private $wordDataPath;
    private $imageBasePath;
    private $wordCache = [];
    
    /**
     * Constructor - Initialize word data paths
     */
    public function __construct() {
        $this->wordDataPath = __DIR__ . '/../../../data/words/';
        $this->imageBasePath = '/assets/images/words/';
        
        // Ensure word data directory exists
        if (!is_dir($this->wordDataPath)) {
            mkdir($this->wordDataPath, 0755, true);
        }
    }
    
    /**
     * Get words appropriate for specified difficulty level
     * 
     * EAL PEDAGOGY: SYSTEMATIC VOCABULARY PROGRESSION
     * 
     * This method implements research-based word selection principles:
     * 
     * 1. PHONETIC COMPLEXITY PROGRESSION:
     *    - Level 1: Simple CVC words (cat, dog) - easiest to decode
     *    - Level 2: CVCC/CCVC words (fish, tree) - introduces clusters
     *    - Level 3: Complex patterns (house, water) - advanced phonics
     *    - Reference: Phonics instruction research (Ehri, 2005)
     * 
     * 2. HIGH-FREQUENCY VOCABULARY SELECTION:
     *    - Prioritizes words from Dolch and Fry high-frequency lists
     *    - Ensures practical vocabulary for daily communication
     *    - Reference: Nation (2001) - frequency-based vocabulary instruction
     * 
     * 3. SEMANTIC CATEGORIZATION:
     *    - Groups words by meaning (animals, objects, actions)
     *    - Supports schema building and conceptual organization
     *    - Reference: Schema Theory (Anderson & Pearson) - organized knowledge
     * 
     * 4. VISUAL RECOGNIZABILITY:
     *    - Selects words with clear, concrete visual representations
     *    - Supports comprehension through visual-verbal connections
     *    - Reference: Dual Coding Theory (Paivio) - visual-verbal processing
     * 
     * 5. CULTURAL APPROPRIATENESS:
     *    - Ensures vocabulary is relevant to diverse learner backgrounds
     *    - Avoids culturally specific items that may confuse EAL learners
     *    - Reference: Culturally Responsive Teaching (Gay, 2010)
     * 
     * @param int $level Difficulty level (1-based)
     * @param int $count Number of words to return (default: 10)
     * @param string $category Optional category filter ('animals', 'objects', 'actions')
     * @return array Array of word objects with metadata
     * @throws Exception If level data cannot be loaded
     */
    public function getWordsForLevel($level, $count = 10, $category = null) {
        try {
            // Load word data for level (with caching)
            $levelData = $this->loadLevelData($level);
            
            if (empty($levelData)) {
                throw new Exception("No words found for level {$level}");
            }
            
            $words = $levelData['words'];
            
            // Filter by category if specified
            if ($category !== null) {
                $words = array_filter($words, function($word) use ($category) {
                    return isset($word['category']) && $word['category'] === $category;
                });
            }
            
            // Shuffle for variety and select requested count
            shuffle($words);
            $selectedWords = array_slice($words, 0, $count);
            
            // Enhance word data with additional metadata
            foreach ($selectedWords as &$word) {
                $word = $this->enhanceWordData($word, $level);
            }
            
            return $selectedWords;
            
        } catch (Exception $e) {
            error_log("Failed to get words for level {$level}: " . $e->getMessage());
            throw new Exception("Unable to load words for level {$level}");
        }
    }
    
    /**
     * Validate student's word construction attempt
     * 
     * EAL PEDAGOGY: CONSTRUCTIVE ERROR ANALYSIS AND FEEDBACK
     * 
     * This method implements research-based error correction principles:
     * 
     * 1. PARTIAL CREDIT SYSTEM:
     *    - Recognizes partial understanding rather than binary right/wrong
     *    - Maintains motivation by acknowledging progress
     *    - Reference: Formative Assessment research (Black & Wiliam)
     * 
     * 2. ERROR PATTERN IDENTIFICATION:
     *    - Distinguishes systematic errors from random mistakes
     *    - Identifies common EAL challenges (b/p confusion, vowel substitution)
     *    - Reference: Error Analysis in SLA (Corder, 1967)
     * 
     * 3. ENCOURAGING FEEDBACK GENERATION:
     *    - Focuses on effort and progress rather than deficits
     *    - Provides specific, actionable guidance for improvement
     *    - Reference: Growth Mindset research (Dweck, 2006)
     * 
     * 4. PHONETIC SIMILARITY ASSESSMENT:
     *    - Recognizes phonetically plausible attempts
     *    - Supports learners developing English phonemic awareness
     *    - Reference: Phonological Processing in L2 (Koda, 2007)
     * 
     * 5. ADAPTIVE HINT PROVISION:
     *    - Provides scaffolded support based on error type
     *    - Gradually reduces support as competence develops
     *    - Reference: Zone of Proximal Development (Vygotsky)
     * 
     * @param string $targetWord The correct word
     * @param string $userInput Student's constructed word
     * @param array $options Validation options (strict, phonetic_hints, etc.)
     * @return array Validation result with feedback and scoring
     */
    public function validateWord($targetWord, $userInput, $options = []) {
        $result = [
            'correct' => false,
            'score' => 0,
            'feedback' => '',
            'error_type' => null,
            'hints' => [],
            'partial_credit' => 0
        ];
        
        // Normalize inputs
        $target = strtolower(trim($targetWord));
        $input = strtolower(trim($userInput));
        
        // Exact match check
        if ($target === $input) {
            $result['correct'] = true;
            $result['score'] = 100;
            $result['feedback'] = 'Perfect! Well done!';
            return $result;
        }
        
        // Analyze the error for EAL-appropriate feedback
        $errorAnalysis = $this->analyzeWordError($target, $input);
        $result['error_type'] = $errorAnalysis['type'];
        
        // Calculate partial credit based on error type
        $result['partial_credit'] = $this->calculatePartialCredit($target, $input, $errorAnalysis);
        
        // Generate encouraging feedback
        $result['feedback'] = $this->generateFeedback($errorAnalysis, $target);
        
        // Provide hints if enabled
        if (isset($options['provide_hints']) && $options['provide_hints']) {
            $result['hints'] = $this->generateHints($target, $input, $errorAnalysis);
        }
        
        return $result;
    }
    
    /**
     * Get image path for word visual cue
     * 
     * @param string $word The word to get image for
     * @param string $format Image format preference ('jpg', 'png', 'svg')
     * @return string|null Image path or null if not found
     */
    public function getWordImage($word, $format = 'jpg') {
        $word = strtolower($word);
        $imagePath = $this->imageBasePath . $word . '.' . $format;
        $fullPath = $_SERVER['DOCUMENT_ROOT'] . $imagePath;
        
        // Check if image exists
        if (file_exists($fullPath)) {
            return $imagePath;
        }
        
        // Try alternative formats
        $alternativeFormats = ['png', 'jpg', 'svg', 'gif'];
        foreach ($alternativeFormats as $altFormat) {
            if ($altFormat !== $format) {
                $altPath = $this->imageBasePath . $word . '.' . $altFormat;
                $altFullPath = $_SERVER['DOCUMENT_ROOT'] . $altPath;
                if (file_exists($altFullPath)) {
                    return $altPath;
                }
            }
        }
        
        // Return placeholder image if word image not found
        return $this->imageBasePath . 'placeholder.jpg';
    }
    
    /**
     * Calculate difficulty score for a word based on EAL learning principles
     * 
     * Difficulty factors considered:
     * - Phonetic complexity (consonant clusters, vowel patterns)
     * - Word length and structure
     * - Letter frequency and recognizability
     * - Common EAL learning challenges
     * 
     * @param string $word Word to analyze
     * @return array Difficulty analysis with score and factors
     */
    public function calculateDifficulty($word) {
        $word = strtolower($word);
        $length = strlen($word);
        
        $difficulty = [
            'score' => 1, // Base difficulty
            'factors' => [],
            'level_recommendation' => 1,
            'complexity_breakdown' => []
        ];
        
        // Length factor
        if ($length <= 3) {
            $difficulty['score'] += 0;
            $difficulty['factors'][] = 'short_word';
        } elseif ($length <= 4) {
            $difficulty['score'] += 1;
            $difficulty['factors'][] = 'medium_word';
        } else {
            $difficulty['score'] += 2;
            $difficulty['factors'][] = 'long_word';
        }
        
        // Phonetic complexity
        $phoneticScore = $this->analyzePhoneticComplexity($word);
        $difficulty['score'] += $phoneticScore['score'];
        $difficulty['factors'] = array_merge($difficulty['factors'], $phoneticScore['factors']);
        $difficulty['complexity_breakdown']['phonetic'] = $phoneticScore;
        
        // Letter frequency analysis
        $frequencyScore = $this->analyzeLetterFrequency($word);
        $difficulty['score'] += $frequencyScore['score'];
        $difficulty['complexity_breakdown']['frequency'] = $frequencyScore;
        
        // EAL-specific challenges
        $ealScore = $this->analyzeEALChallenges($word);
        $difficulty['score'] += $ealScore['score'];
        $difficulty['factors'] = array_merge($difficulty['factors'], $ealScore['factors']);
        $difficulty['complexity_breakdown']['eal_challenges'] = $ealScore;
        
        // Determine level recommendation
        $difficulty['level_recommendation'] = $this->scoreToDifficultyLevel($difficulty['score']);
        
        return $difficulty;
    }
    
    /**
     * Get word categories available for specified level
     * 
     * @param int $level Difficulty level
     * @return array Available categories for the level
     */
    public function getAvailableCategories($level) {
        try {
            $levelData = $this->loadLevelData($level);
            
            if (empty($levelData['words'])) {
                return [];
            }
            
            $categories = [];
            foreach ($levelData['words'] as $word) {
                if (isset($word['category']) && !in_array($word['category'], $categories)) {
                    $categories[] = $word['category'];
                }
            }
            
            return $categories;
            
        } catch (Exception $e) {
            error_log("Failed to get categories for level {$level}: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Get phonetic transcription for word (if available)
     * 
     * @param string $word Word to get phonetics for
     * @return string|null Phonetic transcription or null if not available
     */
    public function getPhoneticTranscription($word) {
        // This would typically connect to a phonetic dictionary API
        // For demo purposes, return basic phonetic patterns
        
        $basicPhonetics = [
            'cat' => '/kæt/',
            'dog' => '/dɒɡ/',
            'pen' => '/pen/',
            'bat' => '/bæt/',
            'sun' => '/sʌn/',
            'cup' => '/kʌp/',
            'fish' => '/fɪʃ/',
            'book' => '/bʊk/',
            'tree' => '/triː/',
            'house' => '/haʊs/'
        ];
        
        return $basicPhonetics[strtolower($word)] ?? null;
    }
    
    /**
     * Load word data for specific level with caching
     * 
     * @param int $level Difficulty level
     * @return array Level data including words and metadata
     */
    private function loadLevelData($level) {
        // Check cache first
        if (isset($this->wordCache[$level])) {
            return $this->wordCache[$level];
        }
        
        $levelFile = $this->wordDataPath . "level_{$level}.json";
        
        // If file doesn't exist, create default data
        if (!file_exists($levelFile)) {
            $this->createDefaultLevelData($level);
        }
        
        $jsonData = file_get_contents($levelFile);
        $levelData = json_decode($jsonData, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Invalid JSON in level {$level} data file");
        }
        
        // Cache the data
        $this->wordCache[$level] = $levelData;
        
        return $levelData;
    }
    
    /**
     * Create default word data for level if file doesn't exist
     * 
     * @param int $level Difficulty level
     */
    private function createDefaultLevelData($level) {
        $defaultData = $this->getDefaultWordsForLevel($level);
        
        $levelFile = $this->wordDataPath . "level_{$level}.json";
        file_put_contents($levelFile, json_encode($defaultData, JSON_PRETTY_PRINT));
    }
    
    /**
     * Get default word sets for each level
     * 
     * @param int $level Difficulty level
     * @return array Default word data structure
     */
    private function getDefaultWordsForLevel($level) {
        $defaultWords = [
            1 => [
                'name' => 'Simple CVC Words',
                'description' => 'Basic consonant-vowel-consonant words for beginners',
                'words' => [
                    ['word' => 'cat', 'category' => 'animals', 'phonetic' => '/kæt/', 'difficulty' => 1],
                    ['word' => 'dog', 'category' => 'animals', 'phonetic' => '/dɒɡ/', 'difficulty' => 1],
                    ['word' => 'pen', 'category' => 'objects', 'phonetic' => '/pen/', 'difficulty' => 1],
                    ['word' => 'bat', 'category' => 'animals', 'phonetic' => '/bæt/', 'difficulty' => 1],
                    ['word' => 'sun', 'category' => 'nature', 'phonetic' => '/sʌn/', 'difficulty' => 1],
                    ['word' => 'cup', 'category' => 'objects', 'phonetic' => '/kʌp/', 'difficulty' => 1],
                    ['word' => 'hat', 'category' => 'objects', 'phonetic' => '/hæt/', 'difficulty' => 1],
                    ['word' => 'bed', 'category' => 'objects', 'phonetic' => '/bed/', 'difficulty' => 1],
                    ['word' => 'bus', 'category' => 'transport', 'phonetic' => '/bʌs/', 'difficulty' => 1],
                    ['word' => 'box', 'category' => 'objects', 'phonetic' => '/bɒks/', 'difficulty' => 1]
                ]
            ],
            2 => [
                'name' => 'CVCC and CCVC Words',
                'description' => 'Words with consonant clusters for intermediate learners',
                'words' => [
                    ['word' => 'fish', 'category' => 'animals', 'phonetic' => '/fɪʃ/', 'difficulty' => 2],
                    ['word' => 'book', 'category' => 'objects', 'phonetic' => '/bʊk/', 'difficulty' => 2],
                    ['word' => 'tree', 'category' => 'nature', 'phonetic' => '/triː/', 'difficulty' => 2],
                    ['word' => 'frog', 'category' => 'animals', 'phonetic' => '/frɒɡ/', 'difficulty' => 2],
                    ['word' => 'star', 'category' => 'nature', 'phonetic' => '/stɑː/', 'difficulty' => 2],
                    ['word' => 'duck', 'category' => 'animals', 'phonetic' => '/dʌk/', 'difficulty' => 2],
                    ['word' => 'milk', 'category' => 'food', 'phonetic' => '/mɪlk/', 'difficulty' => 2],
                    ['word' => 'hand', 'category' => 'body', 'phonetic' => '/hænd/', 'difficulty' => 2],
                    ['word' => 'jump', 'category' => 'actions', 'phonetic' => '/dʒʌmp/', 'difficulty' => 2],
                    ['word' => 'help', 'category' => 'actions', 'phonetic' => '/help/', 'difficulty' => 2]
                ]
            ],
            3 => [
                'name' => 'Complex Words',
                'description' => 'Longer words and complex patterns for advanced learners',
                'words' => [
                    ['word' => 'house', 'category' => 'objects', 'phonetic' => '/haʊs/', 'difficulty' => 3],
                    ['word' => 'water', 'category' => 'nature', 'phonetic' => '/wɔːtə/', 'difficulty' => 3],
                    ['word' => 'happy', 'category' => 'emotions', 'phonetic' => '/hæpi/', 'difficulty' => 3],
                    ['word' => 'green', 'category' => 'colors', 'phonetic' => '/ɡriːn/', 'difficulty' => 3],
                    ['word' => 'chair', 'category' => 'objects', 'phonetic' => '/tʃeə/', 'difficulty' => 3],
                    ['word' => 'apple', 'category' => 'food', 'phonetic' => '/æpəl/', 'difficulty' => 3],
                    ['word' => 'smile', 'category' => 'actions', 'phonetic' => '/smaɪl/', 'difficulty' => 3],
                    ['word' => 'bread', 'category' => 'food', 'phonetic' => '/bred/', 'difficulty' => 3],
                    ['word' => 'sleep', 'category' => 'actions', 'phonetic' => '/sliːp/', 'difficulty' => 3],
                    ['word' => 'light', 'category' => 'objects', 'phonetic' => '/laɪt/', 'difficulty' => 3]
                ]
            ]
        ];
        
        return $defaultWords[$level] ?? $defaultWords[1];
    }
    
    /**
     * Enhance word data with additional metadata
     * 
     * @param array $word Base word data
     * @param int $level Current level
     * @return array Enhanced word data
     */
    private function enhanceWordData($word, $level) {
        $enhanced = $word;
        
        // No longer adding image path - using emojis instead
        
        // Add difficulty analysis if not present
        if (!isset($enhanced['difficulty_analysis'])) {
            $enhanced['difficulty_analysis'] = $this->calculateDifficulty($word['word']);
        }
        
        // Add phonetic transcription if not present
        if (!isset($enhanced['phonetic'])) {
            $enhanced['phonetic'] = $this->getPhoneticTranscription($word['word']);
        }
        
        // Add learning hints
        $enhanced['learning_hints'] = $this->generateLearningHints($word['word']);
        
        return $enhanced;
    }
    
    /**
     * Analyze word construction error for EAL-appropriate feedback
     * 
     * @param string $target Correct word
     * @param string $input User input
     * @return array Error analysis
     */
    private function analyzeWordError($target, $input) {
        $analysis = [
            'type' => 'unknown',
            'severity' => 'medium',
            'description' => '',
            'learning_opportunity' => ''
        ];
        
        // Length comparison
        if (strlen($input) != strlen($target)) {
            $analysis['type'] = 'length_mismatch';
            $analysis['description'] = 'Word length is incorrect';
            $analysis['learning_opportunity'] = 'Count the letters in the target word';
            return $analysis;
        }
        
        // Character-by-character analysis
        $differences = [];
        for ($i = 0; $i < strlen($target); $i++) {
            if ($target[$i] !== $input[$i]) {
                $differences[] = [
                    'position' => $i,
                    'expected' => $target[$i],
                    'actual' => $input[$i]
                ];
            }
        }
        
        if (count($differences) == 1) {
            $diff = $differences[0];
            $analysis['type'] = 'single_letter_error';
            $analysis['description'] = "Letter '{$diff['actual']}' should be '{$diff['expected']}'";
            $analysis['learning_opportunity'] = "Focus on the sound of '{$diff['expected']}'";
        } elseif (count($differences) == 2 && abs($differences[0]['position'] - $differences[1]['position']) == 1) {
            $analysis['type'] = 'letter_swap';
            $analysis['description'] = 'Two letters are swapped';
            $analysis['learning_opportunity'] = 'Pay attention to letter order';
        } else {
            $analysis['type'] = 'multiple_errors';
            $analysis['description'] = 'Multiple letters are incorrect';
            $analysis['learning_opportunity'] = 'Take your time and sound out each letter';
        }
        
        return $analysis;
    }
    
    /**
     * Calculate partial credit for near-correct attempts
     * 
     * @param string $target Correct word
     * @param string $input User input
     * @param array $errorAnalysis Error analysis data
     * @return int Partial credit percentage (0-50)
     */
    private function calculatePartialCredit($target, $input, $errorAnalysis) {
        $maxPartialCredit = 50; // Maximum 50% for partial credit
        
        switch ($errorAnalysis['type']) {
            case 'single_letter_error':
                return $maxPartialCredit;
            case 'letter_swap':
                return $maxPartialCredit * 0.8; // 40%
            case 'length_mismatch':
                return $maxPartialCredit * 0.3; // 15%
            case 'multiple_errors':
                $correctLetters = 0;
                for ($i = 0; $i < min(strlen($target), strlen($input)); $i++) {
                    if ($target[$i] === $input[$i]) {
                        $correctLetters++;
                    }
                }
                return ($correctLetters / strlen($target)) * $maxPartialCredit;
            default:
                return 0;
        }
    }
    
    /**
     * Generate encouraging feedback for incorrect attempts
     * 
     * @param array $errorAnalysis Error analysis data
     * @param string $target Correct word
     * @return string Encouraging feedback message
     */
    private function generateFeedback($errorAnalysis, $target) {
        $encouragingPhrases = [
            'Good try! ',
            'Nice effort! ',
            'You\'re getting close! ',
            'Keep going! '
        ];
        
        $feedback = $encouragingPhrases[array_rand($encouragingPhrases)];
        
        switch ($errorAnalysis['type']) {
            case 'single_letter_error':
                $feedback .= 'You got most of the word right. ' . $errorAnalysis['learning_opportunity'] . '.';
                break;
            case 'letter_swap':
                $feedback .= 'You have the right letters, just check the order.';
                break;
            case 'length_mismatch':
                $feedback .= "The word '{$target}' has " . strlen($target) . " letters.";
                break;
            default:
                $feedback .= 'Take your time and try again.';
        }
        
        return $feedback;
    }
    
    /**
     * Generate helpful hints for word construction
     * 
     * @param string $target Correct word
     * @param string $input User input
     * @param array $errorAnalysis Error analysis data
     * @return array Array of hints
     */
    private function generateHints($target, $input, $errorAnalysis) {
        $hints = [];
        
        // Always provide phonetic hint if available
        $phonetic = $this->getPhoneticTranscription($target);
        if ($phonetic) {
            $hints[] = "The word sounds like: {$phonetic}";
        }
        
        // Provide specific hints based on error type
        switch ($errorAnalysis['type']) {
            case 'single_letter_error':
                $hints[] = "Try focusing on each sound in the word";
                break;
            case 'letter_swap':
                $hints[] = "You have the right letters - check the order";
                break;
            case 'length_mismatch':
                $hints[] = "Count the letters: " . strlen($target) . " letters total";
                break;
        }
        
        return $hints;
    }
    
    /**
     * Generate learning hints for word
     * 
     * @param string $word Word to generate hints for
     * @return array Learning hints
     */
    private function generateLearningHints($word) {
        $hints = [];
        
        // Add phonetic breakdown
        $hints[] = "Break it down: " . implode('-', str_split($word));
        
        // Add rhyming words if available
        $rhymes = $this->findSimpleRhymes($word);
        if (!empty($rhymes)) {
            $hints[] = "Rhymes with: " . implode(', ', $rhymes);
        }
        
        return $hints;
    }
    
    /**
     * Find simple rhyming words
     * 
     * @param string $word Word to find rhymes for
     * @return array Simple rhyming words
     */
    private function findSimpleRhymes($word) {
        $simpleRhymes = [
            'cat' => ['bat', 'hat', 'mat'],
            'dog' => ['log', 'fog'],
            'pen' => ['hen', 'ten'],
            'sun' => ['fun', 'run'],
            'cup' => ['pup'],
            'fish' => ['dish', 'wish'],
            'tree' => ['free', 'see'],
            'book' => ['look', 'took']
        ];
        
        return $simpleRhymes[strtolower($word)] ?? [];
    }
    
    /**
     * Analyze phonetic complexity of word
     * 
     * @param string $word Word to analyze
     * @return array Phonetic complexity analysis
     */
    private function analyzePhoneticComplexity($word) {
        $analysis = ['score' => 0, 'factors' => []];
        
        // Check for consonant clusters
        if (preg_match('/[bcdfghjklmnpqrstvwxyz]{2,}/', $word)) {
            $analysis['score'] += 2;
            $analysis['factors'][] = 'consonant_clusters';
        }
        
        // Check for difficult vowel combinations
        if (preg_match('/(ea|ou|oo|ai|ay|ey)/', $word)) {
            $analysis['score'] += 1;
            $analysis['factors'][] = 'complex_vowels';
        }
        
        // Check for silent letters (basic patterns)
        if (preg_match('/(ght|kn|wr|mb)/', $word)) {
            $analysis['score'] += 3;
            $analysis['factors'][] = 'silent_letters';
        }
        
        return $analysis;
    }
    
    /**
     * Analyze letter frequency for EAL difficulty
     * 
     * @param string $word Word to analyze
     * @return array Frequency analysis
     */
    private function analyzeLetterFrequency($word) {
        $analysis = ['score' => 0, 'factors' => []];
        
        // Common letters are easier for EAL learners
        $commonLetters = ['a', 'e', 'i', 'o', 'u', 't', 'n', 's', 'r', 'l'];
        $uncommonLetters = ['q', 'x', 'z', 'j'];
        
        foreach (str_split($word) as $letter) {
            if (in_array($letter, $uncommonLetters)) {
                $analysis['score'] += 1;
                $analysis['factors'][] = 'uncommon_letters';
            }
        }
        
        return $analysis;
    }
    
    /**
     * Analyze EAL-specific learning challenges
     * 
     * @param string $word Word to analyze
     * @return array EAL challenge analysis
     */
    private function analyzeEALChallenges($word) {
        $analysis = ['score' => 0, 'factors' => []];
        
        // Letters that are commonly confused by EAL learners
        $confusingPairs = ['b/p', 'd/t', 'g/k', 'v/f', 'l/r'];
        
        foreach ($confusingPairs as $pair) {
            $letters = explode('/', $pair);
            if (strpos($word, $letters[0]) !== false || strpos($word, $letters[1]) !== false) {
                $analysis['score'] += 0.5;
                $analysis['factors'][] = 'confusing_sounds';
                break;
            }
        }
        
        return $analysis;
    }
    
    /**
     * Convert difficulty score to level recommendation
     * 
     * @param float $score Difficulty score
     * @return int Recommended level (1-3)
     */
    private function scoreToDifficultyLevel($score) {
        if ($score <= 2) {
            return 1;
        } elseif ($score <= 4) {
            return 2;
        } else {
            return 3;
        }
    }
}