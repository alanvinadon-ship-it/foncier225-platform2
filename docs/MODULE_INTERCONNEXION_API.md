# Module d'Interconnexion API — Foncier225

## Document Technique d'Architecture et de Spécification des Interfaces

**Version :** 1.0  
**Date :** 12 juin 2026  
**Classification :** Confidentiel — Usage interne et partenaires institutionnels  
**Auteur :** Direction Technique Foncier225  

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Contexte et objectifs](#2-contexte-et-objectifs)
3. [Cadre juridique et réglementaire](#3-cadre-juridique-et-réglementaire)
4. [Architecture globale d'interconnexion](#4-architecture-globale-dinterconnexion)
5. [Interconnexion SIGFU](#5-interconnexion-sigfu)
6. [Interconnexion IDUFCI](#6-interconnexion-idufci)
7. [Interconnexion SIFOR-CI](#7-interconnexion-sifor-ci)
8. [Couche de sécurité et conformité](#8-couche-de-sécurité-et-conformité)
9. [Gouvernance des données](#9-gouvernance-des-données)
10. [Plan de déploiement](#10-plan-de-déploiement)
11. [Annexes techniques](#11-annexes-techniques)
12. [Références](#12-références)

---

## 1. Résumé exécutif

Le présent document décrit l'architecture technique du module d'interconnexion entre la plateforme **Foncier225** et les trois infrastructures numériques majeures de l'État ivoirien en matière de gestion foncière : le **SIGFU** (Système Intégré de Gestion du Foncier Urbain), la plateforme **IDUFCI** (Identifiant Unique du Foncier de Côte d'Ivoire) et le **SIFOR-CI** (Système d'Information du Foncier Rural). Cette interconnexion s'inscrit dans le cadre du Référentiel Général d'Interopérabilité (RGI) adopté par le Décret N°2021-913 du 22 décembre 2021 [1] et de la plateforme d'interopérabilité de l'administration publique opérée par la SNDI [2].

L'objectif est de permettre à Foncier225 de fonctionner comme un **guichet numérique unifié** pour les citoyens et les professionnels du foncier, en consommant et en alimentant les registres officiels de l'État via des interfaces programmatiques standardisées (API REST/SOAP), tout en garantissant la sécurité, la traçabilité et la conformité aux exigences de protection des données à caractère personnel.

---

## 2. Contexte et objectifs

### 2.1 Contexte institutionnel

La Côte d'Ivoire a engagé depuis 2019 une transformation numérique profonde de sa chaîne foncière. Trois systèmes d'information majeurs ont été déployés ou sont en cours de déploiement, chacun couvrant un périmètre fonctionnel distinct :

| Système | Tutelle | Périmètre | Base juridique |
|---------|---------|-----------|----------------|
| **SIGFU** | Ministère de la Construction, du Logement et de l'Urbanisme (MCLU) | Foncier urbain — 49 procédures administratives | Décret N°2021-862 du 15/12/2021 [3] |
| **IDUFCI** | MCLU / Direction de la Modernisation et de l'Information Statistique et de l'Archivage (DMISSA) | Référentiel d'identification unique des parcelles (urbain + rural) | Décret N°2019-221 du 13/03/2019 [4] |
| **SIFOR-CI** | Agence Foncière Rurale (AFOR) | Foncier rural — certificats fonciers, délimitations villageoises, enquêtes | Ordonnance N°2025-85 du 12/02/2025 [5] |

Ces trois systèmes fonctionnent aujourd'hui de manière relativement cloisonnée. L'interconnexion avec Foncier225 vise à créer une couche d'abstraction unifiée permettant aux citoyens d'accéder à l'ensemble de leurs informations foncières depuis un point d'entrée unique, tout en alimentant les registres officiels en temps réel.

### 2.2 Objectifs de l'interconnexion

L'interconnexion poursuit cinq objectifs stratégiques :

**Objectif 1 — Unicité de l'information.** Garantir qu'une parcelle identifiée dans Foncier225 dispose systématiquement de son IDUFCI officiel (code alphanumérique de 20 caractères), créant ainsi un lien indéfectible entre le registre privé et le référentiel national.

**Objectif 2 — Synchronisation des procédures.** Permettre le suivi en temps réel de l'avancement des demandes d'actes fonciers urbains (SIGFU) et des procédures de certification rurale (SIFOR-CI) directement depuis l'espace citoyen Foncier225.

**Objectif 3 — Alimentation bidirectionnelle.** Transmettre aux systèmes étatiques les données collectées par Foncier225 (géolocalisation GPS, documents numérisés, paiements effectués) et recevoir en retour les mises à jour de statut et les actes dématérialisés.

**Objectif 4 — Conformité réglementaire.** Respecter le RGI, la loi n°2013-450 relative à la protection des données personnelles [6], et les exigences de l'ARTCI en matière d'accès aux API [7].

**Objectif 5 — Résilience et évolutivité.** Concevoir une architecture découplée (API Gateway + adaptateurs) permettant d'intégrer de futurs systèmes (cadastre fiscal DGI, registre des hypothèques) sans refonte structurelle.

---

## 3. Cadre juridique et réglementaire

### 3.1 Textes fondateurs

L'interconnexion s'appuie sur un corpus juridique structurant :

| Texte | Objet | Impact sur l'interconnexion |
|-------|-------|---------------------------|
| Décret N°2021-913 du 22/12/2021 | Référentiel Général d'Interopérabilité (RGI) | Obligation de conformité pour tous les organismes publics — normes techniques et sémantiques |
| Loi n°2024-352 du 06/06/2024 | Communications électroniques | Cadre pour l'accès aux API et l'interconnexion des plateformes numériques |
| Loi n°2013-450 du 19/06/2013 | Protection des données à caractère personnel | Consentement, finalité, proportionnalité, droit d'accès et de rectification |
| Loi n°2023-901 | Promotion des startups numériques | Accès facilité au marché et à la commande publique pour les solutions numériques locales |
| Décret N°2019-221 du 13/03/2019 | Institution de l'IDUFCI | Obligation d'identification unique de toute parcelle — format 20 caractères |
| Ordonnance N°2025-85 du 12/02/2025 | Création du SIFOR-CI | Registre foncier rural officiel — interopérabilité avec les acteurs du foncier |
| Arrêté N°757/MCLU du 24/07/2020 | Modalités IDUFCI | Opérations : réservation, pré-attribution, attribution, élimination, révocation, morcellement, fusion, échange |

### 3.2 Principes directeurs ARTCI

La consultation publique de juin 2025 de l'ARTCI [7] relative à l'accès ouvert aux API établit les principes suivants, auxquels Foncier225 se conforme :

> « Les API doivent être mises à disposition dans des conditions objectives, transparentes et non discriminatoires, avec publication de la documentation technique, mise à disposition d'un environnement de test (sandbox), et définition d'engagements de niveau de service (SLA). »

Les exigences techniques identifiées par l'ARTCI comprennent : l'authentification forte (OAuth 2.0 / mTLS), le chiffrement des flux (TLS 1.3), la gestion des versions avec rétrocompatibilité, la journalisation exhaustive des appels, et la mise en place de mécanismes de limitation de débit (rate limiting).

### 3.3 Obligations de déclaration

Conformément à la réglementation en vigueur, Foncier225 doit :

1. Effectuer une **déclaration préalable** auprès de l'ARTCI en tant que plateforme de services numériques (article 5 de la loi n°2024-352).
2. Obtenir une **autorisation de traitement de données à caractère personnel** auprès de l'Autorité de Protection des Données Personnelles (formulaire disponible sur autoritedeprotection.ci) [8].
3. Soumettre une **demande d'interfaçage** formelle auprès de chaque administration gestionnaire (MCLU pour SIGFU/IDUFCI, AFOR pour SIFOR-CI).
4. Se conformer au **RGI** en matière de formats d'échange, de protocoles et de métadonnées.

---

## 4. Architecture globale d'interconnexion

### 4.1 Vue d'ensemble

L'architecture repose sur un modèle **API Gateway + Adaptateurs** (pattern Adapter/Facade) qui isole la logique métier de Foncier225 des spécificités techniques de chaque système étatique.

```
┌─────────────────────────────────────────────────────────────────┐
│                        FONCIER225                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Espace   │  │ Back-    │  │ Module   │  │ Module       │   │
│  │ Citoyen  │  │ Office   │  │ Paiement │  │ Délimitation │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│       │              │              │               │           │
│       └──────────────┴──────────────┴───────────────┘           │
│                              │                                   │
│              ┌───────────────┴───────────────┐                   │
│              │    COUCHE D'ORCHESTRATION      │                   │
│              │    (API Gateway interne)       │                   │
│              └───────────────┬───────────────┘                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐
    │  ADAPTATEUR    │ │  ADAPTATEUR  │ │  ADAPTATEUR  │
    │  SIGFU         │ │  IDUFCI      │ │  SIFOR-CI    │
    │  (REST/SOAP)   │ │  (REST)      │ │  (REST/SOAP) │
    └─────────┬──────┘ └──────┬───────┘ └──────┬───────┘
              │                │                │
    ┌─────────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐
    │   SIGFU        │ │   IDUFCI     │ │   SIFOR-CI   │
    │   (MCLU)       │ │   (DMISSA)   │ │   (AFOR)     │
    └────────────────┘ └──────────────┘ └──────────────┘
```

### 4.2 Composants de la couche d'interconnexion

| Composant | Rôle | Technologie |
|-----------|------|-------------|
| **API Gateway** | Routage, authentification, rate limiting, logging | Node.js + Express middleware |
| **Adaptateur SIGFU** | Transformation des requêtes Foncier225 vers le format SIGFU | Module TypeScript dédié |
| **Adaptateur IDUFCI** | Gestion des opérations IDUFCI (attribution, vérification, échange) | Module TypeScript dédié |
| **Adaptateur SIFOR-CI** | Interface avec les 8 modules du SIFOR | Module TypeScript dédié |
| **Cache distribué** | Mise en cache des réponses fréquentes (IDUFCI lookup) | Redis / In-memory |
| **File d'attente** | Traitement asynchrone des opérations longues | Bull Queue (Redis-backed) |
| **Journal d'audit** | Traçabilité complète des échanges inter-systèmes | Table audit_events + S3 |

### 4.3 Principes architecturaux

L'architecture respecte les principes suivants, conformes au RGI :

**Découplage.** Chaque adaptateur est un module indépendant qui peut être mis à jour, testé et déployé sans impacter les autres. Un changement de version de l'API SIGFU n'affecte que l'adaptateur SIGFU.

**Idempotence.** Toutes les opérations d'écriture sont idempotentes grâce à un système de clés de déduplication (idempotency keys), garantissant qu'une requête rejouée (en cas de timeout réseau) ne crée pas de doublon.

**Circuit Breaker.** En cas d'indisponibilité d'un système partenaire, le circuit breaker coupe temporairement les appels et renvoie une réponse dégradée (données en cache ou message d'indisponibilité), évitant ainsi la propagation des pannes.

**Observabilité.** Chaque appel API est tracé de bout en bout avec un identifiant de corrélation (correlation ID) permettant de reconstituer le parcours complet d'une requête à travers les différents systèmes.

---

## 5. Interconnexion SIGFU

### 5.1 Présentation du SIGFU

Le SIGFU est un système informatisé et intégré de gestion des données spatiales et textuelles du foncier urbain, déployé sur le Grand Abidjan et Assinie (4 500 km²) par IGN FI dans le cadre d'un projet de 27 millions d'euros financé par crédit export [9]. Il intègre 49 procédures foncières du MCLU et dispose d'un portail web public (sigfu.gouv.ci) ainsi que d'une application mobile.

### 5.2 Périmètre fonctionnel de l'interconnexion

| Fonction | Direction du flux | Priorité |
|----------|------------------|----------|
| Consultation du statut d'une demande d'acte | SIGFU → Foncier225 | P1 |
| Soumission d'une demande d'acte foncier | Foncier225 → SIGFU | P1 |
| Récupération des informations parcellaires | SIGFU → Foncier225 | P1 |
| Notification de changement de statut | SIGFU → Foncier225 (webhook) | P2 |
| Transmission des pièces justificatives numérisées | Foncier225 → SIGFU | P2 |
| Consultation du répertoire des géomètres-experts | SIGFU → Foncier225 | P3 |
| Synchronisation des plans de lotissement | SIGFU → Foncier225 | P3 |

### 5.3 Spécification des endpoints proposés

#### 5.3.1 Consultation du statut d'une demande

```
GET /api/v1/sigfu/demandes/{numeroDemande}/statut
```

**Headers requis :**
```
Authorization: Bearer {access_token}
X-Correlation-Id: {uuid}
X-Platform-Id: FONCIER225
```

**Réponse attendue (200 OK) :**
```json
{
  "numeroDemande": "DEM-2026-ABJ-00145",
  "typeDemande": "CERTIFICAT_PROPRIETE",
  "statut": "EN_INSTRUCTION",
  "dateDepot": "2026-05-15T10:30:00Z",
  "dateDerniereMAJ": "2026-06-10T14:22:00Z",
  "etapeCourante": {
    "code": "VERIFICATION_TECHNIQUE",
    "libelle": "Vérification technique par le service du cadastre",
    "progression": 45
  },
  "guichet": {
    "code": "GUF_PLATEAU",
    "libelle": "Guichet Unique du Foncier - Le Plateau"
  }
}
```

#### 5.3.2 Soumission d'une demande d'acte

```
POST /api/v1/sigfu/demandes
```

**Corps de la requête :**
```json
{
  "typeDemande": "CERTIFICAT_PROPRIETE",
  "demandeur": {
    "idufci": "CI-ABJ-PLT-001-00234",
    "nom": "KOUASSI",
    "prenoms": "Aya Marie",
    "telephone": "+2250707070707",
    "email": "aya.kouassi@email.ci",
    "pieceIdentite": {
      "type": "CNI",
      "numero": "CI0123456789"
    }
  },
  "parcelle": {
    "idufci": "CI-ABJ-PLT-001-00234",
    "lotissement": "Cocody Riviera 3",
    "ilot": "12",
    "lot": "45"
  },
  "documents": [
    {
      "type": "PLAN_GEOMETRE",
      "url": "https://storage.foncier225.ci/docs/plan_12345.pdf",
      "sha256": "a1b2c3d4..."
    }
  ],
  "paiement": {
    "reference": "PAY-2026-06-001234",
    "montant": 150000,
    "devise": "XOF",
    "provider": "tresorpay"
  }
}
```

#### 5.3.3 Webhook de notification

```
POST /api/webhooks/sigfu (côté Foncier225)
```

**Corps reçu :**
```json
{
  "event": "DEMANDE_STATUT_CHANGE",
  "numeroDemande": "DEM-2026-ABJ-00145",
  "ancienStatut": "EN_INSTRUCTION",
  "nouveauStatut": "AVIS_FAVORABLE",
  "timestamp": "2026-06-12T09:15:00Z",
  "signature": "hmac-sha256:..."
}
```

### 5.4 Mapping des statuts SIGFU ↔ Foncier225

| Statut SIGFU | Statut Foncier225 | Description |
|--------------|-------------------|-------------|
| DEPOSE | `submitted` | Dossier déposé au guichet |
| EN_INSTRUCTION | `in_progress` | En cours de traitement |
| VERIFICATION_TECHNIQUE | `technical_review` | Vérification cadastrale |
| AVIS_FAVORABLE | `approved` | Avis favorable émis |
| OPPOSITION | `opposition` | Période d'opposition en cours |
| SIGNE | `signed` | Acte signé par l'autorité |
| DELIVRE | `delivered` | Acte remis au demandeur |
| REJETE | `rejected` | Dossier rejeté |

---

## 6. Interconnexion IDUFCI

### 6.1 Présentation de l'IDUFCI

L'IDUFCI est un code alphanumérique de **20 caractères** attribué à toute parcelle foncière située en Côte d'Ivoire, quelle que soit sa nature juridique (urbaine ou rurale). Institué par le Décret N°2019-221 du 13 mars 2019 [4], il constitue le référentiel national d'identification des parcelles. Sa structure se décompose comme suit :

| Position | Longueur | Contenu | Exemple |
|----------|----------|---------|---------|
| 1-2 | 2 | Code pays (CI) | CI |
| 3-5 | 3 | Code région/district | ABJ |
| 6-8 | 3 | Code commune/sous-préfecture | PLT |
| 9-11 | 3 | Code secteur/quartier | 001 |
| 12-16 | 5 | Numéro séquentiel de la parcelle | 00234 |
| 17-20 | 4 | Code de contrôle/destination | A1B2 |

Un **QR code de sécurité** est associé en arrière-plan à chaque IDUFCI, permettant la vérification instantanée de l'authenticité de l'identifiant [4].

### 6.2 Opérations IDUFCI supportées

L'Arrêté Interministériel N°757/MCLU/MINADER/MT/MEER/MBPE du 24 juillet 2020 définit les opérations suivantes, que Foncier225 doit pouvoir invoquer :

| Opération | Description | Acteur autorisé |
|-----------|-------------|-----------------|
| **Réservation** | Pré-enregistrement d'un identifiant non encore attribué | Géomètre-expert, administration |
| **Pré-attribution** | Mise à disposition d'identifiants à une institution | Administration foncière |
| **Attribution** | Association définitive d'un IDUFCI à une parcelle | Géomètre-expert agréé |
| **Élimination** | Suppression d'un IDUFCI de l'espace de travail | Acteur autorisé |
| **Révocation** | Gel de toute transaction sur un IDUFCI (falsification, conflit) | Administration |
| **Morcellement** | Division d'une parcelle en sous-parcelles (nouveaux IDUFCI) | Géomètre-expert |
| **Fusion** | Création d'une parcelle à partir de parcelles contiguës | Géomètre-expert |
| **Échange** | Partage d'informations entre acteurs sur une parcelle | Acteur autorisé |

### 6.3 Spécification des endpoints proposés

#### 6.3.1 Vérification d'un IDUFCI

```
GET /api/v1/idufci/parcelles/{idufci}
```

**Réponse (200 OK) :**
```json
{
  "idufci": "CI-ABJ-PLT-001-00234",
  "statut": "ACTIF",
  "dateAttribution": "2024-03-15",
  "localisation": {
    "region": "District d'Abidjan",
    "commune": "Plateau",
    "secteur": "Secteur 001",
    "coordonnees": {
      "latitude": 5.3167,
      "longitude": -4.0167
    }
  },
  "superficie": 450.5,
  "uniteSurface": "m2",
  "natureJuridique": "TITRE_FONCIER",
  "dernierActe": {
    "type": "CERTIFICAT_PROPRIETE",
    "numero": "CP-2024-00567",
    "date": "2024-06-20"
  },
  "qrCodeUrl": "https://idufci.construction.gouv.ci/qr/CI-ABJ-PLT-001-00234"
}
```

#### 6.3.2 Demande d'attribution d'IDUFCI

```
POST /api/v1/idufci/attributions
```

**Corps de la requête :**
```json
{
  "demandeur": {
    "type": "GEOMETRE_EXPERT",
    "agrement": "GE-CI-2024-0089",
    "nom": "Cabinet TOURE & Associés"
  },
  "parcelle": {
    "commune": "PLT",
    "secteur": "001",
    "coordonnees": [
      {"lat": 5.3167, "lng": -4.0167},
      {"lat": 5.3170, "lng": -4.0167},
      {"lat": 5.3170, "lng": -4.0163},
      {"lat": 5.3167, "lng": -4.0163}
    ],
    "superficie": 450.5,
    "natureJuridique": "LETTRE_ATTRIBUTION"
  },
  "idempotencyKey": "attr-2026-06-12-uuid-xyz"
}
```

#### 6.3.3 Opération de morcellement

```
POST /api/v1/idufci/morcellements
```

**Corps de la requête :**
```json
{
  "idufciParent": "CI-ABJ-PLT-001-00234",
  "sousParcelles": [
    {
      "coordonnees": [...],
      "superficie": 225.0
    },
    {
      "coordonnees": [...],
      "superficie": 225.5
    }
  ],
  "justificatif": {
    "type": "PLAN_MORCELLEMENT",
    "url": "https://storage.foncier225.ci/docs/morcellement_xyz.pdf"
  }
}
```

### 6.4 Intégration dans Foncier225

Chaque parcelle enregistrée dans Foncier225 possède un champ `idufci` (VARCHAR 20) dans la table `parcels`. L'interconnexion permet :

1. **À l'enregistrement** : vérification automatique de l'existence et de la validité de l'IDUFCI fourni.
2. **À la création** : si la parcelle n'a pas encore d'IDUFCI, déclenchement d'une demande d'attribution via le géomètre-expert agréé.
3. **En continu** : synchronisation périodique des métadonnées (statut, nature juridique, dernier acte) depuis le registre IDUFCI.

---

## 7. Interconnexion SIFOR-CI

### 7.1 Présentation du SIFOR-CI

Le SIFOR-CI, institué par l'Ordonnance N°2025-85 du 12 février 2025 [5], est le registre foncier rural officiel en matière de données foncières rurales numériques. Logé au sein de l'AFOR (Agence Foncière Rurale), il comprend **huit modules fonctionnels** [10] :

1. Gestion des opérations sur certificat foncier
2. Gestion de la délimitation des territoires villageois
3. Gestion des enquêtes foncières
4. Gestion du cadastre rural
5. Gestion des litiges fonciers
6. Gestion des acteurs (comités villageois, géomètres, etc.)
7. Gestion documentaire et archivage
8. Reporting et statistiques

### 7.2 Périmètre fonctionnel de l'interconnexion

| Fonction | Direction du flux | Module SIFOR | Priorité |
|----------|------------------|--------------|----------|
| Soumission de demande de certificat foncier | Foncier225 → SIFOR | Module 1 | P1 |
| Suivi du statut de certification | SIFOR → Foncier225 | Module 1 | P1 |
| Transmission des points GPS de délimitation | Foncier225 → SIFOR | Module 2 | P1 |
| Validation de délimitation villageoise | SIFOR → Foncier225 | Module 2 | P1 |
| Consultation des enquêtes foncières | SIFOR → Foncier225 | Module 3 | P2 |
| Signalement de litige foncier | Foncier225 → SIFOR | Module 5 | P2 |
| Récupération des documents officiels | SIFOR → Foncier225 | Module 7 | P2 |
| Statistiques et indicateurs | SIFOR → Foncier225 | Module 8 | P3 |

### 7.3 Spécification des endpoints proposés

#### 7.3.1 Soumission de demande de certificat foncier rural

```
POST /api/v1/sifor/certificats/demandes
```

**Corps de la requête :**
```json
{
  "demandeur": {
    "nom": "KONE",
    "prenoms": "Amadou",
    "telephone": "+2250505050505",
    "village": "Katiola-Centre",
    "sousprefecture": "Katiola"
  },
  "parcelle": {
    "idufci": "CI-KAT-KTC-002-01567",
    "superficie": 5.2,
    "uniteSurface": "hectares",
    "usage": "AGRICULTURE",
    "pointsGPS": [
      {"lat": 8.1234, "lng": -5.0678, "altitude": 320},
      {"lat": 8.1240, "lng": -5.0678, "altitude": 321},
      {"lat": 8.1240, "lng": -5.0670, "altitude": 319},
      {"lat": 8.1234, "lng": -5.0670, "altitude": 320}
    ]
  },
  "temoins": [
    {"nom": "COULIBALY Seydou", "qualite": "Chef de village"},
    {"nom": "TRAORE Mariam", "qualite": "Voisin limitrophe"}
  ],
  "documents": [
    {
      "type": "PV_ENQUETE_FONCIERE",
      "url": "https://storage.foncier225.ci/docs/pv_enquete_xyz.pdf"
    }
  ]
}
```

#### 7.3.2 Transmission des données de délimitation villageoise

```
POST /api/v1/sifor/delimitations/{territoireId}/points
```

**Corps de la requête :**
```json
{
  "territoireId": "TV-KAT-001",
  "village": "Katiola-Centre",
  "sousprefecture": "Katiola",
  "pointsFrontiere": [
    {"numero": 1, "lat": 8.1200, "lng": -5.0700, "description": "Borne N°1 - Carrefour"},
    {"numero": 2, "lat": 8.1250, "lng": -5.0680, "description": "Borne N°2 - Rivière"},
    {"numero": 3, "lat": 8.1280, "lng": -5.0650, "description": "Borne N°3 - Colline"}
  ],
  "methodeLeve": "GPS_RTK",
  "precisionMoyenne": 0.5,
  "unitePrecision": "metres",
  "dateReleve": "2026-06-01",
  "geometreExpert": {
    "agrement": "GE-CI-2024-0089",
    "nom": "Cabinet TOURE & Associés"
  }
}
```

#### 7.3.3 Consultation du statut de certification

```
GET /api/v1/sifor/certificats/{numeroDemande}/statut
```

**Réponse (200 OK) :**
```json
{
  "numeroDemande": "CFR-2026-KAT-00089",
  "statut": "ENQUETE_EN_COURS",
  "dateDepot": "2026-04-20",
  "etapes": [
    {"code": "DEPOT", "statut": "TERMINE", "date": "2026-04-20"},
    {"code": "RECEVABILITE", "statut": "TERMINE", "date": "2026-04-25"},
    {"code": "ENQUETE_FONCIERE", "statut": "EN_COURS", "dateDebut": "2026-05-10"},
    {"code": "PUBLICITE_FONCIERE", "statut": "A_VENIR"},
    {"code": "IMMATRICULATION", "statut": "A_VENIR"},
    {"code": "DELIVRANCE", "statut": "A_VENIR"}
  ],
  "comiteVillageois": {
    "president": "COULIBALY Seydou",
    "dateConstitution": "2025-12-15"
  }
}
```

### 7.4 Mapping des statuts SIFOR-CI ↔ Foncier225

| Statut SIFOR-CI | Statut Foncier225 | Phase |
|-----------------|-------------------|-------|
| DEPOT | `submitted` | Réception |
| RECEVABILITE | `eligibility_check` | Instruction |
| ENQUETE_FONCIERE | `field_survey` | Terrain |
| PUBLICITE_FONCIERE | `public_notice` | Opposition |
| OPPOSITION_RECUE | `opposition` | Contentieux |
| IMMATRICULATION | `registration` | Finalisation |
| DELIVRANCE | `delivered` | Clôture |
| REJETE | `rejected` | Clôture |

---

## 8. Couche de sécurité et conformité

### 8.1 Authentification et autorisation

L'interconnexion utilise un modèle de sécurité à plusieurs niveaux :

| Couche | Mécanisme | Description |
|--------|-----------|-------------|
| **Transport** | TLS 1.3 (mutual TLS pour les webhooks) | Chiffrement de bout en bout de toutes les communications |
| **Identité plateforme** | OAuth 2.0 Client Credentials | Authentification machine-to-machine entre Foncier225 et les systèmes étatiques |
| **Identité utilisateur** | JWT signé (RS256) | Propagation de l'identité du citoyen dans les requêtes |
| **Intégrité** | HMAC-SHA256 sur les webhooks | Vérification que les notifications proviennent bien du système source |
| **Autorisation** | RBAC + scopes OAuth | Contrôle granulaire des opérations autorisées par type d'acteur |

### 8.2 Gestion des certificats

Chaque système partenaire dispose d'un certificat X.509 émis par une autorité de certification reconnue. Les certificats sont stockés dans un coffre-fort numérique (vault) et renouvelés automatiquement 30 jours avant expiration.

### 8.3 Journalisation et audit

Chaque appel API inter-systèmes génère une entrée d'audit contenant :

- Identifiant de corrélation (UUID v4)
- Timestamp UTC (milliseconde)
- Système source et système cible
- Endpoint appelé et méthode HTTP
- Identité de l'utilisateur final (si applicable)
- Code de réponse HTTP
- Durée de traitement (ms)
- Hash SHA-256 du corps de la requête (pour les écritures)

Les journaux sont conservés **5 ans** conformément aux exigences de traçabilité foncière et sont stockés de manière immuable (append-only) avec signature cryptographique.

### 8.4 Protection des données personnelles

Conformément à la loi n°2013-450 [6], les mesures suivantes sont implémentées :

1. **Minimisation des données** : seules les données strictement nécessaires à l'opération sont transmises.
2. **Pseudonymisation** : les identifiants internes Foncier225 ne sont jamais exposés aux systèmes partenaires ; seuls les identifiants officiels (IDUFCI, numéro de demande) transitent.
3. **Consentement** : le citoyen consent explicitement à la transmission de ses données lors de chaque opération d'interconnexion.
4. **Droit d'accès** : le citoyen peut consulter l'historique complet des échanges de données le concernant.
5. **Chiffrement au repos** : les données sensibles stockées dans le cache sont chiffrées (AES-256-GCM).

---

## 9. Gouvernance des données

### 9.1 Matrice de responsabilité (RACI)

| Donnée | Foncier225 | SIGFU | IDUFCI | SIFOR-CI |
|--------|-----------|-------|--------|----------|
| Identifiant parcelle (IDUFCI) | C | C | **R/A** | C |
| Statut demande urbaine | C | **R/A** | I | — |
| Statut certificat rural | C | — | I | **R/A** |
| Coordonnées GPS | **R** | C | C | C |
| Documents numérisés | **R** | C | — | C |
| Paiements effectués | **R/A** | I | — | I |
| Données personnelles citoyen | **R** | C | C | C |

*R = Responsable, A = Approbateur, C = Consulté, I = Informé*

### 9.2 Règles de résolution de conflits

En cas de divergence entre les données Foncier225 et un système étatique, la règle suivante s'applique :

> **Le système étatique fait autorité.** Les données du SIGFU, de l'IDUFCI et du SIFOR-CI prévalent systématiquement sur les données locales de Foncier225. En cas de conflit détecté, une alerte est générée pour investigation manuelle par un agent habilité.

### 9.3 SLA (Service Level Agreements)

| Métrique | Objectif | Mesure |
|----------|----------|--------|
| Disponibilité API | 99,5% (hors maintenance planifiée) | Monitoring Uptime |
| Temps de réponse (P95) | < 2 secondes | APM |
| Temps de réponse (P99) | < 5 secondes | APM |
| Délai de notification webhook | < 30 secondes | Timestamp delta |
| Taux d'erreur acceptable | < 1% | Compteur erreurs / total |
| Fenêtre de maintenance | Dimanche 02h-06h UTC | Planification |

---

## 10. Plan de déploiement

### 10.1 Phases de mise en œuvre

| Phase | Durée | Livrables | Prérequis |
|-------|-------|-----------|-----------|
| **Phase 0 — Cadrage** | 2 mois | Convention d'interfaçage signée, accès sandbox obtenus | Validation ARTCI |
| **Phase 1 — IDUFCI** | 3 mois | Vérification et attribution IDUFCI opérationnelles | Accès API IDUFCI (sandbox) |
| **Phase 2 — SIGFU** | 4 mois | Soumission et suivi des demandes d'actes urbains | Convention MCLU signée |
| **Phase 3 — SIFOR-CI** | 4 mois | Certification rurale et délimitation villageoise | Convention AFOR signée |
| **Phase 4 — Production** | 2 mois | Mise en production progressive (canary deployment) | Audit sécurité validé |
| **Phase 5 — Exploitation** | Continue | Monitoring, évolutions, support N2/N3 | Équipe dédiée |

### 10.2 Environnements

| Environnement | Usage | Accès |
|---------------|-------|-------|
| **Sandbox** | Développement et tests d'intégration | Données fictives, accès développeurs |
| **Pré-production** | Tests de charge et validation métier | Données anonymisées, accès restreint |
| **Production** | Exploitation réelle | Données réelles, accès contrôlé |

### 10.3 Critères de passage en production

1. Audit de sécurité réalisé par un PASSI agréé ARTCI (Prestataire d'Audit de Sécurité des Systèmes d'Information)
2. Tests de charge validés (1 000 requêtes/minute sans dégradation)
3. Plan de reprise d'activité (PRA) documenté et testé
4. Formation des équipes support (N1, N2, N3)
5. Convention d'interfaçage signée avec chaque partenaire

---

## 11. Annexes techniques

### Annexe A — Codes d'erreur standardisés

| Code | HTTP | Description |
|------|------|-------------|
| `IDUFCI_NOT_FOUND` | 404 | L'IDUFCI spécifié n'existe pas dans le registre |
| `IDUFCI_REVOKED` | 409 | L'IDUFCI est révoqué (gel judiciaire) |
| `DEMANDE_DUPLICATE` | 409 | Une demande identique existe déjà |
| `AUTH_EXPIRED` | 401 | Le token d'accès a expiré |
| `SCOPE_INSUFFICIENT` | 403 | L'opération requiert un scope non accordé |
| `SYSTEM_UNAVAILABLE` | 503 | Le système partenaire est temporairement indisponible |
| `RATE_LIMITED` | 429 | Quota d'appels dépassé |
| `VALIDATION_ERROR` | 422 | Données d'entrée invalides |

### Annexe B — Format d'échange GeoJSON pour les parcelles

```json
{
  "type": "Feature",
  "properties": {
    "idufci": "CI-ABJ-PLT-001-00234",
    "superficie": 450.5,
    "unite": "m2",
    "nature": "TITRE_FONCIER"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [-4.0167, 5.3167],
      [-4.0167, 5.3170],
      [-4.0163, 5.3170],
      [-4.0163, 5.3167],
      [-4.0167, 5.3167]
    ]]
  }
}
```

### Annexe C — Diagramme de séquence — Soumission d'une demande via SIGFU

```
Citoyen → Foncier225: Soumet demande d'acte
Foncier225 → IDUFCI: Vérifie IDUFCI parcelle
IDUFCI → Foncier225: IDUFCI valide + métadonnées
Foncier225 → SIGFU: POST /demandes (avec IDUFCI vérifié)
SIGFU → Foncier225: 201 Created {numeroDemande}
Foncier225 → Citoyen: Confirmation + numéro de suivi
...
SIGFU → Foncier225: Webhook (changement statut)
Foncier225 → Citoyen: Notification (email/SMS/in-app)
```

---

## 12. Références

[1]: https://anssi.gouv.ci/documents/28/décret_2021-913_du_22_décembre_2021_adoption_référentiel_général_dinteropérabilité_systèmes_dinformation.pdf "Décret N°2021-913 du 22 décembre 2021 — Référentiel Général d'Interopérabilité des systèmes d'information"

[2]: https://www.sndi.ci/index.php/actualite/116-2025-10-01-16-10-51.html "SNDI — Lancement officiel de la Plateforme d'Interopérabilité de l'Administration Publique (octobre 2025)"

[3]: https://lexterra.ci/data/domaine/urbain/2021-12-15_D2021-862_SIGFU.pdf "Décret N°2021-862 du 15 décembre 2021 — Création du SIGFU"

[4]: https://idufci.construction.gouv.ci/ "Décret N°2019-221 du 13 mars 2019 — Institution de l'IDUFCI"

[5]: https://www.informea.org/en/content/legislation/ordonnance-ndeg-2025-85-du-12-fevrier-2025-portant-creation-attributions "Ordonnance N°2025-85 du 12 février 2025 — Création du SIFOR-CI"

[6]: https://www.artci.ci/images/stories/pdf/lois/loi_2013_450.pdf "Loi n°2013-450 du 19 juin 2013 — Protection des données à caractère personnel"

[7]: https://www.artci.ci/ "ARTCI — Consultation publique relative aux conditions et modalités d'un accès ouvert aux API (juin 2025)"

[8]: https://www.autoritedeprotection.ci/documents/ "Autorité de Protection des Données Personnelles — Formulaires de déclaration et d'autorisation"

[9]: https://ignfi.fr/references/systeme-integre-de-gestion-du-foncier-urbain-sigfu-2/ "IGN FI — Système Intégré de Gestion du Foncier Urbain (SIGFU)"

[10]: https://www.afor.ci/storage/tenders/3UcFgRMGT1HDYNRdx92emKrAm9pKqwewWOaU6Dou.pdf "AFOR — Termes de référence SIFOR (8 modules)"
