/**
 * Credit Checklist Service
 * Manages document completeness rules and checklist logic
 */

import { getDb } from "./db";
import { creditDocuments } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  CreditProductType,
  CreditDocumentType,
  CreditDocumentStatus,
  REQUIRED_DOCUMENTS_BY_PRODUCT,
} from "@shared/credit-types";

export class CreditChecklistService {
  /**
   * Get required document types for a product
   */
  static getRequiredDocumentTypes(productType: CreditProductType): CreditDocumentType[] {
    return REQUIRED_DOCUMENTS_BY_PRODUCT[productType] ?? [];
  }

  /**
   * Get optional document types for a product
   */
  static getOptionalDocumentTypes(productType: CreditProductType): CreditDocumentType[] {
    if (productType === CreditProductType.SIMPLIFIED) {
      return [CreditDocumentType.PROOF_INCOME];
    }
    return [];
  }

  /**
   * Get all expected documents (required + optional) for a product
   */
  static getAllExpectedDocumentTypes(productType: CreditProductType): CreditDocumentType[] {
    const required = this.getRequiredDocumentTypes(productType);
    const optional = this.getOptionalDocumentTypes(productType);
    const combined = [...required, ...optional];
    return Array.from(new Set(combined));
  }

  /**
   * Get uploaded documents for a credit file
   */
  static async getUploadedDocumentTypes(creditFileId: number): Promise<CreditDocumentType[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const docs = await db
      .select()
      .from(creditDocuments)
      .where(eq(creditDocuments.creditFileId, creditFileId));

    return docs
      .filter((doc: any) => doc.status === CreditDocumentStatus.UPLOADED || doc.status === CreditDocumentStatus.VALIDATED)
      .map((doc: any) => doc.documentType as CreditDocumentType);
  }

  /**
   * Get missing required documents for a credit file
   */
  static async getMissingRequiredDocuments(
    creditFileId: number,
    productType: CreditProductType
  ): Promise<CreditDocumentType[]> {
    const required = this.getRequiredDocumentTypes(productType);
    const uploaded = await this.getUploadedDocumentTypes(creditFileId);

    return required.filter((docType) => !uploaded.includes(docType));
  }

  /**
   * Check if a credit file is complete (all required documents uploaded)
   */
  static async isCreditFileComplete(
    creditFileId: number,
    productType: CreditProductType
  ): Promise<boolean> {
    const missing = await this.getMissingRequiredDocuments(creditFileId, productType);
    return missing.length === 0;
  }

  /**
   * Get checklist status for a credit file
   */
  static async getChecklistStatus(creditFileId: number, productType: CreditProductType) {
    const required = this.getRequiredDocumentTypes(productType);
    const optional = this.getOptionalDocumentTypes(productType);
    const uploaded = await this.getUploadedDocumentTypes(creditFileId);
    const missing = await this.getMissingRequiredDocuments(creditFileId, productType);

    const requiredCount = required.length;
    const uploadedRequiredCount = required.filter((doc) => uploaded.includes(doc)).length;
    const optionalCount = optional.length;
    const uploadedOptionalCount = optional.filter((doc) => uploaded.includes(doc)).length;

    return {
      isComplete: missing.length === 0,
      requiredDocuments: {
        total: requiredCount,
        uploaded: uploadedRequiredCount,
        missing: missing.filter((doc) => required.includes(doc)),
      },
      optionalDocuments: {
        total: optionalCount,
        uploaded: uploadedOptionalCount,
        missing: optional.filter((doc) => !uploaded.includes(doc)),
      },
      completionPercentage: Math.round((uploadedRequiredCount / requiredCount) * 100),
    };
  }

  /**
   * Get all documents for a credit file with their status
   */
  static async getAllDocumentsStatus(creditFileId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const docs = await db
      .select()
      .from(creditDocuments)
      .where(eq(creditDocuments.creditFileId, creditFileId));

    return docs.map((doc: any) => ({
      id: doc.id,
      documentType: doc.documentType,
      status: doc.status,
      fileUrl: doc.fileUrl,
      uploadedAt: doc.uploadedAt,
      validatedAt: doc.validatedAt,
      rejectionReason: doc.rejectionReason,
    }));
  }
}
