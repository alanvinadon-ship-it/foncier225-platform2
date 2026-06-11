CREATE TABLE `system_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configKey` varchar(100) NOT NULL,
	`configValue` text NOT NULL,
	`updatedAt` bigint NOT NULL,
	`updatedBy` int,
	CONSTRAINT `system_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_config_key` UNIQUE(`configKey`)
);
--> statement-breakpoint
ALTER TABLE `system_config` ADD CONSTRAINT `system_config_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;