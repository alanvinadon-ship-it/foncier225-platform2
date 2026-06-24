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
- [x] Créer service email pour envoyer le lien d'invitation (future phase — reporté, notification owner utilisée)

### Backend — Routeur tRPC admin
- [x] Procédure `createUser` (name, email, role) → création directe avec mot de passe temporaire
- [x] Procédure `inviteUser` (email, role) → création d'une invitation + envoi email
- [x] Procédure `updateUserDetails` (userId, name, email, role, isActive) → modification
- [x] Procédure `deleteUserAdmin` (userId) → suppression avec vérification (pas d'admin seul)
- [x] Procédure `listUsersAdmin` (limit, offset, search) → liste paginée avec recherche
- [x] Procédure `acceptInvitation` (token) → acceptation d'une invitation (future phase — helper DB créé, endpoint OAuth à connecter)

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

## Sprint 2 ERP Construction — Dashboard Central

### Schéma DB
- [x] Créer table `erp_dashboard_widgets` (id, userId, widgetKey, position, isVisible, settingsJson, createdAt, updatedAt)
- [x] Pousser la migration DB

### Backend — Services Dashboard
- [x] Procédure erp.dashboard.summary (indicateurs globaux)
- [x] Procédure erp.dashboard.projects (projets actifs, en retard, tâches ouvertes, jalons critiques)
- [x] Procédure erp.dashboard.finance (factures impayées, paiements récents, budget consommé, cash flow, rentabilité, alertes dépassement)
- [x] Procédure erp.dashboard.safety (incidents sécurité récents)
- [x] Procédure erp.dashboard.inventory (stocks critiques, demandes matériel en attente)
- [x] Procédure erp.dashboard.compliance (documents expirés, permis à renouveler)
- [x] Procédure erp.dashboard.equipment (équipements disponibles, en maintenance)
- [x] Procédure erp.dashboard.alerts (alertes critiques consolidées)
- [x] Procédure erp.dashboard.updateWidgets (personnalisation widgets)
- [x] Procédure erp.dashboard.getWidgets (récupérer config widgets)

### Frontend — Page Dashboard
- [x] Créer page /erp/dashboard avec layout grille responsive
- [x] Cartes statistiques : projets actifs, en retard, tâches ouvertes, jalons critiques
- [x] Cartes statistiques : documents expirés, permis à renouveler
- [x] Cartes statistiques : incidents sécurité, équipements disponibles/maintenance
- [x] Cartes statistiques : stocks critiques, demandes matériel en attente
- [x] Cartes financières : factures impayées, paiements récents, budget consommé, cash flow, rentabilité, alertes dépassement
- [x] Graphiques : préparés (seront alimentés quand les modules seront implémentés)
- [x] Filtres : projet, période, statut, responsable
- [x] Masquage des données financières sans permission erp_finance.view
- [x] Fallback propre si modules non disponibles
- [x] Responsive mobile/tablette/desktop (grid cols-2/3/4/6)

### Tests
- [x] Test : 17 widget keys couvrant tous les domaines
- [x] Test : masquage données Finance sans permission
- [x] Test : filtrage par projet/période (6 périodes, 4 statuts)
- [x] Test : fallback modules non disponibles
- [x] Test : non-régression (349 tests PASS, 0 erreur TypeScript)

### Documentation
- [x] Documenter le dashboard ERP
- [x] Résumé des fichiers créés/modifiés ci-dessous

## Sprint 3 ERP Construction — Projects & Project Management

### Schéma DB
- [x] Créer table `erp_projects` (id, code, name, description, status, priority, etc.)
- [x] Créer table `erp_tasks` (id, project_id, title, description, status, priority, assignee, dates, progress, etc.)
- [x] Créer table `erp_task_dependencies` (id, task_id, depends_on_task_id, dependency_type, created_at)
- [x] Pousser les migrations DB

### Backend — Routeur Projects
- [x] Procédure erp.projects.list (GET filtres + pagination + recherche)
- [x] Procédure erp.projects.create (POST)
- [x] Procédure erp.projects.getById (GET /:id)
- [x] Procédure erp.projects.update (PUT /:id)
- [x] Procédure erp.projects.delete (DELETE /:id soft delete)
- [x] Procédure erp.projects.archive (POST /:id/archive)
- [x] Procédure erp.projects.assignManager (POST /:id/assign-manager)
- [x] Procédure erp.projects.summary (GET /:id/summary)

### Backend — Routeur Tasks
- [x] Procédure erp.tasks.listByProject (GET /projects/:projectId/tasks)
- [x] Procédure erp.tasks.create (POST)
- [x] Procédure erp.tasks.getById (GET /:id)
- [x] Procédure erp.tasks.update (PUT /:id)
- [x] Procédure erp.tasks.delete (DELETE /:id soft delete)
- [x] Procédure erp.tasks.assign (POST /:id/assign)
- [x] Procédure erp.tasks.complete (POST /:id/complete)
- [x] Procédure erp.tasks.addDependency (POST /:id/dependencies)
- [x] Détection automatique des tâches en retard (isLate flag)

### Frontend — Pages
- [x] Page /erp/projects (liste avec filtres, recherche, pagination)
- [x] Page /erp/projects/create (formulaire création)
- [x] Page /erp/projects/:id (détail projet + résumé + progression)
- [x] Page /erp/projects/:id/edit (formulaire modification)
- [x] Page /erp/projects/:id/tasks (liste tâches du projet + création)
- [x] Page /erp/tasks/:id (détail tâche + dépendances)

### Tests
- [x] Test : module erp_projects défini dans RBAC
- [x] Test : 7 statuts projet valides
- [x] Test : 7 statuts tâche valides
- [x] Test : 4 niveaux de priorité
- [x] Test : permissions project_manager (create)
- [x] Test : permissions contractor (view)
- [x] Test : permissions viewer (pas de create)
- [x] Test : permissions super_admin (toutes)
- [x] Test : 4 types de dépendances
- [x] Test : génération code PRJ-XXXXXX
- [x] Test : détection tâche en retard
- [x] Test : validation progression 0-100
- [x] Test : non-régression (369 tests PASS)

### Documentation
- [x] Documenter le module Projects
- [x] Résumé des fichiers créés/modifiés ci-dessous

## Sprint 4 ERP Construction — Gantt & Milestones

### Schéma DB
- [x] Créer table `erp_milestones` (id, projectId, name, description, plannedDate, actualDate, status, impactLevel, createdBy, createdAt, updatedAt, deletedAt)
- [x] Pousser la migration DB (SQL direct)

### Backend — Routeur Milestones
- [x] Procédure erp.milestones.listByProject (GET /projects/:projectId/milestones)
- [x] Procédure erp.milestones.create (POST /projects/:projectId/milestones)
- [x] Procédure erp.milestones.update (PUT /milestones/:id)
- [x] Procédure erp.milestones.delete (DELETE /milestones/:id)
- [x] Procédure erp.milestones.markReached (POST /milestones/:id/mark-reached)

### Backend — Routeur Gantt
- [x] Procédure erp.gantt.getData (GET /projects/:projectId/gantt — tâches + dépendances + milestones)
- [x] Procédure erp.gantt.updateTaskDates (PUT — modification dates si permission)
- [x] Calcul progression globale du projet

### Frontend — Pages
- [x] Page /erp/projects/:id/gantt (composant Gantt interactif avec timeline, barres tâches, dépendances, milestones)
- [x] Page /erp/projects/:id/milestones (liste jalons avec CRUD)
- [x] Filtres : statut, responsable, période
- [x] Identification visuelle des retards (rouge)
- [x] Modification des dates par formulaire (si permission update sur erp_gantt)

### Tests
- [x] Test : module erp_gantt défini dans RBAC
- [x] Test : 5 statuts milestone valides
- [x] Test : 4 niveaux d'impact
- [x] Test : super_admin a accès erp_gantt
- [x] Test : project_manager view + update erp_gantt
- [x] Test : viewer view uniquement (pas update)
- [x] Test : contractor view sur erp_gantt
- [x] Test : détection retard milestone (planned + date passée)
- [x] Test : markReached retourne delayed si en retard
- [x] Test : calcul progression globale (0%, 50%, 100%)
- [x] Test : timeline bornes min/max
- [x] Test : tâche en retard détectée
- [x] Test : tâche completed jamais en retard
- [x] Test : modification dates avec permission (super_admin)
- [x] Test : refus modification sans permission (viewer)
- [x] Test : non-régression (391 tests PASS)

### Documentation
- [x] Documenter le module Gantt & Milestones
- [x] Résumé des fichiers créés/modifiés ci-dessous

## Sprint 5 ERP Construction — Documents, Permits & Compliance

### Schéma DB
- [x] Créer table `erp_documents` (id, projectId, title, type, status, fileUrl, fileKey, fileName, mimeType, fileSize, issuedAt, expiresAt, uploadedBy, validatedBy, rejectedBy, rejectionReason, createdAt, updatedAt, deletedAt)
- [x] Créer table `erp_document_versions` (id, documentId, version, fileUrl, fileKey, fileName, mimeType, fileSize, uploadedBy, comment, createdAt)
- [x] Créer table `erp_permits` (id, projectId, type, reference, issuedBy, issuedAt, expiresAt, status, validatedBy, rejectedBy, rejectionReason, alertDaysBefore, createdBy, createdAt, updatedAt, deletedAt)
- [x] Créer table `erp_compliance_requirements` (id, projectId, title, description, category, priority, dueDate, status, createdBy, createdAt, updatedAt, deletedAt)
- [x] Créer table `erp_compliance_checks` (id, requirementId, checkedBy, status, comment, evidenceUrl, checkedAt, createdAt)
- [x] Pousser les migrations DB

### Backend — Routeur Documents
- [x] Procédure erp.documents.list (GET filtres + pagination)
- [x] Procédure erp.documents.create (POST + upload S3)
- [x] Procédure erp.documents.getById (GET /:id)
- [x] Procédure erp.documents.update (PUT /:id)
- [x] Procédure erp.documents.delete (DELETE /:id soft delete)
- [x] Procédure erp.documents.download (GET /:id/download — presigned URL)
- [x] Procédure erp.documents.addVersion (POST /:id/versions)
- [x] Procédure erp.documents.validate (POST /:id/validate)
- [x] Procédure erp.documents.reject (POST /:id/reject)

### Backend — Routeur Permits
- [x] Procédure erp.permits.list (GET filtres + pagination)
- [x] Procédure erp.permits.create (POST)
- [x] Procédure erp.permits.update (PUT /:id)
- [x] Procédure erp.permits.delete (DELETE /:id soft delete)
- [x] Procédure erp.permits.validate (POST /:id/validate)
- [x] Procédure erp.permits.reject (POST /:id/reject)
- [x] Procédure erp.permits.upcomingExpirations (GET alertes expiration)

### Backend — Routeur Compliance
- [x] Procédure erp.compliance.listRequirements (GET filtres + pagination)
- [x] Procédure erp.compliance.getRequirement (GET /:id avec checks)
- [x] Procédure erp.compliance.createRequirement (POST)
- [x] Procédure erp.compliance.updateRequirement (PUT /:id)
- [x] Procédure erp.compliance.deleteRequirement (DELETE /:id soft delete)
- [x] Procédure erp.compliance.addCheck (POST vérification + auto-update statut)
- [x] Procédure erp.compliance.expiredRequirements (GET exigences en retard)
- [x] Procédure erp.compliance.upcomingRequirements (GET prochaines échéances)
- [x] Procédure erp.compliance.stats (GET KPI conformité)

### Frontend — Pages
- [x] Page /erp/documents (liste documents + création + validate/reject + détail versions)
- [x] Page /erp/permits (liste permis + création + validate/reject + alertes expiration)
- [x] Page /erp/compliance (dashboard conformité + KPI + exigences + vérifications)
- [x] Sidebar ERP mise à jour (liens Documents, Permis, Conformité)
- [x] Routes App.tsx ajoutées (/erp/documents, /erp/permits, /erp/compliance)

### Tests
- [x] Test : types de documents (8 types)
- [x] Test : refus fichier dangereux (extension interdite)
- [x] Test : types de permis (8 types)
- [x] Test : statuts de permis (5 statuts workflow)
- [x] Test : catégories conformité (9 catégories)
- [x] Test : priorités (4 niveaux)
- [x] Test : statuts conformité (5 statuts)
- [x] Test : statuts vérification (5 statuts)
- [x] Test : logique expiration
- [x] Test : logique auto-update conformité
- [x] Test : calcul taux conformité
- [x] Test : versionnement document
- [x] Test : formatage taille fichier
- [x] Test : permissions Documents par rôle
- [x] Test : permissions Compliance par rôle
- [x] Test : non-régression (455 tests PASS, 0 erreurs TypeScript)

### Documentation
- [x] Documenter les modules Documents, Permits & Compliance (docs/SPRINT5_ERP_DOCUMENTS.md)
- [x] Résumé des fichiers créés/modifiés

## Sprint 6 ERP Construction — Equipment Management

### Schéma DB
- [x] Créer table `erp_equipment` (id, code, name, description, category, brand, model, serialNumber, status, purchaseDate, purchasePrice, currentValue, location, imageUrl, projectId, createdBy, createdAt, updatedAt, deletedAt)
- [x] Créer table `erp_equipment_allocations` (id, equipmentId, projectId, allocatedBy, allocatedAt, releasedAt, releasedBy, notes)
- [x] Créer table `erp_equipment_maintenance` (id, equipmentId, type, description, scheduledAt, completedAt, cost, performedBy, status, notes, createdBy, createdAt)
- [x] Pousser les migrations DB

### Backend — Routeur Equipment
- [x] Procédure erp.equipment.list (GET filtres + pagination)
- [x] Procédure erp.equipment.getById (GET /:id avec allocations + maintenance)
- [x] Procédure erp.equipment.create (POST)
- [x] Procédure erp.equipment.update (PUT /:id)
- [x] Procédure erp.equipment.delete (DELETE /:id soft delete)
- [x] Procédure erp.equipment.assign (POST /:id/assign — affecter à un projet)
- [x] Procédure erp.equipment.release (POST /:id/release — libérer)
- [x] Procédure erp.equipment.listMaintenance (GET /:id/maintenance)
- [x] Procédure erp.equipment.addMaintenance (POST /:id/maintenance)
- [x] Procédure erp.equipment.updateMaintenance (PUT /maintenance/:maintenanceId)
- [x] Procédure erp.equipment.upcomingMaintenance (GET alertes maintenance prochaine)
- [x] Procédure erp.equipment.stats (GET KPI équipements)

### Frontend — Pages
- [x] Page /erp/equipment (liste équipements + filtres + stats)
- [x] Dialog création équipement
- [x] Page /erp/equipment/:id (fiche détail + allocations + maintenance — via dialog)
- [x] Dialog affectation/libération
- [x] Dialog ajout maintenance
- [x] Vue calendrier maintenance (/erp/equipment/maintenance-calendar)
- [x] Sidebar ERP déjà configurée (lien Équipements existe)

### Tests
- [x] Test : statuts équipement (6 statuts)
- [x] Test : catégories (11 catégories)
- [x] Test : types maintenance (6 types)
- [x] Test : statuts maintenance (5 statuts)
- [x] Test : affectation à un projet (blocage si indisponible)
- [x] Test : libération (release)
- [x] Test : blocage suppression si affecté
- [x] Test : alerte maintenance proche + détection retard
- [x] Test : transitions de statut
- [x] Test : permissions CRUD par rôle
- [x] Test : validation code équipement
- [x] Test : formatage devise XOF
- [x] Test : non-régression (490 tests PASS, 0 erreurs TypeScript)

### Documentation
- [x] Documenter le module Equipment Management (docs/SPRINT6_ERP_EQUIPMENT.md)
- [x] Résumé des fichiers créés/modifiés

## Sprint 7 ERP Construction — Safety Management

### Schéma DB
- [x] Créer table `erp_safety_incidents` (id, projectId, title, description, severity, status, location, incidentDate, reportedBy, assignedTo, resolvedAt, resolvedBy, closedAt, closedBy, closureNotes, createdAt, updatedAt, deletedAt)
- [x] Créer table `erp_safety_audits` (id, projectId, title, description, auditType, scheduledAt, completedAt, auditorName, findings, score, status, createdBy, createdAt, updatedAt, deletedAt)
- [x] Créer table `erp_safety_corrective_actions` (id, incidentId, title, description, assignedTo, priority, dueDate, completedAt, status, createdBy, createdAt)
- [x] Pousser les migrations DB

### Backend — Routeur Safety
- [x] Procédure erp.safety.listIncidents (GET filtres + pagination)
- [x] Procédure erp.safety.getIncident (GET /:id avec actions correctives)
- [x] Procédure erp.safety.createIncident (POST + alerte si critique)
- [x] Procédure erp.safety.updateIncident (PUT /:id)
- [x] Procédure erp.safety.deleteIncident (DELETE /:id soft delete)
- [x] Procédure erp.safety.addCorrectiveAction (POST /:id/corrective-actions)
- [x] Procédure erp.safety.updateCorrectiveAction (PUT /:id mise à jour action)
- [x] Procédure erp.safety.resolveIncident (POST /:id/resolve)
- [x] Procédure erp.safety.closeIncident (POST /:id/close — uniquement si résolu)
- [x] Procédure erp.safety.listAudits (GET filtres + pagination)
- [x] Procédure erp.safety.createAudit (POST)
- [x] Procédure erp.safety.updateAudit (PUT /:id)
- [x] Procédure erp.safety.stats (GET KPI sécurité)

### Frontend — Pages
- [x] Page /erp/safety (dashboard sécurité + KPI + incidents récents)
- [x] Tab Incidents (liste incidents + filtres)
- [x] Dialog création incident
- [x] Dialog détail incident + actions correctives + resolve/close
- [x] Tab Audits (liste audits + création)
- [x] Sidebar ERP déjà configurée (lien Sécurité existe)
- [x] Routes App.tsx ajoutées

### Tests
- [x] Test : gravités incident (4 niveaux)
- [x] Test : statuts incident (5 statuts)
- [x] Test : workflow incident (open → under_review → corrective_action → resolved → closed)
- [x] Test : blocage clôture si non résolu
- [x] Test : incident critique génère alerte
- [x] Test : types d'audit (7 types)
- [x] Test : statuts actions correctives (4 statuts)
- [x] Test : détection retard actions correctives
- [x] Test : permissions Safety Officer
- [x] Test : calculs KPI
- [x] Test : formatage dates
- [x] Test : non-régression (520 tests PASS, 0 erreurs TypeScript)

### Documentation
- [x] Documenter le module Safety Management (docs/SPRINT7_ERP_SAFETY.md)
- [x] Résumé des fichiers créés/modifiés

## Sprint 8 ERP Construction — Vendors, Contractors, Certifications

### Schéma DB
- [x] Créer table `erp_vendors` (id, name, description, category, status, email, phone, address, website, taxId, createdBy, createdAt, updatedAt, deletedAt)
- [x] Créer table `erp_vendor_contacts` (id, vendorId, name, role, email, phone, isPrimary, createdAt)
- [x] Créer table `erp_contractors` (id, name, description, specialty, status, email, phone, address, licenseNumber, insuranceExpiry, createdBy, createdAt, updatedAt, deletedAt)
- [x] Créer table `erp_project_contractors` (id, projectId, contractorId, role, startDate, endDate, assignedBy, assignedAt, releasedAt)
- [x] Créer table `erp_contracts` (id, contractorId, projectId, title, reference, amount, startDate, endDate, status, createdBy, createdAt, updatedAt)
- [x] Créer table `erp_certifications` (id, entityType, entityId, title, issuedBy, issuedAt, expiresAt, renewedAt, status, alertDaysBefore, createdBy, createdAt, updatedAt, deletedAt)
- [x] Pousser les migrations DB

### Backend — Routeur Vendors
- [x] Procédure erp.vendors.list (GET filtres + pagination)
- [x] Procédure erp.vendors.getById (GET /:id avec contacts)
- [x] Procédure erp.vendors.create (POST)
- [x] Procédure erp.vendors.update (PUT /:id)
- [x] Procédure erp.vendors.delete (DELETE /:id soft delete)
- [x] Procédure erp.vendors.addContact (POST /:id/contacts)
- [x] Procédure erp.vendors.updateContact (PUT contact)
- [x] Procédure erp.vendors.deleteContact (DELETE contact)
- [x] Procédure erp.vendors.updateStatus (PUT /:id/status)
- [x] Procédure erp.vendors.rate (POST /:id/rate)

### Backend — Routeur Contractors
- [x] Procédure erp.contractors.list (GET filtres + pagination)
- [x] Procédure erp.contractors.getById (GET /:id avec projets + contrats)
- [x] Procédure erp.contractors.create (POST)
- [x] Procédure erp.contractors.update (PUT /:id)
- [x] Procédure erp.contractors.delete (DELETE /:id soft delete)
- [x] Procédure erp.contractors.assignToProject (POST affectation projet)
- [x] Procédure erp.contractors.releaseFromProject (DELETE libération projet)
- [x] Procédure erp.contractors.updateStatus (PUT /:id/status)
- [x] Procédure erp.contractors.listContracts (GET contrats)
- [x] Procédure erp.contractors.createContract (POST contrat)
- [x] Procédure erp.contractors.updateContract (PUT contrat)

### Backend — Routeur Certifications
- [x] Procédure erp.certifications.list (GET filtres + pagination)
- [x] Procédure erp.certifications.getById (GET /:id)
- [x] Procédure erp.certifications.create (POST)
- [x] Procédure erp.certifications.update (PUT /:id)
- [x] Procédure erp.certifications.delete (DELETE /:id soft delete)
- [x] Procédure erp.certifications.expired (GET certifications expirées)
- [x] Procédure erp.certifications.upcomingExpirations (GET prochaines expirations)
- [x] Procédure erp.certifications.renew (POST /:id/renew)

### Frontend — Pages
- [x] Page /erp/vendors (liste fournisseurs + filtres + CRUD + contacts)
- [x] Page /erp/contractors (liste sous-traitants + filtres + CRUD + affectation + contrats)
- [x] Page /erp/certifications (liste certifications + filtres + CRUD + expirées + renouvellement)
- [x] Routes App.tsx ajoutées
- [x] Sidebar ERP mise à jour (lien Certifications ajouté)

### Tests
- [x] Test : catégories fournisseurs (7)
- [x] Test : statuts fournisseurs (5)
- [x] Test : création fournisseur
- [x] Test : ajout contact fournisseur
- [x] Test : suspension fournisseur
- [x] Test : blocage fournisseur blacklisté
- [x] Test : spécialités sous-traitants (10)
- [x] Test : création sous-traitant
- [x] Test : affectation sous-traitant à projet
- [x] Test : blocage suppression si affectation active
- [x] Test : statuts contrats (5)
- [x] Test : création contrat
- [x] Test : formatage montant XOF
- [x] Test : types entités certifications (4)
- [x] Test : détection certification expirée
- [x] Test : renouvellement certification
- [x] Test : alerte avant expiration
- [x] Test : permissions CRUD
- [x] Test : non-régression (572 tests PASS, 0 erreurs TypeScript)

### Documentation
- [x] Documenter les modules Vendors, Contractors & Certifications (docs/SPRINT8_ERP_VENDORS.md)
- [x] Résumé des fichiers créés/modifiés

## Sprint 9 ERP Construction — Performance Rating

### Schéma DB
- [x] Créer table `erp_performance_ratings` (id, rateableType, rateableId, projectId, qualityScore, delayScore, costScore, safetyScore, complianceScore, communicationScore, overallScore, comment, ratedBy, createdAt, updatedAt)
- [x] Pousser les migrations DB

### Backend — Routeur Performance Ratings
- [x] Procédure erp.ratings.list (GET filtres + pagination)
- [x] Procédure erp.ratings.create (POST notation avec calcul overallScore)
- [x] Procédure erp.ratings.update (PUT /:id)
- [x] Procédure erp.ratings.delete (DELETE /:id)
- [x] Procédure erp.ratings.forEntity (GET ratings d'un vendor/contractor)
- [x] Procédure erp.ratings.top (GET meilleurs partenaires)
- [x] Procédure erp.ratings.low (GET moins bons partenaires)
- [x] Procédure erp.ratings.stats (GET KPI globaux)

### Frontend — Pages
- [x] Page /erp/performance-ratings (dashboard + classement + formulaire notation)
- [x] Routes App.tsx ajoutées
- [x] Sidebar ERP mise à jour (lien Performance avec icône Star)

### Tests
- [x] Test : types rateable (2 types)
- [x] Test : 6 critères de notation
- [x] Test : blocage note hors intervalle (1-5)
- [x] Test : rejet scores non-entiers
- [x] Test : calcul overallScore (average * 100)
- [x] Test : calcul moyenne rating entité
- [x] Test : classement top (DESC)
- [x] Test : classement low (ASC)
- [x] Test : filtrage par type
- [x] Test : permissions view/rate/delete
- [x] Test : mise à jour rating après suppression
- [x] Test : formatage affichage
- [x] Test : non-régression (604 tests PASS, 0 erreurs TypeScript)

### Documentation
- [x] Documenter le module Performance Rating (docs/SPRINT9_ERP_RATINGS.md)
- [x] Résumé des fichiers créés/modifiés

## Sprint 10 ERP Construction — Invoices & Payments

### Schéma DB
- [x] Créer table `erp_invoices` (id, projectId, vendorId, contractorId, invoiceNumber, reference, type, status, issueDate, dueDate, subtotal, taxRate, taxAmount, totalAmount, paidAmount, currency, notes, attachmentUrl, attachmentKey, submittedAt, submittedBy, approvedAt, approvedBy, rejectedAt, rejectedBy, rejectionReason, createdBy, createdAt, updatedAt, deletedAt)
- [x] Créer table `erp_invoice_lines` (id, invoiceId, description, quantity, unitPrice, amount, taxRate, taxAmount, totalAmount, sortOrder, createdAt)
- [x] Créer table `erp_payments` (id, invoiceId, amount, paymentDate, paymentMethod, reference, notes, createdBy, createdAt)
- [x] Pousser les migrations DB

### Backend — Routeur Invoices
- [x] Procédure erp.invoices.list (GET filtres + pagination)
- [x] Procédure erp.invoices.getById (GET /:id avec lignes + paiements)
- [x] Procédure erp.invoices.create (POST brouillon)
- [x] Procédure erp.invoices.update (PUT /:id)
- [x] Procédure erp.invoices.delete (DELETE /:id soft delete)
- [x] Procédure erp.invoices.addLine (POST /:id/lines)
- [x] Procédure erp.invoices.updateLine (PUT ligne)
- [x] Procédure erp.invoices.deleteLine (DELETE ligne)
- [x] Procédure erp.invoices.submit (POST /:id/submit)
- [x] Procédure erp.invoices.approve (POST /:id/approve)
- [x] Procédure erp.invoices.reject (POST /:id/reject)
- [x] Procédure erp.invoices.overdue (GET factures échues)
- [x] Procédure erp.invoices.unpaid (GET factures impayées)
- [x] Procédure erp.invoices.stats (GET KPI factures)

### Backend — Routeur Payments
- [x] Procédure erp.payments.list (GET filtres + pagination)
- [x] Procédure erp.payments.create (POST paiement + calcul solde + auto-status)
- [x] Procédure erp.payments.delete (DELETE annuler paiement + recalcul)
- [x] Procédure erp.payments.stats (GET KPI paiements)

### Frontend — Pages
- [x] Page /erp/invoices (liste factures + filtres + KPI + onglets Toutes/En retard/Impayées)
- [x] Dialog création facture + lignes
- [x] Dialog détail facture + paiements + submit/approve/reject
- [x] Page /erp/payments (historique paiements + stats + filtres par méthode)
- [x] Routes App.tsx ajoutées
- [x] Sidebar ERP mise à jour (liens Factures + Paiements)

### Tests
- [x] Test : types facture (3 types)
- [x] Test : statuts facture (8 statuts)
- [x] Test : workflow transitions
- [x] Test : calculs lignes (HT, TVA 18%, TTC)
- [x] Test : recalcul totaux facture
- [x] Test : méthodes paiement (5)
- [x] Test : auto-update statut (paid/partially_paid)
- [x] Test : validation paiement (statuts payables)
- [x] Test : blocage paiement excédant solde
- [x] Test : détection overdue
- [x] Test : format numéro facture
- [x] Test : formatage XOF
- [x] Test : permissions Finance
- [x] Test : contraintes suppression
- [x] Test : contraintes soumission
- [x] Test : non-régression (669 tests PASS, 0 erreurs TypeScript)

### Documentation
- [x] Documenter les modules Invoices & Payments (docs/SPRINT10_ERP_INVOICES.md)
- [x] Résumé des fichiers créés/modifiés

## Sprint 11 ERP Construction — Inventory, Stock Levels & Material Requests

### Schéma DB
- [x] Créer table `erp_inventory_items` (id, sku, name, description, category, unit, minStock, maxStock, currentStock, unitPrice, location, projectId, imageUrl, createdBy, createdAt, updatedAt, deletedAt)
- [x] Créer table `erp_stock_locations` (id, name, description, address, projectId, createdBy, createdAt, updatedAt, deletedAt)
- [x] Créer table `erp_stock_movements` (id, itemId, locationId, projectId, type, quantity, previousStock, newStock, reference, notes, performedBy, createdAt)
- [x] Créer table `erp_material_requests` (id, projectId, requestNumber, title, description, status, priority, requestedBy, approvedBy, approvedAt, rejectedBy, rejectedAt, rejectionReason, createdAt, updatedAt, deletedAt)
- [x] Créer table `erp_material_request_lines` (id, requestId, itemId, quantityRequested, quantityFulfilled, notes, createdAt)
- [x] Pousser les migrations DB

### Backend — Routeur Inventory
- [x] Procédure erp.inventory.listItems (GET filtres + pagination)
- [x] Procédure erp.inventory.getItem (GET /:id avec mouvements récents)
- [x] Procédure erp.inventory.createItem (POST)
- [x] Procédure erp.inventory.updateItem (PUT /:id)
- [x] Procédure erp.inventory.deleteItem (DELETE /:id soft delete)
- [x] Procédure erp.inventory.listLocations (GET emplacements)
- [x] Procédure erp.inventory.createLocation (POST)
- [x] Procédure erp.inventory.updateLocation (PUT)
- [x] Procédure erp.inventory.deleteLocation (DELETE)
- [x] Procédure erp.inventory.addMovement (POST mouvement stock + recalcul)
- [x] Procédure erp.inventory.listMovements (GET /:id/movements)
- [x] Procédure erp.inventory.stockLevels (GET niveaux de stock)
- [x] Procédure erp.inventory.criticalStock (GET articles en stock critique)
- [x] Procédure erp.inventory.stats (GET KPI inventaire)

### Backend — Routeur Material Requests
- [x] Procédure erp.materialRequests.list (GET filtres + pagination)
- [x] Procédure erp.materialRequests.getById (GET /:id avec lignes)
- [x] Procédure erp.materialRequests.create (POST brouillon + lignes)
- [x] Procédure erp.materialRequests.update (PUT /:id)
- [x] Procédure erp.materialRequests.delete (DELETE /:id soft delete)
- [x] Procédure erp.materialRequests.submit (POST /:id/submit)
- [x] Procédure erp.materialRequests.approve (POST /:id/approve)
- [x] Procédure erp.materialRequests.reject (POST /:id/reject)
- [x] Procédure erp.materialRequests.fulfill (POST /:id/fulfill — livraison + décrémentation stock)
- [x] Procédure erp.materialRequests.stats (GET KPI demandes)

### Frontend — Pages
- [x] Page /erp/inventory (dashboard inventaire + KPI + articles + stock critique + mouvements + emplacements)
- [x] Dialog création/édition article
- [x] Dialog mouvement stock (entrée/sortie/transfert/ajustement)
- [x] Page /erp/material-requests (liste demandes + filtres + CRUD + workflow)
- [x] Dialog création demande + lignes
- [x] Dialog détail demande + approve/reject + fulfill
- [x] Routes App.tsx ajoutées
- [x] Sidebar ERP mise à jour (lien Demandes Matériel ajouté)

### Tests
- [x] Test : catégories articles (12)
- [x] Test : unités de mesure (10)
- [x] Test : types mouvements (6 types)
- [x] Test : calcul stock après IN/OUT/RETURN/LOSS/TRANSFER
- [x] Test : détection stock critique
- [x] Test : détection rupture de stock
- [x] Test : refus sortie > stock disponible
- [x] Test : calcul valeur totale stock
- [x] Test : statuts demande matériel (7 statuts)
- [x] Test : priorités (4 niveaux)
- [x] Test : workflow submit/approve/reject/fulfill
- [x] Test : livraison partielle vs complète
- [x] Test : blocage livraison excédant quantité demandée
- [x] Test : format numéro demande MR-XXXXX
- [x] Test : format SKU
- [x] Test : permissions Inventory
- [x] Test : non-régression (716 tests PASS, 0 erreurs TypeScript)

### Documentation
- [x] Documenter les modules Inventory, Stock Levels & Material Requests (docs/SPRINT11_ERP_INVENTORY.md)
- [x] Résumé des fichiers créés/modifiés

## Sprint 12 ERP Construction — Supplier Integration & Wastage Analysis

### Schéma DB
- [x] Créer table `erp_supplier_item_prices` (id, vendorId, itemId, unitPrice, currency, leadTimeDays, minOrderQty, isPreferred, validFrom, validTo, notes, createdBy, createdAt, updatedAt)
- [x] Créer table `erp_supplier_integrations` (id, vendorId, integrationType, apiUrl, apiKey, lastSyncAt, syncStatus, syncFrequency, isActive, createdBy, createdAt, updatedAt)
- [x] Créer table `erp_wastage_records` (id, projectId, itemId, quantity, unitCost, totalCost, wastagePercentage, cause, description, correctiveAction, recordedBy, recordedAt, createdAt, updatedAt, deletedAt)
- [x] Pousser les migrations DB

### Backend — Routeur Supplier Integration
- [x] Procédure erp.supplierIntegration.listPrices (GET filtres + pagination)
- [x] Procédure erp.supplierIntegration.createPrice (POST)
- [x] Procédure erp.supplierIntegration.updatePrice (PUT /:id)
- [x] Procédure erp.supplierIntegration.deletePrice (DELETE /:id)
- [x] Procédure erp.supplierIntegration.itemSuppliers (GET fournisseurs d'un article)
- [x] Procédure erp.supplierIntegration.vendorItems (GET articles d'un fournisseur)
- [x] Procédure erp.supplierIntegration.compareSuppliers (GET comparaison prix)
- [x] Procédure erp.supplierIntegration.setPreferred (POST définir fournisseur préféré)
- [x] Procédure erp.supplierIntegration.listIntegrations (GET intégrations)
- [x] Procédure erp.supplierIntegration.createIntegration (POST)
- [x] Procédure erp.supplierIntegration.sync (POST simulation sync)

### Backend — Routeur Wastage
- [x] Procédure erp.wastage.list (GET filtres + pagination)
- [x] Procédure erp.wastage.getById (GET /:id)
- [x] Procédure erp.wastage.create (POST)
- [x] Procédure erp.wastage.update (PUT /:id)
- [x] Procédure erp.wastage.delete (DELETE /:id soft delete)
- [x] Procédure erp.wastage.analysis (GET analyses par projet/matériau/cause)
- [x] Procédure erp.wastage.byProject (GET pertes d'un projet)
- [x] Procédure erp.wastage.stats (GET KPI pertes)

### Frontend — Pages
- [x] Page /erp/supplier-integration (prix fournisseurs + comparaison + intégrations)
- [x] Page /erp/wastage (liste pertes + analyses + KPI)
- [x] Routes App.tsx ajoutées
- [x] Sidebar ERP mise à jour

### Tests
- [x] Test : association fournisseur-article
- [x] Test : définition fournisseur préféré
- [x] Test : comparaison prix
- [x] Test : délai de livraison
- [x] Test : simulation synchronisation
- [x] Test : causes de perte (7)
- [x] Test : enregistrement perte
- [x] Test : calcul pourcentage perte
- [x] Test : calcul coût estimé
- [x] Test : analyse par projet
- [x] Test : analyse par cause
- [x] Test : permissions
- [x] Test : non-régression

### Documentation
- [x] Documenter les modules Supplier Integration & Wastage Analysis
- [x] Résumé des fichiers créés/modifiés

## Sprint 13 ERP Construction — Finance, Budget, Cash Flow, Profitability

### Schéma DB
- [x] Créer table `erp_budgets` (id, projectId, name, status, totalInitial, totalRevised, totalEngaged, totalPaid, approvedBy, approvedAt, createdBy, createdAt, updatedAt)
- [x] Créer table `erp_budget_lines` (id, budgetId, category, description, initialAmount, revisedAmount, engagedAmount, paidAmount, createdAt, updatedAt)
- [x] Créer table `erp_cash_flows` (id, projectId, type, category, amount, description, flowDate, dueDate, isPaid, paidAt, createdBy, createdAt, updatedAt)
- [x] Créer table `erp_profitability_snapshots` (id, projectId, revenue, directCosts, indirectCosts, grossMargin, netMargin, grossMarginPercent, netMarginPercent, snapshotDate, createdAt)
- [x] Pousser les migrations DB

### Backend — Routeur Finance/Budget
- [x] Procédure erp.finance.budgets.list (GET filtres + pagination)
- [x] Procédure erp.finance.budgets.create (POST)
- [x] Procédure erp.finance.budgets.getById (GET /:id)
- [x] Procédure erp.finance.budgets.update (PUT /:id)
- [x] Procédure erp.finance.budgets.approve (POST /:id/approve)
- [x] Procédure erp.finance.budgets.byProject (GET /projects/:id/budget)
- [x] Procédure erp.finance.budgets.variance (GET /projects/:id/budget-variance)

### Backend — Routeur Finance/Cash Flow
- [x] Procédure erp.finance.cashFlow.list (GET filtres + pagination)
- [x] Procédure erp.finance.cashFlow.create (POST)
- [x] Procédure erp.finance.cashFlow.summary (GET résumé par période)
- [x] Procédure erp.finance.cashFlow.byProject (GET /projects/:id/cash-flow)
- [x] Procédure erp.finance.cashFlow.forecast (GET prévisions)

### Backend — Routeur Finance/Profitability
- [x] Procédure erp.finance.profitability.list (GET tous les projets)
- [x] Procédure erp.finance.profitability.byProject (GET /projects/:id/profitability)
- [x] Procédure erp.finance.profitability.recalculate (POST recalcul)
- [x] Procédure erp.finance.profitability.ranking (GET classement)

### Frontend — Pages
- [x] Page /erp/finance (dashboard finance global)
- [x] Page /erp/finance/budgets (liste budgets + création)
- [x] Page /erp/finance/cash-flow (flux de trésorerie)
- [x] Page /erp/finance/profitability (rentabilité + classement)
- [x] Routes App.tsx ajoutées
- [x] Sidebar ERP mise à jour (section Finance)

### Tests
- [x] Test : création budget
- [x] Test : ajout lignes budgétaires
- [x] Test : calcul reste disponible
- [x] Test : comparaison prévu/réalisé
- [x] Test : approbation budget
- [x] Test : blocage modification budget approuvé
- [x] Test : ajout entrée de trésorerie
- [x] Test : ajout sortie de trésorerie
- [x] Test : résumé cash flow par période
- [x] Test : calcul marge brute
- [x] Test : calcul marge nette
- [x] Test : classement rentabilité

### Documentation
- [x] Documenter les modules Finance, Budget, Cash Flow, Profitability
- [x] Résumé des fichiers créés/modifiés

## Intégration automatique Factures/Paiements → Lignes budgétaires

### Backend
- [x] Analyser les routeurs Invoices et Payments existants
- [x] Créer procédure erp.finance.budgets.syncFromInvoices (recalcul engagé depuis factures)
- [x] Créer procédure erp.finance.budgets.syncFromPayments (recalcul payé depuis paiements)
- [x] Ajouter hook automatique dans erp.invoices.create → mise à jour engagedAmount
- [x] Ajouter hook automatique dans erp.invoices.update (status=approved) → mise à jour engagedAmount
- [x] Ajouter hook automatique dans erp.payments.create → mise à jour paidAmount
- [x] Ajouter hook automatique dans erp.payments.update (status=completed) → mise à jour paidAmount
- [x] Recalcul automatique des totaux budget après chaque sync

### Tests
- [x] Test : création facture met à jour engagedAmount
- [x] Test : paiement complété met à jour paidAmount
- [x] Test : recalcul totaux budget correct
- [x] Test : non-régression modules existants

### Documentation
- [x] Documenter l'intégration automatique budget

## Sprint 14 ERP Construction — Overrun Alerts & Notifications

### Schéma DB
- [x] Créer table `erp_overrun_alerts` (id, projectId, alertType, priority, title, message, threshold, currentValue, isAcknowledged, acknowledgedBy, acknowledgedAt, relatedEntityType, relatedEntityId, createdAt)
- [x] Créer table `erp_notifications` (id, userId, title, message, module, priority, isRead, readAt, linkUrl, createdAt)
- [x] Pousser les migrations DB

### Backend — Moteur d'alertes
- [x] Détection projet en retard
- [x] Détection tâche en retard
- [x] Détection jalon dépassé
- [x] Détection budget consommé à 75%
- [x] Détection budget consommé à 90%
- [x] Détection budget consommé à 100%
- [x] Détection dépassement confirmé (>100%)
- [x] Détection facture échue
- [x] Détection document expiré
- [x] Détection certification expirée
- [x] Détection stock critique
- [x] Détection maintenance proche
- [x] Détection incident sécurité critique

### Backend — Routeur Overrun Alerts
- [x] Procédure erp.overrunAlerts.list (GET filtres + pagination)
- [x] Procédure erp.overrunAlerts.check (POST déclencher vérification)
- [x] Procédure erp.overrunAlerts.acknowledge (POST /:id/acknowledge)
- [x] Procédure erp.overrunAlerts.byProject (GET /projects/:id/alerts)

### Backend — Routeur Notifications
- [x] Procédure erp.notifications.list (GET filtres + pagination)
- [x] Procédure erp.notifications.unread (GET non lues)
- [x] Procédure erp.notifications.markRead (POST /:id/read)
- [x] Procédure erp.notifications.markAllRead (POST /read-all)

### Frontend — Pages et composants
- [x] Page /erp/finance/overrun-alerts (liste alertes + filtres priorité/module)
- [x] Page /erp/notifications (liste notifications + filtres)
- [x] Composant NotificationBell (icône + badge unread dans header ERP)
- [x] Panneau notifications dropdown
- [x] Routes App.tsx ajoutées
- [x] Sidebar ERP mise à jour

### Tests
- [x] Test : alerte à 75% du budget
- [x] Test : alerte à 90%
- [x] Test : alerte à 100%
- [x] Test : alerte dépassement confirmé
- [x] Test : notification document expiré
- [x] Test : notification stock critique
- [x] Test : notification incident critique
- [x] Test : marquer comme lu
- [x] Test : marquer tout comme lu
- [x] Test : compteur unread
- [x] Test : filtrage par module

### Documentation
- [x] Documenter les modules Overrun Alerts & Notifications
- [x] Résumé des fichiers créés/modifiés

## Sprint 15 ERP Construction — Profile Details & Audit Logs

### Schéma DB
- [x] Créer table `erp_user_profiles` (phone, company, position, avatar, preferences, securitySettings)
- [x] Vérifier/réutiliser table `audit_events` existante pour les logs ERP
- [x] Pousser les migrations DB

### Backend — Routeur Profile
- [x] Procédure erp.profile.get (GET profil complet)
- [x] Procédure erp.profile.update (PUT nom, téléphone, entreprise, poste)
- [x] Procédure erp.profile.updatePassword (PUT mot de passe)
- [x] Procédure erp.profile.uploadAvatar (POST avatar)
- [x] Procédure erp.profile.getPreferences (GET préférences)
- [x] Procédure erp.profile.updatePreferences (PUT préférences)

### Backend — Routeur Audit Logs
- [x] Procédure erp.auditLogs.list (GET filtres + pagination)
- [x] Procédure erp.auditLogs.getById (GET /:id)
- [x] Procédure erp.auditLogs.byProject (GET /projects/:id/audit-logs)

### Frontend — Pages
- [x] Page /erp/profile (consulter/modifier profil)
- [x] Page /erp/profile/security (mot de passe, paramètres sécurité)
- [x] Page /erp/profile/preferences (préférences utilisateur)
- [x] Page /erp/audit-logs (consultation logs)
- [x] Routes App.tsx ajoutées
- [x] Sidebar ERP mise à jour

### Tests
- [x] Test : modification profil
- [x] Test : modification mot de passe
- [x] Test : upload avatar
- [x] Test : sauvegarde préférences
- [x] Test : création log après modification projet
- [x] Test : création log après suppression facture
- [x] Test : création log après validation document
- [x] Test : accès audit réservé aux admins
- [x] Test : non-régression

### Documentation
- [x] Documenter les modules Profile Details & Audit Logs
- [x] Résumé des fichiers créés/modifiés

## Sprint 16 ERP Construction — Documentation complète

### Documentation
- [x] /docs/erp/README.md (index documentation ERP)
- [x] /docs/erp/architecture.md (architecture technique)
- [x] /docs/erp/database-schema.md (schéma base de données)
- [x] /docs/erp/migrations.md (guide migrations)
- [x] /docs/erp/api.md (référence API complète)
- [x] /docs/erp/roles-permissions.md (rôles et permissions)
- [x] /docs/erp/user-guide.md (guide utilisateur)
- [x] /docs/erp/admin-guide.md (guide administrateur)
- [x] /docs/erp/testing.md (guide tests)
- [x] /docs/erp/deployment.md (guide déploiement)
- [x] Mise à jour README.md principal

## Sprint 17 ERP Construction — Tests fonctionnels, sécurité et non-régression

### Tests fonctionnels (29 modules)
- [x] Tests Login / Signup
- [x] Tests rôles et permissions
- [x] Tests Dashboard
- [x] Tests Projects
- [x] Tests Project Management (Tasks)
- [x] Tests Gantt
- [x] Tests Milestones
- [x] Tests Documents
- [x] Tests Permits
- [x] Tests Compliance
- [x] Tests Equipment
- [x] Tests Safety
- [x] Tests Vendors
- [x] Tests Contractors
- [x] Tests Certifications
- [x] Tests Performance Rating
- [x] Tests Invoices
- [x] Tests Payments
- [x] Tests Inventory
- [x] Tests Stock Levels
- [x] Tests Material Requests
- [x] Tests Supplier Integration
- [x] Tests Wastage Analysis
- [x] Tests Finance
- [x] Tests Budget
- [x] Tests Cash Flow
- [x] Tests Profitability
- [x] Tests Overrun Alerts
- [x] Tests Notifications
- [x] Tests Profile Details
- [x] Tests Audit Logs

### Tests sécurité
- [x] Test accès sans authentification
- [x] Test accès sans permission
- [x] Test upload fichier dangereux
- [x] Test accès Finance par profil non autorisé
- [x] Test injection SQL
- [x] Test XSS
- [x] Test CSRF
- [x] Test fuite de données sensibles
- [x] Test changement de rôle non autorisé

### Tests non-régression Foncier225
- [x] Test login existant
- [x] Test modules fonciers existants
- [x] Test documents existants
- [x] Test paiements existants
- [x] Test profils existants
- [x] Test routes publiques existantes
- [x] Test tableaux de bord existants
- [x] Test workflows métier existants

### Test E2E
- [x] Créer un projet
- [x] Ajouter des tâches
- [x] Ajouter des jalons
- [x] Ajouter un document
- [x] Créer un permis
- [x] Ajouter un fournisseur
- [x] Ajouter un sous-traitant
- [x] Créer une facture
- [x] Enregistrer un paiement partiel
- [x] Créer un article en stock
- [x] Créer une demande de matériel
- [x] Livrer la demande
- [x] Détecter un stock critique
- [x] Créer un incident sécurité
- [x] Déclencher une alerte
- [x] Calculer la rentabilité du projet

### Livrables
- [x] Cahier de tests complet
- [x] Tests automatisés
- [x] Rapport de bugs
- [x] Rapport sécurité
- [x] Rapport non-régression
- [x] Corrections nécessaires
- [x] Validation finale

## Sprint 18 ERP Construction — Déploiement Staging

### Préparation environnement
- [x] Vérifier variables d'environnement staging
- [x] Vérifier état base de données (tables, migrations)
- [x] Vérifier configuration serveur (port, CORS, sessions)

### Seed données
- [x] Script seed rôles et permissions ERP
- [x] Script seed utilisateurs de test
- [x] Exécuter les seeds en staging

### Tests staging
- [x] Exécuter tests fonctionnels (29 modules)
- [x] Exécuter tests sécurité
- [x] Exécuter tests non-régression
- [x] Exécuter test E2E
- [x] Vérifier performances (temps de réponse)
- [x] Vérifier logs (pas d'erreurs critiques)

### Checklist staging
- [x] Application démarre
- [x] Login fonctionne
- [x] Rôles ERP disponibles
- [x] Dashboard accessible
- [x] Projets créables
- [x] Documents uploadables
- [x] Factures créables
- [x] Stocks modifiables
- [x] Alertes générées
- [x] Notifications visibles
- [x] Données Finance protégées
- [x] Modules Foncier225 existants fonctionnent

### Rollback
- [x] Plan de rollback documenté
- [x] Test de rollback validé

### Livrables
- [x] Rapport de déploiement staging
- [x] Liste des migrations exécutées
- [x] Liste des variables d'environnement
- [x] Rapport de tests staging
- [x] Bugs détectés et corrections
- [x] Go/No-Go pour production

## Sprint 19 ERP Construction — Déploiement Production Progressif

### Préparation
- [x] Fenêtre de déploiement définie
- [x] Parties prenantes informées
- [x] Backup base de données effectué
- [x] Backup code (checkpoint stable)
- [x] Variables d'environnement production vérifiées

### Déploiement progressif
- [x] Script de déploiement progressif (feature flags par phase)
- [x] Phase 1 : Super Admin + Admin ERP uniquement
- [x] Phase 2 : Project Managers
- [x] Phase 3 : Finance, Safety, Inventory
- [x] Phase 4 : Vendors et Contractors
- [x] Phase 5 : Généralisation

### Tests post-déploiement
- [x] Login
- [x] Accès ERP
- [x] Création projet
- [x] Création tâche
- [x] Upload document
- [x] Création facture
- [x] Paiement
- [x] Mouvement stock
- [x] Création incident
- [x] Génération alerte
- [x] Notification
- [x] Accès modules Foncier225 existants

### Checklist production
- [x] Backup effectué
- [x] Rollback prêt
- [x] Migrations validées
- [x] Rôles créés
- [x] Permissions validées
- [x] Utilisateurs pilotes créés
- [x] Dashboard accessible
- [x] Modules critiques testés
- [x] Logs actifs
- [x] Monitoring actif
- [x] Documentation disponible
- [x] Support informé

### Livrables
- [x] Rapport de déploiement production
- [x] Checklist signée
- [x] Rapport de monitoring
- [x] Anomalies détectées et plan de correction
- [x] Guide support
- [x] Validation finale

## Fix: Gantt 404
- [x] Créer une page ErpGantt.tsx globale (vue multi-projets) accessible à /erp/gantt
- [x] Ajouter la route /erp/gantt dans App.tsx
- [x] Vérifier TypeScript et tests

## Fix: Permissions ERP — modules sans préfixe erp_
- [x] Corriger hasPermission("inventory",...) → hasPermission("erp_inventory",...) dans ErpSupplierIntegration, ErpMaterialRequests, ErpWastage, ErpInventory
- [x] Corriger hasPermission("finance",...) → hasPermission("erp_finance",...) dans ErpFinanceBudgets, ErpFinanceCashFlow, ErpFinanceProfitability
- [x] Corriger action "edit" → "update" (action ERP correcte) dans frontend et serveur
- [x] Corriger erpPermissionProcedure("inventory",...) → erpPermissionProcedure("erp_inventory",...) dans tous les routeurs serveur
- [x] Corriger erpPermissionProcedure("finance",...) → erpPermissionProcedure("erp_finance",...) dans erp-finance-router et erp-overrun-alerts-router

## Regrouper les modules Finance dans un sous-menu
- [x] Créer un menu déroulant/collapsible "Finance" dans la sidebar ERP regroupant Factures, Paiements, Budgets, Trésorerie, Rentabilité, Alertes Dépassement

## Sprint 20 — Stabilisation post-audit ERP Construction

### 1. Sécurité critique
- [x] Rate limiting API global (100 req/min ERP, strict pour auth, spécifique pour upload)
- [x] Sécurisation uploads (validation MIME, magic bytes, taille max, extension, nom fichier)
- [x] Sanitization inputs texte (protection XSS côté serveur)

### 2. Performance
- [x] Cache applicatif ciblé (dashboard, stats, listes de référence — TTL 1-5 min)
- [x] Heartbeat automatique alertes (budget, factures échues, docs expirés, stock critique)

### 3. Fonctionnalités transversales
- [x] Exports CSV/Excel (projects, tasks, invoices, payments, inventory, vendors, contractors, audit-logs)
- [x] Recherche globale ERP (Ctrl+K, CommandDialog, navigation + projets)
- [x] Notifications via heartbeat (dépassement budget, facture échue, docs expirés, stock critique, projets retard)

### 4. UX
- [x] Responsive sidebar ERP (mobile overlay, hamburger menu, breakpoints lg)

### 5. Data integrity
- [x] Soft delete standardisé (tables principales couvertes, relationnelles = hard delete OK)

### 6. Documentation
- [x] Rapport final Sprint 20 + tests vitest (1103 tests PASS)


## Sprint 21 — Modules Achats, Dépenses et Pré-comptabilité

- [x] Audit tables existantes (vendors, invoices, payments, budgets, inventory, equipment)
- [x] Schéma DB : tables paramétrage comptable (erp_accounting_accounts, erp_tax_codes, erp_payment_accounts, erp_accounting_pre_entries)
- [x] Schéma DB : tables achats (erp_purchase_categories, erp_purchase_requests, erp_purchase_request_lines, erp_rfqs, erp_rfq_responses, erp_purchase_orders, erp_purchase_order_lines, erp_goods_receipts, erp_goods_receipt_lines, erp_purchase_approvals)
- [x] Schéma DB : tables dépenses (erp_expense_categories, erp_expenses, erp_expense_lines)
- [x] Migration DB appliquée (19 nouvelles tables)
- [x] Routeur tRPC : erp-accounting-router (CRUD comptes, codes taxe, comptes paiement)
- [x] Routeur tRPC : erp-purchases-router (PR, PO, réceptions, catégories, workflows)
- [x] Routeur tRPC : erp-expenses-router (CRUD, workflow soumission/approbation, stats, catégories)
- [x] Page UI : ErpAccounting.tsx (paramétrage comptable — comptes, codes taxe, comptes paiement)
- [x] Page UI : ErpPurchaseRequests.tsx (demandes d'achat avec workflow)
- [x] Page UI : ErpPurchaseOrders.tsx (bons de commande avec workflow)
- [x] Page UI : ErpExpenses.tsx (dépenses avec workflow soumission/approbation)
- [x] Permissions RBAC : modules erp_purchases, erp_expenses, erp_accounting dans ERP_MODULES
- [x] Sidebar ERP : menus Achats (sous-menu collapsible), Dépenses, Comptabilité
- [x] Routes App.tsx : /erp/accounting, /erp/purchase-requests, /erp/purchase-orders, /erp/expenses
- [x] Tests vitest Sprint 21 — 1120 tests PASS (17 nouveaux), 0 erreurs TypeScript

## Sprint 21b — Réceptions, Écritures auto, Dashboard Achats

- [x] Page UI ErpGoodsReceipts.tsx (/erp/goods-receipts) — liste, création, validation, impact stock
- [x] Route App.tsx + sidebar ERP pour Réceptions
- [x] Écritures pré-comptables automatiques — génération journal HA à la validation facture/paiement
- [x] Dashboard Achats (/erp/purchases-dashboard) — KPIs, montant PO, taux livraison, top fournisseurs
- [x] Tests vitest et non-régression — 1120 tests PASS

## Sprint 22 — Vente Immobilière + Comptabilité Générale
- [x] Schéma DB Vente Immobilière (11 tables : programs, buildings, units, customers, reservations, sales, payment_plans, installments, deliveries, delivery_reserves)
- [x] Schéma DB Comptabilité Générale (10 tables : fiscal_years, periods, journals, entries, entry_lines, third_parties, analytic_axes, analytic_allocations, bank_reconciliations, bank_reconciliation_lines, tax_periods, tax_declarations)
- [x] Migrations DB appliquées
- [x] Routeur tRPC Vente Immobilière (erp-real-estate-router.ts) — programmes, bâtiments, unités, clients, réservations, ventes, plans paiement, encaissements, livraisons, commissions
- [x] Routeur tRPC Comptabilité Générale (erp-full-accounting-router.ts) — journaux, écritures, rapports (balance, grand livre), rapprochement bancaire, analytique, tiers
- [x] Page ErpRealEstateDashboard.tsx — Dashboard KPIs Vente Immobilière
- [x] Page ErpRealEstatePrograms.tsx — Gestion programmes immobiliers
- [x] Page ErpRealEstateUnits.tsx — Gestion unités (lots, appartements)
- [x] Page ErpRealEstateCustomers.tsx — Gestion clients immobiliers
- [x] Page ErpRealEstateReservations.tsx — Réservations
- [x] Page ErpRealEstateSales.tsx — Ventes immobilières
- [x] Page ErpRealEstatePayments.tsx — Encaissements clients
- [x] Page ErpAccountingDashboard.tsx — Dashboard Comptabilité Générale
- [x] Page ErpAccountingJournals.tsx — Journaux comptables
- [x] Page ErpAccountingEntries.tsx — Écritures comptables
- [x] Page ErpAccountingBalance.tsx — Balance générale
- [x] Modules RBAC erp_real_estate et erp_full_accounting ajoutés (19 modules total)
- [x] Permissions par défaut définies pour les nouveaux modules (6 actions chacun)
- [x] Rôles mis à jour (finance_manager, viewer, super_admin)
- [x] Sidebar ErpLayout.tsx — Menus collapsibles Vente Immobilière (7 items) et Comptabilité Générale (4 items)
- [x] Routes App.tsx — 11 nouvelles routes + lazy imports
- [x] Tests Sprint 22 (sprint22.test.ts) — 48 tests PASS
- [x] 1166 tests PASS total, 0 erreur TypeScript

## Sprint 23 — RFQ, Rapprochement Factures/PO, Export Comptable SAGE/CODA
- [x] Audit existant (tables, routeurs, pages)
- [x] Tables DB : erp_rfqs, erp_rfq_lines, erp_rfq_vendors, erp_vendor_quotes, erp_vendor_quote_lines
- [x] Tables DB : erp_invoice_po_matches, erp_invoice_po_match_lines, erp_matching_settings
- [x] Tables DB : erp_accounting_export_formats, erp_accounting_exports, erp_accounting_export_lines
- [x] Routeur tRPC RFQ (CRUD, envoi, quotes, comparaison, sélection auto, conversion PO)
- [x] Routeur tRPC Rapprochement Factures/PO (matching auto, approbation, variances)
- [x] Routeur tRPC Export Comptable (formats, génération, téléchargement)
- [x] Page /erp/rfqs — Liste RFQ
- [x] Page /erp/rfqs détail — Détail RFQ avec comparaison offres
- [x] Page /erp/invoice-matching — Rapprochement Factures/PO
- [x] Page /erp/accounting-exports — Export Comptable SAGE/CODA
- [x] Permissions RBAC (erp_rfqs, erp_invoice_matching, erp_accounting_exports)
- [x] Sidebar + routes App.tsx
- [x] Tests Sprint 23
- [x] Checkpoint final

## Sprint 24 — Audit Hooks, ESLint, Dashboard Chart.js

- [x] Auditer toutes les pages ERP pour le pattern early return avant hooks (0 vrais problèmes détectés après fix ErpPurchasesDashboard)
- [x] Ajouter ESLint react-hooks/rules-of-hooks (eslint.config.js + scripts lint/lint:hooks)
- [x] Enrichir dashboard Achats avec Chart.js (évolution mensuelle Line chart + répartition fournisseurs Doughnut)
- [x] Procédures backend monthlyTrend + vendorDistribution dans erp-purchases-router.ts
- [x] Tests et checkpoint (1182 tests PASS, 0 erreurs TS)

## Sprint Budget 2.0 — Réécriture complète module Budget

- [x] Audit module Budget existant (tables, routeurs, pages, liens)
- [x] Schéma DB : 12 tables Budget 2.0 (erp_budgets_v2, erp_budget_versions, erp_budget_periods, erp_budget_categories, erp_budget_lines_v2, erp_budget_line_amounts, erp_budget_imports, erp_budget_import_errors, erp_budget_template_mappings, erp_budget_pl_snapshots, erp_budget_cashflow_snapshots, erp_budget_alerts)
- [x] Routeur tRPC Budget V2 : CRUD budgets, versions, catégories, lignes, montants, alertes
- [x] Moteur import Excel : upload base64, analyse sheets, mapping colonnes, preview, commit
- [x] Moteur exécution budgétaire : sync actuals depuis modules ERP, calculs écarts
- [x] Alertes budgétaires (seuils configurables, types multiples, acquittement)
- [x] Exports (Excel via ExcelJS, CSV, PDF via html-pdf)
- [x] Page Dashboard Budget V2 (/erp/budget-v2)
- [x] Page Import Budget Excel (/erp/budget-v2/import)
- [x] Page Détail Budget avec onglets (Vue d'ensemble Chart.js, Lignes, Alertes)
- [x] Permissions RBAC (erp_budget_v2 module avec 6 permissions)
- [x] Sidebar + routes App.tsx (3 routes)
- [x] Tests Sprint Budget 2.0 (1202 tests PASS, 0 erreurs TS)
- [x] Checkpoint final

## Sprint Budget 2.1 — Seed, Import Excel réel, Snapshots P&L/Cash Flow

- [x] Audit module Budget 2.0 existant
- [x] Table erp_budget_snapshot_jobs (logs des jobs)
- [x] Permissions RBAC étendues (10 permissions : view, create, update, delete, approve, export, import, seed, sync, recalculate)
- [x] Seed idempotent Budget 2026 (seedBudget2026 / cleanBudget2026)
- [x] Amélioration moteur import Excel (détection mois FR/EN/code, accents, colonnes catégorie FR, lignes TOTAL, nombres FR)
- [x] Service génération snapshots (generatePlSnapshots, generateCashFlowSnapshots, generateAlertsFromSnapshots)
- [x] Routeur Snapshots P&L/Cash Flow intégré dans budgetV2Router (pl.get, pl.recalculate, cashFlow.get, cashFlow.recalculate)
- [x] Job heartbeat automatique /api/scheduled/budget-snapshots (quotidien 6h UTC)
- [x] UI onglets P&L/Cash Flow dans page Détail Budget (graphiques Bar/Line, tableaux mensuels, bouton Recalculer)
- [x] UI Dashboard Budget enrichi (Vue d'ensemble + Catégories + Seed Démo + Sync Réel + Export)
- [x] Audit logs (createAuditEvent dans routeur v2, import, heartbeat)
- [x] Notifications (notifyOwner pour import erreurs, alertes budget détectées)
- [x] Tests Sprint Budget 2.1 (1221 tests PASS, 0 erreurs TS)
- [x] Checkpoint final

## Sprint Budget-Objectifs-Analytique — Connexion Budget aux Objectifs Commerciaux, Ventes Immobilières et Comptabilité Analytique

- [x] Audit préalable (tables, routeurs, pages existants)
- [x] Tables DB : erp_sales_targets, erp_sales_target_results, erp_sales_target_assignments
- [x] Tables DB : erp_budget_real_estate_links, erp_real_estate_budget_actuals
- [x] Tables DB : erp_cost_centers (+ enrichi erp_analytic_allocations avec 5 colonnes)
- [x] Table DB : erp_budget_integration_jobs, erp_analytic_snapshots
- [x] Routeur Objectifs Commerciaux (erpSalesTargetsRouter : targets CRUD, approve, lock, revise, sync, results, dashboard)
- [x] Routeur Budget-Ventes Immobilières (erpBudgetRealEstateRouter : links CRUD, sync, actuals, performance)
- [x] Routeur Comptabilité Analytique (erpAnalyticsRouter : costCenters CRUD, axes CRUD, allocations CRUD, snapshots generate/list)
- [x] Moteur de synchronisation global (runIntegrationJob : sync_real_estate_actuals, sync_sales_targets, generate_analytic_snapshots, full_sync)
- [x] Pages UI Objectifs Commerciaux (ErpSalesTargets + ErpSalesTargetDetail)
- [x] Pages UI Analytique (ErpAnalyticsDashboard + ErpCostCenters)
- [x] Onglet Ventes Immobilières dans Budget Détail (liens, sync, actuals)
- [x] Onglet Objectifs Commerciaux dans Budget Détail (objectifs liés, progression)
- [x] RBAC : 3 modules (erp_sales_targets 7 perms, erp_analytics 6 perms, erp_budget_integrations 3 perms)
- [x] Sidebar + routes App.tsx (2 groupes, 4 routes)
- [x] Tests complets (1237 tests PASS, 0 erreurs TS, 43 fichiers test)
- [x] Checkpoint final

## Sprint Direction 360 — Heartbeat Budget, Dashboard Direction et Export PDF Analytique
- [x] Audit préalable (tables, routes, services, jobs existants)
- [x] Partie A — Job heartbeat d'intégration budget-integrations
  - [x] Endpoint scheduled /api/scheduled/budget-integrations avec sécurité header
  - [x] Enrichir table erp_budget_integ_jobs (sync_scope, budget_id, period_id, trigger_source)
  - [x] API admin jobs (list, get, run, retry) via tRPC
  - [x] Page UI /erp/budget-integrations/jobs (suivi des jobs)
- [x] Partie B — Dashboard Direction consolidé
  - [x] Routeur tRPC direction-dashboard (summary, sales-targets, budget, real-estate, analytics, pl, cash-flow, alerts)
  - [x] Page UI /erp/direction-dashboard avec KPIs cross-modules
  - [x] Charts Chart.js (P&L, Cash Flow, Budget vs Réalisé)
  - [x] Filtres globaux (période, année, programme, centre de coût)
- [x] Partie C — Export PDF rapport analytique
  - [x] Table erp_direction_report_exports
  - [x] Service PDF (pdfkit) avec template rapport direction
  - [x] API export PDF (generate, list, download)
  - [x] Bouton export PDF dans Dashboard Direction
- [x] RBAC : modules erp_direction_dashboard (5 perms), erp_direction_reports (3 perms)
- [x] Notifications (jobs, alertes direction, exports)
- [x] Audit logs (jobs, dashboard, exports)
- [x] Sidebar ERP + routes App.tsx
- [x] Tests Vitest (heartbeat, dashboard, export PDF, non-régression)
- [x] 0 erreur TypeScript, tous tests PASS (1249 tests, 44 fichiers)
- [x] Checkpoint final (e762382e)

## Sprint Gouvernance Direction — Revue Mensuelle, Diffusion Rapports, Plans d'Actions, Drill-down KPI
- [x] Audit préalable (tables, routes, services existants)
- [x] Partie A — Diffusion automatique rapports Direction
  - [x] Tables erp_direction_report_schedules + erp_direction_report_deliveries
  - [x] Routeur tRPC directionSchedules (create, list, runNow, disable, deliveries)
  - [x] Page UI /erp/direction-schedules
- [x] Partie B — Revue mensuelle de direction
  - [x] Tables erp_direction_reviews + erp_direction_review_comments
  - [x] Routeur tRPC directionReviews (create, list, getById, submit, approve, close, addComment, listComments)
  - [x] Page UI /erp/direction-reviews (liste, detail avec workflow + commentaires)
- [x] Partie C — Plans d'actions de direction
  - [x] Table erp_direction_action_plans
  - [x] Routeur tRPC directionActions (create, list, update, complete, cancel, summary, overdue)
  - [x] Page UI /erp/direction-actions (KPIs, filtres, liste avec progression)
- [x] Partie D — Drill-down KPI
  - [x] Endpoint drilldown dans direction-dashboard-router (10 KPI keys)
  - [x] Page UI /erp/direction-drilldown (filtres + table dynamique)
- [x] Partie E — Contrôle qualité données
  - [x] Table erp_direction_data_quality_checks
  - [x] Service 7 checks qualité (budget_lines, invoices, sales, projects, cost_centers, targets, programs)
  - [x] Routeur tRPC directionDataQuality (runAll, latest, definitions)
  - [x] Page UI /erp/direction-data-quality
- [x] RBAC : 4 nouveaux modules (direction_reviews 4 perms, direction_actions 4 perms, direction_data_quality 2 perms, direction_schedules 3 perms) — 32 modules total
- [x] Notifications (rapports, revues, actions, qualité) via notifyOwner
- [x] Audit logs (schedules, revues, actions, drill-down, qualité) via createAuditEvent
- [x] Sidebar ERP enrichie (7 entrées dans groupe Direction) + 5 routes App.tsx
- [x] Tests Vitest (11 nouveaux tests + non-régression, 1260 tests PASS, 45 fichiers)
- [x] 0 erreur TypeScript
- [x] Checkpoint final (186bbf7a)

## Sprint Industrialisation ERP 1.0 — Monitoring, Performance, Sécurité, Qualité, Documentation
- [x] Audit préalable production (modules, risques, recommandations)
- [x] Monitoring et observabilité
  - [x] Routeur tRPC systemHealth (overview, jobs, recentAudit)
  - [x] Page UI /erp/system-health (KPIs, mémoire, uptime, audit)
- [x] Jobs planifiés
  - [x] Page UI /erp/scheduled-jobs (5 jobs, historique, relance manuelle)
- [x] Qualité données globale
  - [x] Routeur tRPC adminDataQuality (runAll 11 checks, latest, definitions)
  - [x] Page UI /erp/admin-data-quality (score, résultats, définitions)
- [x] RBAC : 3 nouveaux modules (system_health, scheduled_jobs, data_quality_global) — 35 modules total
- [x] Sidebar admin enrichie (6 entrées)
- [x] Routes App.tsx (3 nouvelles routes admin)
- [x] Documentation production
  - [x] Guide exploitation production (docs/erp/production-ops.md)
  - [x] Guide utilisateur ERP (docs/erp/guide-utilisateur.md)
  - [x] Plan de recette (docs/erp/plan-recette.md)
  - [x] Rapport audit industrialisation (docs/erp/audit-industrialisation.md)
- [x] Tests Vitest (14 nouveaux + non-régression, 1274 tests PASS, 46 fichiers)
- [x] 0 erreur TypeScript
- [x] Checkpoint final (3ed4b5d8)

## Réorganisation Sidebar ERP — Regroupement par catégorie
- [x] Regrouper les modules de la sidebar ERP par catégories logiques
- [x] Catégories : Opérations, Supply Chain, Achats, Finance, Immobilier, Comptabilité, Direction, Administration
- [x] Checkpoint final (b559a14c)

## Page publique /suivi — Suivi dossier foncier rural
- [x] Créer la page publique /suivi accessible sans connexion
- [x] Formulaire de recherche par numéro de dossier
- [x] Affichage statut, étapes, localisation, timeline
- [x] Route dans App.tsx (public, sans CitizenLayout)
- [x] Checkpoint final (3ec6fc2f)

## Suivi dossier foncier urbain — Mot de passe (style SIGFU)
- [x] Ajouter colonne trackingPassword à urban_acd_applications
- [x] Modifier routeur public urbanAcd.track pour exiger le mot de passe
- [x] Modifier la page /suivi : formulaire séparé urbain avec N° dossier + mot de passe
- [x] Générer automatiquement le mot de passe à la création du dossier ACD
- [x] Afficher le mot de passe dans le retour de création (trackingPassword)
- [x] Info-bulle explicative (comme SIGFU : "Le numéro et le mot de passe se trouvent sur l'Ordre de Recettes")
- [x] Checkpoint final (46d930cc)

## Correction suivi urbain — Interconnexion SIGFU (pas de génération interne)
- [x] Supprimer la génération automatique de trackingPassword à la création ACD
- [x] Remplacer le routeur public track par un stub d'interconnexion SIGFU (prêt à brancher l'API)
- [x] Adapter la page /suivi : message informatif "service en cours de mise en place" si pas d'API
- [x] Checkpoint final (2b654223)

## Module Commandes Clients (Sales Orders) — BC reçus de clients
- [x] Tables DB : erp_sales_clients, erp_sales_orders, erp_sales_order_lines, erp_sales_order_history
- [x] Routeur tRPC salesOrders (CRUD clients, CRUD commandes, workflow statut, dashboard par client)
- [x] Page UI liste commandes + création (ErpSalesOrdersList, ErpSalesOrderCreate)
- [x] Page UI détail commande (lignes, statut workflow, historique) — ErpSalesOrderDetail
- [x] Page UI dashboard commandes par client (Orange CI, CIE, etc.) — ErpSalesOrdersDashboard
- [x] Page UI gestion clients entreprises — ErpSalesClients
- [x] Intégration budget/trésorerie (impact prévisionnel dans dashboard)
- [x] RBAC module erp_sales_orders (view, create, update, delete, export) — 36 modules total
- [x] Sidebar ERP (catégorie Finance) + routes App.tsx (5 routes)
- [x] Tests Vitest (13 tests) + 0 erreur TypeScript + 1287 tests PASS total
- [x] Checkpoint final

## Liaison Commandes Clients ↔ Budget & Comptabilité

- [x] Service sync Budget recettes : syncSalesOrdersToBudget — agrège committed/invoiced/paid dans erpBudgetLineAmounts REVENUE
- [x] Hook updateStatus → invoiced : génère automatiquement une facture de vente (FV-YYYY-NNNN) dans erp_invoices
- [x] Écriture pré-comptable automatique : Journal VE (Débit 411000 Client / Crédit 701000 Ventes / Crédit 445700 TVA)
- [x] Écriture encaissement client : Journal BQ/CA (Débit 512/531 Trésorerie / Crédit 411000 Client)
- [x] Cash-flow prévisionnel : getSalesOrdersCashFlowForecast (encaissements attendus + retards)
- [x] Procédures tRPC : integration.syncToBudget, integration.generateInvoice, integration.cashFlowForecast, integration.recordPayment
- [x] Tests Vitest : 15 tests dédiés + 1302 tests PASS total (48 fichiers)
- [x] Vérification TypeScript : 0 erreur
- [x] Checkpoint final

## Page Tableau de bord Cash-flow prévisionnel

- [x] Page UI ErpCashFlowForecast avec graphique Chart.js (barres encaissements + ligne commandes)
- [x] Tableau des retards de paiement (clients en retard, montants, jours de retard, urgence)
- [x] KPIs : total attendu, total en retard, taux de recouvrement
- [x] Détail mensuel avec top clients par période
- [x] Route App.tsx (/erp/cash-flow-forecast) + entrée sidebar Finance
- [x] Vérification TypeScript (0 erreur) + 1302 tests PASS
- [x] Checkpoint final

## Mise à jour Module Factures — Modèle Facture Normalisée CI

- [x] Table erp_company_settings (NCC, RCCM, régime fiscal, centre impôts, coordonnées, références bancaires)
- [x] Colonnes supplémentaires erp_sales_clients (ncc, tax_regime, rccm)
- [x] Service génération PDF (PDFKit + QRCode) conforme au modèle FNE — erp-invoice-pdf.service.ts
- [x] Numérotation normalisée : NCC + Année(2) + Séquence(12) = generateNormalizedInvoiceNumber()
- [x] QR Code contenant : FNE|NCC|Numéro|Montant|Date
- [x] Procédures tRPC : generatePdf, getNextInvoiceNumber, getCompanySettings, updateCompanySettings
- [x] Page UI Paramètres Société (ErpCompanySettings.tsx) + route /erp/company-settings + sidebar
- [x] Bouton "PDF Normalisé" dans la vue détail facture (GeneratePdfButton)
- [x] Upload PDF vers S3 + mise à jour attachmentUrl/attachmentKey
- [x] Tests Vitest : 9 tests dédiés + 1311 tests PASS total (49 fichiers)
- [x] Vérification TypeScript : 0 erreur
- [x] Checkpoint final

## Upload Logo Entreprise + Intégration PDF

- [x] Procédure tRPC uploadCompanyLogo (upload S3 + mise à jour logoUrl dans erp_company_settings)
- [x] Composant LogoUploader dans ErpCompanySettings (prévisualisation, validation format/taille, upload base64)
- [x] Intégration logo dans le service PDF (fetch URL S3 + doc.image() en en-tête)
- [x] Aperçu en-tête facture dans la page Paramètres (avec logo + infos société)
- [x] Tests : 1311 PASS + 0 erreur TypeScript
- [x] Checkpoint final

## Génération PDF Bon de Commande (module Achats)

- [x] Service génération PDF conforme au modèle Orange CI (PDFKit) — erp-purchase-order-pdf.service.ts
- [x] En-tête : logo société (fetch S3), titre BON DE COMMANDE, infos émetteur
- [x] Bloc infos : acheteur, organisation, type CAPEX/OPEX, devise, numéro BC, date, code fournisseur
- [x] Bloc adresses (3 colonnes) : livraison, facturation, fournisseur
- [x] Bloc observations : description concaténée des lignes
- [x] Tableau lignes : N° Ligne, Quantité, UM, Réf Article, Description, Code Catégorie, Description Catégorie, Date livraison, Coût unitaire HT, Coût total HT
- [x] Totaux : Total Net HT, Montant TVA, Total TTC
- [x] Bloc signature : titre, date, nom signataire (approbateur), fonction
- [x] Pied de page : informations légales société (RCCM, NCC, régime, banque)
- [x] Procédure tRPC erp.purchases.orders.generatePdf + upload S3
- [x] Bouton "PDF Bon de Commande" dans la vue détail (GeneratePoPdfButton)
- [x] Tests Vitest : 10 tests dédiés + 1321 tests PASS total (50 fichiers)
- [x] Vérification TypeScript : 0 erreur
- [x] Checkpoint final

## Personnalisation Numérotation BC + Champ CAPEX/OPEX

- [x] Colonnes po_prefix + po_next_seq dans erp_company_settings (préfixe configurable)
- [x] Fonction generatePoNumber() : format {PREFIX}-BC{SEQUENCE}/{YY} (ex: OCI-BC0043/26)
- [x] Colonne purchase_type (CAPEX/OPEX) dans erp_purchase_orders
- [x] Formulaire création BC : sélecteur Type (CAPEX Investissement / OPEX Fonctionnement)
- [x] Vue détail : badge CAPEX/OPEX + PDF mis à jour
- [x] Page Paramètres Société : section "Numérotation Bons de Commande" (préfixe, séquence, aperçu format)
- [x] Tests : 1321 PASS + 0 erreur TypeScript
- [x] Checkpoint final

## Filtres CAPEX/OPEX + Tableau de bord Achats

- [x] Filtre par type CAPEX/OPEX dans la liste des bons de commande (sélecteur + colonne badge)
- [x] Filtre par statut dans la liste des bons de commande
- [x] Procédure tRPC orders.dashboard (répartition CAPEX/OPEX, top 10 fournisseurs, évolution mensuelle, statuts)
- [x] Dashboard Achats enrichi : section CAPEX/OPEX (3 cartes avec barres de progression + pourcentages)
- [x] Sélecteur d'année + route et sidebar existants
- [x] Tests : 1321 PASS (50 fichiers) + 0 erreur TypeScript
- [x] Checkpoint final

## Colonnes Désignation + Date + Pièce jointe (Dépenses & Achats)
- [x] Colonnes designation, line_date, attachment_url/key/name dans erp_expense_lines
- [x] Colonnes designation, line_date, attachment_url/key/name dans erp_purchase_order_lines
- [x] Routeur expenses : linesRouter (add, list, delete, uploadAttachment)
- [x] Routeur purchases : uploadLineAttachment + designation/lineDate dans create
- [x] Page ErpExpenses : section lignes avec formulaire (désignation, date, description, qté, prix) + upload pièce
- [x] Page ErpPurchaseOrders : formulaire création enrichi (désignation, date) + vue détail avec colonne Pièce
- [x] Upload S3 avec validation taille (5 Mo max) et formats (PDF, images, Word, Excel)
- [x] Tests : 1321 PASS (50 fichiers) + 0 erreur TypeScript
- [x] Checkpoint final

## Sprint IA Construction — Module AI Plan Analyzer
- [x] Audit préalable (rapport d'architecture)
- [x] 7 tables DB : erp_ai_plan_analyses, erp_ai_plan_elements, erp_ai_material_takeoffs, erp_ai_engineering_checks, erp_ai_construction_rules, erp_ai_quantity_coefficients, erp_ai_plan_review_comments
- [x] Service analyse IA (LLM vision) : détection éléments, extraction dimensions, contrôles ingénierie
- [x] Moteur de calcul quantitatif : coefficients configurables, taux de perte, conversion unités
- [x] Service génération PDF technique (10 sections, PDFKit)
- [x] Routeur tRPC aiPlanAnalyzer : 11 sous-routeurs (analyses, actions, elements, takeoffs, checks, comments, rules, coefficients, exports, convert, assistant)
- [x] Pages UI : liste analyses (dashboard KPI), upload, détail (7 onglets), paramètres (coefficients + règles)
- [x] Intégration modules existants : Budget V2, Demandes Matériel, RFQ, Stock (vérification stock)
- [x] Assistant IA conversationnel dans la page détail (onglet dédié)
- [x] RBAC module erp_ai_plan_analyzer ajouté dans ERP_MODULES
- [x] Exports Excel/CSV + PDF technique
- [x] Sidebar IA Construction + routes App.tsx (4 routes)
- [x] Tests Vitest : 7 tests passés + 0 erreur TypeScript
- [x] Documentation + rapport de sprint
- [x] Checkpoint final

## Sprint IA 1 — Assistant IA ERP Central et Direction
- [x] Audit données existantes et architecture IA
- [x] Tables DB IA : erp_ai_conversations, erp_ai_messages, erp_ai_recommendations, erp_ai_document_extractions, erp_ai_risk_scores, erp_ai_audit_logs
- [x] Service assistant IA contextuel (chat multi-module avec respect RBAC)
- [x] Service résumé projet automatique
- [x] Service résumé budget automatique
- [x] Service résumé direction automatique
- [x] Service recommandations IA (génération, validation, rejet, application)
- [x] Routeur tRPC IA : chat, conversations CRUD, recommandations, résumés, audit logs, risques, dashboard
- [x] Page /erp/ai/assistant (interface chat IA contextuel)
- [x] Page /erp/ai/recommendations (liste recommandations IA avec actions)
- [x] Page /erp/ai/audit (journal d'audit IA)
- [x] RBAC module erp_ai_assistant ajouté dans ERP_MODULES
- [x] Sidebar IA Assistant + routes App.tsx (3 entrées)
- [x] Tests Vitest : 13 tests passés + 0 erreur TypeScript
- [x] Documentation + rapport de sprint
- [x] Checkpoint final

## Sprint Module Énergie Solaire — Digitalisation Excel et Recommandations IA
- [x] 10 tables DB : erp_solar_projects, erp_solar_load_items, erp_solar_sizing_results, erp_solar_cable_sizing, erp_solar_budget_lines, erp_solar_scenarios, erp_solar_ai_recommendations, erp_solar_settings, erp_solar_import_jobs, erp_solar_conversions
- [x] Moteur de calcul backend (bilan puissance, dimensionnement PV/batteries/onduleur/câblage, budget par lots)
- [x] Service IA solaire (recommandations, scénarios auto, assistant conversationnel)
- [x] Routeur tRPC solar complet (projects, loadItems, sizing, budget, scenarios, ai, settings)
- [x] Dashboard solaire (/erp/solar)
- [x] Page création projet (/erp/solar/new)
- [x] Page détail projet avec onglets (bilan puissance, dimensionnement, budget, câblage, scénarios, IA)
- [ ] Page paramètres (zones solaires, paramètres techniques, catalogue prix) — à faire
- [ ] Page import Excel (preview + commit) — à faire
- [x] RBAC module erp_solar ajouté
- [x] Sidebar Énergie Solaire + routes App.tsx (3 routes: /erp/solar, /erp/solar/new, /erp/solar/:id)
- [ ] Conversions ERP : Budget, RFQ, Material Request — à faire
- [ ] Export PDF rapport dimensionnement + Export Excel — à faire
- [x] Tests Vitest (15 tests calcul solaire) + 0 erreur TypeScript
- [x] Checkpoint final

## Sprint Page Paramètres Solaires
- [x] Page ErpSolarSettings.tsx avec 3 onglets (zones, prix, paramètres techniques)
- [x] Onglet Zones : liste + création (zoneName, country, region, city, PSH, source)
- [x] Onglet Prix : liste + création + modification inline du prix unitaire (XOF)
- [x] Onglet Paramètres techniques : liste + upsert (code, nom, valeur, unité, description)
- [x] Route /erp/solar/settings ajoutée dans App.tsx
- [x] Entrée sidebar Énergie Solaire avec sous-menu Dashboard + Paramètres
- [x] RBAC : permissions erp_solar (view, create, update, delete, export) + IA modules
- [x] Tests : 1390 tests passés, 0 erreur TypeScript

## Bug Fix — Bilan solaire NaN
- [x] Corriger l'affichage NaN dans le bilan solaire (puissance totale, énergie journalière, Wh/j par charge)
