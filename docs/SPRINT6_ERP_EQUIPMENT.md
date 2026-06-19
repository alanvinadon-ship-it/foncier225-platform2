# Sprint 6 — ERP Equipment Management

## Résumé

Module complet de gestion des équipements de chantier : suivi du parc matériel, affectation aux projets, planification et historique de maintenance, alertes d'échéance.

## Tables DB créées

| Table | Description | Colonnes clés |
|-------|-------------|---------------|
| `erp_equipment` | Registre du matériel | code, name, category, status, brand, model, serialNumber, purchasePrice, location, nextMaintenanceAt |
| `erp_equipment_allocations` | Historique d'affectation | equipmentId, projectId, allocatedBy, allocatedAt, releasedAt, releasedBy |
| `erp_equipment_maintenance` | Historique de maintenance | equipmentId, type, scheduledAt, completedAt, cost, performedBy, status |

## Statuts équipement

| Statut | Description |
|--------|-------------|
| `available` | Disponible pour affectation |
| `assigned` | Affecté à un projet |
| `in_maintenance` | En cours de maintenance |
| `out_of_service` | Hors service |
| `lost` | Perdu / introuvable |
| `retired` | Retiré du parc (soft delete) |

## API tRPC (12 procédures)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `erp.equipment.list` | query | view | Liste paginée avec filtres (catégorie, statut, recherche) |
| `erp.equipment.getById` | query | view | Fiche détail + allocations + maintenance |
| `erp.equipment.create` | mutation | create | Création d'un équipement |
| `erp.equipment.update` | mutation | update | Modification d'un équipement |
| `erp.equipment.delete` | mutation | update | Suppression logique (soft delete → retired) |
| `erp.equipment.assign` | mutation | assign | Affectation à un projet (vérifie disponibilité) |
| `erp.equipment.release` | mutation | assign | Libération d'un équipement affecté |
| `erp.equipment.listMaintenance` | query | view | Historique maintenance d'un équipement |
| `erp.equipment.addMaintenance` | mutation | update | Planifier une maintenance |
| `erp.equipment.updateMaintenance` | mutation | update | Mettre à jour une maintenance (compléter, annuler) |
| `erp.equipment.upcomingMaintenance` | query | view | Alertes maintenance à venir (N jours) |
| `erp.equipment.stats` | query | view | KPI du parc (total, par statut, maintenances prévues) |

## Pages frontend

| Route | Composant | Description |
|-------|-----------|-------------|
| `/erp/equipment` | `ErpEquipment.tsx` | Liste, filtres, stats, dialogs CRUD/assign/release/maintenance |
| `/erp/equipment/maintenance-calendar` | `ErpMaintenanceCalendar.tsx` | Vue chronologique des maintenances planifiées |

## Règles métier

1. Seuls les équipements en statut `available` peuvent être affectés à un projet.
2. Un équipement `assigned` ne peut pas être supprimé — il doit d'abord être libéré.
3. La complétion d'une maintenance remet automatiquement l'équipement en `available` s'il était `in_maintenance`.
4. Le champ `nextMaintenanceAt` est mis à jour automatiquement lors de l'ajout d'une maintenance.
5. Les alertes détectent les maintenances en retard (scheduledAt < now) et à venir (configurable 7-90 jours).

## Permissions RBAC

Le module `erp_equipment` utilise les actions : `view`, `create`, `update`, `assign`.

| Rôle | Permissions |
|------|-------------|
| Logistics Manager | view, create, update, assign |
| Project Manager | view, assign |
| Site Supervisor | view |
| Finance Manager | view |
| Admin (Foncier225) | Toutes (implicite) |

## Tests (35 tests)

- Statuts équipement (6 statuts)
- Catégories (11 catégories)
- Types de maintenance (6 types)
- Statuts de maintenance (5 statuts)
- Logique d'affectation (blocage si indisponible)
- Logique de libération
- Logique de suppression (blocage si affecté)
- Planification maintenance (détection retard, upcoming)
- Transitions de statut
- Permissions par rôle
- Validation code équipement
- Formatage devise XOF

## Fichiers créés

- `drizzle/schema.ts` (ajout 3 tables)
- `drizzle/0034_parallel_winter_soldier.sql` (migration)
- `server/erp/erp-equipment-router.ts` (routeur tRPC)
- `client/src/pages/erp/ErpEquipment.tsx` (page principale)
- `client/src/pages/erp/ErpMaintenanceCalendar.tsx` (calendrier)
- `server/erp/erp-equipment.test.ts` (tests)
- `docs/SPRINT6_ERP_EQUIPMENT.md` (documentation)

## Fichiers modifiés

- `server/erp/erp-router.ts` (montage routeur equipment)
- `client/src/App.tsx` (routes + lazy imports)

## Résultats

- **490 tests PASS** (35 nouveaux)
- **0 erreur TypeScript**
- Sidebar ERP déjà configurée avec lien "Équipements"
