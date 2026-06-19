# Guide des migrations

## Vue d'ensemble

Les migrations de l'ERP Construction sont gérées par **Drizzle ORM** et stockées sous forme de fichiers SQL dans le dossier `drizzle/`. Chaque modification du schéma génère un fichier de migration numéroté séquentiellement.

---

## Structure des fichiers

```
drizzle/
├── schema.ts              ← Schéma source (45 tables ERP)
├── 0001_*.sql             ← Migration initiale
├── 0002_*.sql             ← Ajout tables ERP RBAC
├── ...
├── 0043_*.sql             ← Sprint 15 (erp_user_profiles)
└── meta/
    └── _journal.json      ← Journal des migrations appliquées
```

Le projet compte actuellement **45 fichiers de migration** couvrant les sprints 1 à 15.

---

## Commandes

| Commande | Description |
|----------|-------------|
| `pnpm db:push` | Génère et applique les migrations (drizzle-kit generate + migrate) |
| `npx drizzle-kit generate` | Génère les fichiers SQL sans les appliquer |
| `npx drizzle-kit migrate` | Applique les migrations en attente |

---

## Procédure pour ajouter une table

La procédure standard pour ajouter une nouvelle table au schéma ERP est la suivante :

1. **Modifier le schéma** : Ajouter la définition de la table dans `drizzle/schema.ts` en respectant les conventions (préfixe `erp_`, timestamps en BIGINT, etc.).

2. **Générer la migration** : Exécuter `npx drizzle-kit generate` pour produire le fichier SQL correspondant.

3. **Vérifier la migration** : Lire le fichier SQL généré pour confirmer qu'il correspond aux modifications attendues.

4. **Appliquer la migration** : Exécuter `npx drizzle-kit migrate` ou appliquer manuellement le SQL via la console DB.

5. **Vérifier en base** : Confirmer que la table existe avec les colonnes et index attendus.

---

## Conventions de nommage

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Table | `erp_snake_case` | `erp_budget_lines` |
| Colonne | `camelCase` | `projectId`, `createdAt` |
| Index | `<table>_<colonne>_idx` | `erp_tasks_project_id_idx` |
| FK | `<table>_<colonne>_<ref_table>_fk` | `erp_tasks_project_id_erp_projects_fk` |
| Enum | Valeurs en `snake_case` | `in_progress`, `bank_transfer` |

---

## Historique des migrations par sprint

| Sprint | Migrations | Tables ajoutées |
|--------|-----------|-----------------|
| 1-2 | 0001-0010 | users, audit_events, tables système |
| 3 | 0011-0015 | erp_roles, erp_permissions, erp_projects, erp_tasks |
| 4 | 0016-0020 | erp_documents, erp_permits, erp_compliance |
| 5 | 0021-0025 | erp_equipment, erp_safety, erp_milestones |
| 6 | 0026-0028 | erp_vendors, erp_contractors, erp_contracts |
| 7 | 0029-0031 | erp_certifications, erp_performance_ratings |
| 8 | 0032-0034 | erp_invoices, erp_payments |
| 9 | 0035-0036 | erp_stock_locations, erp_inventory_items, erp_stock_movements |
| 10 | 0037-0038 | erp_material_requests, erp_material_request_lines |
| 11 | 0039 | erp_dashboard_widgets |
| 12 | 0040 | erp_supplier_item_prices, erp_supplier_integrations, erp_wastage_records |
| 13 | 0041 | erp_budgets, erp_budget_lines, erp_cash_flows, erp_profitability_snapshots |
| 14 | 0042 | erp_overrun_alerts, erp_notifications |
| 15 | 0043 | erp_user_profiles |

---

## Réversibilité

Drizzle ORM ne génère pas automatiquement de migrations inverses (down). Pour annuler une migration, il faut créer manuellement un fichier SQL contenant les instructions `DROP TABLE` ou `ALTER TABLE DROP COLUMN` correspondantes.

> **Attention** : Ne jamais supprimer une table contenant des données en production sans sauvegarde préalable. Utiliser le soft delete (`deletedAt`) plutôt que la suppression physique.

---

## Résolution de problèmes

**Migration bloquée (interactive prompt)** : Si `drizzle-kit push` demande une confirmation interactive, utiliser `drizzle-kit generate` suivi de `drizzle-kit migrate` séparément, ou appliquer le SQL manuellement via la console DB.

**Table déjà existante** : Si une migration échoue car la table existe déjà, vérifier le journal `meta/_journal.json` et marquer la migration comme appliquée, ou utiliser `IF NOT EXISTS` dans le SQL.

**Conflit de schéma** : En cas de divergence entre le schéma Drizzle et la base réelle, utiliser `drizzle-kit introspect` pour générer un schéma à partir de la base existante et comparer.
