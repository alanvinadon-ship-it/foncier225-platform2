# Sprint 9 — Performance Rating

## Résumé

Module d'évaluation des fournisseurs et sous-traitants selon 6 critères mesurables, avec classement et mise à jour automatique du rating global.

## Table créée

| Table | Description |
|-------|-------------|
| `erp_performance_ratings` | Évaluations multi-critères (qualité, délai, coût, sécurité, conformité, communication) |

## Routeur tRPC — erp.ratings

| Procédure | Description |
|-----------|-------------|
| `list` | Liste avec filtres (rateableType, rateableId, projectId) + pagination |
| `create` | Création évaluation + calcul overallScore + mise à jour rating entité |
| `update` | Modification scores + recalcul automatique |
| `delete` | Suppression + recalcul rating entité |
| `forEntity` | Historique évaluations d'un vendor/contractor + moyennes par critère |
| `top` | Classement des meilleurs partenaires (par score moyen DESC) |
| `low` | Classement des partenaires à améliorer (par score moyen ASC) |
| `stats` | KPI globaux (total, moyennes, nombre d'entités évaluées) |

## Critères de notation

Chaque critère est noté de 1 à 5 (entier) :

| Critère | Champ DB |
|---------|----------|
| Qualité | `quality_score` |
| Délai | `delay_score` |
| Coût | `cost_score` |
| Sécurité | `safety_score` |
| Conformité | `compliance_score` |
| Communication | `communication_score` |

Le **score global** (`overall_score`) est calculé automatiquement : `round(average * 100)` pour conserver la précision.

## Logique métier

1. **Création** : calcul automatique du `overallScore`, mise à jour du champ `rating` (1-5) sur l'entité vendor/contractor
2. **Modification** : recalcul du `overallScore` avec les nouveaux scores
3. **Suppression** : recalcul de la moyenne de l'entité
4. **Classement** : agrégation par entité avec enrichissement du nom

## Page frontend

| Route | Description |
|-------|-------------|
| `/erp/performance-ratings` | Dashboard KPI + onglets (Meilleurs, À améliorer, Historique) + formulaire notation |

## Fichiers créés/modifiés

```
drizzle/schema.ts                       (modifié — 1 table ajoutée)
drizzle/0037_fancy_vertigo.sql          (nouveau — migration)
server/erp/erp-ratings-router.ts        (nouveau)
server/erp/erp-router.ts                (modifié — routeur monté)
client/src/pages/erp/ErpRatings.tsx     (nouveau)
client/src/components/ErpLayout.tsx     (modifié — lien Performance)
client/src/App.tsx                      (modifié — route + import)
server/erp/erp-ratings.test.ts          (nouveau)
docs/SPRINT9_ERP_RATINGS.md            (nouveau)
```

## Tests

- 32 nouveaux tests couvrant types, validation scores, calcul overallScore, moyenne, classement, permissions, formatage
- **Total : 604 tests PASS, 0 erreur TypeScript**

## Permissions RBAC

| Action | Permission requise |
|--------|-------------------|
| Consulter (list, forEntity, top, low, stats) | `erp_vendors.view` |
| Créer/Modifier (create, update) | `erp_vendors.rate` |
| Supprimer (delete) | `erp_vendors.delete` |
