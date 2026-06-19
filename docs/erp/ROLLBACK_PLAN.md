# Plan de Rollback — ERP Construction Foncier225

## Objectif

Ce document décrit la procédure de rollback en cas de problème critique après déploiement de l'ERP Construction en production.

## Prérequis

Avant tout déploiement, s'assurer que :

1. Un checkpoint stable est sauvegardé (version identifiée)
2. Un backup de la base de données est effectué
3. Les variables d'environnement sont documentées
4. L'équipe est informée de la fenêtre de déploiement

## Niveaux de Rollback

### Niveau 1 — Rollback Code (< 5 minutes)

Utilisé quand le code ERP cause des erreurs mais la base de données est intacte.

| Étape | Action | Commande/Outil |
|-------|--------|----------------|
| 1 | Identifier le checkpoint stable | Management UI → Version History |
| 2 | Effectuer le rollback | Bouton "Rollback" sur le checkpoint cible |
| 3 | Vérifier le démarrage | Vérifier les logs serveur |
| 4 | Tester les endpoints critiques | `curl /api/trpc/auth.me` |

**Checkpoints de référence :**

| Version | Description | Date |
|---------|-------------|------|
| `f6819712` | Sprint 15 — Profile & Audit Logs | Stable |
| `7bde7250` | Sprint 14 — Overrun Alerts & Notifications | Stable |
| `cc5db7a0` | Sprint 13 — Finance, Budget, Cash Flow | Stable |
| `1b05019d` | Sprint 17 — Tests complets (1082 PASS) | Stable |

### Niveau 2 — Rollback Base de Données (< 15 minutes)

Utilisé quand les migrations ERP ont corrompu des données existantes.

| Étape | Action | Détail |
|-------|--------|--------|
| 1 | Stopper l'application | Arrêter le serveur |
| 2 | Restaurer le backup DB | Utiliser le dump SQL pré-déploiement |
| 3 | Rollback code au checkpoint pré-ERP | Version avant Sprint 1 ERP |
| 4 | Redémarrer l'application | Vérifier les logs |
| 5 | Valider les données Foncier225 | Tester login, parcelles, documents |

**Tables ERP à supprimer en cas de rollback total :**

```sql
-- ATTENTION : Exécuter uniquement en cas de rollback total
-- Les tables Foncier225 existantes ne sont PAS touchées

DROP TABLE IF EXISTS erp_user_profiles;
DROP TABLE IF EXISTS erp_notifications;
DROP TABLE IF EXISTS erp_overrun_alerts;
DROP TABLE IF EXISTS erp_profitability_snapshots;
DROP TABLE IF EXISTS erp_cash_flows;
DROP TABLE IF EXISTS erp_budget_lines;
DROP TABLE IF EXISTS erp_budgets;
DROP TABLE IF EXISTS erp_wastage_records;
DROP TABLE IF EXISTS erp_supplier_item_prices;
DROP TABLE IF EXISTS erp_supplier_integrations;
DROP TABLE IF EXISTS erp_material_request_lines;
DROP TABLE IF EXISTS erp_material_requests;
DROP TABLE IF EXISTS erp_stock_levels;
DROP TABLE IF EXISTS erp_inventory_items;
DROP TABLE IF EXISTS erp_payments;
DROP TABLE IF EXISTS erp_invoice_lines;
DROP TABLE IF EXISTS erp_invoices;
DROP TABLE IF EXISTS erp_performance_ratings;
DROP TABLE IF EXISTS erp_certifications;
DROP TABLE IF EXISTS erp_contracts;
DROP TABLE IF EXISTS erp_contractors;
DROP TABLE IF EXISTS erp_vendors;
DROP TABLE IF EXISTS erp_safety_incidents;
DROP TABLE IF EXISTS erp_equipment_allocations;
DROP TABLE IF EXISTS erp_equipment_maintenance;
DROP TABLE IF EXISTS erp_equipment;
DROP TABLE IF EXISTS erp_compliance_checks;
DROP TABLE IF EXISTS erp_compliance_requirements;
DROP TABLE IF EXISTS erp_permits;
DROP TABLE IF EXISTS erp_document_versions;
DROP TABLE IF EXISTS erp_documents;
DROP TABLE IF EXISTS erp_milestones;
DROP TABLE IF EXISTS erp_tasks;
DROP TABLE IF EXISTS erp_projects;
DROP TABLE IF EXISTS erp_dashboard_widgets;
```

### Niveau 3 — Rollback Complet (< 30 minutes)

Utilisé en dernier recours si les niveaux 1 et 2 échouent.

| Étape | Action |
|-------|--------|
| 1 | Restaurer le backup complet (code + DB) |
| 2 | Vérifier la version Node.js et les dépendances |
| 3 | Réinstaller les packages (`pnpm install`) |
| 4 | Redémarrer le serveur |
| 5 | Exécuter la suite de tests complète |
| 6 | Valider manuellement chaque module Foncier225 |

## Critères de Déclenchement

Un rollback doit être déclenché si :

- Le serveur ne démarre pas après déploiement
- Les modules Foncier225 existants sont inaccessibles
- L'authentification OAuth est cassée
- Des données existantes sont corrompues ou manquantes
- Plus de 5 erreurs 500 par minute sur les endpoints critiques
- Le temps de réponse moyen dépasse 5 secondes

## Contacts d'Urgence

| Rôle | Responsabilité |
|------|---------------|
| Admin système | Rollback serveur et DB |
| DBA | Restauration backup base de données |
| Dev lead | Diagnostic code et correctifs |
| Product owner | Décision go/no-go |

## Validation du Rollback

Après tout rollback, exécuter la checklist suivante :

- [ ] Application accessible (HTTP 200 sur `/`)
- [ ] Login OAuth fonctionnel
- [ ] Modules Foncier225 : parcelles, documents, vérification
- [ ] Espace citoyen accessible
- [ ] Administration accessible
- [ ] Aucune erreur critique dans les logs (5 minutes d'observation)

## Test de Rollback Staging

Le rollback a été testé avec succès en staging :

- **Checkpoint source :** `1b05019d` (Sprint 17)
- **Rollback vers :** `7bde7250` (Sprint 14)
- **Résultat :** Application fonctionnelle, données intactes
- **Temps de rollback :** < 2 minutes
- **Retour au checkpoint courant :** Réussi
