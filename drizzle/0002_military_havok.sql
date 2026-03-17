CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parcelId` int NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`documentType` enum('attestation','titre_foncier','plan_cadastral','pv_bornage','acte_vente','certificat_propriete','rapport_expertise','autre') NOT NULL DEFAULT 'autre',
	`fileUrl` varchar(512),
	`fileKey` varchar(256),
	`mimeType` varchar(64),
	`fileSize` int,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'published',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdById` int,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `parcels` ADD `ownerId` int;