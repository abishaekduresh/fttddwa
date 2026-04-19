-- FTTDDWA MySQL initialization
-- This runs once on first container start

CREATE DATABASE IF NOT EXISTS fttddwa_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant privileges
GRANT ALL PRIVILEGES ON fttddwa_db.* TO 'fttddwa_user'@'%';
FLUSH PRIVILEGES;

USE fttddwa_db;

-- Set timezone
SET GLOBAL time_zone = '+05:30';
SET time_zone = '+05:30';
