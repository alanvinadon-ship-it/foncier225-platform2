CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dossierType` enum('land_title','urban_acd','credit') NOT NULL,
	`dossierId` int NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(5) NOT NULL DEFAULT 'XOF',
	`method` enum('orange_money','mtn_momo','wave','card','bank_transfer') NOT NULL,
	`status` enum('pending','processing','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`reference` varchar(64) NOT NULL,
	`transactionId` varchar(128),
	`description` varchar(255),
	`phoneNumber` varchar(30),
	`failureReason` text,
	`paidAt` bigint,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_pay_user` ON `payments` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_pay_status` ON `payments` (`status`);--> statement-breakpoint
CREATE INDEX `idx_pay_reference` ON `payments` (`reference`);--> statement-breakpoint
CREATE INDEX `idx_pay_dossier` ON `payments` (`dossierType`,`dossierId`);