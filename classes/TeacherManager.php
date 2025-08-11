<?php

/**
 * Teacher Manager Class for Word Builder Game
 * 
 * Manages teacher dashboard functionality including session management,
 * progress analytics, and error pattern analysis. This class provides
 * comprehensive tools for educators to monitor and support EAL learners.
 * 
 * Key Features:
 * - Session overview and management
 * - Detailed progress analytics
 * - Error pattern identification and analysis
 * - Performance trend tracking
 * - Pedagogical recommendations
 * 
 * @author Word Builder Game
 * @version 1.0
 */

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/ProgressManager.php';

class TeacherManager {
    
    private $db;
    private $progressManager;
    
    /**
     * Constructor - Initialize database connection and progress manager
     */
    public function __construct() {
        $this->db = Database::getInstance();
        $this->progressManager = new ProgressManager();
    }
    
    /**
     * Get all active sessions with summary statistics
     * 
     * @param array $options Filtering and sorting options
     * @return array Array of session summaries
     */
    public function getAllSessions($options = []) {
        try {
            $query = "
                SELECT 
                    s.session_id,
                    s.student_name,
                    s.created_at,
                    s.last_active,
                    COALESCE(MAX(p.level), 1) as current_level,
                    COALESCE(SUM(p.words_completed), 0) as total_words_completed,
                    COALESCE(SUM(p.total_attempts), 0) as total_attempts,
                    COALESCE(SUM(p.correct_attempts), 0) as correct_attempts,
                    COALESCE(MAX(p.best_streak), 0) as best_streak,
                    COALESCE(SUM(p.time_spent), 0) as total_time_spent
                FROM sessions s
                LEFT JOIN progress p ON s.session_id = p.session_id
                GROUP BY s.session_id, s.student_name, s.created_at, s.last_active
                ORDER BY s.last_active DESC
            ";
            
            $sessions = $this->db->fetchAll($query);
            
            // Enhance session data with calculated metrics
            foreach ($sessions as &$session) {
                $session = $this->enhanceSessionSummary($session);
            }
            
            return $sessions;
            
        } catch (Exception $e) {
            error_log("Failed to get all sessions: " . $e->getMessage());
            throw new Exception("Unable to retrieve sessions");
        }
    }
    
    /**
     * Create new student session
     * 
     * @param string $studentName Name of the student
     * @param array $options Additional session options
     * @return array Created session data
     * @throws Exception If session creation fails
     */
    public function createStudentSession($studentName, $options = []) {
        try {
            // Validate student name
            $studentName = trim($studentName);
            if (empty($studentName)) {
                throw new Exception("Student name is required");
            }
            
            if (strlen($studentName) < 2 || strlen($studentName) > 50) {
                throw new Exception("Student name must be between 2 and 50 characters");
            }
            
            // Generate unique session ID
            $sessionId = $this->generateUniqueSessionId();
            
            // Prepare session data
            $sessionData = [
                'session_id' => $sessionId,
                'student_name' => $studentName,
                'created_at' => date('Y-m-d H:i:s'),
                'last_active' => date('Y-m-d H:i:s')
            ];
            
            // Create session record
            $this->db->create('sessions', $sessionData);
            
            return [
                'session_id' => $sessionId,
                'student_name' => $studentName,
                'created_at' => $sessionData['created_at'],
                'status' => 'created'
            ];
            
        } catch (Exception $e) {
            error_log("Failed to create student session: " . $e->getMessage());
            throw new Exception("Unable to create student session: " . $e->getMessage());
        }
    }
    
    /**
     * Get detailed progress for specific session
     * 
     * @param string $sessionId Session identifier
     * @return array|false Detailed progress data or false if not found
     */
    public function getSessionProgress($sessionId) {
        try {
            // Get session info
            $sessionInfo = $this->db->find('sessions', ['session_id' => $sessionId]);
            
            if (!$sessionInfo) {
                return false;
            }
            
            // Get progress data from ProgressManager
            $progressData = $this->progressManager->getProgress($sessionId);
            
            // Get recent word attempts for detailed analysis
            $recentAttempts = $this->getRecentWordAttempts($sessionId, 20);
            
            // Calculate additional analytics
            $analytics = $this->calculateSessionAnalytics($sessionId);
            
            return [
                'session_info' => $sessionInfo,
                'progress_data' => $progressData,
                'recent_attempts' => $recentAttempts,
                'analytics' => $analytics
            ];
            
        } catch (Exception $e) {
            error_log("Failed to get session progress for {$sessionId}: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Analyze error patterns for specific session
     * 
     * @param string $sessionId Session identifier
     * @param array $options Analysis options (level filter, time range, etc.)
     * @return array Error pattern analysis
     */
    public function getErrorPatterns($sessionId, $options = []) {
        try {
            $conditions = ['session_id' => $sessionId, 'success' => false];
            
            // Add level filter if specified
            if (isset($options['level'])) {
                $conditions['level'] = $options['level'];
            }
            
            // Get failed attempts
            $failedAttempts = $this->db->read('word_attempts', $conditions, 'created_at DESC');
            
            if (empty($failedAttempts)) {
                return [
                    'total_errors' => 0,
                    'patterns' => [],
                    'recommendations' => []
                ];
            }
            
            // Analyze patterns
            $patterns = $this->analyzeErrorPatterns($failedAttempts);
            
            // Generate pedagogical recommendations
            $recommendations = $this->generateErrorRecommendations($patterns);
            
            return [
                'session_id' => $sessionId,
                'total_errors' => count($failedAttempts),
                'patterns' => $patterns,
                'recommendations' => $recommendations,
                'analysis_date' => date('c')
            ];
            
        } catch (Exception $e) {
            error_log("Failed to analyze error patterns for {$sessionId}: " . $e->getMessage());
            throw new Exception("Unable to analyze error patterns");
        }
    }
    
    /**
     * Generate progress report for session
     * 
     * @param string $sessionId Session identifier
     * @param string $format Report format ('summary', 'detailed', 'printable')
     * @return array Progress report data
     */
    public function generateProgressReport($sessionId, $format = 'summary') {
        try {
            $sessionProgress = $this->getSessionProgress($sessionId);
            
            if (!$sessionProgress) {
                throw new Exception("Session not found");
            }
            
            $report = [
                'session_id' => $sessionId,
                'student_name' => $sessionProgress['session_info']['student_name'],
                'report_date' => date('c'),
                'format' => $format
            ];
            
            switch ($format) {
                case 'summary':
                    $report['data'] = $this->generateSummaryReport($sessionProgress);
                    break;
                case 'detailed':
                    $report['data'] = $this->generateDetailedReport($sessionProgress);
                    break;
                case 'printable':
                    $report['data'] = $this->generatePrintableReport($sessionProgress);
                    break;
                default:
                    throw new Exception("Invalid report format");
            }
            
            return $report;
            
        } catch (Exception $e) {
            error_log("Failed to generate progress report: " . $e->getMessage());
            throw new Exception("Unable to generate progress report");
        }
    }
    
    /**
     * Get session activity timeline
     * 
     * @param string $sessionId Session identifier
     * @param int $days Number of days to include (default: 7)
     * @return array Activity timeline data
     */
    public function getSessionTimeline($sessionId, $days = 7) {
        try {
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
            
            $timeline = $this->db->fetchAll($query, [
                'session_id' => $sessionId,
                'start_date' => $startDate
            ]);
            
            // Fill in missing dates with zero activity
            $completeTimeline = $this->fillTimelineGaps($timeline, $days);
            
            return [
                'session_id' => $sessionId,
                'period_days' => $days,
                'timeline' => $completeTimeline
            ];
            
        } catch (Exception $e) {
            error_log("Failed to get session timeline: " . $e->getMessage());
            throw new Exception("Unable to retrieve session timeline");
        }
    }
    
    /**
     * Get comparative analytics across all sessions
     * 
     * @return array Comparative analytics data
     */
    public function getComparativeAnalytics() {
        try {
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
            
            $overall = $this->db->fetchRow($query);
            
            // Get level distribution
            $levelQuery = "
                SELECT 
                    level,
                    COUNT(DISTINCT session_id) as students_at_level,
                    AVG(correct_attempts / NULLIF(total_attempts, 0)) as avg_accuracy_at_level
                FROM progress 
                GROUP BY level 
                ORDER BY level
            ";
            
            $levelDistribution = $this->db->fetchAll($levelQuery);
            
            // Get common error patterns across all sessions
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
            
            $commonErrors = $this->db->fetchAll($errorQuery);
            
            return [
                'overall_statistics' => $overall,
                'level_distribution' => $levelDistribution,
                'common_error_patterns' => $commonErrors,
                'analysis_date' => date('c')
            ];
            
        } catch (Exception $e) {
            error_log("Failed to get comparative analytics: " . $e->getMessage());
            throw new Exception("Unable to retrieve comparative analytics");
        }
    }
    
    /**
     * Enhance session summary with calculated metrics
     * 
     * @param array $session Raw session data
     * @return array Enhanced session data
     */
    private function enhanceSessionSummary($session) {
        // Calculate accuracy
        $accuracy = $session['total_attempts'] > 0 ? 
            $session['correct_attempts'] / $session['total_attempts'] : 0;
        
        // Calculate average time per word
        $avgTimePerWord = $session['total_words_completed'] > 0 ? 
            $session['total_time_spent'] / $session['total_words_completed'] : 0;
        
        // Determine activity status
        $lastActiveTime = strtotime($session['last_active']);
        $isActive = $lastActiveTime > strtotime('-1 hour');
        $isRecent = $lastActiveTime > strtotime('-24 hours');
        
        // Add calculated fields
        $session['accuracy'] = round($accuracy, 2);
        $session['avg_time_per_word'] = round($avgTimePerWord, 1);
        $session['is_active'] = $isActive;
        $session['is_recent'] = $isRecent;
        $session['activity_status'] = $isActive ? 'active' : ($isRecent ? 'recent' : 'inactive');
        
        // Convert numeric fields
        $session['current_level'] = (int) $session['current_level'];
        $session['total_words_completed'] = (int) $session['total_words_completed'];
        $session['total_attempts'] = (int) $session['total_attempts'];
        $session['correct_attempts'] = (int) $session['correct_attempts'];
        $session['best_streak'] = (int) $session['best_streak'];
        $session['total_time_spent'] = (int) $session['total_time_spent'];
        
        return $session;
    }
    
    /**
     * Generate unique session ID
     * 
     * @return string Unique session identifier
     */
    private function generateUniqueSessionId() {
        do {
            $sessionId = 'session-' . uniqid() . '-' . bin2hex(random_bytes(4));
            $exists = $this->db->find('sessions', ['session_id' => $sessionId]);
        } while ($exists);
        
        return $sessionId;
    }
    
    /**
     * Get recent word attempts for session
     * 
     * @param string $sessionId Session identifier
     * @param int $limit Number of attempts to retrieve
     * @return array Recent word attempts
     */
    private function getRecentWordAttempts($sessionId, $limit = 20) {
        return $this->db->read('word_attempts', 
            ['session_id' => $sessionId], 
            'created_at DESC', 
            $limit
        );
    }
    
    /**
     * Calculate comprehensive session analytics
     * 
     * @param string $sessionId Session identifier
     * @return array Analytics data
     */
    private function calculateSessionAnalytics($sessionId) {
        try {
            // Get all word attempts for analysis
            $attempts = $this->db->read('word_attempts', ['session_id' => $sessionId], 'created_at ASC');
            
            if (empty($attempts)) {
                return $this->getDefaultAnalytics();
            }
            
            $analytics = [
                'total_attempts' => count($attempts),
                'successful_attempts' => 0,
                'failed_attempts' => 0,
                'accuracy_trend' => 'stable',
                'speed_trend' => 'stable',
                'difficulty_progression' => 'appropriate',
                'learning_indicators' => []
            ];
            
            // Calculate basic metrics
            foreach ($attempts as $attempt) {
                if ($attempt['success']) {
                    $analytics['successful_attempts']++;
                } else {
                    $analytics['failed_attempts']++;
                }
            }
            
            // Calculate trends
            $analytics['accuracy_trend'] = $this->calculateAccuracyTrend($attempts);
            $analytics['speed_trend'] = $this->calculateSpeedTrend($attempts);
            
            // Assess learning indicators
            $analytics['learning_indicators'] = $this->assessLearningIndicators($attempts);
            
            return $analytics;
            
        } catch (Exception $e) {
            error_log("Failed to calculate session analytics: " . $e->getMessage());
            return $this->getDefaultAnalytics();
        }
    }
    
    /**
     * Analyze error patterns from failed attempts
     * 
     * @param array $failedAttempts Array of failed word attempts
     * @return array Analyzed error patterns
     */
    private function analyzeErrorPatterns($failedAttempts) {
        $patterns = [];
        
        foreach ($failedAttempts as $attempt) {
            if (!empty($attempt['error_pattern'])) {
                $pattern = $attempt['error_pattern'];
                
                if (!isset($patterns[$pattern])) {
                    $patterns[$pattern] = [
                        'type' => $pattern,
                        'frequency' => 0,
                        'affected_words' => [],
                        'avg_time' => 0,
                        'description' => $this->getErrorPatternDescription($pattern)
                    ];
                }
                
                $patterns[$pattern]['frequency']++;
                $patterns[$pattern]['affected_words'][] = $attempt['word'];
                $patterns[$pattern]['avg_time'] += $attempt['time_taken'];
            }
        }
        
        // Calculate averages and remove duplicates
        foreach ($patterns as &$pattern) {
            $pattern['avg_time'] = $pattern['avg_time'] / $pattern['frequency'];
            $pattern['affected_words'] = array_unique($pattern['affected_words']);
        }
        
        // Sort by frequency
        uasort($patterns, function($a, $b) {
            return $b['frequency'] - $a['frequency'];
        });
        
        return array_values($patterns);
    }
    
    /**
     * Generate pedagogical recommendations based on error patterns
     * 
     * @param array $patterns Error patterns
     * @return array Recommendations
     */
    private function generateErrorRecommendations($patterns) {
        $recommendations = [];
        
        foreach ($patterns as $pattern) {
            $recommendation = [
                'error_type' => $pattern['type'],
                'priority' => $this->getRecommendationPriority($pattern),
                'strategy' => $this->getRecommendationStrategy($pattern['type']),
                'activities' => $this->getRecommendedActivities($pattern['type'])
            ];
            
            $recommendations[] = $recommendation;
        }
        
        // Sort by priority
        usort($recommendations, function($a, $b) {
            return $b['priority'] - $a['priority'];
        });
        
        return $recommendations;
    }
    
    /**
     * Get error pattern description
     * 
     * @param string $pattern Error pattern type
     * @return string Human-readable description
     */
    private function getErrorPatternDescription($pattern) {
        $descriptions = [
            'vowel_confusion' => 'Student confuses vowel sounds (a, e, i, o, u)',
            'consonant_clusters' => 'Difficulty with consonant combinations (bl, tr, st)',
            'letter_order' => 'Letters are correct but in wrong order',
            'phonetic_confusion' => 'Confuses similar sounding letters (b/p, d/t)',
            'length_mismatch' => 'Word length is incorrect',
            'single_letter_error' => 'One letter is incorrect',
            'multiple_errors' => 'Multiple letters are incorrect',
            'other' => 'Other error pattern'
        ];
        
        return $descriptions[$pattern] ?? 'Unknown error pattern';
    }
    
    /**
     * Get recommendation priority for error pattern
     * 
     * @param array $pattern Error pattern data
     * @return int Priority score (1-10)
     */
    private function getRecommendationPriority($pattern) {
        // Higher frequency = higher priority
        $frequencyScore = min($pattern['frequency'], 10);
        
        // Certain patterns are more critical for EAL learners
        $criticalPatterns = ['vowel_confusion', 'phonetic_confusion'];
        $criticalBonus = in_array($pattern['type'], $criticalPatterns) ? 3 : 0;
        
        return $frequencyScore + $criticalBonus;
    }
    
    /**
     * Get recommendation strategy for error type
     * 
     * @param string $errorType Error pattern type
     * @return string Recommended teaching strategy
     */
    private function getRecommendationStrategy($errorType) {
        $strategies = [
            'vowel_confusion' => 'Focus on vowel sound discrimination exercises',
            'consonant_clusters' => 'Practice consonant blending with visual and auditory cues',
            'letter_order' => 'Use letter sequencing activities and word building exercises',
            'phonetic_confusion' => 'Emphasize phonetic differences with minimal pair practice',
            'length_mismatch' => 'Practice counting letters and syllables',
            'single_letter_error' => 'Focus on careful letter-by-letter construction',
            'multiple_errors' => 'Return to simpler words and build confidence gradually'
        ];
        
        return $strategies[$errorType] ?? 'Provide additional practice and support';
    }
    
    /**
     * Get recommended activities for error type
     * 
     * @param string $errorType Error pattern type
     * @return array Recommended activities
     */
    private function getRecommendedActivities($errorType) {
        $activities = [
            'vowel_confusion' => [
                'Vowel sound matching games',
                'Word families practice (cat, bat, hat)',
                'Audio pronunciation exercises'
            ],
            'consonant_clusters' => [
                'Consonant blend flashcards',
                'Word building with letter tiles',
                'Phonics songs and rhymes'
            ],
            'letter_order' => [
                'Letter sequencing puzzles',
                'Word scramble activities',
                'Left-to-right reading practice'
            ],
            'phonetic_confusion' => [
                'Minimal pair discrimination',
                'Sound-symbol association games',
                'Mouth position awareness exercises'
            ]
        ];
        
        return $activities[$errorType] ?? ['Additional practice with similar words'];
    }
    
    /**
     * Calculate accuracy trend from attempts
     * 
     * @param array $attempts Word attempts in chronological order
     * @return string Trend: 'improving', 'declining', 'stable'
     */
    private function calculateAccuracyTrend($attempts) {
        if (count($attempts) < 6) {
            return 'stable';
        }
        
        $halfPoint = floor(count($attempts) / 2);
        $firstHalf = array_slice($attempts, 0, $halfPoint);
        $secondHalf = array_slice($attempts, $halfPoint);
        
        $firstAccuracy = $this->calculateAccuracyForAttempts($firstHalf);
        $secondAccuracy = $this->calculateAccuracyForAttempts($secondHalf);
        
        $difference = $secondAccuracy - $firstAccuracy;
        
        if ($difference > 0.1) {
            return 'improving';
        } elseif ($difference < -0.1) {
            return 'declining';
        } else {
            return 'stable';
        }
    }
    
    /**
     * Calculate speed trend from attempts
     * 
     * @param array $attempts Word attempts in chronological order
     * @return string Trend: 'faster', 'slower', 'stable'
     */
    private function calculateSpeedTrend($attempts) {
        if (count($attempts) < 6) {
            return 'stable';
        }
        
        $halfPoint = floor(count($attempts) / 2);
        $firstHalf = array_slice($attempts, 0, $halfPoint);
        $secondHalf = array_slice($attempts, $halfPoint);
        
        $firstAvgTime = array_sum(array_column($firstHalf, 'time_taken')) / count($firstHalf);
        $secondAvgTime = array_sum(array_column($secondHalf, 'time_taken')) / count($secondHalf);
        
        $difference = $firstAvgTime - $secondAvgTime; // Positive = getting faster
        
        if ($difference > 5) { // 5 seconds improvement
            return 'faster';
        } elseif ($difference < -5) { // 5 seconds slower
            return 'slower';
        } else {
            return 'stable';
        }
    }
    
    /**
     * Calculate accuracy for array of attempts
     * 
     * @param array $attempts Word attempts
     * @return float Accuracy rate (0.0 to 1.0)
     */
    private function calculateAccuracyForAttempts($attempts) {
        if (empty($attempts)) {
            return 0.0;
        }
        
        $successful = count(array_filter($attempts, function($a) { return $a['success']; }));
        return $successful / count($attempts);
    }
    
    /**
     * Assess learning indicators from attempts
     * 
     * @param array $attempts Word attempts
     * @return array Learning indicators
     */
    private function assessLearningIndicators($attempts) {
        $indicators = [];
        
        // Check for consistency
        $recentAttempts = array_slice($attempts, -10);
        $recentAccuracy = $this->calculateAccuracyForAttempts($recentAttempts);
        
        if ($recentAccuracy >= 0.8) {
            $indicators[] = 'High recent accuracy - ready for progression';
        } elseif ($recentAccuracy < 0.5) {
            $indicators[] = 'Low recent accuracy - needs additional support';
        }
        
        // Check for speed improvement
        if (count($attempts) >= 10) {
            $speedTrend = $this->calculateSpeedTrend($attempts);
            if ($speedTrend === 'faster') {
                $indicators[] = 'Improving speed - building confidence';
            }
        }
        
        return $indicators;
    }
    
    /**
     * Fill timeline gaps with zero activity days
     * 
     * @param array $timeline Existing timeline data
     * @param int $days Number of days to cover
     * @return array Complete timeline with all dates
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
     * Generate summary report data
     * 
     * @param array $sessionProgress Session progress data
     * @return array Summary report
     */
    private function generateSummaryReport($sessionProgress) {
        // Implementation for summary report
        return [
            'overview' => 'Summary report implementation',
            'key_metrics' => $sessionProgress['analytics'],
            'recommendations' => 'Based on current progress'
        ];
    }
    
    /**
     * Generate detailed report data
     * 
     * @param array $sessionProgress Session progress data
     * @return array Detailed report
     */
    private function generateDetailedReport($sessionProgress) {
        // Implementation for detailed report
        return [
            'overview' => 'Detailed report implementation',
            'full_analytics' => $sessionProgress,
            'detailed_recommendations' => 'Comprehensive analysis'
        ];
    }
    
    /**
     * Generate printable report data
     * 
     * @param array $sessionProgress Session progress data
     * @return array Printable report
     */
    private function generatePrintableReport($sessionProgress) {
        // Implementation for printable report
        return [
            'overview' => 'Printable report implementation',
            'formatted_data' => 'Print-friendly format',
            'summary' => 'Concise overview for printing'
        ];
    }
    
    /**
     * Get default analytics structure
     * 
     * @return array Default analytics
     */
    private function getDefaultAnalytics() {
        return [
            'total_attempts' => 0,
            'successful_attempts' => 0,
            'failed_attempts' => 0,
            'accuracy_trend' => 'stable',
            'speed_trend' => 'stable',
            'difficulty_progression' => 'appropriate',
            'learning_indicators' => []
        ];
    }
}