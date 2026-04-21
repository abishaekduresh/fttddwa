-- =============================================================
-- FTTDDWA - Full Database Schema (MySQL)
-- Version: 1.3.1
-- Character Set: utf8mb4 / Collation: utf8mb4_unicode_ci
--
-- Usage: Import this file into your MySQL database via
--        phpMyAdmin, MySQL Workbench, or CLI:
--        mysql -u user -p dbname < database.sql
-- =============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------------
-- roles
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
    `id`          INTEGER      NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(50)  NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `description` TEXT         NULL,
    `isSystem`    BOOLEAN      NOT NULL DEFAULT false,
    `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3)  NOT NULL,

    UNIQUE INDEX `roles_name_key` (`name`),
    INDEX         `roles_name_idx` (`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- permissions
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `permissions` (
    `id`          INTEGER      NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(100) NOT NULL,
    `displayName` VARCHAR(150) NOT NULL,
    `resource`    VARCHAR(50)  NOT NULL,
    `action`      VARCHAR(50)  NOT NULL,
    `description` TEXT         NULL,
    `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permissions_name_key` (`name`),
    INDEX         `permissions_resource_action_idx` (`resource`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- role_permissions
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `role_permissions` (
    `roleId`       INTEGER     NOT NULL,
    `permissionId` INTEGER     NOT NULL,
    `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `role_permissions_permissionId_fkey` (`permissionId`),
    PRIMARY KEY (`roleId`, `permissionId`),
    CONSTRAINT `role_permissions_roleId_fkey`
        FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `role_permissions_permissionId_fkey`
        FOREIGN KEY (`permissionId`) REFERENCES `permissions` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- users
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id`               INTEGER                            NOT NULL AUTO_INCREMENT,
    `name`             VARCHAR(150)                       NOT NULL,
    `email`            VARCHAR(191)                       NOT NULL,
    `uniqueId`         VARCHAR(20)                        NULL,
    `passwordHash`     VARCHAR(255)                       NOT NULL,
    `roleId`           INTEGER                            NOT NULL,
    `isActive`         BOOLEAN                            NOT NULL DEFAULT true,
    `lastLoginAt`      DATETIME(3)                        NULL,
    `failedLoginCount` INTEGER                            NOT NULL DEFAULT 0,
    `lockedUntil`      DATETIME(3)                        NULL,
    `createdAt`        DATETIME(3)                        NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`        DATETIME(3)                        NOT NULL,
    `deletedAt`        DATETIME(3)                        NULL,
    `isDeleted`        BOOLEAN                            NOT NULL DEFAULT false,
    `status`           ENUM('ACTIVE','INACTIVE','DELETED') NOT NULL DEFAULT 'ACTIVE',

    UNIQUE INDEX `users_email_key`    (`email`),
    UNIQUE INDEX `users_uniqueId_key` (`uniqueId`),
    INDEX         `users_email_idx`   (`email`),
    INDEX         `users_roleId_idx`  (`roleId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `users_roleId_fkey`
        FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- sessions
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
    `id`           INTEGER     NOT NULL AUTO_INCREMENT,
    `userId`       INTEGER     NOT NULL,
    `refreshToken` VARCHAR(191) NOT NULL,
    `ipAddress`    VARCHAR(45) NULL,
    `userAgent`    TEXT        NULL,
    `expiresAt`    DATETIME(3) NOT NULL,
    `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt`    DATETIME(3) NULL,

    UNIQUE INDEX `sessions_refreshToken_key` (`refreshToken`),
    INDEX         `sessions_userId_idx`      (`userId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `sessions_userId_fkey`
        FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- members
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `members` (
    `id`                INTEGER                                           NOT NULL AUTO_INCREMENT,
    `membershipId`      VARCHAR(20)                                       NOT NULL,
    `name`              VARCHAR(200)                                      NOT NULL,
    `nameTamil`         VARCHAR(200)                                      NULL,
    `position`          VARCHAR(100)                                      NULL,
    `aadhaarHash`       VARCHAR(512)                                      NULL,
    `address`           TEXT                                              NOT NULL,
    `district`          VARCHAR(100)                                      NOT NULL,
    `taluk`             VARCHAR(100)                                      NOT NULL,
    `industry`          VARCHAR(150)                                      NULL,
    `dateOfBirth`       DATETIME(3)                                       NULL,
    `phone`             VARCHAR(15)                                       NOT NULL,
    `email`             VARCHAR(191)                                      NULL,
    `photoUrl`          VARCHAR(500)                                      NULL,
    `status`            ENUM('ACTIVE','INACTIVE','SUSPENDED','EXPIRED','DELETED') NOT NULL DEFAULT 'ACTIVE',
    `joinedAt`          DATETIME(3)                                       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById`       INTEGER                                           NULL,
    `updatedById`       INTEGER                                           NULL,
    `createdAt`         DATETIME(3)                                       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`         DATETIME(3)                                       NOT NULL,
    `deletedAt`         DATETIME(3)                                       NULL,
    `weddingDate`       DATETIME(3)                                       NULL,
    `businessName`      VARCHAR(200)                                      NULL,
    `businessNameTamil` VARCHAR(200)                                      NULL,
    `remark`            TEXT                                              NULL,
    `notifyBirthday`    BOOLEAN                                           NOT NULL DEFAULT true,
    `notifyWedding`     BOOLEAN                                           NOT NULL DEFAULT true,
    `state`             VARCHAR(100)                                      NOT NULL DEFAULT 'Tamil Nadu',
    `village`           VARCHAR(150)                                      NULL,

    UNIQUE INDEX `members_membershipId_key` (`membershipId`),
    UNIQUE INDEX `members_phone_key`        (`phone`),
    UNIQUE INDEX `members_email_key`        (`email`),
    INDEX         `members_district_idx`    (`district`),
    INDEX         `members_taluk_idx`       (`taluk`),
    INDEX         `members_status_idx`      (`status`),
    INDEX         `members_membershipId_idx`(`membershipId`),
    INDEX         `members_createdById_fkey`(`createdById`),
    FULLTEXT INDEX `members_name_address_idx` (`name`, `address`),
    PRIMARY KEY (`id`),
    CONSTRAINT `members_createdById_fkey`
        FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `members_updatedById_fkey`
        FOREIGN KEY (`updatedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- audit_logs
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id`         INTEGER     NOT NULL AUTO_INCREMENT,
    `userId`     INTEGER     NULL,
    `userEmail`  VARCHAR(255) NULL,
    `action`     VARCHAR(50) NOT NULL,
    `resource`   VARCHAR(50) NOT NULL,
    `resourceId` VARCHAR(50) NULL,
    `oldValues`  JSON        NULL,
    `newValues`  JSON        NULL,
    `ipAddress`  VARCHAR(45) NULL,
    `userAgent`  TEXT        NULL,
    `status`     VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_idx`              (`userId`),
    INDEX `audit_logs_resource_resourceId_idx` (`resource`, `resourceId`),
    INDEX `audit_logs_action_idx`              (`action`),
    INDEX `audit_logs_createdAt_idx`           (`createdAt`),
    PRIMARY KEY (`id`),
    CONSTRAINT `audit_logs_userId_fkey`
        FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- association_settings  (singleton row — id always = 1)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `association_settings` (
    `id`                       INTEGER      NOT NULL DEFAULT 1,
    `name`                     VARCHAR(255) NOT NULL,
    `nameTamil`                VARCHAR(255) NULL,
    `shortName`                VARCHAR(50)  NOT NULL,
    `shortNameTamil`           VARCHAR(50)  NULL,
    `tagline`                  VARCHAR(255) NULL,
    `taglineTamil`             VARCHAR(255) NULL,
    `logo1Url`                 VARCHAR(500) NULL,
    `logo2Url`                 VARCHAR(500) NULL,
    `regNumber`                VARCHAR(100) NULL,
    `address`                  TEXT         NULL,
    `addressTamil`             TEXT         NULL,
    `state`                    VARCHAR(100) NULL,
    `stateTamil`               VARCHAR(100) NULL,
    `email`                    VARCHAR(255) NULL,
    `phone`                    VARCHAR(20)  NULL,
    `enableMemberRegistration` BOOLEAN      NOT NULL DEFAULT true,
    `updatedAt`                DATETIME(3)  NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- whatsapp_vendors
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `whatsapp_vendors` (
    `id`              INTEGER                         NOT NULL AUTO_INCREMENT,
    `name`            VARCHAR(100)                    NOT NULL,
    `apiBaseUrl`      VARCHAR(500)                    NOT NULL,
    `apiKeyEncrypted` TEXT                            NOT NULL,
    `isActive`        BOOLEAN                         NOT NULL DEFAULT true,
    `status`          ENUM('ACTIVE','INACTIVE','DELETED') NOT NULL DEFAULT 'ACTIVE',
    `rateLimitPerSec` INTEGER                         NOT NULL DEFAULT 10,
    `retryLimit`      INTEGER                         NOT NULL DEFAULT 3,
    `walletBalance`   DECIMAL(12,4)                   NOT NULL DEFAULT 0,
    `createdAt`       DATETIME(3)                     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`       DATETIME(3)                     NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- whatsapp_templates
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `whatsapp_templates` (
    `id`               INTEGER                                         NOT NULL AUTO_INCREMENT,
    `vendorId`         INTEGER                                         NOT NULL,
    `templateName`     VARCHAR(200)                                    NOT NULL,
    `vendorTemplateId` VARCHAR(200)                                    NULL,
    `language`         VARCHAR(10)                                     NOT NULL DEFAULT 'en',
    `category`         ENUM('birthday','anniversary','festival','custom','otp') NOT NULL,
    `variables`        JSON                                            NULL,
    `body`             TEXT                                            NULL,
    `headerText`       TEXT                                            NULL,
    `headerFormat`     VARCHAR(50)                                     NULL,
    `footerText`       VARCHAR(500)                                    NULL,
    `buttons`          JSON                                            NULL,
    `isActive`         BOOLEAN                                         NOT NULL DEFAULT true,
    `status`           ENUM('ACTIVE','INACTIVE','DELETED')             NOT NULL DEFAULT 'ACTIVE',
    `createdAt`        DATETIME(3)                                     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`        DATETIME(3)                                     NOT NULL,

    INDEX `whatsapp_templates_vendorId_idx`  (`vendorId`),
    INDEX `whatsapp_templates_category_idx`  (`category`),
    PRIMARY KEY (`id`),
    CONSTRAINT `whatsapp_templates_vendorId_fkey`
        FOREIGN KEY (`vendorId`) REFERENCES `whatsapp_vendors` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- whatsapp_events
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `whatsapp_events` (
    `id`           INTEGER                                         NOT NULL AUTO_INCREMENT,
    `name`         VARCHAR(200)                                    NOT NULL,
    `type`         ENUM('birthday','anniversary','festival','custom') NOT NULL,
    `templateId`   INTEGER                                         NOT NULL,
    `scheduleTime` VARCHAR(5)                                      NOT NULL,
    `isActive`     BOOLEAN                                         NOT NULL DEFAULT true,
    `createdAt`    DATETIME(3)                                     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`    DATETIME(3)                                     NOT NULL,

    INDEX `whatsapp_events_templateId_idx` (`templateId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `whatsapp_events_templateId_fkey`
        FOREIGN KEY (`templateId`) REFERENCES `whatsapp_templates` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- whatsapp_logs
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `whatsapp_logs` (
    `id`                  INTEGER                                                  NOT NULL AUTO_INCREMENT,
    `vendorId`            INTEGER                                                  NOT NULL,
    `memberId`            INTEGER                                                  NOT NULL,
    `messageType`         ENUM('birthday','anniversary','festival','custom','otp','manual') NOT NULL,
    `templateName`        VARCHAR(200)                                             NULL,
    `messageBody`         TEXT                                                     NULL,
    `messageBodyResolved` TEXT                                                     NULL,
    `recipientPhone`      VARCHAR(20)                                              NOT NULL,
    `vendorMessageId`     VARCHAR(200)                                             NULL,
    `status`              ENUM('pending','processing','sent','delivered','read','failed') NOT NULL DEFAULT 'pending',
    `statusCheckCount`    INTEGER                                                  NOT NULL DEFAULT 0,
    `retryCount`          INTEGER                                                  NOT NULL DEFAULT 0,
    `errorMessage`        TEXT                                                     NULL,
    `sentAt`              DATETIME(3)                                              NULL,
    `deliveredAt`         DATETIME(3)                                              NULL,
    `readAt`              DATETIME(3)                                              NULL,
    `scheduledDate`       DATE                                                     NOT NULL,
    `nextRetryAt`         DATETIME(3)                                              NULL,
    `createdAt`           DATETIME(3)                                              NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`           DATETIME(3)                                              NOT NULL,

    INDEX `whatsapp_logs_vendorId_idx`            (`vendorId`),
    INDEX `whatsapp_logs_status_nextRetryAt_idx`  (`status`, `nextRetryAt`),
    INDEX `whatsapp_logs_scheduledDate_idx`       (`scheduledDate`),
    INDEX `whatsapp_logs_memberId_idx`            (`memberId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `whatsapp_logs_vendorId_fkey`
        FOREIGN KEY (`vendorId`) REFERENCES `whatsapp_vendors` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `whatsapp_logs_memberId_fkey`
        FOREIGN KEY (`memberId`) REFERENCES `members` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- whatsapp_credit_logs
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `whatsapp_credit_logs` (
    `id`        INTEGER                                                  NOT NULL AUTO_INCREMENT,
    `vendorId`  INTEGER                                                  NOT NULL,
    `logId`     INTEGER                                                  NULL,
    `amount`    DECIMAL(12,4)                                            NOT NULL DEFAULT 1.0000,
    `type`      ENUM('birthday','anniversary','festival','custom','otp','manual') NOT NULL,
    `createdAt` DATETIME(3)                                              NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `whatsapp_credit_logs_vendorId_idx`  (`vendorId`),
    INDEX `whatsapp_credit_logs_type_idx`      (`type`),
    INDEX `whatsapp_credit_logs_createdAt_idx` (`createdAt`),
    PRIMARY KEY (`id`),
    CONSTRAINT `whatsapp_credit_logs_vendorId_fkey`
        FOREIGN KEY (`vendorId`) REFERENCES `whatsapp_vendors` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `whatsapp_credit_logs_logId_fkey`
        FOREIGN KEY (`logId`) REFERENCES `whatsapp_logs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- whatsapp_cron_logs
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `whatsapp_cron_logs` (
    `id`             INTEGER      NOT NULL AUTO_INCREMENT,
    `triggeredBy`    VARCHAR(50)  NOT NULL DEFAULT 'scheduler',
    `istDate`        VARCHAR(10)  NOT NULL,
    `processed`      INTEGER      NOT NULL DEFAULT 0,
    `enqueued`       INTEGER      NOT NULL DEFAULT 0,
    `skipped`        INTEGER      NOT NULL DEFAULT 0,
    `failed`         INTEGER      NOT NULL DEFAULT 0,
    `stoppedReason`  VARCHAR(500) NULL,
    `skippedDetails` JSON         NULL,
    `errors`         JSON         NULL,
    `diagnostics`    JSON         NULL,
    `durationMs`     INTEGER      NULL,
    `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `whatsapp_cron_logs_createdAt_idx` (`createdAt`),
    INDEX `whatsapp_cron_logs_istDate_idx`   (`istDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- whatsapp_settings  (singleton row — id always = 1)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `whatsapp_settings` (
    `id`                    INTEGER      NOT NULL DEFAULT 1,
    `activeVendorId`        INTEGER      NULL,
    `retryAttempts`         INTEGER      NOT NULL DEFAULT 3,
    `cronTime`              VARCHAR(5)   NOT NULL DEFAULT '09:00',
    `enableBirthday`        BOOLEAN      NOT NULL DEFAULT true,
    `enableAnniversary`     BOOLEAN      NOT NULL DEFAULT true,
    `enableEvents`          BOOLEAN      NOT NULL DEFAULT true,
    `birthdayTemplateId`    INTEGER      NULL,
    `anniversaryTemplateId` INTEGER      NULL,
    `birthdayVariables`     JSON         NULL,
    `anniversaryVariables`  JSON         NULL,
    `countryCode`           VARCHAR(10)  NOT NULL DEFAULT '+91',
    `countryName`           VARCHAR(100) NOT NULL DEFAULT 'India',
    `enableExternalCron`    BOOLEAN      NOT NULL DEFAULT true,
    `externalCronSecret`    VARCHAR(100) NULL,
    `updatedAt`             DATETIME(3)  NOT NULL,

    PRIMARY KEY (`id`),
    CONSTRAINT `whatsapp_settings_activeVendorId_fkey`
        FOREIGN KEY (`activeVendorId`) REFERENCES `whatsapp_vendors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `whatsapp_settings_birthdayTemplateId_fkey`
        FOREIGN KEY (`birthdayTemplateId`) REFERENCES `whatsapp_templates` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `whatsapp_settings_anniversaryTemplateId_fkey`
        FOREIGN KEY (`anniversaryTemplateId`) REFERENCES `whatsapp_templates` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
-- After importing this schema, run the seed script to create
-- the initial admin user, roles, and permissions:
--   npm run db:seed
-- Or connect and insert manually (see prisma/seed.ts).
-- =============================================================
