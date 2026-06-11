# Audit d'intégration du Foncier Urbain sur Foncier225

**Auteur** : Manus AI  
**Date** : 11 juin 2026  
**Version** : 1.0  
**Objet** : Analyse de faisabilité et plan d'architecture pour l'intégration du module Foncier Urbain (procédure ACD) sur la plateforme Foncier225, en complément du module Foncier Rural existant.

---

## 1. Contexte et objectif

La plateforme Foncier225 a été conçue initialement pour numériser la procédure foncière rurale ivoirienne (Certificat Foncier + Titre Foncier, régie par la Loi n° 98-750). L'objectif de cet audit est d'évaluer la capacité de l'architecture existante à accueillir un second moteur de workflow dédié au **foncier urbain** (procédure d'Arrêté de Concession Définitive — ACD), régi par le Code de l'Urbanisme et du Domaine Urbain, sous la tutelle du Ministère de la Construction, du Logement et de l'Urbanisme (MCLU) [1].

Les deux régimes obéissent à des réalités juridiques, administratives et techniques fondamentalement différentes, comme le résume le tableau ci-dessous :

| Critère | Foncier Urbain (ACD) | Foncier Rural (CF/TF) |
|---------|---------------------|----------------------|
| Document de propriété | Arrêté de Concession Définitive (ACD) | Certificat Foncier + Titre Foncier |
| Autorité de tutelle | MCLU | Ministère de l'Agriculture + AFOR |
| Base légale | Code de l'Urbanisme et du Domaine Urbain | Loi n° 98-750 relative au domaine foncier rural |
| Condition de nationalité | Ouvert à toutes les nationalités | Réservé aux Ivoiriens (pleine propriété) |
| Acteurs techniques | Géomètres experts agréés (Ordre des Géomètres) | Opérateurs techniques agréés AFOR |
| Rôle de la coutume | Quasi-inexistant (lotissements approuvés) | Central (constat du droit coutumier) |
| Référencement terrain | Lot / Îlot / Lotissement approuvé | Village / Territoire / Sous-préfecture |

---

## 2. État des lieux de l'architecture existante

### 2.1 Modules déjà implémentés

L'analyse du code source révèle une plateforme structurée en **7 modules fonctionnels** :

| Module | Tables DB | Routeur tRPC | Pages UI |
|--------|-----------|--------------|----------|
| Parcelles & Documents | `parcels`, `parcel_events`, `documents` | `parcelRouter` | ParcelsAdmin, CitizenParcels |
| Vérification QR | `verify_tokens`, `verify_rate_limits` | `verifyRouter` | Verify |
| Crédit Habitat | `credit_files`, `credit_documents`, `credit_offers`, `credit_decisions` | `creditRouter`, `bankCreditRouter` | CitizenCreditFiles, BankCreditFiles |
| Délimitation Villageoise | `village_territories`, `territory_boundary_points`, `territory_documents` | `delimitationRouter` | DelimitationVillageoise |
| Titre Foncier (Rural) | `land_title_applications`, `land_title_steps`, `land_title_documents`, `land_title_oppositions` | `landTitleRouter` | CitizenLandTitle*, AdminLandTitle* |
| Notifications | `citizen_notifications`, `notification_preferences` | intégré dans `citizenRouter` | NotificationSettings |
| Administration système | `system_config`, `audit_events` | `adminRouter` | AdminNotifications, AdminSigConfig, AdminSigDashboard |

### 2.2 Architecture technique

L'architecture repose sur un **modèle modulaire par routeur** :

- **Backend** : tRPC 11 avec Express 4, routeurs spécialisés (`land-title-router.ts`, `delimitation-router.ts`, `credit-router.ts`, `bank-credit-router.ts`)
- **Base de données** : MySQL/TiDB via Drizzle ORM, schéma centralisé dans `drizzle/schema.ts`
- **Authentification** : OAuth Manus avec 4 rôles (`citizen`, `agent_terrain`, `bank`, `admin`)
- **Guards RBAC** : `publicProcedure`, `protectedProcedure`, `adminProcedure`, `bankProcedure`
- **Frontend** : React 19 + Tailwind 4, layouts séparés (PublicLayout, CitizenLayout, DashboardLayout, BankLayout)
- **Cartographie** : Google Maps intégré + composant SigLayerOverlay pour couches WMS/WFS
- **Stockage** : S3 pour les fichiers, avec helpers `storagePut`/`storageGet`

### 2.3 Pattern du module Titre Foncier (modèle de référence)

Le module rural existant (`landTitleRouter`) constitue le **patron d'architecture** à répliquer. Il implémente :

1. **Machine d'états explicite** : 10 statuts Phase 1 (CF) + 7 statuts Phase 2 (TF) avec transitions validées
2. **Sous-routeurs citoyen/admin** : isolation stricte par `userId` côté citoyen, accès complet côté admin
3. **Complétude documentaire** : validation des documents obligatoires selon le profil AFOR avant soumission
4. **Audit trail natif** : événement enregistré à chaque transition de statut
5. **Lien optionnel à `parcels`** : un dossier peut être rattaché à une parcelle existante

---

## 3. Gap Analysis — Ce qui manque pour le Foncier Urbain

### 3.1 Schéma de données

| Besoin | Existant | Gap |
|--------|----------|-----|
| Table des demandes ACD | `land_title_applications` (rural uniquement) | Créer `urban_acd_applications` avec champs spécifiques urbains |
| Métadonnées urbaines (lot, îlot, lotissement) | Absent | Créer `urban_parcel_details` |
| Documents urbains spécifiques | `land_title_documents` (catégories rurales) | Ajouter types : permis de construire, plan de lotissement, attestation de mise en valeur |
| Étapes workflow ACD | `land_title_steps` (étapes rurales) | Créer `urban_acd_steps` avec étapes MCLU |
| Oppositions urbaines | `land_title_oppositions` | Réutilisable tel quel (structure identique) |
| Discriminant urbain/rural sur parcelle | `parcels.zoneCode` (pas de type explicite) | Ajouter `parcels.landType: URBAN | RURAL` |

### 3.2 Workflow et machine d'états

La procédure ACD suit un workflow distinct en **3 phases** :

**Phase 1 — Concession Provisoire (ACP)**
1. Dépôt de la demande (MCLU)
2. Vérification de la disponibilité du lot
3. Instruction technique (géomètre agréé)
4. Commission d'attribution
5. Arrêté de Concession Provisoire (ACP)

**Phase 2 — Mise en valeur**
6. Notification des obligations de mise en valeur
7. Délai de mise en valeur (2-5 ans selon la zone)
8. Constat de mise en valeur (commission technique)

**Phase 3 — Concession Définitive (ACD)**
9. Demande de transformation ACP → ACD
10. Vérification de conformité
11. Signature de l'Arrêté de Concession Définitive
12. Publication au Journal Officiel
13. Délivrance du titre

> **Aucune de ces étapes n'existe actuellement dans la plateforme.** Le module rural a ses propres étapes (constitution dossier, délimitation, enquête publique, publicité foncière, etc.) qui ne sont pas transposables.

### 3.3 Rôles et accès (RBAC)

| Rôle nécessaire | Existant | Gap |
|-----------------|----------|-----|
| Agent MCLU (instruction urbaine) | Non | Ajouter rôle `agent_mclu` |
| Géomètre urbain agréé | Non (seul `agent_terrain` existe, orienté rural) | Ajouter rôle `geometre_urbain` ou étendre `agent_terrain` |
| Commission d'attribution | Non | Nouveau rôle ou workflow admin |
| Conservateur foncier | Non | Ajouter rôle `conservateur` (partagé urbain/rural) |
| Agent AFOR (rural) | Implicite dans `admin` | Clarifier en `agent_afor` |

### 3.4 Cartographie

| Besoin | Existant | Gap |
|--------|----------|-----|
| Couche plans de lotissement | SigLayerOverlay (WMS/WFS générique) | Ajouter couche dédiée "Lotissements approuvés" |
| Référencement lot/îlot sur carte | Absent | Ajouter overlay cadastral urbain |
| Limites zones urbaines | Absent | Intégrer les limites des communes/quartiers |

### 3.5 Frontend

| Besoin | Existant | Gap |
|--------|----------|-----|
| Questionnaire d'orientation (urbain/rural) | Absent | Créer un aiguillage à la création de dossier |
| Formulaire de demande ACD | Absent | Créer `CitizenAcdCreate.tsx` |
| Détail dossier ACD citoyen | Absent | Créer `CitizenAcdDetail.tsx` |
| Liste dossiers ACD citoyen | Absent | Créer `CitizenAcdList.tsx` |
| Admin gestion ACD | Absent | Créer `AdminAcdList.tsx`, `AdminAcdDetail.tsx` |
| Timeline ACD | Absent | Créer `AcdTimeline.tsx` (13 statuts) |

---

## 4. Stratégie d'architecture recommandée

### 4.1 Principe directeur : Tronc commun + Modules spécialisés

```
┌─────────────────────────────────────────────────────────┐
│                    TRONC COMMUN                          │
│  Auth · Notifications · Paiement · Audit · Cartographie │
│  Parcelles · Documents · Vérification QR · Crédit       │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
    ┌─────▼─────┐  ┌────▼────┐  ┌─────▼─────┐
    │  MODULE   │  │ MODULE  │  │  MODULE   │
    │  RURAL    │  │ URBAIN  │  │  CRÉDIT   │
    │ (CF/TF)   │  │ (ACD)   │  │ HABITAT   │
    └───────────┘  └─────────┘  └───────────┘
```

### 4.2 Modèle de données proposé

**Option retenue : Modèle polymorphe avec tables dédiées** (comme recommandé dans le document de référence).

```sql
-- Enrichir la table parcels existante
ALTER TABLE parcels ADD COLUMN landType ENUM('URBAN','RURAL') DEFAULT 'RURAL';

-- Nouvelle table : Détails urbains d'une parcelle
CREATE TABLE urban_parcel_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parcelId INT NOT NULL REFERENCES parcels(id),
  lotNumber VARCHAR(50),        -- Numéro de lot
  ilotNumber VARCHAR(50),       -- Numéro d'îlot
  lotissementName VARCHAR(255), -- Nom du lotissement
  lotissementApprovalDate TIMESTAMP,
  lotissementApprovalRef VARCHAR(100),
  communeName VARCHAR(255),
  quartierName VARCHAR(255),
  planCadastralRef VARCHAR(100),
  surfaceM2 INT,
  usageType ENUM('habitation','commerce','industriel','mixte','equipement'),
  UNIQUE(parcelId)
);

-- Nouvelle table : Demandes ACD
CREATE TABLE urban_acd_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  applicationNumber VARCHAR(50) NOT NULL UNIQUE,
  userId INT NOT NULL REFERENCES users(id),
  parcelId INT REFERENCES parcels(id),
  phase ENUM('provisional','development','definitive') DEFAULT 'provisional',
  status VARCHAR(30) DEFAULT 'acd_draft',
  -- Demandeur
  applicantFullName VARCHAR(255) NOT NULL,
  applicantNationality VARCHAR(100),
  applicantIdType VARCHAR(50),
  applicantIdNumber VARCHAR(100),
  applicantType ENUM('personne_physique','personne_morale') DEFAULT 'personne_physique',
  companyName VARCHAR(255),
  companyRccm VARCHAR(100),
  -- Terrain
  lotNumber VARCHAR(50),
  ilotNumber VARCHAR(50),
  lotissementName VARCHAR(255),
  commune VARCHAR(255),
  quartier VARCHAR(255),
  surfaceM2 INT,
  usagePrevu ENUM('habitation','commerce','industriel','mixte'),
  -- ACP
  acpNumber VARCHAR(100),
  acpSignedAt BIGINT,
  acpExpiryAt BIGINT,
  developmentDeadline BIGINT,
  -- ACD
  acdNumber VARCHAR(100),
  acdSignedAt BIGINT,
  journalOfficielRef VARCHAR(100),
  journalOfficielDate BIGINT,
  -- Meta
  notes TEXT,
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT NOT NULL
);

-- Tables associées (même pattern que land_title_*)
CREATE TABLE urban_acd_steps (...);
CREATE TABLE urban_acd_documents (...);
CREATE TABLE urban_acd_oppositions (...);
```

### 4.3 Machine d'états ACD

```
Phase 1 — Concession Provisoire :
  acd_draft → acd_submitted → acd_lot_check → acd_technical_instruction
  → acd_commission → acd_acp_signed

Phase 2 — Mise en valeur :
  acd_acp_signed → acd_development_notified → acd_development_ongoing
  → acd_development_verified

Phase 3 — Concession Définitive :
  acd_development_verified → acd_transformation_requested → acd_conformity_check
  → acd_acd_signed → acd_journal_officiel → acd_delivered
```

### 4.4 Évolution du RBAC

L'enum `role` dans la table `users` doit être étendue :

```typescript
role: mysqlEnum("role", [
  "citizen",
  "agent_terrain",    // Rural (AFOR)
  "agent_mclu",       // Urbain (MCLU) — NOUVEAU
  "geometre_urbain",  // Géomètre agréé urbain — NOUVEAU
  "conservateur",     // Conservation foncière — NOUVEAU
  "bank",
  "admin",
]).default("citizen").notNull(),
```

Côté backend, ajouter les guards correspondants :

```typescript
export const mcluProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'agent_mclu' && ctx.user.role !== 'admin')
    throw new TRPCError({ code: 'FORBIDDEN' });
  return next({ ctx });
});
```

### 4.5 Aiguillage citoyen

À la création d'un nouveau dossier, le citoyen est orienté via un questionnaire :

1. **Question** : "Votre terrain est-il situé dans une zone urbaine/lotie ou dans un village/zone agricole ?"
2. **Si Urbain** → Redirection vers `/citizen/acd/new` (module ACD)
3. **Si Rural** → Redirection vers `/citizen/land-title/new` (module CF/TF existant)

Ce questionnaire peut être implémenté comme une page intermédiaire `/citizen/new-application` avec deux cartes cliquables.

### 4.6 Cartographie unifiée avec couches séparées

Le composant `SigLayerOverlay` existant supporte déjà les couches WMS/WFS multiples. L'intégration urbaine nécessite :

- **Couche "Lotissements approuvés"** : plans de lotissement vectorisés (GeoServer/QGIS)
- **Couche "Cadastre urbain"** : limites de lots/îlots
- **Couche "Zones d'urbanisme"** : zonage PUD (Plan d'Urbanisme Directeur)
- **Couche rurale existante** : territoires villageois, forêts classées

L'administrateur configure ces couches via la page `/admin/sig-config` déjà en place.

---

## 5. Plan d'implémentation par phases

### Phase A — Fondations (2-3 semaines)

| Tâche | Effort estimé |
|-------|---------------|
| Ajouter `landType` à la table `parcels` | 0,5 jour |
| Créer les tables `urban_parcel_details`, `urban_acd_applications`, `urban_acd_steps`, `urban_acd_documents` | 2 jours |
| Étendre l'enum `role` avec `agent_mclu`, `geometre_urbain`, `conservateur` | 1 jour |
| Créer les guards tRPC `mcluProcedure`, `geometreProcedure` | 0,5 jour |
| Implémenter la machine d'états ACD (transitions, validations) | 2 jours |
| Créer `urban-acd-router.ts` (sous-routeurs citoyen + admin) | 3 jours |
| Tests unitaires du workflow ACD | 2 jours |

### Phase B — Interface citoyen (2 semaines)

| Tâche | Effort estimé |
|-------|---------------|
| Page d'aiguillage `/citizen/new-application` | 1 jour |
| Formulaire de demande ACD `/citizen/acd/new` | 2 jours |
| Page détail dossier ACD `/citizen/acd/:id` | 2 jours |
| Composant `AcdTimeline` (13 statuts, 3 phases) | 1,5 jours |
| Liste des dossiers ACD `/citizen/acd` | 1 jour |
| Upload documents spécifiques ACD | 1,5 jours |
| Intégration dans CitizenLayout (sidebar, navigation) | 0,5 jour |

### Phase C — Interface administration (1,5 semaine)

| Tâche | Effort estimé |
|-------|---------------|
| Page admin liste ACD `/admin/acd` | 1,5 jours |
| Page admin détail ACD `/admin/acd/:id` | 2 jours |
| Gestion des oppositions urbaines | 1 jour |
| Avancement de statut avec validation | 1,5 jours |
| Filtrage par rôle (agents MCLU ne voient que l'urbain) | 1 jour |

### Phase D — Cartographie et intégration (1 semaine)

| Tâche | Effort estimé |
|-------|---------------|
| Ajouter couches urbaines dans SigLayerOverlay | 1,5 jours |
| Visualisation lot/îlot sur la carte du dossier ACD | 2 jours |
| Mise à jour du tableau de bord SIG (stats urbain + rural) | 1 jour |

### Phase E — Notifications et finalisation (1 semaine)

| Tâche | Effort estimé |
|-------|---------------|
| Étendre `citizenNotifications.relatedModule` avec `urban_acd` | 0,5 jour |
| Notifications de changement de statut ACD | 1 jour |
| Tests d'intégration complets | 2 jours |
| Documentation technique `docs/MODULE_ACD.md` | 1 jour |

**Effort total estimé : 8 à 10 semaines** de développement.

---

## 6. Risques et points d'attention

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| Complexité de l'enum `role` (7+ valeurs) | Moyen | Envisager un système de permissions granulaires (table `permissions`) à terme |
| Données cadastrales urbaines non numérisées | Élevé | Prévoir un mode dégradé (saisie manuelle lot/îlot sans carte) |
| Interopérabilité avec le système MCLU existant | Moyen | Prévoir des API d'échange (import/export CSV, connecteur futur) |
| Volume de données urbaines (Abidjan) | Moyen | Indexation et pagination robustes dès le départ |
| Confusion utilisateur entre les deux modules | Faible | Questionnaire d'aiguillage clair + couleurs/icônes distinctes |

---

## 7. Conclusion et recommandation

L'architecture actuelle de Foncier225 est **parfaitement adaptée** à l'intégration du foncier urbain grâce à son modèle modulaire par routeur. Le pattern établi par le module Titre Foncier rural (machine d'états, sous-routeurs, complétude documentaire, audit trail) peut être répliqué quasi à l'identique pour le module ACD.

**Recommandation principale** : Procéder à l'implémentation en commençant par la Phase A (fondations DB + backend), qui pose les bases sans impacter le fonctionnement existant. Le discriminant `landType` sur la table `parcels` et le questionnaire d'aiguillage constituent les deux points de jonction entre les mondes urbain et rural.

---

## Références

[1] Code de l'Urbanisme et du Domaine Urbain de Côte d'Ivoire  
[2] Loi n° 98-750 du 23 décembre 1998 relative au domaine foncier rural  
[3] AFOR — Agence Foncière Rurale, https://www.afor.ci/  
[4] Décret n° 2013-224 portant réglementation de la purge des droits coutumiers sur le sol  
[5] Ministère de la Construction, du Logement et de l'Urbanisme (MCLU)  
