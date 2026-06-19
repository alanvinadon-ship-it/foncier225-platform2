# Sprint 8 — Vendors, Contractors & Certifications

## Résumé

Module de gestion des fournisseurs, sous-traitants, contrats et certifications pour l'ERP Construction Foncier225.

## Tables créées

| Table | Description |
|-------|-------------|
| `erp_vendors` | Fournisseurs (nom, catégorie, statut, contact, rating) |
| `erp_vendor_contacts` | Contacts des fournisseurs (nom, rôle, email, téléphone, isPrimary) |
| `erp_contractors` | Sous-traitants (nom, spécialité, licence, statut, rating) |
| `erp_project_contractors` | Affectations sous-traitants ↔ projets (rôle, dates) |
| `erp_contracts` | Contrats (titre, référence, montant, dates, statut) |
| `erp_certifications` | Certifications polymorphes (vendor/contractor/equipment/user) |

## Routeurs tRPC

### erp.vendors
| Procédure | Description |
|-----------|-------------|
| `list` | Liste avec filtres (search, category, status) + pagination |
| `getById` | Détail fournisseur + contacts |
| `create` | Création fournisseur |
| `update` | Modification fournisseur |
| `delete` | Suppression soft |
| `updateStatus` | Changement de statut (active/inactive/suspended/blacklisted) |
| `addContact` | Ajout d'un contact |
| `updateContact` | Modification d'un contact |
| `deleteContact` | Suppression d'un contact |
| `rate` | Noter un fournisseur (1-5) |

### erp.contractors
| Procédure | Description |
|-----------|-------------|
| `list` | Liste avec filtres (search, specialty, status) + pagination |
| `getById` | Détail sous-traitant + affectations + contrats |
| `create` | Création sous-traitant |
| `update` | Modification sous-traitant |
| `delete` | Suppression soft (bloquée si affectation active) |
| `updateStatus` | Changement de statut |
| `assignToProject` | Affecter à un projet (bloqué si non actif) |
| `releaseFromProject` | Libérer d'un projet |
| `createContract` | Créer un contrat |
| `updateContract` | Modifier un contrat |
| `listContracts` | Liste des contrats avec filtres |

### erp.certifications
| Procédure | Description |
|-----------|-------------|
| `list` | Liste avec filtres (entityType, status) + pagination |
| `getById` | Détail certification |
| `create` | Création certification |
| `update` | Modification certification |
| `delete` | Suppression soft |
| `renew` | Renouvellement (nouvelle date + statut active) |
| `expired` | Liste des certifications expirées |
| `upcomingExpirations` | Certifications expirant dans N jours |

## Statuts

### Fournisseurs & Sous-traitants
- **active** : Opérationnel, peut être utilisé
- **inactive** : Désactivé temporairement
- **suspended** : Suspendu (problème qualité/paiement)
- **blacklisted** : Bloqué définitivement
- **pending_approval** : En attente de validation

### Contrats
- **draft** : Brouillon
- **active** : En cours
- **completed** : Terminé
- **terminated** : Résilié
- **expired** : Expiré

### Certifications
- **active** : Valide
- **expired** : Expirée
- **revoked** : Révoquée
- **pending_renewal** : En cours de renouvellement

## Pages frontend

| Route | Description |
|-------|-------------|
| `/erp/vendors` | Liste fournisseurs + création + détail + contacts |
| `/erp/contractors` | Liste sous-traitants + contrats + affectation projets |
| `/erp/certifications` | Toutes certifications + expirées + alertes + renouvellement |

## Fichiers créés

```
drizzle/schema.ts                          (modifié — 6 tables ajoutées)
server/erp/erp-vendors-router.ts           (nouveau)
server/erp/erp-contractors-router.ts       (nouveau)
server/erp/erp-certifications-router.ts    (nouveau)
server/erp/erp-router.ts                   (modifié — 3 routeurs montés)
client/src/pages/erp/ErpVendors.tsx        (nouveau)
client/src/pages/erp/ErpContractors.tsx    (nouveau)
client/src/pages/erp/ErpCertifications.tsx (nouveau)
client/src/components/ErpLayout.tsx        (modifié — lien Certifications)
client/src/App.tsx                         (modifié — 3 routes + imports)
server/erp/erp-vendors-contractors-certifications.test.ts (nouveau)
docs/SPRINT8_ERP_VENDORS.md               (nouveau)
```

## Tests

- 52 nouveaux tests couvrant vendors, contractors, contrats, certifications, permissions
- **Total : 572 tests PASS, 0 erreur TypeScript**

## Permissions RBAC

Le module utilise les modules existants `erp_vendors` et `erp_contractors` du service RBAC :
- **project_manager** : view, create, update, assign sur vendors et contractors
- **admin** : toutes les actions (manage)
- **viewer** : view uniquement
