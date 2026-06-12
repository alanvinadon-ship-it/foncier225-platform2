ALTER TABLE `payments` ADD `provider` enum('cinetpay','tresorpay') DEFAULT 'cinetpay' NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `taxType` enum('liasse_afor','frais_geometre','taxe_immatriculation','frais_dossier','other') DEFAULT 'frais_dossier' NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `providerTransactionId` varchar(128);--> statement-breakpoint
ALTER TABLE `payments` ADD `providerMetadata` text;--> statement-breakpoint
CREATE INDEX `idx_pay_provider` ON `payments` (`provider`);