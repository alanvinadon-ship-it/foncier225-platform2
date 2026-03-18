CREATE TABLE `generated_documents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `documentType` enum('PARCEL_PDF','DOSSIER_PDF','FINAL_CREDIT_ATTESTATION') NOT NULL,
  `reference` varchar(64) NOT NULL,
  `parcelId` int NULL,
  `creditFileId` int NULL,
  `attestationId` int NULL,
  `generatedByUserId` int NULL,
  `verifyTokenId` int NULL,
  `checksumSha256` varchar(64) NOT NULL,
  `fileUrl` varchar(512) NOT NULL,
  `fileKey` varchar(256) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `metadataJson` json NULL,
  CONSTRAINT `generated_documents_id` PRIMARY KEY(`id`),
  CONSTRAINT `generated_documents_reference_unique` UNIQUE(`reference`),
  CONSTRAINT `generated_documents_parcelId_parcels_id_fk` FOREIGN KEY (`parcelId`) REFERENCES `parcels`(`id`) ON DELETE SET NULL,
  CONSTRAINT `generated_documents_creditFileId_credit_files_id_fk` FOREIGN KEY (`creditFileId`) REFERENCES `credit_files`(`id`) ON DELETE SET NULL,
  CONSTRAINT `generated_documents_attestationId_attestations_id_fk` FOREIGN KEY (`attestationId`) REFERENCES `attestations`(`id`) ON DELETE SET NULL,
  CONSTRAINT `generated_documents_generatedByUserId_users_id_fk` FOREIGN KEY (`generatedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `generated_documents_verifyTokenId_verify_tokens_id_fk` FOREIGN KEY (`verifyTokenId`) REFERENCES `verify_tokens`(`id`) ON DELETE SET NULL
);

CREATE INDEX `idx_generated_documents_type` ON `generated_documents` (`documentType`);
CREATE INDEX `idx_generated_documents_parcel` ON `generated_documents` (`parcelId`);
CREATE INDEX `idx_generated_documents_credit_file` ON `generated_documents` (`creditFileId`);
CREATE INDEX `idx_generated_documents_verify` ON `generated_documents` (`verifyTokenId`);
