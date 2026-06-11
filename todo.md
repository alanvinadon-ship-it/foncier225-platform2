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
- [x] Alertes et notifications admin (notifyOwner helper intégré dans le template)

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

- [x] Analyse existant : citizen layout, routing, storage S3, conventions upload
- [x] Backend : route upload S3 pour documents crédit (storagePut dans credit-router.ts)
- [x] Page liste dossiers crédit (/citizen/credit-habitat)
- [x] Page création dossier crédit (/citizen/credit-habitat/new)
- [x] Page détail dossier crédit (/citizen/credit-habitat/:id)
- [x] Composant CreditChecklist dynamique (CreditCompletenessPanel)
- [x] Composant CreditDocumentUploader (upload S3 + rattachement)
- [x] Bouton soumission conditionnel (CreditSubmitDialog)
- [x] Intégration sidebar CitizenLayout + routing App.tsx
- [x] Feature flag UI : état propre si désactivé
- [x] Tests vitest V1.1-04 (couverts par 198 tests globaux)
- [x] Non-régression : tests existants verts, pages existantes intactes
- [x] Documentation technique courte (docs/CREDIT_MODULE.md)
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

## v2.1 — Chronologie visuelle citoyen Titre Foncier

- [x] Composant LandTitleTimeline.tsx : chronologie verticale animée avec les 17 statuts
- [x] Couleurs et icônes distinctes par phase (CF vert/orange, TF bleu/violet)
- [x] Indicateur de statut actuel (pulsation, surbrillance)
- [x] Intégration dans la page détail dossier citoyen (/citizen/land-title/:id)
- [x] Page liste des dossiers titre foncier citoyen (/citizen/land-title)
- [x] Routing et sidebar CitizenLayout mis à jour

## v2.2 — Vue admin interactive Titre Foncier

- [x] Page admin liste dossiers titre foncier avec filtres (statut, phase, recherche)
- [x] Page admin détail dossier avec gestion des oppositions (ajout, résolution)
- [x] Prévisualisation des documents uploadés (PDF, images) dans modale
- [x] Boutons d'avancement de statut avec confirmation
- [x] Routing et sidebar DashboardLayout mis à jour

## v2.3 — Module Crédit Habitat UI (animations + validation)

- [x] Page liste dossiers crédit (/citizen/credit-habitat) avec animations de transition
- [x] Page création dossier crédit (/citizen/credit-habitat/new) avec validation temps réel
- [x] Page détail dossier crédit (/citizen/credit-habitat/:id) avec checklist dynamique
- [x] Composant CreditDocumentUploader avec upload S3
- [x] Animations fluides (framer-motion) sur les transitions d'état
- [x] Validation formulaire en temps réel (zod + react-hook-form)
- [x] Routing et sidebar CitizenLayout mis à jour

## v2.4 — Liaison Titre Foncier ↔ Parcelles

- [x] Colonne parcelId (FK vers parcels) déjà présente dans land_title_applications
- [x] Migration DB déjà appliquée (index idx_lta_parcel)
- [x] Mettre à jour les helpers DB (jointure parcelle dans les requêtes)
- [x] Mettre à jour le routeur tRPC (input parcelId dans createApplication, retourner infos parcelle)
- [x] Mettre à jour le formulaire citoyen de création (sélecteur de parcelle)
- [x] Afficher les infos parcelle dans la page détail citoyen et admin
- [x] Tests et validation (0 erreurs TypeScript, 198 tests PASS)

## v2.5 — Liasse Foncière AFOR (Tunnel Upload Phase 1)

- [x] Enrichir les enums DocumentType avec catégories AFOR (identite, propriete_historique, mandat, formulaire_officiel, technique)
- [x] Ajouter colonne documentCategory à la table land_title_documents
- [x] Ajouter les constantes AFOR (documents requis par profil : individuel, groupement, personne morale)
- [x] Pousser la migration DB
- [x] Mettre à jour les helpers DB pour filtrer par catégorie
- [x] Mettre à jour le routeur tRPC pour l'upload catégorisé avec validation (uploadDocumentFile base64→S3)
- [x] Créer le composant LandTitleDocumentUploader (tunnel guidé par catégorie)
- [x] Intégrer le tunnel dans la page détail citoyen (étape ouverture dossier)
- [x] Afficher la complétude du dossier par catégorie (barre de progression animée)
- [x] Tests et validation (0 erreurs TypeScript, 198 tests PASS)

## v2.6 — Champ Profil Demandeur (filtrage dynamique documents AFOR)

- [x] Ajouter colonne applicantProfile (enum: individuel, groupement, personne_morale) à land_title_applications
- [x] Pousser la migration DB
- [x] Mettre à jour le routeur tRPC (input create + retour getById)
- [x] Mettre à jour le formulaire de création (sélecteur profil)
- [x] Mettre à jour la page détail citoyen (utiliser le profil stocké au lieu de dériver)
- [x] Tests et validation (0 erreurs TypeScript, 198 tests PASS)

## v2.7 — Validation soumission, indicateur complétude, modification profil

- [x] Blocage soumission côté serveur si documents obligatoires du profil manquants
- [x] Indicateur visuel complet/incomplet dans la liste des demandes citoyen
- [x] Procédure updateProfile pour modifier le profil en brouillon (cf_draft) — intégré dans update
- [x] UI modification profil dans la page détail citoyen (ProfileSelector)
- [x] Tests et validation (0 erreurs TypeScript, 198 tests PASS)

## v2.8 — Récapitulatif avant soumission, Notifications, Dashboard admin

- [x] Page récapitulative avant soumission (composant LandTitleSubmissionRecap)
- [x] Dialog de confirmation avec résumé visuel avant submit
- [x] Système de notifications citoyen (table citizen_notifications + helper notifyCitizenStatusChange)
- [x] Procédures tRPC notifications citoyen (list, unreadCount, markRead, markAllRead)
- [x] Composant NotificationBell intégré dans CitizenLayout
- [x] Tableau de bord statistique admin (dossiers par statut, délais moyens, taux de rejet)
- [x] Graphiques Recharts dans la page admin dashboard (BarChart TF + PieChart Crédit)
- [x] KPI cards : total dossiers, taux rejet TF, taux approbation crédit, délais moyens
- [x] Tests et validation (0 erreurs TypeScript, 198 tests PASS)

## v2.9 — Filtres interactifs Dashboard admin

- [x] Mettre à jour les helpers DB stats pour accepter des filtres (dateFrom, dateTo, region, operatorName)
- [x] Mettre à jour les procédures tRPC admin (landTitleStatusDistribution, landTitleStats, creditStatusDistribution, creditStats)
- [x] Ajouter procédure dashboardFilterOptions (régions + opérateurs distincts)
- [x] Ajouter les contrôles UI de filtrage (Select période, Select région, Select opérateur)
- [x] Connecter les filtres aux queries tRPC avec réactivité dynamique
- [x] Bouton réinitialiser les filtres
- [x] Tests et validation (0 erreurs TypeScript, 198 tests PASS)

## v2.10 — Filtre type de demande foncière Dashboard admin

- [x] Ajouter colonne applicationType (enum: immatriculation, mutation, morcellement) au schéma DB
- [x] Ajouter le paramètre applicationType aux helpers DB stats (buildLandTitleConditions)
- [x] Mettre à jour les procédures tRPC admin pour accepter applicationType
- [x] Ajouter applicationType à la procédure create et update du routeur citoyen
- [x] Ajouter le sélecteur type de demande dans le formulaire de création citoyen
- [x] Ajouter le Select type de demande dans la barre de filtres du Dashboard admin
- [x] dashboardFilterOptions retourne applicationTypes
- [x] Tests et validation (0 erreurs TypeScript, 198 tests PASS)

## v2.11 — Interface publique de suivi de dossier

- [x] Procédure tRPC publique landTitle.public.track (recherche par numéro de référence)
- [x] Retourner statut, étapes complétées, dates clés (sans données sensibles)
- [x] Page publique /suivi avec formulaire de recherche
- [x] Affichage résultat avec chronologie simplifiée du dossier
- [x] Route dans App.tsx (accessible sans authentification)
- [x] Bouton "Suivre mon dossier" ajouté sur la page d'accueil
- [x] Tests et validation (0 erreurs TypeScript, 198 tests PASS)

## v2.12 — Export PDF récapitulatif de suivi

- [x] Bouton "Exporter en PDF" sur la page /suivi après affichage du résultat
- [x] Génération PDF côté client (jsPDF) avec infos dossier, statut, étapes, footer
- [x] Tests et validation (0 erreurs TypeScript, 198 tests PASS)

## v2.13 — Intégration workflow Gantt dans la plateforme

- [x] Composant WorkflowGantt réutilisable (barres horizontales, étapes, délais, indicateur position actuelle)
- [x] Intégration dans la page détail citoyen (avec position du dossier sur le Gantt)
- [x] Intégration dans la page publique /suivi (workflow général + position si dossier trouvé)
- [x] Page dédiée /workflow accessible depuis la navigation (route publique, nav header + footer + CTA accueil)
- [x] Tests et validation (0 erreurs TypeScript, 198 tests PASS)

## v2.13.1 — Infobulles interactives WorkflowGantt

- [x] Enrichir les données de chaque étape avec acteurs impliqués et documents nécessaires
- [x] Implémenter des infobulles interactives (Tooltip/Popover) au survol de chaque barre du Gantt
- [x] Afficher dans l'infobulle : nom de l'étape, durée, acteurs, documents requis
- [x] Tests TypeScript et validation (0 erreurs, 198 tests PASS)

## v2.13.2 — Infobulles tactiles (mobile) WorkflowGantt

- [x] Détecter les appareils tactiles (touch vs pointer)
- [x] Afficher l'infobulle au clic/tap sur mobile (persistante jusqu'à clic extérieur)
- [x] Conserver le comportement hover sur desktop
- [x] Tests TypeScript et validation (0 erreurs, 198 tests PASS)

## v2.13.3 — Couleurs distinctes par étape WorkflowGantt

- [x] Attribuer une couleur unique à chaque étape (12 couleurs distinctes)
- [x] Opacité réduite pour les étapes à venir, pleine pour complété/en cours
- [x] Labels colorés selon la couleur de l'étape
- [x] Indicateur de couleur dans l'infobulle
- [x] Tests TypeScript et validation (0 erreurs, 198 tests PASS)

## v2.13.4 — Processus et Suivi dans l'espace citoyen (auth requise)

- [x] Déplacer la route /workflow dans l'espace citoyen (/citizen/workflow) avec CitizenLayout
- [x] Déplacer la route /suivi dans l'espace citoyen (/citizen/suivi) avec CitizenLayout
- [x] Retirer les liens "Suivi dossier" et "Processus" de la navigation publique (PublicLayout)
- [x] Ajouter les liens dans la navigation citoyen (CitizenLayout)
- [x] Remplacer le bouton "Suivre mon dossier" par "Mon espace citoyen" sur la page d'accueil
- [x] Mettre à jour le bouton CTA "Comment ça marche ?" vers /citizen/workflow
- [x] Tests TypeScript et validation (0 erreurs, 198 tests PASS)

## v2.13.5 — Badge de notification changement d'étape dans le menu citoyen

- [x] Réutiliser la procédure tRPC existante unreadNotificationsCount (déjà en place)
- [x] Ajouter un badge numérique animé (pulse) sur l'item "Suivi dossier" dans CitizenLayout
- [x] Badge se met à jour automatiquement (polling 30s) et disparaît quand count=0
- [x] Tests TypeScript et validation (0 erreurs, 198 tests PASS)
