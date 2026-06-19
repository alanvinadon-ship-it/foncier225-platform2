# Architecture technique

## Vue d'ensemble

L'ERP Construction de Foncier225 suit une architecture **monolithique modulaire** avec séparation client/serveur au sein d'un même dépôt. Le frontend React communique avec le backend Express exclusivement via tRPC, garantissant un typage de bout en bout sans contrat d'API séparé.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                         │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │  Pages  │  │Components│  │  Hooks   │  │  tRPC Client│  │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘  │
│       └─────────────┴─────────────┴───────────────┘          │
└───────────────────────────────┬──────────────────────────────┘
                                │ HTTP (JSON-RPC)
┌───────────────────────────────┴──────────────────────────────┐
│                       SERVEUR (Express)                        │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  OAuth   │  │  tRPC Router │  │   Services & Helpers   │  │
│  │  _core/  │  │  erp-router  │  │  (db, storage, llm)    │  │
│  └──────────┘  └──────┬───────┘  └────────────┬───────────┘  │
│                        │                        │              │
│  ┌─────────────────────┴────────────────────────┴──────────┐  │
│  │              Drizzle ORM (Query Builder)                  │  │
│  └──────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────┬────────────────────────────────┘
                              │ SQL
┌─────────────────────────────┴────────────────────────────────┐
│                    MySQL / TiDB (Cloud)                        │
└───────────────────────────────────────────────────────────────┘
```

---

## Structure du code

```
foncier225-platform/
├── client/
│   ├── src/
│   │   ├── pages/erp/          ← 37 pages ERP
│   │   ├── components/
│   │   │   ├── erp/            ← Composants ERP spécifiques
│   │   │   ├── ui/             ← shadcn/ui
│   │   │   └── ErpLayout.tsx   ← Layout avec sidebar
│   │   ├── lib/trpc.ts         ← Client tRPC
│   │   └── App.tsx             ← Routes
│   └── index.html
├── server/
│   ├── _core/                  ← Infrastructure (OAuth, context, LLM)
│   ├── erp/
│   │   ├── erp-router.ts      ← Routeur principal ERP
│   │   ├── erp-*-router.ts    ← 25 sous-routeurs
│   │   ├── erp-rbac.service.ts← Service RBAC
│   │   ├── erp-budget-sync.ts ← Helper synchronisation budget
│   │   └── erp-*.test.ts      ← Tests par sprint
│   ├── db.ts                   ← Helpers DB
│   ├── routers.ts              ← Routeur racine
│   └── storage.ts              ← Helpers S3
├── drizzle/
│   ├── schema.ts               ← Schéma complet (45 tables ERP)
│   └── 00*.sql                 ← 45 fichiers de migration
├── shared/                     ← Types partagés
└── docs/
    └── erp/                    ← Cette documentation
```

---

## Patterns architecturaux

### Routeur tRPC modulaire

Chaque domaine fonctionnel possède son propre fichier routeur (`erp-*-router.ts`) qui est monté dans le routeur principal `erp-router.ts`. Cette approche permet de maintenir des fichiers de taille raisonnable (~150-300 lignes) tout en conservant un point d'entrée unique.

```typescript
// server/erp/erp-router.ts
export const erpRouter = router({
  auth: erpAuthRouter,
  projects: erpProjectsRouter,
  tasks: erpTasksRouter,
  finance: erpFinanceRouter,
  // ... 25 sous-routeurs au total
});
```

### Procédures protégées

Trois niveaux de protection sont disponibles :

| Procédure | Usage | Vérification |
|-----------|-------|--------------|
| `publicProcedure` | Endpoints publics | Aucune |
| `protectedProcedure` | Utilisateurs connectés | Session JWT valide |
| `erpProtectedProcedure` | Utilisateurs ERP | Session + rôle ERP actif |
| `erpPermissionProcedure` | Actions spécifiques | Session + permission spécifique |

### Système RBAC

Le contrôle d'accès repose sur un modèle **Role-Based Access Control** à trois niveaux :

1. **Rôles** (`erp_roles`) : regroupements logiques de permissions (ex: admin, chef_projet, comptable)
2. **Permissions** (`erp_permissions`) : actions atomiques sur des modules (ex: `erp_finance.create`)
3. **Affectations** (`erp_user_roles`, `erp_role_permissions`) : tables de liaison

### Audit automatique

Toutes les mutations sensibles appellent `createAuditEvent()` pour tracer l'action dans la table `audit_events`. Les actions ERP sont préfixées par `erp.` pour les distinguer des actions système.

### Synchronisation inter-modules

Le helper `syncBudgetFromProject` assure la cohérence entre les modules Invoices/Payments et Budget. Lors de l'approbation d'une facture ou de la création d'un paiement, les montants engagés et payés des lignes budgétaires sont automatiquement recalculés.

---

## Flux de données

### Authentification

1. L'utilisateur clique sur "Se connecter" → redirection vers Manus OAuth
2. Callback OAuth → création/mise à jour utilisateur en DB → cookie JWT signé
3. Chaque requête tRPC → middleware `createContext` → extraction du JWT → `ctx.user`

### Requête tRPC typique

1. Composant React appelle `trpc.erp.projects.list.useQuery({ page: 1 })`
2. TanStack Query envoie une requête HTTP GET vers `/api/trpc/erp.projects.list`
3. Le middleware tRPC vérifie l'authentification et les permissions
4. La procédure exécute la requête Drizzle ORM
5. Le résultat est sérialisé via Superjson (préservation des `Date`)
6. TanStack Query met en cache et fournit les données au composant

### Moteur d'alertes

Le moteur d'alertes (`overrunAlerts.check`) analyse l'état de tous les projets actifs et génère des alertes pour 13 types de situations critiques. Il peut être déclenché manuellement ou via un job planifié.

---

## Conventions de code

| Convention | Détail |
|-----------|--------|
| Nommage tables | `erp_snake_case` (préfixe `erp_`) |
| Nommage routeurs | `erpCamelCaseRouter` |
| Nommage fichiers | `erp-kebab-case-router.ts` |
| Nommage pages | `ErpPascalCase.tsx` |
| Timestamps | Unix milliseconds (BIGINT) |
| Devise | XOF (Franc CFA), stocké en entier |
| Soft delete | Champ `deletedAt` (BIGINT nullable) |
| Pagination | `{ page, limit }` → `{ items, total, page, limit, totalPages }` |

---

## Dépendances clés

| Package | Version | Usage |
|---------|---------|-------|
| `@trpc/server` | 11.x | Routeur API |
| `@trpc/client` | 11.x | Client API |
| `@tanstack/react-query` | 5.x | Cache et état serveur |
| `drizzle-orm` | 0.38.x | ORM et query builder |
| `zod` | 3.x | Validation des entrées |
| `wouter` | 3.x | Routing client |
| `lucide-react` | latest | Icônes |
| `sonner` | latest | Toasts/notifications |
| `vitest` | latest | Tests unitaires |
