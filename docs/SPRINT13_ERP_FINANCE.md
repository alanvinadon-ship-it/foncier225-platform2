# Sprint 13 — ERP Finance : Budget, Cash Flow, Profitability

## Résumé

Le Sprint 13 ajoute le module **Finance** complet à l'ERP Construction Foncier225. Il couvre la gestion budgétaire par projet, le suivi de trésorerie (entrées/sorties), les prévisions de cash-flow et l'analyse de rentabilité par projet.

## Modules implémentés

### 1. Budget Management
- Création de budgets par projet avec workflow d'approbation (draft → submitted → approved/rejected → revised)
- Lignes budgétaires par catégorie (main d'œuvre, matériaux, équipement, sous-traitance, permis, transport, autres)
- Calcul automatique des totaux (initial, révisé, engagé, payé)
- Analyse de variance budgétaire (prévu vs réalisé)

### 2. Cash Flow Tracking
- Enregistrement des flux financiers (entrées/sorties)
- 10 catégories de flux incluant paiements clients, avances et retenues
- Résumé avec solde réel (payé) et tensions de trésorerie (en attente)
- Prévisions à 30 jours basées sur les échéances

### 3. Profitability Analysis
- Snapshots de rentabilité par projet (recalcul à la demande)
- Distinction coûts directs (main d'œuvre, matériaux, équipement, sous-traitance) vs indirects
- Marge brute et marge nette en valeur absolue et pourcentage
- Classement des projets par rentabilité nette

## Tables DB créées

| Table | Description |
|-------|-------------|
| `erp_budgets` | Budgets par projet avec statut et totaux |
| `erp_budget_lines` | Lignes budgétaires détaillées par catégorie |
| `erp_cash_flows` | Flux de trésorerie (entrées/sorties) |
| `erp_profitability_snapshots` | Snapshots de rentabilité par projet |

## Procédures tRPC

### Budget (`erp.finance.budgets.*`)
| Procédure | Type | Description |
|-----------|------|-------------|
| `list` | query | Liste des budgets avec filtres |
| `create` | mutation | Créer un budget |
| `getById` | query | Détail d'un budget avec ses lignes |
| `update` | mutation | Modifier un budget |
| `approve` | mutation | Approuver un budget soumis |
| `byProject` | query | Budgets d'un projet |
| `variance` | query | Analyse de variance budgétaire |
| `addLine` | mutation | Ajouter une ligne budgétaire |
| `updateLine` | mutation | Modifier une ligne budgétaire |

### Cash Flow (`erp.finance.cashFlow.*`)
| Procédure | Type | Description |
|-----------|------|-------------|
| `list` | query | Liste des flux avec filtres |
| `create` | mutation | Enregistrer un flux |
| `summary` | query | Résumé (entrées, sorties, net, solde) |
| `byProject` | query | Flux d'un projet |
| `forecast` | query | Prévisions à N jours |

### Profitability (`erp.finance.profitability.*`)
| Procédure | Type | Description |
|-----------|------|-------------|
| `list` | query | Liste des snapshots |
| `byProject` | query | Rentabilité d'un projet + historique |
| `recalculate` | mutation | Recalculer la rentabilité |
| `ranking` | query | Classement par rentabilité |

## Pages Frontend

| Route | Page | Description |
|-------|------|-------------|
| `/erp/finance/budgets` | ErpFinanceBudgets | Gestion des budgets, lignes, approbation |
| `/erp/finance/cash-flow` | ErpFinanceCashFlow | Registre des flux, KPI, prévisions |
| `/erp/finance/profitability` | ErpFinanceProfitability | Analyse rentabilité, classement |

## Fichiers créés

- `drizzle/0041_slippery_ikaris.sql` — Migration DB
- `server/erp/erp-finance-router.ts` — Routeur tRPC Finance
- `client/src/pages/erp/ErpFinanceBudgets.tsx` — Page budgets
- `client/src/pages/erp/ErpFinanceCashFlow.tsx` — Page trésorerie
- `client/src/pages/erp/ErpFinanceProfitability.tsx` — Page rentabilité
- `server/erp/erp-sprint13.test.ts` — Tests unitaires (27 tests)
- `docs/SPRINT13_ERP_FINANCE.md` — Documentation

## Fichiers modifiés

- `drizzle/schema.ts` — Ajout des 4 tables Finance
- `server/erp/erp-router.ts` — Montage du routeur Finance
- `client/src/components/ErpLayout.tsx` — Liens sidebar Finance
- `client/src/App.tsx` — Routes Finance

## Permissions requises

| Module | Action | Accès |
|--------|--------|-------|
| `finance` | `view` | Consultation budgets, cash-flow, rentabilité |
| `finance` | `create` | Création budgets, lignes, flux |
| `finance` | `edit` | Modification budgets, recalcul rentabilité |
| `finance` | `approve` | Approbation des budgets |

## Tests

- **29 fichiers de test** passent (817 tests PASS total)
- **27 nouveaux tests** dans `erp-sprint13.test.ts`
- **0 erreur TypeScript**
