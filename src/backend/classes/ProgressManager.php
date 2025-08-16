<?php

/**
 * Progress Manager Class for Word Builder Game
 * 
 * Manages student progress tracking with EAL (English as an Additional Language)
 * specific metrics and analytics. This class implements pedagogically-informed
 * progress tracking that supports language learning principles.
 * 
 * Key EAL Considerations:
 * - Gradual difficulty progression based on accuracy and confidence
 * - Error pattern analysis for targeted intervention
 * - Streak tracking to build confidence and motivation
 * - Time-based metrics to identify struggling areas
 * - Adaptive level progression based on individual learning pace
 * 
 * @author Word Builder Game
 * @version 1.0
 */

require_once __DIR__ . '/Database.php';

class ProgressManager {
    
    private $db;
    
    /**
     * Constructor - Initialize database connection
     */
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Save student progress with EAL-specific metrics
     * 
     * This method implements research-based progress tracking for language learners:
     * - Tracks accuracy rates for adaptive difficulty
     * - Records time spent for identifying learning challenges
     * - Maintains streak data for motivation and confidence building
     * - Stores error patterns for pedagogical analysis
     * 
     * @param string $sessionId Unique session identifier
     * @param int $level Current difficulty level (1-based)
     * @param array $progressData Progress metrics including:
     *   - words_completed: Number of words successfully completed
     *   - total_attempts: Total attempts made at this level
     *   - correct_attempts: Number of successful attempts
     *   - time_spent: Time spent in seconds
     *   - current_streak: Current consecutive correct answers
     *   - word_attempt: Individual word attempt data (optional)
     * @return bool True if progress saved successfully
     * @throws Exception If save operation fails
     */
    public function saveProgress($sessionId, $level, $progressData) {
        try {
            $this->db->beginTransaction();
            
            // Validate input data
            $this->validateProgressData($sessionId, $level, $progressData);
            
            // Ensure session exists BEFORE creating progress records
            $this->ensureSessionExists($sessionId);
            
            // Filter progress data to only include database fields
            $filteredProgressData = $this->filterProgressData($progressData);
            
            // Get existing progress for this session/level
            $existingProgress = $this->getProgress($sessionId, $level);
            
            if ($existingProgress) {
                // Update existing progress record
                $updatedData = $this->mergeProgressData($existingProgress, $filteredProgressData);
                
                $this->db->updateRecord('progress', $updatedData, [
                    'session_id' => $sessionId,
                    'level' => $level
                ]);
            } else {
                // Create new progress record
                $newProgressData = array_merge([
                    'session_id' => $sessionId,
                    'level' => $level,
                    'words_completed' => 0,
                    'total_attempts' => 0,
                    'correct_attempts' => 0,
                    'current_streak' => 0,
                    'best_streak' => 0,
                    'time_spent' => 0
                ], $filteredProgressData);
                
                $this->db->create('progress', $newProgressData);
            }
            
            // Save individual word attempt if provided
            if (isset($progressData['word_attempt'])) {
                $this->saveWordAttempt($sessionId, $progressData['word_attempt']);
            }
            
            // Update last_active timestamp
            $this->updateSessionActivity($sessionId);
            
            $this->db->commit();
            return true;
            
        } catch (Exception $e) {
            $this->db->rollback();
            error_log("Failed to save progress for session {$sessionId}: " . $e->getMessage());
            throw new Exception("Failed to save progress: " . $e->getMessage());
        }
    }
    
    /**
     * Retrieve student progress data with EAL analytics
     * 
     * @param string $sessionId Session identifier
     * @param int|null $level Specific level (null for all levels)
     * @return array|false Progress data or false if not found
     */
    public function getProgress($sessionId, $level = null) {
        try {
            $conditions = ['session_id' => $sessionId];
            if ($level !== null) {
                $conditions['level'] = $level;
            }
            
            $progressRecords = $this->db->read('progress', $conditions, 'level ASC');
            
            if (empty($progressRecords)) {
                return false;
            }
            
            // If specific level requested, return single record
            if ($level !== null) {
                $progress = $progressRecords[0];
                $progress['accuracy'] = $this->calculateAccuracy($progress);
                $progress['performance_metrics'] = $this->getPerformanceMetrics($sessionId, $level);
                return $progress;
            }
            
            // Return all levels with calculated metrics
            $allProgress = [];
            foreach ($progressRecords as $progress) {
                $progress['accuracy'] = $this->calculateAccuracy($progress);
                $progress['performance_metrics'] = $this->getPerformanceMetrics($sessionId, $progress['level']);
                $allProgress[] = $progress;
            }
            
            return $allProgress;
            
        } catch (Exception $e) {
            error_log("Failed to get progress for session {$sessionId}: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Calculate next appropriate level based on EAL learning principles
     * 
     * PEDAGOGICAL RATIONALE:
     * This method implements Krashen's Natural Order Hypothesis and Input Hypothesis
     * by ensuring learners progress only when they demonstrate readiness. The criteria
     * are based on SLA (Second Language Acquisition) research:
     * 
     * 1. ACCURACY THRESHOLD (80%):
     *    - Based on research showing 80% comprehension is optimal for acquisition
     *    - Prevents cognitive overload while maintaining challenge
     *    - Reference: Nation & Newton (2009) - vocabulary acquisition thresholds
     * 
     * 2. CONSISTENCY REQUIREMENT (5+ attempts):
     *    - Ensures accuracy isn't due to chance or guessing
     *    - Builds confidence through repeated success
     *    - Reference: Swain's Output Hypothesis - repeated production aids acquisition
     * 
     * 3. TIME EFFICIENCY CHECK (max 60s per word):
     *    - Indicates automaticity development, not just accuracy
     *    - Prevents rushed progression without true understanding
     *    - Reference: Anderson's ACT-R theory - declarative to procedural knowledge
     * 
     * 4. ERROR PATTERN ANALYSIS:
     *    - Identifies systematic errors that need targeted intervention
     *    - Prevents advancement with unresolved learning gaps
     *    - Reference: Error Analysis in SLA - systematic vs. random errors
     * 
     * This approach ensures learners build solid foundations before advancing,
     * supporting long-term retention and confidence in English vocabulary.
     * 
     * @param array $currentProgress Current progress data
     * @return int Next appropriate level (may be same level for more practice)
     */
    public function calculateNextLevel($currentProgress) {
        if (empty($currentProgress)) {
            return 1; // Start at level 1
        }
        
        // Get the highest level with progress
        $currentLevel = is_array($currentProgress[0]) ? 
            max(array_column($currentProgress, 'level')) : 
            $currentProgress['level'];
        
        // Get progress for current level
        $levelProgress = is_array($currentProgress[0]) ? 
            array_filter($currentProgress, function($p) use ($currentLevel) {
                return $p['level'] == $currentLevel;
            })[0] : 
            $currentProgress;
        
        // Calculate accuracy
        $accuracy = $this->calculateAccuracy($levelProgress);
        
        // EAL progression criteria
        $minAccuracy = 0.80; // 80% accuracy required for progression
        $minAttempts = 5; // Minimum attempts to establish consistency
        $maxTimePerWord = 60; // Maximum 60 seconds per word (efficiency check)
        
        // Check if ready for next level
        $readyForProgression = (
            $accuracy >= $minAccuracy &&
            $levelProgress['total_attempts'] >= $minAttempts &&
            $levelProgress['words_completed'] > 0 &&
            ($levelProgress['time_spent'] / max($levelProgress['words_completed'], 1)) <= $maxTimePerWord
        );
        
        if ($readyForProgression) {
            // Check for error patterns that might indicate need for more practice
            $errorPatterns = $this->analyzeErrorPatterns($levelProgress['session_id'], $currentLevel);
            
            if (count($errorPatterns) <= 1) { // Allow progression with minimal error patterns
                return $currentLevel + 1;
            }
        }
        
        // Stay at current level for more practice
        return $currentLevel;
    }
    
    /**
     * Get detailed performance metrics for EAL analysis
     * 
     * @param string $sessionId Session identifier
     * @param int|null $level Specific level (null for overall metrics)
     * @return array Performance metrics including accuracy, speed, error patterns
     */
    public function getPerformanceMetrics($sessionId, $level = null) {
        try {
            $conditions = ['session_id' => $sessionId];
            if ($level !== null) {
                $conditions['level'] = $level;
            }
            
            // Get word attempts for detailed analysis
            $attempts = $this->db->read('word_attempts', $conditions, 'created_at DESC');
            
            if (empty($attempts)) {
                return $this->getDefaultMetrics();
            }
            
            // Calculate comprehensive metrics
            $metrics = [
                'total_attempts' => count($attempts),
                'successful_attempts' => count(array_filter($attempts, function($a) { return $a['success']; })),
                'accuracy' => 0,
                'average_time_per_word' => 0,
                'error_patterns' => [],
                'improvement_trend' => 'stable',
                'confidence_level' => 'building',
                'recommended_action' => 'continue'
            ];
            
            // Calculate accuracy
            $metrics['accuracy'] = $metrics['total_attempts'] > 0 ? 
                $metrics['successful_attempts'] / $metrics['total_attempts'] : 0;
            
            // Calculate average time per word
            $totalTime = array_sum(array_column($attempts, 'time_taken'));
            $metrics['average_time_per_word'] = $metrics['total_attempts'] > 0 ? 
                $totalTime / $metrics['total_attempts'] : 0;
            
            // Analyze error patterns
            $metrics['error_patterns'] = $this->analyzeErrorPatterns($sessionId, $level);
            
            // Determine improvement trend (last 5 vs previous 5 attempts)
            $metrics['improvement_trend'] = $this->calculateImprovementTrend($attempts);
            
            // Assess confidence level based on streaks and accuracy
            $metrics['confidence_level'] = $this->assessConfidenceLevel($metrics['accuracy'], $attempts);
            
            // Generate pedagogical recommendation
            $metrics['recommended_action'] = $this->generateRecommendation($metrics);
            
            return $metrics;
            
        } catch (Exception $e) {
            error_log("Failed to get performance metrics: " . $e->getMessage());
            return $this->getDefaultMetrics();
        }
    }
    
    /**
     * Save individual word attempt with error pattern analysis
     * 
     * @param string $sessionId Session identifier
     * @param array $attemptData Word attempt data
     * @return bool True if saved successfully
     */
    private function saveWordAttempt($sessionId, $attemptData) {
        $wordAttempt = array_merge([
            'session_id' => $sessionId,
            'word' => '',
            'level' => 1,
            'attempts' => 1,
            'success' => false,
            'time_taken' => 0,
            'error_pattern' => null
        ], $attemptData);
        
        // Analyze error pattern if attempt was unsuccessful
        if (!$wordAttempt['success'] && isset($attemptData['user_input'])) {
            $wordAttempt['error_pattern'] = $this->identifyErrorPattern(
                $wordAttempt['word'], 
                $attemptData['user_input']
            );
        }
        
        return $this->db->create('word_attempts', $wordAttempt) !== false;
    }
    
    /**
     * Ensure session exists in database, create if not exists
     * 
     * @param string $sessionId Session identifier
     */
    private function ensureSessionExists($sessionId) {
        // Check if session already exists
        $existingSession = $this->db->find('sessions', ['session_id' => $sessionId]);
        
        if (!$existingSession) {
            // Create session record with default values
            $sessionData = [
                'session_id' => $sessionId,
                'student_name' => 'Anonymous Player', // Default name for client-generated sessions
                'created_at' => date('Y-m-d H:i:s'),
                'last_active' => date('Y-m-d H:i:s')
            ];
            
            $this->db->create('sessions', $sessionData);
        }
    }

    /**
     * Update session activity timestamp
     * 
     * @param string $sessionId Session identifier
     */
    private function updateSessionActivity($sessionId) {
        $this->db->updateRecord('sessions', 
            ['last_active' => date('Y-m-d H:i:s')], 
            ['session_id' => $sessionId]
        );
    }
    
    /**
     * Filter progress data to only include database fields
     * 
     * @param array $progressData Progress data from client
     * @return array Filtered progress data with only database fields
     */
    private function filterProgressData($progressData) {
        $validFields = [
            'words_completed',
            'total_attempts', 
            'correct_attempts',
            'current_streak',
            'best_streak',
            'time_spent'
            // Note: 'accuracy' is calculated, not stored
            // Note: 'word_attempt' is processed separately
        ];
        
        $filtered = [];
        foreach ($validFields as $field) {
            if (isset($progressData[$field])) {
                $filtered[$field] = $progressData[$field];
            }
        }
        
        return $filtered;
    }
    
    /**
     * Validate progress data input
     * 
     * @param string $sessionId Session identifier
     * @param int $level Level number
     * @param array $progressData Progress data to validate
     * @throws Exception If validation fails
     */
    private function validateProgressData($sessionId, $level, $progressData) {
        if (empty($sessionId)) {
            throw new Exception("Session ID is required");
        }
        
        if (!is_numeric($level) || $level < 1) {
            throw new Exception("Valid level number is required");
        }
        
        if (!is_array($progressData)) {
            throw new Exception("Progress data must be an array");
        }
        
        // Validate numeric fields
        $numericFields = ['words_completed', 'total_attempts', 'correct_attempts', 'time_spent', 'current_streak'];
        foreach ($numericFields as $field) {
            if (isset($progressData[$field]) && !is_numeric($progressData[$field])) {
                throw new Exception("Field {$field} must be numeric");
            }
        }
    }
    
    /**
     * Merge new progress data with existing data
     * 
     * @param array $existing Existing progress data
     * @param array $new New progress data
     * @return array Merged progress data (only database fields)
     */
    private function mergeProgressData($existing, $new) {
        // Start with existing data but remove calculated fields
        $merged = [];
        $databaseFields = [
            'session_id', 'level', 'words_completed', 'total_attempts', 
            'correct_attempts', 'current_streak', 'best_streak', 'time_spent',
            'last_played', 'created_at'
        ];
        
        // Copy only database fields from existing data
        foreach ($databaseFields as $field) {
            if (isset($existing[$field])) {
                $merged[$field] = $existing[$field];
            }
        }
        
        // Add incremental values
        $incrementalFields = ['words_completed', 'total_attempts', 'correct_attempts', 'time_spent'];
        foreach ($incrementalFields as $field) {
            if (isset($new[$field])) {
                $merged[$field] = ($merged[$field] ?? 0) + $new[$field];
            }
        }
        
        // Update current values
        if (isset($new['current_streak'])) {
            $merged['current_streak'] = $new['current_streak'];
        }
        
        // Update best streak if current is better
        if (isset($new['current_streak']) && $new['current_streak'] > ($merged['best_streak'] ?? 0)) {
            $merged['best_streak'] = $new['current_streak'];
        }
        
        return $merged;
    }
    
    /**
     * Calculate accuracy percentage
     * 
     * @param array $progress Progress data
     * @return float Accuracy as decimal (0.0 to 1.0)
     */
    private function calculateAccuracy($progress) {
        if (($progress['total_attempts'] ?? 0) == 0) {
            return 0.0;
        }
        
        return ($progress['correct_attempts'] ?? 0) / $progress['total_attempts'];
    }
    
    /**
     * Analyze error patterns for EAL-specific insights
     * 
     * @param string $sessionId Session identifier
     * @param int|null $level Specific level
     * @return array Array of error patterns with frequencies
     */
    private function analyzeErrorPatterns($sessionId, $level = null) {
        $conditions = [
            'session_id' => $sessionId,
            'success' => false
        ];
        
        if ($level !== null) {
            $conditions['level'] = $level;
        }
        
        $failedAttempts = $this->db->read('word_attempts', $conditions);
        
        $patterns = [];
        foreach ($failedAttempts as $attempt) {
            if (!empty($attempt['error_pattern'])) {
                $pattern = $attempt['error_pattern'];
                $patterns[$pattern] = ($patterns[$pattern] ?? 0) + 1;
            }
        }
        
        // Sort by frequency
        arsort($patterns);
        
        return $patterns;
    }
    
    /**
     * Identify error pattern from incorrect attempt
     * 
     * @param string $targetWord Correct word
     * @param string $userInput User's input
     * @return string|null Error pattern identifier
     */
    private function identifyErrorPattern($targetWord, $userInput) {
        $target = strtolower($targetWord);
        $input = strtolower($userInput);
        
        // Common EAL error patterns
        if (strlen($input) != strlen($target)) {
            return 'length_mismatch';
        }
        
        // Check for letter substitution patterns
        $vowels = ['a', 'e', 'i', 'o', 'u'];
        $targetVowels = array_intersect(str_split($target), $vowels);
        $inputVowels = array_intersect(str_split($input), $vowels);
        
        if ($targetVowels != $inputVowels) {
            return 'vowel_confusion';
        }
        
        // Check for letter order issues
        if (count(array_diff(str_split($target), str_split($input))) == 0) {
            return 'letter_order';
        }
        
        // Check for similar sounding letters
        $similarSounds = [
            ['b', 'p'], ['d', 't'], ['g', 'k'], ['v', 'f'], ['z', 's']
        ];
        
        foreach ($similarSounds as $pair) {
            if (str_replace($pair[0], $pair[1], $target) == $input || 
                str_replace($pair[1], $pair[0], $target) == $input) {
                return 'phonetic_confusion';
            }
        }
        
        return 'other';
    }
    
    /**
     * Calculate improvement trend from recent attempts
     * 
     * @param array $attempts Array of attempts (newest first)
     * @return string Trend: 'improving', 'declining', or 'stable'
     */
    private function calculateImprovementTrend($attempts) {
        if (count($attempts) < 6) {
            return 'stable';
        }
        
        // Compare last 3 attempts with previous 3
        $recent = array_slice($attempts, 0, 3);
        $previous = array_slice($attempts, 3, 3);
        
        $recentSuccess = count(array_filter($recent, function($a) { return $a['success']; }));
        $previousSuccess = count(array_filter($previous, function($a) { return $a['success']; }));
        
        if ($recentSuccess > $previousSuccess) {
            return 'improving';
        } elseif ($recentSuccess < $previousSuccess) {
            return 'declining';
        }
        
        return 'stable';
    }
    
    /**
     * Assess confidence level based on performance
     * 
     * @param float $accuracy Current accuracy rate
     * @param array $attempts Recent attempts
     * @return string Confidence level: 'building', 'confident', 'struggling'
     */
    private function assessConfidenceLevel($accuracy, $attempts) {
        if ($accuracy >= 0.8) {
            return 'confident';
        } elseif ($accuracy >= 0.6) {
            return 'building';
        } else {
            return 'struggling';
        }
    }
    
    /**
     * Generate pedagogical recommendation based on metrics
     * 
     * @param array $metrics Performance metrics
     * @return string Recommended action
     */
    private function generateRecommendation($metrics) {
        if ($metrics['accuracy'] >= 0.8 && $metrics['confidence_level'] == 'confident') {
            return 'ready_for_next_level';
        } elseif ($metrics['accuracy'] < 0.6) {
            return 'needs_more_practice';
        } elseif (!empty($metrics['error_patterns'])) {
            return 'focus_on_error_patterns';
        } else {
            return 'continue_current_level';
        }
    }
    
    /**
     * Get default metrics structure
     * 
     * @return array Default metrics
     */
    private function getDefaultMetrics() {
        return [
            'total_attempts' => 0,
            'successful_attempts' => 0,
            'accuracy' => 0,
            'average_time_per_word' => 0,
            'error_patterns' => [],
            'improvement_trend' => 'stable',
            'confidence_level' => 'building',
            'recommended_action' => 'continue'
        ];
    }
}