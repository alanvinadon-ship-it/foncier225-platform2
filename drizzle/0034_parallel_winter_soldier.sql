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
CREATE TABLE `erp_dashboard_widgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`widget_key` varchar(64) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`is_visible` boolean NOT NULL DEFAULT true,
	`settings_json` json,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_dashboard_widgets_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_erp_widget_user_key` UNIQUE(`user_id`,`widget_key`)
);
--> statement-breakpoint
CREATE TABLE `erp_document_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_id` int NOT NULL,
	`version` int NOT NULL,
	`file_url` text NOT NULL,
	`file_key` varchar(512) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`mime_type` varchar(128),
	`file_size` int DEFAULT 0,
	`uploaded_by` int,
	`comment` text,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_document_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int,
	`title` varchar(255) NOT NULL,
	`type` varchar(64) NOT NULL DEFAULT 'autre',
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`file_url` text,
	`file_key` varchar(512),
	`file_name` varchar(255),
	`mime_type` varchar(128),
	`file_size` int DEFAULT 0,
	`issued_at` bigint,
	`expires_at` bigint,
	`uploaded_by` int,
	`validated_by` int,
	`validated_at` bigint,
	`rejected_by` int,
	`rejected_at` bigint,
	`rejection_reason` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_equipment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(64) NOT NULL,
	`brand` varchar(128),
	`model` varchar(128),
	`serial_number` varchar(128),
	`status` varchar(32) NOT NULL DEFAULT 'available',
	`purchase_date` bigint,
	`purchase_price` bigint,
	`current_value` bigint,
	`location` varchar(255),
	`image_url` text,
	`project_id` int,
	`next_maintenance_at` bigint,
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_equipment_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_equipment_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_equipment_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`project_id` int NOT NULL,
	`allocated_by` int,
	`allocated_at` bigint NOT NULL,
	`released_at` bigint,
	`released_by` int,
	`notes` text,
	CONSTRAINT `erp_equipment_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_equipment_maintenance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`description` text,
	`scheduled_at` bigint NOT NULL,
	`completed_at` bigint,
	`cost` bigint,
	`performed_by` varchar(255),
	`status` varchar(32) NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`created_by` int,
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_equipment_maintenance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`planned_date` bigint NOT NULL,
	`actual_date` bigint,
	`status` varchar(32) NOT NULL DEFAULT 'planned',
	`impact_level` varchar(16) NOT NULL DEFAULT 'medium',
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`module` varchar(64) NOT NULL,
	`action` varchar(64) NOT NULL,
	`display_name` varchar(128) NOT NULL,
	`description` text,
	CONSTRAINT `erp_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_erp_perm_module_action` UNIQUE(`module`,`action`)
);
--> statement-breakpoint
CREATE TABLE `erp_permits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int,
	`type` varchar(64) NOT NULL,
	`reference` varchar(128),
	`description` text,
	`issued_by` varchar(255),
	`issued_at` bigint,
	`expires_at` bigint,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`validated_by` int,
	`validated_at` bigint,
	`rejected_by` int,
	`rejected_at` bigint,
	`rejection_reason` text,
	`alert_days_before` int DEFAULT 30,
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_permits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`client_name` varchar(255),
	`location` varchar(500),
	`start_date` bigint,
	`planned_end_date` bigint,
	`actual_end_date` bigint,
	`initial_budget` bigint DEFAULT 0,
	`revised_budget` bigint DEFAULT 0,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`priority` varchar(16) NOT NULL DEFAULT 'medium',
	`progress_percentage` int NOT NULL DEFAULT 0,
	`project_manager_id` int,
	`created_by` int,
	`updated_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_erp_project_code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `erp_role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role_id` int NOT NULL,
	`permission_id` int NOT NULL,
	CONSTRAINT `erp_role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_erp_role_perm` UNIQUE(`role_id`,`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `erp_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`display_name` varchar(128) NOT NULL,
	`description` text,
	`is_system` boolean NOT NULL DEFAULT false,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `erp_task_dependencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_id` int NOT NULL,
	`depends_on_task_id` int NOT NULL,
	`dependency_type` varchar(32) NOT NULL DEFAULT 'finish_to_start',
	`created_at` bigint NOT NULL,
	CONSTRAINT `erp_task_dependencies_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_erp_task_dep` UNIQUE(`task_id`,`depends_on_task_id`)
);
--> statement-breakpoint
CREATE TABLE `erp_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`parent_task_id` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`assigned_to` int,
	`start_date` bigint,
	`due_date` bigint,
	`completed_at` bigint,
	`priority` varchar(16) NOT NULL DEFAULT 'medium',
	`status` varchar(32) NOT NULL DEFAULT 'todo',
	`progress_percentage` int NOT NULL DEFAULT 0,
	`estimated_hours` int DEFAULT 0,
	`actual_hours` int DEFAULT 0,
	`created_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`deleted_at` bigint,
	CONSTRAINT `erp_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_user_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`role_id` int NOT NULL,
	`assigned_at` bigint NOT NULL,
	`assigned_by` int,
	CONSTRAINT `erp_user_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_erp_user_role` UNIQUE(`user_id`,`role_id`)
);
--> statement-breakpoint
ALTER TABLE `erp_compliance_checks` ADD CONSTRAINT `erp_compliance_checks_requirement_id_erp_compliance_requirements_id_fk` FOREIGN KEY (`requirement_id`) REFERENCES `erp_compliance_requirements`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_compliance_checks` ADD CONSTRAINT `erp_compliance_checks_checked_by_users_id_fk` FOREIGN KEY (`checked_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_compliance_requirements` ADD CONSTRAINT `erp_compliance_requirements_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_compliance_requirements` ADD CONSTRAINT `erp_compliance_requirements_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_dashboard_widgets` ADD CONSTRAINT `erp_dashboard_widgets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_document_versions` ADD CONSTRAINT `erp_document_versions_document_id_erp_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `erp_documents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_document_versions` ADD CONSTRAINT `erp_document_versions_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_documents` ADD CONSTRAINT `erp_documents_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_documents` ADD CONSTRAINT `erp_documents_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_documents` ADD CONSTRAINT `erp_documents_validated_by_users_id_fk` FOREIGN KEY (`validated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_documents` ADD CONSTRAINT `erp_documents_rejected_by_users_id_fk` FOREIGN KEY (`rejected_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_equipment` ADD CONSTRAINT `erp_equipment_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_equipment` ADD CONSTRAINT `erp_equipment_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_equipment_allocations` ADD CONSTRAINT `erp_equipment_allocations_equipment_id_erp_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `erp_equipment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_equipment_allocations` ADD CONSTRAINT `erp_equipment_allocations_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_equipment_allocations` ADD CONSTRAINT `erp_equipment_allocations_allocated_by_users_id_fk` FOREIGN KEY (`allocated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_equipment_allocations` ADD CONSTRAINT `erp_equipment_allocations_released_by_users_id_fk` FOREIGN KEY (`released_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_equipment_maintenance` ADD CONSTRAINT `erp_equipment_maintenance_equipment_id_erp_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `erp_equipment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_equipment_maintenance` ADD CONSTRAINT `erp_equipment_maintenance_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_milestones` ADD CONSTRAINT `erp_milestones_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_milestones` ADD CONSTRAINT `erp_milestones_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_permits` ADD CONSTRAINT `erp_permits_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_permits` ADD CONSTRAINT `erp_permits_validated_by_users_id_fk` FOREIGN KEY (`validated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_permits` ADD CONSTRAINT `erp_permits_rejected_by_users_id_fk` FOREIGN KEY (`rejected_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_permits` ADD CONSTRAINT `erp_permits_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_projects` ADD CONSTRAINT `erp_projects_project_manager_id_users_id_fk` FOREIGN KEY (`project_manager_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_projects` ADD CONSTRAINT `erp_projects_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_projects` ADD CONSTRAINT `erp_projects_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_role_permissions` ADD CONSTRAINT `erp_role_permissions_role_id_erp_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `erp_roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_role_permissions` ADD CONSTRAINT `erp_role_permissions_permission_id_erp_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `erp_permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_task_dependencies` ADD CONSTRAINT `erp_task_dependencies_task_id_erp_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `erp_tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_task_dependencies` ADD CONSTRAINT `erp_task_dependencies_depends_on_task_id_erp_tasks_id_fk` FOREIGN KEY (`depends_on_task_id`) REFERENCES `erp_tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_tasks` ADD CONSTRAINT `erp_tasks_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_tasks` ADD CONSTRAINT `erp_tasks_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_tasks` ADD CONSTRAINT `erp_tasks_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_user_roles` ADD CONSTRAINT `erp_user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_user_roles` ADD CONSTRAINT `erp_user_roles_role_id_erp_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `erp_roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_user_roles` ADD CONSTRAINT `erp_user_roles_assigned_by_users_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_erp_compcheck_req` ON `erp_compliance_checks` (`requirement_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_compcheck_by` ON `erp_compliance_checks` (`checked_by`);--> statement-breakpoint
CREATE INDEX `idx_erp_compcheck_status` ON `erp_compliance_checks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_compreq_project` ON `erp_compliance_requirements` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_compreq_category` ON `erp_compliance_requirements` (`category`);--> statement-breakpoint
CREATE INDEX `idx_erp_compreq_status` ON `erp_compliance_requirements` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_compreq_due` ON `erp_compliance_requirements` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_erp_compreq_deleted` ON `erp_compliance_requirements` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_erp_widget_user` ON `erp_dashboard_widgets` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_docver_document` ON `erp_document_versions` (`document_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_docver_version` ON `erp_document_versions` (`document_id`,`version`);--> statement-breakpoint
CREATE INDEX `idx_erp_doc_project` ON `erp_documents` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_doc_type` ON `erp_documents` (`type`);--> statement-breakpoint
CREATE INDEX `idx_erp_doc_status` ON `erp_documents` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_doc_expires` ON `erp_documents` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_erp_doc_deleted` ON `erp_documents` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_erp_equip_status` ON `erp_equipment` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_equip_category` ON `erp_equipment` (`category`);--> statement-breakpoint
CREATE INDEX `idx_erp_equip_project` ON `erp_equipment` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_equip_code` ON `erp_equipment` (`code`);--> statement-breakpoint
CREATE INDEX `idx_erp_equip_alloc_equip` ON `erp_equipment_allocations` (`equipment_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_equip_alloc_project` ON `erp_equipment_allocations` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_equip_maint_equip` ON `erp_equipment_maintenance` (`equipment_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_equip_maint_status` ON `erp_equipment_maintenance` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_equip_maint_sched` ON `erp_equipment_maintenance` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `idx_erp_milestone_project` ON `erp_milestones` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_milestone_status` ON `erp_milestones` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_milestone_planned` ON `erp_milestones` (`planned_date`);--> statement-breakpoint
CREATE INDEX `idx_erp_milestone_deleted` ON `erp_milestones` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_erp_perm_module` ON `erp_permissions` (`module`);--> statement-breakpoint
CREATE INDEX `idx_erp_permit_project` ON `erp_permits` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_permit_type` ON `erp_permits` (`type`);--> statement-breakpoint
CREATE INDEX `idx_erp_permit_status` ON `erp_permits` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_permit_expires` ON `erp_permits` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_erp_permit_deleted` ON `erp_permits` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_erp_project_status` ON `erp_projects` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_project_manager` ON `erp_projects` (`project_manager_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_project_deleted` ON `erp_projects` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_erp_rp_role` ON `erp_role_permissions` (`role_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_rp_perm` ON `erp_role_permissions` (`permission_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_dep_task` ON `erp_task_dependencies` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_dep_depends` ON `erp_task_dependencies` (`depends_on_task_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_task_project` ON `erp_tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_task_assigned` ON `erp_tasks` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `idx_erp_task_status` ON `erp_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_erp_task_due` ON `erp_tasks` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_erp_task_deleted` ON `erp_tasks` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_erp_ur_user` ON `erp_user_roles` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_ur_role` ON `erp_user_roles` (`role_id`);