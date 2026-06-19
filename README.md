# Foncier225 — Plateforme Foncière Nationale

## Présentation

Foncier225 est la plateforme foncière nationale de Côte d'Ivoire, intégrant un registre foncier numérique, un système de vérification de documents et un **ERP Construction** complet pour la gestion des projets de BTP.

---

## Fonctionnalités principales

| Module | Description |
|--------|-------------|
| **Registre Foncier** | Consultation du statut des parcelles, vérification d'authenticité |
| **Espace Citoyen** | Suivi des dossiers fonciers personnels |
| **ERP Construction** | Gestion complète des projets de construction (29 modules) |

---

## ERP Construction

L'ERP Construction couvre l'ensemble du cycle de vie d'un projet de BTP :

- **Gestion de projets** : Projets, tâches, Gantt, jalons
- **Documents et conformité** : GED, permis, conformité, certifications
- **Ressources** : Équipement, maintenance, sécurité
- **Intervenants** : Fournisseurs, sous-traitants, évaluations
- **Finance** : Factures, paiements, budgets, trésorerie, rentabilité
- **Inventaire** : Stock, demandes matériaux, pertes
- **Système** : Alertes, notifications, profil, audit

Pour la documentation complète de l'ERP, consultez [docs/erp/README.md](./docs/erp/README.md).

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui |
| Backend | Express 4, tRPC 11 |
| Base de données | MySQL (TiDB) via Drizzle ORM |
| Authentification | Manus OAuth + JWT |
| Stockage | S3 |
| Tests | Vitest (906+ tests) |

---

## Démarrage rapide

```bash
# Installer les dépendances
pnpm install

# Appliquer les migrations
pnpm db:push

# Lancer le serveur de développement
pnpm dev

# Exécuter les tests
pnpm test
```

---

## Structure du projet

```
foncier225-platform/
├── client/src/           ← Frontend React
│   ├── pages/erp/        ← 37 pages ERP
│   ├── components/       ← Composants réutilisables
│   └── App.tsx           ← Routes
├── server/erp/           ← Backend ERP (25 routeurs)
├── drizzle/              ← Schéma DB et migrations (45 tables)
├── docs/erp/             ← Documentation complète
└── shared/               ← Types partagés
```

---

## Documentation

| Document | Lien |
|----------|------|
| Index ERP | [docs/erp/README.md](./docs/erp/README.md) |
| Architecture | [docs/erp/architecture.md](./docs/erp/architecture.md) |
| Schéma DB | [docs/erp/database-schema.md](./docs/erp/database-schema.md) |
| Référence API | [docs/erp/api.md](./docs/erp/api.md) |
| Rôles et Permissions | [docs/erp/roles-permissions.md](./docs/erp/roles-permissions.md) |
| Guide Utilisateur | [docs/erp/user-guide.md](./docs/erp/user-guide.md) |
| Guide Administrateur | [docs/erp/admin-guide.md](./docs/erp/admin-guide.md) |
| Tests | [docs/erp/testing.md](./docs/erp/testing.md) |
| Déploiement | [docs/erp/deployment.md](./docs/erp/deployment.md) |
| Migrations | [docs/erp/migrations.md](./docs/erp/migrations.md) |

---

## Licence

Propriétaire — Tous droits réservés.
