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
