CREATE TABLE `erp_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`module` varchar(64) DEFAULT 'general',
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`is_read` boolean NOT NULL DEFAULT false,
	`read_at` bigint,
	`link_url` varchar(512),
	`alert_id` int,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_overrun_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int,
	`alert_type` varchar(64) NOT NULL,
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`title` varchar(255) NOT NULL,
	`message` text,
	`threshold` int,
	`current_value` int,
	`is_acknowledged` boolean NOT NULL DEFAULT false,
	`acknowledged_by` int,
	`acknowledged_at` bigint,
	`related_entity_type` varchar(64),
	`related_entity_id` int,
	`module` varchar(64) DEFAULT 'finance',
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_overrun_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `erp_notifications` ADD CONSTRAINT `erp_notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_overrun_alerts` ADD CONSTRAINT `erp_overrun_alerts_acknowledged_by_users_id_fk` FOREIGN KEY (`acknowledged_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_erp_notif_user` ON `erp_notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_notif_read` ON `erp_notifications` (`is_read`);--> statement-breakpoint
CREATE INDEX `idx_erp_notif_module` ON `erp_notifications` (`module`);--> statement-breakpoint
CREATE INDEX `idx_erp_notif_created` ON `erp_notifications` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_erp_overrun_project` ON `erp_overrun_alerts` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_overrun_type` ON `erp_overrun_alerts` (`alert_type`);--> statement-breakpoint
CREATE INDEX `idx_erp_overrun_priority` ON `erp_overrun_alerts` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_erp_overrun_ack` ON `erp_overrun_alerts` (`is_acknowledged`);