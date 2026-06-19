# Sprint 7 — ERP Safety Management

## Résumé

Module de gestion de la sécurité sur les chantiers : déclaration et suivi d'incidents, audits de sécurité, actions correctives, et indicateurs KPI.

## Tables DB créées

| Table | Colonnes clés | Description |
|-------|---------------|-------------|
| `erp_safety_incidents` | id, projectId, title, severity, status, location, incidentDate, reportedBy, assignedTo, resolvedAt, closedAt | Incidents de sécurité avec workflow complet |
| `erp_safety_audits` | id, projectId, title, auditType, scheduledAt, completedAt, auditorName, findings, score, status | Audits de sécurité planifiés et réalisés |
| `erp_safety_corrective_actions` | id, incidentId, title, assignedTo, priority, dueDate, completedAt, status | Actions correctives liées aux incidents |

## Statuts et gravités

### Gravité incident

| Valeur | Label | Description |
|--------|-------|-------------|
| low | Faible | Incident mineur sans impact |
| medium | Moyen | Incident nécessitant un suivi |
| high | Élevé | Incident sérieux avec risque |
| critical | Critique | Incident grave — alerte immédiate |

### Statuts incident (workflow)

```
open → under_review → corrective_action → resolved → closed
```

| Statut | Description |
|--------|-------------|
| open | Incident déclaré, en attente de traitement |
| under_review | En cours d'examen par un responsable |
| corrective_action | Actions correctives en cours |
| resolved | Incident résolu (peut être clôturé) |
| closed | Incident clôturé définitivement |

### Types d'audit

general, fire, electrical, structural, environmental, ppe, autre

### Statuts audit

planned, in_progress, completed, cancelled

## Procédures tRPC (API)

| Procédure | Permission | Description |
|-----------|-----------|-------------|
| `erp.safety.listIncidents` | erp_safety.view | Liste incidents avec filtres + pagination |
| `erp.safety.getIncident` | erp_safety.view | Détail incident + actions correctives |
| `erp.safety.createIncident` | erp_safety.create | Déclarer un incident (alerte si critique) |
| `erp.safety.updateIncident` | erp_safety.create | Modifier un incident |
| `erp.safety.deleteIncident` | erp_safety.validate | Supprimer (soft delete) |
| `erp.safety.addCorrectiveAction` | erp_safety.create | Ajouter action corrective (auto-transition statut) |
| `erp.safety.updateCorrectiveAction` | erp_safety.create | Mettre à jour une action corrective |
| `erp.safety.resolveIncident` | erp_safety.validate | Résoudre un incident |
| `erp.safety.closeIncident` | erp_safety.validate | Clôturer (uniquement si résolu) |
| `erp.safety.listAudits` | erp_safety.view | Liste audits avec filtres + pagination |
| `erp.safety.createAudit` | erp_safety.create | Créer un audit sécurité |
| `erp.safety.updateAudit` | erp_safety.create | Modifier un audit |
| `erp.safety.stats` | erp_safety.view | KPI sécurité (incidents, audits, actions) |

## Règles métier

1. **Alerte critique** : la création d'un incident de gravité `critical` génère automatiquement un événement d'audit `erp.safety.critical_alert`
2. **Auto-transition** : l'ajout d'une action corrective à un incident `open` ou `under_review` le passe automatiquement en `corrective_action`
3. **Clôture conditionnelle** : un incident ne peut être clôturé que s'il est en statut `resolved`
4. **Soft delete** : les incidents et audits supprimés sont marqués `deletedAt` et non physiquement supprimés

## RBAC

| Rôle | Permissions Safety |
|------|-------------------|
| erp_safety_officer | view, create, validate |
| erp_project_manager | view (via dashboard) |
| admin (Foncier225) | Toutes permissions implicites |

## Pages frontend

| Route | Description |
|-------|-------------|
| `/erp/safety` | Dashboard sécurité + onglets Incidents/Audits |
| Tab Dashboard | KPI : total incidents, actifs, critiques, audits réalisés, actions correctives |
| Tab Incidents | Liste filtrable + création + détail avec actions correctives + resolve/close |
| Tab Audits | Liste filtrable + création d'audit sécurité |

## Tests

30 tests unitaires couvrant :
- Gravités (4 niveaux)
- Statuts incident (5 statuts)
- Workflow incident (transitions)
- Blocage clôture si non résolu
- Alerte critique
- Types d'audit (7 types)
- Statuts actions correctives (4 statuts)
- Détection retard actions correctives
- Permissions Safety Officer
- Calculs KPI
- Formatage dates

## Fichiers créés

| Fichier | Description |
|---------|-------------|
| `drizzle/schema.ts` | +3 tables (erp_safety_incidents, erp_safety_audits, erp_safety_corrective_actions) |
| `drizzle/0035_tranquil_darkhawk.sql` | Migration SQL |
| `server/erp/erp-safety-router.ts` | Routeur tRPC Safety (13 procédures) |
| `client/src/pages/erp/ErpSafety.tsx` | Page frontend Safety (dashboard + incidents + audits) |
| `server/erp/erp-safety.test.ts` | 30 tests unitaires |
| `docs/SPRINT7_ERP_SAFETY.md` | Cette documentation |

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `server/erp/erp-router.ts` | Import + montage `erpSafetyRouter` |
| `client/src/App.tsx` | Import lazy + route `/erp/safety` |
| `todo.md` | Items Sprint 7 ajoutés |

## Résultats

- **520 tests PASS** (30 nouveaux Safety + 490 existants)
- **0 erreur TypeScript**
- **3 tables DB** créées et opérationnelles
- **13 procédures tRPC** fonctionnelles
- **1 page frontend** avec 3 onglets (Dashboard, Incidents, Audits)
