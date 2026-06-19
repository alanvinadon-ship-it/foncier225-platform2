# Sprint 11 — Inventory & Material Requests

## Objectif

Gérer les stocks de matériaux de construction, suivre les mouvements d'entrée/sortie, détecter les niveaux critiques et gérer les demandes d'approvisionnement avec workflow d'approbation.

## Tables créées

| Table | Description |
|-------|-------------|
| `erp_stock_locations` | Emplacements de stockage (magasins, entrepôts, chantiers) |
| `erp_inventory_items` | Articles en stock (SKU, catégorie, unité, prix, stock courant, seuil min) |
| `erp_stock_movements` | Mouvements de stock (entrée, sortie, transfert, retour, perte, ajustement) |
| `erp_material_requests` | Demandes de matériel avec workflow d'approbation |
| `erp_material_request_lines` | Lignes de demande (article, quantité demandée/livrée) |

## Routeurs tRPC

### erp.inventory (12 procédures)

| Procédure | Type | Description |
|-----------|------|-------------|
| `listItems` | query | Liste articles avec filtres (catégorie, search, location) + pagination |
| `getItem` | query | Détail article avec mouvements récents |
| `createItem` | mutation | Créer un article (SKU unique, catégorie, unité, prix, stock initial) |
| `updateItem` | mutation | Modifier un article |
| `deleteItem` | mutation | Supprimer un article (soft delete) |
| `listLocations` | query | Liste des emplacements de stockage |
| `createLocation` | mutation | Créer un emplacement |
| `updateLocation` | mutation | Modifier un emplacement |
| `addMovement` | mutation | Enregistrer un mouvement (in/out/transfer/return/loss/adjustment) + mise à jour stock |
| `listMovements` | query | Historique des mouvements avec filtres |
| `criticalStock` | query | Articles en stock critique (≤ seuil minimum) |
| `stats` | query | KPI (total articles, valeur totale, articles critiques, ruptures, mouvements du jour) |

### erp.materialRequests (10 procédures)

| Procédure | Type | Description |
|-----------|------|-------------|
| `list` | query | Liste demandes avec filtres (statut, priorité, projet) + pagination |
| `getById` | query | Détail demande avec lignes enrichies (article + stock courant) |
| `create` | mutation | Créer une demande avec lignes (génère numéro MR-XXXXX) |
| `update` | mutation | Modifier une demande en brouillon |
| `delete` | mutation | Supprimer une demande (draft/rejected/cancelled uniquement) |
| `submit` | mutation | Soumettre pour approbation (vérifie qu'il y a des lignes) |
| `approve` | mutation | Approuver une demande soumise |
| `reject` | mutation | Rejeter avec motif |
| `fulfill` | mutation | Livrer (total ou partiel) — met à jour stock + mouvements automatiques |
| `stats` | query | KPI (total, en attente, approuvées, livrées, rejetées) |

## Pages frontend

| Page | Description |
|------|-------------|
| `/erp/inventory` | Liste articles + filtres + KPI + onglets (Articles, Mouvements, Stock critique, Emplacements) |
| `/erp/material-requests` | Liste demandes + filtres + KPI + onglets (Toutes, En attente) + dialogs CRUD + workflow |

## Workflow Material Requests

```
Draft → Submitted → Approved → Partially Fulfilled → Fulfilled
                  ↘ Rejected
Draft → Cancelled
```

## Logique métier

- **Stock automatique** : chaque mouvement met à jour `currentStock` de l'article
- **Mouvements IN/RETURN** : augmentent le stock
- **Mouvements OUT/TRANSFER/LOSS** : diminuent le stock (bloqué si stock insuffisant)
- **Fulfillment** : crée automatiquement des mouvements OUT et met à jour les lignes
- **Alerte critique** : articles dont `currentStock ≤ minStock`
- **Numérotation** : MR-00001, MR-00002, etc.

## Permissions

Module `inventory` avec actions : `view`, `create`, `edit`, `delete`, `approve`

## Fichiers créés

- `drizzle/schema.ts` (5 tables ajoutées)
- `drizzle/0039_*.sql` (migration)
- `server/erp/erp-inventory-router.ts`
- `server/erp/erp-material-requests-router.ts`
- `server/erp/erp-inventory.test.ts` (47 tests)
- `client/src/pages/erp/ErpInventory.tsx`
- `client/src/pages/erp/ErpMaterialRequests.tsx`
- `docs/SPRINT11_ERP_INVENTORY.md`

## Fichiers modifiés

- `server/erp/erp-router.ts` (montage inventory + materialRequests)
- `client/src/App.tsx` (imports lazy + routes)
- `client/src/components/ErpLayout.tsx` (lien Demandes Matériel dans sidebar)
- `todo.md` (items Sprint 11)

## Tests

- 47 nouveaux tests unitaires
- **716 tests PASS au total, 0 erreur TypeScript**
