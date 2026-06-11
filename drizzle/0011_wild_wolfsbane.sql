CREATE TABLE `land_title_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationNumber` varchar(50) NOT NULL,
	`userId` int NOT NULL,
	`phase` enum('certificate','title') NOT NULL DEFAULT 'certificate',
	`status` varchar(30) NOT NULL DEFAULT 'cf_draft',
	`parcelId` int,
	`territoryId` int,
	`applicantFullName` varchar(255) NOT NULL,
	`applicantNationality` varchar(100),
	`applicantIdType` varchar(50),
	`applicantIdNumber` varchar(100),
	`landDescription` text,
	`landLocality` varchar(255),
	`landSubPrefecture` varchar(255),
	`landDepartment` varchar(255),
	`landRegion` varchar(255),
	`landAreaHectares` varchar(32),
	`operatorName` varchar(255),
	`operatorLicense` varchar(100),
	`inquiryCommissioner` varchar(255),
	`publicityStartDate` bigint,
	`publicityEndDate` bigint,
	`certificateNumber` varchar(100),
	`certificateSignedAt` bigint,
	`certificateExpiryAt` bigint,
	`apfrNumber` varchar(100),
	`titleNumber` varchar(100),
	`titleRegisteredAt` bigint,
	`presforEligible` boolean NOT NULL DEFAULT false,
	`notes` text,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `land_title_applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `land_title_applications_applicationNumber_unique` UNIQUE(`applicationNumber`)
);
--> statement-breakpoint
CREATE TABLE `land_title_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appId` int NOT NULL,
	`documentType` varchar(50) NOT NULL,
	`label` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`mimeType` varchar(100),
	`fileSizeBytes` int,
	`sha256` varchar(64),
	`uploadedBy` int NOT NULL,
	`stepId` int,
	`verified` boolean NOT NULL DEFAULT false,
	`verifiedBy` int,
	`verifiedAt` bigint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `land_title_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `land_title_oppositions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appId` int NOT NULL,
	`opponentName` varchar(255) NOT NULL,
	`opponentContact` varchar(255),
	`reason` text NOT NULL,
	`status` enum('pending','confirmed','dismissed') NOT NULL DEFAULT 'pending',
	`resolutionNotes` text,
	`resolvedBy` int,
	`resolvedAt` bigint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `land_title_oppositions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `land_title_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appId` int NOT NULL,
	`stepType` varchar(50) NOT NULL,
	`status` enum('pending','in_progress','completed','skipped') NOT NULL DEFAULT 'pending',
	`startedAt` bigint,
	`completedAt` bigint,
	`completedBy` int,
	`notes` text,
	`metadata` json,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `land_title_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `land_title_applications` ADD CONSTRAINT `land_title_applications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `land_title_applications` ADD CONSTRAINT `land_title_applications_parcelId_parcels_id_fk` FOREIGN KEY (`parcelId`) REFERENCES `parcels`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `land_title_applications` ADD CONSTRAINT `land_title_applications_territoryId_village_territories_id_fk` FOREIGN KEY (`territoryId`) REFERENCES `village_territories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `land_title_documents` ADD CONSTRAINT `land_title_documents_appId_land_title_applications_id_fk` FOREIGN KEY (`appId`) REFERENCES `land_title_applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `land_title_documents` ADD CONSTRAINT `land_title_documents_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `land_title_documents` ADD CONSTRAINT `land_title_documents_stepId_land_title_steps_id_fk` FOREIGN KEY (`stepId`) REFERENCES `land_title_steps`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `land_title_documents` ADD CONSTRAINT `land_title_documents_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `land_title_oppositions` ADD CONSTRAINT `land_title_oppositions_appId_land_title_applications_id_fk` FOREIGN KEY (`appId`) REFERENCES `land_title_applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `land_title_oppositions` ADD CONSTRAINT `land_title_oppositions_resolvedBy_users_id_fk` FOREIGN KEY (`resolvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `land_title_steps` ADD CONSTRAINT `land_title_steps_appId_land_title_applications_id_fk` FOREIGN KEY (`appId`) REFERENCES `land_title_applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `land_title_steps` ADD CONSTRAINT `land_title_steps_completedBy_users_id_fk` FOREIGN KEY (`completedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_lta_user` ON `land_title_applications` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_lta_status` ON `land_title_applications` (`status`);--> statement-breakpoint
CREATE INDEX `idx_lta_phase` ON `land_title_applications` (`phase`);--> statement-breakpoint
CREATE INDEX `idx_lta_parcel` ON `land_title_applications` (`parcelId`);--> statement-breakpoint
CREATE INDEX `idx_lta_territory` ON `land_title_applications` (`territoryId`);--> statement-breakpoint
CREATE INDEX `idx_ltd_application` ON `land_title_documents` (`appId`);--> statement-breakpoint
CREATE INDEX `idx_ltd_doc_type` ON `land_title_documents` (`documentType`);--> statement-breakpoint
CREATE INDEX `idx_ltd_uploaded_by` ON `land_title_documents` (`uploadedBy`);--> statement-breakpoint
CREATE INDEX `idx_lto_application` ON `land_title_oppositions` (`appId`);--> statement-breakpoint
CREATE INDEX `idx_lto_status` ON `land_title_oppositions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_lts_application` ON `land_title_steps` (`appId`);--> statement-breakpoint
CREATE INDEX `idx_lts_step_type` ON `land_title_steps` (`stepType`);