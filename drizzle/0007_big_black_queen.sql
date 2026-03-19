CREATE TABLE `generated_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentType` enum('PARCEL_PDF','DOSSIER_PDF','FINAL_CREDIT_ATTESTATION') NOT NULL,
	`reference` varchar(64) NOT NULL,
	`parcelId` int,
	`creditFileId` int,
	`attestationId` int,
	`generatedByUserId` int,
	`verifyTokenId` int,
	`checksumSha256` varchar(64) NOT NULL,
	`fileUrl` varchar(512) NOT NULL,
	`fileKey` varchar(256) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`metadataJson` json,
	CONSTRAINT `generated_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `generated_documents_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
ALTER TABLE `attestations` MODIFY COLUMN `parcelId` int;--> statement-breakpoint
ALTER TABLE `verify_tokens` MODIFY COLUMN `tokenType` enum('insurance','mediation','notary','export','parcel','document') NOT NULL;--> statement-breakpoint
ALTER TABLE `attestations` ADD `creditFileId` int;--> statement-breakpoint
ALTER TABLE `attestations` ADD `decisionId` int;--> statement-breakpoint
ALTER TABLE `attestations` ADD `documentId` int;--> statement-breakpoint
ALTER TABLE `attestations` ADD `documentRef` varchar(64);--> statement-breakpoint
ALTER TABLE `attestations` ADD `finalDecisionType` enum('APPROVED','REJECTED');--> statement-breakpoint
ALTER TABLE `attestations` ADD `verifyCode` varchar(128);--> statement-breakpoint
ALTER TABLE `attestations` ADD `checksumSha256` varchar(64);--> statement-breakpoint
ALTER TABLE `attestations` ADD `fileUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `attestations` ADD `fileKey` varchar(256);--> statement-breakpoint
ALTER TABLE `credit_files` ADD CONSTRAINT `credit_files_publicRef_unique` UNIQUE(`publicRef`);--> statement-breakpoint
ALTER TABLE `generated_documents` ADD CONSTRAINT `generated_documents_parcelId_parcels_id_fk` FOREIGN KEY (`parcelId`) REFERENCES `parcels`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generated_documents` ADD CONSTRAINT `generated_documents_creditFileId_credit_files_id_fk` FOREIGN KEY (`creditFileId`) REFERENCES `credit_files`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generated_documents` ADD CONSTRAINT `generated_documents_attestationId_attestations_id_fk` FOREIGN KEY (`attestationId`) REFERENCES `attestations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generated_documents` ADD CONSTRAINT `generated_documents_generatedByUserId_users_id_fk` FOREIGN KEY (`generatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generated_documents` ADD CONSTRAINT `generated_documents_verifyTokenId_verify_tokens_id_fk` FOREIGN KEY (`verifyTokenId`) REFERENCES `verify_tokens`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_generated_documents_type` ON `generated_documents` (`documentType`);--> statement-breakpoint
CREATE INDEX `idx_generated_documents_parcel` ON `generated_documents` (`parcelId`);--> statement-breakpoint
CREATE INDEX `idx_generated_documents_credit_file` ON `generated_documents` (`creditFileId`);--> statement-breakpoint
CREATE INDEX `idx_generated_documents_verify` ON `generated_documents` (`verifyTokenId`);--> statement-breakpoint
ALTER TABLE `attestations` ADD CONSTRAINT `attestations_parcelId_parcels_id_fk` FOREIGN KEY (`parcelId`) REFERENCES `parcels`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attestations` ADD CONSTRAINT `attestations_creditFileId_credit_files_id_fk` FOREIGN KEY (`creditFileId`) REFERENCES `credit_files`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attestations` ADD CONSTRAINT `attestations_decisionId_credit_decisions_id_fk` FOREIGN KEY (`decisionId`) REFERENCES `credit_decisions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attestations` ADD CONSTRAINT `attestations_documentId_documents_id_fk` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attestations` ADD CONSTRAINT `attestations_tokenId_verify_tokens_id_fk` FOREIGN KEY (`tokenId`) REFERENCES `verify_tokens`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attestations` ADD CONSTRAINT `attestations_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_decisions` ADD CONSTRAINT `credit_decisions_creditFileId_credit_files_id_fk` FOREIGN KEY (`creditFileId`) REFERENCES `credit_files`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_decisions` ADD CONSTRAINT `credit_decisions_decidedByUserId_users_id_fk` FOREIGN KEY (`decidedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_documents` ADD CONSTRAINT `credit_documents_creditFileId_credit_files_id_fk` FOREIGN KEY (`creditFileId`) REFERENCES `credit_files`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_documents` ADD CONSTRAINT `credit_documents_documentId_documents_id_fk` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_documents` ADD CONSTRAINT `credit_documents_validatedById_users_id_fk` FOREIGN KEY (`validatedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_file_participants` ADD CONSTRAINT `credit_file_participants_creditFileId_credit_files_id_fk` FOREIGN KEY (`creditFileId`) REFERENCES `credit_files`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_file_participants` ADD CONSTRAINT `credit_file_participants_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_files` ADD CONSTRAINT `credit_files_initiatorId_users_id_fk` FOREIGN KEY (`initiatorId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_files` ADD CONSTRAINT `credit_files_parcelId_parcels_id_fk` FOREIGN KEY (`parcelId`) REFERENCES `parcels`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_offers` ADD CONSTRAINT `credit_offers_creditFileId_credit_files_id_fk` FOREIGN KEY (`creditFileId`) REFERENCES `credit_files`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_offers` ADD CONSTRAINT `credit_offers_bankId_users_id_fk` FOREIGN KEY (`bankId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_offers` ADD CONSTRAINT `credit_offers_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_requests` ADD CONSTRAINT `credit_requests_creditFileId_credit_files_id_fk` FOREIGN KEY (`creditFileId`) REFERENCES `credit_files`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_requests` ADD CONSTRAINT `credit_requests_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_parcelId_parcels_id_fk` FOREIGN KEY (`parcelId`) REFERENCES `parcels`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parcels` ADD CONSTRAINT `parcels_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parcels` ADD CONSTRAINT `parcels_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verify_tokens` ADD CONSTRAINT `verify_tokens_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_attestations_credit_file` ON `attestations` (`creditFileId`);--> statement-breakpoint
CREATE INDEX `idx_attestations_decision` ON `attestations` (`decisionId`);