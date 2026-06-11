CREATE TABLE `citizen_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('status_change','document_verified','document_rejected','opposition_filed','general') NOT NULL DEFAULT 'general',
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`relatedModule` enum('land_title','credit','delimitation','general') NOT NULL DEFAULT 'general',
	`relatedEntityId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `citizen_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `citizen_notifications` ADD CONSTRAINT `citizen_notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_cn_user` ON `citizen_notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_cn_user_read` ON `citizen_notifications` (`userId`,`isRead`);--> statement-breakpoint
CREATE INDEX `idx_cn_module` ON `citizen_notifications` (`relatedModule`);