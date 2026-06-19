CREATE TABLE `erp_safety_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`audit_type` varchar(64) NOT NULL DEFAULT 'general',
	`scheduled_at` bigint,
	`completed_at` bigint,
	`auditor_name` varchar(255),
	`findings` text,
	`score` int,
	`status` varchar(32) NOT NULL DEFAULT 'planned',
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_safety_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_safety_corrective_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`incident_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`assigned_to` varchar(255),
	`priority` varchar(32) NOT NULL DEFAULT 'medium',
	`due_date` bigint,
	`completed_at` bigint,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`created_by` int,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_safety_corrective_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_safety_incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`severity` varchar(32) NOT NULL DEFAULT 'medium',
	`status` varchar(32) NOT NULL DEFAULT 'open',
	`location` varchar(255),
	`incident_date` bigint NOT NULL,
	`reported_by` int,
	`assigned_to` int,
	`resolved_at` bigint,
	`resolved_by` int,
	`resolution_notes` text,
	`closed_at` bigint,
	`closed_by` int,
	`closure_notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_safety_incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `erp_safety_audits` ADD CONSTRAINT `erp_safety_audits_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_safety_audits` ADD CONSTRAINT `erp_safety_audits_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_safety_corrective_actions` ADD CONSTRAINT `erp_safety_corrective_actions_incident_id_erp_safety_incidents_id_fk` FOREIGN KEY (`incident_id`) REFERENCES `erp_safety_incidents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_safety_corrective_actions` ADD CONSTRAINT `erp_safety_corrective_actions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_safety_incidents` ADD CONSTRAINT `erp_safety_incidents_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_safety_incidents` ADD CONSTRAINT `erp_safety_incidents_reported_by_users_id_fk` FOREIGN KEY (`reported_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_safety_incidents` ADD CONSTRAINT `erp_safety_incidents_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_safety_incidents` ADD CONSTRAINT `erp_safety_incidents_resolved_by_users_id_fk` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_safety_incidents` ADD CONSTRAINT `erp_safety_incidents_closed_by_users_id_fk` FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_erp_safety_aud_project` ON `erp_safety_audits` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_safety_aud_status` ON `erp_safety_audits` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_safety_aud_type` ON `erp_safety_audits` (`audit_type`);--> statement-breakpoint
CREATE INDEX `idx_erp_safety_ca_incident` ON `erp_safety_corrective_actions` (`incident_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_safety_ca_status` ON `erp_safety_corrective_actions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_safety_inc_project` ON `erp_safety_incidents` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_safety_inc_severity` ON `erp_safety_incidents` (`severity`);--> statement-breakpoint
CREATE INDEX `idx_erp_safety_inc_status` ON `erp_safety_incidents` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_safety_inc_date` ON `erp_safety_incidents` (`incident_date`);