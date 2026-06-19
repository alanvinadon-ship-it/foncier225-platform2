# Guide des tests

## Vue d'ensemble

L'ERP Construction utilise **Vitest** comme framework de test. La suite de tests couvre les procédures tRPC, les helpers de base de données, les services RBAC et les utilitaires. Les tests sont organisés par sprint et par module fonctionnel.

---

## Chiffres clés

| Métrique | Valeur |
|----------|--------|
| Fichiers de tests | 32 |
| Tests unitaires | 906+ |
| Temps d'exécution | ~5 secondes |
| Couverture modules | 100% des routeurs ERP |

---

## Structure des tests

Les fichiers de tests sont situés dans `server/erp/` et suivent la convention de nommage `erp-*.test.ts` :

| Fichier | Sprint | Couverture |
|---------|--------|-----------|
| `erp-rbac.test.ts` | 3 | Système RBAC (rôles, permissions, affectations) |
| `erp-projects.test.ts` | 4 | Projets, tâches, jalons |
| `erp-documents.test.ts` | 5 | Documents, permis, conformité |
| `erp-equipment.test.ts` | 6 | Équipement, maintenance, sécurité |
| `erp-vendors.test.ts` | 7 | Fournisseurs, sous-traitants |
| `erp-certifications.test.ts` | 8 | Certifications, évaluations |
| `erp-invoices.test.ts` | 9 | Factures, paiements |
| `erp-inventory.test.ts` | 10 | Inventaire, mouvements, stock |
| `erp-material-requests.test.ts` | 11 | Demandes matériaux, dashboard |
| `erp-sprint12.test.ts` | 12 | Supplier Integration, Wastage |
| `erp-sprint13.test.ts` | 13 | Finance, Budget, Cash Flow, Profitability |
| `erp-budget-sync.test.ts` | 13+ | Synchronisation budget automatique |
| `erp-sprint14.test.ts` | 14 | Overrun Alerts, Notifications |
| `erp-sprint15.test.ts` | 15 | Profile, Audit Logs |

---

## Exécution des tests

### Tous les tests

```bash
cd /home/ubuntu/foncier225-platform
pnpm test
```

### Un fichier spécifique

```bash
pnpm test -- --run server/erp/erp-sprint14.test.ts
```

### Tests avec filtre de nom

```bash
pnpm test -- --run -t "budget"
```

### Mode watch (développement)

```bash
pnpm test -- --watch
```

---

## Pattern de test

Les tests ERP suivent un pattern standardisé utilisant `describe` et `it` :

```typescript
import { describe, it, expect } from "vitest";

describe("ERP Module - Feature", () => {
  describe("Procedure name", () => {
    it("should do something specific", () => {
      // Arrange
      const input = { /* ... */ };
      
      // Act
      const result = someFunction(input);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.field).toBe(expectedValue);
    });

    it("should reject invalid input", () => {
      expect(() => someFunction(null)).toThrow();
    });
  });
});
```

### Mocking

Les tests utilisent des mocks pour isoler les couches :

| Couche | Approche |
|--------|----------|
| Base de données | Mocks des fonctions Drizzle |
| Authentification | `ctx.user` simulé |
| Stockage S3 | Mock de `storagePut` |
| Services externes | Stubs |

---

## Catégories de tests

### Tests unitaires

Vérifient le comportement isolé d'une fonction ou procédure. Représentent la majorité des tests.

### Tests de validation

Vérifient que les schémas Zod rejettent correctement les entrées invalides (champs manquants, types incorrects, valeurs hors plage).

### Tests de permissions

Vérifient que les procédures protégées rejettent les appels sans permission adéquate.

### Tests de non-régression

Vérifient que les modifications d'un sprint n'impactent pas les fonctionnalités des sprints précédents. Chaque fichier de test de sprint inclut une section dédiée.

---

## Couverture par domaine

| Domaine | Tests | Aspects couverts |
|---------|-------|-----------------|
| RBAC | ~50 | Création rôles, attribution, vérification permissions |
| Projets | ~80 | CRUD, statuts, filtres, pagination |
| Documents | ~60 | Upload, versionnage, workflow validation |
| Équipement | ~50 | Allocation, maintenance, calendrier |
| Sécurité | ~40 | Incidents, audits, actions correctives |
| Fournisseurs | ~50 | CRUD, contacts, évaluations |
| Finance | ~100 | Budgets, cash flow, rentabilité, sync |
| Inventaire | ~80 | Stock, mouvements, demandes, pertes |
| Alertes | ~50 | Détection 13 types, acquittement |
| Notifications | ~30 | CRUD, unread, markAll |
| Profil | ~30 | Update, password, avatar, préférences |
| Audit | ~30 | Logs, filtres, stats |

---

## Ajout de nouveaux tests

Lors de l'ajout d'une nouvelle fonctionnalité, les tests doivent couvrir :

| Aspect | Description |
|--------|-------------|
| Cas nominal | L'opération réussit avec des données valides |
| Validation | Les entrées invalides sont rejetées |
| Permissions | L'accès sans permission est refusé |
| Edge cases | Limites (pagination 0, montants négatifs, dates passées) |
| Non-régression | Les fonctionnalités existantes ne sont pas impactées |

---

## Intégration continue

Les tests sont exécutés automatiquement lors de chaque checkpoint. Un build ne peut être publié que si tous les tests passent. La commande `pnpm test -- --run` est utilisée en CI pour une exécution non-interactive.
