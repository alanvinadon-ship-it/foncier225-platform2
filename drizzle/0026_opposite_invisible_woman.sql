CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`citizen_id` int NOT NULL,
	`agent_id` int,
	`subject` varchar(255) NOT NULL,
	`status` enum('open','assigned','closed') NOT NULL DEFAULT 'open',
	`dossier_type` enum('land_title','urban_acd','credit','general') DEFAULT 'general',
	`dossier_id` int,
	`last_message_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversation_id` int NOT NULL,
	`sender_id` int NOT NULL,
	`sender_role` enum('citizen','agent','system') NOT NULL,
	`content` text NOT NULL,
	`attachment_url` varchar(512),
	`attachment_name` varchar(255),
	`read_at` bigint,
	`created_at` bigint NOT NULL,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_citizen_id_users_id_fk` FOREIGN KEY (`citizen_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_agent_id_users_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_conv_citizen` ON `conversations` (`citizen_id`);--> statement-breakpoint
CREATE INDEX `idx_conv_agent` ON `conversations` (`agent_id`);--> statement-breakpoint
CREATE INDEX `idx_conv_status` ON `conversations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_conv_last_msg` ON `conversations` (`last_message_at`);--> statement-breakpoint
CREATE INDEX `idx_msg_conversation` ON `messages` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_msg_sender` ON `messages` (`sender_id`);--> statement-breakpoint
CREATE INDEX `idx_msg_created` ON `messages` (`created_at`);