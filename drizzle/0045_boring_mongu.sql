CREATE TABLE `erp_customer_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payment_number` varchar(32) NOT NULL,
	`sale_id` int NOT NULL,
	`customer_id` int NOT NULL,
	`installment_id` int,
	`payment_date` bigint NOT NULL,
	`amount` bigint NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'XOF',
	`payment_method` varchar(32) NOT NULL,
	`payment_account_id` int,
	`reference` varchar(128),
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`receipt_document_id` int,
	`created_by` int,
	`validated_by` int,
	`validated_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_customer_payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_customer_payments_payment_number_unique` UNIQUE(`payment_number`)
);
--> statement-breakpoint
CREATE TABLE `erp_real_estate_buildings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`program_id` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`building_type` varchar(32) NOT NULL,
	`number_of_floors` int DEFAULT 0,
	`number_of_units` int DEFAULT 0,
	`description` text,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_real_estate_buildings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_real_estate_customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_number` varchar(32) NOT NULL,
	`customer_type` varchar(16) NOT NULL,
	`first_name` varchar(128),
	`last_name` varchar(128),
	`company_name` varchar(255),
	`email` varchar(255),
	`phone` varchar(32),
	`address` text,
	`nationality` varchar(64),
	`id_document_type` varchar(32),
	`id_document_number` varchar(64),
	`tax_identification_number` varchar(32),
	`source` varchar(64),
	`status` varchar(32) NOT NULL DEFAULT 'prospect',
	`assigned_salesperson_id` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_real_estate_customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_real_estate_customers_customer_number_unique` UNIQUE(`customer_number`)
);
--> statement-breakpoint
CREATE TABLE `erp_real_estate_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`delivery_number` varchar(32) NOT NULL,
	`sale_id` int NOT NULL,
	`unit_id` int NOT NULL,
	`customer_id` int NOT NULL,
	`delivery_date` bigint,
	`delivered_by` int,
	`received_by_name` varchar(255),
	`status` varchar(32) NOT NULL DEFAULT 'planned',
	`handover_document_id` int,
	`remarks` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_real_estate_deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_real_estate_deliveries_delivery_number_unique` UNIQUE(`delivery_number`)
);
--> statement-breakpoint
CREATE TABLE `erp_real_estate_delivery_reserves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`delivery_id` int NOT NULL,
	`description` text NOT NULL,
	`severity` varchar(16) NOT NULL,
	`responsible_user_id` int,
	`due_date` bigint,
	`status` varchar(32) NOT NULL DEFAULT 'open',
	`resolved_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_real_estate_delivery_reserves_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_real_estate_installments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payment_plan_id` int NOT NULL,
	`sale_id` int NOT NULL,
	`installment_number` int NOT NULL,
	`due_date` bigint NOT NULL,
	`amount_due` bigint NOT NULL,
	`amount_paid` bigint DEFAULT 0,
	`balance_due` bigint NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`invoice_id` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_real_estate_installments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_real_estate_payment_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sale_id` int NOT NULL,
	`plan_name` varchar(128) NOT NULL,
	`total_amount` bigint NOT NULL,
	`initial_deposit_amount` bigint DEFAULT 0,
	`number_of_installments` int NOT NULL,
	`frequency` varchar(32) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_real_estate_payment_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_real_estate_programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`project_id` int,
	`location` varchar(255),
	`developer_name` varchar(255),
	`start_date` bigint,
	`planned_delivery_date` bigint,
	`actual_delivery_date` bigint,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`total_units` int NOT NULL DEFAULT 0,
	`available_units` int NOT NULL DEFAULT 0,
	`reserved_units` int NOT NULL DEFAULT 0,
	`sold_units` int NOT NULL DEFAULT 0,
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_real_estate_programs_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_real_estate_programs_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_real_estate_reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reservation_number` varchar(32) NOT NULL,
	`unit_id` int NOT NULL,
	`customer_id` int NOT NULL,
	`reservation_date` bigint NOT NULL,
	`expiry_date` bigint,
	`reservation_amount` bigint DEFAULT 0,
	`currency` varchar(8) NOT NULL DEFAULT 'XOF',
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`payment_id` int,
	`document_id` int,
	`created_by` int,
	`approved_by` int,
	`approved_at` bigint,
	`cancelled_by` int,
	`cancelled_at` bigint,
	`cancellation_reason` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_real_estate_reservations_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_real_estate_reservations_reservation_number_unique` UNIQUE(`reservation_number`)
);
--> statement-breakpoint
CREATE TABLE `erp_real_estate_sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sale_number` varchar(32) NOT NULL,
	`program_id` int,
	`unit_id` int NOT NULL,
	`customer_id` int NOT NULL,
	`reservation_id` int,
	`sale_date` bigint,
	`contract_date` bigint,
	`base_price` bigint NOT NULL,
	`discount_amount` bigint DEFAULT 0,
	`extra_fees_amount` bigint DEFAULT 0,
	`tax_amount` bigint DEFAULT 0,
	`total_sale_amount` bigint NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'XOF',
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`contract_document_id` int,
	`notary_name` varchar(255),
	`notary_contact` varchar(128),
	`salesperson_id` int,
	`approved_by` int,
	`approved_at` bigint,
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_real_estate_sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_real_estate_sales_sale_number_unique` UNIQUE(`sale_number`)
);
--> statement-breakpoint
CREATE TABLE `erp_real_estate_units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`program_id` int NOT NULL,
	`building_id` int,
	`project_id` int,
	`unit_code` varchar(32) NOT NULL,
	`unit_type` varchar(32) NOT NULL,
	`floor_number` int,
	`door_number` varchar(16),
	`lot_number` varchar(32),
	`title` varchar(255) NOT NULL,
	`description` text,
	`surface_area` decimal(10,2),
	`land_area` decimal(10,2),
	`number_of_rooms` int,
	`number_of_bedrooms` int,
	`number_of_bathrooms` int,
	`has_parking` boolean DEFAULT false,
	`parking_number` varchar(16),
	`base_price` bigint,
	`current_price` bigint,
	`currency` varchar(8) NOT NULL DEFAULT 'XOF',
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`availability_date` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_real_estate_units_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_real_estate_units_unit_code_unique` UNIQUE(`unit_code`)
);
--> statement-breakpoint
CREATE TABLE `erp_sales_commissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sale_id` int NOT NULL,
	`salesperson_id` int NOT NULL,
	`commission_type` varchar(32) NOT NULL,
	`commission_rate` decimal(5,2),
	`commission_amount` bigint NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`approved_by` int,
	`approved_at` bigint,
	`paid_at` bigint,
	`expense_id` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_sales_commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_re_cpay_sale` ON `erp_customer_payments` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_re_cpay_customer` ON `erp_customer_payments` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_re_cpay_status` ON `erp_customer_payments` (`status`);--> statement-breakpoint
CREATE INDEX `idx_re_bldg_program` ON `erp_real_estate_buildings` (`program_id`);--> statement-breakpoint
CREATE INDEX `idx_re_cust_status` ON `erp_real_estate_customers` (`status`);--> statement-breakpoint
CREATE INDEX `idx_re_cust_type` ON `erp_real_estate_customers` (`customer_type`);--> statement-breakpoint
CREATE INDEX `idx_re_cust_sales` ON `erp_real_estate_customers` (`assigned_salesperson_id`);--> statement-breakpoint
CREATE INDEX `idx_re_deliv_sale` ON `erp_real_estate_deliveries` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_re_deliv_unit` ON `erp_real_estate_deliveries` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_re_deliv_status` ON `erp_real_estate_deliveries` (`status`);--> statement-breakpoint
CREATE INDEX `idx_re_dreserve_deliv` ON `erp_real_estate_delivery_reserves` (`delivery_id`);--> statement-breakpoint
CREATE INDEX `idx_re_inst_plan` ON `erp_real_estate_installments` (`payment_plan_id`);--> statement-breakpoint
CREATE INDEX `idx_re_inst_sale` ON `erp_real_estate_installments` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_re_inst_status` ON `erp_real_estate_installments` (`status`);--> statement-breakpoint
CREATE INDEX `idx_re_inst_due` ON `erp_real_estate_installments` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_re_plan_sale` ON `erp_real_estate_payment_plans` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_re_prog_status` ON `erp_real_estate_programs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_re_prog_project` ON `erp_real_estate_programs` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_re_resv_unit` ON `erp_real_estate_reservations` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_re_resv_customer` ON `erp_real_estate_reservations` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_re_resv_status` ON `erp_real_estate_reservations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_re_sale_unit` ON `erp_real_estate_sales` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_re_sale_customer` ON `erp_real_estate_sales` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_re_sale_status` ON `erp_real_estate_sales` (`status`);--> statement-breakpoint
CREATE INDEX `idx_re_sale_program` ON `erp_real_estate_sales` (`program_id`);--> statement-breakpoint
CREATE INDEX `idx_re_unit_program` ON `erp_real_estate_units` (`program_id`);--> statement-breakpoint
CREATE INDEX `idx_re_unit_building` ON `erp_real_estate_units` (`building_id`);--> statement-breakpoint
CREATE INDEX `idx_re_unit_status` ON `erp_real_estate_units` (`status`);--> statement-breakpoint
CREATE INDEX `idx_re_unit_type` ON `erp_real_estate_units` (`unit_type`);--> statement-breakpoint
CREATE INDEX `idx_re_comm_sale` ON `erp_sales_commissions` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_re_comm_sales` ON `erp_sales_commissions` (`salesperson_id`);--> statement-breakpoint
CREATE INDEX `idx_re_comm_status` ON `erp_sales_commissions` (`status`);