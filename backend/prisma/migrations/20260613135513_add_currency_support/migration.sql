-- AlterTable
ALTER TABLE `expense` ADD COLUMN `convertedAmount` DECIMAL(10, 2) NULL,
    ADD COLUMN `exchangeRate` DECIMAL(12, 6) NULL;

-- AlterTable
ALTER TABLE `settlement` ADD COLUMN `convertedAmount` DECIMAL(10, 2) NULL,
    ADD COLUMN `exchangeRate` DECIMAL(12, 6) NULL;
