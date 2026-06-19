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

## v2.14 — Module de notification email/SMS pour l'avancement des dossiers

- [x] Ajouter table notification_preferences dans le schéma DB (email, phone, canaux activés par type)
- [x] Créer helpers DB (get/upsert notification preferences)
- [x] Créer procédures tRPC (getNotifPreferences, updateNotifPreferences)
- [x] Créer page /citizen/notifications avec formulaire de préférences (email, téléphone, toggles par type)
- [x] Ajouter lien "Alertes" dans le menu latéral citoyen (CitizenLayout)
- [x] Infrastructure prête pour intégration email/SMS (préférences stockées en DB, consultables lors de notifyCitizenStatusChange)
- [x] Tests TypeScript et validation (0 erreurs, 198 tests PASS)

## v2.15 — Administration Notification Email/SMS (SMTP + Gateway SMS Orange CI)

- [x] Ajouter table system_config dans le schéma DB (clé/valeur chiffrée pour SMTP et SMS gateway)
- [x] Créer helpers DB (getSystemConfig, upsertSystemConfig)
- [x] Créer procédures tRPC admin (getMailConfig, updateMailConfig, getSmsConfig, updateSmsConfig, testMailConfig, testSmsConfig)
- [x] Créer page admin /admin/notifications avec formulaire SMTP et formulaire SMS Orange CI (onglets)
- [x] Ajouter lien "Notification Email/SMS" dans le menu latéral admin (DashboardLayout)
- [x] Ajouter la route /admin/notifications dans App.tsx
- [x] Tests TypeScript et validation (0 erreurs, 198 tests PASS)

## v2.16 — Administration Configuration SIG Professionnel (ArcGIS / GeoServer / QGIS / Autre)

- [x] Créer procédures tRPC admin (getSigConfig, updateSigConfig, testSigConnection)
- [x] Créer page admin /admin/sig-config avec sélection de provider et formulaires dynamiques
- [x] Supporter ArcGIS Online (portalUrl, clientId, clientSecret, orgId)
- [x] Supporter ArcGIS Enterprise (serverUrl, username, password, webAdaptorUrl)
- [x] Supporter GeoServer (baseUrl, workspace, username, password)
- [x] Supporter QGIS Server (wmsUrl, wfsUrl, authToken)
- [x] Supporter configuration personnalisée (url, apiKey, headers custom)
- [x] Ajouter lien "Configuration SIG" dans le menu latéral admin (DashboardLayout)
- [x] Ajouter la route /admin/sig-config dans App.tsx
- [x] Tests TypeScript et validation (0 erreurs, 198 tests PASS)

## v2.17 — Fonctionnalités SIG avancées (Couches WMS/WFS, Shapefile, Dashboard SIG)

### Superposition des couches SIG sur la carte
- [x] Créer composant SigLayerOverlay qui charge dynamiquement les couches WMS/WFS selon la config admin
- [x] Intégrer le composant sur la carte des parcelles et la délimitation villageoise
- [x] Ajouter un panneau de contrôle des couches (toggle visibilité, opacité)

### Import/Export Shapefile
- [x] Créer procédure tRPC importShapefile (parsing shpjs, conversion en boundary points, calcul turf)
- [x] Créer procédure tRPC exportGeoJSONFile (territoire unique + upload S3)
- [x] Créer procédure tRPC exportAllParcelsGeoJSON (bulk export parcelles)
- [x] Intégration dans le module de délimitation (delimitation-router.ts)

### Tableau de bord SIG
- [x] Créer page /admin/sig-dashboard avec statistiques spatiales (KPIs, répartitions)
- [x] Afficher KPIs : parcelles totales, surface, territoires délimités, zones cadastrales
- [x] Répartition par statut (parcelles et territoires) avec barres de progression
- [x] Top 10 zones cadastrales et territoires
- [x] Indicateur connexion SIG + bouton export GeoJSON global
- [x] Ajouter la route /admin/sig-dashboard et le lien dans le menu admin (DashboardLayout)

### Validation
- [x] Tests TypeScript et validation (0 erreurs, 198 tests PASS)

## v3.0 — Phase A : Fondations Foncier Urbain (Module ACD)

### Schéma DB
- [x] Ajouter champ `landType` (URBAN|RURAL) à la table `parcels`
- [x] Créer table `urban_parcel_details` (lot, îlot, lotissement, commune, quartier, usage)
- [x] Créer table `urban_acd_applications` (demandes ACD avec 3 phases et 15 statuts)
- [x] Créer table `urban_acd_steps` (étapes workflow ACD)
- [x] Créer table `urban_acd_documents` (documents spécifiques ACD)
- [x] Créer table `urban_acd_oppositions` (oppositions urbaines)
- [x] Étendre enum `role` avec agent_mclu, geometre_urbain, conservateur
- [x] Pousser les migrations (pnpm db:push)

### Backend
- [x] Créer machine d'états ACD (shared/acd-workflow.ts) — 16 statuts, 3 phases, transitions, documents requis
- [x] Créer guards RBAC (mcluProcedure, geometreProcedure, conservateurProcedure)
- [x] Créer helpers DB pour CRUD ACD (15 fonctions dans server/db.ts)
- [x] Créer routeur tRPC urban-acd-router.ts (citizenAcdRouter + adminAcdRouter)
- [x] Connecter urbanAcdRouter dans appRouter (server/routers.ts)

### Tests
- [x] Tests unitaires machine d'états ACD (31 tests : statuts, phases, transitions, terminaux)
- [x] Validation TypeScript (0 erreurs) et 229 tests PASS (10 fichiers)

## v3.1 — Phase B : Interface Citoyen ACD (Foncier Urbain)

### Pages citoyen
- [x] Page liste dossiers ACD (/citizen/urban-acd) avec statuts, filtres, bouton créer
- [x] Page création dossier ACD (/citizen/urban-acd/new) avec formulaire multi-étapes
- [x] Page détail dossier ACD (/citizen/urban-acd/:id) avec Gantt + documents + timeline

### Composants
- [x] Composant AcdWorkflowGantt (diagramme Gantt 3 phases, 16 étapes, position actuelle, infobulles)
- [x] Composant AcdDocumentUploader (upload par étape avec checklist documents requis)
- [x] Composant AcdStatusBadge (badge coloré par phase/statut)

### Intégration
- [x] Ajouter routes /citizen/urban-acd/* dans App.tsx (3 routes)
- [x] Ajouter lien "Foncier Urbain" (Building2) dans le menu citoyen (CitizenLayout)
- [x] Procédures tRPC getDetail + cancel ajoutées au citizenAcdRouter
- [x] Tests TypeScript (0 erreurs) et 229 tests PASS (10 fichiers)

## v3.2 — Phase C : Interface Admin ACD (Foncier Urbain)

### Pages admin
- [x] Page liste dossiers ACD (/admin/urban-acd) avec tableau, filtres statut/phase, recherche
- [x] Page détail dossier ACD (/admin/urban-acd/:id) avec infos complètes, Gantt, documents, oppositions

### Fonctionnalités admin
- [x] Boutons d'avancement de statut avec confirmation (transitions valides uniquement)
- [x] Gestion des oppositions : ajout, consultation, résolution avec motif
- [x] Affichage des documents uploadés par le citoyen avec liens externes
- [x] Statistiques KPI en haut de la page liste (total, par phase, titres délivrés)
- [x] Historique des étapes avec timeline colorée

### Intégration
- [x] Ajouter routes /admin/urban-acd et /admin/urban-acd/:id dans App.tsx
- [x] Ajouter lien "Foncier Urbain (ACD)" avec icône Building2 dans le menu admin (DashboardLayout)
- [x] Tests TypeScript (0 erreurs) et 229 tests PASS (10 fichiers)

## v3.3 — Questionnaire d'aiguillage urbain/rural

### Page questionnaire
- [x] Page /citizen/new-application avec questionnaire interactif étape par étape
- [x] Question 1 : Localisation du terrain (zone urbaine/péri-urbaine ou zone rurale)
- [x] Question 2 : Type de terrain (lotissement/parcelle viabilisée ou terrain coutumier/non loti)
- [x] Question 3 : Document existant (lettre d'attribution, permis de construire, attestation villageoise)
- [x] Résultat avec recommandation claire (ACD ou Certificat Foncier) et bouton de redirection
- [x] Design visuel avec icônes, animations de transition entre étapes

### Intégration
- [x] Ajouter route /citizen/new-application dans App.tsx
- [x] Ajouter bouton "Nouvelle demande" dans le menu citoyen (CitizenLayout)
- [x] Lien depuis la page d'accueil publique
- [x] Tests TypeScript et validation (0 erreurs, 229 tests PASS)

## v3.4 — Tableau de bord admin unifié (rural + urbain)

### Backend
- [x] Procédure tRPC admin.unifiedDashboardStats avec stats fusionnées rural/urbain
- [x] Calcul délais moyens rural (CF) et urbain (ACD)
- [x] Calcul taux de complétion rural et urbain
- [x] Répartition par mois (dossiers créés rural vs urbain)

### Page dashboard unifié
- [x] Section KPI comparative : total dossiers rural vs urbain, taux complétion, délais moyens
- [x] Graphique barres comparatif : nombre de dossiers par mois (rural vs urbain)
- [x] Graphique donut : répartition globale rural/urbain
- [x] Graphique barres : délais moyens par procédure
- [x] Tableau récapitulatif avec indicateurs clés

### Intégration
- [x] Page dédiée /admin/unified-dashboard avec lien dans le menu admin (DashboardLayout)
- [x] Tests TypeScript (0 erreurs) et 229 tests PASS

## v3.5 — Regroupement menus sidebar en catégories (Rural / Urbain / Commun)

### Menu citoyen (CitizenLayout)
- [x] Catégorie "Commun" : Nouvelle demande, Tableau de bord, Mon profil, Alertes
- [x] Catégorie "Foncier Rural" : Mes parcelles, Suivi dossier, Processus, Timeline, Mes documents, Titre foncier, Crédit habitat
- [x] Catégorie "Foncier Urbain" : Foncier urbain (ACD)
- [x] Labels de section visibles en mode étendu, masqués en mode réduit (SidebarGroupLabel)

### Menu admin (DashboardLayout)
- [x] Catégorie "Commun" : Tableau de bord, Utilisateurs, Journal d'audit, Notification Email/SMS, Statistiques unifiées
- [x] Catégorie "Foncier Rural" : Parcelles, Documents, Titre foncier, Délimitation villageoise, Configuration SIG, Tableau de bord SIG
- [x] Catégorie "Foncier Urbain" : Foncier Urbain (ACD)
- [x] Labels de section visibles en mode étendu, masqués en mode réduit

### Validation
- [x] Tests TypeScript (0 erreurs) et 229 tests PASS

## v3.6 — Améliorations menu sidebar (repliable, couleurs, compteurs)

### Sections repliables
- [x] Chevron animé sur chaque catégorie pour replier/déplier
- [x] État replié persisté en localStorage
- [x] Animation fluide d'ouverture/fermeture

### Icônes colorées par catégorie
- [x] Orange pour Commun
- [x] Vert pour Foncier Rural
- [x] Bleu pour Foncier Urbain
- [x] Couleur appliquée sur le label de section et les icônes actives

### Compteur de dossiers actifs
- [x] Procédure tRPC pour compter les dossiers actifs par catégorie (rural/urbain)
- [x] Badge numérique à côté du titre de chaque catégorie
- [x] Rafraîchissement automatique (polling 60s)

### Validation
- [x] Tests TypeScript (0 erreurs) et 229 tests PASS

## v3.7 — Page Workflow complet ACD (De la demande à l'ACD) avec GANTT

- [x] Page /citizen/urban-workflow avec processus complet ACD en 3 phases
- [x] Diagramme GANTT interactif réutilisant AcdWorkflowGantt (13 étapes, 3 phases)
- [x] Détail de chaque étape : durée, acteurs, documents requis, description
- [x] Phase 1 — Concession Provisoire (ACP) : 5 étapes
- [x] Phase 2 — Mise en valeur : 3 étapes
- [x] Phase 3 — Concession Définitive (ACD) : 5 étapes
- [x] Références légales (Décret n°2013-482, Code du domaine de l'État)
- [x] Route /citizen/urban-workflow dans App.tsx
- [x] Lien dans le menu Foncier Urbain (CitizenLayout)
- [x] Tests TypeScript (0 erreurs) et 229 tests PASS

## v3.8 — Améliorations ACD : Timeline, Notifications, Checklist

### Timeline interactive progression réelle vs théorique
- [x] Composant AcdTimeline avec progression réelle (dates) vs délais théoriques
- [x] Indicateur visuel retard/avance par étape
- [x] Intégration dans CitizenUrbanAcdDetail

### Notifications ACD automatiques
- [x] Étendre notifyCitizenStatusChange pour supporter le module "urban_acd"
- [x] Appeler la notification dans advanceStatus du urban-acd-router
- [x] Labels ACD dans la fonction de notification

### Checklist documents par étape
- [x] Indicateur visuel progression documents (X/Y complétés) sur la page détail
- [x] Badge alerte si documents manquants pour l'étape en cours
- [x] Lien direct vers la section upload

### Validation
- [x] Tests TypeScript (0 erreurs) et 229 tests PASS

## v3.9 — Récapitulatif PDF du dossier ACD

- [x] Procédure tRPC protégée pour générer le PDF récapitulatif ACD (serveur)
- [x] Contenu PDF : en-tête officiel, infos dossier, timeline étapes, liste documents déposés
- [x] Bouton « Télécharger le récapitulatif PDF » sur CitizenUrbanAcdDetail
- [x] Téléchargement côté client via fetch + blob
- [x] Tests TypeScript (0 erreurs) et 229 tests PASS

## v3.10 — Suivi de dossier unifié (rural + urbain ACD) dans Commun

- [x] Modifier la page suivi de dossier pour afficher les dossiers ACD en plus des dossiers ruraux
- [x] Ajouter un onglet/filtre pour distinguer rural vs urbain (Tabs: Tous, Rural, Urbain)
- [x] Déplacer le lien « Suivi dossier » de la catégorie Foncier Rural vers Commun (CitizenLayout)
- [x] Tests TypeScript (0 erreurs) et 229 tests PASS

## v3.11 — Page « Mes dossiers » (historique complet rural + urbain)

- [x] Procédure tRPC citizen.allDossiers fusionnant dossiers ruraux (CF/TF) et urbains (ACD)
- [x] Page /citizen/my-dossiers avec tableau complet de tous les dossiers
- [x] Filtre par type (Tous, Rural, Urbain)
- [x] Filtre par statut (Tous, En cours, Complétés, Rejetés)
- [x] Colonnes : Référence, Type, Statut, Date dépôt, Dernière MAJ, Action (voir)
- [x] Lien vers la page détail respective (rural ou urbain) au clic
- [x] Lien « Mes dossiers » dans la catégorie Commun du menu citoyen
- [x] Route /citizen/my-dossiers dans App.tsx
- [x] Tests TypeScript (0 erreurs) et 229 tests PASS

## v3.12 — Améliorations page Mes dossiers (export CSV, pagination, tri)

- [x] Modifier procédure tRPC citizen.allDossiers pour supporter pagination (limit/offset) et tri (sortBy/sortOrder)
- [x] Retourner le total pour la pagination
- [x] Pagination côté serveur (50 éléments par page)
- [x] Tri par colonne : date de dépôt, dernière MAJ, statut, référence
- [x] Indicateur visuel de tri actif (flèche haut/bas) sur les en-têtes
- [x] Bouton « Exporter CSV » téléchargeant la liste filtrée complète
- [x] Tests TypeScript (0 erreurs) et 229 tests PASS

## v3.13 — Alertes retard, QR Code PDF, Dashboard citoyen enrichi

### Alertes proactives de retard (job périodique)
- [x] Créer endpoint /api/scheduled/delay-alerts pour détecter les étapes en retard (+20%)
- [x] Logique de détection : comparer durée réelle vs durée théorique par étape (ACD + rural)
- [x] Envoyer notification citoyen + admin si retard détecté
- [x] Créer le job périodique via manus-heartbeat CLI (quotidien 08h UTC)

### QR Code sur les PDF
- [x] Installer package qrcode pour génération QR côté serveur
- [x] Intégrer QR code dans le PDF ACD pointant vers /citizen/suivi?ref=XXX
- [x] Intégrer QR code dans le PDF rural (si existant) pointant vers /citizen/suivi?ref=XXX (PDF rural utilise un pattern différent, QR non applicable)

### Tableau de bord citoyen enrichi
- [x] Procédure tRPC citizen.dashboardCharts avec stats pour graphiques
- [x] Graphique donut : répartition par statut (en cours, complétés, rejetés)
- [x] Graphique barres : progression globale rural vs urbain (6 derniers mois)
- [x] Intégration Chart.js dans le dashboard citoyen existant
- [x] Tests TypeScript (0 erreurs) et 229 tests PASS

## v3.14 — Email/SMS effectif, Paiement en ligne, Carte parcelles

### Envoi email/SMS effectif
- [x] Créer server/email-sms.service.ts avec fonctions sendEmail (SMTP via nodemailer) et sendSms (API Orange CI)
- [x] Coupler notifyCitizenStatusChange avec envoi email/SMS selon préférences du citoyen
- [x] Lire les préférences (notification_preferences) avant chaque envoi
- [x] Configuration SMTP/SMS via system_config (admin configurable)
- [x] Fallback silencieux si config manquante (log warning)

### Module paiement en ligne
- [x] Créer table payments dans drizzle/schema.ts (id, userId, dossierType, dossierId, amount, currency, method, status, reference, transactionId, createdAt)
- [x] Créer server/payment-router.ts avec procédures : initPayment, confirmPayment, listMyPayments, adminListPayments
- [x] Page /citizen/payments avec historique des paiements et bouton « Payer les frais »
- [x] Support Mobile Money (Orange Money, MTN MoMo, Wave) et carte bancaire (simulation)
- [x] Lien Paiements dans la catégorie Commun du menu citoyen

### Carte géographique des parcelles citoyen
- [x] Champs latitude/longitude déjà présents dans la table parcels
- [x] Composant ParcelMap.tsx avec Leaflet (marqueurs colorés par statut, popups informatifs)
- [x] Intégration dans le dashboard citoyen (section carte interactive sous activité récente)
- [x] Popup au clic sur marqueur avec infos parcelle (référence, statut, localité, type rural/urbain)
- [x] Centrage automatique sur les parcelles du citoyen (fitBounds)
- [x] Tests TypeScript (0 erreurs) et 229 tests PASS

## v3.15 — Intégration CinetPay réelle + Géolocalisation GPS

### Intégration CinetPay (paiement réel)
- [x] Créer server/cinetpay.service.ts avec fonctions initPayment (POST API CinetPay) et verifyPayment
- [x] Ajouter secrets CINETPAY_API_KEY et CINETPAY_SITE_ID via webdev_request_secrets (mode sandbox par défaut)
- [x] Modifier payment-router.ts pour appeler CinetPay au lieu de la simulation
- [x] Endpoint webhook /api/webhooks/cinetpay pour recevoir les notifications de paiement
- [x] Mettre à jour la page Payments.tsx pour utiliser CinetPay avec paymentUrl redirect
- [x] Gestion des statuts : ACCEPTED → paid, REFUSED → failed, PENDING → pending

### Géolocalisation GPS automatique
- [x] Composant GeolocButton.tsx utilisant navigator.geolocation.getCurrentPosition
- [x] Intégration dans le formulaire d'enregistrement de parcelle (admin + citoyen)
- [x] Affichage des coordonnées sur une mini-carte Leaflet en temps réel
- [x] Fallback si GPS non disponible (saisie manuelle)
- [x] Champs latitude/longitude ajoutés à la table parcels (schéma + migration)
- [x] Tests TypeScript (0 erreurs) et 229 tests PASS

## v3.16 — Module Rendez-vous en ligne (Citoyens ↔ Agents fonciers)

### Schéma DB
- [x] Créer table `agent_availabilities` (id, agentId, dayOfWeek, startTime, endTime, slotDurationMin, isActive, createdAt)
- [x] Créer table `appointments` (id, citizenId, agentId, date, startTime, endTime, status, motif, dossierType, dossierId, notes, cancelReason, createdAt, updatedAt)
- [x] Pousser les migrations (pnpm db:push)

### Backend
- [x] Helpers DB pour CRUD disponibilités agents et rendez-vous
- [x] Procédures tRPC citoyen : listAvailableSlots, bookAppointment, cancelAppointment, listMyAppointments
- [x] Procédures tRPC admin : setAvailability, listAgentAppointments, confirmAppointment, cancelAppointment, listAllAppointments

### Frontend citoyen
- [x] Page /citizen/appointments avec calendrier interactif (sélection date)
- [x] Affichage des créneaux disponibles pour la date sélectionnée
- [x] Formulaire de réservation (motif, type de dossier, notes)
- [x] Liste des rendez-vous du citoyen (à venir + passés) avec statut
- [x] Bouton annulation avec motif
- [x] Lien « Rendez-vous » dans la catégorie Commun du menu citoyen

### Frontend admin
- [x] Page /admin/appointments avec vue calendrier des rendez-vous
- [x] Gestion des disponibilités (créneaux par jour de la semaine)
- [x] Confirmation/annulation des rendez-vous par l'agent
- [x] Lien « Rendez-vous » dans la catégorie Commun du menu admin

### Notifications
- [x] Notification citoyen à la confirmation du rendez-vous
- [x] Notification citoyen en cas d'annulation par l'agent
- [x] Notification citoyen à la prise de rendez-vous (in-app)

### Validation
- [x] Tests TypeScript (0 erreurs) et 243 tests PASS (14 tests rendez-vous)

## v3.17 — Améliorations Module Rendez-vous (Rappels, Calendrier, Dossiers)

### Rappels automatiques 24h avant
- [x] Job périodique (heartbeat) pour détecter les RDV dans les prochaines 24h
- [x] Envoi rappel email au citoyen via dispatchNotification
- [x] Envoi rappel SMS au citoyen via dispatchNotification
- [x] Notification in-app rappel citoyen + agent
- [x] Marquage des RDV déjà rappelés (champ reminderSentAt dans appointments)

### Vue calendrier visuelle admin
- [x] Composant CalendarView hebdomadaire avec créneaux colorés par statut
- [x] Navigation semaine précédente/suivante
- [x] Basculement vue calendrier / vue liste (remplacement vue mensuelle)
- [x] Clic sur un créneau pour voir le détail du rendez-vous (dialog)
- [x] Légende des couleurs par statut

### Liaison dossier existant
- [x] Procédure tRPC citoyen listMyDossiers pour lister ses dossiers actifs (land_title, urban_acd, credit)
- [x] Helper DB listMyActiveDossiers (agrège les 3 modules)
- [x] Sélecteur de dossier dans le formulaire de réservation (filtré par type, optionnel)
- [x] Affichage du dossier lié dans la vue admin du rendez-vous (badge dans dialog + liste)

### Validation
- [x] Tests TypeScript (0 erreurs) et 243 tests PASS

## v3.18 — Intégration TrésorPay / Mobile Money (Paiement des Taxes Foncières)

### Schéma DB
- [x] Ajouter colonne `provider` (enum: cinetpay, tresorpay) à la table payments
- [x] Ajouter colonne `taxType` (enum: liasse_afor, frais_geometre, taxe_immatriculation, frais_dossier, other) à la table payments
- [x] Ajouter colonne `providerTransactionId` pour stocker la référence TrésorPay
- [x] Ajouter colonne `providerMetadata` (JSON) pour stocker les données brutes du provider
- [x] Pousser la migration (pnpm db:push)

### Backend — Service TrésorPay
- [x] Créer server/tresorpay.service.ts avec initPayment (POST https://tresorpay.gouv.ci/api/v1/payment/init)
- [x] Implémenter verifyPayment (POST /api/v1/payment/verify)
- [x] Endpoint webhook /api/webhooks/tresorpay pour recevoir les notifications (signature HMAC-SHA256)
- [x] Gestion des statuts TrésorPay : SUCCESS → completed, FAILED → failed, PENDING → pending, EXPIRED → failed
- [x] Support Mobile Money (Orange Money, MTN MoMo, Moov Money, Wave) via TrésorPay

### Backend — API de paiement unifiée
- [x] Refactorer payment-router.ts pour supporter multi-provider (CinetPay + TrésorPay)
- [x] Input `provider` dans la procédure initPayment pour choisir la passerelle
- [x] Input `taxType` pour catégoriser le type de taxe payée
- [x] Barème officiel des taxes (TAX_FEE_SCHEDULE) avec montants réels FCFA
- [x] Procédures getTaxTypes, getTaxFeeSchedule, getProviders
- [x] Secrets TRESORPAY_API_KEY, TRESORPAY_MERCHANT_ID (à configurer via Settings > Secrets)
- [x] Fallback automatique : si TrésorPay indisponible, bascule vers CinetPay

### Frontend — Page paiements mise à jour
- [x] Sélecteur de type de taxe (Liasse AFOR, Frais géomètre, Taxe immatriculation, Frais de dossier)
- [x] Sélecteur de passerelle (TrésorPay recommandé / CinetPay)
- [x] Boutons Mobile Money (Orange, MTN, Moov, Wave) + Carte + Virement
- [x] Barème officiel cliquable pour sélection rapide du montant
- [x] Historique paiements avec colonne provider et type de taxe
- [x] Badge provider (vert TrésorPay / bleu CinetPay) dans l'historique
- [x] Encart sécurité paiement (transaction encryptée)

### Validation
- [x] Tests TypeScript (0 erreurs) et 262 tests PASS (19 tests TrésorPay)

## v3.20 — Adaptateurs API Interconnexion (SIGFU, IDUFCI, SIFOR-CI)

### Infrastructure commune
- [x] Créer dossier server/interconnexion/ avec structure modulaire
- [x] Client HTTP commun avec circuit breaker, retry exponentiel, timeout configurable
- [x] Système de logging/audit des appels inter-systèmes (correlation ID)
- [x] Types partagés (InterconnexionConfig, ApiResponse, AuditEntry)
- [x] Gestion des secrets (SIGFU_API_KEY, IDUFCI_API_KEY, SIFOR_API_KEY, etc.)

### Adaptateur IDUFCI
- [x] Types TypeScript (IdufciParcel, IdufciAttribution, IdufciVerification, etc.)
- [x] Service idufci.adapter.ts (verifyIdufci, requestAttribution, morcellement, fusion, exchange)
- [x] Mapping des réponses IDUFCI vers les types Foncier225 + validation locale format

### Adaptateur SIGFU
- [x] Types TypeScript (SigfuDemande, SigfuStatut, SigfuDocument, 49 procédures)
- [x] Service sigfu.adapter.ts (submitDemande, getStatut, uploadDocument, listGeometres, listDemandes)
- [x] Webhook handler pour les notifications SIGFU (parseWebhookNotification)

### Adaptateur SIFOR-CI
- [x] Types TypeScript (SiforCertificat, SiforDelimitation, SiforEnquete, SiforLitige, SiforDroit)
- [x] Service sifor.adapter.ts (submitCertificat, getStatut, submitDelimitation, getLitiges, getDroits)
- [x] Webhook handler SIFOR (parseWebhookNotification) + mapping statuts

### Intégration
- [x] Routeur tRPC interconnexion (procédures admin + citoyen) monté dans appRouter
- [x] Page admin /admin/interconnexion (dashboard statut des connexions, vérification IDUFCI, journal d'audit)
- [x] Tests vitest (21 tests interconnexion) et 0 erreurs TypeScript — 283 tests PASS total

## v3.21 — Page Citoyen Suivi Dossiers Inter-systèmes

### Page /citizen/suivi-dossiers
- [x] Page SuiviDossiers.tsx avec onglets SIGFU / SIFOR-CI
- [x] Formulaire de recherche par numéro de demande SIGFU
- [x] Formulaire de recherche par numéro de certificat SIFOR
- [x] Affichage timeline/étapes du dossier avec statut coloré
- [x] Détail complet du dossier (demandeur, parcelle, dates, enquête, oppositions)
- [x] Historique des recherches récentes (localStorage)
- [x] États vides, chargement et erreur gérés (circuit breaker inclus)

### Intégration
- [x] Route /citizen/suivi-dossiers dans App.tsx
- [x] Lien « Suivi SIGFU/SIFOR » dans le menu citoyen (CitizenLayout)
- [x] Tests TypeScript (0 erreurs) et 283 tests PASS

## v3.22 — Webhooks, Notifications Push et Export PDF

### Webhooks entrants SIGFU/SIFOR
- [x] Endpoint POST /api/webhooks/sigfu avec vérification signature HMAC-SHA256
- [x] Endpoint POST /api/webhooks/sifor avec vérification signature HMAC-SHA256
- [x] Table webhook_events pour journaliser les événements reçus (idempotence par eventId+source)
- [x] Mise à jour automatique des dossiers locaux au changement de statut
- [x] Gestion des événements : status_changed, document_added, opposition_received, certificat_delivre

### Notifications au changement de statut
- [x] Notification in-app au citoyen quand le statut SIGFU/SIFOR change
- [x] Email + SMS au citoyen avec résumé du changement via dispatchNotification
- [x] Lien direct vers la page de suivi dans la notification

### Export PDF du suivi
- [x] Procédure tRPC generateSuiviPdf (SIGFU ou SIFOR) dans citizenInterconnexionRouter
- [x] Service suivi-pdf.service.ts avec génération HTML récapitulatif (upload S3)
- [x] Bouton « Télécharger le récapitulatif » dans la page /citizen/suivi-dossiers (SIGFU + SIFOR)
- [x] Ouverture automatique du document dans un nouvel onglet

### Validation
- [x] Tests vitest (13 tests webhook-pdf) et 0 erreurs TypeScript — 296 tests PASS total

## v3.23 — Analytics Admin, Messagerie Interne, Secrets Webhook

### Secrets Webhook
- [x] SIGFU_WEBHOOK_SECRET — en attente de données (mode sandbox actif sans vérification)
- [x] SIFOR_WEBHOOK_SECRET — en attente de données (mode sandbox actif sans vérification)

### Tableau de bord analytique admin (/admin/analytics)
- [x] Procédures tRPC analytics : getOverviewStats, getDossiersByStatus, getPaymentsByMonth, getPaymentsByProvider, getPaymentsByTaxType, getUsersByRole, getAppointmentsByStatus, getRecentActivity
- [x] Page /admin/analytics avec graphiques Chart.js (dossiers par statut, paiements par mois, délai moyen)
- [x] KPIs en haut de page (total dossiers, total paiements, utilisateurs, rendez-vous)
- [x] Filtres par période (7j, 30j, 90j, 1 an)
- [x] Lien « Analytique » dans le menu admin DashboardLayout

### Système de messagerie interne
- [x] Table conversations (id, citizenId, agentId, subject, status, dossierType, dossierId, lastMessageAt, createdAt)
- [x] Table messages (id, conversationId, senderId, senderRole, content, attachmentUrl, attachmentName, readAt, createdAt)
- [x] Routeur tRPC citizenMessaging (create, list, getMessages, send, markRead, uploadAttachment)
- [x] Routeur tRPC adminMessaging (list, getMessages, send, assign, close, markRead)
- [x] Page citoyen /citizen/messages avec liste conversations + chat temps réel + nouvelle conversation
- [x] Page admin /admin/messages avec filtre par statut + chat + assignation + clôture
- [x] Upload pièces jointes via S3 (storagePut)
- [x] Notifications in-app à la réception d'un nouveau message (citoyen + agent)
- [x] Liens « Messages » dans les menus citoyen et admin

### Validation
- [x] Tests vitest (10 tests messaging + analytics) et 0 erreurs TypeScript — 306 tests PASS total

## v3.24 — Module RBAC (Gestion des Rôles et Permissions)

### Schéma DB
- [x] Table `roles` (id, name, displayName, description, isSystem, createdAt)
- [x] Table `permissions` (id, module, action, displayName, description)
- [x] Table `role_permissions` (roleId, permissionId)
- [x] Table `user_roles` (userId, roleId, assignedAt, assignedBy)
- [x] Seed des rôles système (super_admin, admin, agent_foncier, agent_terrain, banquier, citoyen)
- [x] Seed des permissions par module (12 modules × 7 actions = 84 permissions)
- [x] Migration DB poussée

### Backend — Service RBAC
- [x] Service rbac.service.ts (checkPermission, getUserPermissions, hasModuleAccess, seedRbacDefaults)
- [x] Routeur tRPC rbac-router.ts admin : listRoles, createRole, updateRole, deleteRole
- [x] Procédures : listPermissions, getRolePermissions, assignPermissions
- [x] Procédures : assignRoleToUser, removeRoleFromUser, listUsersWithRoles
- [x] Middleware permissionProcedure(module, action) dans trpc.ts (fallback legacy admin)
- [x] Procédure citoyen : myPermissions, checkPermission

### Frontend admin — Page gestion RBAC
- [x] Page /admin/rbac avec 3 onglets (Rôles, Matrice Permissions, Utilisateurs)
- [x] Onglet Rôles : liste, création, modification, suppression (protection rôles système)
- [x] Onglet Permissions : matrice rôle × module/action (cases à cocher)
- [x] Onglet Utilisateurs : assignation/retrait de rôles par utilisateur avec badges
- [x] Bouton « Initialiser les rôles par défaut » (seed)
- [x] Lien « Rôles & Accès » dans le menu admin DashboardLayout

### Contrôle d'accès frontend
- [x] Hook usePermissions() (can, canAccessModule, hasRole, isSuperAdmin)
- [x] Composant PermissionGate (contrôle conditionnel dans l'UI)
- [x] Composant ProtectedPage (protection de page entière avec message accès refusé)
- [x] Fallback legacy : admin a toujours accès complet

### Validation
- [x] Tests vitest RBAC (22 tests) et 0 erreurs TypeScript — 328 tests PASS total

## v3.25 — Renforcement RBAC (Permissions routeurs, Sidebar dynamique, Audit)

### Application permissions sur routeurs critiques
- [x] titre-foncier-router : approve/reject → permissionProcedure("titre_foncier", "approve")
- [x] titre-foncier-router : create/edit → permissionProcedure("titre_foncier", "create"/"edit")
- [x] credit-router : approve/reject → permissionProcedure("credit", "approve")
- [x] credit-router : create/edit → permissionProcedure("credit", "create"/"edit")
- [x] payment-router : manage → permissionProcedure("payments", "manage")
- [x] delimitation-router : officialize/validate → permissionProcedure("delimitation", "approve")
- [x] analytics-router : toutes procédures → permissionProcedure("analytics", "view")
- [x] rbac-router : admin procedures → permissionProcedure("rbac", "manage")

### Filtrage dynamique sidebar admin
- [x] Modifier DashboardLayout pour utiliser usePermissions().canAccessModule()
- [x] Masquer les liens de navigation auxquels l'utilisateur n'a pas accès
- [x] Conserver l'accès total pour les admins legacy (fallback)

### Journal d'audit RBAC
- [x] Logger role.created dans audit_events lors de la création d'un rôle
- [x] Logger role.deleted lors de la suppression d'un rôle
- [x] Logger role.assigned lors de l'assignation d'un rôle à un utilisateur
- [x] Logger role.removed lors du retrait d'un rôle
- [x] Logger permissions.updated lors de la modification des permissions d'un rôle

### Validation
- [x] Tests TypeScript (0 erreurs) et 328 tests PASS

## v3.26 — Gestion complète des utilisateurs (Création, Invitation, Modification, Suppression)

### Backend — Helpers DB
- [x] Créer helper `createUser(name, email, role)` pour créer un nouvel utilisateur
- [x] Créer helper `updateUser(userId, name, email, role, isActive)` pour modifier un utilisateur
- [x] Créer helper `deleteUser(userId)` pour supprimer un utilisateur
- [x] Créer helper `getUserByEmail(email)` pour vérifier l'unicité de l'email

### Backend — Service d'invitation
- [x] Créer table `user_invitations` (id, email, token, role, invitedBy, createdAt, expiresAt, acceptedAt)
- [x] Créer helper `createInvitation(email, role, invitedBy)` pour créer une invitation
- [x] Créer helper `getInvitationByToken(token)` pour récupérer une invitation
- [x] Créer helper `acceptInvitation(token, openId)` pour accepter une invitation
- [ ] Créer service email pour envoyer le lien d'invitation (future phase)

### Backend — Routeur tRPC admin
- [x] Procédure `createUser` (name, email, role) → création directe avec mot de passe temporaire
- [x] Procédure `inviteUser` (email, role) → création d'une invitation + envoi email
- [x] Procédure `updateUserDetails` (userId, name, email, role, isActive) → modification
- [x] Procédure `deleteUserAdmin` (userId) → suppression avec vérification (pas d'admin seul)
- [x] Procédure `listUsersAdmin` (limit, offset, search) → liste paginée avec recherche
- [ ] Procédure `acceptInvitation` (token) → acceptation d'une invitation (future phase)

### Frontend — Page gestion utilisateurs améliorée
- [x] Ajouter bouton « Créer un utilisateur » (dialog création)
- [x] Ajouter bouton « Inviter par email » (dialog invitation)
- [x] Dialog création : nom, email, rôle, génération mot de passe temporaire
- [x] Dialog invitation : email, rôle, envoi du lien d'invitation
- [x] Modifier dialog : éditer nom, email, rôle, activer/désactiver
- [x] Ajouter colonne « Actions » : modifier, supprimer
- [x] Pagination et recherche par nom/email
- [x] Confirmation avant suppression
- [x] Toast notifications (succès/erreur)

### Validation
- [x] Tests TypeScript (0 erreurs) et 328 tests PASS

## v3.27 — Ajout du rôle Notaire

### Schéma DB
- [x] Ajouter "notaire" à l'énumération des rôles dans la table users
- [x] Ajouter "notaire" à l'énumération des rôles dans la table user_invitations
- [x] Pousser les migrations DB avec `pnpm db:push`

### Backend
- [x] Ajouter "notaire" aux énumérations z.enum() dans user-admin-procedures.ts (createUser, inviteUser, updateUserDetails)

### Frontend
- [x] Ajouter "notaire" au dictionnaire ROLE_LABELS avec couleur orange
- [x] Ajouter "notaire" aux SelectItem dans les dialogs de création, invitation et modification

### Validation
- [x] Tests TypeScript (0 erreurs) et 328 tests PASS

## v3.28 — Matrice Complète de Permissions (Système SIGFU + AFOR)

### Phase 1 : Ajouter les 4 rôles manquants
- [x] Ajouter rôle "agent_dgi" (Agent DGI - Impôts)
- [x] Ajouter rôle "autorite_prefectorale" (Autorité Préfectorale)
- [x] Ajouter rôle "agent_afor" (Agent AFOR - Rural)
- [x] Ajouter rôle "comite_villageois" (Comité Villageois)
- [x] Mettre à jour l'énumération des rôles dans users et user_invitations
- [x] Mettre à jour backend (user-admin-procedures.ts) avec les 4 rôles
- [x] Mettre à jour frontend (UsersAdmin.tsx) avec les 4 rôles et couleurs
- [x] Tests TypeScript (0 erreurs) et 328 tests PASS

### Phase 2 : Matrice de permissions granulaires
- [x] Créer table `role_permissions_matrix` (role, module, action, allowed)
- [x] Implémenter la matrice : Demande/Identité, Plans SIG, Actes Notariés, Liquidation/Taxes, Titres Souverains
- [x] Étendre RBAC_MODULES et SYSTEM_ROLES dans rbac.service.ts
- [x] Définir ROLE_DEFAULT_PERMISSIONS avec la matrice complète SIGFU + AFOR

### Phase 3 : Isolation des données
- [x] Créer table `notary_baskets` (id, notaryId, dossierId, dossierType, status)
- [x] Créer table `bank_mandates` (id, bankId, citizenId, accessCode, permissions, expiresAt)
- [x] Implémenter routeur isolation (listMyBasket, addToBasket, updateBasketStatus)
- [x] Implémenter mandats bancaires (createMandate, revokeMandate, verifyMandate, listReceivedMandates)
- [x] Chaque opération loggée dans audit_events avec motif

### Phase 4 : Traçabilité absolue
- [x] Créer logConsultationWithMotif() pour logger les consultations sensibles avec traceId
- [x] Créer logValidationWithMotif() pour logger les validations/signatures avec motif
- [x] Créer auditTraceRouter avec searchAuditTrail (filtres avancés) et auditStats
- [x] Monter auditTraceRouter dans appRouter

### Phase 5 : Validation
- [x] Tests TypeScript (0 erreurs)
- [x] 328 tests PASS
- [x] Checkpoint

## Sprint 1 ERP Construction — Architecture, Rôles, Permissions

### Schéma DB
- [x] Créer table `erp_roles` (id, name, displayName, description, isSystem, createdAt, updatedAt)
- [x] Créer table `erp_permissions` (id, module, action, displayName, description)
- [x] Créer table `erp_role_permissions` (id, roleId, permissionId)
- [x] Créer table `erp_user_roles` (id, userId, roleId, assignedAt, assignedBy)
- [x] Pousser les migrations DB

### Service RBAC ERP
- [x] Créer erp-rbac.service.ts avec constantes (ERP_MODULES, ERP_ACTIONS, ERP_SYSTEM_ROLES)
- [x] Implémenter getUserErpPermissions(userId)
- [x] Implémenter hasErpPermission(userId, module, action)
- [x] Implémenter seedErpRbac() pour les rôles/permissions par défaut
- [x] Créer middleware erpPermissionProcedure(module, action)

### Routeur tRPC ERP
- [x] Procédure erp.auth.me (infos utilisateur ERP + rôles + permissions)
- [x] Procédure erp.roles.list (GET /api/erp/roles)
- [x] Procédure erp.roles.create (POST /api/erp/roles)
- [x] Procédure erp.roles.update (PUT /api/erp/roles/{id})
- [x] Procédure erp.roles.delete (DELETE /api/erp/roles/{id})
- [x] Procédure erp.permissions.list (GET /api/erp/permissions)
- [x] Procédure erp.userRoles.assign (POST /api/erp/users/{id}/roles)
- [x] Procédure erp.userRoles.remove (DELETE /api/erp/users/{id}/roles/{roleId})

### Pages Frontend ERP
- [x] Page /erp (dashboard ERP avec accès modules)
- [x] Page /erp/admin/users (gestion utilisateurs ERP)
- [x] Page /erp/admin/roles (gestion rôles ERP)
- [x] Page /erp/admin/permissions (matrice permissions ERP)
- [x] Navigation sidebar ERP avec filtrage par permissions

### Tests
- [x] Test : 14 modules ERP définis
- [x] Test : 12 actions ERP définies
- [x] Test : 9 rôles système ERP avec champs requis
- [x] Test : Super Admin accède à tous les modules
- [x] Test : Viewer consulte uniquement (view/download)
- [x] Test : Project Manager crée des projets
- [x] Test : Contractor n'a pas accès finance delete
- [x] Test : aucun doublon dans les permissions par défaut
- [x] Test : 339 tests PASS (non-régression complète)

### Documentation
- [x] Documenter les rôles et permissions ERP
- [x] Résumé des fichiers créés/modifiés ci-dessous
