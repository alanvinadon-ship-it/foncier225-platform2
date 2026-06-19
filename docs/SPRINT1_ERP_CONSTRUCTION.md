# Sprint 1 — ERP Construction : Architecture, Rôles, Permissions

## Résumé

Le Sprint 1 pose les fondations du module ERP Construction intégré à Foncier225. Il implémente un système RBAC dédié (séparé du RBAC Foncier225) avec 9 rôles, 14 modules, 12 actions et des middlewares de protection. L'existant Foncier225 n'est pas impacté (339 tests PASS, 0 erreur TypeScript).

---

## Décision d'architecture

**Stratégie retenue : Tables ERP dédiées (préfixe `erp_`)**

| Critère | Réutiliser RBAC existant | Tables ERP dédiées |
|---------|--------------------------|---------------------|
| Risque de régression | Élevé | Nul |
| Séparation des préoccupations | Faible | Forte |
| Rôles simultanés Foncier + ERP | Complexe | Naturel |
| Maintenance indépendante | Impossible | Oui |

Un utilisateur peut avoir des rôles Foncier225 (admin, agent_terrain, notaire…) ET des rôles ERP (erp_project_manager, erp_vendor…) simultanément.

---

## Tables créées

| Table | Description |
|-------|-------------|
| `erp_roles` | Rôles ERP (id, name, displayName, description, isSystem, createdAt, updatedAt) |
| `erp_permissions` | Permissions ERP (id, module, action, displayName, description) |
| `erp_role_permissions` | Association rôle ↔ permission (id, roleId, permissionId) |
| `erp_user_roles` | Association utilisateur ↔ rôle ERP (id, userId, roleId, assignedAt, assignedBy) |

---

## Rôles système ERP (9)

| Rôle | Description |
|------|-------------|
| `erp_super_admin` | Accès complet à tous les modules ERP sans restriction |
| `erp_admin` | Administration ERP (gestion utilisateurs, rôles, configuration) |
| `erp_project_manager` | Gestion complète des projets (planification, suivi, validation) |
| `erp_contractor` | Entrepreneur : accès aux projets assignés, rapports d'avancement |
| `erp_vendor` | Fournisseur : gestion des commandes, livraisons et factures |
| `erp_finance_manager` | Gestion financière : budgets, paiements, factures |
| `erp_safety_officer` | Responsable sécurité : inspections, incidents, conformité HSE |
| `erp_inventory_manager` | Gestion des stocks : matériaux, équipements, commandes |
| `erp_viewer` | Consultation uniquement : accès en lecture seule |

---

## Modules ERP (14)

| Module | Description |
|--------|-------------|
| `erp_dashboard` | Tableau de bord ERP |
| `erp_projects` | Gestion des projets de construction |
| `erp_gantt` | Diagramme de Gantt / planification |
| `erp_documents` | Gestion documentaire |
| `erp_compliance` | Conformité réglementaire |
| `erp_equipment` | Gestion des équipements |
| `erp_safety` | Sécurité et HSE |
| `erp_vendors` | Gestion des fournisseurs |
| `erp_contractors` | Gestion des entrepreneurs |
| `erp_inventory` | Gestion des stocks |
| `erp_finance` | Finance et comptabilité |
| `erp_alerts` | Alertes et notifications |
| `erp_profile` | Profil utilisateur ERP |
| `erp_audit_logs` | Journal d'audit ERP |

---

## Actions ERP (12)

| Action | Description |
|--------|-------------|
| `view` | Consulter / voir |
| `create` | Créer |
| `update` | Modifier |
| `delete` | Supprimer |
| `approve` | Approuver / valider |
| `export` | Exporter des données |
| `upload` | Téléverser des fichiers |
| `download` | Télécharger des fichiers |
| `assign` | Assigner à un utilisateur |
| `validate` | Valider techniquement |
| `pay` | Effectuer un paiement |
| `rate` | Évaluer / noter |

---

## Fichiers créés

| Fichier | Rôle |
|---------|------|
| `drizzle/schema.ts` (ajout) | 4 tables ERP ajoutées en fin de fichier |
| `server/erp/erp-rbac.service.ts` | Service RBAC ERP (constantes, helpers, seed) |
| `server/erp/erp-router.ts` | Routeur tRPC ERP (auth, roles, permissions, userRoles) |
| `server/erp/erp-rbac.test.ts` | Tests unitaires ERP RBAC (11 tests) |
| `client/src/hooks/useErpPermissions.ts` | Hook frontend pour vérifier les permissions ERP |
| `client/src/components/ErpLayout.tsx` | Layout ERP avec sidebar filtrée par permissions |
| `client/src/pages/erp/ErpDashboard.tsx` | Dashboard ERP (/erp) |
| `client/src/pages/erp/ErpAdminUsers.tsx` | Admin utilisateurs ERP (/erp/admin/users) |
| `client/src/pages/erp/ErpAdminRoles.tsx` | Admin rôles ERP (/erp/admin/roles) |
| `client/src/pages/erp/ErpAdminPermissions.tsx` | Admin permissions ERP (/erp/admin/permissions) |

---

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `server/_core/trpc.ts` | Ajout middlewares `erpProtectedProcedure` et `erpPermissionProcedure` |
| `server/routers.ts` | Montage du `erpRouter` dans `appRouter` |
| `client/src/App.tsx` | Ajout des routes `/erp/*` avec `ErpLayout` |

---

## Routes API (tRPC)

| Procédure | Protection | Description |
|-----------|-----------|-------------|
| `erp.auth.me` | protectedProcedure | Infos utilisateur ERP + rôles + permissions |
| `erp.roles.list` | erpProtectedProcedure | Liste tous les rôles ERP |
| `erp.roles.create` | erpPermission(erp_audit_logs, create) | Créer un rôle ERP |
| `erp.roles.update` | erpPermission(erp_audit_logs, update) | Modifier un rôle ERP |
| `erp.roles.delete` | erpPermission(erp_audit_logs, delete) | Supprimer un rôle ERP |
| `erp.roles.assignPermissions` | erpPermission(erp_audit_logs, update) | Assigner des permissions à un rôle |
| `erp.permissions.list` | erpProtectedProcedure | Liste toutes les permissions ERP |
| `erp.permissions.byRole` | erpProtectedProcedure | Permissions d'un rôle spécifique |
| `erp.userRoles.list` | erpProtectedProcedure | Liste les utilisateurs avec rôles ERP |
| `erp.userRoles.assign` | erpPermission(erp_audit_logs, create) | Assigner un rôle ERP à un utilisateur |
| `erp.userRoles.remove` | erpPermission(erp_audit_logs, delete) | Retirer un rôle ERP d'un utilisateur |

---

## Écrans frontend

| Route | Page | Description |
|-------|------|-------------|
| `/erp` | ErpDashboard | Tableau de bord avec accès rapide aux modules |
| `/erp/admin/users` | ErpAdminUsers | Gestion des utilisateurs ERP (assigner/retirer rôles) |
| `/erp/admin/roles` | ErpAdminRoles | CRUD des rôles ERP |
| `/erp/admin/permissions` | ErpAdminPermissions | Matrice permissions par rôle (toggle) |

---

## Tests

| Fichier | Tests | Description |
|---------|-------|-------------|
| `server/erp/erp-rbac.test.ts` | 11 | Constantes, rôles, modules, actions, permissions par défaut |
| Tous les fichiers existants | 328 | Non-régression Foncier225 |
| **Total** | **339** | **Tous PASS** |

---

## Migrations

Migration poussée via `pnpm db:push`. Tables créées en base :
- `erp_roles`
- `erp_permissions`
- `erp_role_permissions`
- `erp_user_roles`

Rollback possible via `webdev_rollback_checkpoint` (version `72b7de8e`).

---

## Non-régression

| Vérification | Résultat |
|-------------|----------|
| TypeScript | 0 erreur |
| Tests Vitest | 339/339 PASS |
| Serveur dev | HTTP 200 |
| Modules Foncier225 | Intacts |
| RBAC Foncier225 | Inchangé |

---

## Prochaines étapes (Sprint 2)

1. **Module Projets** — CRUD complet des projets de construction avec statuts
2. **Module Gantt** — Planification avec dépendances et jalons
3. **Module Documents** — Gestion documentaire avec upload S3
4. **Module Finance** — Budgets, factures, paiements
5. **Seed initial** — Exécuter `seedErpRbac()` au premier démarrage
