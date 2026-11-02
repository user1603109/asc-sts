-- ======================================================================================
-- APAYAO STATE COLLEGE - AUTOMATED SCORING & TABULATION SYSTEM (ASC-STS)
-- Complete Production MySQL Database Schema & Baseline Seeds for Hostinger / cPanel
-- ======================================================================================

CREATE DATABASE IF NOT EXISTS asts_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE asts_db;

-- --------------------------------------------------------------------------------------
-- 0. CLEANUP: Drop existing tables in reverse dependency order to prevent FK constraints
-- --------------------------------------------------------------------------------------
DROP TABLE IF EXISTS scores;
DROP TABLE IF EXISTS criteria;
DROP TABLE IF EXISTS event_portions;
DROP TABLE IF EXISTS candidates;
DROP TABLE IF EXISTS event_judges;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS organizers;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS event_types;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS participants_registry;
DROP TABLE IF EXISTS audit_logs;

-- --------------------------------------------------------------------------------------
-- 1. SYSTEM SETTINGS
-- --------------------------------------------------------------------------------------
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO system_settings (setting_key, setting_value) VALUES
('system_name', 'Automated Scoring & Tabulation System'),
('organization', 'Apayao State College'),
('academic_year', '2025-2026');

-- --------------------------------------------------------------------------------------
-- 2. USERS & ACCESS CONTROL
-- Default Admin Account: admin / adminpassword123
-- --------------------------------------------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'judge') NOT NULL DEFAULT 'judge',
    approval_status ENUM('pending', 'approved', 'rejected', 'suspended') NOT NULL DEFAULT 'approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bcrypt hash for 'adminpassword123'
INSERT INTO users (username, password, full_name, role, approval_status) VALUES
('admin', '$2a$10$/LWeGkw46Ov0CFT5S2ZO1.BDSn5HzCXECSq7RT9NeIMrYRFj36NWa', 'ASC Administrator', 'admin', 'approved');

-- --------------------------------------------------------------------------------------
-- 3. EVENT TYPES & CATEGORIES
-- --------------------------------------------------------------------------------------
CREATE TABLE event_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO event_types (type_name) VALUES 
('Pageant'),
('Cultural'),
('Academic'),
('Sports'),
('Literary');

-- --------------------------------------------------------------------------------------
-- 4. ACADEMIC DEPARTMENTS
-- Institutional standard departments of Apayao State College
-- --------------------------------------------------------------------------------------
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(150) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO departments (department_name) VALUES 
('Bachelor of Secondary Education'),
('Bachelor of Elementary Education'),
('Bachelor in Information Technology'),
('Bachelor in Industrial Technology'),
('Bachelor of Technical Teacher Education'),
('Bachelor of Science in Civil Engineering'),
('Bachelor of Science in Hotel & Restaurant Mgmt.'),
('Bachelor of Science in Agriculture'),
('Bachelor of Science in Business Administration'),
('Bachelor of Science in Tourism'),
('Bachelor of Science in Criminology');

-- --------------------------------------------------------------------------------------
-- 5. EVENT ORGANIZERS (CRUD with dedicated full name fields)
-- --------------------------------------------------------------------------------------
CREATE TABLE organizers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100) NULL DEFAULT '',
    surname VARCHAR(100) NOT NULL,
    organizer_name VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO organizers (first_name, middle_name, surname, organizer_name) VALUES 
('Don John', 'A.', 'Fronda', 'Don John A. Fronda'),
('Maria', '', 'Santos', 'Maria Santos');

-- --------------------------------------------------------------------------------------
-- 6. EVENTS / COMPETITIONS
-- --------------------------------------------------------------------------------------
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    type VARCHAR(100) NOT NULL,
    participation_mode ENUM('Individual', 'Team') NOT NULL DEFAULT 'Individual',
    department VARCHAR(150) NULL,
    organizer VARCHAR(150) NULL,
    academic_year VARCHAR(50) NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('Upcoming', 'Ongoing', 'Tabulating', 'Completed') NOT NULL DEFAULT 'Upcoming'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------------------
-- 7. EVENT JUDGES (Assignment junction table)
-- --------------------------------------------------------------------------------------
CREATE TABLE event_judges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_judge (event_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------------------
-- 8. CANDIDATES / CONTENDERS
-- --------------------------------------------------------------------------------------
CREATE TABLE candidates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    image_path VARCHAR(500) NULL,
    department VARCHAR(150) NULL,
    year_level VARCHAR(50) NULL,
    order_number INT NOT NULL DEFAULT 1,
    registry_id INT NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------------------
-- 9. EVENT PORTIONS / SEGMENTS / PROCEEDINGS
-- --------------------------------------------------------------------------------------
CREATE TABLE event_portions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    portion_name VARCHAR(100) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    order_number INT NOT NULL DEFAULT 1,
    status ENUM('Upcoming', 'Ongoing', 'Completed') NOT NULL DEFAULT 'Upcoming',
    description TEXT NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------------------
-- 10. CRITERIA FOR JUDGING
-- --------------------------------------------------------------------------------------
CREATE TABLE criteria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    portion_id INT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    max_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    percentage DECIMAL(5,2) NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (portion_id) REFERENCES event_portions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------------------
-- 11. OFFICIAL SCORES
-- Unique constraint enforces one official score per event-judge-candidate-criteria combination
-- --------------------------------------------------------------------------------------
CREATE TABLE scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    judge_id INT NOT NULL,
    candidate_id INT NOT NULL,
    criteria_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (judge_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (criteria_id) REFERENCES criteria(id) ON DELETE CASCADE,
    UNIQUE KEY unique_score_entry (event_id, judge_id, candidate_id, criteria_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------------------
-- 12. PARTICIPANTS MASTER REGISTRY
-- --------------------------------------------------------------------------------------
CREATE TABLE participants_registry (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    department VARCHAR(150) NULL,
    year_level VARCHAR(50) NULL,
    image_path VARCHAR(500) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------------------
-- 13. AUDIT & ACTIVITY LOGS
-- --------------------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
