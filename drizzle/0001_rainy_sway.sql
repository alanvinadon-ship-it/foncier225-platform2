CREATE TABLE `attestations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parcelId` int NOT NULL,
	`attestationType` enum('insurance','mediation_pv','notary_act','terrain_report','credit') NOT NULL,
	`tokenId` int,
	`status` enum('draft','issued','revoked') NOT NULL DEFAULT 'draft',
	`issuedAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdById` int,
	CONSTRAINT `attestations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int,
	`actorRole` varchar(32),
	`action` varchar(128) NOT NULL,
	`targetType` varchar(64),
	`targetId` int,
	`details` json,
	`ipHash` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parcel_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parcelId` int NOT NULL,
	`eventType` enum('creation','opposition','mediation','gel','validation','notary','insurance','terrain_visit','document_added','status_change') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`monthYear` varchar(16),
	`isPublic` boolean NOT NULL DEFAULT true,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdById` int,
	CONSTRAINT `parcel_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parcels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicToken` varchar(64) NOT NULL,
	`reference` varchar(64) NOT NULL,
	`zoneCode` varchar(32) NOT NULL,
	`statusPublic` enum('dossier_en_cours','en_opposition','gele','mediation_en_cours','acte_notarie_enregistre','valide') NOT NULL DEFAULT 'dossier_en_cours',
	`surfaceApprox` varchar(32),
	`localisation` varchar(255),
	`kpiFlagsJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdById` int,
	CONSTRAINT `parcels_id` PRIMARY KEY(`id`),
	CONSTRAINT `parcels_publicToken_unique` UNIQUE(`publicToken`),
	CONSTRAINT `parcels_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `verify_rate_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ipHash` varchar(64) NOT NULL,
	`hitCount` int NOT NULL DEFAULT 0,
	`windowStart` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verify_rate_limits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verify_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`tokenType` enum('insurance','mediation','notary','export','parcel') NOT NULL,
	`targetId` int NOT NULL,
	`status` enum('active','rotated','revoked') NOT NULL DEFAULT 'active',
	`issuedMonth` varchar(16),
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdById` int,
	CONSTRAINT `verify_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `verify_tokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('citizen','agent_terrain','bank','admin') NOT NULL DEFAULT 'citizen';--> statement-breakpoint
ALTER TABLE `users` ADD `zoneCodes` json;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;