CREATE TABLE `erp_certifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entity_type` varchar(32) NOT NULL,
	`entity_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`cert_number` varchar(128),
	`issued_by` varchar(255),
	`issued_at` bigint,
	`expires_at` bigint,
	`renewed_at` bigint,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`alert_days_before` int DEFAULT 30,
	`document_url` varchar(512),
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_certifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_contractors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`specialty` varchar(64) NOT NULL DEFAULT 'general',
	`status` varchar(32) NOT NULL DEFAULT 'pending_approval',
	`email` varchar(320),
	`phone` varchar(32),
	`address` text,
	`license_number` varchar(128),
	`insurance_expiry` bigint,
	`rating` int,
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_contractors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractor_id` int,
	`project_id` int,
	`title` varchar(255) NOT NULL,
	`reference` varchar(128),
	`amount` bigint,
	`start_date` bigint,
	`end_date` bigint,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_project_contractors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`contractor_id` int NOT NULL,
	`role` varchar(128),
	`start_date` bigint,
	`end_date` bigint,
	`assigned_by` int,
	`assigned_at` bigint NOT NULL,
	`released_at` bigint,
	CONSTRAINT `erp_project_contractors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_vendor_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendor_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(128),
	`email` varchar(320),
	`phone` varchar(32),
	`is_primary` boolean NOT NULL DEFAULT false,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_vendor_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(64) NOT NULL DEFAULT 'general',
	`status` varchar(32) NOT NULL DEFAULT 'pending_approval',
	`email` varchar(320),
	`phone` varchar(32),
	`address` text,
	`website` varchar(512),
	`tax_id` varchar(64),
	`rating` int,
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_vendors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `erp_certifications` ADD CONSTRAINT `erp_certifications_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_contractors` ADD CONSTRAINT `erp_contractors_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_contracts` ADD CONSTRAINT `erp_contracts_contractor_id_erp_contractors_id_fk` FOREIGN KEY (`contractor_id`) REFERENCES `erp_contractors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_contracts` ADD CONSTRAINT `erp_contracts_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_contracts` ADD CONSTRAINT `erp_contracts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_project_contractors` ADD CONSTRAINT `erp_project_contractors_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_project_contractors` ADD CONSTRAINT `erp_project_contractors_contractor_id_erp_contractors_id_fk` FOREIGN KEY (`contractor_id`) REFERENCES `erp_contractors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_project_contractors` ADD CONSTRAINT `erp_project_contractors_assigned_by_users_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_vendor_contacts` ADD CONSTRAINT `erp_vendor_contacts_vendor_id_erp_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `erp_vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_vendors` ADD CONSTRAINT `erp_vendors_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_erp_certs_entity` ON `erp_certifications` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_certs_status` ON `erp_certifications` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_certs_expires` ON `erp_certifications` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_erp_contractors_status` ON `erp_contractors` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_contractors_specialty` ON `erp_contractors` (`specialty`);--> statement-breakpoint
CREATE INDEX `idx_erp_contractors_name` ON `erp_contractors` (`name`);--> statement-breakpoint
CREATE INDEX `idx_erp_contracts_contractor` ON `erp_contracts` (`contractor_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_contracts_project` ON `erp_contracts` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_contracts_status` ON `erp_contracts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_proj_contr_project` ON `erp_project_contractors` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_proj_contr_contractor` ON `erp_project_contractors` (`contractor_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_vendor_contacts_vendor` ON `erp_vendor_contacts` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_vendors_status` ON `erp_vendors` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_vendors_category` ON `erp_vendors` (`category`);--> statement-breakpoint
CREATE INDEX `idx_erp_vendors_name` ON `erp_vendors` (`name`);