# Sprint 12 — Supplier Integration & Wastage Analysis

## Résumé

Ce sprint ajoute deux modules complémentaires à l'ERP Construction :

1. **Intégration Fournisseurs** — Gestion des prix fournisseurs, catalogues, intégrations (API/EDI/Email/Manuel) et comparaison de prix pour optimiser les achats.
2. **Analyse des Gaspillages** — Suivi, déclaration et analyse des pertes matérielles sur les chantiers avec regroupement par cause, projet ou article.

---

## Tables de base de données

| Table | Description |
|-------|-------------|
| `erp_supplier_item_prices` | Prix unitaires par fournisseur et article, avec délai, qté min, statut préféré |
| `erp_supplier_integrations` | Configurations d'intégration fournisseur (type, URL API, fréquence sync, statut) |
| `erp_wastage_records` | Enregistrements de pertes matérielles (quantité, coût, cause, action corrective) |

---

## Routes API (tRPC)

### Routeur `erp.supplierIntegration`

| Procédure | Type | Permission | Description |
|-----------|------|------------|-------------|
| `listPrices` | query | inventory.view | Liste des prix fournisseurs avec filtres |
| `createPrice` | mutation | inventory.create | Créer un prix fournisseur |
| `updatePrice` | mutation | inventory.edit | Modifier un prix fournisseur |
| `deletePrice` | mutation | inventory.delete | Supprimer un prix fournisseur |
| `itemSuppliers` | query | inventory.view | Fournisseurs d'un article |
| `vendorItems` | query | inventory.view | Catalogue d'un fournisseur |
| `compareSuppliers` | query | inventory.view | Comparaison des prix pour un article |
| `setPreferred` | mutation | inventory.edit | Définir un fournisseur préféré |
| `listIntegrations` | query | inventory.view | Liste des intégrations |
| `createIntegration` | mutation | inventory.create | Créer une intégration |
| `sync` | mutation | inventory.edit | Déclencher une synchronisation |

### Routeur `erp.wastage`

| Procédure | Type | Permission | Description |
|-----------|------|------------|-------------|
| `list` | query | inventory.view | Liste des pertes avec filtres |
| `getById` | query | inventory.view | Détail d'une perte |
| `create` | mutation | inventory.create | Déclarer une perte |
| `update` | mutation | inventory.edit | Modifier une perte |
| `delete` | mutation | inventory.delete | Supprimer (soft delete) |
| `analysis` | query | inventory.view | Analyse groupée (par projet/item/cause) |
| `byProject` | query | inventory.view | Pertes d'un projet |
| `stats` | query | inventory.view | KPI globaux + top causes |

---

## Pages Frontend

| Page | Route | Description |
|------|-------|-------------|
| `ErpSupplierIntegration.tsx` | `/erp/supplier-integration` | Dashboard KPI, onglets Prix/Intégrations/Comparaison, dialogs CRUD |
| `ErpWastage.tsx` | `/erp/wastage` | Dashboard KPI, registre filtrable, analyse groupée, dialog déclaration |

---

## Fichiers créés

- `server/erp/erp-supplier-integration-router.ts` — Routeur tRPC Supplier Integration
- `server/erp/erp-wastage-router.ts` — Routeur tRPC Wastage Analysis
- `server/erp/erp-sprint12.test.ts` — 74 tests unitaires
- `client/src/pages/erp/ErpSupplierIntegration.tsx` — Page frontend
- `client/src/pages/erp/ErpWastage.tsx` — Page frontend
- `docs/SPRINT12_ERP_SUPPLIER_WASTAGE.md` — Cette documentation

## Fichiers modifiés

- `drizzle/schema.ts` — 3 tables ajoutées
- `server/erp/erp-router.ts` — Montage des 2 nouveaux routeurs
- `client/src/App.tsx` — Routes et imports lazy ajoutés
- `client/src/components/ErpLayout.tsx` — 2 liens sidebar ajoutés (icônes Link2, Trash2)

---

## Monnaie

Toutes les valeurs monétaires sont en **XOF (Franc CFA)**, formatées avec `Intl.NumberFormat("fr-FR")`.

---

## Permissions

Les deux modules utilisent le module de permission `inventory` avec les actions standard :
- `view` — Consultation
- `create` — Création
- `edit` — Modification
- `delete` — Suppression

---

## Tests

- **74 nouveaux tests** dans `server/erp/erp-sprint12.test.ts`
- **790 tests PASS au total** (non-régression complète)
- **0 erreur TypeScript**

---

## Constantes métier

### Types d'intégration
`api`, `edi`, `email`, `manual`

### Fréquences de synchronisation
`manual`, `daily`, `weekly`, `monthly`

### Causes de gaspillage
`breakage` (Casse), `theft` (Vol), `bad_estimate` (Mauvaise estimation), `order_error` (Erreur de commande), `poor_storage` (Mauvais stockage), `supplier_defect` (Défaut fournisseur), `other` (Autre)

---

## Checkpoint

Sprint 12 livré avec checkpoint `webdev_save_checkpoint`.
