CREATE TABLE `webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` enum('sigfu','sifor') NOT NULL,
	`event_type` varchar(100) NOT NULL,
	`event_id` varchar(100) NOT NULL,
	`reference_number` varchar(100) NOT NULL,
	`previous_status` varchar(50),
	`new_status` varchar(50),
	`payload` json,
	`processed_at` timestamp,
	`citizen_id` int,
	`notification_sent` boolean DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `webhook_event_id_idx` ON `webhook_events` (`event_id`);--> statement-breakpoint
CREATE INDEX `webhook_source_ref_idx` ON `webhook_events` (`source`,`reference_number`);