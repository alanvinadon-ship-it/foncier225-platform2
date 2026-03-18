ALTER TABLE `credit_files`
  ADD COLUMN `publicRef` varchar(32) NULL,
  ADD COLUMN `amountRequestedXof` int NULL,
  ADD COLUMN `durationMonths` int NULL,
  ADD COLUMN `lastTransitionAt` timestamp NULL;

ALTER TABLE `credit_files`
  ADD CONSTRAINT `credit_files_publicRef_unique` UNIQUE (`publicRef`);

CREATE INDEX `idx_credit_files_owner` ON `credit_files` (`initiatorId`);
CREATE INDEX `idx_credit_files_status` ON `credit_files` (`status`);
CREATE INDEX `idx_credit_files_parcel` ON `credit_files` (`parcelId`);
CREATE INDEX `idx_cfp_file` ON `credit_file_participants` (`creditFileId`);
CREATE INDEX `idx_cdoc_file` ON `credit_documents` (`creditFileId`);
CREATE INDEX `idx_creq_file` ON `credit_requests` (`creditFileId`);
CREATE INDEX `idx_coffer_file` ON `credit_offers` (`creditFileId`);
CREATE INDEX `idx_cdecision_file` ON `credit_decisions` (`creditFileId`);

ALTER TABLE `credit_file_participants`
  MODIFY COLUMN `userId` int NULL,
  MODIFY COLUMN `role` enum('citizen','co_borrower','bank_agent','agent_terrain') NOT NULL,
  ADD COLUMN `displayName` varchar(128) NULL;

ALTER TABLE `credit_documents`
  ADD COLUMN `documentId` int NULL,
  ADD COLUMN `sha256` varchar(64) NULL,
  ADD COLUMN `rejectedAt` timestamp NULL;

ALTER TABLE `credit_requests`
  CHANGE COLUMN `description` `message` text NOT NULL,
  CHANGE COLUMN `createdById` `createdByUserId` int NULL,
  CHANGE COLUMN `fulfilledAt` `resolvedAt` timestamp NULL;

ALTER TABLE `credit_offers`
  CHANGE COLUMN `monthlyPayment` `monthlyPaymentXof` int NULL,
  ADD COLUMN `apr` varchar(32) NULL,
  ADD COLUMN `conditionsText` text NULL,
  ADD COLUMN `createdByUserId` int NULL;

ALTER TABLE `credit_decisions`
  CHANGE COLUMN `decidedById` `decidedByUserId` int NULL,
  ADD COLUMN `metadataJson` json NULL;

ALTER TABLE `credit_files`
  ADD CONSTRAINT `fk_credit_files_initiator` FOREIGN KEY (`initiatorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_credit_files_parcel` FOREIGN KEY (`parcelId`) REFERENCES `parcels`(`id`) ON DELETE SET NULL;

ALTER TABLE `credit_file_participants`
  ADD CONSTRAINT `fk_credit_file_participants_file` FOREIGN KEY (`creditFileId`) REFERENCES `credit_files`(`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_credit_file_participants_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL;

ALTER TABLE `credit_documents`
  ADD CONSTRAINT `fk_credit_documents_file` FOREIGN KEY (`creditFileId`) REFERENCES `credit_files`(`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_credit_documents_document` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_credit_documents_validator` FOREIGN KEY (`validatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL;

ALTER TABLE `credit_requests`
  ADD CONSTRAINT `fk_credit_requests_file` FOREIGN KEY (`creditFileId`) REFERENCES `credit_files`(`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_credit_requests_creator` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL;

ALTER TABLE `credit_offers`
  ADD CONSTRAINT `fk_credit_offers_file` FOREIGN KEY (`creditFileId`) REFERENCES `credit_files`(`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_credit_offers_bank` FOREIGN KEY (`bankId`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_credit_offers_creator` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL;

ALTER TABLE `credit_decisions`
  ADD CONSTRAINT `fk_credit_decisions_file` FOREIGN KEY (`creditFileId`) REFERENCES `credit_files`(`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_credit_decisions_decider` FOREIGN KEY (`decidedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL;
