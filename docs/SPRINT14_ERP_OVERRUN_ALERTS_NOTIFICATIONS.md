# Sprint 14 — Overrun Alerts & Notifications

## Objectif

Centraliser les alertes ERP et détecter automatiquement les dépassements budgétaires, retards et situations critiques. Fournir un système de notifications temps réel aux utilisateurs ERP.

---

## Tables créées

| Table | Description |
|-------|-------------|
| `erp_overrun_alerts` | Stocke toutes les alertes détectées par le moteur (budget, retard, sécurité, etc.) |
| `erp_notifications` | Notifications individuelles par utilisateur avec statut lu/non-lu |

---

## Types d'alertes (13)

| Type | Priorité | Module |
|------|----------|--------|
| `project_late` | medium → critical | projects |
| `task_late` | medium → high | projects |
| `milestone_overdue` | medium → high | projects |
| `budget_75` | medium | finance |
| `budget_90` | high | finance |
| `budget_100` | critical | finance |
| `budget_overrun` | critical | finance |
| `invoice_overdue` | medium → critical | finance |
| `document_expired` | medium | compliance |
| `certification_expired` | high | compliance |
| `stock_critical` | high → critical | inventory |
| `maintenance_due` | medium → high | equipment |
| `safety_critical` | critical | safety |

---

## API (Procédures tRPC)

### Overrun Alerts (`erp.overrunAlerts.*`)

| Procédure | Type | Description |
|-----------|------|-------------|
| `list` | query | Liste les alertes avec filtres (priorité, module, projet, statut) |
| `check` | mutation | Déclenche le moteur de détection d'alertes |
| `acknowledge` | mutation | Acquitte une alerte |
| `byProject` | query | Alertes d'un projet spécifique |

### Notifications (`erp.notifications.*`)

| Procédure | Type | Description |
|-----------|------|-------------|
| `list` | query | Liste les notifications de l'utilisateur avec filtres |
| `unreadCount` | query | Nombre de notifications non lues |
| `unread` | query | Liste des notifications non lues |
| `markRead` | mutation | Marquer une notification comme lue |
| `markAllRead` | mutation | Marquer toutes les notifications comme lues |

---

## Moteur d'alertes

Le moteur (`runAlertEngine`) exécute 10 vérifications en parallèle :

1. **checkBudgetAlerts** — Seuils 75%, 90%, 100%, dépassement
2. **checkInvoiceAlerts** — Factures échues (escalade selon durée)
3. **checkProjectAlerts** — Projets en retard
4. **checkTaskAlerts** — Tâches en retard
5. **checkMilestoneAlerts** — Jalons dépassés
6. **checkDocumentAlerts** — Documents expirés
7. **checkCertificationAlerts** — Certifications expirées
8. **checkStockAlerts** — Stocks critiques
9. **checkMaintenanceAlerts** — Maintenances proches (7 jours)
10. **checkSafetyAlerts** — Incidents sécurité critiques (<24h)

**Déduplication** : le moteur vérifie l'existence d'alertes similaires avant création.

---

## Écrans et composants

| Écran/Composant | Route/Emplacement | Description |
|-----------------|-------------------|-------------|
| Page Alertes Dépassement | `/erp/finance/overrun-alerts` | Liste, filtres, KPI, bouton vérification |
| Page Notifications | `/erp/notifications` | Centre de notifications avec filtres |
| NotificationBell | Header ERP (toutes pages) | Icône cloche + badge non-lues + panneau déroulant |

---

## Fichiers créés

| Fichier | Description |
|---------|-------------|
| `drizzle/0042_*.sql` | Migration tables alertes et notifications |
| `server/erp/erp-overrun-alerts-router.ts` | Routeur alertes + moteur de détection |
| `server/erp/erp-notifications-router.ts` | Routeur notifications |
| `client/src/pages/erp/ErpOverrunAlerts.tsx` | Page alertes de dépassement |
| `client/src/pages/erp/ErpNotifications.tsx` | Page notifications |
| `client/src/components/erp/NotificationBell.tsx` | Composant cloche notification |
| `server/erp/erp-sprint14.test.ts` | Tests unitaires (57 tests) |

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `drizzle/schema.ts` | Ajout tables `erpOverrunAlerts`, `erpNotifications` |
| `server/erp/erp-router.ts` | Montage routeurs `overrunAlerts`, `notifications` |
| `client/src/components/ErpLayout.tsx` | Liens sidebar + NotificationBell dans header |
| `client/src/App.tsx` | Routes `/erp/finance/overrun-alerts`, `/erp/notifications` |

---

## Tests (57 tests)

- Alerte à 75% du budget
- Alerte à 90%
- Alerte à 100%
- Alerte dépassement confirmé
- Pas d'alerte sous 75%
- Budget zéro (pas de division par zéro)
- Facture échue (détection + escalade priorité)
- Projet/tâche/jalon en retard
- Document/certification expiré(e)
- Stock critique (0 = critical, sinon high)
- Incident sécurité critique (<24h)
- Maintenance proche (7 jours)
- Marquer comme lu / tout marquer comme lu
- Compteur unread
- Filtrage par module / priorité
- Déduplication des alertes
- Acquittement (+ rejet si déjà acquitté)
- Non-régression (13 types, 4 priorités, 7 modules)

---

## Critères d'acceptation

- [x] Les alertes critiques sont générées automatiquement
- [x] Les alertes sont visibles par les utilisateurs avec permission `erp_alerts`
- [x] Le badge notification affiche le nombre non-lu en temps réel (polling 30s)
- [x] Les filtres par priorité et module fonctionnent
- [x] L'acquittement est tracé (utilisateur + timestamp)
- [x] 874 tests PASS, 0 erreur TypeScript
