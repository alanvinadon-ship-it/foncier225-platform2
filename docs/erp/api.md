# Référence API — Procédures tRPC

## Vue d'ensemble

L'ERP Construction expose ses fonctionnalités via **tRPC** (Type-safe Remote Procedure Call). Toutes les procédures sont accessibles sous le préfixe `erp.*` et nécessitent une authentification sauf mention contraire. Le transport utilise HTTP JSON-RPC sur `/api/trpc`.

---

## Conventions

| Élément | Convention |
|---------|-----------|
| Authentification | Cookie JWT (session Manus OAuth) |
| Pagination | Input `{ page: number, limit: number }` → Output `{ items, total, page, limit, totalPages }` |
| Dates | Unix timestamps en millisecondes (BIGINT) |
| Montants | Entiers en XOF (pas de décimales) |
| Soft delete | Les suppressions marquent `deletedAt` sans effacer les données |
| Erreurs | Codes tRPC standard (UNAUTHORIZED, FORBIDDEN, NOT_FOUND, BAD_REQUEST) |

---

## Module : Dashboard (`erp.dashboard.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `stats` | Query | erp_projects.view | KPI globaux (projets actifs, tâches, budget, incidents) |
| `recentActivity` | Query | erp_projects.view | Dernières activités sur les projets |
| `projectsSummary` | Query | erp_projects.view | Résumé des projets par statut |
| `widgets.list` | Query | — | Widgets configurés par l'utilisateur |
| `widgets.save` | Mutation | — | Sauvegarder la configuration des widgets |

---

## Module : Projects (`erp.projects.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | erp_projects.view | Liste paginée avec filtres (statut, priorité, recherche) |
| `getById` | Query | erp_projects.view | Détail d'un projet |
| `create` | Mutation | erp_projects.create | Créer un projet |
| `update` | Mutation | erp_projects.edit | Modifier un projet |
| `delete` | Mutation | erp_projects.delete | Supprimer un projet (soft delete) |
| `summary` | Query | erp_projects.view | Résumé financier et avancement d'un projet |

---

## Module : Tasks (`erp.tasks.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `listByProject` | Query | erp_projects.view | Tâches d'un projet (filtres, tri, pagination) |
| `getById` | Query | erp_projects.view | Détail d'une tâche |
| `create` | Mutation | erp_projects.create | Créer une tâche |
| `update` | Mutation | erp_projects.edit | Modifier une tâche |
| `delete` | Mutation | erp_projects.delete | Supprimer une tâche (soft delete) |

---

## Module : Gantt (`erp.gantt.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `getData` | Query | erp_projects.view | Données Gantt (tâches + dépendances + jalons) |
| `updateTask` | Mutation | erp_projects.edit | Modifier dates/durée depuis le Gantt |
| `addDependency` | Mutation | erp_projects.edit | Ajouter une dépendance |
| `removeDependency` | Mutation | erp_projects.edit | Supprimer une dépendance |

---

## Module : Milestones (`erp.milestones.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `listByProject` | Query | erp_projects.view | Jalons d'un projet |
| `create` | Mutation | erp_projects.create | Créer un jalon |
| `update` | Mutation | erp_projects.edit | Modifier un jalon |
| `complete` | Mutation | erp_projects.edit | Marquer un jalon comme complété |
| `delete` | Mutation | erp_projects.delete | Supprimer un jalon |

---

## Module : Documents (`erp.documents.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | erp_documents.view | Liste paginée avec filtres |
| `getById` | Query | erp_documents.view | Détail + versions |
| `create` | Mutation | erp_documents.create | Uploader un document |
| `update` | Mutation | erp_documents.edit | Modifier métadonnées |
| `delete` | Mutation | erp_documents.delete | Supprimer |
| `changeStatus` | Mutation | erp_documents.validate | Approuver/rejeter |
| `addVersion` | Mutation | erp_documents.edit | Ajouter une version |

---

## Module : Permits (`erp.permits.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | erp_permits.view | Liste paginée |
| `getById` | Query | erp_permits.view | Détail |
| `create` | Mutation | erp_permits.create | Créer un permis |
| `update` | Mutation | erp_permits.edit | Modifier |
| `delete` | Mutation | erp_permits.delete | Supprimer |
| `changeStatus` | Mutation | erp_permits.validate | Changer le statut |

---

## Module : Compliance (`erp.compliance.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `listRequirements` | Query | erp_compliance.view | Exigences réglementaires |
| `createRequirement` | Mutation | erp_compliance.create | Créer une exigence |
| `updateRequirement` | Mutation | erp_compliance.edit | Modifier |
| `deleteRequirement` | Mutation | erp_compliance.delete | Supprimer |
| `listChecks` | Query | erp_compliance.view | Contrôles effectués |
| `createCheck` | Mutation | erp_compliance.create | Enregistrer un contrôle |
| `stats` | Query | erp_compliance.view | Statistiques conformité |

---

## Module : Equipment (`erp.equipment.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | erp_equipment.view | Liste du parc matériel |
| `getById` | Query | erp_equipment.view | Détail équipement |
| `create` | Mutation | erp_equipment.create | Ajouter un équipement |
| `update` | Mutation | erp_equipment.edit | Modifier |
| `delete` | Mutation | erp_equipment.delete | Supprimer |
| `allocate` | Mutation | erp_equipment.edit | Allouer à un projet |
| `deallocate` | Mutation | erp_equipment.edit | Libérer |
| `listMaintenance` | Query | erp_equipment.view | Opérations de maintenance |
| `createMaintenance` | Mutation | erp_equipment.create | Planifier une maintenance |
| `completeMaintenance` | Mutation | erp_equipment.edit | Marquer comme effectuée |

---

## Module : Safety (`erp.safety.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `listIncidents` | Query | erp_safety.view | Incidents de sécurité |
| `getIncident` | Query | erp_safety.view | Détail incident |
| `createIncident` | Mutation | erp_safety.create | Déclarer un incident |
| `updateIncident` | Mutation | erp_safety.create | Modifier |
| `deleteIncident` | Mutation | erp_safety.validate | Supprimer |
| `listAudits` | Query | erp_safety.view | Audits de sécurité |
| `createAudit` | Mutation | erp_safety.create | Créer un audit |
| `updateAudit` | Mutation | erp_safety.create | Modifier un audit |
| `updateCorrectiveAction` | Mutation | erp_safety.create | Mettre à jour une action corrective |
| `stats` | Query | erp_safety.view | Statistiques sécurité |

---

## Module : Vendors (`erp.vendors.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | erp_vendors.view | Liste fournisseurs |
| `getById` | Query | erp_vendors.view | Détail fournisseur + contacts |
| `create` | Mutation | erp_vendors.create | Créer un fournisseur |
| `update` | Mutation | erp_vendors.update | Modifier |
| `delete` | Mutation | erp_vendors.delete | Supprimer |
| `updateStatus` | Mutation | erp_vendors.validate | Changer le statut |
| `deleteContact` | Mutation | erp_vendors.delete | Supprimer un contact |

---

## Module : Contractors (`erp.contractors.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | erp_contractors.view | Liste sous-traitants |
| `getById` | Query | erp_contractors.view | Détail |
| `create` | Mutation | erp_contractors.create | Créer |
| `update` | Mutation | erp_contractors.edit | Modifier |
| `delete` | Mutation | erp_contractors.delete | Supprimer |
| `assignToProject` | Mutation | erp_contractors.edit | Affecter à un projet |
| `listContracts` | Query | erp_contractors.view | Contrats |
| `createContract` | Mutation | erp_contractors.create | Créer un contrat |

---

## Module : Certifications (`erp.certifications.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | erp_vendors.view | Liste certifications |
| `create` | Mutation | erp_vendors.create | Ajouter une certification |
| `update` | Mutation | erp_vendors.update | Modifier |
| `delete` | Mutation | erp_vendors.delete | Supprimer |
| `expiring` | Query | erp_vendors.view | Certifications expirant bientôt |

---

## Module : Performance Ratings (`erp.ratings.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | erp_vendors.view | Liste évaluations |
| `create` | Mutation | erp_vendors.rate | Créer une évaluation |
| `update` | Mutation | erp_vendors.rate | Modifier |
| `delete` | Mutation | erp_vendors.delete | Supprimer |
| `stats` | Query | erp_vendors.view | Statistiques par entité |

---

## Module : Invoices (`erp.invoices.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | erp_invoices.view | Liste factures |
| `getById` | Query | erp_invoices.view | Détail + lignes |
| `create` | Mutation | erp_invoices.create | Créer une facture |
| `update` | Mutation | erp_invoices.edit | Modifier |
| `delete` | Mutation | erp_invoices.delete | Supprimer |
| `changeStatus` | Mutation | erp_invoices.validate | Approuver/rejeter |
| `stats` | Query | erp_invoices.view | KPI factures |

---

## Module : Payments (`erp.payments.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | erp_payments.view | Liste paiements |
| `getById` | Query | erp_payments.view | Détail |
| `create` | Mutation | erp_payments.create | Enregistrer un paiement |
| `update` | Mutation | erp_payments.edit | Modifier |
| `delete` | Mutation | erp_payments.delete | Supprimer |
| `stats` | Query | erp_payments.view | KPI paiements |

---

## Module : Inventory (`erp.inventory.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `items.list` | Query | inventory.view | Articles en stock |
| `items.create` | Mutation | inventory.create | Créer un article |
| `items.update` | Mutation | inventory.edit | Modifier |
| `items.delete` | Mutation | inventory.delete | Supprimer |
| `movements.list` | Query | inventory.view | Mouvements de stock |
| `movements.create` | Mutation | inventory.create | Enregistrer un mouvement |
| `locations.list` | Query | inventory.view | Emplacements |
| `locations.create` | Mutation | inventory.create | Créer un emplacement |
| `stockLevels` | Query | inventory.view | Niveaux de stock avec alertes |

---

## Module : Material Requests (`erp.materialRequests.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | inventory.view | Demandes de matériaux |
| `getById` | Query | inventory.view | Détail + lignes |
| `create` | Mutation | inventory.create | Créer une demande |
| `update` | Mutation | inventory.edit | Modifier |
| `approve` | Mutation | inventory.validate | Approuver |
| `fulfill` | Mutation | inventory.edit | Marquer comme livrée |
| `delete` | Mutation | inventory.delete | Supprimer |

---

## Module : Supplier Integration (`erp.supplierIntegration.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `listPrices` | Query | inventory.view | Prix fournisseurs |
| `createPrice` | Mutation | inventory.create | Ajouter un prix |
| `updatePrice` | Mutation | inventory.edit | Modifier |
| `deletePrice` | Mutation | inventory.delete | Supprimer |
| `itemSuppliers` | Query | inventory.view | Fournisseurs d'un article |
| `vendorItems` | Query | inventory.view | Articles d'un fournisseur |
| `compareSuppliers` | Query | inventory.view | Comparaison multi-fournisseurs |
| `setPreferred` | Mutation | inventory.edit | Définir fournisseur préféré |
| `listIntegrations` | Query | inventory.view | Intégrations configurées |
| `createIntegration` | Mutation | inventory.create | Créer une intégration |
| `sync` | Mutation | inventory.edit | Déclencher synchronisation |

---

## Module : Wastage Analysis (`erp.wastage.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | inventory.view | Enregistrements de pertes |
| `getById` | Query | inventory.view | Détail |
| `create` | Mutation | inventory.create | Déclarer une perte |
| `update` | Mutation | inventory.edit | Modifier |
| `delete` | Mutation | inventory.delete | Supprimer (soft) |
| `byProject` | Query | inventory.view | Pertes par projet |
| `stats` | Query | inventory.view | KPI gaspillage |

---

## Module : Finance — Budgets (`erp.finance.budgets.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | erp_finance.view | Liste budgets |
| `getById` | Query | erp_finance.view | Détail + lignes |
| `create` | Mutation | erp_finance.create | Créer un budget |
| `update` | Mutation | erp_finance.edit | Modifier |
| `approve` | Mutation | erp_finance.approve | Approuver |
| `byProject` | Query | erp_finance.view | Budget d'un projet |
| `variance` | Query | erp_finance.view | Analyse des écarts prévu/réalisé |
| `addLine` | Mutation | erp_finance.create | Ajouter une ligne budgétaire |
| `updateLine` | Mutation | erp_finance.edit | Modifier une ligne |

---

## Module : Finance — Cash Flow (`erp.finance.cashFlow.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | erp_finance.view | Flux de trésorerie |
| `create` | Mutation | erp_finance.create | Ajouter un flux |
| `summary` | Query | erp_finance.view | Résumé par période |
| `byProject` | Query | erp_finance.view | Flux d'un projet |
| `forecast` | Query | erp_finance.view | Prévisions 30 jours |

---

## Module : Finance — Profitability (`erp.finance.profitability.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | erp_finance.view | Rentabilité tous projets |
| `byProject` | Query | erp_finance.view | Rentabilité d'un projet |
| `recalculate` | Mutation | erp_finance.create | Recalculer un snapshot |
| `ranking` | Query | erp_finance.view | Classement par rentabilité |

---

## Module : Finance — Budget Sync (`erp.finance.budgetSync.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `syncFromInvoices` | Mutation | erp_finance.edit | Synchroniser engagé depuis factures |

---

## Module : Overrun Alerts (`erp.overrunAlerts.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | erp_finance.view | Liste alertes |
| `check` | Mutation | erp_finance.create | Déclencher vérification |
| `acknowledge` | Mutation | erp_finance.edit | Acquitter une alerte |
| `byProject` | Query | erp_finance.view | Alertes d'un projet |

---

## Module : Notifications (`erp.notifications.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | — | Notifications de l'utilisateur |
| `unread` | Query | — | Notifications non lues |
| `markRead` | Mutation | — | Marquer comme lue |
| `markAllRead` | Mutation | — | Marquer toutes comme lues |

---

## Module : Profile (`erp.profile.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `get` | Query | — | Récupérer son profil |
| `update` | Mutation | — | Modifier nom, téléphone, entreprise, poste |
| `updatePassword` | Mutation | — | Changer le mot de passe |
| `uploadAvatar` | Mutation | — | Uploader un avatar |
| `getPreferences` | Query | — | Récupérer les préférences |
| `updatePreferences` | Mutation | — | Modifier les préférences |

---

## Module : Audit Logs (`erp.auditLogs.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `list` | Query | erp_admin.view | Liste paginée avec filtres |
| `getById` | Query | erp_admin.view | Détail d'un log |
| `byProject` | Query | erp_projects.view | Logs d'un projet |
| `stats` | Query | erp_admin.view | Statistiques (total, 24h, 7j, top acteurs) |

---

## Module : Admin — RBAC (`erp.auth.*`)

| Procédure | Type | Permission | Description |
|-----------|------|-----------|-------------|
| `roles.list` | Query | erp_admin.view | Liste des rôles |
| `roles.create` | Mutation | erp_admin.manage | Créer un rôle |
| `roles.update` | Mutation | erp_admin.manage | Modifier un rôle |
| `roles.delete` | Mutation | erp_admin.manage | Supprimer un rôle |
| `permissions.list` | Query | erp_admin.view | Liste des permissions |
| `users.list` | Query | erp_admin.view | Utilisateurs et leurs rôles |
| `users.assignRole` | Mutation | erp_admin.manage | Attribuer un rôle |
| `users.removeRole` | Mutation | erp_admin.manage | Retirer un rôle |

---

## Gestion des erreurs

Toutes les procédures utilisent les codes d'erreur tRPC standard :

| Code | Signification | Exemple |
|------|--------------|---------|
| `UNAUTHORIZED` | Non authentifié | Session expirée |
| `FORBIDDEN` | Permission insuffisante | Rôle sans la permission requise |
| `NOT_FOUND` | Ressource introuvable | ID invalide |
| `BAD_REQUEST` | Données invalides | Validation Zod échouée |
| `INTERNAL_SERVER_ERROR` | Erreur serveur | Erreur DB inattendue |
