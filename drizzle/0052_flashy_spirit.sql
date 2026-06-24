CREATE TABLE `erp_solar_cable_ampacity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`section_mm2` decimal(6,1) NOT NULL,
	`material` varchar(32) NOT NULL DEFAULT 'copper',
	`install_method` varchar(64) NOT NULL DEFAULT 'conduit',
	`conductor_count` int NOT NULL DEFAULT 2,
	`ampacity_a` decimal(8,2) NOT NULL,
	`temperature_rating_c` int NOT NULL DEFAULT 70,
	`standard` varchar(64) NOT NULL DEFAULT 'NF C 15-100',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_cable_ampacity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_technical_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`solar_project_id` int NOT NULL,
	`alert_category` varchar(64) NOT NULL,
	`alert_code` varchar(64) NOT NULL,
	`severity` varchar(32) NOT NULL DEFAULT 'warning',
	`title` varchar(255) NOT NULL,
	`description` text,
	`recommendation` text,
	`related_entity` varchar(64),
	`related_entity_id` int,
	`is_resolved` boolean DEFAULT false,
	`resolved_by` int,
	`resolved_at` bigint,
	`resolution_note` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_technical_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `erp_solar_cable_sizing` ADD `from_equipment` varchar(128);--> statement-breakpoint
ALTER TABLE `erp_solar_cable_sizing` ADD `to_equipment` varchar(128);--> statement-breakpoint
ALTER TABLE `erp_solar_cable_sizing` ADD `voltage_v` decimal(8,2);--> statement-breakpoint
ALTER TABLE `erp_solar_cable_sizing` ADD `power_w` decimal(10,2);--> statement-breakpoint
ALTER TABLE `erp_solar_cable_sizing` ADD `selected_section_mm2` decimal(6,1) NOT NULL;--> statement-breakpoint
ALTER TABLE `erp_solar_cable_sizing` ADD `voltage_drop_v` decimal(8,4);--> statement-breakpoint
ALTER TABLE `erp_solar_cable_sizing` ADD `resistance_ohm` decimal(8,4);--> statement-breakpoint
ALTER TABLE `erp_solar_cable_sizing` ADD `power_loss_w` decimal(10,2);--> statement-breakpoint
ALTER TABLE `erp_solar_cable_sizing` ADD `energy_loss_wh_day` decimal(10,2);--> statement-breakpoint
ALTER TABLE `erp_solar_cable_sizing` ADD `loss_percent` decimal(6,3);--> statement-breakpoint
ALTER TABLE `erp_solar_cable_sizing` ADD `ampacity_limit_a` decimal(8,2);--> statement-breakpoint
ALTER TABLE `erp_solar_cable_sizing` ADD `ampacity_status` varchar(32) DEFAULT 'OK';--> statement-breakpoint
ALTER TABLE `erp_solar_cable_sizing` ADD `protection_recommendation` varchar(255);--> statement-breakpoint
ALTER TABLE `erp_solar_cable_sizing` ADD `engineering_status` varchar(32) DEFAULT 'Draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `erp_solar_design_inputs` ADD `battery_sizing_mode` varchar(32) DEFAULT 'total_load' NOT NULL;--> statement-breakpoint
ALTER TABLE `erp_solar_design_inputs` ADD `hybrid_backup_percent` decimal(4,2) DEFAULT '0.30';--> statement-breakpoint
ALTER TABLE `erp_solar_design_inputs` ADD `pv_string_voltage_v` int;--> statement-breakpoint
ALTER TABLE `erp_solar_design_inputs` ADD `battery_ageing_factor` decimal(4,2) DEFAULT '0.80' NOT NULL;--> statement-breakpoint
ALTER TABLE `erp_solar_design_inputs` ADD `battery_temperature_factor` decimal(4,2) DEFAULT '0.95' NOT NULL;--> statement-breakpoint
ALTER TABLE `erp_solar_design_inputs` ADD `battery_reserve_margin_percent` decimal(4,2) DEFAULT '0.10' NOT NULL;--> statement-breakpoint
ALTER TABLE `erp_solar_design_inputs` ADD `power_factor` decimal(4,2) DEFAULT '0.85' NOT NULL;--> statement-breakpoint
ALTER TABLE `erp_solar_design_inputs` ADD `inverter_surge_margin` decimal(4,2) DEFAULT '0.10' NOT NULL;--> statement-breakpoint
ALTER TABLE `erp_solar_design_inputs` ADD `pv_margin_percent` decimal(4,2) DEFAULT '0.15' NOT NULL;--> statement-breakpoint
ALTER TABLE `erp_solar_load_items` ADD `is_night_load` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `erp_solar_load_items` ADD `is_motor_load` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `erp_solar_load_items` ADD `priority_level` varchar(32) DEFAULT 'important' NOT NULL;--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `simultaneous_power_w` decimal(12,2);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `realistic_peak_power_w` decimal(12,2);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `critical_daily_energy_wh` decimal(12,2);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `night_daily_energy_wh` decimal(12,2);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `detailed_efficiency` decimal(6,4);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `pv_gross_power_wc` decimal(12,2);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `pv_recommended_power_wc` decimal(12,2);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `pv_installed_power_wc` decimal(12,2);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `pv_real_margin_percent` decimal(6,4);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `battery_sizing_mode` varchar(32);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `battery_reference_energy_wh` decimal(12,2);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `battery_nominal_capacity_wh` decimal(12,2);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `battery_recommended_capacity_wh` decimal(12,2);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `battery_modules_count` int;--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `battery_real_autonomy_days` decimal(6,2);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `inverter_continuous_recommended_w` decimal(12,2);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `inverter_surge_required_w` decimal(12,2);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `inverter_power_kva` decimal(12,2);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `total_cable_loss_w` decimal(10,2);--> statement-breakpoint
ALTER TABLE `erp_solar_sizing_results` ADD `total_cable_loss_wh_day` decimal(10,2);