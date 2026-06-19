# Sprint 10 — ERP Invoices & Payments

## Résumé

Module de gestion des factures et paiements pour l'ERP Construction Foncier225. Permet de créer, soumettre, approuver/rejeter des factures, enregistrer des paiements partiels ou totaux, et suivre les échéances et impayés.

## Tables créées

| Table | Description |
|-------|-------------|
| `erp_invoices` | Factures avec statuts workflow, liens projet/vendor/contractor |
| `erp_invoice_lines` | Lignes de facture avec calculs HT/TVA/TTC |
| `erp_payments` | Paiements avec méthode, référence, montant |

## Statuts facture

| Statut | Description |
|--------|-------------|
| `draft` | Brouillon en cours d'édition |
| `submitted` | Soumise pour approbation |
| `approved` | Approuvée, en attente de paiement |
| `partially_paid` | Partiellement payée |
| `paid` | Intégralement payée |
| `overdue` | En retard de paiement |
| `rejected` | Rejetée avec motif |
| `cancelled` | Annulée |

## Workflow

```
draft → submitted → approved → partially_paid → paid
                  ↘ rejected         ↗
                        overdue ──────┘
```

## Procédures tRPC — Invoices (`erp.invoices.*`)

| Procédure | Description |
|-----------|-------------|
| `list` | Liste paginée avec filtres (status, type, search) |
| `getById` | Détail facture avec lignes et paiements |
| `create` | Créer une facture brouillon |
| `update` | Modifier une facture brouillon |
| `delete` | Supprimer (soft delete, uniquement draft/rejected/cancelled) |
| `addLine` | Ajouter une ligne de facture |
| `updateLine` | Modifier une ligne |
| `deleteLine` | Supprimer une ligne |
| `submit` | Soumettre pour approbation (totalAmount > 0 requis) |
| `approve` | Approuver (permission approve requise) |
| `reject` | Rejeter avec motif |
| `overdue` | Lister les factures en retard |
| `unpaid` | Lister les factures non payées |
| `stats` | KPI (total, montant, payé, dû, en retard) |

## Procédures tRPC — Payments (`erp.payments.*`)

| Procédure | Description |
|-----------|-------------|
| `list` | Liste paginée avec filtres |
| `create` | Enregistrer un paiement (auto-update statut facture) |
| `delete` | Annuler un paiement (recalcul automatique) |
| `stats` | KPI (total, montant, récent, par méthode) |

## Calculs financiers

- **Ligne** : `amount = (quantity/100) × unitPrice` ; `taxAmount = amount × taxRate/10000` ; `totalAmount = amount + taxAmount`
- **Facture** : `subtotal = Σ lines.amount` ; `taxAmount = Σ lines.taxAmount` ; `totalAmount = Σ lines.totalAmount`
- **Solde** : `remaining = totalAmount - paidAmount`
- **Auto-status** : Si `paidAmount >= totalAmount` → `paid` ; Si `0 < paidAmount < totalAmount` → `partially_paid`

## Méthodes de paiement

| Méthode | Libellé |
|---------|---------|
| `virement` | Virement bancaire |
| `cheque` | Chèque |
| `especes` | Espèces |
| `mobile_money` | Mobile Money |
| `carte` | Carte bancaire |

## Pages frontend

| Route | Description |
|-------|-------------|
| `/erp/invoices` | Liste factures + stats + filtres + onglets (Toutes/En retard/Impayées) |
| `/erp/payments` | Historique paiements + stats + filtres par méthode |

## Permissions

Module `erp_finance` avec actions : `view`, `create`, `update`, `delete`, `approve`.

## Fichiers créés

| Fichier | Description |
|---------|-------------|
| `drizzle/schema.ts` | +3 tables (erp_invoices, erp_invoice_lines, erp_payments) |
| `drizzle/0038_*.sql` | Migration SQL |
| `server/erp/erp-invoices-router.ts` | Routeur tRPC Invoices |
| `server/erp/erp-payments-router.ts` | Routeur tRPC Payments |
| `client/src/pages/erp/ErpInvoices.tsx` | Page Factures |
| `client/src/pages/erp/ErpPayments.tsx` | Page Paiements |
| `server/erp/erp-invoices-payments.test.ts` | Tests unitaires |
| `docs/SPRINT10_ERP_INVOICES.md` | Documentation |

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `server/erp/erp-router.ts` | Montage routeurs invoices + payments |
| `client/src/App.tsx` | Routes /erp/invoices et /erp/payments |
| `client/src/components/ErpLayout.tsx` | Liens sidebar Factures + Paiements |

## Tests

- 65 nouveaux tests couvrant : types, statuts, workflow, calculs lignes, totaux, méthodes paiement, auto-status, validation, overdue, format XOF, permissions, contraintes suppression/soumission
- **Total projet : 669 tests PASS, 0 erreur TypeScript**
