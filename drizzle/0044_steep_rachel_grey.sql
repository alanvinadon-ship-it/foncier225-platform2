CREATE TABLE `erp_accounting_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`account_code` varchar(16) NOT NULL,
	`account_name` varchar(255) NOT NULL,
	`account_type` varchar(32) NOT NULL,
	`parent_id` int,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_accounting_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_accounting_accounts_account_code_unique` UNIQUE(`account_code`)
);
--> statement-breakpoint
CREATE TABLE `erp_accounting_pre_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_type` varchar(32) NOT NULL,
	`source_id` int NOT NULL,
	`entry_date` bigint NOT NULL,
	`journal_code` varchar(16) NOT NULL,
	`description` varchar(500),
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`total_debit` bigint NOT NULL DEFAULT 0,
	`total_credit` bigint NOT NULL DEFAULT 0,
	`created_by` int,
	`validated_by` int,
	`validated_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_accounting_pre_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_accounting_pre_entry_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pre_entry_id` int NOT NULL,
	`accounting_account_id` int NOT NULL,
	`debit_amount` bigint NOT NULL DEFAULT 0,
	`credit_amount` bigint NOT NULL DEFAULT 0,
	`label` varchar(255),
	`project_id` int,
	`vendor_id` int,
	`tax_code_id` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_accounting_pre_entry_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_equipment_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`equipment_family` varchar(64),
	`is_capitalized` boolean NOT NULL DEFAULT true,
	`depreciation_enabled` boolean NOT NULL DEFAULT false,
	`default_accounting_account_id` int,
	`default_tax_code_id` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_equipment_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_equipment_types_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_expense_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`parent_id` int,
	`default_accounting_account_id` int,
	`default_tax_code_id` int,
	`requires_receipt` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_expense_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_expense_categories_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_expense_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expense_id` int NOT NULL,
	`description` varchar(500) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price` bigint NOT NULL,
	`tax_code_id` int,
	`tax_rate` int DEFAULT 0,
	`tax_amount` bigint DEFAULT 0,
	`line_total` bigint NOT NULL,
	`project_id` int,
	`budget_line_id` int,
	`accounting_account_id` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_expense_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expense_number` varchar(32) NOT NULL,
	`project_id` int,
	`expense_category_id` int,
	`vendor_id` int,
	`employee_id` int,
	`expense_date` bigint NOT NULL,
	`description` text,
	`subtotal_amount` bigint NOT NULL DEFAULT 0,
	`tax_amount` bigint NOT NULL DEFAULT 0,
	`total_amount` bigint NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'XOF',
	`payment_method` varchar(32),
	`payment_account_id` int,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`is_reimbursable` boolean NOT NULL DEFAULT false,
	`reimbursed_at` bigint,
	`document_url` text,
	`document_key` varchar(512),
	`budget_line_id` int,
	`accounting_account_id` int,
	`tax_code_id` int,
	`created_by` int NOT NULL,
	`approved_by` int,
	`approved_at` bigint,
	`rejected_by` int,
	`rejected_at` bigint,
	`rejection_reason` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_expenses_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_expenses_expense_number_unique` UNIQUE(`expense_number`)
);
--> statement-breakpoint
CREATE TABLE `erp_goods_receipt_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`goods_receipt_id` int NOT NULL,
	`purchase_order_line_id` int,
	`inventory_item_id` int,
	`equipment_id` int,
	`description` varchar(500),
	`quantity_received` int NOT NULL,
	`quantity_rejected` int NOT NULL DEFAULT 0,
	`unit` varchar(32),
	`condition_status` varchar(32) DEFAULT 'good',
	`stock_location_id` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_goods_receipt_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_goods_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receipt_number` varchar(32) NOT NULL,
	`purchase_order_id` int NOT NULL,
	`vendor_id` int NOT NULL,
	`project_id` int,
	`receipt_date` bigint NOT NULL,
	`received_by` int NOT NULL,
	`delivery_note_number` varchar(64),
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`notes` text,
	`document_url` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_goods_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_goods_receipts_receipt_number_unique` UNIQUE(`receipt_number`)
);
--> statement-breakpoint
CREATE TABLE `erp_material_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`unit` varchar(32) NOT NULL,
	`is_stockable` boolean NOT NULL DEFAULT true,
	`default_supplier_id` int,
	`default_tax_code_id` int,
	`default_accounting_account_id` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_material_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_material_types_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_payment_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`account_type` varchar(32) NOT NULL,
	`bank_name` varchar(128),
	`account_number_masked` varchar(64),
	`currency` varchar(3) NOT NULL DEFAULT 'XOF',
	`accounting_account_id` int,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_payment_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_purchase_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`purchase_type` varchar(32) NOT NULL,
	`is_stockable` boolean NOT NULL DEFAULT false,
	`is_equipment` boolean NOT NULL DEFAULT false,
	`is_service` boolean NOT NULL DEFAULT false,
	`default_budget_category_id` int,
	`default_accounting_account_id` int,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_purchase_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_purchase_categories_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_purchase_order_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchase_order_id` int NOT NULL,
	`item_type` varchar(32) NOT NULL,
	`inventory_item_id` int,
	`equipment_type_id` int,
	`material_type_id` int,
	`description` varchar(500) NOT NULL,
	`quantity_ordered` int NOT NULL,
	`quantity_received` int NOT NULL DEFAULT 0,
	`unit` varchar(32),
	`unit_price` bigint NOT NULL,
	`discount_rate` int DEFAULT 0,
	`tax_code_id` int,
	`tax_rate` int DEFAULT 0,
	`tax_amount` bigint DEFAULT 0,
	`line_total` bigint NOT NULL,
	`budget_line_id` int,
	`accounting_account_id` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_purchase_order_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`po_number` varchar(32) NOT NULL,
	`purchase_request_id` int,
	`rfq_id` int,
	`vendor_quote_id` int,
	`vendor_id` int NOT NULL,
	`project_id` int,
	`order_date` bigint NOT NULL,
	`expected_delivery_date` bigint,
	`subtotal_amount` bigint NOT NULL DEFAULT 0,
	`discount_amount` bigint DEFAULT 0,
	`tax_amount` bigint NOT NULL DEFAULT 0,
	`total_amount` bigint NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'XOF',
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`approved_by` int,
	`approved_at` bigint,
	`sent_to_vendor_at` bigint,
	`created_by` int NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_purchase_orders_po_number_unique` UNIQUE(`po_number`)
);
--> statement-breakpoint
CREATE TABLE `erp_purchase_request_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchase_request_id` int NOT NULL,
	`item_type` varchar(32) NOT NULL,
	`inventory_item_id` int,
	`equipment_type_id` int,
	`material_type_id` int,
	`description` varchar(500) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit` varchar(32),
	`estimated_unit_price` bigint DEFAULT 0,
	`estimated_total` bigint DEFAULT 0,
	`budget_line_id` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_purchase_request_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_purchase_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`request_number` varchar(32) NOT NULL,
	`project_id` int,
	`requested_by` int NOT NULL,
	`department` varchar(64),
	`purchase_category_id` int,
	`request_date` bigint NOT NULL,
	`needed_date` bigint,
	`priority` varchar(16) NOT NULL DEFAULT 'normal',
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`justification` text,
	`estimated_amount` bigint DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'XOF',
	`approved_by` int,
	`approved_at` bigint,
	`rejected_by` int,
	`rejected_at` bigint,
	`rejection_reason` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_purchase_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_purchase_requests_request_number_unique` UNIQUE(`request_number`)
);
--> statement-breakpoint
CREATE TABLE `erp_rfq_vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfq_id` int NOT NULL,
	`vendor_id` int NOT NULL,
	`sent_at` bigint,
	`response_received_at` bigint,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_rfq_vendors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_rfqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfq_number` varchar(32) NOT NULL,
	`purchase_request_id` int,
	`project_id` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`issue_date` bigint NOT NULL,
	`response_deadline` bigint,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`created_by` int NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_rfqs_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_rfqs_rfq_number_unique` UNIQUE(`rfq_number`)
);
--> statement-breakpoint
CREATE TABLE `erp_tax_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`tax_type` varchar(32) NOT NULL,
	`rate` int NOT NULL DEFAULT 0,
	`is_recoverable` boolean NOT NULL DEFAULT false,
	`is_withholding` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`effective_from` bigint,
	`effective_to` bigint,
	`accounting_account_id` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_tax_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_tax_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_vendor_quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfq_id` int NOT NULL,
	`vendor_id` int NOT NULL,
	`quote_number` varchar(64),
	`quote_date` bigint NOT NULL,
	`valid_until` bigint,
	`subtotal_amount` bigint NOT NULL DEFAULT 0,
	`tax_amount` bigint NOT NULL DEFAULT 0,
	`total_amount` bigint NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'XOF',
	`delivery_delay_days` int,
	`payment_terms` varchar(128),
	`document_url` text,
	`status` varchar(32) NOT NULL DEFAULT 'received',
	`evaluation_score` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_vendor_quotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `erp_accounting_pre_entries` ADD CONSTRAINT `erp_accounting_pre_entries_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_pre_entries` ADD CONSTRAINT `erp_accounting_pre_entries_validated_by_users_id_fk` FOREIGN KEY (`validated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_pre_entry_lines` ADD CONSTRAINT `erp_apel_pre_entry_id_erp_ape_id_fk` FOREIGN KEY (`pre_entry_id`) REFERENCES `erp_accounting_pre_entries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_pre_entry_lines` ADD CONSTRAINT `erp_apel_accounting_account_id_erp_acct_id_fk` FOREIGN KEY (`accounting_account_id`) REFERENCES `erp_accounting_accounts`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_pre_entry_lines` ADD CONSTRAINT `erp_accounting_pre_entry_lines_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_pre_entry_lines` ADD CONSTRAINT `erp_accounting_pre_entry_lines_vendor_id_erp_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `erp_vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_accounting_pre_entry_lines` ADD CONSTRAINT `erp_accounting_pre_entry_lines_tax_code_id_erp_tax_codes_id_fk` FOREIGN KEY (`tax_code_id`) REFERENCES `erp_tax_codes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_equipment_types` ADD CONSTRAINT `erp_eqt_default_accounting_account_id_erp_acct_id_fk` FOREIGN KEY (`default_accounting_account_id`) REFERENCES `erp_accounting_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_equipment_types` ADD CONSTRAINT `erp_equipment_types_default_tax_code_id_erp_tax_codes_id_fk` FOREIGN KEY (`default_tax_code_id`) REFERENCES `erp_tax_codes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expense_categories` ADD CONSTRAINT `erp_ecat_default_accounting_account_id_erp_acct_id_fk` FOREIGN KEY (`default_accounting_account_id`) REFERENCES `erp_accounting_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expense_categories` ADD CONSTRAINT `erp_expense_categories_default_tax_code_id_erp_tax_codes_id_fk` FOREIGN KEY (`default_tax_code_id`) REFERENCES `erp_tax_codes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expense_lines` ADD CONSTRAINT `erp_expense_lines_expense_id_erp_expenses_id_fk` FOREIGN KEY (`expense_id`) REFERENCES `erp_expenses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expense_lines` ADD CONSTRAINT `erp_expense_lines_tax_code_id_erp_tax_codes_id_fk` FOREIGN KEY (`tax_code_id`) REFERENCES `erp_tax_codes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expense_lines` ADD CONSTRAINT `erp_expense_lines_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expense_lines` ADD CONSTRAINT `erp_expense_lines_budget_line_id_erp_budget_lines_id_fk` FOREIGN KEY (`budget_line_id`) REFERENCES `erp_budget_lines`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expense_lines` ADD CONSTRAINT `erp_el_accounting_account_id_erp_acct_id_fk` FOREIGN KEY (`accounting_account_id`) REFERENCES `erp_accounting_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expenses` ADD CONSTRAINT `erp_expenses_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expenses` ADD CONSTRAINT `erp_expenses_expense_category_id_erp_expense_categories_id_fk` FOREIGN KEY (`expense_category_id`) REFERENCES `erp_expense_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expenses` ADD CONSTRAINT `erp_expenses_vendor_id_erp_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `erp_vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expenses` ADD CONSTRAINT `erp_expenses_employee_id_users_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expenses` ADD CONSTRAINT `erp_expenses_payment_account_id_erp_payment_accounts_id_fk` FOREIGN KEY (`payment_account_id`) REFERENCES `erp_payment_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expenses` ADD CONSTRAINT `erp_expenses_budget_line_id_erp_budget_lines_id_fk` FOREIGN KEY (`budget_line_id`) REFERENCES `erp_budget_lines`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expenses` ADD CONSTRAINT `erp_expenses_accounting_account_id_erp_accounting_accounts_id_fk` FOREIGN KEY (`accounting_account_id`) REFERENCES `erp_accounting_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expenses` ADD CONSTRAINT `erp_expenses_tax_code_id_erp_tax_codes_id_fk` FOREIGN KEY (`tax_code_id`) REFERENCES `erp_tax_codes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expenses` ADD CONSTRAINT `erp_expenses_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expenses` ADD CONSTRAINT `erp_expenses_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_expenses` ADD CONSTRAINT `erp_expenses_rejected_by_users_id_fk` FOREIGN KEY (`rejected_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_goods_receipt_lines` ADD CONSTRAINT `erp_grl_goods_receipt_id_erp_gr_id_fk` FOREIGN KEY (`goods_receipt_id`) REFERENCES `erp_goods_receipts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_goods_receipt_lines` ADD CONSTRAINT `erp_grl_purchase_order_line_id_erp_pol_id_fk` FOREIGN KEY (`purchase_order_line_id`) REFERENCES `erp_purchase_order_lines`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_goods_receipt_lines` ADD CONSTRAINT `erp_grl_inventory_item_id_erp_inv_id_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `erp_inventory_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_goods_receipt_lines` ADD CONSTRAINT `erp_goods_receipt_lines_equipment_id_erp_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `erp_equipment`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_goods_receipt_lines` ADD CONSTRAINT `erp_grl_stock_location_id_erp_sloc_id_fk` FOREIGN KEY (`stock_location_id`) REFERENCES `erp_stock_locations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_goods_receipts` ADD CONSTRAINT `erp_goods_receipts_purchase_order_id_erp_purchase_orders_id_fk` FOREIGN KEY (`purchase_order_id`) REFERENCES `erp_purchase_orders`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_goods_receipts` ADD CONSTRAINT `erp_goods_receipts_vendor_id_erp_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `erp_vendors`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_goods_receipts` ADD CONSTRAINT `erp_goods_receipts_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_goods_receipts` ADD CONSTRAINT `erp_goods_receipts_received_by_users_id_fk` FOREIGN KEY (`received_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_material_types` ADD CONSTRAINT `erp_material_types_default_supplier_id_erp_vendors_id_fk` FOREIGN KEY (`default_supplier_id`) REFERENCES `erp_vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_material_types` ADD CONSTRAINT `erp_material_types_default_tax_code_id_erp_tax_codes_id_fk` FOREIGN KEY (`default_tax_code_id`) REFERENCES `erp_tax_codes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_material_types` ADD CONSTRAINT `erp_mt_default_accounting_account_id_erp_acct_id_fk` FOREIGN KEY (`default_accounting_account_id`) REFERENCES `erp_accounting_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_payment_accounts` ADD CONSTRAINT `erp_payacct_accounting_account_id_erp_acct_id_fk` FOREIGN KEY (`accounting_account_id`) REFERENCES `erp_accounting_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_categories` ADD CONSTRAINT `erp_pcat_default_accounting_account_id_erp_acct_id_fk` FOREIGN KEY (`default_accounting_account_id`) REFERENCES `erp_accounting_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_order_lines` ADD CONSTRAINT `erp_pol_purchase_order_id_erp_po_id_fk` FOREIGN KEY (`purchase_order_id`) REFERENCES `erp_purchase_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_order_lines` ADD CONSTRAINT `erp_pol_inventory_item_id_erp_inv_id_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `erp_inventory_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_order_lines` ADD CONSTRAINT `erp_pol_equipment_type_id_erp_eqt_id_fk` FOREIGN KEY (`equipment_type_id`) REFERENCES `erp_equipment_types`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_order_lines` ADD CONSTRAINT `erp_pol_material_type_id_erp_mt_id_fk` FOREIGN KEY (`material_type_id`) REFERENCES `erp_material_types`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_order_lines` ADD CONSTRAINT `erp_purchase_order_lines_tax_code_id_erp_tax_codes_id_fk` FOREIGN KEY (`tax_code_id`) REFERENCES `erp_tax_codes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_order_lines` ADD CONSTRAINT `erp_purchase_order_lines_budget_line_id_erp_budget_lines_id_fk` FOREIGN KEY (`budget_line_id`) REFERENCES `erp_budget_lines`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_order_lines` ADD CONSTRAINT `erp_pol_accounting_account_id_erp_acct_id_fk` FOREIGN KEY (`accounting_account_id`) REFERENCES `erp_accounting_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_orders` ADD CONSTRAINT `erp_po_purchase_request_id_erp_pr_id_fk` FOREIGN KEY (`purchase_request_id`) REFERENCES `erp_purchase_requests`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_orders` ADD CONSTRAINT `erp_purchase_orders_rfq_id_erp_rfqs_id_fk` FOREIGN KEY (`rfq_id`) REFERENCES `erp_rfqs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_orders` ADD CONSTRAINT `erp_purchase_orders_vendor_quote_id_erp_vendor_quotes_id_fk` FOREIGN KEY (`vendor_quote_id`) REFERENCES `erp_vendor_quotes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_orders` ADD CONSTRAINT `erp_purchase_orders_vendor_id_erp_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `erp_vendors`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_orders` ADD CONSTRAINT `erp_purchase_orders_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_orders` ADD CONSTRAINT `erp_purchase_orders_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_orders` ADD CONSTRAINT `erp_purchase_orders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_request_lines` ADD CONSTRAINT `erp_prl_purchase_request_id_erp_pr_id_fk` FOREIGN KEY (`purchase_request_id`) REFERENCES `erp_purchase_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_request_lines` ADD CONSTRAINT `erp_prl_inventory_item_id_erp_inv_id_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `erp_inventory_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_request_lines` ADD CONSTRAINT `erp_prl_equipment_type_id_erp_eqt_id_fk` FOREIGN KEY (`equipment_type_id`) REFERENCES `erp_equipment_types`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_request_lines` ADD CONSTRAINT `erp_prl_material_type_id_erp_mt_id_fk` FOREIGN KEY (`material_type_id`) REFERENCES `erp_material_types`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_request_lines` ADD CONSTRAINT `erp_purchase_request_lines_budget_line_id_erp_budget_lines_id_fk` FOREIGN KEY (`budget_line_id`) REFERENCES `erp_budget_lines`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_requests` ADD CONSTRAINT `erp_purchase_requests_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_requests` ADD CONSTRAINT `erp_purchase_requests_requested_by_users_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_requests` ADD CONSTRAINT `erp_pr_purchase_category_id_erp_pcat_id_fk` FOREIGN KEY (`purchase_category_id`) REFERENCES `erp_purchase_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_requests` ADD CONSTRAINT `erp_purchase_requests_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_purchase_requests` ADD CONSTRAINT `erp_purchase_requests_rejected_by_users_id_fk` FOREIGN KEY (`rejected_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_rfq_vendors` ADD CONSTRAINT `erp_rfq_vendors_rfq_id_erp_rfqs_id_fk` FOREIGN KEY (`rfq_id`) REFERENCES `erp_rfqs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_rfq_vendors` ADD CONSTRAINT `erp_rfq_vendors_vendor_id_erp_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `erp_vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_rfqs` ADD CONSTRAINT `erp_rfqs_purchase_request_id_erp_purchase_requests_id_fk` FOREIGN KEY (`purchase_request_id`) REFERENCES `erp_purchase_requests`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_rfqs` ADD CONSTRAINT `erp_rfqs_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_rfqs` ADD CONSTRAINT `erp_rfqs_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_tax_codes` ADD CONSTRAINT `erp_tax_accounting_account_id_erp_acct_id_fk` FOREIGN KEY (`accounting_account_id`) REFERENCES `erp_accounting_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_vendor_quotes` ADD CONSTRAINT `erp_vendor_quotes_rfq_id_erp_rfqs_id_fk` FOREIGN KEY (`rfq_id`) REFERENCES `erp_rfqs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_vendor_quotes` ADD CONSTRAINT `erp_vendor_quotes_vendor_id_erp_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `erp_vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_erp_acct_code` ON `erp_accounting_accounts` (`account_code`);--> statement-breakpoint
CREATE INDEX `idx_erp_acct_type` ON `erp_accounting_accounts` (`account_type`);--> statement-breakpoint
CREATE INDEX `idx_erp_preentry_source` ON `erp_accounting_pre_entries` (`source_type`,`source_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_preentry_status` ON `erp_accounting_pre_entries` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_preentry_date` ON `erp_accounting_pre_entries` (`entry_date`);--> statement-breakpoint
CREATE INDEX `idx_erp_preentryline_entry` ON `erp_accounting_pre_entry_lines` (`pre_entry_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_preentryline_account` ON `erp_accounting_pre_entry_lines` (`accounting_account_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_eqtype_code` ON `erp_equipment_types` (`code`);--> statement-breakpoint
CREATE INDEX `idx_erp_expcat_code` ON `erp_expense_categories` (`code`);--> statement-breakpoint
CREATE INDEX `idx_erp_expline_expense` ON `erp_expense_lines` (`expense_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_expense_status` ON `erp_expenses` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_expense_project` ON `erp_expenses` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_expense_category` ON `erp_expenses` (`expense_category_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_expense_date` ON `erp_expenses` (`expense_date`);--> statement-breakpoint
CREATE INDEX `idx_erp_grline_gr` ON `erp_goods_receipt_lines` (`goods_receipt_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_gr_po` ON `erp_goods_receipts` (`purchase_order_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_gr_vendor` ON `erp_goods_receipts` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_gr_status` ON `erp_goods_receipts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_mattype_code` ON `erp_material_types` (`code`);--> statement-breakpoint
CREATE INDEX `idx_erp_payacct_type` ON `erp_payment_accounts` (`account_type`);--> statement-breakpoint
CREATE INDEX `idx_erp_purchcat_code` ON `erp_purchase_categories` (`code`);--> statement-breakpoint
CREATE INDEX `idx_erp_purchcat_type` ON `erp_purchase_categories` (`purchase_type`);--> statement-breakpoint
CREATE INDEX `idx_erp_poline_po` ON `erp_purchase_order_lines` (`purchase_order_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_po_status` ON `erp_purchase_orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_po_vendor` ON `erp_purchase_orders` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_po_project` ON `erp_purchase_orders` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_prline_pr` ON `erp_purchase_request_lines` (`purchase_request_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_pr_status` ON `erp_purchase_requests` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_pr_project` ON `erp_purchase_requests` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_pr_requester` ON `erp_purchase_requests` (`requested_by`);--> statement-breakpoint
CREATE INDEX `idx_erp_rfqvendor_rfq` ON `erp_rfq_vendors` (`rfq_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_rfqvendor_vendor` ON `erp_rfq_vendors` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_rfq_status` ON `erp_rfqs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_rfq_project` ON `erp_rfqs` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_tax_code` ON `erp_tax_codes` (`code`);--> statement-breakpoint
CREATE INDEX `idx_erp_tax_type` ON `erp_tax_codes` (`tax_type`);--> statement-breakpoint
CREATE INDEX `idx_erp_vquote_rfq` ON `erp_vendor_quotes` (`rfq_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_vquote_vendor` ON `erp_vendor_quotes` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_vquote_status` ON `erp_vendor_quotes` (`status`);