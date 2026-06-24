CREATE TABLE `erp_solar_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`solar_project_id` int,
	`user_id` int NOT NULL,
	`action` varchar(64) NOT NULL,
	`module` varchar(64) NOT NULL,
	`parameter_code` varchar(64),
	`old_value` text,
	`new_value` text,
	`justification` text,
	`metadata` text,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_budget_parameters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`solar_project_id` int,
	`parameter_code` varchar(64) NOT NULL,
	`parameter_name` varchar(255) NOT NULL,
	`parameter_value` decimal(14,6) NOT NULL,
	`unit` varchar(32),
	`description` text,
	`is_global` boolean DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_budget_parameters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_calculation_formulas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`formula_code` varchar(64) NOT NULL,
	`formula_name` varchar(255) NOT NULL,
	`formula_group` varchar(64) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`expression` text NOT NULL,
	`description` text,
	`input_parameters` text,
	`output_unit` varchar(32),
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`activated_at` bigint,
	`activated_by` int,
	`created_by` int NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_calculation_formulas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_calculation_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`solar_project_id` int NOT NULL,
	`run_type` varchar(32) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'completed',
	`parameters_snapshot` text,
	`formulas_snapshot` text,
	`input_data` text,
	`output_data` text,
	`duration_ms` int,
	`error_message` text,
	`triggered_by` int NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_calculation_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_global_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parameter_code` varchar(64) NOT NULL,
	`parameter_name` varchar(255) NOT NULL,
	`parameter_group` varchar(64) NOT NULL,
	`parameter_value` decimal(14,6) NOT NULL,
	`unit` varchar(32),
	`description` text,
	`min_value` decimal(14,6),
	`max_value` decimal(14,6),
	`data_type` varchar(16) NOT NULL DEFAULT 'number',
	`is_locked` boolean DEFAULT false,
	`last_modified_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_global_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_solar_global_settings_parameter_code_unique` UNIQUE(`parameter_code`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_site_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`solar_project_id` int NOT NULL,
	`parameter_code` varchar(64) NOT NULL,
	`override_value` decimal(14,6) NOT NULL,
	`justification` text,
	`source` varchar(128),
	`validated_by` int,
	`validated_at` bigint,
	`created_by` int NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_site_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `erp_solar_load_items` ADD `catalog_item_id` int;--> statement-breakpoint
ALTER TABLE `erp_solar_load_items` ADD `domain` varchar(64);--> statement-breakpoint
ALTER TABLE `erp_solar_load_items` ADD `is_custom` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `erp_solar_load_items` ADD `simultaneity_coeff` decimal(4,2) DEFAULT '1.00' NOT NULL;