CREATE TABLE `erp_accounting_export_formats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`format_code` varchar(32) NOT NULL,
	`format_name` varchar(128) NOT NULL,
	`description` text,
	`delimiter` varchar(4) NOT NULL DEFAULT ';',
	`date_format` varchar(32) NOT NULL DEFAULT 'DD/MM/YYYY',
	`decimal_separator` varchar(2) NOT NULL DEFAULT ',',
	`encoding` varchar(16) NOT NULL DEFAULT 'UTF-8',
	`has_header` int NOT NULL DEFAULT 1,
	`field_mapping_json` text,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_accounting_export_formats_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_accounting_export_formats_format_code_unique` UNIQUE(`format_code`)
);
--> statement-breakpoint
CREATE TABLE `erp_accounting_export_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accounting_export_id` int NOT NULL,
	`pre_entry_id` int,
	`pre_entry_line_id` int,
	`account_code` varchar(16),
	`journal_code` varchar(16),
	`entry_date` bigint,
	`label` varchar(512),
	`debit_amount` int DEFAULT 0,
	`credit_amount` int DEFAULT 0,
	`third_party_code` varchar(64),
	`project_code` varchar(64),
	`tax_code` varchar(16),
	`export_line_json` text,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_accounting_export_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_accounting_exports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`export_number` varchar(32) NOT NULL,
	`format_id` int NOT NULL,
	`date_from` bigint NOT NULL,
	`date_to` bigint NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`file_content` text,
	`file_name` varchar(255),
	`exported_by` int NOT NULL,
	`exported_at` bigint,
	`entries_count` int DEFAULT 0,
	`total_debit` bigint DEFAULT 0,
	`total_credit` bigint DEFAULT 0,
	`notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_accounting_exports_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_accounting_exports_export_number_unique` UNIQUE(`export_number`)
);
--> statement-breakpoint
CREATE TABLE `erp_invoice_po_match_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoice_po_match_id` int NOT NULL,
	`invoice_line_id` int,
	`purchase_order_line_id` int,
	`description` varchar(512),
	`invoice_quantity` int DEFAULT 0,
	`po_quantity` int DEFAULT 0,
	`quantity_variance` int DEFAULT 0,
	`invoice_unit_price` int DEFAULT 0,
	`po_unit_price` int DEFAULT 0,
	`price_variance` int DEFAULT 0,
	`invoice_tax_amount` int DEFAULT 0,
	`po_tax_amount` int DEFAULT 0,
	`tax_variance` int DEFAULT 0,
	`invoice_line_total` int DEFAULT 0,
	`po_line_total` int DEFAULT 0,
	`line_variance` int DEFAULT 0,
	`match_status` varchar(32) DEFAULT 'pending',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_invoice_po_match_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_invoice_po_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoice_id` int NOT NULL,
	`purchase_order_id` int NOT NULL,
	`vendor_id` int,
	`project_id` int,
	`match_status` varchar(32) NOT NULL DEFAULT 'pending',
	`match_score` int DEFAULT 0,
	`price_variance_amount` int DEFAULT 0,
	`quantity_variance` int DEFAULT 0,
	`tax_variance_amount` int DEFAULT 0,
	`total_variance_amount` int DEFAULT 0,
	`variance_percentage` int DEFAULT 0,
	`matched_by` int,
	`matched_at` bigint,
	`reviewed_by` int,
	`reviewed_at` bigint,
	`approval_status` varchar(32) NOT NULL DEFAULT 'pending_review',
	`notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_invoice_po_matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_matching_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`setting_key` varchar(128) NOT NULL,
	`setting_value` varchar(255) NOT NULL,
	`description` varchar(512),
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_matching_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_matching_settings_setting_key_unique` UNIQUE(`setting_key`)
);
--> statement-breakpoint
CREATE TABLE `erp_rfq_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfq_id` int NOT NULL,
	`item_type` varchar(32) NOT NULL DEFAULT 'material',
	`inventory_item_id` int,
	`description` varchar(512) NOT NULL,
	`quantity` int NOT NULL DEFAULT 100,
	`unit` varchar(32) NOT NULL DEFAULT 'unité',
	`estimated_unit_price` int DEFAULT 0,
	`estimated_total` int DEFAULT 0,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_rfq_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_vendor_quote_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendor_quote_id` int NOT NULL,
	`rfq_line_id` int,
	`description` varchar(512) NOT NULL,
	`quantity` int NOT NULL DEFAULT 100,
	`unit` varchar(32) NOT NULL DEFAULT 'unité',
	`unit_price` int NOT NULL DEFAULT 0,
	`discount_rate` int DEFAULT 0,
	`tax_rate` int DEFAULT 1800,
	`tax_amount` int DEFAULT 0,
	`line_total` int NOT NULL DEFAULT 0,
	`delivery_delay_days` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_vendor_quote_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `erp_rfqs` ADD `selection_method` varchar(32) DEFAULT 'lowest_price';--> statement-breakpoint
ALTER TABLE `erp_rfqs` ADD `selected_vendor_id` int;--> statement-breakpoint
ALTER TABLE `erp_rfqs` ADD `selected_quote_id` int;--> statement-breakpoint
ALTER TABLE `erp_rfqs` ADD `approved_by` int;--> statement-breakpoint
ALTER TABLE `erp_rfqs` ADD `approved_at` bigint;--> statement-breakpoint
ALTER TABLE `erp_accounting_export_lines` ADD CONSTRAINT `erp_accounting_export_lines_accounting_export_id_erp_accounting_exports_id_fk` FOREIGN KEY (`accounting_export_id`) REFERENCES `erp_accounting_exports`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_export_lines` ADD CONSTRAINT `erp_accounting_export_lines_pre_entry_id_erp_accounting_pre_entries_id_fk` FOREIGN KEY (`pre_entry_id`) REFERENCES `erp_accounting_pre_entries`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_export_lines` ADD CONSTRAINT `erp_accounting_export_lines_pre_entry_line_id_erp_accounting_pre_entry_lines_id_fk` FOREIGN KEY (`pre_entry_line_id`) REFERENCES `erp_accounting_pre_entry_lines`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_exports` ADD CONSTRAINT `erp_accounting_exports_format_id_erp_accounting_export_formats_id_fk` FOREIGN KEY (`format_id`) REFERENCES `erp_accounting_export_formats`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_exports` ADD CONSTRAINT `erp_accounting_exports_exported_by_users_id_fk` FOREIGN KEY (`exported_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_invoice_po_match_lines` ADD CONSTRAINT `erp_invoice_po_match_lines_invoice_po_match_id_erp_invoice_po_matches_id_fk` FOREIGN KEY (`invoice_po_match_id`) REFERENCES `erp_invoice_po_matches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_invoice_po_match_lines` ADD CONSTRAINT `erp_invoice_po_match_lines_invoice_line_id_erp_invoice_lines_id_fk` FOREIGN KEY (`invoice_line_id`) REFERENCES `erp_invoice_lines`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_invoice_po_match_lines` ADD CONSTRAINT `erp_invoice_po_match_lines_purchase_order_line_id_erp_purchase_order_lines_id_fk` FOREIGN KEY (`purchase_order_line_id`) REFERENCES `erp_purchase_order_lines`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_invoice_po_matches` ADD CONSTRAINT `erp_invoice_po_matches_invoice_id_erp_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `erp_invoices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_invoice_po_matches` ADD CONSTRAINT `erp_invoice_po_matches_purchase_order_id_erp_purchase_orders_id_fk` FOREIGN KEY (`purchase_order_id`) REFERENCES `erp_purchase_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_invoice_po_matches` ADD CONSTRAINT `erp_invoice_po_matches_vendor_id_erp_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `erp_vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_invoice_po_matches` ADD CONSTRAINT `erp_invoice_po_matches_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_invoice_po_matches` ADD CONSTRAINT `erp_invoice_po_matches_matched_by_users_id_fk` FOREIGN KEY (`matched_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_invoice_po_matches` ADD CONSTRAINT `erp_invoice_po_matches_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_rfq_lines` ADD CONSTRAINT `erp_rfq_lines_rfq_id_erp_rfqs_id_fk` FOREIGN KEY (`rfq_id`) REFERENCES `erp_rfqs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_vendor_quote_lines` ADD CONSTRAINT `erp_vendor_quote_lines_vendor_quote_id_erp_vendor_quotes_id_fk` FOREIGN KEY (`vendor_quote_id`) REFERENCES `erp_vendor_quotes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_vendor_quote_lines` ADD CONSTRAINT `erp_vendor_quote_lines_rfq_line_id_erp_rfq_lines_id_fk` FOREIGN KEY (`rfq_line_id`) REFERENCES `erp_rfq_lines`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_erp_acctexportlines_export` ON `erp_accounting_export_lines` (`accounting_export_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_acctexport_status` ON `erp_accounting_exports` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_acctexport_date` ON `erp_accounting_exports` (`date_from`,`date_to`);--> statement-breakpoint
CREATE INDEX `idx_erp_ipmlines_match` ON `erp_invoice_po_match_lines` (`invoice_po_match_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_ipm_invoice` ON `erp_invoice_po_matches` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_ipm_po` ON `erp_invoice_po_matches` (`purchase_order_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_ipm_status` ON `erp_invoice_po_matches` (`match_status`);--> statement-breakpoint
CREATE INDEX `idx_erp_rfqlines_rfq` ON `erp_rfq_lines` (`rfq_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_vqlines_quote` ON `erp_vendor_quote_lines` (`vendor_quote_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_vqlines_rfqline` ON `erp_vendor_quote_lines` (`rfq_line_id`);--> statement-breakpoint
ALTER TABLE `erp_rfqs` ADD CONSTRAINT `erp_rfqs_selected_vendor_id_erp_vendors_id_fk` FOREIGN KEY (`selected_vendor_id`) REFERENCES `erp_vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_rfqs` ADD CONSTRAINT `erp_rfqs_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;