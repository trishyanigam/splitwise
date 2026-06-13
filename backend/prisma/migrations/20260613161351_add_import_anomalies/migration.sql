-- CreateTable
CREATE TABLE `ImportSession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uploadedById` INTEGER NOT NULL,
    `originalFileName` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'REVIEW_REQUIRED', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `totalRows` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ImportSession_uploadedById_idx`(`uploadedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `importSessionId` INTEGER NOT NULL,
    `rowNumber` INTEGER NOT NULL,
    `rawData` JSON NOT NULL,
    `status` ENUM('PENDING', 'VALID', 'INVALID', 'REVIEW_REQUIRED') NOT NULL DEFAULT 'PENDING',

    INDEX `ImportRecord_importSessionId_idx`(`importSessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportAnomaly` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `importSessionId` INTEGER NOT NULL,
    `importRecordId` INTEGER NOT NULL,
    `anomalyType` VARCHAR(100) NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `description` VARCHAR(500) NOT NULL,
    `suggestedAction` VARCHAR(500) NULL,
    `status` ENUM('OPEN', 'APPROVED', 'REJECTED', 'FIXED') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ImportAnomaly_importSessionId_idx`(`importSessionId`),
    INDEX `ImportAnomaly_importRecordId_idx`(`importRecordId`),
    INDEX `ImportAnomaly_status_idx`(`status`),
    INDEX `ImportAnomaly_severity_idx`(`severity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ImportSession` ADD CONSTRAINT `ImportSession_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportRecord` ADD CONSTRAINT `ImportRecord_importSessionId_fkey` FOREIGN KEY (`importSessionId`) REFERENCES `ImportSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportAnomaly` ADD CONSTRAINT `ImportAnomaly_importSessionId_fkey` FOREIGN KEY (`importSessionId`) REFERENCES `ImportSession`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportAnomaly` ADD CONSTRAINT `ImportAnomaly_importRecordId_fkey` FOREIGN KEY (`importRecordId`) REFERENCES `ImportRecord`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
