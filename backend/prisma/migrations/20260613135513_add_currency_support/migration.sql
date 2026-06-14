-- AlterTable
ALTER TABLE `Expense` ADD COLUMN `convertedAmount` DECIMAL(10, 2) NULL,
    ADD COLUMN `exchangeRate` DECIMAL(12, 6) NULL;

-- AlterTable
ALTER TABLE `Settlement` ADD COLUMN `convertedAmount` DECIMAL(10, 2) NULL,
    ADD COLUMN `exchangeRate` DECIMAL(12, 6) NULL;

