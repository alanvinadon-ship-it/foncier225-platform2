# Sprint 3 — ERP Construction : Projects & Project Management

**Date :** 19 juin 2026  
**Statut :** Terminé  
**Tests :** 369 PASS | 0 erreur TypeScript  
**Non-régression :** Confirmée (tous les modules Foncier225 intacts)

---

## Résumé

Ce sprint implémente le module central de gestion de projets de l'ERP Construction :
- CRUD complet des projets avec statuts, priorités, budgets et progression
- CRUD complet des tâches avec assignation, dépendances et détection de retard
- 6 pages frontend avec navigation intégrée au layout ERP
- Tests unitaires couvrant les workflows, permissions et logique métier

---

## Architecture

```
drizzle/schema.ts          → 3 nouvelles tables (erp_projects, erp_tasks, erp_task_dependencies)
server/erp/
  erp-projects-router.ts   → 8 procédures tRPC (list, create, getById, update, delete, archive, assignManager, summary)
  erp-tasks-router.ts      → 8 procédures tRPC (listByProject, create, getById, update, delete, assign, complete, addDependency)
  erp-projects.test.ts     → 12 tests unitaires
client/src/pages/erp/
  ErpProjectsList.tsx       → Liste projets avec filtres/recherche/pagination
  ErpProjectCreate.tsx      → Formulaire création projet
  ErpProjectDetail.tsx      → Détail projet + résumé + onglets
  ErpProjectEdit.tsx        → Formulaire modification projet
  ErpProjectTasks.tsx       → Gestion tâches d'un projet
  ErpTaskDetail.tsx         → Détail tâche + dépendances
```

---

## Tables créées

| Table | Colonnes clés | Description |
|-------|--------------|-------------|
| `erp_projects` | id, code, name, status, priority, managerId, budget, progress, dates | Projets de construction |
| `erp_tasks` | id, projectId, title, status, priority, assigneeId, progress, dates, hours | Tâches de projet |
| `erp_task_dependencies` | id, taskId, dependsOnTaskId, dependencyType | Dépendances entre tâches |

---

## Statuts de projet

| Statut | Description |
|--------|-------------|
| `draft` | Brouillon, pas encore lancé |
| `planned` | Planifié, en attente de démarrage |
| `active` | En cours d'exécution |
| `on_hold` | Mis en pause |
| `completed` | Terminé avec succès |
| `cancelled` | Annulé |
| `delayed` | En retard sur le planning |

---

## Statuts de tâche

| Statut | Description |
|--------|-------------|
| `todo` | À faire |
| `in_progress` | En cours |
| `blocked` | Bloqué par une dépendance |
| `under_review` | En revue/validation |
| `completed` | Terminé |
| `cancelled` | Annulé |
| `late` | En retard (échéance dépassée) |

---

## Types de dépendances

| Type | Description |
|------|-------------|
| `finish_to_start` | La tâche B ne peut commencer que si A est terminée |
| `start_to_start` | B commence quand A commence |
| `finish_to_finish` | B se termine quand A se termine |
| `start_to_finish` | B se termine quand A commence |

---

## Routes API (tRPC)

### Projects
| Procédure | Description |
|-----------|-------------|
| `erp.projects.list` | Liste paginée avec filtres (status, priority, search) |
| `erp.projects.create` | Création avec code auto-généré PRJ-XXXXXX |
| `erp.projects.getById` | Détail d'un projet avec nom du manager |
| `erp.projects.update` | Modification (statut, budget, progression, etc.) |
| `erp.projects.delete` | Suppression logique (soft delete) |
| `erp.projects.archive` | Archivage (passage en statut completed) |
| `erp.projects.assignManager` | Affectation d'un chef de projet |
| `erp.projects.summary` | Résumé (tâches total/completed/late) |

### Tasks
| Procédure | Description |
|-----------|-------------|
| `erp.tasks.listByProject` | Liste des tâches d'un projet avec filtres |
| `erp.tasks.create` | Création d'une tâche |
| `erp.tasks.getById` | Détail avec dépendances |
| `erp.tasks.update` | Modification |
| `erp.tasks.delete` | Suppression logique |
| `erp.tasks.assign` | Assignation à un utilisateur |
| `erp.tasks.complete` | Marquage comme terminé (100%) |
| `erp.tasks.addDependency` | Ajout d'une dépendance |

---

## Pages frontend

| Route | Description |
|-------|-------------|
| `/erp/projects` | Liste des projets avec cartes, filtres, recherche, pagination |
| `/erp/projects/create` | Formulaire de création de projet |
| `/erp/projects/:id` | Détail projet avec résumé, progression, onglets |
| `/erp/projects/:id/edit` | Formulaire de modification |
| `/erp/projects/:id/tasks` | Gestion des tâches du projet |
| `/erp/tasks/:id` | Détail d'une tâche avec dépendances |

---

## Fichiers créés (8)

| Fichier | Type |
|---------|------|
| `server/erp/erp-projects-router.ts` | Backend |
| `server/erp/erp-tasks-router.ts` | Backend |
| `server/erp/erp-projects.test.ts` | Tests |
| `client/src/pages/erp/ErpProjectsList.tsx` | Frontend |
| `client/src/pages/erp/ErpProjectCreate.tsx` | Frontend |
| `client/src/pages/erp/ErpProjectDetail.tsx` | Frontend |
| `client/src/pages/erp/ErpProjectEdit.tsx` | Frontend |
| `client/src/pages/erp/ErpProjectTasks.tsx` | Frontend |
| `client/src/pages/erp/ErpTaskDetail.tsx` | Frontend |

## Fichiers modifiés (3)

| Fichier | Modification |
|---------|-------------|
| `drizzle/schema.ts` | +3 tables (erp_projects, erp_tasks, erp_task_dependencies) |
| `server/erp/erp-router.ts` | +2 sous-routeurs montés (projects, tasks) |
| `client/src/App.tsx` | +6 routes ERP projects/tasks |

---

## Permissions requises

| Action | Permission |
|--------|-----------|
| Voir les projets | `erp_projects.view` |
| Créer un projet | `erp_projects.create` |
| Modifier un projet | `erp_projects.edit` |
| Supprimer un projet | `erp_projects.delete` |

---

## Prochains sprints suggérés

- **Sprint 4** : Module Finance (budgets, factures, paiements)
- **Sprint 5** : Module Documents & Compliance (GED, permis, certifications)
- **Sprint 6** : Module Equipment & Inventory (matériel, stocks)
- **Sprint 7** : Module Safety (incidents, inspections, formations)
- **Sprint 8** : Gantt Chart interactif
