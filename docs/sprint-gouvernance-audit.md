# Audit Préalable — Sprint Gouvernance Direction

## Existant réutilisable

| Module | Fichier | Réutilisable |
|--------|---------|-------------|
| Direction Report Exports | `erp_direction_report_exports` table + service PDF | Oui — base pour diffusion |
| Email Service | `server/email-sms.service.ts` (sendEmail, sendSms, dispatchNotification) | Oui — envoi rapports |
| Budget Periods | `erp_budget_periods` (id, fiscalYear, periodNumber, status) | Oui — lien revue→période |
| Notifications | `notifyOwner()` + `dispatchNotification()` | Oui |
| Audit Logs | `createAuditEvent()` | Oui |
| RBAC | `ERP_MODULES` + `ERP_DEFAULT_PERMISSIONS` | Oui — ajouter modules |
| Direction Dashboard Router | 9 endpoints KPI | Oui — base drill-down |
| Overrun Alerts | `erp_overrun_alerts` | Oui — source actions |

## Éléments absents (à créer)

| Fonctionnalité | Tables à créer |
|----------------|---------------|
| Diffusion rapports | `erp_direction_report_schedules`, `erp_direction_report_deliveries` |
| Revue mensuelle | `erp_direction_reviews`, `erp_direction_review_comments` |
| Plans d'actions | `erp_direction_action_plans` |
| Drill-down KPI | Pas de table (API dynamique) |
| Contrôle qualité | `erp_direction_data_quality_checks` |

## Proposition technique

- 5 nouvelles tables MySQL
- 5 nouveaux routeurs tRPC (schedules, reviews, actions, drilldown, dataQuality)
- 5 nouvelles pages UI
- Enrichir le Dashboard Direction (actions ouvertes, KPIs cliquables)
- 4 nouveaux modules RBAC
- Notifications via `dispatchNotification()` + `notifyOwner()`
- Audit logs via `createAuditEvent()`
