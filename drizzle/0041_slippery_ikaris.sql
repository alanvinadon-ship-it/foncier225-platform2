CREATE TABLE `erp_budget_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budget_id` int NOT NULL,
	`category` enum('labour','materials','equipment','subcontracting','permits','transport','other') NOT NULL,
	`description` varchar(500),
	`initial_amount` bigint NOT NULL DEFAULT 0,
	`revised_amount` bigint NOT NULL DEFAULT 0,
	`engaged_amount` bigint NOT NULL DEFAULT 0,
	`paid_amount` bigint NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_budget_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` enum('draft','submitted','approved','rejected','revised') NOT NULL DEFAULT 'draft',
	`total_initial` bigint NOT NULL DEFAULT 0,
	`total_revised` bigint NOT NULL DEFAULT 0,
	`total_engaged` bigint NOT NULL DEFAULT 0,
	`total_paid` bigint NOT NULL DEFAULT 0,
	`approved_by` int,
	`approved_at` bigint,
	`created_by` int NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_cash_flows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int,
	`type` enum('inflow','outflow') NOT NULL,
	`category` enum('labour','materials','equipment','subcontracting','permits','transport','client_payment','advance','retention','other') NOT NULL,
	`amount` bigint NOT NULL,
	`description` varchar(500),
	`flow_date` bigint NOT NULL,
	`due_date` bigint,
	`is_paid` boolean NOT NULL DEFAULT false,
	`paid_at` bigint,
	`created_by` int NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_cash_flows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_profitability_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`revenue` bigint NOT NULL DEFAULT 0,
	`direct_costs` bigint NOT NULL DEFAULT 0,
	`indirect_costs` bigint NOT NULL DEFAULT 0,
	`gross_margin` bigint NOT NULL DEFAULT 0,
	`net_margin` bigint NOT NULL DEFAULT 0,
	`gross_margin_percent` int NOT NULL DEFAULT 0,
	`net_margin_percent` int NOT NULL DEFAULT 0,
	`snapshot_date` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_profitability_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_erp_budgetline_budget` ON `erp_budget_lines` (`budget_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_budgetline_category` ON `erp_budget_lines` (`category`);--> statement-breakpoint
CREATE INDEX `idx_erp_budget_project` ON `erp_budgets` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_budget_status` ON `erp_budgets` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_cashflow_project` ON `erp_cash_flows` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_cashflow_type` ON `erp_cash_flows` (`type`);--> statement-breakpoint
CREATE INDEX `idx_erp_cashflow_date` ON `erp_cash_flows` (`flow_date`);--> statement-breakpoint
CREATE INDEX `idx_erp_cashflow_due` ON `erp_cash_flows` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_erp_cashflow_paid` ON `erp_cash_flows` (`is_paid`);--> statement-breakpoint
CREATE INDEX `idx_erp_profit_project` ON `erp_profitability_snapshots` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_profit_date` ON `erp_profitability_snapshots` (`snapshot_date`);