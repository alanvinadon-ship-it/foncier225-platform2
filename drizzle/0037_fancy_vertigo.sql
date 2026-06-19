CREATE TABLE `erp_performance_ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rateable_type` varchar(32) NOT NULL,
	`rateable_id` int NOT NULL,
	`project_id` int,
	`quality_score` int NOT NULL,
	`delay_score` int NOT NULL,
	`cost_score` int NOT NULL,
	`safety_score` int NOT NULL,
	`compliance_score` int NOT NULL,
	`communication_score` int NOT NULL,
	`overall_score` int NOT NULL,
	`comment` text,
	`rated_by` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `erp_performance_ratings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `erp_performance_ratings` ADD CONSTRAINT `erp_performance_ratings_project_id_erp_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `erp_projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `erp_performance_ratings` ADD CONSTRAINT `erp_performance_ratings_rated_by_users_id_fk` FOREIGN KEY (`rated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_erp_perf_ratings_rateable` ON `erp_performance_ratings` (`rateable_type`,`rateable_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_perf_ratings_project` ON `erp_performance_ratings` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_erp_perf_ratings_overall` ON `erp_performance_ratings` (`overall_score`);