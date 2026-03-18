ALTER TABLE `verify_tokens`
  MODIFY COLUMN `tokenType` enum('insurance','mediation','notary','export','parcel','document') NOT NULL;

ALTER TABLE `attestations`
  MODIFY COLUMN `parcelId` int NULL,
  ADD COLUMN `creditFileId` int NULL,
  ADD COLUMN `decisionId` int NULL,
  ADD COLUMN `documentId` int NULL,
  ADD COLUMN `documentRef` varchar(64) NULL,
  ADD COLUMN `finalDecisionType` enum('APPROVED','REJECTED') NULL,
  ADD COLUMN `verifyCode` varchar(128) NULL,
  ADD COLUMN `checksumSha256` varchar(64) NULL,
  ADD COLUMN `fileUrl` varchar(512) NULL,
  ADD COLUMN `fileKey` varchar(256) NULL;

ALTER TABLE `attestations`
  ADD CONSTRAINT `attestations_creditFileId_credit_files_id_fk`
    FOREIGN KEY (`creditFileId`) REFERENCES `credit_files`(`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `attestations_decisionId_credit_decisions_id_fk`
    FOREIGN KEY (`decisionId`) REFERENCES `credit_decisions`(`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `attestations_documentId_documents_id_fk`
    FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE SET NULL;

CREATE INDEX `idx_attestations_credit_file` ON `attestations` (`creditFileId`);
CREATE INDEX `idx_attestations_decision` ON `attestations` (`decisionId`);
