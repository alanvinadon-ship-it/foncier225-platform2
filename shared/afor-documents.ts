/**
 * Constantes de la liasse foncière AFOR — Phase 1 (Certificat Foncier)
 * Coût réglementaire : 10 000 FCFA
 *
 * Catégories de documents :
 * - identite : Pièces d'identité du demandeur
 * - propriete_historique : Documents de propriété et historique foncier
 * - mandat : Documents de mandat (gestion familiale/collective)
 * - formulaire_officiel : Formulaires officiels de la liasse AFOR
 * - technique : Pièces techniques (opérateur foncier)
 * - complementaire : Pièces complémentaires (litiges, concessions)
 */

export type DocumentCategory =
  | "identite"
  | "propriete_historique"
  | "mandat"
  | "formulaire_officiel"
  | "technique"
  | "complementaire";

export type ApplicantProfile = "individuel" | "groupement" | "personne_morale";

export interface AforDocumentSpec {
  documentType: string;
  category: DocumentCategory;
  label: string;
  description: string;
  required: boolean;
  /** Applicable profiles (empty = all profiles) */
  profiles: ApplicantProfile[];
  acceptedMimeTypes: string[];
}

// ─── Formulaires Officiels (Liasse AFOR) ───────────────────────────────

const FORMULAIRES_OFFICIELS: AforDocumentSpec[] = [
  {
    documentType: "demande_enquete_officielle",
    category: "formulaire_officiel",
    label: "Demande d'Enquête Officielle",
    description:
      "Adressée au Sous-Préfet (Président du CSPGFR). Précise l'identité complète du demandeur et la désignation sommaire de la parcelle.",
    required: true,
    profiles: [],
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
  {
    documentType: "declaration_demandeur",
    category: "formulaire_officiel",
    label: "Déclaration du Demandeur",
    description:
      "Questionnaire détaillé sur l'historique de la terre, signé par le requérant.",
    required: true,
    profiles: [],
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
  {
    documentType: "fiche_demographique",
    category: "formulaire_officiel",
    label: "Fiche Démographique",
    description:
      "Document visant à recenser l'ensemble des personnes et ayants droit concernés par le foncier.",
    required: true,
    profiles: [],
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
];

// ─── Pièces d'Identité ─────────────────────────────────────────────────

const PIECES_IDENTITE: AforDocumentSpec[] = [
  {
    documentType: "cni_passeport",
    category: "identite",
    label: "CNI / Passeport / Attestation d'identité",
    description:
      "Photocopie de la Pièce Nationale d'Identité, du passeport ou de l'attestation d'identité en cours de validité.",
    required: true,
    profiles: ["individuel"],
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
  {
    documentType: "liste_detenteurs_droits",
    category: "identite",
    label: "Liste des détenteurs de droits coutumiers",
    description:
      "Liste exhaustive et nominative de tous les détenteurs des droits coutumiers concernés.",
    required: true,
    profiles: ["groupement"],
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
  {
    documentType: "designation_gestionnaire",
    category: "identite",
    label: "Désignation du Gestionnaire de la terre",
    description:
      "Document officiel désignant le gestionnaire de la terre pour le groupement familial ou communautaire.",
    required: true,
    profiles: ["groupement"],
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
  {
    documentType: "statuts_entite",
    category: "identite",
    label: "Statuts de l'entité juridique",
    description:
      "Statuts de la société ou de l'association, dûment enregistrés.",
    required: true,
    profiles: ["personne_morale"],
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
  {
    documentType: "rccm",
    category: "identite",
    label: "Registre du Commerce (RCCM)",
    description:
      "Extrait du Registre du Commerce et du Crédit Mobilier.",
    required: true,
    profiles: ["personne_morale"],
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
  {
    documentType: "piece_representant_legal",
    category: "identite",
    label: "Pièce d'identité du représentant légal",
    description:
      "CNI ou passeport du représentant légal de la personne morale.",
    required: true,
    profiles: ["personne_morale"],
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
];

// ─── Pièces Techniques ──────────────────────────────────────────────────

const PIECES_TECHNIQUES: AforDocumentSpec[] = [
  {
    documentType: "choix_operateur_technique",
    category: "technique",
    label: "Choix de l'Opérateur Technique",
    description:
      "Fiche spécifiant le nom du géomètre ou de l'opérateur technique agréé sélectionné sur la liste officielle du Ministère de l'Agriculture.",
    required: true,
    profiles: [],
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
];

// ─── Pièces de Propriété / Historique ───────────────────────────────────

const PIECES_PROPRIETE: AforDocumentSpec[] = [
  {
    documentType: "etat_droits_anterieurs",
    category: "propriete_historique",
    label: "État des droits de propriété antérieurs",
    description:
      "Tout acte de concession, arrêté d'occupation temporaire ou document administratif déjà accordé par l'État sur la parcelle.",
    required: false,
    profiles: [],
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
];

// ─── Documents de Mandat ────────────────────────────────────────────────

const PIECES_MANDAT: AforDocumentSpec[] = [
  {
    documentType: "procuration_mandat",
    category: "mandat",
    label: "Procuration / Mandat de gestion",
    description:
      "Procuration ou mandat officiel en cas de gestion familiale ou collective de la terre.",
    required: false,
    profiles: ["groupement"],
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
];

// ─── Pièces Complémentaires ─────────────────────────────────────────────

const PIECES_COMPLEMENTAIRES: AforDocumentSpec[] = [
  {
    documentType: "dossier_litiges",
    category: "complementaire",
    label: "Dossier des litiges connus",
    description:
      "Si la terre fait l'objet d'un différend connu, les déclarations écrites et signées des différentes parties en conflit.",
    required: false,
    profiles: [],
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
];

// ─── Export consolidé ───────────────────────────────────────────────────

export const AFOR_DOCUMENT_SPECS: AforDocumentSpec[] = [
  ...FORMULAIRES_OFFICIELS,
  ...PIECES_IDENTITE,
  ...PIECES_TECHNIQUES,
  ...PIECES_PROPRIETE,
  ...PIECES_MANDAT,
  ...PIECES_COMPLEMENTAIRES,
];

/** Get documents required for a specific applicant profile */
export function getRequiredDocumentsForProfile(profile: ApplicantProfile): AforDocumentSpec[] {
  return AFOR_DOCUMENT_SPECS.filter(
    doc => doc.profiles.length === 0 || doc.profiles.includes(profile)
  );
}

/** Get documents grouped by category for a specific profile */
export function getDocumentsByCategory(profile: ApplicantProfile): Record<DocumentCategory, AforDocumentSpec[]> {
  const docs = getRequiredDocumentsForProfile(profile);
  const grouped: Record<DocumentCategory, AforDocumentSpec[]> = {
    formulaire_officiel: [],
    identite: [],
    technique: [],
    propriete_historique: [],
    mandat: [],
    complementaire: [],
  };
  for (const doc of docs) {
    grouped[doc.category].push(doc);
  }
  return grouped;
}

/** Category display labels */
export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  formulaire_officiel: "Formulaires officiels (Liasse AFOR)",
  identite: "Pièces d'identité",
  technique: "Pièces techniques",
  propriete_historique: "Propriété & Historique",
  mandat: "Mandat / Gestion collective",
  complementaire: "Pièces complémentaires",
};

/** Category descriptions */
export const CATEGORY_DESCRIPTIONS: Record<DocumentCategory, string> = {
  formulaire_officiel: "Formulaires contenus dans la liasse AFOR (10 000 FCFA)",
  identite: "Documents d'identité selon votre profil de demandeur",
  technique: "Choix de l'opérateur technique agréé",
  propriete_historique: "Documents attestant de droits antérieurs sur la parcelle",
  mandat: "Documents de procuration en cas de gestion familiale ou collective",
  complementaire: "Pièces supplémentaires si applicables (litiges, concessions)",
};

/** Profile display labels */
export const PROFILE_LABELS: Record<ApplicantProfile, string> = {
  individuel: "Personne physique (Individuel)",
  groupement: "Groupement informel (Famille / Communauté)",
  personne_morale: "Personne morale (Société / Association)",
};
