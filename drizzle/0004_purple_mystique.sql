ALTER TABLE `credit_file_participants` MODIFY COLUMN `userId` int;--> statement-breakpoint
ALTER TABLE `credit_file_participants` MODIFY COLUMN `role` enum('citizen','co_borrower','bank_agent','agent_terrain') NOT NULL;--> statement-breakpoint
ALTER TABLE `credit_decisions` ADD `decidedByUserId` int;--> statement-breakpoint
ALTER TABLE `credit_decisions` ADD `metadataJson` json;--> statement-breakpoint
ALTER TABLE `credit_documents` ADD `documentId` int;--> statement-breakpoint
ALTER TABLE `credit_documents` ADD `sha256` varchar(64);--> statement-breakpoint
ALTER TABLE `credit_documents` ADD `rejectedAt` timestamp;--> statement-breakpoint
ALTER TABLE `credit_file_participants` ADD `displayName` varchar(128);--> statement-breakpoint
ALTER TABLE `credit_files` ADD `publicRef` varchar(32);--> statement-breakpoint
ALTER TABLE `credit_files` ADD `amountRequestedXof` int;--> statement-breakpoint
ALTER TABLE `credit_files` ADD `durationMonths` int;--> statement-breakpoint
ALTER TABLE `credit_files` ADD `lastTransitionAt` timestamp;--> statement-breakpoint
ALTER TABLE `credit_offers` ADD `apr` varchar(32);--> statement-breakpoint
ALTER TABLE `credit_offers` ADD `monthlyPaymentXof` int;--> statement-breakpoint
ALTER TABLE `credit_offers` ADD `conditionsText` text;--> statement-breakpoint
ALTER TABLE `credit_offers` ADD `createdByUserId` int;--> statement-breakpoint
ALTER TABLE `credit_requests` ADD `message` text NOT NULL;--> statement-breakpoint
ALTER TABLE `credit_requests` ADD `createdByUserId` int;--> statement-breakpoint
ALTER TABLE `credit_requests` ADD `resolvedAt` timestamp;--> statement-breakpoint
CREATE INDEX `idx_cdecision_file` ON `credit_decisions` (`creditFileId`);--> statement-breakpoint
CREATE INDEX `idx_cdoc_file` ON `credit_documents` (`creditFileId`);--> statement-breakpoint
CREATE INDEX `idx_cfp_file` ON `credit_file_participants` (`creditFileId`);--> statement-breakpoint
CREATE INDEX `idx_credit_files_owner` ON `credit_files` (`initiatorId`);--> statement-breakpoint
CREATE INDEX `idx_credit_files_status` ON `credit_files` (`status`);--> statement-breakpoint
CREATE INDEX `idx_credit_files_parcel` ON `credit_files` (`parcelId`);--> statement-breakpoint
CREATE INDEX `idx_coffer_file` ON `credit_offers` (`creditFileId`);--> statement-breakpoint
CREATE INDEX `idx_creq_file` ON `credit_requests` (`creditFileId`);--> statement-breakpoint
ALTER TABLE `credit_decisions` DROP COLUMN `decidedById`;--> statement-breakpoint
ALTER TABLE `credit_offers` DROP COLUMN `monthlyPayment`;--> statement-breakpoint
ALTER TABLE `credit_requests` DROP COLUMN `description`;--> statement-breakpoint
ALTER TABLE `credit_requests` DROP COLUMN `fulfilledAt`;--> statement-breakpoint
ALTER TABLE `credit_requests` DROP COLUMN `createdById`;