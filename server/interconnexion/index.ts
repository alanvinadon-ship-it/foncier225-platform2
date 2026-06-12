/**
 * Module d'interconnexion API — Foncier225
 * 
 * Point d'entrée unifié pour les trois adaptateurs :
 * - SIGFU (Foncier Urbain)
 * - IDUFCI (Identifiant Unique Parcelle)
 * - SIFOR-CI (Foncier Rural / AFOR)
 */

// Types partagés
export * from './types';

// Client HTTP commun
export { InterconnexionHttpClient, getClient, getAllHealthStatuses, getAuditLog } from './http-client';

// Adaptateur IDUFCI
export { IdufciAdapter, getIdufciAdapter } from './idufci.adapter';
export type {
  IdufciCode,
  IdufciStatut,
  IdufciParcelle,
  IdufciAttributionRequest,
  IdufciAttributionResponse,
  IdufciMorcellementRequest,
  IdufciMorcellementResponse,
  IdufciFusionRequest,
  IdufciFusionResponse,
  IdufciEchangeRequest,
  IdufciEchangeResponse,
  NatureJuridique,
} from './idufci.adapter';

// Adaptateur SIGFU
export { SigfuAdapter, getSigfuAdapter } from './sigfu.adapter';
export type {
  SigfuProcedureCategory,
  SigfuProcedureCode,
  SigfuDemandeStatut,
  SigfuDemande,
  SigfuEtape,
  SigfuDocument,
  SigfuDocumentType,
  SigfuGeometre,
  SigfuSubmitDemandeRequest,
  SigfuSubmitDemandeResponse,
  SigfuNotification,
} from './sigfu.adapter';

// Adaptateur SIFOR-CI
export { SiforAdapter, getSiforAdapter } from './sifor.adapter';
export type {
  SiforCertificatStatut,
  SiforDelimitationStatut,
  SiforLitigeStatut,
  SiforDroitType,
  SiforCertificat,
  SiforDelimitation,
  SiforLitige,
  SiforDroit,
  SiforEnquete,
  SiforOpposition,
  SiforSubmitCertificatRequest,
  SiforSubmitCertificatResponse,
  SiforSubmitDelimitationRequest,
  SiforSubmitDelimitationResponse,
  SiforDeclareLitigeRequest,
  SiforDeclareLitigeResponse,
  SiforWebhookNotification,
} from './sifor.adapter';
