-- ============================================================================
-- WORD BUILDER GAME - PRODUCTION DATABASE SETUP
-- ============================================================================
-- 
-- This script sets up the production database for the EAL Word Builder Game.
-- It includes optimized schema, security configurations, and sample data.
-- 
-- USAGE:
-- 1. Create database: CREATE DATABASE word_builder_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- 2. Run this script: mysql -u root -p word_builder_game < production-setup.sql
-- 
-- SECURITY NOTES:
-- - Change default passwords before production deployment
-- - Ensure proper user permissions are set
-- - Enable SSL connections in production
-- - Regular backup procedures should be implemented
-- 
-- ============================================================================

-- Use the database
USE word_builder_game;

-- ============================================================================
-- SESSIONS TABLE - Student Session Management
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
    id INT PRIMARY KEY AUTO_INCREMENT 
        COMMENT 'Internal primary key for database optimization',
    
    session_id VARCHAR(255) UNIQUE NOT NULL 
        COMMENT 'Client-generated unique identifier for student session',
    
    student_name VARCHAR(100) NOT NULL 
        COMMENT 'Student display name for teacher dashboard',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
        COMMENT 'Session creation timestamp for longitudinal analysis',
    
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP 
        COMMENT 'Last activity timestamp for session management',
    
    -- Performance indexes
    INDEX idx_session_id (session_id),
    INDEX idx_last_active (last_active),
    INDEX idx_created_at (created_at)
        
) ENGINE=InnoDB 
  COMMENT='Student session management for EAL word builder game';

-- ============================================================================
-- PROGRESS TABLE - Level-Based Learning Analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS progress (
    id INT PRIMARY KEY AUTO_INCREMENT 
        COMMENT 'Internal primary key for database optimization',
    
    session_id VARCHAR(255) NOT NULL 
        COMMENT 'Reference to student session',
    
    level INT NOT NULL 
        COMMENT 'Game difficulty level (1-based)',
    
    words_completed INT DEFAULT 0 
        COMMENT 'Total words successfully completed at this level',
    
    total_attempts INT DEFAULT 0 
        COMMENT 'Total word construction attempts at this level',
    
    correct_attempts INT DEFAULT 0 
        COMMENT 'Successful word completions',
    
    current_streak INT DEFAULT 0 
        COMMENT 'Current consecutive correct answers',
    
    best_streak INT DEFAULT 0 
        COMMENT 'Best streak achieved at this level',
    
    time_spent INT DEFAULT 0 
        COMMENT 'Total time spent at this level in seconds',
    
    last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP 
        COMMENT 'Last activity at this level',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
        COMMENT 'When student first accessed this level',
    
    -- Referential integrity
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
    
    -- Performance indexes
    INDEX idx_session (session_id),
    INDEX idx_level (level),
    INDEX idx_last_played (last_played),
    
    -- Data integrity constraint
    UNIQUE KEY unique_session_level (session_id, level)
        
) ENGINE=InnoDB 
  COMMENT='Level-based progress tracking for EAL learning analytics';

-- ============================================================================
-- WORD_ATTEMPTS TABLE - Detailed Learning Analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS word_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT 
        COMMENT 'Internal primary key for database optimization',
    
    session_id VARCHAR(255) NOT NULL 
        COMMENT 'Reference to student session',
    
    word VARCHAR(50) NOT NULL 
        COMMENT 'Target word being constructed',
    
    level INT NOT NULL 
        COMMENT 'Difficulty level (1-3)',
    
    attempts INT DEFAULT 1 
        COMMENT 'Number of attempts for this word instance',
    
    success BOOLEAN DEFAULT FALSE 
        COMMENT 'Completion success indicator',
    
    time_taken INT DEFAULT 0 
        COMMENT 'Time to complete word in seconds',
    
    error_pattern VARCHAR(255) DEFAULT NULL 
        COMMENT 'Categorized error type for EAL analysis',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
        COMMENT 'Attempt timestamp',
    
    -- Referential integrity
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
    
    -- Performance and analytics indexes
    INDEX idx_session_word (session_id, word),
    INDEX idx_level (level),
    INDEX idx_success (success),
    INDEX idx_error_pattern (error_pattern),
    INDEX idx_created_at (created_at)
        
) ENGINE=InnoDB 
  COMMENT='Granular word attempt tracking for EAL error analysis';

-- ============================================================================
-- SAMPLE DATA FOR PRODUCTION TESTING
-- ============================================================================

-- Sample sessions for testing
INSERT IGNORE INTO sessions (session_id, student_name, created_at) VALUES 
('demo-session-001', 'Demo Student', NOW() - INTERVAL 7 DAY),
('demo-session-002', 'Test Learner', NOW() - INTERVAL 5 DAY),
('demo-session-003', 'Sample User', NOW() - INTERVAL 3 DAY);

-- Sample progress data
INSERT IGNORE INTO progress (session_id, level, words_completed, total_attempts, correct_attempts, current_streak, best_streak, time_spent, last_played) VALUES
('demo-session-001', 1, 8, 12, 8, 3, 5, 480, NOW() - INTERVAL 1 DAY),
('demo-session-001', 2, 4, 8, 4, 1, 3, 320, NOW() - INTERVAL 2 HOUR),
('demo-session-002', 1, 6, 9, 6, 2, 4, 360, NOW() - INTERVAL 3 HOUR),
('demo-session-002', 2, 2, 5, 2, 0, 2, 200, NOW() - INTERVAL 1 HOUR),
('demo-session-003', 1, 10, 14, 10, 4, 6, 600, NOW() - INTERVAL 30 MINUTE);

-- Sample word attempts for analytics
INSERT IGNORE INTO word_attempts (session_id, word, level, attempts, success, time_taken, error_pattern, created_at) VALUES
('demo-session-001', 'cat', 1, 1, TRUE, 35, NULL, NOW() - INTERVAL 7 DAY),
('demo-session-001', 'dog', 1, 2, TRUE, 55, 'letter_order', NOW() - INTERVAL 7 DAY),
('demo-session-001', 'pen', 1, 1, TRUE, 28, NULL, NOW() - INTERVAL 6 DAY),
('demo-session-001', 'bat', 1, 3, FALSE, 95, 'vowel_confusion', NOW() - INTERVAL 6 DAY),
('demo-session-001', 'sun', 1, 1, TRUE, 32, NULL, NOW() - INTERVAL 5 DAY),
('demo-session-001', 'cup', 1, 2, TRUE, 48, 'consonant_confusion', NOW() - INTERVAL 5 DAY),
('demo-session-001', 'fish', 2, 1, TRUE, 42, NULL, NOW() - INTERVAL 4 DAY),
('demo-session-001', 'jump', 2, 3, TRUE, 78, 'length_mismatch', NOW() - INTERVAL 3 DAY),
('demo-session-002', 'cat', 1, 1, TRUE, 30, NULL, NOW() - INTERVAL 5 DAY),
('demo-session-002', 'dog', 1, 2, TRUE, 45, 'visual_confusion', NOW() - INTERVAL 4 DAY),
('demo-session-002', 'red', 1, 1, TRUE, 25, NULL, NOW() - INTERVAL 3 DAY),
('demo-session-002', 'big', 1, 4, FALSE, 120, 'phonetic_confusion', NOW() - INTERVAL 2 DAY),
('demo-session-003', 'hat', 1, 1, TRUE, 22, NULL, NOW() - INTERVAL 3 DAY),
('demo-session-003', 'run', 1, 1, TRUE, 28, NULL, NOW() - INTERVAL 2 DAY),
('demo-session-003', 'box', 1, 2, TRUE, 38, 'letter_order', NOW() - INTERVAL 1 DAY);

-- ============================================================================
-- PRODUCTION OPTIMIZATIONS
-- ============================================================================

-- Analyze tables for optimal query performance
ANALYZE TABLE sessions, progress, word_attempts;

-- Show table status for verification
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    DATA_LENGTH,
    INDEX_LENGTH,
    CREATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'word_builder_game'
ORDER BY TABLE_NAME;

-- Display sample data counts
SELECT 'Sessions' as table_name, COUNT(*) as record_count FROM sessions
UNION ALL
SELECT 'Progress' as table_name, COUNT(*) as record_count FROM progress
UNION ALL
SELECT 'Word Attempts' as table_name, COUNT(*) as record_count FROM word_attempts;

-- ============================================================================
-- SECURITY RECOMMENDATIONS
-- ============================================================================
-- 
-- 1. CREATE DEDICATED DATABASE USER:
-- CREATE USER 'wordbuilder'@'localhost' IDENTIFIED BY 'secure_password_here';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON word_builder_game.* TO 'wordbuilder'@'localhost';
-- FLUSH PRIVILEGES;
-- 
-- 2. ENABLE SSL CONNECTIONS:
-- Add to my.cnf: ssl-ca, ssl-cert, ssl-key configurations
-- 
-- 3. REGULAR BACKUPS:
-- Set up automated daily backups with rotation
-- 
-- 4. MONITORING:
-- Enable slow query log for performance monitoring
-- Set up alerts for unusual activity patterns
-- 
-- ============================================================================