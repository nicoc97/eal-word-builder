-- Railway Production Database Schema Fix
-- Run this against the 'railway' database to add missing columns

USE railway;

-- Add missing columns to sessions table if they don't exist
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS student_name VARCHAR(100) NOT NULL DEFAULT 'Anonymous',
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add missing columns to progress table if they don't exist  
ALTER TABLE progress
ADD COLUMN IF NOT EXISTS correct_attempts INT DEFAULT 0;

-- Verify the schema
DESCRIBE sessions;
DESCRIBE progress;
DESCRIBE word_attempts;