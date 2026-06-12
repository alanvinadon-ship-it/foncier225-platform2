/**
 * Adaptateur IDUFCI — Identifiant Unique du Foncier de Côte d'Ivoire
 * 
 * Opérations supportées (Arrêté N°757/MCLU du 24/07/2020) :
 * - Vérification d'un IDUFCI existant
 * - Demande d'attribution
 * - Morcellement
 * - Fusion
 * - Échange d'informations
 * - Révocation
 */

import { getClient } from './http-client';
import type { ApiResponse, GpsPoint, GeometreExpert, DocumentReference } from './types';

// ─── Types IDUFCI ────────────────────────────────────────────────────────────

/** Structure d'un IDUFCI (20 caractères alphanumériques) */
export interface IdufciCode {
  /** Code complet 20 caractères : CI-{region}-{commune}-{secteur}-{numero}{controle} */
  code: string;
  /** Code pays (2 car.) */
  codePays: string;
  /** Code région/district (3 car.) */
  codeRegion: string;
  /** Code commune/sous-préfecture (3 car.) */
  codeCommune: string;
  /** Code secteur/quartier (3 car.) */
  codeSecteur: string;
  /** Numéro séquentiel (5 car.) */
  numeroSequentiel: string;
  /** Code de contrôle/destination (4 car.) */
  codeControle: string;
}

export type IdufciStatut = 'ACTIF' | 'RESERVE' | 'REVOQUE' | 'ELIMINE' | 'FUSIONNE' | 'MORCELE';

export type NatureJuridique =
  | 'TITRE_FONCIER'
  | 'CERTIFICAT_PROPRIETE'
  | 'LETTRE_ATTRIBUTION'
  | 'ARRETE_CONCESSION'
  | 'CERTIFICAT_FONCIER_RURAL'
  | 'PERMIS_OCCUPER'
  | 'NON_DETERMINE';

export interface IdufciParcelle {
  idufci: string;
  statut: IdufciStatut;
  dateAttribution: string;
  localisation: {
    region: string;
    commune: string;
    secteur: string;
    coordonnees?: {
      latitude: number;
      longitude: number;
    };
  };
  superficie: number;
  uniteSurface: 'm2' | 'hectares';
  natureJuridique: NatureJuridique;
  dernierActe?: {
    type: string;
    numero: string;
    date: string;
  };
  qrCodeUrl?: string;
}

export interface IdufciAttributionRequest {
  demandeur: {
    type: 'GEOMETRE_EXPERT' | 'ADMINISTRATION' | 'PROFESSIONNEL';
    agrement?: string;
    nom: string;
  };
  parcelle: {
    commune: string;
    secteur: string;
    coordonnees: GpsPoint[];
    superficie: number;
    natureJuridique: NatureJuridique;
  };
  idempotencyKey: string;
}

export interface IdufciAttributionResponse {
  idufci: string;
  statut: 'ATTRIBUE' | 'RESERVE';
  dateAttribution: string;
  qrCodeUrl: string;
}

export interface IdufciMorcellementRequest {
  idufciParent: string;
  sousParcelles: Array<{
    coordonnees: GpsPoint[];
    superficie: number;
  }>;
  justificatif: DocumentReference;
  geometreExpert: GeometreExpert;
}

export interface IdufciMorcellementResponse {
  idufciParent: string;
  statutParent: 'MORCELE';
  sousParcelles: Array<{
    idufci: string;
    superficie: number;
  }>;
}

export interface IdufciFusionRequest {
  idufciParcelles: string[];
  coordonnees: GpsPoint[];
  superficieResultante: number;
  justificatif: DocumentReference;
  geometreExpert: GeometreExpert;
}

export interface IdufciFusionResponse {
  idufciResultant: string;
  idufciElimines: string[];
  superficie: number;
}

export interface IdufciEchangeRequest {
  idufci: string;
  acteurDemandeur: string;
  motif: string;
}

export interface IdufciEchangeResponse {
  idufci: string;
  informations: {
    proprietaire?: string;
    natureJuridique: NatureJuridique;
    superficie: number;
    derniereTransaction?: {
      type: string;
      date: string;
    };
  };
}

// ─── Service IDUFCI ──────────────────────────────────────────────────────────

export class IdufciAdapter {
  private client = getClient('idufci');

  /**
   * Vérifie l'existence et la validité d'un IDUFCI
   */
  async verifyIdufci(idufci: string, userId?: string): Promise<ApiResponse<IdufciParcelle>> {
    return this.client.request<IdufciParcelle>('GET', `/parcelles/${idufci}`, { userId });
  }

  /**
   * Demande l'attribution d'un nouvel IDUFCI
   */
  async requestAttribution(
    request: IdufciAttributionRequest,
    userId?: string
  ): Promise<ApiResponse<IdufciAttributionResponse>> {
    return this.client.request<IdufciAttributionResponse>('POST', '/attributions', {
      body: request,
      userId,
    });
  }

  /**
   * Demande le morcellement d'une parcelle
   */
  async morcellement(
    request: IdufciMorcellementRequest,
    userId?: string
  ): Promise<ApiResponse<IdufciMorcellementResponse>> {
    return this.client.request<IdufciMorcellementResponse>('POST', '/morcellements', {
      body: request,
      userId,
    });
  }

  /**
   * Demande la fusion de parcelles contiguës
   */
  async fusion(
    request: IdufciFusionRequest,
    userId?: string
  ): Promise<ApiResponse<IdufciFusionResponse>> {
    return this.client.request<IdufciFusionResponse>('POST', '/fusions', {
      body: request,
      userId,
    });
  }

  /**
   * Demande d'échange d'informations sur une parcelle
   */
  async exchange(
    request: IdufciEchangeRequest,
    userId?: string
  ): Promise<ApiResponse<IdufciEchangeResponse>> {
    return this.client.request<IdufciEchangeResponse>('POST', '/echanges', {
      body: request,
      userId,
    });
  }

  /**
   * Vérifie le format d'un code IDUFCI (validation locale)
   */
  static validateFormat(idufci: string): { valid: boolean; parsed?: IdufciCode; error?: string } {
    // Format attendu: 20 caractères alphanumériques
    // Structure: XX-XXX-XXX-XXX-XXXXXAAAA (avec tirets) ou XXXXXXXXXXXXXXXXXX (sans)
    const cleanCode = idufci.replace(/-/g, '');

    if (cleanCode.length !== 20) {
      return { valid: false, error: `Longueur invalide: ${cleanCode.length} caractères (attendu: 20)` };
    }

    if (!/^[A-Z0-9]+$/.test(cleanCode)) {
      return { valid: false, error: 'Caractères invalides (attendu: A-Z, 0-9)' };
    }

    if (!cleanCode.startsWith('CI')) {
      return { valid: false, error: 'Code pays invalide (attendu: CI)' };
    }

    const parsed: IdufciCode = {
      code: idufci,
      codePays: cleanCode.substring(0, 2),
      codeRegion: cleanCode.substring(2, 5),
      codeCommune: cleanCode.substring(5, 8),
      codeSecteur: cleanCode.substring(8, 11),
      numeroSequentiel: cleanCode.substring(11, 16),
      codeControle: cleanCode.substring(16, 20),
    };

    return { valid: true, parsed };
  }

  /**
   * Retourne l'état de santé de la connexion IDUFCI
   */
  getHealth() {
    return this.client.getHealthStatus();
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let instance: IdufciAdapter | null = null;

export function getIdufciAdapter(): IdufciAdapter {
  if (!instance) {
    instance = new IdufciAdapter();
  }
  return instance;
}
