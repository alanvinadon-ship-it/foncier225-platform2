/**
 * Adaptateur SIFOR-CI — Système d'Information du Foncier Rural
 * 
 * Opérations supportées (Ordonnance N°2025-85, AFOR) :
 * - Demande de certificat foncier rural
 * - Suivi de la procédure de certification
 * - Délimitation des territoires de villages
 * - Gestion des enquêtes foncières
 * - Consultation du registre des droits coutumiers
 * - Gestion des litiges fonciers ruraux
 * 
 * Modules SIFOR-CI (8 modules) :
 * 1. Gestion des territoires de villages
 * 2. Enquêtes foncières rurales
 * 3. Certification foncière
 * 4. Registre des droits
 * 5. Gestion des litiges
 * 6. Cartographie/SIG
 * 7. Statistiques et reporting
 * 8. Administration et paramétrage
 */

import { getClient } from './http-client';
import type { ApiResponse, Demandeur, GpsPoint, GeoPolygon, DocumentReference } from './types';

// ─── Types SIFOR-CI ──────────────────────────────────────────────────────────

export type SiforCertificatStatut =
  | 'DEMANDE_DEPOSEE'
  | 'ENQUETE_PROGRAMMEE'
  | 'ENQUETE_EN_COURS'
  | 'PV_ENQUETE_REDIGE'
  | 'OPPOSITION_OUVERTE'
  | 'OPPOSITION_RESOLUE'
  | 'COMMISSION_FONCIERE'
  | 'VALIDATION_PREFET'
  | 'IMMATRICULATION_REGISTRE'
  | 'CERTIFICAT_DELIVRE'
  | 'REJETE'
  | 'ANNULE';

export type SiforDelimitationStatut =
  | 'INITIALISATION'
  | 'COLLECTE_DONNEES'
  | 'VALIDATION_COMMUNAUTAIRE'
  | 'RECONNAISSANCE_OFFICIELLE'
  | 'ENREGISTREMENT'
  | 'SYNCHRONISE';

export type SiforLitigeStatut =
  | 'DECLARE'
  | 'INSTRUCTION'
  | 'MEDIATION'
  | 'CONCILIATION'
  | 'ARBITRAGE'
  | 'RESOLU'
  | 'TRANSFERE_JUSTICE';

export type SiforDroitType =
  | 'PROPRIETE_COUTUMIERE'
  | 'USAGE'
  | 'PASSAGE'
  | 'PATURAGE'
  | 'CULTURE'
  | 'HABITATION';

export interface SiforCertificat {
  numeroCertificat: string;
  statut: SiforCertificatStatut;
  dateDepot: string;
  dateDerniereModification: string;
  demandeur: Demandeur;
  parcelle: {
    village: string;
    sousPrefecture: string;
    departement: string;
    region: string;
    superficie: number;
    coordonnees: GpsPoint[];
    polygone?: GeoPolygon;
  };
  droitRevendique: SiforDroitType;
  etapeCourante: {
    code: string;
    libelle: string;
    dateDebut: string;
    responsable?: string;
  };
  oppositions?: SiforOpposition[];
  enquete?: SiforEnquete;
}

export interface SiforOpposition {
  id: string;
  opposant: Demandeur;
  motif: string;
  dateDepot: string;
  statut: 'EN_COURS' | 'RESOLUE' | 'REJETEE';
  resolution?: string;
}

export interface SiforEnquete {
  id: string;
  dateDebut: string;
  dateFin?: string;
  enqueteur: string;
  statut: 'PROGRAMMEE' | 'EN_COURS' | 'TERMINEE';
  resultat?: 'FAVORABLE' | 'DEFAVORABLE' | 'RESERVE';
  observations?: string;
  temoins?: Array<{
    nom: string;
    qualite: string;
    declaration?: string;
  }>;
}

export interface SiforDelimitation {
  id: string;
  village: string;
  sousPrefecture: string;
  statut: SiforDelimitationStatut;
  dateCreation: string;
  superficie: number;
  perimetre: number;
  points: GpsPoint[];
  polygone: GeoPolygon;
  chefVillage?: string;
  pvAssemblee?: DocumentReference;
}

export interface SiforLitige {
  id: string;
  statut: SiforLitigeStatut;
  dateDeclaration: string;
  parties: Array<{
    role: 'DEMANDEUR' | 'DEFENDEUR';
    identite: Demandeur;
  }>;
  objet: string;
  localisation: {
    village: string;
    sousPrefecture: string;
  };
  mediateur?: string;
  resolution?: {
    type: 'ACCORD_AMIABLE' | 'DECISION_COMMISSION' | 'JUGEMENT';
    date: string;
    description: string;
  };
}

export interface SiforDroit {
  id: string;
  type: SiforDroitType;
  titulaire: Demandeur;
  parcelle: {
    village: string;
    superficie: number;
    coordonnees?: GpsPoint[];
  };
  dateEnregistrement: string;
  source: 'ENQUETE' | 'CERTIFICAT' | 'HERITAGE' | 'ACHAT';
  actif: boolean;
}

// ─── Requêtes ────────────────────────────────────────────────────────────────

export interface SiforSubmitCertificatRequest {
  demandeur: Demandeur;
  parcelle: {
    village: string;
    sousPrefecture: string;
    departement: string;
    superficie: number;
    coordonnees: GpsPoint[];
  };
  droitRevendique: SiforDroitType;
  documents: DocumentReference[];
  temoins?: Array<{
    nom: string;
    qualite: string;
    telephone?: string;
  }>;
  idempotencyKey: string;
}

export interface SiforSubmitCertificatResponse {
  numeroCertificat: string;
  statut: SiforCertificatStatut;
  dateDepot: string;
  prochainEtape: string;
  montantFrais: number;
}

export interface SiforSubmitDelimitationRequest {
  village: string;
  sousPrefecture: string;
  chefVillage: string;
  points: GpsPoint[];
  pvAssemblee: DocumentReference;
  participantsAssemblee: number;
  idempotencyKey: string;
}

export interface SiforSubmitDelimitationResponse {
  delimitationId: string;
  statut: SiforDelimitationStatut;
  dateCreation: string;
  superficie: number;
  perimetre: number;
}

export interface SiforDeclareLitigeRequest {
  demandeur: Demandeur;
  defendeur: Demandeur;
  objet: string;
  localisation: {
    village: string;
    sousPrefecture: string;
    coordonnees?: GpsPoint[];
  };
  documents?: DocumentReference[];
  idempotencyKey: string;
}

export interface SiforDeclareLitigeResponse {
  litigeId: string;
  statut: SiforLitigeStatut;
  dateDeclaration: string;
  mediateurAssigne?: string;
}

// ─── Service SIFOR-CI ────────────────────────────────────────────────────────

export class SiforAdapter {
  private client = getClient('sifor');

  // ─── Certificats fonciers ────────────────────────────────────────────────

  /**
   * Soumet une demande de certificat foncier rural
   */
  async submitCertificat(
    request: SiforSubmitCertificatRequest,
    userId?: string
  ): Promise<ApiResponse<SiforSubmitCertificatResponse>> {
    return this.client.request<SiforSubmitCertificatResponse>('POST', '/certificats', {
      body: request,
      userId,
    });
  }

  /**
   * Récupère le statut d'une demande de certificat
   */
  async getCertificatStatut(
    numeroCertificat: string,
    userId?: string
  ): Promise<ApiResponse<SiforCertificat>> {
    return this.client.request<SiforCertificat>('GET', `/certificats/${numeroCertificat}`, { userId });
  }

  /**
   * Liste les certificats d'un demandeur
   */
  async listCertificats(
    params: { telephone?: string; village?: string; page?: number; limit?: number },
    userId?: string
  ): Promise<ApiResponse<{ certificats: SiforCertificat[]; total: number }>> {
    const query = new URLSearchParams();
    if (params.telephone) query.set('telephone', params.telephone);
    if (params.village) query.set('village', params.village);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return this.client.request<{ certificats: SiforCertificat[]; total: number }>(
      'GET',
      `/certificats?${query.toString()}`,
      { userId }
    );
  }

  // ─── Délimitations villageoises ──────────────────────────────────────────

  /**
   * Soumet une délimitation de territoire villageois
   */
  async submitDelimitation(
    request: SiforSubmitDelimitationRequest,
    userId?: string
  ): Promise<ApiResponse<SiforSubmitDelimitationResponse>> {
    return this.client.request<SiforSubmitDelimitationResponse>('POST', '/delimitations', {
      body: request,
      userId,
    });
  }

  /**
   * Récupère le statut d'une délimitation
   */
  async getDelimitationStatut(
    delimitationId: string,
    userId?: string
  ): Promise<ApiResponse<SiforDelimitation>> {
    return this.client.request<SiforDelimitation>('GET', `/delimitations/${delimitationId}`, { userId });
  }

  /**
   * Liste les délimitations par sous-préfecture
   */
  async listDelimitations(
    params: { sousPrefecture?: string; statut?: SiforDelimitationStatut; page?: number },
    userId?: string
  ): Promise<ApiResponse<{ delimitations: SiforDelimitation[]; total: number }>> {
    const query = new URLSearchParams();
    if (params.sousPrefecture) query.set('sousPrefecture', params.sousPrefecture);
    if (params.statut) query.set('statut', params.statut);
    if (params.page) query.set('page', String(params.page));
    return this.client.request<{ delimitations: SiforDelimitation[]; total: number }>(
      'GET',
      `/delimitations?${query.toString()}`,
      { userId }
    );
  }

  // ─── Litiges ─────────────────────────────────────────────────────────────

  /**
   * Déclare un litige foncier rural
   */
  async declareLitige(
    request: SiforDeclareLitigeRequest,
    userId?: string
  ): Promise<ApiResponse<SiforDeclareLitigeResponse>> {
    return this.client.request<SiforDeclareLitigeResponse>('POST', '/litiges', {
      body: request,
      userId,
    });
  }

  /**
   * Récupère le statut d'un litige
   */
  async getLitigeStatut(
    litigeId: string,
    userId?: string
  ): Promise<ApiResponse<SiforLitige>> {
    return this.client.request<SiforLitige>('GET', `/litiges/${litigeId}`, { userId });
  }

  /**
   * Liste les litiges par localisation
   */
  async listLitiges(
    params: { village?: string; sousPrefecture?: string; statut?: SiforLitigeStatut },
    userId?: string
  ): Promise<ApiResponse<{ litiges: SiforLitige[]; total: number }>> {
    const query = new URLSearchParams();
    if (params.village) query.set('village', params.village);
    if (params.sousPrefecture) query.set('sousPrefecture', params.sousPrefecture);
    if (params.statut) query.set('statut', params.statut);
    return this.client.request<{ litiges: SiforLitige[]; total: number }>(
      'GET',
      `/litiges?${query.toString()}`,
      { userId }
    );
  }

  // ─── Registre des droits ─────────────────────────────────────────────────

  /**
   * Consulte les droits enregistrés sur une parcelle
   */
  async getDroitsParcelle(
    params: { village: string; coordonnees?: GpsPoint },
    userId?: string
  ): Promise<ApiResponse<SiforDroit[]>> {
    const query = new URLSearchParams();
    query.set('village', params.village);
    if (params.coordonnees) {
      query.set('lat', String(params.coordonnees.latitude));
      query.set('lng', String(params.coordonnees.longitude));
    }
    return this.client.request<SiforDroit[]>('GET', `/droits?${query.toString()}`, { userId });
  }

  // ─── Notifications webhook ───────────────────────────────────────────────

  /**
   * Parse une notification webhook entrante du SIFOR-CI
   */
  static parseWebhookNotification(body: unknown): SiforWebhookNotification | null {
    if (!body || typeof body !== 'object') return null;
    const data = body as Record<string, unknown>;

    if (!data.eventType || !data.referenceId) return null;

    return {
      eventType: data.eventType as SiforWebhookNotification['eventType'],
      referenceId: data.referenceId as string,
      referenceType: (data.referenceType as 'certificat' | 'delimitation' | 'litige') || 'certificat',
      ancienStatut: data.ancienStatut as string | undefined,
      nouveauStatut: data.nouveauStatut as string | undefined,
      message: (data.message as string) || '',
      timestamp: (data.timestamp as string) || new Date().toISOString(),
    };
  }

  /**
   * Retourne l'état de santé de la connexion SIFOR-CI
   */
  getHealth() {
    return this.client.getHealthStatus();
  }
}

export interface SiforWebhookNotification {
  eventType: 'STATUT_CHANGE' | 'ENQUETE_PROGRAMMEE' | 'OPPOSITION_DEPOSEE' | 'CERTIFICAT_DELIVRE' | 'LITIGE_RESOLU';
  referenceId: string;
  referenceType: 'certificat' | 'delimitation' | 'litige';
  ancienStatut?: string;
  nouveauStatut?: string;
  message: string;
  timestamp: string;
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let instance: SiforAdapter | null = null;

export function getSiforAdapter(): SiforAdapter {
  if (!instance) {
    instance = new SiforAdapter();
  }
  return instance;
}
