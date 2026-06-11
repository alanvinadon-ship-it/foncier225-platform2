CREATE TABLE `urban_acd_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationNumber` varchar(50) NOT NULL,
	`userId` int NOT NULL,
	`parcelId` int,
	`phase` enum('provisional','development','definitive') NOT NULL DEFAULT 'provisional',
	`status` varchar(40) NOT NULL DEFAULT 'acd_draft',
	`applicantFullName` varchar(255) NOT NULL,
	`applicantNationality` varchar(100),
	`applicantIdType` varchar(50),
	`applicantIdNumber` varchar(100),
	`applicantType` enum('personne_physique','personne_morale') NOT NULL DEFAULT 'personne_physique',
	`companyName` varchar(255),
	`companyRccm` varchar(100),
	`lotNumber` varchar(50),
	`ilotNumber` varchar(50),
	`lotissementName` varchar(255),
	`commune` varchar(255),
	`quartier` varchar(255),
	`surfaceM2` int,
	`usagePrevu` enum('habitation','commerce','industriel','mixte') NOT NULL DEFAULT 'habitation',
	`acpNumber` varchar(100),
	`acpSignedAt` bigint,
	`acpExpiryAt` bigint,
	`developmentDeadline` bigint,
	`acdNumber` varchar(100),
	`acdSignedAt` bigint,
	`journalOfficielRef` varchar(100),
	`journalOfficielDate` bigint,
	`notes` text,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `urban_acd_applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `urban_acd_applications_applicationNumber_unique` UNIQUE(`applicationNumber`)
);
--> statement-breakpoint
CREATE TABLE `urban_acd_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appId` int NOT NULL,
	`documentType` varchar(60) NOT NULL,
	`documentCategory` enum('identite','propriete_lot','urbanisme','technique','mise_en_valeur','complementaire') NOT NULL DEFAULT 'complementaire',
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
	CONSTRAINT `urban_acd_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `urban_acd_oppositions` (
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
	CONSTRAINT `urban_acd_oppositions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `urban_acd_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appId` int NOT NULL,
	`stepType` varchar(60) NOT NULL,
	`status` enum('pending','in_progress','completed','skipped') NOT NULL DEFAULT 'pending',
	`startedAt` bigint,
	`completedAt` bigint,
	`completedBy` int,
	`notes` text,
	`metadata` json,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `urban_acd_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `urban_parcel_details` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parcelId` int NOT NULL,
	`lotNumber` varchar(50),
	`ilotNumber` varchar(50),
	`lotissementName` varchar(255),
	`lotissementApprovalRef` varchar(100),
	`lotissementApprovalDate` bigint,
	`communeName` varchar(255),
	`quartierName` varchar(255),
	`planCadastralRef` varchar(100),
	`surfaceM2` int,
	`usageType` enum('habitation','commerce','industriel','mixte','equipement') NOT NULL DEFAULT 'habitation',
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `urban_parcel_details_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_upd_parcel` UNIQUE(`parcelId`)
);
--> statement-breakpoint
ALTER TABLE `parcels` MODIFY COLUMN `zoneCode` varchar(20);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('citizen','agent_terrain','agent_mclu','geometre_urbain','conservateur','bank','admin') NOT NULL DEFAULT 'citizen';--> statement-breakpoint
ALTER TABLE `parcels` ADD `landType` enum('URBAN','RURAL') DEFAULT 'RURAL' NOT NULL;--> statement-breakpoint
ALTER TABLE `urban_acd_applications` ADD CONSTRAINT `urban_acd_applications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `urban_acd_applications` ADD CONSTRAINT `urban_acd_applications_parcelId_parcels_id_fk` FOREIGN KEY (`parcelId`) REFERENCES `parcels`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `urban_acd_documents` ADD CONSTRAINT `urban_acd_documents_appId_urban_acd_applications_id_fk` FOREIGN KEY (`appId`) REFERENCES `urban_acd_applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `urban_acd_documents` ADD CONSTRAINT `urban_acd_documents_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `urban_acd_documents` ADD CONSTRAINT `urban_acd_documents_stepId_urban_acd_steps_id_fk` FOREIGN KEY (`stepId`) REFERENCES `urban_acd_steps`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `urban_acd_documents` ADD CONSTRAINT `urban_acd_documents_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `urban_acd_oppositions` ADD CONSTRAINT `urban_acd_oppositions_appId_urban_acd_applications_id_fk` FOREIGN KEY (`appId`) REFERENCES `urban_acd_applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `urban_acd_oppositions` ADD CONSTRAINT `urban_acd_oppositions_resolvedBy_users_id_fk` FOREIGN KEY (`resolvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `urban_acd_steps` ADD CONSTRAINT `urban_acd_steps_appId_urban_acd_applications_id_fk` FOREIGN KEY (`appId`) REFERENCES `urban_acd_applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `urban_acd_steps` ADD CONSTRAINT `urban_acd_steps_completedBy_users_id_fk` FOREIGN KEY (`completedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `urban_parcel_details` ADD CONSTRAINT `urban_parcel_details_parcelId_parcels_id_fk` FOREIGN KEY (`parcelId`) REFERENCES `parcels`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_uacd_user` ON `urban_acd_applications` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_uacd_status` ON `urban_acd_applications` (`status`);--> statement-breakpoint
CREATE INDEX `idx_uacd_phase` ON `urban_acd_applications` (`phase`);--> statement-breakpoint
CREATE INDEX `idx_uacd_parcel` ON `urban_acd_applications` (`parcelId`);--> statement-breakpoint
CREATE INDEX `idx_uad_application` ON `urban_acd_documents` (`appId`);--> statement-breakpoint
CREATE INDEX `idx_uad_doc_type` ON `urban_acd_documents` (`documentType`);--> statement-breakpoint
CREATE INDEX `idx_uad_category` ON `urban_acd_documents` (`documentCategory`);--> statement-breakpoint
CREATE INDEX `idx_uao_application` ON `urban_acd_oppositions` (`appId`);--> statement-breakpoint
CREATE INDEX `idx_uao_status` ON `urban_acd_oppositions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_uas_application` ON `urban_acd_steps` (`appId`);--> statement-breakpoint
CREATE INDEX `idx_uas_step_type` ON `urban_acd_steps` (`stepType`);