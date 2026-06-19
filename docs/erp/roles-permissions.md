# Rôles et Permissions

## Vue d'ensemble

L'ERP Construction implémente un système **RBAC** (Role-Based Access Control) complet permettant de contrôler finement l'accès aux fonctionnalités par module et par action. Le système repose sur trois entités : les rôles, les permissions et les affectations utilisateur.

---

## Architecture RBAC

Le modèle de données RBAC s'articule autour de quatre tables :

| Table | Rôle |
|-------|------|
| `erp_roles` | Définition des rôles (nom, description, système ou personnalisé) |
| `erp_permissions` | Permissions atomiques (module + action) |
| `erp_role_permissions` | Liaison rôles ↔ permissions |
| `erp_user_roles` | Affectation des rôles aux utilisateurs |

Un utilisateur peut posséder plusieurs rôles simultanément. Ses permissions effectives sont l'union de toutes les permissions de ses rôles.

---

## Rôles prédéfinis

Le système propose des rôles prédéfinis couvrant les profils types d'une entreprise de BTP :

| Rôle | Code | Description | Système |
|------|------|-------------|---------|
| Administrateur | `admin` | Accès complet à tous les modules | Oui |
| Directeur de projet | `project_director` | Gestion complète des projets et finances | Oui |
| Chef de projet | `project_manager` | Gestion opérationnelle d'un projet | Oui |
| Ingénieur | `engineer` | Tâches techniques, documents, conformité | Oui |
| Comptable | `accountant` | Finance, factures, paiements, budgets | Oui |
| Magasinier | `warehouse_manager` | Inventaire, stock, demandes matériaux | Oui |
| Responsable sécurité | `safety_officer` | Incidents, audits, actions correctives | Oui |
| Responsable achats | `procurement_manager` | Fournisseurs, sous-traitants, certifications | Oui |
| Consultant | `consultant` | Lecture seule sur les projets assignés | Oui |

> **Note** : Les rôles système ne peuvent pas être supprimés. Des rôles personnalisés peuvent être créés pour des besoins spécifiques.

---

## Modules de permissions

Chaque permission est définie par un couple `(module, action)`. Les modules disponibles sont :

| Module | Code | Description |
|--------|------|-------------|
| Projets | `erp_projects` | Gestion des projets, tâches, jalons |
| Documents | `erp_documents` | GED et versionnage |
| Permis | `erp_permits` | Permis de construire |
| Conformité | `erp_compliance` | Exigences réglementaires |
| Équipement | `erp_equipment` | Parc matériel |
| Sécurité | `erp_safety` | Incidents et audits |
| Fournisseurs | `erp_vendors` | Fournisseurs et sous-traitants |
| Sous-traitants | `erp_contractors` | Sous-traitants et contrats |
| Factures | `erp_invoices` | Facturation |
| Paiements | `erp_payments` | Paiements |
| Finance | `erp_finance` | Budgets, trésorerie, rentabilité |
| Inventaire | `inventory` | Stock, mouvements, demandes |
| Administration | `erp_admin` | Rôles, permissions, utilisateurs |

---

## Actions disponibles

| Action | Code | Description |
|--------|------|-------------|
| Consulter | `view` | Lire les données du module |
| Créer | `create` | Ajouter de nouvelles entrées |
| Modifier | `edit` | Modifier les entrées existantes |
| Mettre à jour | `update` | Variante de modification |
| Supprimer | `delete` | Supprimer (soft delete) |
| Valider | `validate` | Approuver ou rejeter |
| Approuver | `approve` | Approuver spécifiquement (budgets) |
| Évaluer | `rate` | Noter les prestataires |
| Gérer | `manage` | Administration complète |

---

## Matrice de permissions par rôle

La matrice ci-dessous indique les permissions attribuées à chaque rôle prédéfini. **V** = view, **C** = create, **E** = edit, **D** = delete, **A** = approve/validate.

| Module | Admin | Dir. Projet | Chef Projet | Ingénieur | Comptable | Magasinier | Sécurité | Achats | Consultant |
|--------|-------|-------------|-------------|-----------|-----------|------------|----------|--------|------------|
| erp_projects | VCEDA | VCEDA | VCED | VCE | V | V | V | V | V |
| erp_documents | VCEDA | VCEDA | VCEDA | VCE | V | V | V | V | V |
| erp_permits | VCEDA | VCEDA | VCE | VCE | V | — | — | — | V |
| erp_compliance | VCEDA | VCEDA | VCE | VCE | V | — | VCE | — | V |
| erp_equipment | VCEDA | VCE | VCE | VCE | V | VCE | V | V | V |
| erp_safety | VCEDA | VCE | VCE | VCE | V | — | VCEDA | — | V |
| erp_vendors | VCEDA | VCE | VCE | V | V | V | — | VCEDA | V |
| erp_contractors | VCEDA | VCEDA | VCE | V | V | — | — | VCE | V |
| erp_invoices | VCEDA | VCEDA | VCE | V | VCEDA | V | — | VCE | V |
| erp_payments | VCEDA | VCEDA | V | — | VCEDA | — | — | V | V |
| erp_finance | VCEDA | VCEDA | V | — | VCEDA | — | — | V | V |
| inventory | VCEDA | VCE | VCE | VCE | V | VCEDA | — | VCE | V |
| erp_admin | VCEDA | V | — | — | — | — | — | — | — |

---

## Vérification des permissions

La vérification des permissions s'effectue au niveau du routeur tRPC via la procédure `erpPermissionProcedure` :

```typescript
// Exemple : seuls les utilisateurs avec la permission erp_finance.approve
// peuvent approuver un budget
approve: erpPermissionProcedure("erp_finance", "approve")
  .input(z.object({ id: z.number() }))
  .mutation(async ({ ctx, input }) => {
    // ctx.user est garanti authentifié et autorisé
  })
```

Le service `erp-rbac.service.ts` expose les fonctions suivantes :

| Fonction | Description |
|----------|-------------|
| `checkPermission(userId, module, action)` | Vérifie si l'utilisateur a la permission |
| `getUserRoles(userId)` | Retourne les rôles d'un utilisateur |
| `getUserPermissions(userId)` | Retourne toutes les permissions effectives |
| `hasAnyRole(userId, roleNames[])` | Vérifie si l'utilisateur a au moins un des rôles |

---

## Gestion des rôles

Les administrateurs peuvent gérer les rôles via l'interface `/erp/admin/roles` ou les procédures API :

| Action | Procédure | Condition |
|--------|-----------|-----------|
| Lister les rôles | `erp.auth.roles.list` | Permission `erp_admin.view` |
| Créer un rôle | `erp.auth.roles.create` | Permission `erp_admin.manage` |
| Modifier un rôle | `erp.auth.roles.update` | Permission `erp_admin.manage` |
| Supprimer un rôle | `erp.auth.roles.delete` | Permission `erp_admin.manage` + non système |
| Attribuer un rôle | `erp.auth.users.assignRole` | Permission `erp_admin.manage` |
| Retirer un rôle | `erp.auth.users.removeRole` | Permission `erp_admin.manage` |

---

## Bonnes pratiques

Le principe du **moindre privilège** doit guider l'attribution des rôles. Chaque utilisateur ne doit recevoir que les permissions strictement nécessaires à l'exercice de ses fonctions. Les rôles personnalisés permettent de créer des profils sur mesure sans modifier les rôles système.

Toute modification de rôle ou de permission est tracée dans le journal d'audit (`audit_events`) avec l'action `erp.roles.*` ou `erp.permissions.*`.
