-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               9.1.0 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.11.0.7065
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for fttddwa_db
CREATE DATABASE IF NOT EXISTS `fttddwa_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `fttddwa_db`;

-- Dumping structure for table fttddwa_db.association_settings
CREATE TABLE IF NOT EXISTS `association_settings` (
  `id` int NOT NULL DEFAULT '1',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nameTamil` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shortName` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `shortNameTamil` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tagline` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `taglineTamil` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo1Url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo2Url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `regNumber` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `addressTamil` text COLLATE utf8mb4_unicode_ci,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stateTamil` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updatedAt` datetime(3) NOT NULL,
  `enableIdCard` tinyint(1) NOT NULL DEFAULT '1',
  `enableMemberRegistration` tinyint(1) NOT NULL DEFAULT '1',
  `idCardSettings` json DEFAULT NULL,
  `sigChairmanUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sigJointSecretaryUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sigPresidentUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sigSecretaryUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sigTreasurerUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sigVicePresidentUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table fttddwa_db.audit_logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `userEmail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resourceId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `oldValues` json DEFAULT NULL,
  `newValues` json DEFAULT NULL,
  `ipAddress` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userAgent` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SUCCESS',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `audit_logs_userId_idx` (`userId`),
  KEY `audit_logs_resource_resourceId_idx` (`resource`,`resourceId`),
  KEY `audit_logs_action_idx` (`action`),
  KEY `audit_logs_createdAt_idx` (`createdAt`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table fttddwa_db.members
CREATE TABLE IF NOT EXISTS `members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `membershipId` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nameTamil` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aadhaarHash` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `district` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `taluk` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `industry` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dateOfBirth` datetime(3) DEFAULT NULL,
  `phone` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photoUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PENDING','ACTIVE','INACTIVE','SUSPENDED','EXPIRED','DELETED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `joinedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdById` int DEFAULT NULL,
  `updatedById` int DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `weddingDate` datetime(3) DEFAULT NULL,
  `businessName` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `businessNameTamil` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notifyBirthday` tinyint(1) NOT NULL DEFAULT '1',
  `notifyWedding` tinyint(1) NOT NULL DEFAULT '1',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Tamil Nadu',
  `village` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `validUntil` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `members_membershipId_key` (`membershipId`),
  UNIQUE KEY `members_uuid_key` (`uuid`),
  UNIQUE KEY `members_phone_key` (`phone`),
  UNIQUE KEY `members_email_key` (`email`),
  KEY `members_district_idx` (`district`),
  KEY `members_taluk_idx` (`taluk`),
  KEY `members_status_idx` (`status`),
  KEY `members_membershipId_idx` (`membershipId`),
  KEY `members_uuid_idx` (`uuid`),
  KEY `members_createdById_fkey` (`createdById`),
  KEY `members_updatedById_fkey` (`updatedById`),
  FULLTEXT KEY `members_name_address_idx` (`name`,`address`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table fttddwa_db.permissions
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `displayName` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_key` (`name`),
  KEY `permissions_resource_action_idx` (`resource`,`action`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table fttddwa_db.roles
CREATE TABLE IF NOT EXISTS `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `displayName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `isSystem` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_key` (`name`),
  KEY `roles_name_idx` (`name`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table fttddwa_db.role_permissions
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `roleId` int NOT NULL,
  `permissionId` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`roleId`,`permissionId`),
  KEY `role_permissions_permissionId_fkey` (`permissionId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table fttddwa_db.sessions
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `refreshToken` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ipAddress` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userAgent` text COLLATE utf8mb4_unicode_ci,
  `expiresAt` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `revokedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sessions_refreshToken_key` (`refreshToken`),
  KEY `sessions_userId_idx` (`userId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table fttddwa_db.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passwordHash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `roleId` int NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `lastLoginAt` datetime(3) DEFAULT NULL,
  `failedLoginCount` int NOT NULL DEFAULT '0',
  `lockedUntil` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('ACTIVE','INACTIVE','DELETED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `uniqueId` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`),
  UNIQUE KEY `users_uniqueId_key` (`uniqueId`),
  KEY `users_email_idx` (`email`),
  KEY `users_roleId_idx` (`roleId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table fttddwa_db.whatsapp_credit_logs
CREATE TABLE IF NOT EXISTS `whatsapp_credit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendorId` int NOT NULL,
  `logId` int DEFAULT NULL,
  `amount` decimal(12,4) NOT NULL DEFAULT '1.0000',
  `type` enum('birthday','anniversary','festival','custom','otp','manual') COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `whatsapp_credit_logs_vendorId_idx` (`vendorId`),
  KEY `whatsapp_credit_logs_type_idx` (`type`),
  KEY `whatsapp_credit_logs_createdAt_idx` (`createdAt`),
  KEY `whatsapp_credit_logs_logId_fkey` (`logId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table fttddwa_db.whatsapp_cron_logs
CREATE TABLE IF NOT EXISTS `whatsapp_cron_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `triggeredBy` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'scheduler',
  `istDate` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `processed` int NOT NULL DEFAULT '0',
  `enqueued` int NOT NULL DEFAULT '0',
  `skipped` int NOT NULL DEFAULT '0',
  `failed` int NOT NULL DEFAULT '0',
  `stoppedReason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skippedDetails` json DEFAULT NULL,
  `errors` json DEFAULT NULL,
  `diagnostics` json DEFAULT NULL,
  `durationMs` int DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `whatsapp_cron_logs_createdAt_idx` (`createdAt`),
  KEY `whatsapp_cron_logs_istDate_idx` (`istDate`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table fttddwa_db.whatsapp_events
CREATE TABLE IF NOT EXISTS `whatsapp_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('birthday','anniversary','festival','custom') COLLATE utf8mb4_unicode_ci NOT NULL,
  `templateId` int NOT NULL,
  `scheduleTime` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `whatsapp_events_templateId_idx` (`templateId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table fttddwa_db.whatsapp_logs
CREATE TABLE IF NOT EXISTS `whatsapp_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendorId` int NOT NULL,
  `memberId` int NOT NULL,
  `messageType` enum('birthday','anniversary','festival','custom','otp','manual') COLLATE utf8mb4_unicode_ci NOT NULL,
  `templateName` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `messageBody` text COLLATE utf8mb4_unicode_ci,
  `recipientPhone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vendorMessageId` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','processing','sent','delivered','read','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `retryCount` int NOT NULL DEFAULT '0',
  `errorMessage` text COLLATE utf8mb4_unicode_ci,
  `sentAt` datetime(3) DEFAULT NULL,
  `deliveredAt` datetime(3) DEFAULT NULL,
  `scheduledDate` date NOT NULL,
  `nextRetryAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `messageBodyResolved` text COLLATE utf8mb4_unicode_ci,
  `readAt` datetime(3) DEFAULT NULL,
  `statusCheckCount` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `whatsapp_logs_vendorId_idx` (`vendorId`),
  KEY `whatsapp_logs_status_nextRetryAt_idx` (`status`,`nextRetryAt`),
  KEY `whatsapp_logs_scheduledDate_idx` (`scheduledDate`),
  KEY `whatsapp_logs_memberId_idx` (`memberId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table fttddwa_db.whatsapp_settings
CREATE TABLE IF NOT EXISTS `whatsapp_settings` (
  `id` int NOT NULL DEFAULT '1',
  `activeVendorId` int DEFAULT NULL,
  `retryAttempts` int NOT NULL DEFAULT '3',
  `cronTime` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '09:00',
  `enableBirthday` tinyint(1) NOT NULL DEFAULT '1',
  `enableAnniversary` tinyint(1) NOT NULL DEFAULT '1',
  `enableEvents` tinyint(1) NOT NULL DEFAULT '1',
  `birthdayTemplateId` int DEFAULT NULL,
  `anniversaryTemplateId` int DEFAULT NULL,
  `updatedAt` datetime(3) NOT NULL,
  `countryCode` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '+91',
  `countryName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'India',
  `anniversaryVariables` json DEFAULT NULL,
  `birthdayVariables` json DEFAULT NULL,
  `enableExternalCron` tinyint(1) NOT NULL DEFAULT '1',
  `externalCronSecret` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `whatsapp_settings_activeVendorId_fkey` (`activeVendorId`),
  KEY `whatsapp_settings_birthdayTemplateId_fkey` (`birthdayTemplateId`),
  KEY `whatsapp_settings_anniversaryTemplateId_fkey` (`anniversaryTemplateId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table fttddwa_db.whatsapp_templates
CREATE TABLE IF NOT EXISTS `whatsapp_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendorId` int NOT NULL,
  `templateName` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `language` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'en',
  `category` enum('birthday','anniversary','festival','custom','otp') COLLATE utf8mb4_unicode_ci NOT NULL,
  `variables` json DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `buttons` json DEFAULT NULL,
  `footerText` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `headerFormat` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `headerText` text COLLATE utf8mb4_unicode_ci,
  `status` enum('ACTIVE','INACTIVE','DELETED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `vendorTemplateId` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `whatsapp_templates_vendorId_idx` (`vendorId`),
  KEY `whatsapp_templates_category_idx` (`category`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table fttddwa_db.whatsapp_vendors
CREATE TABLE IF NOT EXISTS `whatsapp_vendors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apiBaseUrl` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apiKeyEncrypted` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `rateLimitPerSec` int NOT NULL DEFAULT '10',
  `retryLimit` int NOT NULL DEFAULT '3',
  `walletBalance` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `status` enum('ACTIVE','INACTIVE','DELETED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table fttddwa_db._prisma_migrations
CREATE TABLE IF NOT EXISTS `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
