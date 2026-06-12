CREATE TABLE `agent_availabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`slotDurationMin` int NOT NULL DEFAULT 30,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `agent_availabilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`citizenId` int NOT NULL,
	`agentId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`status` enum('pending','confirmed','cancelled_citizen','cancelled_agent','completed','no_show') NOT NULL DEFAULT 'pending',
	`motif` varchar(255) NOT NULL,
	`dossierType` enum('land_title','urban_acd','credit','general') NOT NULL DEFAULT 'general',
	`dossierId` int,
	`notes` text,
	`cancelReason` text,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agent_availabilities` ADD CONSTRAINT `agent_availabilities_agentId_users_id_fk` FOREIGN KEY (`agentId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_citizenId_users_id_fk` FOREIGN KEY (`citizenId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_agentId_users_id_fk` FOREIGN KEY (`agentId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_aa_agent` ON `agent_availabilities` (`agentId`);--> statement-breakpoint
CREATE INDEX `idx_aa_day` ON `agent_availabilities` (`dayOfWeek`);--> statement-breakpoint
CREATE INDEX `idx_apt_citizen` ON `appointments` (`citizenId`);--> statement-breakpoint
CREATE INDEX `idx_apt_agent` ON `appointments` (`agentId`);--> statement-breakpoint
CREATE INDEX `idx_apt_date` ON `appointments` (`date`);--> statement-breakpoint
CREATE INDEX `idx_apt_status` ON `appointments` (`status`);