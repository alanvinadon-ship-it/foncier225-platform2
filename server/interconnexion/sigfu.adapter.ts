/**
 * Adaptateur SIGFU — Système Intégré de Gestion du Foncier Urbain
 * 
 * Opérations supportées (Décret N°2021-862) :
 * - Soumission d'une demande d'acte foncier (49 procédures)
 * - Suivi de l'avancement d'une demande
 * - Upload de documents justificatifs
 * - Consultation de la liste des géomètres agréés
 * - Réception de notifications (webhook)
 */

import { getClient } from './http-client';
import type { ApiResponse, Demandeur, GeometreExpert, GpsPoint, DocumentReference } from './types';

// ─── Types SIGFU ─────────────────────────────────────────────────────────────

/** Les 49 procédures du SIGFU regroupées par catégorie */
export type SigfuProcedureCategory =
  | 'IMMATRICULATION'
  | 'MUTATION'
  | 'MORCELLEMENT'
  | 'FUSION'
  | 'ATTESTATION'
  | 'OPPOSITION'
  | 'PURGE_DROITS'
  | 'CONCESSION'
  | 'BAIL'
  | 'CERTIFICAT_PROPRIETE';

export type SigfuProcedureCode =
  | 'IMM_DIRECTE'          // Immatriculation directe
  | 'IMM_CONFIRMATION'     // Immatriculation par confirmation de droits
  | 'MUT_VENTE'            // Mutation par vente
  | 'MUT_DONATION'         // Mutation par donation
  | 'MUT_SUCCESSION'       // Mutation par succession
  | 'MUT_ECHANGE'          // Mutation par échange
  | 'MORC_SIMPLE'          // Morcellement simple
  | 'MORC_JUDICIAIRE'      // Morcellement judiciaire
  | 'FUS_VOLONTAIRE'       // Fusion volontaire
  | 'ATT_VILLAGEOISE'      // Attestation villageoise
  | 'PURGE_COUTUMIERS'     // Purge des droits coutumiers
  | 'CONC_PROVISOIRE'      // Concession provisoire
  | 'CONC_DEFINITIVE'      // Concession définitive
  | 'BAIL_EMPHYTEOTIQUE'   // Bail emphytéotique
  | 'CERT_PROPRIETE';      // Certificat de propriété

export type SigfuDemandeStatut =
  | 'INITIEE'
  | 'EN_VERIFICATION'
  | 'DOCUMENTS_REQUIS'
  | 'EN_INSTRUCTION'
  | 'BORNAGE_PROGRAMME'
  | 'BORNAGE_EFFECTUE'
  | 'PUBLICATION_JO'
  | 'OPPOSITION_EN_COURS'
  | 'COMMISSION_CONSULTATIVE'
  | 'SIGNATURE_MINISTRE'
  | 'DELIVRANCE_ACTE'
  | 'TERMINEE'
  | 'REJETEE'
  | 'ANNULEE';

export interface SigfuDemande {
  numeroDemande: string;
  procedureCode: SigfuProcedureCode;
  statut: SigfuDemandeStatut;
  dateDepot: string;
  dateDerniereModification: string;
  demandeur: Demandeur;
  parcelle: {
    idufci?: string;
    localisation: string;
    commune: string;
    superficie: number;
    coordonnees?: GpsPoint[];
  };
  geometreExpert?: GeometreExpert;
  etapeCourante: SigfuEtape;
  montantFrais: number;
  fraisPayes: boolean;
}

export interface SigfuEtape {
  code: string;
  libelle: string;
  dateDebut: string;
  dateFin?: string;
  responsable?: string;
  observations?: string;
  documentsRequis?: string[];
}

export interface SigfuDocument {
  id: string;
  type: SigfuDocumentType;
  nom: string;
  url: string;
  dateUpload: string;
  statut: 'RECU' | 'VALIDE' | 'REJETE';
  motifRejet?: string;
}

export type SigfuDocumentType =
  | 'PLAN_PARCELLAIRE'
  | 'PV_BORNAGE'
  | 'LETTRE_ATTRIBUTION'
  | 'ACTE_VENTE'
  | 'ACTE_DONATION'
  | 'CERTIFICAT_HEREDITE'
  | 'PIECE_IDENTITE'
  | 'QUITTANCE_PAIEMENT'
  | 'ATTESTATION_VILLAGEOISE'
  | 'PV_PALABRE'
  | 'EXTRAIT_PLAN_CADASTRAL'
  | 'CERTIFICAT_URBANISME'
  | 'AUTRE';

export interface SigfuGeometre {
  agrement: string;
  nom: string;
  prenoms: string;
  telephone: string;
  email?: string;
  cabinet?: string;
  zone: string;
  actif: boolean;
}

// ─── Requêtes ────────────────────────────────────────────────────────────────

export interface SigfuSubmitDemandeRequest {
  procedureCode: SigfuProcedureCode;
  demandeur: Demandeur;
  parcelle: {
    idufci?: string;
    commune: string;
    secteur: string;
    localisation: string;
    superficie: number;
    coordonnees?: GpsPoint[];
  };
  geometreExpert?: {
    agrement: string;
  };
  documents: DocumentReference[];
  idempotencyKey: string;
}

export interface SigfuSubmitDemandeResponse {
  numeroDemande: string;
  statut: SigfuDemandeStatut;
  dateDepot: string;
  montantFrais: number;
  urlPaiement?: string;
  prochainEtape: string;
}

export interface SigfuUploadDocumentRequest {
  numeroDemande: string;
  type: SigfuDocumentType;
  document: DocumentReference;
}

export interface SigfuUploadDocumentResponse {
  documentId: string;
  statut: 'RECU';
  dateReception: string;
}

export interface SigfuNotification {
  type: 'STATUT_CHANGE' | 'DOCUMENT_REQUIS' | 'BORNAGE_PROGRAMME' | 'ACTE_DISPONIBLE' | 'REJET';
  numeroDemande: string;
  ancienStatut?: SigfuDemandeStatut;
  nouveauStatut?: SigfuDemandeStatut;
  message: string;
  dateNotification: string;
  details?: Record<string, unknown>;
}

// ─── Service SIGFU ───────────────────────────────────────────────────────────

export class SigfuAdapter {
  private client = getClient('sigfu');

  /**
   * Soumet une nouvelle demande d'acte foncier au SIGFU
   */
  async submitDemande(
    request: SigfuSubmitDemandeRequest,
    userId?: string
  ): Promise<ApiResponse<SigfuSubmitDemandeResponse>> {
    return this.client.request<SigfuSubmitDemandeResponse>('POST', '/demandes', {
      body: request,
      userId,
    });
  }

  /**
   * Récupère le statut d'une demande en cours
   */
  async getStatut(
    numeroDemande: string,
    userId?: string
  ): Promise<ApiResponse<SigfuDemande>> {
    return this.client.request<SigfuDemande>('GET', `/demandes/${numeroDemande}`, { userId });
  }

  /**
   * Récupère la liste des demandes d'un utilisateur
   */
  async listDemandes(
    params: { telephone?: string; email?: string; page?: number; limit?: number },
    userId?: string
  ): Promise<ApiResponse<{ demandes: SigfuDemande[]; total: number }>> {
    const query = new URLSearchParams();
    if (params.telephone) query.set('telephone', params.telephone);
    if (params.email) query.set('email', params.email);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return this.client.request<{ demandes: SigfuDemande[]; total: number }>(
      'GET',
      `/demandes?${query.toString()}`,
      { userId }
    );
  }

  /**
   * Upload un document justificatif pour une demande
   */
  async uploadDocument(
    request: SigfuUploadDocumentRequest,
    userId?: string
  ): Promise<ApiResponse<SigfuUploadDocumentResponse>> {
    return this.client.request<SigfuUploadDocumentResponse>(
      'POST',
      `/demandes/${request.numeroDemande}/documents`,
      { body: { type: request.type, document: request.document }, userId }
    );
  }

  /**
   * Récupère la liste des documents d'une demande
   */
  async listDocuments(
    numeroDemande: string,
    userId?: string
  ): Promise<ApiResponse<SigfuDocument[]>> {
    return this.client.request<SigfuDocument[]>('GET', `/demandes/${numeroDemande}/documents`, { userId });
  }

  /**
   * Récupère la liste des géomètres experts agréés
   */
  async listGeometres(
    params?: { zone?: string; actif?: boolean },
    userId?: string
  ): Promise<ApiResponse<SigfuGeometre[]>> {
    const query = new URLSearchParams();
    if (params?.zone) query.set('zone', params.zone);
    if (params?.actif !== undefined) query.set('actif', String(params.actif));
    return this.client.request<SigfuGeometre[]>('GET', `/geometres?${query.toString()}`, { userId });
  }

  /**
   * Traite une notification webhook entrante du SIGFU
   */
  static parseWebhookNotification(body: unknown): SigfuNotification | null {
    if (!body || typeof body !== 'object') return null;
    const data = body as Record<string, unknown>;

    if (!data.type || !data.numeroDemande || !data.message) return null;

    return {
      type: data.type as SigfuNotification['type'],
      numeroDemande: data.numeroDemande as string,
      ancienStatut: data.ancienStatut as SigfuDemandeStatut | undefined,
      nouveauStatut: data.nouveauStatut as SigfuDemandeStatut | undefined,
      message: data.message as string,
      dateNotification: (data.dateNotification as string) || new Date().toISOString(),
      details: data.details as Record<string, unknown> | undefined,
    };
  }

  /**
   * Retourne l'état de santé de la connexion SIGFU
   */
  getHealth() {
    return this.client.getHealthStatus();
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let instance: SigfuAdapter | null = null;

export function getSigfuAdapter(): SigfuAdapter {
  if (!instance) {
    instance = new SigfuAdapter();
  }
  return instance;
}
