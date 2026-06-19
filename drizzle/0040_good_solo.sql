CREATE TABLE `erp_supplier_integrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendor_id` int NOT NULL,
	`integration_type` varchar(32) NOT NULL,
	`api_url` text,
	`api_key` text,
	`last_sync_at` bigint,
	`sync_status` varchar(32) NOT NULL DEFAULT 'never',
	`sync_frequency` varchar(32) NOT NULL DEFAULT 'manual',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` int NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_supplier_integrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_supplier_item_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendor_id` int NOT NULL,
	`item_id` int NOT NULL,
	`unit_price` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'XOF',
	`lead_time_days` int NOT NULL DEFAULT 0,
	`min_order_qty` int NOT NULL DEFAULT 1,
	`is_preferred` boolean NOT NULL DEFAULT false,
	`valid_from` bigint,
	`valid_to` bigint,
	`notes` text,
	`created_by` int NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_supplier_item_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_wastage_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int,
	`item_id` int NOT NULL,
	`quantity` int NOT NULL,
	`unit_cost` int NOT NULL,
	`total_cost` int NOT NULL,
	`wastage_percentage` int NOT NULL DEFAULT 0,
	`cause` varchar(64) NOT NULL,
	`description` text,
	`corrective_action` text,
	`recorded_by` int NOT NULL,
	`recorded_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_wastage_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_erp_supplier_integrations_vendor` ON `erp_supplier_integrations` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_supplier_integrations_status` ON `erp_supplier_integrations` (`sync_status`);--> statement-breakpoint
CREATE INDEX `idx_erp_supplier_prices_vendor` ON `erp_supplier_item_prices` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_supplier_prices_item` ON `erp_supplier_item_prices` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_supplier_prices_preferred` ON `erp_supplier_item_prices` (`is_preferred`);--> statement-breakpoint
CREATE INDEX `idx_erp_wastage_project` ON `erp_wastage_records` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_wastage_item` ON `erp_wastage_records` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_wastage_cause` ON `erp_wastage_records` (`cause`);--> statement-breakpoint
CREATE INDEX `idx_erp_wastage_date` ON `erp_wastage_records` (`recorded_at`);