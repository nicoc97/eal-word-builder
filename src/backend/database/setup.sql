-- ============================================================================
-- WORD BUILDER GAME DATABASE SCHEMA
-- ============================================================================
-- 
-- EDUCATIONAL CONTEXT:
-- This database schema is designed specifically for EAL (English as an Additional
-- Language) learning analytics and progress tracking. The structure supports
-- research-based pedagogical approaches including:
-- 
-- 1. INDIVIDUAL LEARNING PROGRESSION TRACKING
--    - Session-based progress monitoring for personalized learning paths
--    - Level-by-level competency assessment aligned with EAL frameworks
--    - Streak tracking for motivation and confidence building
-- 
-- 2. DETAILED ERROR PATTERN ANALYSIS
--    - Individual word attempt logging for systematic error identification
--    - Error pattern categorization based on EAL research (vowel confusion, etc.)
--    - Time-based performance metrics for identifying learning difficulties
-- 
-- 3. TEACHER DASHBOARD ANALYTICS
--    - Comprehensive student progress overview for formative assessment
--    - Error pattern aggregation for targeted intervention planning
--    - Performance trend analysis for differentiated instruction
-- 
-- 4. DATA-DRIVEN PEDAGOGICAL INSIGHTS
--    - Learning analytics to inform evidence-based teaching decisions
--    - Progress visualization supporting both student and teacher needs
--    - Longitudinal data collection for educational research
-- 
-- TECHNICAL SPECIFICATIONS:
-- - UTF8MB4 encoding for international character support
-- - InnoDB engine for ACID compliance and foreign key constraints
-- - Comprehensive indexing for performance optimization
-- - Cascading deletes for data integrity
-- - Timestamp tracking for temporal analysis
-- 
-- ============================================================================

-- Create database (uncomment if needed)
-- CREATE DATABASE word_builder_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE word_builder_game;

-- ============================================================================
-- SESSIONS TABLE - Student Session Management
-- ============================================================================
-- 
-- PURPOSE: Manages individual student learning sessions for the EAL word builder game
-- 
-- EDUCATIONAL RATIONALE:
-- - Each session represents a unique learner's journey through the curriculum
-- - Supports both anonymous gameplay and teacher-managed classroom sessions
-- - Enables longitudinal tracking of individual learner progress over time
-- - Facilitates teacher dashboard functionality for classroom management
-- 
-- PRIVACY CONSIDERATIONS:
-- - Student names are stored for teacher dashboard only (can be pseudonyms)
-- - Session IDs are generated client-side for privacy protection
-- - No personally identifiable information beyond names is collected
-- 
-- PERFORMANCE OPTIMIZATIONS:
-- - Primary key on auto-increment ID for fast joins
-- - Unique index on session_id for quick session lookups
-- - Index on last_active for teacher dashboard activity filtering
-- 
CREATE TABLE sessions (
    id INT PRIMARY KEY AUTO_INCREMENT 
        COMMENT 'Internal primary key for database optimization',
    
    session_id VARCHAR(255) UNIQUE NOT NULL 
        COMMENT 'Client-generated unique identifier for student session (format: session_timestamp_random)',
    
    student_name VARCHAR(100) NOT NULL 
        COMMENT 'Student display name for teacher dashboard (can be pseudonym for privacy)',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
        COMMENT 'Session creation timestamp for longitudinal analysis',
    
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP 
        COMMENT 'Last activity timestamp for session management and teacher dashboard',
    
    -- Performance indexes
    INDEX idx_session_id (session_id) 
        COMMENT 'Fast lookup for session-based queries',
    INDEX idx_last_active (last_active) 
        COMMENT 'Teacher dashboard activity filtering and session cleanup'
        
) ENGINE=InnoDB 
  COMMENT='Student session management for EAL word builder game - supports both anonymous and teacher-managed learning';

-- ============================================================================
-- PROGRESS TABLE - Level-Based Learning Analytics
-- ============================================================================
-- 
-- PURPOSE: Tracks aggregated student progress metrics for each difficulty level
-- 
-- EDUCATIONAL RATIONALE:
-- This table implements key EAL learning analytics principles:
-- 
-- 1. COMPETENCY-BASED PROGRESSION:
--    - Level-based tracking aligns with scaffolded learning theory
--    - Accuracy metrics (correct_attempts/total_attempts) inform readiness assessment
--    - Supports adaptive difficulty progression based on demonstrated competency
-- 
-- 2. MOTIVATIONAL TRACKING:
--    - Streak tracking builds intrinsic motivation through achievement recognition
--    - Words completed provides concrete progress visualization
--    - Time tracking identifies engagement patterns and potential difficulties
-- 
-- 3. FORMATIVE ASSESSMENT DATA:
--    - Real-time progress data enables responsive teaching
--    - Aggregated metrics support teacher dashboard analytics
--    - Temporal tracking (last_played) identifies students needing intervention
-- 
-- 4. LEARNING ANALYTICS:
--    - Data structure supports educational research on EAL acquisition patterns
--    - Enables identification of optimal progression rates for different learners
--    - Supports evidence-based curriculum development
-- 
-- DATA INTEGRITY:
-- - Foreign key constraint ensures referential integrity with sessions
-- - Unique constraint prevents duplicate level records per session
-- - Cascading delete maintains data consistency when sessions are removed
-- 
CREATE TABLE progress (
    id INT PRIMARY KEY AUTO_INCREMENT 
        COMMENT 'Internal primary key for database optimization',
    
    session_id VARCHAR(255) NOT NULL 
        COMMENT 'Reference to student session - links to sessions.session_id',
    
    level INT NOT NULL 
        COMMENT 'Game difficulty level (1-based): 1=CVC words, 2=CVCC/CCVC, 3=Complex patterns',
    
    words_completed INT DEFAULT 0 
        COMMENT 'Total words successfully completed at this level - progress visualization metric',
    
    total_attempts INT DEFAULT 0 
        COMMENT 'Total word construction attempts at this level - engagement metric',
    
    correct_attempts INT DEFAULT 0 
        COMMENT 'Successful word completions - competency assessment metric (accuracy = correct/total)',
    
    current_streak INT DEFAULT 0 
        COMMENT 'Current consecutive correct answers - confidence and motivation indicator',
    
    best_streak INT DEFAULT 0 
        COMMENT 'Best streak achieved at this level - peak performance tracking for motivation',
    
    time_spent INT DEFAULT 0 
        COMMENT 'Total time spent at this level in seconds - engagement and difficulty indicator',
    
    last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP 
        COMMENT 'Last activity at this level - identifies students needing intervention',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
        COMMENT 'When student first accessed this level - progression timeline tracking',
    
    -- Referential integrity
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
        COMMENT 'Maintains data integrity - removes progress when session is deleted',
    
    -- Performance indexes
    INDEX idx_session (session_id) 
        COMMENT 'Fast lookup for student-specific progress queries',
    INDEX idx_level (level) 
        COMMENT 'Cross-student level analysis and curriculum effectiveness research',
    INDEX idx_last_played (last_played) 
        COMMENT 'Teacher dashboard - identify inactive students needing support',
    
    -- Data integrity constraint
    UNIQUE KEY unique_session_level (session_id, level) 
        COMMENT 'Prevents duplicate progress records - one record per student per level'
        
) ENGINE=InnoDB 
  COMMENT='Level-based progress tracking implementing EAL learning analytics principles for competency assessment and motivation';

-- ============================================================================
-- WORD_ATTEMPTS TABLE - Detailed EAL Learning Analytics
-- ============================================================================
-- 
-- PURPOSE: Captures granular word attempt data for comprehensive EAL pedagogy analysis
-- 
-- EDUCATIONAL RATIONALE:
-- This table implements detailed learning analytics based on SLA (Second Language Acquisition) research:
-- 
-- 1. ERROR ANALYSIS FRAMEWORK:
--    - Individual attempt tracking enables systematic error pattern identification
--    - Error categorization based on EAL research (Corder's Error Analysis theory)
--    - Supports targeted intervention strategies for common EAL challenges
-- 
-- 2. LEARNING PATTERN IDENTIFICATION:
--    - Time-based metrics reveal cognitive processing patterns
--    - Success/failure tracking identifies words requiring additional practice
--    - Attempt frequency indicates word difficulty for individual learners
-- 
-- 3. PEDAGOGICAL INSIGHTS:
--    - Data supports evidence-based teaching decisions
--    - Error patterns inform curriculum development and teaching strategies
--    - Individual learning profiles enable differentiated instruction
-- 
-- 4. RESEARCH APPLICATIONS:
--    - Longitudinal data collection for EAL acquisition research
--    - Cross-learner analysis for curriculum effectiveness studies
--    - Evidence base for educational technology effectiveness
-- 
-- ERROR PATTERN TAXONOMY:
-- Based on EAL research, common error patterns include:
-- - "vowel_confusion": Difficulty distinguishing similar vowel sounds (e/i, a/u)
-- - "consonant_confusion": Similar consonant substitution (b/p, d/t, g/k)
-- - "letter_order": Correct letters but incorrect sequence (transposition)
-- - "length_mismatch": Incorrect word length (missing/extra letters)
-- - "phonetic_confusion": Sound-based errors in spelling
-- - "visual_confusion": Visually similar letter substitution (b/d, p/q)
-- 
-- PRIVACY AND ETHICS:
-- - No personally identifiable information stored beyond session linkage
-- - Data used solely for educational improvement and research
-- - Supports learner autonomy through self-paced, non-judgmental tracking
-- 
CREATE TABLE word_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT 
        COMMENT 'Internal primary key for database optimization',
    
    session_id VARCHAR(255) NOT NULL 
        COMMENT 'Reference to student session - enables individual learning profile analysis',
    
    word VARCHAR(50) NOT NULL 
        COMMENT 'Target word being constructed - enables word-specific difficulty analysis',
    
    level INT NOT NULL 
        COMMENT 'Difficulty level (1-3) - supports curriculum effectiveness analysis across levels',
    
    attempts INT DEFAULT 1 
        COMMENT 'Number of attempts for this word instance - indicates word difficulty for learner',
    
    success BOOLEAN DEFAULT FALSE 
        COMMENT 'Completion success indicator - core competency assessment metric',
    
    time_taken INT DEFAULT 0 
        COMMENT 'Time to complete word in seconds - cognitive processing and engagement indicator',
    
    error_pattern VARCHAR(255) DEFAULT NULL 
        COMMENT 'Categorized error type for EAL analysis: vowel_confusion, consonant_confusion, letter_order, length_mismatch, phonetic_confusion, visual_confusion, other',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
        COMMENT 'Attempt timestamp - enables temporal learning pattern analysis',
    
    -- Referential integrity
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
        COMMENT 'Maintains data integrity - removes attempts when session is deleted',
    
    -- Performance and analytics indexes
    INDEX idx_session_word (session_id, word) 
        COMMENT 'Individual learner word-specific analysis - tracks repeated attempts',
    INDEX idx_level (level) 
        COMMENT 'Cross-learner level analysis - curriculum effectiveness research',
    INDEX idx_success (success) 
        COMMENT 'Success rate analysis - competency assessment queries',
    INDEX idx_error_pattern (error_pattern) 
        COMMENT 'Error pattern analysis - identifies common EAL challenges for intervention',
    INDEX idx_created_at (created_at) 
        COMMENT 'Temporal analysis - learning progression and engagement patterns'
        
) ENGINE=InnoDB 
  COMMENT='Granular word attempt tracking implementing EAL error analysis framework for evidence-based pedagogy and learning research';

-- Insert sample data for development and testing
INSERT INTO sessions (session_id, student_name) VALUES 
('demo-session-001', 'Demo Student'),
('test-session-002', 'Test Learner');

INSERT INTO progress (session_id, level, words_completed, total_attempts, correct_attempts, current_streak, best_streak, time_spent) VALUES
('demo-session-001', 1, 5, 8, 5, 2, 3, 300),
('demo-session-001', 2, 2, 5, 2, 0, 2, 180),
('test-session-002', 1, 3, 4, 3, 3, 3, 240);

INSERT INTO word_attempts (session_id, word, level, attempts, success, time_taken, error_pattern) VALUES
('demo-session-001', 'cat', 1, 1, TRUE, 45, NULL),
('demo-session-001', 'dog', 1, 2, TRUE, 60, 'letter_order'),
('demo-session-001', 'pen', 1, 1, TRUE, 30, NULL),
('test-session-002', 'cat', 1, 1, TRUE, 35, NULL),
('test-session-002', 'bat', 1, 3, FALSE, 120, 'vowel_confusion');