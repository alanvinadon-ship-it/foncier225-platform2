CREATE TABLE `erp_solar_load_template_generations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`solar_project_id` int NOT NULL,
	`template_id` int NOT NULL,
	`generated_by` int NOT NULL,
	`generated_at` bigint NOT NULL,
	`items_created_count` int NOT NULL DEFAULT 0,
	`total_power_w` decimal(12,2),
	`total_daily_energy_wh` decimal(12,2),
	`critical_energy_wh` decimal(12,2),
	`mode` varchar(32) NOT NULL DEFAULT 'replace',
	`status` varchar(32) NOT NULL DEFAULT 'Generated',
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_load_template_generations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_load_template_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_id` int NOT NULL,
	`equipment_name` varchar(255) NOT NULL,
	`domain` varchar(64),
	`category` varchar(64),
	`power_w` decimal(10,2) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`hours_per_day` decimal(4,1) NOT NULL,
	`simultaneity_coefficient` decimal(4,2) NOT NULL DEFAULT '1.00',
	`startup_factor` decimal(4,1) NOT NULL DEFAULT '1.0',
	`is_critical_load` boolean DEFAULT false,
	`is_night_load` boolean DEFAULT false,
	`is_motor_load` boolean DEFAULT false,
	`priority_level` varchar(32) NOT NULL DEFAULT 'Important',
	`notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_load_template_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_load_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_code` varchar(64) NOT NULL,
	`template_name` varchar(255) NOT NULL,
	`domain` varchar(64) NOT NULL,
	`profile_type` varchar(128) NOT NULL,
	`comfort_level` varchar(32) NOT NULL DEFAULT 'Standard',
	`description` text,
	`recommended_site_type` varchar(128),
	`is_active` boolean DEFAULT true,
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_load_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_solar_load_templates_template_code_unique` UNIQUE(`template_code`)
);
