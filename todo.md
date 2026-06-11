# Foncier225 Platform TODO

## Phase 1 — Base de données & Schéma
- [x] Schéma DB complet (users, parcels, parcel_events, verify_tokens, attestations, audit_events)
- [x] Migrations Drizzle poussées
- [x] Helpers DB (queries)

## Phase 2 — Design System & Layout
- [x] Thème global (couleurs, typographie, variables CSS)
- [x] Layout public (navbar, footer)
- [x] DashboardLayout pour back-office (sidebar admin)
- [x] Page d'accueil publique (landing)

## Phase 3 — Authentification & RBAC
- [x] Auth multi-rôles (citizen, agent_terrain, bank, admin)
- [x] Routes protégées par rôle
- [x] Gestion des permissions RBAC avec zones géographiques
- [x] Page de profil utilisateur (via espace citoyen /citizen/profile)

## Phase 4 — Digital Twin Parcelle
- [x] Page publique /parcelle/:publicToken (zéro PII)
- [x] Timeline synthétique des événements
- [x] Statuts publics minimaux (Dossier en cours, En opposition, etc.)
- [x] Disclaimer légal

## Phase 5 — QR Verify
- [x] Génération de tokens opaques SHA-256
- [x] Endpoint public /verify/:token
- [x] Page de vérification publique avec résultat minimal
- [x] Rate limiting sur vérification

## Phase 6 — Back-office Administration
- [x] Dashboard admin avec KPIs et statistiques
- [x] Gestion des utilisateurs (liste, rôles, zones)
- [x] Visualisation des dossiers/parcelles
- [x] Timeline complète (audit + events)
- [x] Audit trail complet (traçabilité actions sensibles)
- [ ] Alertes et notifications admin

## Phase 7 — Tests & Polish
- [x] Tests vitest (auth, parcelles, verify, admin) — 14 tests passent
- [x] Polish UI et responsive
- [x] Vérification accessibilité (focus rings, keyboard nav, semantic HTML)

## v1.1-01 — Espace Citoyen Connecté
- [x] Évolution schéma DB : table documents, lien owner sur parcels
- [x] Helpers DB citoyen (parcelles propres, dossiers, documents, timeline)
- [x] Routes backend citoyen (tRPC citizen router avec isolation stricte)
- [x] Page profil citoyen (/citizen/profile)
- [x] Page mes parcelles (/citizen/parcels)
- [x] Page détail parcelle citoyen (/citizen/parcels/:id)
- [x] Page mes dossiers — fusionné dans timeline (/citizen/timeline)
- [x] Page mes documents (/citizen/documents)
- [x] Layout citoyen (CitizenLayout avec sidebar dédiée)
- [x] Guards et contrôles d'accès côté serveur (isolation par userId)
- [x] Audit trail sur accès citoyen
- [x] Tests vitest espace citoyen — 37 tests passent (36 routers + 1 auth)
- [x] Routing App.tsx mis à jour


## v1.1-02 — Fondations Crédit Habitat

- [x] Schéma DB crédit : tables credit_files, credit_file_participants, credit_documents, credit_requests, credit_offers, credit_decisions
- [x] Enums crédit : CreditFileStatus, CreditDocumentType, CreditDocumentStatus, CreditProductType, CreditDecisionType, CreditRequestType
- [x] Machine d'états crédit : CreditWorkflowService avec transitions valides
- [x] Règles de complétude dossier : STANDARD vs SIMPLIFIED
- [x] Services crédit : credit-files.service.ts, credit-checklist.service.ts, credit-workflow.service.ts
- [x] API tRPC crédit : createCreditFile, listMyCreditFiles, getMyCreditFile, listCreditFileDocuments, getCreditFileChecklist
- [x] Audit trail crédit : événements crédit.file.created avec timestamp et détails
- [x] Feature flag CREDIT_WORKFLOW_ENABLED (shared/featureFlags.ts)
- [x] Tests unitaires crédit : 27 tests credit-workflow.test.ts (transitions, complétude, isolation)
- [x] Tests d'intégration crédit : 36 tests routers.test.ts (création, soumission, audit)
- [x] Validation non-régression existant : 64 tests PASS, 0 erreurs TypeScript
- [x] Checkpoint V1.1-02 (fed46d39)

## v1.1-03 — Fondations Crédit Habitat (Consolidation)

- [x] Enrichir credit_files : publicRef, amountRequestedXof, durationMonths, lastTransitionAt
- [x] Aligner participant roles : CITIZEN, CO_BORROWER, BANK_AGENT, AGENT_TERRAIN
- [x] Enrichir credit_documents : sha256, documentId (FK documents), rejectedAt
- [x] Enrichir credit_offers : apr, monthlyPaymentXof, conditionsText, createdByUserId
- [x] Ajouter index DB sur colonnes clés (7 index créés)
- [x] Activer feature flag guard dans les procédures crédit (assertCreditEnabled)
- [x] Ajouter audit events : 19 types définis (4 actifs + 15 préparés)
- [x] Implémenter submitCreditFile avec validation complétude
- [x] Ajouter documentation technique docs/CREDIT_MODULE.md
- [x] Tests : 47 tests credit-workflow + 36 routers + 1 auth = 84 PASS
- [x] Validation : 0 erreur TypeScript, 84 tests verts
- [x] Checkpoint V1.1-03 (1b65b171)

## v1.1-04 — Parcours Citoyen Crédit Habitat (UI + Upload)

- [ ] Analyse existant : citizen layout, routing, storage S3, conventions upload
- [ ] Backend : route upload S3 pour documents crédit
- [ ] Page liste dossiers crédit (/citizen/credit)
- [ ] Page création dossier crédit (/citizen/credit/new)
- [ ] Page détail dossier crédit (/citizen/credit/:id)
- [ ] Composant CreditChecklist dynamique (requis/optionnels)
- [ ] Composant CreditDocumentUploader (upload S3 + rattachement)
- [ ] Bouton soumission conditionnel (si dossier complet)
- [ ] Intégration sidebar CitizenLayout + routing App.tsx
- [ ] Feature flag UI : état propre si désactivé
- [ ] Tests vitest V1.1-04
- [ ] Non-régression : tests existants verts, pages existantes intactes
- [ ] Documentation technique courte
- [x] Checkpoint V1.1-04 (en cours)

## Résolution conflits Git (fusion changements externes)

- [x] Résolution marqueurs de fusion dans credit-router.ts (6 conflits)
- [x] Résolution marqueurs de fusion dans featureFlags.ts
- [x] Résolution marqueurs de fusion dans App.tsx et CitizenLayout.tsx
- [x] Correction import CreditWorkflowEvent manquant dans credit-router.ts
- [x] Correction Uint8Array iterable dans credit-ui.tsx
- [x] Correction CreditFileDetail.tsx : fileData → fileBase64, mimeType → contentType
- [x] Correction CreditFileDetail.tsx : uploadCreditDocument → addCreditDocument
- [x] Correction test verify : date expiration future (2027 au lieu de 2025)
- [x] Correction test verify : accent supprimé (vérification → verification)
- [x] Correction test bank-credit-router : mocks manquants (listCreditRequestsByFile, etc.)
- [x] Validation : 132 tests PASS, 0 erreurs TypeScript, serveur OK

## v1.2 — Délimitation Villageoise (Simulation Interactive)

- [x] Créer la page DelimitationVillageoise.tsx dans client/src/pages/citizen/
- [x] Ajouter l'entrée "Délimitation villageoise" dans le sidebar CitizenLayout (accessible à tous les rôles)
- [x] Ajouter la route /citizen/delimitation dans App.tsx
- [x] Intégrer Leaflet pour la carte interactive
- [x] Workflow 5 étapes : initialisation, collecte points, validation chef, reconnaissance, synchronisation SIFOR
- [x] Vérifier le fonctionnement sur la plateforme

## v1.2.1 — Import GPX/CSV pour Délimitation Villageoise

- [x] Ajouter un bouton d'import fichier (GPX ou CSV) dans l'étape 2 de collecte des points
- [x] Parser les fichiers GPX (format XML standard avec waypoints/trackpoints)
- [x] Parser les fichiers CSV (colonnes lat, lng, description)
- [x] Charger automatiquement les points sur la carte après import
- [x] Afficher un feedback (nombre de points importés, erreurs éventuelles)
- [x] Vérifier le fonctionnement (0 erreurs TypeScript)

## v1.2.2 — Tableau interactif des points GPS

- [x] Remplacer la liste simple des points par un tableau de données structuré (colonnes: N°, Lat, Lng, Description, Actions)
- [x] Permettre la modification inline des coordonnées et de la description
- [x] Permettre la suppression individuelle avec bouton dédié
- [x] Synchroniser les modifications avec la carte (mise à jour des marqueurs via state React)
- [x] Vérifier le fonctionnement et les tests (145 tests PASS, 0 erreurs TypeScript)

## v1.2.3 — Améliorations tableau GPS

- [x] Export GPX/CSV : bouton pour exporter les points validés/modifiés vers un fichier GPX ou CSV téléchargeable
- [x] Interaction carte ↔ tableau : surbrillance de la ligne du tableau au clic sur un marqueur carte (et inversement)
- [x] Encart superficie/périmètre : affichage automatique de la superficie (hectares) et du périmètre (km) du polygone formé par les points GPS actuels

## v1.3 — Persistance DB de la délimitation villageoise

- [x] Ajouter les tables village_territories, territory_boundary_points, territory_documents dans drizzle/schema.ts
- [x] Exécuter pnpm db:push pour créer les tables en base (migration 0008_gorgeous_gargoyle.sql)
- [x] Créer les helpers DB dans server/db.ts pour CRUD territoires et points (15 helpers)
- [x] Créer le routeur tRPC delimitation-router.ts avec 11 procédures protégées (create, list, getById, savePoints, updatePoint, deletePoint, submitPoints, validateByChief, officialize, syncSifor, uploadDocument, deleteDocument)
- [x] Connecter le frontend DelimitationVillageoise.tsx aux procédures tRPC (vue liste + détail workflow)
- [x] Vérifier le fonctionnement complet (0 erreurs TypeScript, 145 tests PASS)

## v1.3.1 — Corrections sécurité et complétude

- [x] Sécuriser delimitation-router: vérifier l'appartenance des pointId/documentId au territoryId avant update/delete
- [x] Ajouter des tests Vitest pour delimitation-router (19 tests: create, list, getById, savePoints, submitPoints, validateByChief, officialize, syncSifor, ownership checks)
- [x] Ajouter états loading/error/empty pour la vue détail de délimitation

## v1.3.2 — Carte détail, Export PDF/GeoJSON, Statuts visuels

- [x] Ajouter une carte interactive sur la page de détail pour visualiser le polygone formé par les points GPS sauvegardés (composant DetailMapView avec Leaflet, polygone orange + marqueurs verts)
- [x] Intégrer une fonctionnalité d'export PDF ou GeoJSON des données de délimitation d'un village (procédures tRPC exportPdf + exportGeoJSON, upload S3, téléchargement client)
- [x] Mettre en place un système de statut visuel (brouillon, en révision, validé) pour suivre l'avancement de chaque dossier (badges colorés avec icônes, panneau de statut dans la vue détail)

## v1.3.3 — Sélecteur fond de carte, Indicateurs export, Historique statuts

- [x] Ajouter un sélecteur de fond de carte sur la vue détaillée (satellite vs routière) — boutons Routière/Satellite avec tuiles Esri World Imagery
- [x] Ajouter un indicateur de progression et notifications de succès lors des exports PDF et GeoJSON — spinner animé + message de succès
- [x] Intégrer une section chronologique dans le panneau latéral pour retracer l'historique des changements de statut — timeline avec dates et pastilles colorées

## v1.3.4 — Documents par étape, Outil mesure carte, Prévisualisation PDF

- [x] Ajouter une colonne `step` à la table territory_documents pour lier les documents à une étape spécifique
- [x] Mettre à jour le routeur tRPC pour filtrer les documents par étape et permettre l'upload par étape (listDocumentsByStep)
- [x] Afficher les documents justificatifs dans la section chronologique (timeline) avec possibilité d'upload par étape
- [x] Intégrer un outil de mesure de distance et de surface directement sur la carte de détail (boutons Distance/Surface + calcul Haversine/Shoelace)
- [x] Ajouter une option de prévisualisation du PDF généré avant le téléchargement définitif (modale fullscreen avec iframe + bouton télécharger)

## v1.3.5 — Transfert Délimitation Villageoise vers l'Administration

- [x] Déplacer la page DelimitationVillageoise.tsx de client/src/pages/citizen/ vers client/src/pages/admin/
- [x] Retirer l'entrée "Délimitation villageoise" du sidebar CitizenLayout
- [x] Ajouter l'entrée "Délimitation villageoise" dans le sidebar DashboardLayout (admin)
- [x] Mettre à jour les routes dans App.tsx (de /citizen/delimitation vers /admin/delimitation)
- [x] Procédures tRPC déjà protégées par protectedProcedure (accès authentifié requis)
- [x] Vérifier le fonctionnement et les tests (0 erreurs TypeScript, 164 tests PASS)

## v1.3.6 — Statut modifiable pour la délimitation villageoise

- [x] Ajouter une procédure tRPC updateStatus permettant à l'admin de changer manuellement le statut d'un territoire
- [x] Ajouter un sélecteur de statut (dropdown) dans l'interface de la page de détail d'un territoire
- [x] Afficher les 6 statuts : Brouillon, En cours (Collecte), En révision, Validé (Chef), Validé (Officiel), Synchronisé SIFOR
- [x] Enregistrer un audit event à chaque changement de statut manuel (delimitation.territory.status_changed)
- [x] Vérifier le fonctionnement et les tests (0 erreurs TypeScript, 164 tests PASS)

## v1.3.7 — Filtres, badges et historique de statut

- [x] Ajouter des filtres (par statut) et une option de tri (date, nom, statut) dans la liste principale des projets de délimitation
- [x] Associer des couleurs distinctes sous forme de badges pour chaque statut dans le tableau (gris/bleu/ambre/violet/vert/émeraude)
- [x] Créer une table territory_status_history en DB pour stocker l'historique des changements de statut
- [x] Ajouter une procédure tRPC statusHistory pour récupérer l'historique de statut d'un territoire
- [x] Afficher l'historique détaillé des changements de statut avec la date et l'auteur dans l'interface du projet
- [x] Vérifier le fonctionnement et les tests (0 erreurs TypeScript, 167 tests PASS)

## v2.0 — Module Titre Foncier (Procédure complète CF + TF)

- [x] Documentation technique complète du module (docs/TITRE_FONCIER_MODULE.md)
- [x] Schéma DB : tables land_title_applications, land_title_documents, land_title_steps, land_title_oppositions
- [x] Enums : ApplicationType, ApplicationStatus (10 statuts Phase 1 + 7 statuts Phase 2), StepType, DocumentType
- [x] Machine d'états : transitions valides Phase 1 (CF) et Phase 2 (TF)
- [x] Index DB sur colonnes clés (userId, status, applicationNumber)
- [x] Pousser les migrations en base (pnpm db:push)
- [x] Helpers DB pour CRUD applications, documents, étapes, oppositions
- [x] Routeur tRPC titre-foncier avec procédures admin + citoyen
- [x] Tests vitest pour le routeur titre-foncier
- [x] Vérifier le fonctionnement complet (0 erreurs TypeScript, 198 tests PASS)
