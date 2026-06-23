CREATE TABLE `erp_ai_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`module` varchar(64) NOT NULL,
	`action` varchar(64) NOT NULL,
	`prompt_hash` varchar(64),
	`model_name` varchar(64),
	`input_summary` text,
	`output_summary` text,
	`tokens_used` int,
	`duration_ms` int,
	`status` varchar(32) NOT NULL DEFAULT 'success',
	`error_message` text,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_construction_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rule_code` varchar(32) NOT NULL,
	`rule_name` varchar(128) NOT NULL,
	`domain` varchar(32) NOT NULL,
	`description` text,
	`rule_type` varchar(32) NOT NULL DEFAULT 'check',
	`parameters_json` text,
	`source_reference` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`requires_validation` boolean NOT NULL DEFAULT true,
	`created_by` int NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_construction_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`module` varchar(64) NOT NULL DEFAULT 'general',
	`title` varchar(255),
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`message_count` int NOT NULL DEFAULT 0,
	`last_message_at` bigint,
	`context_project_id` int,
	`context_budget_id` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_document_extractions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_id` int,
	`document_type` varchar(64) NOT NULL,
	`file_url` text,
	`extracted_data_json` text,
	`confidence_score` int,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`validated_by` int,
	`validated_at` bigint,
	`rejected_by` int,
	`rejected_at` bigint,
	`created_by` int NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_document_extractions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_engineering_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plan_analysis_id` int NOT NULL,
	`project_id` int,
	`check_type` varchar(32) NOT NULL,
	`check_name` varchar(128) NOT NULL,
	`description` text,
	`severity` varchar(16) NOT NULL DEFAULT 'info',
	`status` varchar(32) NOT NULL DEFAULT 'needs_review',
	`detected_issue` text,
	`recommendation` text,
	`related_element_id` int,
	`confidence_score` int,
	`requires_engineer_validation` boolean NOT NULL DEFAULT true,
	`reviewed_by` int,
	`reviewed_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_engineering_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_material_takeoffs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plan_analysis_id` int NOT NULL,
	`project_id` int,
	`element_id` int,
	`material_name` varchar(128) NOT NULL,
	`category` varchar(32) NOT NULL,
	`unit` varchar(16) NOT NULL,
	`calculated_quantity` decimal(14,3) NOT NULL,
	`waste_rate` decimal(5,2) DEFAULT '5.00',
	`recommended_quantity` decimal(14,3) NOT NULL,
	`purchase_unit` varchar(32),
	`purchase_quantity` decimal(14,3),
	`unit_price` int,
	`estimated_cost` int,
	`calculation_method` varchar(64),
	`assumptions_json` text,
	`confidence_score` int,
	`status` varchar(32) NOT NULL DEFAULT 'suggested',
	`reviewed_by` int,
	`validated_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_material_takeoffs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversation_id` int NOT NULL,
	`role` varchar(16) NOT NULL,
	`content` text NOT NULL,
	`source_context_json` text,
	`tokens_used` int,
	`model_name` varchar(64),
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_plan_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysis_number` varchar(32) NOT NULL,
	`project_id` int,
	`document_id` int,
	`file_name` varchar(255) NOT NULL,
	`file_url` text NOT NULL,
	`file_key` varchar(255) NOT NULL,
	`file_type` varchar(16) NOT NULL,
	`plan_type` varchar(32) NOT NULL DEFAULT 'unknown',
	`scale_detected` varchar(32),
	`scale_confirmed` varchar(32),
	`floor_level` varchar(32),
	`hypotheses` text,
	`analysis_status` varchar(32) NOT NULL DEFAULT 'pending',
	`confidence_score` int,
	`ai_raw_response` text,
	`created_by` int NOT NULL,
	`reviewed_by` int,
	`reviewed_at` bigint,
	`validated_by` int,
	`validated_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_ai_plan_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_plan_elements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plan_analysis_id` int NOT NULL,
	`element_type` varchar(32) NOT NULL,
	`element_label` varchar(128),
	`floor_level` varchar(32),
	`zone` varchar(64),
	`coordinates_json` text,
	`dimensions_json` text,
	`area` decimal(12,3),
	`length` decimal(12,3),
	`width` decimal(12,3),
	`height` decimal(12,3),
	`volume` decimal(12,3),
	`unit` varchar(16) DEFAULT 'm',
	`confidence_score` int,
	`status` varchar(32) NOT NULL DEFAULT 'suggested',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_plan_elements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_plan_review_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plan_analysis_id` int NOT NULL,
	`element_id` int,
	`comment` text NOT NULL,
	`comment_type` varchar(32) NOT NULL DEFAULT 'note',
	`created_by` int NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_plan_review_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_quantity_coefficients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coefficient_code` varchar(32) NOT NULL,
	`name` varchar(128) NOT NULL,
	`usage_domain` varchar(32) NOT NULL,
	`input_unit` varchar(16) NOT NULL,
	`output_unit` varchar(16) NOT NULL,
	`coefficient_value` decimal(12,4) NOT NULL,
	`waste_rate_default` decimal(5,2) NOT NULL DEFAULT '5.00',
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_quantity_coefficients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`module` varchar(64) NOT NULL,
	`source_type` varchar(64) NOT NULL,
	`source_id` int,
	`recommendation_type` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`confidence_score` int,
	`priority` varchar(16) NOT NULL DEFAULT 'medium',
	`status` varchar(32) NOT NULL DEFAULT 'suggested',
	`generated_by` varchar(64) NOT NULL DEFAULT 'assistant',
	`validated_by` int,
	`validated_at` bigint,
	`rejected_by` int,
	`rejected_at` bigint,
	`applied_by` int,
	`applied_at` bigint,
	`action_payload_json` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_ai_risk_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`module` varchar(64) NOT NULL,
	`source_type` varchar(64) NOT NULL,
	`source_id` int,
	`risk_type` varchar(64) NOT NULL,
	`risk_score` int NOT NULL,
	`risk_level` varchar(16) NOT NULL,
	`explanation` text,
	`recommended_action` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_ai_risk_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_analytic_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshot_date` bigint NOT NULL,
	`period_month` int NOT NULL,
	`period_year` int NOT NULL,
	`project_id` int,
	`program_id` int,
	`cost_center_id` int,
	`revenue_amount` bigint DEFAULT 0,
	`expense_amount` bigint DEFAULT 0,
	`capex_amount` bigint DEFAULT 0,
	`cash_in_amount` bigint DEFAULT 0,
	`cash_out_amount` bigint DEFAULT 0,
	`margin_amount` bigint DEFAULT 0,
	`margin_rate` decimal(7,2) DEFAULT '0',
	`budget_amount` bigint DEFAULT 0,
	`actual_amount` bigint DEFAULT 0,
	`variance_amount` bigint DEFAULT 0,
	`variance_percentage` decimal(7,2) DEFAULT '0',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_analytic_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_budget_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budget_id` int NOT NULL,
	`budget_line_id` int,
	`budget_period_id` int,
	`month_number` int,
	`alert_type` enum('overrun','underperformance_revenue','missing_actual','budget_not_executed','cashflow_negative','capex_overrun','tax_variance','payroll_variance') NOT NULL,
	`threshold_percentage` int,
	`planned_amount` bigint NOT NULL DEFAULT 0,
	`actual_amount` bigint NOT NULL DEFAULT 0,
	`variance_amount` bigint NOT NULL DEFAULT 0,
	`variance_percentage` int NOT NULL DEFAULT 0,
	`message` text,
	`status` enum('active','acknowledged','resolved') NOT NULL DEFAULT 'active',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_budget_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_budget_cf_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budget_id` int NOT NULL,
	`budget_version_id` int,
	`budget_period_id` int,
	`month_number` int NOT NULL,
	`cash_in_planned` bigint NOT NULL DEFAULT 0,
	`cash_in_actual` bigint NOT NULL DEFAULT 0,
	`cash_out_planned` bigint NOT NULL DEFAULT 0,
	`cash_out_actual` bigint NOT NULL DEFAULT 0,
	`opex_planned` bigint NOT NULL DEFAULT 0,
	`opex_actual` bigint NOT NULL DEFAULT 0,
	`capex_planned` bigint NOT NULL DEFAULT 0,
	`capex_actual` bigint NOT NULL DEFAULT 0,
	`taxes_planned` bigint NOT NULL DEFAULT 0,
	`taxes_actual` bigint NOT NULL DEFAULT 0,
	`net_cf_planned` bigint NOT NULL DEFAULT 0,
	`net_cf_actual` bigint NOT NULL DEFAULT 0,
	`opening_cash_balance` bigint NOT NULL DEFAULT 0,
	`closing_cash_balance` bigint NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_budget_cf_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_budget_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budget_id` int NOT NULL,
	`parent_id` int,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category_type` enum('REVENUE','OPEX','CAPEX','TAX','PAYROLL','DIRECT_COST','INDIRECT_COST','FINANCIAL_RESULT','EXCEPTIONAL_RESULT','CASHFLOW','OTHER') NOT NULL,
	`source_sheet` varchar(100),
	`sort_order` int NOT NULL DEFAULT 0,
	`is_total_line` tinyint NOT NULL DEFAULT 0,
	`accounting_account_id` int,
	`tax_code_id` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_budget_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_budget_import_errors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budget_import_id` int NOT NULL,
	`sheet_name` varchar(100),
	`row_number` int,
	`column_name` varchar(50),
	`error_type` varchar(100) NOT NULL,
	`error_message` text NOT NULL,
	`raw_value` varchar(500),
	`severity` enum('info','warning','error','critical') NOT NULL DEFAULT 'error',
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_budget_import_errors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_budget_imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budget_id` int,
	`file_name` varchar(255) NOT NULL,
	`file_path` varchar(500) NOT NULL,
	`file_size` int NOT NULL DEFAULT 0,
	`import_status` enum('uploaded','analysed','mapped','imported','failed','cancelled') NOT NULL DEFAULT 'uploaded',
	`imported_by` int NOT NULL,
	`imported_at` bigint,
	`detected_sheets_json` json,
	`mapping_summary_json` json,
	`errors_count` int NOT NULL DEFAULT 0,
	`warnings_count` int NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_budget_imports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_budget_integ_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_type` varchar(32) NOT NULL,
	`sync_scope` varchar(32) DEFAULT 'all',
	`budget_id` int,
	`period_id` int,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`started_at` bigint,
	`finished_at` bigint,
	`duration_ms` int,
	`records_processed` int DEFAULT 0,
	`records_created` int DEFAULT 0,
	`records_updated` int DEFAULT 0,
	`warnings_count` int DEFAULT 0,
	`errors_count` int DEFAULT 0,
	`error_message` text,
	`triggered_by` varchar(64),
	`trigger_source` varchar(16) DEFAULT 'system',
	`created_by` int,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_budget_integ_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_budget_line_amounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budget_line_id` int NOT NULL,
	`budget_period_id` int,
	`month_number` int NOT NULL,
	`planned_amount` bigint NOT NULL DEFAULT 0,
	`actual_amount` bigint NOT NULL DEFAULT 0,
	`committed_amount` bigint NOT NULL DEFAULT 0,
	`paid_amount` bigint NOT NULL DEFAULT 0,
	`invoiced_amount` bigint NOT NULL DEFAULT 0,
	`variance_amount` bigint NOT NULL DEFAULT 0,
	`variance_percentage` int NOT NULL DEFAULT 0,
	`execution_rate` int NOT NULL DEFAULT 0,
	`currency` varchar(10) NOT NULL DEFAULT 'XOF',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_budget_line_amounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_budget_lines_v2` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budget_id` int NOT NULL,
	`budget_version_id` int,
	`category_id` int NOT NULL,
	`project_id` int,
	`customer_id` int,
	`vendor_id` int,
	`employee_id` int,
	`department` varchar(100),
	`cost_center` varchar(100),
	`line_code` varchar(50),
	`line_label` varchar(500) NOT NULL,
	`line_type` enum('REVENUE','DIRECT_COST','INDIRECT_COST','OPEX','CAPEX','TAX','PAYROLL','SOCIAL_CHARGES','CASH_IN','CASH_OUT','RESULT','KPI','TOTAL') NOT NULL,
	`source_sheet` varchar(100),
	`source_row_number` int,
	`is_input_line` tinyint NOT NULL DEFAULT 1,
	`is_total_line` tinyint NOT NULL DEFAULT 0,
	`is_calculated_line` tinyint NOT NULL DEFAULT 0,
	`calculation_formula` varchar(500),
	`accounting_account_id` int,
	`tax_code_id` int,
	`comments` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_budget_lines_v2_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_budget_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budget_id` int NOT NULL,
	`fiscal_year` int NOT NULL,
	`period_number` int NOT NULL,
	`period_month` int NOT NULL,
	`period_label` varchar(50) NOT NULL,
	`start_date` bigint,
	`end_date` bigint,
	`status` enum('open','closed','locked') NOT NULL DEFAULT 'open',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_budget_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_budget_pl_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budget_id` int NOT NULL,
	`budget_version_id` int,
	`budget_period_id` int,
	`month_number` int NOT NULL,
	`revenue_planned` bigint NOT NULL DEFAULT 0,
	`revenue_actual` bigint NOT NULL DEFAULT 0,
	`direct_costs_planned` bigint NOT NULL DEFAULT 0,
	`direct_costs_actual` bigint NOT NULL DEFAULT 0,
	`direct_margin_planned` bigint NOT NULL DEFAULT 0,
	`direct_margin_actual` bigint NOT NULL DEFAULT 0,
	`indirect_costs_planned` bigint NOT NULL DEFAULT 0,
	`indirect_costs_actual` bigint NOT NULL DEFAULT 0,
	`ebitda_planned` bigint NOT NULL DEFAULT 0,
	`ebitda_actual` bigint NOT NULL DEFAULT 0,
	`capex_planned` bigint NOT NULL DEFAULT 0,
	`capex_actual` bigint NOT NULL DEFAULT 0,
	`op_cashflow_planned` bigint NOT NULL DEFAULT 0,
	`op_cashflow_actual` bigint NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_budget_pl_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_budget_re_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budget_id` int NOT NULL,
	`budget_version_id` int,
	`budget_line_id` int,
	`program_id` int,
	`project_id` int,
	`unit_type` varchar(64),
	`revenue_recognition_method` varchar(32) NOT NULL DEFAULT 'contract_signed',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_budget_re_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_budget_snapshot_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_type` varchar(50) NOT NULL,
	`budget_id` int,
	`period_id` int,
	`status` varchar(20) NOT NULL DEFAULT 'running',
	`started_at` bigint NOT NULL,
	`finished_at` bigint,
	`duration_ms` int,
	`snapshots_created` int DEFAULT 0,
	`snapshots_updated` int DEFAULT 0,
	`alerts_created` int DEFAULT 0,
	`errors_count` int DEFAULT 0,
	`error_message` text,
	`triggered_by` varchar(100),
	`schedule_cron_task_uid` varchar(65),
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_budget_snapshot_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_budget_tmpl_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_name` varchar(255) NOT NULL,
	`sheet_name` varchar(100) NOT NULL,
	`mapping_type` enum('revenue','charges','investment','pl','cashflow','summary') NOT NULL,
	`header_row` int NOT NULL DEFAULT 1,
	`category_column` varchar(10),
	`line_column` varchar(10),
	`month_start_column` varchar(10),
	`month_end_column` varchar(10),
	`total_column` varchar(10),
	`comments_column` varchar(10),
	`rules_json` json,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_budget_tmpl_mappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_budget_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budget_id` int NOT NULL,
	`version_number` int NOT NULL,
	`version_name` varchar(100) NOT NULL,
	`description` text,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`created_by` int NOT NULL,
	`approved_by` int,
	`approved_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_budget_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_budgets_v2` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budget_code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`fiscal_year` int NOT NULL,
	`company_id` int,
	`currency` varchar(10) NOT NULL DEFAULT 'XOF',
	`status` enum('draft','imported','under_review','approved','locked','revised','archived','cancelled') NOT NULL DEFAULT 'draft',
	`scenario_type` enum('initial_budget','revised_budget','forecast','optimistic','pessimistic','actualized') NOT NULL DEFAULT 'initial_budget',
	`source_file_id` int,
	`created_by` int NOT NULL,
	`approved_by` int,
	`approved_at` bigint,
	`locked_by` int,
	`locked_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_budgets_v2_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_company_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_name` varchar(255) NOT NULL,
	`ncc` varchar(32),
	`rccm` varchar(128),
	`rccm_date` varchar(32),
	`tax_regime` varchar(32),
	`tax_center` varchar(255),
	`address` text,
	`city` varchar(100),
	`postal_box` varchar(64),
	`phone` varchar(32),
	`email` varchar(255),
	`website` varchar(255),
	`bank_references` text,
	`logo_url` varchar(512),
	`invoice_prefix` varchar(16),
	`invoice_next_seq` bigint DEFAULT 1,
	`po_prefix` varchar(16) DEFAULT 'BC',
	`po_next_seq` bigint DEFAULT 1,
	`default_payment_terms` varchar(255) DEFAULT 'Un mois date de dépôt de facture',
	`default_payment_mode` varchar(64) DEFAULT 'Virement',
	`default_tax_rate` int DEFAULT 18,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_company_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_cost_centers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`parent_id` int,
	`manager_id` int,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_cost_centers_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_cost_centers_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_direction_action_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action_number` varchar(32) NOT NULL,
	`review_id` int,
	`alert_id` int,
	`source_module` varchar(64),
	`source_id` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`priority` varchar(16) NOT NULL DEFAULT 'medium',
	`assigned_to` int,
	`due_date` bigint,
	`status` varchar(16) NOT NULL DEFAULT 'open',
	`progress_percentage` int DEFAULT 0,
	`completed_at` bigint,
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_direction_action_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_direction_data_quality_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`check_key` varchar(64) NOT NULL,
	`check_name` varchar(128) NOT NULL,
	`module` varchar(64) NOT NULL,
	`severity` varchar(16) NOT NULL DEFAULT 'medium',
	`status` varchar(16) NOT NULL DEFAULT 'passed',
	`records_count` int DEFAULT 0,
	`details_json` json,
	`last_checked_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_direction_data_quality_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_direction_report_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schedule_id` int,
	`export_id` int,
	`period_id` int,
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`recipients_json` json,
	`sent_at` bigint,
	`error_message` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_direction_report_deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_direction_report_exports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`export_number` varchar(32) NOT NULL,
	`report_type` varchar(32) NOT NULL DEFAULT 'direction_monthly',
	`period_id` int,
	`date_from` bigint,
	`date_to` bigint,
	`filters_json` json,
	`file_path` varchar(512),
	`file_name` varchar(255),
	`file_size` int,
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`generated_by` int,
	`generated_at` bigint,
	`downloaded_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_direction_report_exports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_direction_report_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`frequency` varchar(16) NOT NULL DEFAULT 'monthly',
	`day_of_month` int DEFAULT 1,
	`send_time` varchar(8) DEFAULT '08:00',
	`timezone` varchar(64) DEFAULT 'Africa/Abidjan',
	`recipients_json` json,
	`cc_json` json,
	`include_pdf_attachment` boolean DEFAULT true,
	`include_download_link` boolean DEFAULT true,
	`is_active` boolean DEFAULT true,
	`last_run_at` bigint,
	`next_run_at` bigint,
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_direction_report_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_direction_review_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`review_id` int NOT NULL,
	`section` varchar(64),
	`kpi_key` varchar(64),
	`comment` text NOT NULL,
	`comment_type` varchar(32) NOT NULL DEFAULT 'observation',
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_direction_review_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_direction_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`review_number` varchar(32) NOT NULL,
	`period_id` int,
	`title` varchar(255) NOT NULL,
	`review_date` bigint,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`summary` text,
	`key_risks` text,
	`key_decisions` text,
	`report_export_id` int,
	`created_by` int,
	`approved_by` int,
	`approved_at` bigint,
	`closed_by` int,
	`closed_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_direction_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_re_budget_actuals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budget_id` int NOT NULL,
	`budget_line_id` int,
	`program_id` int,
	`project_id` int,
	`unit_id` int,
	`sale_id` int,
	`customer_id` int,
	`period_month` int NOT NULL,
	`period_year` int NOT NULL,
	`sale_amount` bigint DEFAULT 0,
	`contract_signed_amount` bigint DEFAULT 0,
	`collected_amount` bigint DEFAULT 0,
	`outstanding_amount` bigint DEFAULT 0,
	`recognized_revenue_amount` bigint DEFAULT 0,
	`cost_amount` bigint DEFAULT 0,
	`margin_amount` bigint DEFAULT 0,
	`margin_rate` decimal(7,2) DEFAULT '0',
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`source_sync_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_re_budget_actuals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_sales_clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`short_name` varchar(64),
	`sector` varchar(100),
	`contact_name` varchar(255),
	`contact_email` varchar(255),
	`contact_phone` varchar(32),
	`address` text,
	`tax_id` varchar(64),
	`ncc` varchar(32),
	`tax_regime` varchar(32),
	`rccm` varchar(128),
	`payment_terms_days` int DEFAULT 30,
	`notes` text,
	`is_active` tinyint DEFAULT 1,
	`created_by` int NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_sales_clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_sales_clients_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_sales_order_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`from_status` varchar(32) NOT NULL,
	`to_status` varchar(32) NOT NULL,
	`comment` text,
	`changed_by` int NOT NULL,
	`changed_at` bigint NOT NULL,
	CONSTRAINT `erp_sales_order_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_sales_order_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`line_number` int NOT NULL,
	`description` varchar(500) NOT NULL,
	`quantity` int DEFAULT 1,
	`unit` varchar(32) DEFAULT 'unité',
	`unit_price_ht` bigint NOT NULL,
	`total_ht` bigint NOT NULL,
	`delivery_status` varchar(32) DEFAULT 'pending',
	`delivered_quantity` int DEFAULT 0,
	`notes` text,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_sales_order_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_sales_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(64) NOT NULL,
	`client_id` int NOT NULL,
	`client_ref` varchar(128),
	`subject` varchar(500) NOT NULL,
	`description` text,
	`status` varchar(32) NOT NULL DEFAULT 'received',
	`priority` varchar(16) DEFAULT 'normal',
	`total_ht` bigint DEFAULT 0,
	`tax_rate` int DEFAULT 18,
	`total_ttc` bigint DEFAULT 0,
	`currency` varchar(8) DEFAULT 'XOF',
	`order_date` bigint NOT NULL,
	`expected_delivery_date` bigint,
	`delivered_date` bigint,
	`invoice_id` int,
	`budget_line_id` int,
	`period_id` int,
	`payment_status` varchar(32) DEFAULT 'pending',
	`paid_amount` bigint DEFAULT 0,
	`paid_date` bigint,
	`attachment_url` text,
	`notes` text,
	`created_by` int NOT NULL,
	`assigned_to` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_sales_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_sales_orders_order_number_unique` UNIQUE(`order_number`)
);
--> statement-breakpoint
CREATE TABLE `erp_sales_target_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sales_target_id` int NOT NULL,
	`salesperson_id` int,
	`program_id` int,
	`project_id` int,
	`weight_percentage` decimal(5,2) DEFAULT '100',
	`assigned_target_amount` bigint DEFAULT 0,
	`assigned_target_units` int DEFAULT 0,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_sales_target_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_sales_target_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sales_target_id` int NOT NULL,
	`period_start` bigint NOT NULL,
	`period_end` bigint NOT NULL,
	`actual_amount` bigint DEFAULT 0,
	`actual_units` int DEFAULT 0,
	`actual_margin_amount` bigint DEFAULT 0,
	`collected_amount` bigint DEFAULT 0,
	`reserved_units` int DEFAULT 0,
	`sold_units` int DEFAULT 0,
	`achievement_rate` decimal(7,2) DEFAULT '0',
	`variance_amount` bigint DEFAULT 0,
	`variance_units` int DEFAULT 0,
	`variance_percentage` decimal(7,2) DEFAULT '0',
	`source_sync_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_sales_target_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_sales_targets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`target_code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`fiscal_year` int NOT NULL,
	`period_type` varchar(16) NOT NULL DEFAULT 'monthly',
	`period_month` int,
	`period_quarter` int,
	`program_id` int,
	`project_id` int,
	`salesperson_id` int,
	`unit_type` varchar(64),
	`target_type` varchar(32) NOT NULL,
	`target_amount` bigint DEFAULT 0,
	`target_units` int DEFAULT 0,
	`target_margin_amount` bigint DEFAULT 0,
	`currency` varchar(8) NOT NULL DEFAULT 'XOF',
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`budget_id` int,
	`budget_line_id` int,
	`created_by` int,
	`approved_by` int,
	`approved_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_sales_targets_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_sales_targets_target_code_unique` UNIQUE(`target_code`)
);
--> statement-breakpoint
ALTER TABLE `erp_analytic_allocations` ADD `program_id` int;--> statement-breakpoint
ALTER TABLE `erp_analytic_allocations` ADD `cost_center_id` int;--> statement-breakpoint
ALTER TABLE `erp_analytic_allocations` ADD `budget_id` int;--> statement-breakpoint
ALTER TABLE `erp_analytic_allocations` ADD `budget_line_id` int;--> statement-breakpoint
ALTER TABLE `erp_analytic_allocations` ADD `accounting_entry_id` int;--> statement-breakpoint
ALTER TABLE `erp_analytic_allocations` ADD `accounting_entry_line_id` int;--> statement-breakpoint
ALTER TABLE `erp_analytic_allocations` ADD `currency` varchar(8) DEFAULT 'XOF';--> statement-breakpoint
ALTER TABLE `erp_analytic_allocations` ADD `allocated_amount` bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `erp_expense_lines` ADD `designation` varchar(255);--> statement-breakpoint
ALTER TABLE `erp_expense_lines` ADD `line_date` bigint;--> statement-breakpoint
ALTER TABLE `erp_expense_lines` ADD `attachment_url` text;--> statement-breakpoint
ALTER TABLE `erp_expense_lines` ADD `attachment_key` varchar(512);--> statement-breakpoint
ALTER TABLE `erp_expense_lines` ADD `attachment_name` varchar(255);--> statement-breakpoint
ALTER TABLE `erp_purchase_order_lines` ADD `designation` varchar(255);--> statement-breakpoint
ALTER TABLE `erp_purchase_order_lines` ADD `line_date` bigint;--> statement-breakpoint
ALTER TABLE `erp_purchase_order_lines` ADD `attachment_url` text;--> statement-breakpoint
ALTER TABLE `erp_purchase_order_lines` ADD `attachment_key` varchar(512);--> statement-breakpoint
ALTER TABLE `erp_purchase_order_lines` ADD `attachment_name` varchar(255);--> statement-breakpoint
ALTER TABLE `erp_purchase_orders` ADD `purchase_type` varchar(16) DEFAULT 'OPEX';--> statement-breakpoint
ALTER TABLE `urban_acd_applications` ADD `trackingPassword` varchar(20);--> statement-breakpoint
CREATE INDEX `idx_ai_audit_logs_user` ON `erp_ai_audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_audit_logs_module` ON `erp_ai_audit_logs` (`module`);--> statement-breakpoint
CREATE INDEX `idx_ai_audit_logs_action` ON `erp_ai_audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_ai_audit_logs_created` ON `erp_ai_audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_conversations_user` ON `erp_ai_conversations` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_conversations_module` ON `erp_ai_conversations` (`module`);--> statement-breakpoint
CREATE INDEX `idx_ai_conversations_status` ON `erp_ai_conversations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_ai_doc_extractions_document` ON `erp_ai_document_extractions` (`document_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_doc_extractions_type` ON `erp_ai_document_extractions` (`document_type`);--> statement-breakpoint
CREATE INDEX `idx_ai_doc_extractions_status` ON `erp_ai_document_extractions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_ai_engineering_checks_analysis` ON `erp_ai_engineering_checks` (`plan_analysis_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_engineering_checks_severity` ON `erp_ai_engineering_checks` (`severity`);--> statement-breakpoint
CREATE INDEX `idx_ai_material_takeoffs_analysis` ON `erp_ai_material_takeoffs` (`plan_analysis_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_material_takeoffs_category` ON `erp_ai_material_takeoffs` (`category`);--> statement-breakpoint
CREATE INDEX `idx_ai_messages_conversation` ON `erp_ai_messages` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_plan_analyses_project` ON `erp_ai_plan_analyses` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_plan_analyses_status` ON `erp_ai_plan_analyses` (`analysis_status`);--> statement-breakpoint
CREATE INDEX `idx_ai_plan_elements_analysis` ON `erp_ai_plan_elements` (`plan_analysis_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_plan_elements_type` ON `erp_ai_plan_elements` (`element_type`);--> statement-breakpoint
CREATE INDEX `idx_ai_plan_review_comments_analysis` ON `erp_ai_plan_review_comments` (`plan_analysis_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_recommendations_module` ON `erp_ai_recommendations` (`module`);--> statement-breakpoint
CREATE INDEX `idx_ai_recommendations_status` ON `erp_ai_recommendations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_ai_recommendations_priority` ON `erp_ai_recommendations` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_ai_recommendations_source` ON `erp_ai_recommendations` (`source_type`,`source_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_risk_scores_module` ON `erp_ai_risk_scores` (`module`);--> statement-breakpoint
CREATE INDEX `idx_ai_risk_scores_source` ON `erp_ai_risk_scores` (`source_type`,`source_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_risk_scores_level` ON `erp_ai_risk_scores` (`risk_level`);--> statement-breakpoint
CREATE INDEX `idx_analytic_snap_date` ON `erp_analytic_snapshots` (`snapshot_date`);--> statement-breakpoint
CREATE INDEX `idx_analytic_snap_project` ON `erp_analytic_snapshots` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_analytic_snap_program` ON `erp_analytic_snapshots` (`program_id`);--> statement-breakpoint
CREATE INDEX `idx_analytic_snap_cc` ON `erp_analytic_snapshots` (`cost_center_id`);--> statement-breakpoint
CREATE INDEX `idx_analytic_snap_period` ON `erp_analytic_snapshots` (`period_year`,`period_month`);--> statement-breakpoint
CREATE INDEX `idx_budgetalert_budget` ON `erp_budget_alerts` (`budget_id`);--> statement-breakpoint
CREATE INDEX `idx_budgetalert_status` ON `erp_budget_alerts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_budgetalert_type` ON `erp_budget_alerts` (`alert_type`);--> statement-breakpoint
CREATE INDEX `idx_budgetcf_budget` ON `erp_budget_cf_snapshots` (`budget_id`);--> statement-breakpoint
CREATE INDEX `idx_budgetcf_month` ON `erp_budget_cf_snapshots` (`month_number`);--> statement-breakpoint
CREATE INDEX `idx_budgetcat_budget` ON `erp_budget_categories` (`budget_id`);--> statement-breakpoint
CREATE INDEX `idx_budgetcat_parent` ON `erp_budget_categories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_budgetcat_type` ON `erp_budget_categories` (`category_type`);--> statement-breakpoint
CREATE INDEX `idx_budgetimperr_import` ON `erp_budget_import_errors` (`budget_import_id`);--> statement-breakpoint
CREATE INDEX `idx_budgetimport_budget` ON `erp_budget_imports` (`budget_id`);--> statement-breakpoint
CREATE INDEX `idx_budgetimport_status` ON `erp_budget_imports` (`import_status`);--> statement-breakpoint
CREATE INDEX `idx_integ_jobs_type` ON `erp_budget_integ_jobs` (`job_type`);--> statement-breakpoint
CREATE INDEX `idx_integ_jobs_status` ON `erp_budget_integ_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_integ_jobs_source` ON `erp_budget_integ_jobs` (`trigger_source`);--> statement-breakpoint
CREATE INDEX `idx_budgetamt_line` ON `erp_budget_line_amounts` (`budget_line_id`);--> statement-breakpoint
CREATE INDEX `idx_budgetamt_month` ON `erp_budget_line_amounts` (`month_number`);--> statement-breakpoint
CREATE INDEX `idx_budgetlinev2_budget` ON `erp_budget_lines_v2` (`budget_id`);--> statement-breakpoint
CREATE INDEX `idx_budgetlinev2_cat` ON `erp_budget_lines_v2` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_budgetlinev2_type` ON `erp_budget_lines_v2` (`line_type`);--> statement-breakpoint
CREATE INDEX `idx_budgetperiod_budget` ON `erp_budget_periods` (`budget_id`);--> statement-breakpoint
CREATE INDEX `idx_budgetpl_budget` ON `erp_budget_pl_snapshots` (`budget_id`);--> statement-breakpoint
CREATE INDEX `idx_budgetpl_month` ON `erp_budget_pl_snapshots` (`month_number`);--> statement-breakpoint
CREATE INDEX `idx_bre_links_budget` ON `erp_budget_re_links` (`budget_id`);--> statement-breakpoint
CREATE INDEX `idx_bre_links_program` ON `erp_budget_re_links` (`program_id`);--> statement-breakpoint
CREATE INDEX `idx_snapshotjob_budget` ON `erp_budget_snapshot_jobs` (`budget_id`);--> statement-breakpoint
CREATE INDEX `idx_snapshotjob_status` ON `erp_budget_snapshot_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_snapshotjob_type` ON `erp_budget_snapshot_jobs` (`job_type`);--> statement-breakpoint
CREATE INDEX `idx_budgettmpl_name` ON `erp_budget_tmpl_mappings` (`template_name`);--> statement-breakpoint
CREATE INDEX `idx_budgetver_budget` ON `erp_budget_versions` (`budget_id`);--> statement-breakpoint
CREATE INDEX `idx_budgetv2_year` ON `erp_budgets_v2` (`fiscal_year`);--> statement-breakpoint
CREATE INDEX `idx_budgetv2_status` ON `erp_budgets_v2` (`status`);--> statement-breakpoint
CREATE INDEX `idx_cost_centers_parent` ON `erp_cost_centers` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_cost_centers_active` ON `erp_cost_centers` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_dir_actions_status` ON `erp_direction_action_plans` (`status`);--> statement-breakpoint
CREATE INDEX `idx_dir_actions_assigned` ON `erp_direction_action_plans` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `idx_dir_actions_due` ON `erp_direction_action_plans` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_dir_actions_review` ON `erp_direction_action_plans` (`review_id`);--> statement-breakpoint
CREATE INDEX `idx_dir_dq_check_key` ON `erp_direction_data_quality_checks` (`check_key`);--> statement-breakpoint
CREATE INDEX `idx_dir_dq_status` ON `erp_direction_data_quality_checks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_dir_deliveries_schedule` ON `erp_direction_report_deliveries` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `idx_dir_deliveries_status` ON `erp_direction_report_deliveries` (`status`);--> statement-breakpoint
CREATE INDEX `idx_dir_exports_status` ON `erp_direction_report_exports` (`status`);--> statement-breakpoint
CREATE INDEX `idx_dir_exports_date` ON `erp_direction_report_exports` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_dir_schedules_active` ON `erp_direction_report_schedules` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_dir_review_comments_review` ON `erp_direction_review_comments` (`review_id`);--> statement-breakpoint
CREATE INDEX `idx_dir_reviews_status` ON `erp_direction_reviews` (`status`);--> statement-breakpoint
CREATE INDEX `idx_dir_reviews_period` ON `erp_direction_reviews` (`period_id`);--> statement-breakpoint
CREATE INDEX `idx_re_actuals_budget` ON `erp_re_budget_actuals` (`budget_id`);--> statement-breakpoint
CREATE INDEX `idx_re_actuals_program` ON `erp_re_budget_actuals` (`program_id`);--> statement-breakpoint
CREATE INDEX `idx_re_actuals_sale` ON `erp_re_budget_actuals` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_re_actuals_period` ON `erp_re_budget_actuals` (`period_year`,`period_month`);--> statement-breakpoint
CREATE INDEX `idx_sales_client_name` ON `erp_sales_clients` (`name`);--> statement-breakpoint
CREATE INDEX `idx_sales_client_sector` ON `erp_sales_clients` (`sector`);--> statement-breakpoint
CREATE INDEX `idx_soh_order` ON `erp_sales_order_history` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_sol_order` ON `erp_sales_order_lines` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_so_client` ON `erp_sales_orders` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_so_status` ON `erp_sales_orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_so_order_date` ON `erp_sales_orders` (`order_date`);--> statement-breakpoint
CREATE INDEX `idx_so_invoice` ON `erp_sales_orders` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `idx_st_assign_target` ON `erp_sales_target_assignments` (`sales_target_id`);--> statement-breakpoint
CREATE INDEX `idx_st_assign_sp` ON `erp_sales_target_assignments` (`salesperson_id`);--> statement-breakpoint
CREATE INDEX `idx_st_results_target` ON `erp_sales_target_results` (`sales_target_id`);--> statement-breakpoint
CREATE INDEX `idx_st_results_period` ON `erp_sales_target_results` (`period_start`,`period_end`);--> statement-breakpoint
CREATE INDEX `idx_sales_targets_year` ON `erp_sales_targets` (`fiscal_year`);--> statement-breakpoint
CREATE INDEX `idx_sales_targets_type` ON `erp_sales_targets` (`target_type`);--> statement-breakpoint
CREATE INDEX `idx_sales_targets_status` ON `erp_sales_targets` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sales_targets_program` ON `erp_sales_targets` (`program_id`);--> statement-breakpoint
CREATE INDEX `idx_sales_targets_sp` ON `erp_sales_targets` (`salesperson_id`);--> statement-breakpoint
CREATE INDEX `idx_alloc_program` ON `erp_analytic_allocations` (`program_id`);--> statement-breakpoint
CREATE INDEX `idx_alloc_cc` ON `erp_analytic_allocations` (`cost_center_id`);