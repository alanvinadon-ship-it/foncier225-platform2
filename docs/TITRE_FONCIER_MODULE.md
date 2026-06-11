# Module Titre Foncier — Documentation Technique

**Version** : 2.0  
**Date** : 11 juin 2026  
**Auteur** : Manus AI  
**Statut** : Conception initiale

---

## 1. Vue d'ensemble

Le module Titre Foncier implémente la procédure complète d'obtention d'un titre de propriété foncière rurale en Côte d'Ivoire, telle que définie par la **loi n° 98-750 du 23 décembre 1998** (modifiée en 2004 et 2013) et le **décret n° 2023-238 du 5 avril 2023**. Ce processus est supervisé par l'Agence Foncière Rurale (AFOR) et se divise en deux phases successives obligatoires.

La première phase aboutit à la délivrance d'un **Certificat Foncier (CF)**, qui constate et valide juridiquement les droits coutumiers sur la terre. La seconde phase transforme ce certificat en un **Titre Foncier (TF)** inscrit au Livre Foncier, conférant un droit de propriété définitif et inattaquable.

---

## 2. Cadre juridique

| Texte | Objet | Référence |
|:---|:---|:---|
| Loi n° 98-750 du 23/12/1998 | Domaine foncier rural | Modifiée par lois 2004-412 et 2013-655 |
| Décret n° 2023-238 du 05/04/2023 | Procédures d'immatriculation des terres du domaine foncier rural | [opf.gouv.ci](https://opf.gouv.ci/storage/documents/decret-n2023-238-du-05-avril-2023-determinant-les-procedures-dimmatriculation-des-terres-du-domaine-foncier-rural.pdf) |
| Ordonnance n° 2025-85 du 12/02/2025 | Création du SIFOR-CI | Système d'Information du Foncier Rural |
| Décret n° 2016-590 du 03/08/2016 | Création de l'AFOR | Agence Foncière Rurale |

---

## 3. Architecture du workflow

### 3.1 Phase 1 — Certificat Foncier (CF)

Le parcours d'obtention du Certificat Foncier comprend 4 étapes séquentielles :

```
[Dépôt demande] → [Délimitation/Constat] → [Enquête/Publicité] → [Validation/Signature CF]
```

**Étape 1 — Dépôt de la demande**

Le demandeur achète la liasse foncière officielle et adresse sa demande d'enquête au Sous-Préfet de la localité concernée. Le dossier contient l'identité complète du demandeur et une description sommaire du terrain coutumier. Un numéro de dossier est attribué.

**Étape 2 — Délimitation et constat des limites**

Le demandeur choisit un opérateur technique agréé (géomètre) qui réalise un plan précis de la parcelle et dresse un constat des limites en présence de tous les voisins limitrophes. Cette étape est cruciale pour prévenir les contestations futures.

**Étape 3 — Enquête officielle et publicité**

Un commissaire-enquêteur nommé par l'administration mène une enquête sur le terrain. Les résultats sont affichés publiquement à la sous-préfecture et au village pendant une période réglementaire (généralement 3 mois) pour permettre d'éventuelles oppositions.

**Étape 4 — Validation et signature du Certificat Foncier**

Le Comité Sous-Préfectoral de Gestion Foncière Rurale (CSPGFR) analyse et valide le dossier. Le dossier est ensuite transmis à l'AFOR qui prépare le document final et le soumet à la signature du Préfet de Département.

### 3.2 Phase 2 — Immatriculation et Titre Foncier (TF)

Le détenteur du Certificat Foncier dispose d'un **délai légal de 10 ans** pour engager l'immatriculation. Passé ce délai, la terre retourne dans le domaine de l'État.

> **Restriction de nationalité** : Seules les personnes de nationalité ivoirienne peuvent immatriculer une terre rurale en leur nom propre. Les non-ivoiriens peuvent immatriculer au nom de l'État puis conclure un bail emphytéotique.

```
[Certificat Foncier] → [Dépôt DD-Agriculture] → [Instruction AFOR] → [Arrêté Ministériel] → [Livre Foncier]
```

**Étape 1 — Demande d'immatriculation**

Le demandeur retire un modèle de requête auprès de la Direction Départementale de l'Agriculture. Il dépose la requête remplie, accompagnée d'une copie de sa pièce d'identité et de l'original de son Certificat Foncier. Un récépissé de dépôt lui est remis.

**Étape 2 — Contrôle par l'AFOR**

La Direction Départementale transmet le dossier à l'AFOR pour vérification administrative et technique. L'AFOR prépare un projet d'Arrêté de Propriété Foncière Rurale (APFR).

**Étape 3 — Signature ministérielle**

L'Arrêté de Propriété Foncière Rurale est transmis à Abidjan pour être officiellement signé par le Ministre chargé de l'Agriculture.

**Étape 4 — Inscription au Livre Foncier**

Après signature de l'arrêté, l'AFOR transmet le dossier complet au Conservateur de la Propriété Foncière et des Hypothèques de la zone géographique concernée. Le Conservateur inscrit définitivement la terre dans les registres officiels, crée le Titre Foncier et délivre un exemplaire officiel au propriétaire.

---

## 4. Machine d'états

### 4.1 Statuts Phase 1 (Certificat Foncier)

| Statut | Code | Description |
|:---|:---|:---|
| Brouillon | `cf_draft` | Dossier en cours de préparation |
| Demande déposée | `cf_submitted` | Demande enregistrée auprès du Sous-Préfet |
| Délimitation en cours | `cf_delimitation` | Opérateur technique mandaté, levé en cours |
| Délimitation terminée | `cf_delimited` | Plan et constat des limites réalisés |
| Enquête en cours | `cf_inquiry` | Commissaire-enquêteur nommé, enquête terrain |
| Publicité en cours | `cf_publicity` | Résultats affichés, période d'opposition ouverte |
| Opposition reçue | `cf_opposed` | Au moins une opposition déposée |
| Validation CSPGFR | `cf_validated` | Comité a validé le dossier |
| Signé par le Préfet | `cf_signed` | Certificat Foncier signé et délivré |
| Rejeté | `cf_rejected` | Dossier rejeté (opposition confirmée ou non-conformité) |

### 4.2 Statuts Phase 2 (Titre Foncier)

| Statut | Code | Description |
|:---|:---|:---|
| Demande déposée | `tf_submitted` | Requête déposée à la DD-Agriculture |
| Instruction AFOR | `tf_afor_review` | Dossier en vérification administrative et technique |
| APFR préparé | `tf_apfr_ready` | Projet d'Arrêté de Propriété Foncière Rurale prêt |
| Signature ministérielle | `tf_minister_signing` | Arrêté transmis au Ministre pour signature |
| Arrêté signé | `tf_signed` | Arrêté signé par le Ministre |
| Inscrit au Livre Foncier | `tf_registered` | Titre Foncier créé et délivré au propriétaire |
| Rejeté | `tf_rejected` | Dossier rejeté (non-conformité ou nationalité) |

### 4.3 Transitions valides

```
Phase 1 :
cf_draft → cf_submitted → cf_delimitation → cf_delimited → cf_inquiry → cf_publicity → cf_validated → cf_signed
                                                                        ↘ cf_opposed → cf_validated (si opposition levée)
                                                                                     → cf_rejected (si opposition confirmée)
cf_* → cf_rejected (à tout moment par l'admin)

Phase 2 :
cf_signed → tf_submitted → tf_afor_review → tf_apfr_ready → tf_minister_signing → tf_signed → tf_registered
tf_* → tf_rejected (à tout moment par l'admin)
```

---

## 5. Modèle de données

### 5.1 Table `land_title_applications`

Table principale contenant les demandes de titre foncier.

| Colonne | Type | Description |
|:---|:---|:---|
| `id` | INT AUTO_INCREMENT | Identifiant unique |
| `application_number` | VARCHAR(50) UNIQUE | Numéro de dossier (ex: CF-2026-ABJ-00001) |
| `user_id` | INT FK → users | Demandeur (propriétaire) |
| `phase` | ENUM('certificate', 'title') | Phase actuelle (CF ou TF) |
| `status` | VARCHAR(30) | Statut actuel (cf_draft, tf_submitted, etc.) |
| `parcel_id` | INT FK → parcels (nullable) | Lien vers parcelle existante |
| `territory_id` | INT FK → village_territories (nullable) | Lien vers territoire délimité |
| `applicant_full_name` | VARCHAR(255) | Nom complet du demandeur |
| `applicant_nationality` | VARCHAR(100) | Nationalité (obligatoire pour Phase 2) |
| `applicant_id_type` | VARCHAR(50) | Type de pièce d'identité (CNI, passeport) |
| `applicant_id_number` | VARCHAR(100) | Numéro de pièce d'identité |
| `land_description` | TEXT | Description sommaire du terrain |
| `land_locality` | VARCHAR(255) | Localité / village |
| `land_sub_prefecture` | VARCHAR(255) | Sous-préfecture |
| `land_department` | VARCHAR(255) | Département |
| `land_region` | VARCHAR(255) | Région |
| `land_area_hectares` | DECIMAL(10,4) | Superficie en hectares |
| `operator_name` | VARCHAR(255) (nullable) | Nom de l'opérateur technique agréé |
| `operator_license` | VARCHAR(100) (nullable) | Numéro d'agrément de l'opérateur |
| `inquiry_commissioner` | VARCHAR(255) (nullable) | Nom du commissaire-enquêteur |
| `publicity_start_date` | BIGINT (nullable) | Date de début de publicité (timestamp ms) |
| `publicity_end_date` | BIGINT (nullable) | Date de fin de publicité (timestamp ms) |
| `certificate_number` | VARCHAR(100) (nullable) | Numéro du Certificat Foncier délivré |
| `certificate_signed_at` | BIGINT (nullable) | Date de signature du CF |
| `certificate_expiry_at` | BIGINT (nullable) | Date d'expiration du CF (10 ans) |
| `apfr_number` | VARCHAR(100) (nullable) | Numéro de l'Arrêté de Propriété Foncière Rurale |
| `title_number` | VARCHAR(100) (nullable) | Numéro du Titre Foncier |
| `title_registered_at` | BIGINT (nullable) | Date d'inscription au Livre Foncier |
| `presfor_eligible` | BOOLEAN DEFAULT FALSE | Éligible au programme PRESFOR (gratuit) |
| `notes` | TEXT (nullable) | Notes internes |
| `created_at` | BIGINT NOT NULL | Timestamp de création |
| `updated_at` | BIGINT NOT NULL | Timestamp de dernière modification |

### 5.2 Table `land_title_steps`

Historique des étapes franchies par chaque dossier.

| Colonne | Type | Description |
|:---|:---|:---|
| `id` | INT AUTO_INCREMENT | Identifiant unique |
| `application_id` | INT FK → land_title_applications | Dossier parent |
| `step_type` | VARCHAR(50) | Type d'étape (voir enum StepType) |
| `status` | VARCHAR(20) | Statut de l'étape (pending, in_progress, completed, skipped) |
| `started_at` | BIGINT (nullable) | Début de l'étape |
| `completed_at` | BIGINT (nullable) | Fin de l'étape |
| `completed_by` | INT FK → users (nullable) | Agent ayant complété l'étape |
| `notes` | TEXT (nullable) | Notes sur l'étape |
| `metadata` | JSON (nullable) | Données supplémentaires (résultats enquête, etc.) |
| `created_at` | BIGINT NOT NULL | Timestamp de création |

### 5.3 Table `land_title_documents`

Documents associés à chaque dossier.

| Colonne | Type | Description |
|:---|:---|:---|
| `id` | INT AUTO_INCREMENT | Identifiant unique |
| `application_id` | INT FK → land_title_applications | Dossier parent |
| `document_type` | VARCHAR(50) | Type de document (voir enum DocumentType) |
| `label` | VARCHAR(255) | Libellé du document |
| `file_url` | TEXT NOT NULL | URL S3 du fichier |
| `file_key` | VARCHAR(500) NOT NULL | Clé S3 |
| `mime_type` | VARCHAR(100) | Type MIME |
| `file_size_bytes` | INT | Taille en octets |
| `sha256` | VARCHAR(64) (nullable) | Hash SHA-256 pour intégrité |
| `uploaded_by` | INT FK → users | Utilisateur ayant uploadé |
| `step_id` | INT FK → land_title_steps (nullable) | Étape associée |
| `verified` | BOOLEAN DEFAULT FALSE | Document vérifié par l'admin |
| `verified_by` | INT FK → users (nullable) | Admin ayant vérifié |
| `verified_at` | BIGINT (nullable) | Date de vérification |
| `created_at` | BIGINT NOT NULL | Timestamp de création |

### 5.4 Table `land_title_oppositions`

Oppositions déposées pendant la période de publicité.

| Colonne | Type | Description |
|:---|:---|:---|
| `id` | INT AUTO_INCREMENT | Identifiant unique |
| `application_id` | INT FK → land_title_applications | Dossier concerné |
| `opponent_name` | VARCHAR(255) NOT NULL | Nom de l'opposant |
| `opponent_contact` | VARCHAR(255) (nullable) | Contact de l'opposant |
| `reason` | TEXT NOT NULL | Motif de l'opposition |
| `status` | VARCHAR(20) | Statut (pending, confirmed, dismissed) |
| `resolution_notes` | TEXT (nullable) | Notes de résolution |
| `resolved_by` | INT FK → users (nullable) | Agent ayant résolu |
| `resolved_at` | BIGINT (nullable) | Date de résolution |
| `created_at` | BIGINT NOT NULL | Timestamp de création |

---

## 6. Enums et constantes

### 6.1 ApplicationPhase

```typescript
type ApplicationPhase = "certificate" | "title";
```

### 6.2 ApplicationStatus

```typescript
// Phase 1 — Certificat Foncier
type CertificateStatus =
  | "cf_draft"
  | "cf_submitted"
  | "cf_delimitation"
  | "cf_delimited"
  | "cf_inquiry"
  | "cf_publicity"
  | "cf_opposed"
  | "cf_validated"
  | "cf_signed"
  | "cf_rejected";

// Phase 2 — Titre Foncier
type TitleStatus =
  | "tf_submitted"
  | "tf_afor_review"
  | "tf_apfr_ready"
  | "tf_minister_signing"
  | "tf_signed"
  | "tf_registered"
  | "tf_rejected";

type ApplicationStatus = CertificateStatus | TitleStatus;
```

### 6.3 StepType

```typescript
type StepType =
  // Phase 1
  | "deposit_request"        // Dépôt de la demande
  | "delimitation"           // Délimitation et constat des limites
  | "inquiry"                // Enquête officielle
  | "publicity"              // Publicité (affichage)
  | "cspgfr_validation"      // Validation par le CSPGFR
  | "prefect_signature"      // Signature du Préfet
  // Phase 2
  | "immatriculation_request" // Demande d'immatriculation
  | "afor_control"           // Contrôle par l'AFOR
  | "apfr_preparation"      // Préparation de l'APFR
  | "minister_signature"    // Signature ministérielle
  | "land_registry"         // Inscription au Livre Foncier
  ;
```

### 6.4 DocumentType

```typescript
type LandTitleDocumentType =
  | "liasse_fonciere"        // Liasse foncière officielle
  | "demande_enquete"        // Demande d'enquête au Sous-Préfet
  | "piece_identite"         // Pièce d'identité du demandeur
  | "plan_parcelle"          // Plan de la parcelle (géomètre)
  | "constat_limites"        // Constat des limites (PV)
  | "rapport_enquete"        // Rapport du commissaire-enquêteur
  | "pv_publicite"           // PV de publicité
  | "pv_cspgfr"              // PV du Comité Sous-Préfectoral
  | "certificat_foncier"     // Certificat Foncier délivré
  | "requete_immatriculation" // Requête d'immatriculation
  | "recepisse_depot"        // Récépissé de dépôt
  | "rapport_afor"           // Rapport de vérification AFOR
  | "projet_apfr"            // Projet d'Arrêté de Propriété Foncière Rurale
  | "arrete_signe"           // Arrêté signé par le Ministre
  | "titre_foncier"          // Titre Foncier définitif
  | "other"                  // Autre document
  ;
```

---

## 7. Procédures tRPC prévues

### 7.1 Procédures citoyen (protectedProcedure)

| Procédure | Description |
|:---|:---|
| `landTitle.create` | Créer un nouveau dossier (Phase 1 — brouillon) |
| `landTitle.listMine` | Lister mes dossiers de titre foncier |
| `landTitle.getById` | Détail d'un dossier avec étapes et documents |
| `landTitle.update` | Modifier les informations d'un dossier (si brouillon) |
| `landTitle.submit` | Soumettre le dossier (passer de brouillon à déposé) |
| `landTitle.uploadDocument` | Uploader un document justificatif |
| `landTitle.deleteDocument` | Supprimer un document (si non vérifié) |
| `landTitle.requestImmatriculation` | Initier la Phase 2 (si CF signé) |

### 7.2 Procédures admin (adminProcedure)

| Procédure | Description |
|:---|:---|
| `landTitle.listAll` | Lister tous les dossiers avec filtres |
| `landTitle.getByIdAdmin` | Détail complet d'un dossier (admin) |
| `landTitle.advanceStep` | Faire avancer le dossier à l'étape suivante |
| `landTitle.rejectApplication` | Rejeter un dossier |
| `landTitle.addOpposition` | Enregistrer une opposition |
| `landTitle.resolveOpposition` | Résoudre une opposition |
| `landTitle.verifyDocument` | Valider un document |
| `landTitle.assignOperator` | Assigner un opérateur technique |
| `landTitle.assignCommissioner` | Assigner un commissaire-enquêteur |
| `landTitle.signCertificate` | Enregistrer la signature du CF |
| `landTitle.signApfr` | Enregistrer la signature de l'APFR |
| `landTitle.registerTitle` | Enregistrer l'inscription au Livre Foncier |

---

## 8. Règles métier

### 8.1 Conditions de transition

| Transition | Conditions requises |
|:---|:---|
| cf_draft → cf_submitted | Identité complète, description terrain, liasse foncière uploadée |
| cf_submitted → cf_delimitation | Opérateur technique assigné |
| cf_delimitation → cf_delimited | Plan parcelle + constat limites uploadés |
| cf_delimited → cf_inquiry | Commissaire-enquêteur assigné |
| cf_inquiry → cf_publicity | Rapport d'enquête uploadé |
| cf_publicity → cf_validated | Période de publicité écoulée (3 mois), aucune opposition OU oppositions résolues |
| cf_validated → cf_signed | PV CSPGFR uploadé, validation AFOR |
| cf_signed → tf_submitted | Nationalité ivoirienne vérifiée, CF non expiré (<10 ans) |
| tf_submitted → tf_afor_review | Dossier complet transmis |
| tf_afor_review → tf_apfr_ready | Vérification AFOR positive |
| tf_apfr_ready → tf_minister_signing | Projet APFR préparé |
| tf_minister_signing → tf_signed | Arrêté signé |
| tf_signed → tf_registered | Inscription au Livre Foncier confirmée |

### 8.2 Délais légaux

| Délai | Durée | Conséquence |
|:---|:---|:---|
| Période de publicité | 3 mois | Oppositions possibles uniquement pendant cette période |
| Validité du CF | 10 ans | Passé ce délai, la terre retourne au domaine de l'État |
| Délai d'opposition | 3 mois après affichage | Forclusion si non exercé |

### 8.3 Programme PRESFOR

Les dossiers éligibles au programme PRESFOR bénéficient de la gratuité ou de subventions pour les opérations de délimitation et de délivrance de certificats fonciers. Le champ `presfor_eligible` permet de marquer ces dossiers et d'adapter les workflows (suppression des étapes de paiement).

---

## 9. Intégration avec les modules existants

| Module existant | Intégration |
|:---|:---|
| **Parcelles (Digital Twin)** | Lien `parcel_id` pour associer le dossier à une parcelle existante |
| **Délimitation villageoise** | Lien `territory_id` pour réutiliser les données de délimitation |
| **Documents** | Réutilisation du service S3 (storagePut/storageGet) |
| **Audit trail** | Événements audit pour chaque transition de statut |
| **QR Verify** | Génération de QR pour vérifier l'authenticité du CF/TF |
| **Crédit Habitat** | Le TF peut servir de garantie pour un dossier de crédit |

---

## 10. Références

- [1] [AFOR — Procédure Certificat Foncier](https://www.afor.ci/procedures/certificat-foncier)
- [2] [AFOR — Procédure Titre Foncier](https://www.afor.ci/procedures/titre-foncier)
- [3] [Décret n° 2023-238 — Procédures d'immatriculation](https://opf.gouv.ci/storage/documents/decret-n2023-238-du-05-avril-2023-determinant-les-procedures-dimmatriculation-des-terres-du-domaine-foncier-rural.pdf)
- [4] [Processus d'obtention du titre foncier](https://www.adolebatisseur.org/non-classe/processus-dobtention-du-titre-foncier-en-cote-divoire/)
- [5] [Capital Foncier — FAQ Foncier Rural](https://www.capital-foncier.com/blog/faq-foncier-rural-cote-divoire-reponses-officielles)
- [6] [Programme PRESFOR](https://www.afor.ci/news/nos-actualites/61)
- [7] [Loi n° 98-750 — Domaine Foncier Rural](https://faolex.fao.org/docs/pdf/ivc217309.pdf)
