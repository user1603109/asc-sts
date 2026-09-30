CREATE DATABASE IF NOT EXISTS asts_db;
USE asts_db;

-- ==========================================
-- 1. INDEPENDENT DICTIONARY TABLES (No Foreign Keys)
-- ==========================================

DROP TABLE IF EXISTS system_settings;
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL
);
INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES
('system_name', 'Automated Scoring & Tabulation System'),
('organization', 'Apayao State College'),
('academic_year', '2025-2026');

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin','judge') NOT NULL DEFAULT 'judge',
    approval_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'approved'
);

DROP TABLE IF EXISTS event_types;
CREATE TABLE event_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL UNIQUE
);
INSERT IGNORE INTO event_types (type_name) VALUES 
('Pageant'), ('Cultural'), ('Academic'), ('Sports'), ('Literary');

DROP TABLE IF EXISTS courses;
CREATE TABLE courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_name VARCHAR(150) NOT NULL UNIQUE
);
INSERT IGNORE INTO courses (course_name) VALUES 
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

-- ==========================================
-- 2. CORE PARENT TABLES
-- ==========================================

DROP TABLE IF EXISTS departments;
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(150) NOT NULL UNIQUE,
    department_code VARCHAR(50) NULL
);
INSERT IGNORE INTO departments (department_name, department_code) VALUES 
('Bachelor of Secondary Education', 'BSED'),
('Bachelor of Elementary Education', 'BEED'),
('Bachelor in Information Technology', 'BSIT'),
('Bachelor in Industrial Technology', 'BINDT'),
('Bachelor of Technical Teacher Education', 'BTTE'),
('Bachelor of Science in Civil Engineering', 'BSCE'),
('Bachelor of Science in Hotel & Restaurant Mgmt.', 'BSHRM'),
('Bachelor of Science in Agriculture', 'BSA'),
('Bachelor of Science in Business Administration', 'BSBA'),
('Bachelor of Science in Tourism', 'BST'),
('Bachelor of Science in Criminology', 'BSCrim');

DROP TABLE IF EXISTS events;
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
    status ENUM('Upcoming', 'Ongoing', 'Tabulating', 'Completed') DEFAULT 'Upcoming'
);

-- ==========================================
-- 3. DEPENDENT CHILD TABLES (Contains Foreign Keys)
-- ==========================================

DROP TABLE IF EXISTS event_judges;
CREATE TABLE event_judges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assignment (event_id, user_id)
);

DROP TABLE IF EXISTS candidates;
CREATE TABLE candidates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    image_path VARCHAR(255) NULL,
    course_id INT NULL,
    year_level VARCHAR(50) NULL,
    order_number INT,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS event_portions;
CREATE TABLE event_portions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    portion_name VARCHAR(100) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    order_number INT DEFAULT 1,
    status ENUM('Upcoming', 'Ongoing', 'Completed') DEFAULT 'Upcoming',
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS criteria;
CREATE TABLE criteria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    portion_id INT NULL,
    name VARCHAR(100) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    percentage DECIMAL(5,2) NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (portion_id) REFERENCES event_portions(id) ON DELETE CASCADE
);

-- ==========================================
-- 4. DEEP DEPENDENCY TABLES (Relies on multiple parents)
-- ==========================================

DROP TABLE IF EXISTS scores;
CREATE TABLE scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    judge_id INT NOT NULL,
    candidate_id INT NOT NULL,
    criteria_id INT NOT NULL,
    score DECIMAL(6,2) NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (judge_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (criteria_id) REFERENCES criteria(id) ON DELETE CASCADE,
    UNIQUE KEY unique_score (event_id, judge_id, candidate_id, criteria_id)
);

CREATE TABLE IF NOT EXISTS organizers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizer_name VARCHAR(150) NOT NULL UNIQUE
);

