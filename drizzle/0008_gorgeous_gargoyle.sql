CREATE TABLE `territory_boundary_points` (
	`id` int AUTO_INCREMENT NOT NULL,
	`territoryId` int NOT NULL,
	`pointNumber` int NOT NULL,
	`latitude` varchar(20) NOT NULL,
	`longitude` varchar(20) NOT NULL,
	`landmark` varchar(255),
	`source` enum('manual','gpx_import','csv_import') NOT NULL DEFAULT 'manual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `territory_boundary_points_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `territory_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`territoryId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`documentType` enum('pv_delimitation','carte_territoire','autorisation_prefectorale','attestation_chef','photo_borne','autre') NOT NULL DEFAULT 'autre',
	`fileUrl` varchar(512),
	`fileKey` varchar(256),
	`mimeType` varchar(64),
	`fileSize` int,
	`uploadedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `territory_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `village_territories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`chiefName` varchar(128) NOT NULL,
	`chiefPhone` varchar(32),
	`estimatedAreaHa` int,
	`calculatedAreaHa` varchar(32),
	`calculatedPerimeterKm` varchar(32),
	`status` enum('draft','collecting','submitted','validated_chief','official','synced') NOT NULL DEFAULT 'draft',
	`siforCode` varchar(64),
	`chiefSignedAt` timestamp,
	`chiefComments` text,
	`officializedAt` timestamp,
	`syncedAt` timestamp,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `village_territories_id` PRIMARY KEY(`id`),
	CONSTRAINT `village_territories_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `territory_boundary_points` ADD CONSTRAINT `territory_boundary_points_territoryId_village_territories_id_fk` FOREIGN KEY (`territoryId`) REFERENCES `village_territories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `territory_documents` ADD CONSTRAINT `territory_documents_territoryId_village_territories_id_fk` FOREIGN KEY (`territoryId`) REFERENCES `village_territories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `territory_documents` ADD CONSTRAINT `territory_documents_uploadedById_users_id_fk` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `village_territories` ADD CONSTRAINT `village_territories_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_tbp_territory` ON `territory_boundary_points` (`territoryId`);--> statement-breakpoint
CREATE INDEX `idx_tbp_order` ON `territory_boundary_points` (`territoryId`,`pointNumber`);--> statement-breakpoint
CREATE INDEX `idx_tdoc_territory` ON `territory_documents` (`territoryId`);--> statement-breakpoint
CREATE INDEX `idx_vt_status` ON `village_territories` (`status`);--> statement-breakpoint
CREATE INDEX `idx_vt_created_by` ON `village_territories` (`createdById`);