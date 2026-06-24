CREATE TABLE `erp_ai_cost_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scope_type` varchar(20) NOT NULL,
	`scope_id` varchar(100),
	`provider_id` int,
	`monthly_token_limit` bigint,
	`monthly_cost_limit` varchar(20),
	`daily_request_limit` int,
	`is_active` tinyint DEFAULT 1,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_cost_limits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_doc_field_extractions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_job_id` int NOT NULL,
	`document_id` int,
	`document_type` varchar(64) NOT NULL,
	`source_module` varchar(64),
	`source_type` varchar(64),
	`source_id` int,
	`extracted_data_json` json,
	`normalized_data_json` json,
	`validation_errors_json` json,
	`confidence_score` int,
	`status` varchar(32) NOT NULL DEFAULT 'suggested',
	`created_by` int,
	`reviewed_by` int,
	`reviewed_at` bigint,
	`validated_by` int,
	`validated_at` bigint,
	`rejected_by` int,
	`rejected_at` bigint,
	`rejection_reason` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_ai_doc_field_extractions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_document_apply_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_extraction_id` int NOT NULL,
	`target_module` varchar(64) NOT NULL,
	`target_type` varchar(64) NOT NULL,
	`target_id` int,
	`action_type` varchar(64) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`applied_by` int,
	`applied_at` bigint,
	`error_message` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_document_apply_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_document_classifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_job_id` int NOT NULL,
	`document_id` int,
	`detected_document_type` varchar(64) NOT NULL,
	`confirmed_document_type` varchar(64),
	`recommended_module` varchar(64),
	`confidence_score` int,
	`classification_reason` text,
	`alternative_types_json` text,
	`status` varchar(32) NOT NULL DEFAULT 'suggested',
	`corrected_by` int,
	`corrected_at` bigint,
	`reviewed_by` int,
	`reviewed_at` bigint,
	`validated_by` int,
	`validated_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_document_classifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_document_extraction_fields` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_extraction_id` int NOT NULL,
	`field_key` varchar(64) NOT NULL,
	`field_label` varchar(128) NOT NULL,
	`field_type` varchar(32) NOT NULL DEFAULT 'string',
	`raw_value` text,
	`normalized_value` text,
	`confidence_score` int,
	`is_required` tinyint NOT NULL DEFAULT 0,
	`is_sensitive` tinyint NOT NULL DEFAULT 0,
	`is_corrected` tinyint NOT NULL DEFAULT 0,
	`corrected_value` text,
	`corrected_by` int,
	`corrected_at` bigint,
	`status` varchar(32) NOT NULL DEFAULT 'suggested',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_document_extraction_fields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_document_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_number` varchar(32) NOT NULL,
	`document_id` int,
	`source_module` varchar(64),
	`source_type` varchar(64),
	`source_id` int,
	`file_name` varchar(255) NOT NULL,
	`file_type` varchar(64) NOT NULL,
	`file_size` int DEFAULT 0,
	`file_url` text,
	`job_status` varchar(32) NOT NULL DEFAULT 'pending',
	`ocr_status` varchar(32) NOT NULL DEFAULT 'pending',
	`classification_status` varchar(32) NOT NULL DEFAULT 'pending',
	`detected_document_type` varchar(64),
	`confirmed_document_type` varchar(64),
	`confidence_score` int,
	`started_at` bigint,
	`finished_at` bigint,
	`duration_ms` int,
	`error_message` text,
	`created_by` int NOT NULL,
	`reviewed_by` int,
	`reviewed_at` bigint,
	`validated_by` int,
	`validated_at` bigint,
	`rejected_by` int,
	`rejected_at` bigint,
	`rejection_reason` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_ai_document_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_document_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_extraction_id` int NOT NULL,
	`line_number` int NOT NULL,
	`description` text,
	`item_code` varchar(64),
	`quantity` int,
	`unit` varchar(32),
	`unit_price` int,
	`discount_rate` int,
	`tax_rate` int,
	`tax_amount` int,
	`line_total` int,
	`raw_line_json` json,
	`confidence_score` int,
	`status` varchar(32) NOT NULL DEFAULT 'suggested',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_document_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_document_validation_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_job_id` int NOT NULL,
	`classification_id` int,
	`action` varchar(64) NOT NULL,
	`old_document_type` varchar(64),
	`new_document_type` varchar(64),
	`comments` text,
	`performed_by` int NOT NULL,
	`performed_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_document_validation_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_model_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider_id` int NOT NULL,
	`task_type` varchar(50) NOT NULL,
	`model_name` varchar(100) NOT NULL,
	`temperature` varchar(10) DEFAULT '0.7',
	`max_tokens` int DEFAULT 4096,
	`timeout_seconds` int DEFAULT 60,
	`top_p` varchar(10),
	`frequency_penalty` varchar(10),
	`presence_penalty` varchar(10),
	`json_mode_enabled` tinyint DEFAULT 0,
	`is_active` tinyint DEFAULT 1,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_model_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_ocr_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_job_id` int NOT NULL,
	`document_id` int,
	`ocr_engine` varchar(64) NOT NULL DEFAULT 'llm_vision',
	`language` varchar(16),
	`raw_text` text,
	`cleaned_text` text,
	`pages_count` int DEFAULT 0,
	`page_results_json` text,
	`confidence_score` int,
	`processing_time_ms` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_ocr_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_providers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider_code` varchar(50) NOT NULL,
	`provider_name` varchar(100) NOT NULL,
	`provider_type` varchar(30) NOT NULL,
	`base_url` varchar(500),
	`encrypted_api_key` text,
	`organization_id` varchar(100),
	`project_id` varchar(100),
	`default_text_model` varchar(100),
	`default_vision_model` varchar(100),
	`default_embedding_model` varchar(100),
	`supports_text` tinyint DEFAULT 1,
	`supports_vision` tinyint DEFAULT 0,
	`supports_embeddings` tinyint DEFAULT 0,
	`supports_streaming` tinyint DEFAULT 0,
	`supports_json_mode` tinyint DEFAULT 0,
	`max_tokens` int DEFAULT 4096,
	`temperature` varchar(10) DEFAULT '0.7',
	`timeout_seconds` int DEFAULT 60,
	`headers_json` text,
	`is_default` tinyint DEFAULT 0,
	`is_active` tinyint DEFAULT 1,
	`last_tested_at` bigint,
	`last_test_status` varchar(20),
	`created_by` int,
	`updated_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_ai_providers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_task_routing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`module` varchar(50) NOT NULL,
	`task_type` varchar(50) NOT NULL,
	`primary_provider_id` int NOT NULL,
	`fallback_provider_id` int,
	`second_fallback_provider_id` int,
	`enabled` tinyint DEFAULT 1,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_task_routing_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_usage_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider_id` int NOT NULL,
	`model_name` varchar(100) NOT NULL,
	`module` varchar(50) NOT NULL,
	`task_type` varchar(50) NOT NULL,
	`source_type` varchar(50),
	`source_id` int,
	`user_id` int,
	`prompt_tokens` int DEFAULT 0,
	`completion_tokens` int DEFAULT 0,
	`total_tokens` int DEFAULT 0,
	`estimated_cost` varchar(20),
	`currency` varchar(5) DEFAULT 'USD',
	`duration_ms` int,
	`status` varchar(20) NOT NULL,
	`error_message` text,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_usage_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_ai_recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`solar_project_id` int NOT NULL,
	`recommendation_type` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`severity` varchar(16) NOT NULL DEFAULT 'info',
	`confidence_score` decimal(4,2),
	`expected_impact` text,
	`status` varchar(32) NOT NULL DEFAULT 'suggested',
	`validated_by` varchar(64),
	`validated_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_ai_recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_budget_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`solar_project_id` int NOT NULL,
	`lot_number` int NOT NULL,
	`lot_name` varchar(255) NOT NULL,
	`category` varchar(64) NOT NULL,
	`quantity` decimal(12,2) NOT NULL,
	`unit` varchar(32) NOT NULL,
	`unit_price` decimal(14,2) NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'XOF',
	`calculation_method` varchar(128),
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_budget_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_cable_sizing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`solar_project_id` int NOT NULL,
	`cable_type` varchar(64) NOT NULL,
	`line_name` varchar(128) NOT NULL,
	`length_m` decimal(8,2) NOT NULL,
	`current_a` decimal(8,2) NOT NULL,
	`theoretical_section_mm2` decimal(8,2) NOT NULL,
	`recommended_commercial_section_mm2` decimal(6,1) NOT NULL,
	`voltage_drop_percent` decimal(6,3),
	`material` varchar(32) NOT NULL DEFAULT 'copper',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_cable_sizing_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_design_inputs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`solar_project_id` int NOT NULL,
	`nominal_voltage_v` int NOT NULL DEFAULT 48,
	`battery_technology` varchar(32) NOT NULL DEFAULT 'lithium',
	`autonomy_days` int NOT NULL DEFAULT 2,
	`peak_sun_hours` decimal(4,2) NOT NULL,
	`panel_unit_power_wc` int NOT NULL DEFAULT 550,
	`panel_to_inverter_cable_length_m` decimal(6,1) NOT NULL DEFAULT '10.0',
	`battery_to_inverter_cable_length_m` decimal(6,1) NOT NULL DEFAULT '3.0',
	`global_efficiency` decimal(4,2) NOT NULL DEFAULT '0.75',
	`battery_discharge_rate` decimal(4,2) NOT NULL DEFAULT '0.80',
	`voltage_drop_target` decimal(4,3) NOT NULL DEFAULT '0.030',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_design_inputs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_load_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`solar_project_id` int NOT NULL,
	`equipment_name` varchar(255) NOT NULL,
	`equipment_category` varchar(64),
	`unit_power_w` decimal(10,2) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`total_power_w` decimal(10,2) NOT NULL,
	`startup_factor` decimal(4,2) NOT NULL DEFAULT '1.00',
	`peak_power_w` decimal(10,2) NOT NULL,
	`usage_hours_per_day` decimal(4,1) NOT NULL,
	`daily_energy_wh` decimal(12,2) NOT NULL,
	`is_critical_load` boolean DEFAULT false,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_load_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_price_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_code` varchar(64) NOT NULL,
	`item_name` varchar(255) NOT NULL,
	`category` varchar(64) NOT NULL,
	`unit` varchar(32) NOT NULL,
	`unit_price` decimal(14,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'XOF',
	`brand` varchar(128),
	`model` varchar(128),
	`quality_level` varchar(32),
	`recommended_usage` varchar(64),
	`supplier_id` int,
	`valid_from` bigint,
	`valid_to` bigint,
	`is_default` boolean DEFAULT false,
	`is_active` boolean DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_price_catalog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_code` varchar(32) NOT NULL,
	`erp_project_id` int,
	`name` varchar(255) NOT NULL,
	`client_name` varchar(255),
	`site_name` varchar(255),
	`site_location` text,
	`region_zone_id` int,
	`system_type` varchar(64) NOT NULL DEFAULT 'autonomous',
	`status` varchar(64) NOT NULL DEFAULT 'draft',
	`currency` varchar(8) NOT NULL DEFAULT 'XOF',
	`created_by` varchar(64) NOT NULL,
	`validated_by` varchar(64),
	`validated_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_solar_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_resource_zones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`zone_name` varchar(128) NOT NULL,
	`country` varchar(64),
	`region` varchar(128),
	`city` varchar(128),
	`peak_sun_hours` decimal(4,2) NOT NULL,
	`source` varchar(255),
	`is_default` boolean DEFAULT false,
	`is_active` boolean DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_resource_zones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_scenarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`solar_project_id` int NOT NULL,
	`scenario_name` varchar(128) NOT NULL,
	`battery_technology` varchar(32) NOT NULL,
	`autonomy_days` int NOT NULL,
	`panel_power_wc` int NOT NULL,
	`peak_sun_hours` decimal(4,2) NOT NULL,
	`total_cost` decimal(14,2),
	`panels_count` int,
	`battery_capacity_ah` decimal(12,2),
	`inverter_power_w` decimal(12,2),
	`ai_score` decimal(4,2),
	`recommended_by_ai` boolean DEFAULT false,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_scenarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_sizing_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`solar_project_id` int NOT NULL,
	`total_nominal_power_w` decimal(12,2),
	`max_startup_power_w` decimal(12,2),
	`total_daily_energy_wh` decimal(12,2),
	`required_pv_power_wc` decimal(12,2),
	`panel_unit_power_wc` int,
	`panels_count` int,
	`battery_capacity_ah` decimal(12,2),
	`battery_capacity_wh` decimal(12,2),
	`inverter_min_power_w` decimal(12,2),
	`recommended_inverter_power_w` decimal(12,2),
	`confidence_score` decimal(4,2),
	`calculation_status` varchar(32) NOT NULL DEFAULT 'pending',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_sizing_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_solar_technical_parameters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parameter_code` varchar(64) NOT NULL,
	`parameter_name` varchar(255) NOT NULL,
	`parameter_value` decimal(10,4) NOT NULL,
	`unit` varchar(32),
	`description` text,
	`is_active` boolean DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_solar_technical_parameters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_ai_doc_class_job` ON `erp_ai_document_classifications` (`document_job_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_doc_class_document` ON `erp_ai_document_classifications` (`document_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_doc_class_status` ON `erp_ai_document_classifications` (`status`);--> statement-breakpoint
CREATE INDEX `idx_ai_doc_class_type` ON `erp_ai_document_classifications` (`detected_document_type`);--> statement-breakpoint
CREATE INDEX `idx_ai_doc_jobs_number` ON `erp_ai_document_jobs` (`job_number`);--> statement-breakpoint
CREATE INDEX `idx_ai_doc_jobs_document` ON `erp_ai_document_jobs` (`document_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_doc_jobs_status` ON `erp_ai_document_jobs` (`job_status`);--> statement-breakpoint
CREATE INDEX `idx_ai_doc_jobs_ocr_status` ON `erp_ai_document_jobs` (`ocr_status`);--> statement-breakpoint
CREATE INDEX `idx_ai_doc_jobs_class_status` ON `erp_ai_document_jobs` (`classification_status`);--> statement-breakpoint
CREATE INDEX `idx_ai_doc_jobs_created_by` ON `erp_ai_document_jobs` (`created_by`);--> statement-breakpoint
CREATE INDEX `idx_ai_doc_jobs_created_at` ON `erp_ai_document_jobs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_doc_val_logs_job` ON `erp_ai_document_validation_logs` (`document_job_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_doc_val_logs_class` ON `erp_ai_document_validation_logs` (`classification_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_doc_val_logs_action` ON `erp_ai_document_validation_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_ai_doc_val_logs_performed_by` ON `erp_ai_document_validation_logs` (`performed_by`);--> statement-breakpoint
CREATE INDEX `idx_ai_ocr_results_job` ON `erp_ai_ocr_results` (`document_job_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_ocr_results_document` ON `erp_ai_ocr_results` (`document_id`);