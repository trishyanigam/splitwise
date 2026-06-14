-- AlterTable
ALTER TABLE `GroupMember` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `ImportResolution` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `anomalyId` INTEGER NOT NULL,
    `resolutionType` ENUM('APPROVED', 'REJECTED', 'MERGED', 'CONVERT_TO_SETTLEMENT', 'CONVERT_TO_REFUND', 'MANUAL_CORRECTION') NOT NULL,
    `originalValue` JSON NULL,
    `resolvedValue` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ImportResolution_anomalyId_idx`(`anomalyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportExecution` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `importSessionId` INTEGER NOT NULL,
    `totalRecords` INTEGER NOT NULL DEFAULT 0,
    `importedRecords` INTEGER NOT NULL DEFAULT 0,
    `skippedRecords` INTEGER NOT NULL DEFAULT 0,
    `failedRecords` INTEGER NOT NULL DEFAULT 0,
    `executionStatus` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    INDEX `ImportExecution_importSessionId_idx`(`importSessionId`),
    INDEX `ImportExecution_executionStatus_idx`(`executionStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ImportResolution` ADD CONSTRAINT `ImportResolution_anomalyId_fkey` FOREIGN KEY (`anomalyId`) REFERENCES `ImportAnomaly`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportExecution` ADD CONSTRAINT `ImportExecution_importSessionId_fkey` FOREIGN KEY (`importSessionId`) REFERENCES `ImportSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
