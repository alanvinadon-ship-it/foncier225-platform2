# Sprint 2 — ERP Construction : Dashboard Central

## Résumé

Le Sprint 2 implémente le dashboard central de l'ERP Construction avec 17 indicateurs clés répartis en 6 domaines (Projets, Conformité, Sécurité, Équipements, Inventaire, Finance), des filtres dynamiques, un masquage conditionnel des données financières et un système de widgets personnalisables.

---

## Architecture

Le dashboard suit le pattern existant : routeur tRPC → service → DB. Les données sont structurées par domaine avec un fallback propre pour les modules non encore implémentés.

```
erp-dashboard-router.ts
├── summary        → Vue globale (tous indicateurs)
├── projects       → Indicateurs projets
├── finance        → Indicateurs financiers (protégé)
├── safety         → Indicateurs sécurité
├── inventory      → Indicateurs stocks
├── compliance     → Indicateurs conformité
├── equipment      → Indicateurs équipements
├── alerts         → Alertes consolidées
├── updateWidgets  → Personnalisation widgets (PUT)
└── getWidgets     → Configuration widgets (GET)
```

---

## Indicateurs affichés (17)

| Domaine | Indicateur | Widget Key |
|---------|-----------|------------|
| Projets | Projets actifs | `projects_active` |
| Projets | Projets en retard | `projects_late` |
| Projets | Tâches ouvertes | `tasks_open` |
| Projets | Jalons critiques | `milestones_critical` |
| Conformité | Documents expirés | `documents_expired` |
| Conformité | Permis à renouveler | `permits_renewal` |
| Sécurité | Incidents récents | `safety_incidents` |
| Équipements | Disponibles | `equipment_available` |
| Équipements | En maintenance | `equipment_maintenance` |
| Inventaire | Stocks critiques | `stock_critical` |
| Inventaire | Demandes en attente | `material_requests` |
| Finance | Factures impayées | `invoices_unpaid` |
| Finance | Paiements récents | `payments_recent` |
| Finance | Budget consommé | `budget_consumed` |
| Finance | Cash flow | `cash_flow` |
| Finance | Rentabilité | `profitability` |
| Finance | Alertes dépassement | `budget_alerts` |

---

## Filtres disponibles

| Filtre | Valeurs |
|--------|---------|
| Période | Aujourd'hui, Cette semaine, Ce mois, Ce trimestre, Cette année, Tout |
| Statut | Actif, En pause, Terminé, Annulé |
| Projet | Par ID (futur : dropdown dynamique) |
| Responsable | Par ID (futur : dropdown dynamique) |

---

## Sécurité et permissions

| Règle | Implémentation |
|-------|---------------|
| Données financières masquées | Backend vérifie `hasErpPermission(userId, "erp_finance", "view")` |
| Accès dashboard | Middleware `erpProtectedProcedure` (tout utilisateur ERP) |
| Accès projets | Middleware `erpPermissionProcedure("erp_projects", "view")` |
| Accès finance | Middleware `erpPermissionProcedure("erp_finance", "view")` |
| Frontend | `hasPermission("erp_finance", "view")` conditionne l'affichage |

---

## Table créée

| Table | Colonnes |
|-------|----------|
| `erp_dashboard_widgets` | id, user_id, widget_key, position, is_visible, settings_json, created_at, updated_at |

Contraintes : UNIQUE(user_id, widget_key), FK user_id → users(id) ON DELETE CASCADE.

---

## Fichiers créés

| Fichier | Rôle |
|---------|------|
| `server/erp/erp-dashboard-router.ts` | Routeur tRPC dashboard (10 procédures) |
| `server/erp/erp-dashboard.test.ts` | Tests unitaires dashboard (10 tests) |
| `drizzle/schema.ts` (ajout) | Table `erp_dashboard_widgets` |

---

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `server/erp/erp-router.ts` | Import + montage `erpDashboardRouter` |
| `client/src/pages/erp/ErpDashboard.tsx` | Réécriture complète avec KPI cards, filtres, masquage |

---

## Routes API (tRPC)

| Procédure | Protection | Description |
|-----------|-----------|-------------|
| `erp.dashboard.summary` | erpProtectedProcedure | Résumé global tous indicateurs |
| `erp.dashboard.projects` | erpPermission(erp_projects, view) | Indicateurs projets |
| `erp.dashboard.finance` | erpPermission(erp_finance, view) | Indicateurs financiers |
| `erp.dashboard.safety` | erpPermission(erp_safety, view) | Indicateurs sécurité |
| `erp.dashboard.inventory` | erpPermission(erp_inventory, view) | Indicateurs stocks |
| `erp.dashboard.compliance` | erpPermission(erp_compliance, view) | Indicateurs conformité |
| `erp.dashboard.equipment` | erpPermission(erp_equipment, view) | Indicateurs équipements |
| `erp.dashboard.alerts` | erpProtectedProcedure | Alertes consolidées |
| `erp.dashboard.updateWidgets` | erpProtectedProcedure | Personnaliser widgets |
| `erp.dashboard.getWidgets` | erpProtectedProcedure | Récupérer config widgets |

---

## Tests

| Fichier | Tests | Description |
|---------|-------|-------------|
| `server/erp/erp-dashboard.test.ts` | 10 | Structure widgets, masquage finance, filtres, fallback |
| `server/erp/erp-rbac.test.ts` | 11 | RBAC ERP (Sprint 1) |
| Tous fichiers existants | 328 | Non-régression Foncier225 |
| **Total** | **349** | **Tous PASS** |

---

## Non-régression

| Vérification | Résultat |
|-------------|----------|
| TypeScript | 0 erreur |
| Tests Vitest | 349/349 PASS |
| Serveur dev | HTTP 200 |
| Modules Foncier225 | Intacts |

---

## Fallback modules non disponibles

Chaque endpoint retourne `available: false` et un `message` explicatif quand le module n'est pas encore implémenté. Le frontend affiche un bandeau discret « Module X en cours de développement ». Les valeurs sont à 0 mais la structure est prête pour être alimentée.

---

## Prochaines étapes (Sprint 3)

1. **Module Projets** — CRUD complet avec statuts, assignations, timeline
2. **Module Gantt** — Planification avec dépendances et jalons
3. Alimenter le dashboard avec les données réelles des modules
