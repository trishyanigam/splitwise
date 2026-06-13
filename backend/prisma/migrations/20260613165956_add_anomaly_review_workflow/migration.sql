-- AlterTable
ALTER TABLE `importanomaly` ADD COLUMN `resolutionNotes` VARCHAR(500) NULL,
    ADD COLUMN `reviewDecision` ENUM('PENDING', 'APPROVED', 'REJECTED', 'MANUAL_FIX', 'MERGED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `reviewedAt` DATETIME(3) NULL,
    ADD COLUMN `reviewedById` INTEGER NULL;

-- CreateIndex
CREATE INDEX `ImportAnomaly_reviewDecision_idx` ON `ImportAnomaly`(`reviewDecision`);

-- CreateIndex
CREATE INDEX `ImportAnomaly_reviewedById_idx` ON `ImportAnomaly`(`reviewedById`);

-- AddForeignKey
ALTER TABLE `ImportAnomaly` ADD CONSTRAINT `ImportAnomaly_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
