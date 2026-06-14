-- AlterTable
ALTER TABLE `Expense` ADD COLUMN `splitType` ENUM('EQUAL', 'EXACT', 'PERCENTAGE') NOT NULL DEFAULT 'EQUAL';

-- AlterTable
ALTER TABLE `ExpenseParticipant` ADD COLUMN `shareAmount` DECIMAL(10, 2) NULL,
    ADD COLUMN `sharePercentage` DECIMAL(5, 2) NULL;

