CREATE TABLE `audit_events_enhanced` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actor_id` int NOT NULL,
	`actor_role` varchar(64) NOT NULL,
	`action` varchar(255) NOT NULL,
	`target_type` varchar(64) NOT NULL,
	`target_id` int,
	`details` json,
	`motif` text,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_enhanced_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bank_mandates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bank_id` int NOT NULL,
	`citizen_id` int NOT NULL,
	`access_code` varchar(128) NOT NULL,
	`permissions` json NOT NULL DEFAULT ('[]'),
	`expires_at` timestamp NOT NULL,
	`revoked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bank_mandates_id` PRIMARY KEY(`id`),
	CONSTRAINT `bank_mandates_access_code_unique` UNIQUE(`access_code`)
);
--> statement-breakpoint
CREATE TABLE `notary_baskets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notary_id` int NOT NULL,
	`dossier_id` int NOT NULL,
	`dossier_type` varchar(64) NOT NULL,
	`status` varchar(64) NOT NULL DEFAULT 'draft',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notary_baskets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions_matrix` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` varchar(64) NOT NULL,
	`module` varchar(64) NOT NULL,
	`action` varchar(64) NOT NULL,
	`allowed` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `role_permissions_matrix_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_events_enhanced` ADD CONSTRAINT `audit_events_enhanced_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bank_mandates` ADD CONSTRAINT `bank_mandates_bank_id_users_id_fk` FOREIGN KEY (`bank_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bank_mandates` ADD CONSTRAINT `bank_mandates_citizen_id_users_id_fk` FOREIGN KEY (`citizen_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notary_baskets` ADD CONSTRAINT `notary_baskets_notary_id_users_id_fk` FOREIGN KEY (`notary_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_audit_actor` ON `audit_events_enhanced` (`actor_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_action` ON `audit_events_enhanced` (`action`);--> statement-breakpoint
CREATE INDEX `idx_audit_target` ON `audit_events_enhanced` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_created` ON `audit_events_enhanced` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_mandate_bank` ON `bank_mandates` (`bank_id`);--> statement-breakpoint
CREATE INDEX `idx_mandate_citizen` ON `bank_mandates` (`citizen_id`);--> statement-breakpoint
CREATE INDEX `idx_mandate_code` ON `bank_mandates` (`access_code`);--> statement-breakpoint
CREATE INDEX `idx_mandate_expires` ON `bank_mandates` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_basket_notary` ON `notary_baskets` (`notary_id`);--> statement-breakpoint
CREATE INDEX `idx_basket_dossier` ON `notary_baskets` (`dossier_id`);--> statement-breakpoint
CREATE INDEX `idx_role_module_action` ON `role_permissions_matrix` (`role`,`module`,`action`);