CREATE TABLE `territory_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`territoryId` int NOT NULL,
	`previousStatus` varchar(50) NOT NULL,
	`newStatus` varchar(50) NOT NULL,
	`changedById` int,
	`changedByName` varchar(255),
	`reason` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `territory_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `territory_status_history` ADD CONSTRAINT `territory_status_history_territoryId_village_territories_id_fk` FOREIGN KEY (`territoryId`) REFERENCES `village_territories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `territory_status_history` ADD CONSTRAINT `territory_status_history_changedById_users_id_fk` FOREIGN KEY (`changedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_tsh_territory` ON `territory_status_history` (`territoryId`);--> statement-breakpoint
CREATE INDEX `idx_tsh_date` ON `territory_status_history` (`createdAt`);