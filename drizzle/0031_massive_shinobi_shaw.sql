CREATE TABLE `erp_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`module` varchar(64) NOT NULL,
	`action` varchar(64) NOT NULL,
	`display_name` varchar(128) NOT NULL,
	`description` text,
	CONSTRAINT `erp_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_erp_perm_module_action` UNIQUE(`module`,`action`)
);
--> statement-breakpoint
CREATE TABLE `erp_role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role_id` int NOT NULL,
	`permission_id` int NOT NULL,
	CONSTRAINT `erp_role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_erp_role_perm` UNIQUE(`role_id`,`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `erp_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`display_name` varchar(128) NOT NULL,
	`description` text,
	`is_system` boolean NOT NULL DEFAULT false,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `erp_user_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`role_id` int NOT NULL,
	`assigned_at` bigint NOT NULL,
	`assigned_by` int,
	CONSTRAINT `erp_user_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_erp_user_role` UNIQUE(`user_id`,`role_id`)
);
--> statement-breakpoint
ALTER TABLE `erp_role_permissions` ADD CONSTRAINT `erp_role_permissions_role_id_erp_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `erp_roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_role_permissions` ADD CONSTRAINT `erp_role_permissions_permission_id_erp_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `erp_permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_user_roles` ADD CONSTRAINT `erp_user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_user_roles` ADD CONSTRAINT `erp_user_roles_role_id_erp_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `erp_roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_user_roles` ADD CONSTRAINT `erp_user_roles_assigned_by_users_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_erp_perm_module` ON `erp_permissions` (`module`);--> statement-breakpoint
CREATE INDEX `idx_erp_rp_role` ON `erp_role_permissions` (`role_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_rp_perm` ON `erp_role_permissions` (`permission_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_ur_user` ON `erp_user_roles` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_ur_role` ON `erp_user_roles` (`role_id`);