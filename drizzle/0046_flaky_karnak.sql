CREATE TABLE `erp_accounting_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entry_number` varchar(32) NOT NULL,
	`journal_id` int NOT NULL,
	`fiscal_year_id` int NOT NULL,
	`period_id` int NOT NULL,
	`entry_date` bigint NOT NULL,
	`posting_date` bigint,
	`source_type` varchar(32),
	`source_id` int,
	`description` text,
	`reference` varchar(128),
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`total_debit` bigint DEFAULT 0,
	`total_credit` bigint DEFAULT 0,
	`created_by` int,
	`posted_by` int,
	`posted_at` bigint,
	`reversed_by` int,
	`reversed_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_accounting_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_accounting_entries_entry_number_unique` UNIQUE(`entry_number`)
);
--> statement-breakpoint
CREATE TABLE `erp_accounting_entry_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entry_id` int NOT NULL,
	`line_number` int NOT NULL,
	`accounting_account_id` int NOT NULL,
	`debit_amount` bigint DEFAULT 0,
	`credit_amount` bigint DEFAULT 0,
	`label` varchar(255),
	`project_id` int,
	`customer_id` int,
	`vendor_id` int,
	`tax_code_id` int,
	`analytic_axis_id` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_accounting_entry_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_accounting_fiscal_years` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year_code` varchar(16) NOT NULL,
	`start_date` bigint NOT NULL,
	`end_date` bigint NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'open',
	`closed_by` int,
	`closed_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_accounting_fiscal_years_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_accounting_fiscal_years_year_code_unique` UNIQUE(`year_code`)
);
--> statement-breakpoint
CREATE TABLE `erp_accounting_journals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`journal_code` varchar(16) NOT NULL,
	`journal_name` varchar(128) NOT NULL,
	`journal_type` varchar(32) NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_accounting_journals_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_accounting_journals_journal_code_unique` UNIQUE(`journal_code`)
);
--> statement-breakpoint
CREATE TABLE `erp_accounting_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fiscal_year_id` int NOT NULL,
	`period_code` varchar(16) NOT NULL,
	`start_date` bigint NOT NULL,
	`end_date` bigint NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'open',
	`closed_by` int,
	`closed_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_accounting_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_accounting_third_parties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`third_party_type` varchar(16) NOT NULL,
	`customer_id` int,
	`vendor_id` int,
	`contractor_id` int,
	`accounting_account_id` int,
	`third_party_code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`tax_identification_number` varchar(32),
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_accounting_third_parties_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_accounting_third_parties_third_party_code_unique` UNIQUE(`third_party_code`)
);
--> statement-breakpoint
CREATE TABLE `erp_analytic_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_type` varchar(32) NOT NULL,
	`source_id` int NOT NULL,
	`project_id` int,
	`analytic_axis_id` int NOT NULL,
	`percentage` decimal(5,2),
	`amount` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_analytic_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_analytic_axes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`axis_type` varchar(32) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_analytic_axes_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_analytic_axes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_bank_reconciliation_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reconciliation_id` int NOT NULL,
	`payment_id` int,
	`accounting_entry_id` int,
	`transaction_date` bigint NOT NULL,
	`description` varchar(255),
	`amount` bigint NOT NULL,
	`matched` boolean NOT NULL DEFAULT false,
	`match_reference` varchar(64),
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_bank_reconciliation_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_bank_reconciliations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payment_account_id` int NOT NULL,
	`period_id` int,
	`statement_date` bigint NOT NULL,
	`opening_balance` bigint NOT NULL,
	`closing_balance` bigint NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`created_by` int,
	`validated_by` int,
	`validated_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_bank_reconciliations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_tax_declarations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tax_period_id` int NOT NULL,
	`tax_code_id` int NOT NULL,
	`tax_base_amount` bigint DEFAULT 0,
	`tax_amount` bigint DEFAULT 0,
	`recoverable_amount` bigint DEFAULT 0,
	`payable_amount` bigint DEFAULT 0,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`document_id` int,
	`created_by` int,
	`validated_by` int,
	`validated_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_tax_declarations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_tax_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`period_code` varchar(32) NOT NULL,
	`tax_type` varchar(32) NOT NULL,
	`start_date` bigint NOT NULL,
	`end_date` bigint NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'open',
	`declared_at` bigint,
	`paid_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_tax_periods_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_tax_periods_period_code_unique` UNIQUE(`period_code`)
);
--> statement-breakpoint
CREATE INDEX `idx_acct_entry_jnl` ON `erp_accounting_entries` (`journal_id`);--> statement-breakpoint
CREATE INDEX `idx_acct_entry_period` ON `erp_accounting_entries` (`period_id`);--> statement-breakpoint
CREATE INDEX `idx_acct_entry_status` ON `erp_accounting_entries` (`status`);--> statement-breakpoint
CREATE INDEX `idx_acct_entry_date` ON `erp_accounting_entries` (`entry_date`);--> statement-breakpoint
CREATE INDEX `idx_acct_entry_source` ON `erp_accounting_entries` (`source_type`,`source_id`);--> statement-breakpoint
CREATE INDEX `idx_acct_eline_entry` ON `erp_accounting_entry_lines` (`entry_id`);--> statement-breakpoint
CREATE INDEX `idx_acct_eline_acct` ON `erp_accounting_entry_lines` (`accounting_account_id`);--> statement-breakpoint
CREATE INDEX `idx_acct_fy_status` ON `erp_accounting_fiscal_years` (`status`);--> statement-breakpoint
CREATE INDEX `idx_acct_jnl_type` ON `erp_accounting_journals` (`journal_type`);--> statement-breakpoint
CREATE INDEX `idx_acct_period_fy` ON `erp_accounting_periods` (`fiscal_year_id`);--> statement-breakpoint
CREATE INDEX `idx_acct_period_status` ON `erp_accounting_periods` (`status`);--> statement-breakpoint
CREATE INDEX `idx_acct_tp_type` ON `erp_accounting_third_parties` (`third_party_type`);--> statement-breakpoint
CREATE INDEX `idx_acct_tp_acct` ON `erp_accounting_third_parties` (`accounting_account_id`);--> statement-breakpoint
CREATE INDEX `idx_analytic_alloc_src` ON `erp_analytic_allocations` (`source_type`,`source_id`);--> statement-breakpoint
CREATE INDEX `idx_analytic_alloc_axis` ON `erp_analytic_allocations` (`analytic_axis_id`);--> statement-breakpoint
CREATE INDEX `idx_analytic_type` ON `erp_analytic_axes` (`axis_type`);--> statement-breakpoint
CREATE INDEX `idx_bank_rline_recon` ON `erp_bank_reconciliation_lines` (`reconciliation_id`);--> statement-breakpoint
CREATE INDEX `idx_bank_recon_acct` ON `erp_bank_reconciliations` (`payment_account_id`);--> statement-breakpoint
CREATE INDEX `idx_bank_recon_status` ON `erp_bank_reconciliations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tax_decl_period` ON `erp_tax_declarations` (`tax_period_id`);--> statement-breakpoint
CREATE INDEX `idx_tax_decl_status` ON `erp_tax_declarations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tax_period_type` ON `erp_tax_periods` (`tax_type`);--> statement-breakpoint
CREATE INDEX `idx_tax_period_status` ON `erp_tax_periods` (`status`);