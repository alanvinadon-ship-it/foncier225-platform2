CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(255),
	`phone` varchar(30),
	`emailStatusChange` boolean NOT NULL DEFAULT true,
	`smsStatusChange` boolean NOT NULL DEFAULT false,
	`emailDocumentUpdate` boolean NOT NULL DEFAULT true,
	`smsDocumentUpdate` boolean NOT NULL DEFAULT false,
	`emailOpposition` boolean NOT NULL DEFAULT true,
	`smsOpposition` boolean NOT NULL DEFAULT true,
	`emailGeneral` boolean NOT NULL DEFAULT true,
	`smsGeneral` boolean NOT NULL DEFAULT false,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_np_user` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD CONSTRAINT `notification_preferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_np_user` ON `notification_preferences` (`userId`);