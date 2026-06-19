CREATE TABLE `erp_invoice_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoice_id` int NOT NULL,
	`description` varchar(512) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price` int NOT NULL,
	`amount` int NOT NULL,
	`tax_rate` int NOT NULL DEFAULT 1800,
	`tax_amount` int NOT NULL DEFAULT 0,
	`total_amount` int NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_invoice_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int,
	`vendor_id` int,
	`contractor_id` int,
	`invoice_number` varchar(64) NOT NULL,
	`reference` varchar(128),
	`type` varchar(32) NOT NULL DEFAULT 'standard',
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`issue_date` bigint NOT NULL,
	`due_date` bigint NOT NULL,
	`subtotal` int NOT NULL DEFAULT 0,
	`tax_rate` int NOT NULL DEFAULT 1800,
	`tax_amount` int NOT NULL DEFAULT 0,
	`total_amount` int NOT NULL DEFAULT 0,
	`paid_amount` int NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'XOF',
	`notes` text,
	`attachment_url` text,
	`attachment_key` varchar(512),
	`submitted_at` bigint,
	`submitted_by` int,
	`approved_at` bigint,
	`approved_by` int,
	`rejected_at` bigint,
	`rejected_by` int,
	`rejection_reason` text,
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoice_id` int NOT NULL,
	`amount` int NOT NULL,
	`payment_date` bigint NOT NULL,
	`payment_method` varchar(32) NOT NULL DEFAULT 'virement',
	`reference` varchar(128),
	`notes` text,
	`created_by` int,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `erp_invoice_lines` ADD CONSTRAINT `erp_invoice_lines_invoice_id_erp_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `erp_invoices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_invoices` ADD CONSTRAINT `erp_invoices_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_invoices` ADD CONSTRAINT `erp_invoices_vendor_id_erp_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `erp_vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_invoices` ADD CONSTRAINT `erp_invoices_contractor_id_erp_contractors_id_fk` FOREIGN KEY (`contractor_id`) REFERENCES `erp_contractors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_invoices` ADD CONSTRAINT `erp_invoices_submitted_by_users_id_fk` FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_invoices` ADD CONSTRAINT `erp_invoices_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_invoices` ADD CONSTRAINT `erp_invoices_rejected_by_users_id_fk` FOREIGN KEY (`rejected_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_invoices` ADD CONSTRAINT `erp_invoices_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_payments` ADD CONSTRAINT `erp_payments_invoice_id_erp_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `erp_invoices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_payments` ADD CONSTRAINT `erp_payments_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_erp_invoice_lines_invoice` ON `erp_invoice_lines` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_invoices_project` ON `erp_invoices` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_invoices_vendor` ON `erp_invoices` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_invoices_contractor` ON `erp_invoices` (`contractor_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_invoices_status` ON `erp_invoices` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_invoices_due_date` ON `erp_invoices` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_erp_invoices_number` ON `erp_invoices` (`invoice_number`);--> statement-breakpoint
CREATE INDEX `idx_erp_payments_invoice` ON `erp_payments` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_payments_date` ON `erp_payments` (`payment_date`);