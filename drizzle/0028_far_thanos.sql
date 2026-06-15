CREATE TABLE `user_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(128) NOT NULL,
	`role` enum('citizen','agent_terrain','agent_mclu','geometre_urbain','conservateur','bank','admin') NOT NULL DEFAULT 'citizen',
	`invited_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	`accepted_at` timestamp,
	`accepted_by_user_id` int,
	CONSTRAINT `user_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `user_invitations` ADD CONSTRAINT `user_invitations_invited_by_users_id_fk` FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_invitations` ADD CONSTRAINT `user_invitations_accepted_by_user_id_users_id_fk` FOREIGN KEY (`accepted_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_inv_email` ON `user_invitations` (`email`);--> statement-breakpoint
CREATE INDEX `idx_inv_token` ON `user_invitations` (`token`);