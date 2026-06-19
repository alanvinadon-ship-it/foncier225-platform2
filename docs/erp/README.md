# ERP Construction — Documentation

## Présentation

L'ERP Construction de Foncier225 est un système intégré de gestion de projets de construction, couvrant l'ensemble du cycle de vie d'un projet : planification, exécution, suivi financier, conformité réglementaire et clôture. Il est conçu pour les entreprises de BTP opérant en Côte d'Ivoire et dans la sous-région ouest-africaine.

Le système gère **45 tables** dédiées, expose **25 routeurs tRPC** et propose **37 écrans** accessibles depuis une interface unifiée avec sidebar de navigation.

---

## Sommaire de la documentation

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | Architecture technique, stack, patterns et structure du code |
| [Schéma de base de données](./database-schema.md) | Toutes les tables ERP, leurs colonnes et relations |
| [Migrations](./migrations.md) | Guide des migrations, conventions et procédures |
| [Référence API](./api.md) | Toutes les procédures tRPC par module |
| [Rôles et Permissions](./roles-permissions.md) | Système RBAC, rôles prédéfinis et matrice de permissions |
| [Guide Utilisateur](./user-guide.md) | Manuel d'utilisation pour les opérateurs terrain |
| [Guide Administrateur](./admin-guide.md) | Configuration, gestion des utilisateurs et maintenance |
| [Tests](./testing.md) | Stratégie de test, exécution et couverture |
| [Déploiement](./deployment.md) | Procédure de mise en production et configuration |

---

## Modules ERP

L'ERP est organisé en **29 modules fonctionnels** regroupés en 7 domaines :

### Gestion de projets

| Module | Description | Route |
|--------|-------------|-------|
| Dashboard | Tableau de bord central avec KPI | `/erp` |
| Projects | Gestion des projets de construction | `/erp/projects` |
| Tasks | Gestion des tâches par projet | `/erp/projects/:id/tasks` |
| Gantt | Diagramme de Gantt interactif | `/erp/projects/:id/gantt` |
| Milestones | Jalons et livrables | `/erp/projects/:id/milestones` |

### Documents et conformité

| Module | Description | Route |
|--------|-------------|-------|
| Documents | GED (Gestion Électronique de Documents) | `/erp/documents` |
| Permits | Permis de construire et autorisations | `/erp/permits` |
| Compliance | Exigences réglementaires et contrôles | `/erp/compliance` |
| Certifications | Certifications des intervenants | `/erp/certifications` |

### Ressources et équipements

| Module | Description | Route |
|--------|-------------|-------|
| Equipment | Parc matériel et allocations | `/erp/equipment` |
| Safety | Incidents, audits et actions correctives | `/erp/safety` |
| Maintenance | Calendrier de maintenance préventive | `/erp/equipment/maintenance-calendar` |

### Intervenants externes

| Module | Description | Route |
|--------|-------------|-------|
| Vendors | Fournisseurs et contacts | `/erp/vendors` |
| Contractors | Sous-traitants et contrats | `/erp/contractors` |
| Performance Rating | Évaluation des prestataires | `/erp/performance-ratings` |
| Supplier Integration | Prix fournisseurs et comparaison | `/erp/supplier-integration` |

### Finance et comptabilité

| Module | Description | Route |
|--------|-------------|-------|
| Invoices | Facturation clients et fournisseurs | `/erp/invoices` |
| Payments | Suivi des paiements | `/erp/payments` |
| Budget | Budgets par projet et lignes budgétaires | `/erp/finance/budgets` |
| Cash Flow | Flux de trésorerie | `/erp/finance/cash-flow` |
| Profitability | Rentabilité par projet | `/erp/finance/profitability` |

### Inventaire et approvisionnement

| Module | Description | Route |
|--------|-------------|-------|
| Inventory | Stock, emplacements et mouvements | `/erp/inventory` |
| Material Requests | Demandes de matériaux | `/erp/material-requests` |
| Wastage Analysis | Analyse des pertes et gaspillages | `/erp/wastage` |

### Système et administration

| Module | Description | Route |
|--------|-------------|-------|
| Overrun Alerts | Alertes de dépassement automatiques | `/erp/finance/overrun-alerts` |
| Notifications | Centre de notifications | `/erp/notifications` |
| Profile | Gestion du profil utilisateur | `/erp/profile` |
| Audit Logs | Journal d'audit des actions | `/erp/audit-logs` |
| Admin | Gestion des rôles, permissions, utilisateurs | `/erp/admin/*` |

---

## Chiffres clés

| Métrique | Valeur |
|----------|--------|
| Tables de base de données | 45 |
| Routeurs tRPC | 25 |
| Procédures API | ~180 |
| Pages frontend | 37 |
| Fichiers de tests | 32 |
| Tests unitaires | 906+ |
| Sprints livrés | 16 |
| Migrations SQL | 45 |

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui |
| Routing client | Wouter |
| État serveur | tRPC 11 + TanStack Query |
| Backend | Express 4, tRPC |
| Base de données | MySQL (TiDB) via Drizzle ORM |
| Authentification | Manus OAuth + JWT |
| Stockage fichiers | S3 |
| Tests | Vitest |
| Langage | TypeScript (strict) |

---

## Démarrage rapide

```bash
# Cloner le projet
git clone <repository-url>
cd foncier225-platform

# Installer les dépendances
pnpm install

# Pousser le schéma DB
pnpm db:push

# Lancer le serveur de développement
pnpm dev

# Exécuter les tests
pnpm test
```

L'ERP est accessible à l'adresse `/erp` après connexion via Manus OAuth.
