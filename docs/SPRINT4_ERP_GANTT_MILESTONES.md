# Sprint 4 — ERP Construction : Gantt & Milestones

## Résumé

Ce sprint implémente les modules Gantt et Milestones de l'ERP Construction, permettant la visualisation du planning projet, des tâches, des dépendances et des jalons sur une ligne de temps interactive.

---

## Fonctionnalités implémentées

### Module Gantt (`/erp/projects/:id/gantt`)
- **Timeline interactive** : affichage des tâches sur une ligne de temps avec barres colorées par statut
- **Dépendances visuelles** : lignes SVG reliant les tâches dépendantes (FS, SS, FF, SF)
- **Milestones sur timeline** : losanges positionnés à la date planifiée
- **Détection des retards** : barres rouges pour les tâches en retard
- **Progression globale** : calcul automatique de la moyenne de progression
- **Modification de dates** : formulaire accessible uniquement avec permission `erp_gantt.update`
- **Filtres** : statut, responsable, période

### Module Milestones (`/erp/projects/:id/milestones`)
- **CRUD complet** : créer, modifier, supprimer des jalons
- **Mark as reached** : marquer un jalon comme atteint (détecte automatiquement si en retard → status "delayed")
- **5 statuts** : Planned, Reached, Delayed, Missed, Cancelled
- **4 niveaux d'impact** : Low, Medium, High, Critical
- **Filtrage par statut**
- **Statistiques** : compteurs par statut en haut de page
- **Identification visuelle** : bordures rouges pour les jalons en retard

---

## Architecture

### Table créée

| Table | Description |
|-------|-------------|
| `erp_milestones` | Jalons de projet avec dates planifiées/réalisées, statut et impact |

### Champs `erp_milestones`

| Champ | Type | Description |
|-------|------|-------------|
| id | INT AUTO_INCREMENT | Identifiant unique |
| project_id | INT NOT NULL | Référence au projet |
| name | VARCHAR(255) NOT NULL | Nom du jalon |
| description | TEXT | Description détaillée |
| planned_date | BIGINT NOT NULL | Date planifiée (timestamp ms) |
| actual_date | BIGINT | Date réelle d'atteinte |
| status | ENUM | planned, reached, delayed, missed, cancelled |
| impact_level | ENUM | low, medium, high, critical |
| created_by | INT | Utilisateur créateur |
| created_at | BIGINT NOT NULL | Date de création |
| updated_at | BIGINT NOT NULL | Date de mise à jour |
| deleted_at | BIGINT | Soft delete |

---

## API (Procédures tRPC)

### Milestones

| Procédure | Description |
|-----------|-------------|
| `erp.milestones.listByProject` | Liste les jalons d'un projet (filtrable par statut) |
| `erp.milestones.create` | Crée un nouveau jalon |
| `erp.milestones.update` | Met à jour un jalon |
| `erp.milestones.delete` | Supprime un jalon (soft delete) |
| `erp.milestones.markReached` | Marque un jalon comme atteint (ou delayed si en retard) |

### Gantt

| Procédure | Description |
|-----------|-------------|
| `erp.gantt.getData` | Récupère tâches + dépendances + milestones pour le Gantt |
| `erp.gantt.updateTaskDates` | Modifie les dates d'une tâche (permission requise) |

---

## Permissions

| Rôle | erp_gantt.view | erp_gantt.update |
|------|:-:|:-:|
| Super Admin | ✅ | ✅ |
| Project Manager | ✅ | ✅ |
| Contractor | ✅ | ❌ |
| Viewer | ✅ | ❌ |
| Finance Manager | ❌ | ❌ |

---

## Fichiers créés (6)

| Fichier | Description |
|---------|-------------|
| `drizzle/schema.ts` (ajout) | Table `erp_milestones` |
| `server/erp/erp-milestones-router.ts` | Routeur tRPC Milestones |
| `server/erp/erp-gantt-router.ts` | Routeur tRPC Gantt |
| `server/erp/erp-gantt-milestones.test.ts` | 22 tests unitaires |
| `client/src/pages/erp/ErpProjectGantt.tsx` | Page Gantt interactive |
| `client/src/pages/erp/ErpProjectMilestones.tsx` | Page gestion jalons |

## Fichiers modifiés (2)

| Fichier | Modification |
|---------|-------------|
| `server/erp/erp-router.ts` | Montage des routeurs gantt et milestones |
| `client/src/App.tsx` | Routes `/erp/projects/:id/gantt` et `/erp/projects/:id/milestones` |

---

## Tests

- **22 tests Sprint 4** couvrant :
  - Statuts milestones et niveaux d'impact
  - Permissions Gantt par rôle
  - Détection de retard (milestones et tâches)
  - Calcul de progression globale
  - Timeline bornes min/max
  - Modification de dates avec/sans permission
- **391 tests PASS** au total (non-régression complète)
- **0 erreur TypeScript**

---

## Détection de retard

### Milestones
- Un milestone est **en retard** si : `status === "planned" && plannedDate < Date.now()`
- `markReached` calcule automatiquement : si `actualDate > plannedDate` → status = "delayed", sinon "reached"

### Tâches (Gantt)
- Une tâche est **en retard** si : `dueDate < Date.now() && status !== "completed" && status !== "cancelled"`
- Affichage en rouge sur le Gantt

---

## Non-régression

| Métrique | Valeur |
|----------|--------|
| Tests totaux | 391 PASS |
| Erreurs TypeScript | 0 |
| Modules Foncier225 impactés | 0 |
| Tables existantes modifiées | 0 |
