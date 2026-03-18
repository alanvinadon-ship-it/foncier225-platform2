CREATE TABLE `credit_decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creditFileId` int NOT NULL,
	`decisionType` enum('APPROVED','REJECTED') NOT NULL,
	`reason` text,
	`approvedAmount` int,
	`decisionDetails` json,
	`decidedAt` timestamp NOT NULL DEFAULT (now()),
	`decidedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_decisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creditFileId` int NOT NULL,
	`documentType` enum('ID_CARD','PROOF_INCOME','PROOF_RESIDENCE','LAND_TITLE_DEED','BUILDING_PERMIT','INSURANCE_QUOTE') NOT NULL,
	`status` enum('PENDING','UPLOADED','VALIDATED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`fileUrl` varchar(512),
	`fileKey` varchar(256),
	`mimeType` varchar(64),
	`fileSize` int,
	`rejectionReason` text,
	`uploadedAt` timestamp,
	`validatedAt` timestamp,
	`validatedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credit_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_file_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creditFileId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('initiator','co_borrower','guarantor') NOT NULL,
	`consentGiven` boolean NOT NULL DEFAULT false,
	`consentGivenAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_file_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`initiatorId` int NOT NULL,
	`parcelId` int,
	`productType` enum('STANDARD','SIMPLIFIED') NOT NULL DEFAULT 'STANDARD',
	`status` enum('DRAFT','DOCS_PENDING','SUBMITTED','UNDER_REVIEW','OFFERED','ACCEPTED','APPROVED','REJECTED','CLOSED') NOT NULL DEFAULT 'DRAFT',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`submittedAt` timestamp,
	`closedAt` timestamp,
	CONSTRAINT `credit_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_offers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creditFileId` int NOT NULL,
	`bankId` int NOT NULL,
	`amount` int NOT NULL,
	`interestRate` varchar(32) NOT NULL,
	`duration` int NOT NULL,
	`monthlyPayment` int,
	`status` enum('pending','accepted','rejected','expired') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp,
	`acceptedAt` timestamp,
	`rejectedAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credit_offers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creditFileId` int NOT NULL,
	`requestType` enum('DOCUMENT_REQUEST','INFORMATION_REQUEST') NOT NULL,
	`description` text NOT NULL,
	`requestedDocumentTypes` json,
	`status` enum('pending','fulfilled','expired') NOT NULL DEFAULT 'pending',
	`dueDate` timestamp,
	`fulfilledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdById` int,
	CONSTRAINT `credit_requests_id` PRIMARY KEY(`id`)
);
