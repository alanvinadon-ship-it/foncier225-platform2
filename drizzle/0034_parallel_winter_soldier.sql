CREATE TABLE `erp_compliance_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requirement_id` int NOT NULL,
	`checked_by` int,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`comment` text,
	`evidence_url` text,
	`checked_at` bigint,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_compliance_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_compliance_requirements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(64) NOT NULL DEFAULT 'general',
	`priority` varchar(16) NOT NULL DEFAULT 'medium',
	`due_date` bigint,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_compliance_requirements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
