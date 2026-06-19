CREATE TABLE `erp_inventory_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sku` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(64) NOT NULL,
	`unit` varchar(32) NOT NULL,
	`min_stock` int NOT NULL DEFAULT 0,
	`max_stock` int NOT NULL DEFAULT 0,
	`current_stock` int NOT NULL DEFAULT 0,
	`unit_price` int NOT NULL DEFAULT 0,
	`location_id` int,
	`project_id` int,
	`image_url` text,
	`created_by` int NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_inventory_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_material_request_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`request_id` int NOT NULL,
	`item_id` int NOT NULL,
	`quantity_requested` int NOT NULL,
	`quantity_fulfilled` int NOT NULL DEFAULT 0,
	`notes` text,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_material_request_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_material_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int,
	`request_number` varchar(32) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`priority` varchar(16) NOT NULL DEFAULT 'medium',
	`requested_by` int NOT NULL,
	`approved_by` int,
	`approved_at` bigint,
	`rejected_by` int,
	`rejected_at` bigint,
	`rejection_reason` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_material_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_stock_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`address` varchar(255),
	`project_id` int,
	`created_by` int NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_stock_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_stock_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_id` int NOT NULL,
	`location_id` int,
	`project_id` int,
	`type` varchar(32) NOT NULL,
	`quantity` int NOT NULL,
	`previous_stock` int NOT NULL,
	`new_stock` int NOT NULL,
	`reference` varchar(128),
	`notes` text,
	`performed_by` int NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_erp_inventory_items_sku` ON `erp_inventory_items` (`sku`);--> statement-breakpoint
CREATE INDEX `idx_erp_inventory_items_category` ON `erp_inventory_items` (`category`);--> statement-breakpoint
CREATE INDEX `idx_erp_inventory_items_location` ON `erp_inventory_items` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_inventory_items_project` ON `erp_inventory_items` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_material_request_lines_request` ON `erp_material_request_lines` (`request_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_material_request_lines_item` ON `erp_material_request_lines` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_material_requests_status` ON `erp_material_requests` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_material_requests_project` ON `erp_material_requests` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_material_requests_requested_by` ON `erp_material_requests` (`requested_by`);--> statement-breakpoint
CREATE INDEX `idx_erp_stock_locations_project` ON `erp_stock_locations` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_stock_movements_item` ON `erp_stock_movements` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_stock_movements_type` ON `erp_stock_movements` (`type`);--> statement-breakpoint
CREATE INDEX `idx_erp_stock_movements_date` ON `erp_stock_movements` (`created_at`);