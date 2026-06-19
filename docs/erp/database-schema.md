# Schéma de base de données

## Vue d'ensemble

L'ERP Construction utilise **45 tables** préfixées par `erp_`, hébergées sur une instance MySQL/TiDB cloud. Le schéma est géré par Drizzle ORM avec des migrations SQL versionnées. Toutes les tables suivent les conventions décrites ci-dessous.

---

## Conventions

| Convention | Détail |
|-----------|--------|
| Préfixe | `erp_` pour toutes les tables ERP |
| Clé primaire | `id` INT AUTO_INCREMENT |
| Timestamps | `createdAt`, `updatedAt` en BIGINT (Unix ms) |
| Soft delete | `deletedAt` BIGINT nullable |
| Clés étrangères | Nommées `<table>_<colonne>_fk` |
| JSON | Type `json` pour les données flexibles |
| Montants | INT ou BIGINT en unités de devise (XOF, pas de décimales) |

---

## Domaine : RBAC et Système

### `erp_roles`

Rôles disponibles dans le système ERP.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| name | VARCHAR(64) | Nom unique du rôle |
| displayName | VARCHAR(128) | Nom affiché |
| description | TEXT | Description |
| isSystem | BOOLEAN | Rôle système (non supprimable) |
| createdAt | BIGINT | Timestamp création |

### `erp_permissions`

Permissions atomiques par module et action.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| module | VARCHAR(64) | Module ERP (ex: `erp_projects`) |
| action | VARCHAR(32) | Action (view, create, update, delete, approve) |
| description | TEXT | Description |
| createdAt | BIGINT | Timestamp création |

### `erp_role_permissions`

Table de liaison rôles ↔ permissions.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| roleId | INT FK | Référence vers erp_roles |
| permissionId | INT FK | Référence vers erp_permissions |

### `erp_user_roles`

Affectation des rôles aux utilisateurs.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| userId | INT FK | Référence vers users |
| roleId | INT FK | Référence vers erp_roles |
| assignedBy | INT | Utilisateur ayant attribué le rôle |
| createdAt | BIGINT | Timestamp |

### `erp_user_profiles`

Profil étendu des utilisateurs ERP.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| userId | INT FK UNIQUE | Référence vers users |
| phone | VARCHAR(32) | Téléphone |
| company | VARCHAR(255) | Entreprise |
| position | VARCHAR(128) | Poste |
| avatarUrl | TEXT | URL avatar (S3) |
| preferences | JSON | Préférences (langue, devise, thème...) |
| securitySettings | JSON | Paramètres sécurité |
| createdAt | BIGINT | Timestamp |
| updatedAt | BIGINT | Timestamp |

### `erp_dashboard_widgets`

Configuration des widgets du tableau de bord.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| userId | INT FK | Propriétaire |
| widgetType | VARCHAR(64) | Type de widget |
| config | JSON | Configuration |
| position | INT | Ordre d'affichage |
| createdAt | BIGINT | Timestamp |

---

## Domaine : Gestion de projets

### `erp_projects`

Projets de construction.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| name | VARCHAR(255) | Nom du projet |
| description | TEXT | Description |
| status | ENUM | draft, active, on_hold, completed, cancelled |
| priority | ENUM | low, medium, high, critical |
| startDate | BIGINT | Date de début prévue |
| endDate | BIGINT | Date de fin prévue |
| actualStartDate | BIGINT | Date de début réelle |
| actualEndDate | BIGINT | Date de fin réelle |
| budget | BIGINT | Budget total (XOF) |
| managerId | INT FK | Chef de projet |
| clientName | VARCHAR(255) | Nom du client |
| location | VARCHAR(255) | Localisation |
| createdBy | INT FK | Créateur |
| createdAt | BIGINT | Timestamp |
| updatedAt | BIGINT | Timestamp |
| deletedAt | BIGINT | Soft delete |

### `erp_tasks`

Tâches liées aux projets.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| projectId | INT FK | Projet parent |
| title | VARCHAR(255) | Titre |
| description | TEXT | Description |
| status | ENUM | todo, in_progress, review, done, blocked |
| priority | ENUM | low, medium, high, critical |
| assigneeId | INT FK | Responsable |
| startDate | BIGINT | Date début |
| dueDate | BIGINT | Date échéance |
| completedAt | BIGINT | Date complétion |
| progress | INT | Pourcentage (0-100) |
| createdBy | INT FK | Créateur |
| createdAt | BIGINT | Timestamp |
| updatedAt | BIGINT | Timestamp |

### `erp_task_dependencies`

Dépendances entre tâches (pour le Gantt).

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| taskId | INT FK | Tâche dépendante |
| dependsOnId | INT FK | Tâche prérequise |
| type | ENUM | finish_to_start, start_to_start, finish_to_finish |

### `erp_milestones`

Jalons de projet.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| projectId | INT FK | Projet |
| title | VARCHAR(255) | Titre |
| description | TEXT | Description |
| dueDate | BIGINT | Date cible |
| completedAt | BIGINT | Date réalisation |
| status | ENUM | pending, completed, overdue |
| createdAt | BIGINT | Timestamp |

---

## Domaine : Documents et conformité

### `erp_documents`

Documents attachés aux projets.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| projectId | INT FK | Projet |
| title | VARCHAR(255) | Titre |
| category | ENUM | plan, contract, report, permit, photo, other |
| fileUrl | TEXT | URL fichier (S3) |
| fileSize | INT | Taille en octets |
| mimeType | VARCHAR(128) | Type MIME |
| uploadedBy | INT FK | Uploadeur |
| status | ENUM | draft, pending_review, approved, rejected |
| expiresAt | BIGINT | Date expiration |
| createdAt | BIGINT | Timestamp |
| updatedAt | BIGINT | Timestamp |

### `erp_document_versions`

Historique des versions de documents.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| documentId | INT FK | Document parent |
| version | INT | Numéro de version |
| fileUrl | TEXT | URL fichier |
| uploadedBy | INT FK | Uploadeur |
| comment | TEXT | Commentaire |
| createdAt | BIGINT | Timestamp |

### `erp_permits`

Permis de construire et autorisations.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| projectId | INT FK | Projet |
| type | VARCHAR(128) | Type de permis |
| reference | VARCHAR(128) | Numéro de référence |
| issuedBy | VARCHAR(255) | Autorité émettrice |
| issuedDate | BIGINT | Date émission |
| expiryDate | BIGINT | Date expiration |
| status | ENUM | pending, approved, rejected, expired |
| documentUrl | TEXT | URL document |
| createdAt | BIGINT | Timestamp |

### `erp_compliance_requirements`

Exigences réglementaires.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| projectId | INT FK | Projet |
| category | VARCHAR(128) | Catégorie |
| title | VARCHAR(255) | Titre |
| description | TEXT | Description |
| dueDate | BIGINT | Date limite |
| status | ENUM | pending, compliant, non_compliant, waived |
| createdAt | BIGINT | Timestamp |

### `erp_compliance_checks`

Contrôles de conformité effectués.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| requirementId | INT FK | Exigence |
| checkedBy | INT FK | Vérificateur |
| result | ENUM | pass, fail, partial |
| notes | TEXT | Notes |
| checkedAt | BIGINT | Date contrôle |

---

## Domaine : Ressources et sécurité

### `erp_equipment`

Parc matériel.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| name | VARCHAR(255) | Nom |
| category | VARCHAR(128) | Catégorie |
| serialNumber | VARCHAR(128) | Numéro de série |
| status | ENUM | available, in_use, maintenance, retired |
| purchaseDate | BIGINT | Date achat |
| purchaseCost | BIGINT | Coût (XOF) |
| location | VARCHAR(255) | Localisation |
| createdAt | BIGINT | Timestamp |

### `erp_equipment_allocations`

Allocations d'équipement aux projets.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| equipmentId | INT FK | Équipement |
| projectId | INT FK | Projet |
| startDate | BIGINT | Début allocation |
| endDate | BIGINT | Fin allocation |
| allocatedBy | INT FK | Responsable |
| createdAt | BIGINT | Timestamp |

### `erp_equipment_maintenance`

Opérations de maintenance.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| equipmentId | INT FK | Équipement |
| type | ENUM | preventive, corrective, inspection |
| description | TEXT | Description |
| scheduledDate | BIGINT | Date prévue |
| completedDate | BIGINT | Date réalisation |
| cost | BIGINT | Coût (XOF) |
| performedBy | VARCHAR(255) | Intervenant |
| createdAt | BIGINT | Timestamp |

### `erp_safety_incidents`

Incidents de sécurité.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| projectId | INT FK | Projet |
| title | VARCHAR(255) | Titre |
| description | TEXT | Description |
| severity | ENUM | low, medium, high, critical |
| type | VARCHAR(128) | Type d'incident |
| occurredAt | BIGINT | Date/heure |
| reportedBy | INT FK | Déclarant |
| status | ENUM | reported, investigating, resolved, closed |
| createdAt | BIGINT | Timestamp |

### `erp_safety_audits`

Audits de sécurité.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| projectId | INT FK | Projet |
| auditorId | INT FK | Auditeur |
| score | INT | Score (0-100) |
| findings | JSON | Constatations |
| auditDate | BIGINT | Date audit |
| createdAt | BIGINT | Timestamp |

### `erp_safety_corrective_actions`

Actions correctives suite aux audits.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| auditId | INT FK | Audit source |
| description | TEXT | Description |
| assigneeId | INT FK | Responsable |
| dueDate | BIGINT | Date limite |
| status | ENUM | open, in_progress, completed, overdue |
| completedAt | BIGINT | Date réalisation |
| createdAt | BIGINT | Timestamp |

---

## Domaine : Intervenants externes

### `erp_vendors`

Fournisseurs.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| name | VARCHAR(255) | Raison sociale |
| category | VARCHAR(128) | Catégorie |
| email | VARCHAR(255) | Email |
| phone | VARCHAR(32) | Téléphone |
| address | TEXT | Adresse |
| taxId | VARCHAR(64) | Numéro fiscal |
| status | ENUM | active, inactive, blacklisted |
| rating | DECIMAL | Note moyenne |
| createdAt | BIGINT | Timestamp |

### `erp_vendor_contacts`

Contacts chez les fournisseurs.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| vendorId | INT FK | Fournisseur |
| name | VARCHAR(255) | Nom |
| role | VARCHAR(128) | Fonction |
| email | VARCHAR(255) | Email |
| phone | VARCHAR(32) | Téléphone |

### `erp_contractors`

Sous-traitants.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| name | VARCHAR(255) | Raison sociale |
| specialization | VARCHAR(255) | Spécialité |
| licenseNumber | VARCHAR(128) | Numéro licence |
| status | ENUM | active, inactive, suspended |
| rating | DECIMAL | Note moyenne |
| createdAt | BIGINT | Timestamp |

### `erp_project_contractors`

Affectation sous-traitants aux projets.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| projectId | INT FK | Projet |
| contractorId | INT FK | Sous-traitant |
| role | VARCHAR(128) | Rôle sur le projet |
| startDate | BIGINT | Début |
| endDate | BIGINT | Fin |

### `erp_contracts`

Contrats avec les sous-traitants.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| contractorId | INT FK | Sous-traitant |
| projectId | INT FK | Projet |
| title | VARCHAR(255) | Titre |
| amount | BIGINT | Montant (XOF) |
| startDate | BIGINT | Début |
| endDate | BIGINT | Fin |
| status | ENUM | draft, active, completed, terminated |
| createdAt | BIGINT | Timestamp |

### `erp_certifications`

Certifications des intervenants.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| entityType | ENUM | vendor, contractor, employee |
| entityId | INT | ID de l'entité |
| name | VARCHAR(255) | Nom certification |
| issuedBy | VARCHAR(255) | Organisme |
| issuedDate | BIGINT | Date émission |
| expiryDate | BIGINT | Date expiration |
| documentUrl | TEXT | URL document |
| status | ENUM | valid, expired, revoked |
| createdAt | BIGINT | Timestamp |

### `erp_performance_ratings`

Évaluations de performance des prestataires.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| entityType | ENUM | vendor, contractor |
| entityId | INT | ID de l'entité |
| projectId | INT FK | Projet |
| criteria | JSON | Critères et notes |
| overallScore | DECIMAL | Score global |
| comment | TEXT | Commentaire |
| ratedBy | INT FK | Évaluateur |
| createdAt | BIGINT | Timestamp |

---

## Domaine : Finance

### `erp_invoices`

Factures.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| projectId | INT FK | Projet |
| vendorId | INT FK | Fournisseur |
| invoiceNumber | VARCHAR(64) | Numéro facture |
| type | ENUM | incoming, outgoing |
| status | ENUM | draft, pending, approved, paid, overdue, cancelled |
| amount | BIGINT | Montant total (XOF) |
| taxAmount | BIGINT | TVA |
| dueDate | BIGINT | Date échéance |
| issuedDate | BIGINT | Date émission |
| category | VARCHAR(64) | Catégorie budgétaire |
| createdBy | INT FK | Créateur |
| createdAt | BIGINT | Timestamp |
| updatedAt | BIGINT | Timestamp |

### `erp_invoice_lines`

Lignes de facture.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| invoiceId | INT FK | Facture parent |
| description | VARCHAR(255) | Description |
| quantity | DECIMAL | Quantité |
| unitPrice | BIGINT | Prix unitaire (XOF) |
| amount | BIGINT | Montant ligne |

### `erp_payments`

Paiements.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| invoiceId | INT FK | Facture |
| amount | BIGINT | Montant (XOF) |
| method | ENUM | bank_transfer, check, cash, mobile_money |
| reference | VARCHAR(128) | Référence paiement |
| paidDate | BIGINT | Date paiement |
| status | ENUM | pending, completed, failed, refunded |
| createdBy | INT FK | Créateur |
| createdAt | BIGINT | Timestamp |

### `erp_budgets`

Budgets par projet.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| projectId | INT FK | Projet |
| name | VARCHAR(255) | Nom du budget |
| totalAmount | BIGINT | Montant total (XOF) |
| engagedAmount | BIGINT | Montant engagé |
| paidAmount | BIGINT | Montant payé |
| status | ENUM | draft, approved, closed |
| approvedBy | INT FK | Approbateur |
| approvedAt | BIGINT | Date approbation |
| createdBy | INT FK | Créateur |
| createdAt | BIGINT | Timestamp |
| updatedAt | BIGINT | Timestamp |

### `erp_budget_lines`

Lignes budgétaires détaillées.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| budgetId | INT FK | Budget parent |
| category | VARCHAR(64) | Catégorie (materials, labor, equipment...) |
| description | VARCHAR(255) | Description |
| plannedAmount | BIGINT | Montant prévu |
| engagedAmount | BIGINT | Montant engagé |
| paidAmount | BIGINT | Montant payé |
| createdAt | BIGINT | Timestamp |

### `erp_cash_flows`

Flux de trésorerie.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| projectId | INT FK | Projet |
| type | ENUM | income, expense |
| category | VARCHAR(64) | Catégorie |
| amount | BIGINT | Montant (XOF) |
| description | VARCHAR(255) | Description |
| transactionDate | BIGINT | Date transaction |
| reference | VARCHAR(128) | Référence |
| createdBy | INT FK | Créateur |
| createdAt | BIGINT | Timestamp |

### `erp_profitability_snapshots`

Instantanés de rentabilité par projet.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| projectId | INT FK | Projet |
| revenue | BIGINT | Revenus (XOF) |
| costs | BIGINT | Coûts (XOF) |
| grossMargin | BIGINT | Marge brute |
| grossMarginPercent | DECIMAL | % marge brute |
| netMargin | BIGINT | Marge nette |
| netMarginPercent | DECIMAL | % marge nette |
| calculatedAt | BIGINT | Date calcul |
| createdAt | BIGINT | Timestamp |

---

## Domaine : Inventaire

### `erp_stock_locations`

Emplacements de stockage.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| name | VARCHAR(255) | Nom |
| address | TEXT | Adresse |
| projectId | INT FK | Projet associé |
| createdAt | BIGINT | Timestamp |

### `erp_inventory_items`

Articles en stock.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| name | VARCHAR(255) | Nom |
| sku | VARCHAR(64) | Référence |
| category | VARCHAR(128) | Catégorie |
| unit | VARCHAR(32) | Unité de mesure |
| currentStock | DECIMAL | Stock actuel |
| minStock | DECIMAL | Stock minimum (alerte) |
| maxStock | DECIMAL | Stock maximum |
| unitPrice | BIGINT | Prix unitaire (XOF) |
| locationId | INT FK | Emplacement |
| createdAt | BIGINT | Timestamp |

### `erp_stock_movements`

Mouvements de stock.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| itemId | INT FK | Article |
| type | ENUM | in, out, transfer, adjustment |
| quantity | DECIMAL | Quantité |
| reference | VARCHAR(128) | Référence |
| projectId | INT FK | Projet |
| performedBy | INT FK | Opérateur |
| createdAt | BIGINT | Timestamp |

### `erp_material_requests`

Demandes de matériaux.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| projectId | INT FK | Projet |
| requestedBy | INT FK | Demandeur |
| status | ENUM | draft, pending, approved, fulfilled, rejected |
| priority | ENUM | low, medium, high, urgent |
| notes | TEXT | Notes |
| approvedBy | INT FK | Approbateur |
| createdAt | BIGINT | Timestamp |

### `erp_material_request_lines`

Lignes de demande de matériaux.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| requestId | INT FK | Demande parent |
| itemId | INT FK | Article |
| quantity | DECIMAL | Quantité demandée |
| fulfilledQuantity | DECIMAL | Quantité livrée |

### `erp_supplier_item_prices`

Prix fournisseurs par article.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| vendorId | INT FK | Fournisseur |
| itemId | INT FK | Article |
| unitPrice | BIGINT | Prix unitaire (XOF) |
| currency | VARCHAR(8) | Devise |
| leadTimeDays | INT | Délai livraison (jours) |
| isPreferred | BOOLEAN | Fournisseur préféré |
| validFrom | BIGINT | Début validité |
| validTo | BIGINT | Fin validité |
| createdAt | BIGINT | Timestamp |

### `erp_supplier_integrations`

Intégrations avec les systèmes fournisseurs.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| vendorId | INT FK | Fournisseur |
| type | ENUM | api, edi, email, manual |
| config | JSON | Configuration |
| status | ENUM | active, inactive, error |
| lastSyncAt | BIGINT | Dernière synchronisation |
| createdAt | BIGINT | Timestamp |

### `erp_wastage_records`

Enregistrements de pertes et gaspillages.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| projectId | INT FK | Projet |
| itemId | INT FK | Article |
| quantity | DECIMAL | Quantité perdue |
| cause | ENUM | damage, theft, expiry, overuse, weather, defect, other |
| estimatedCost | BIGINT | Coût estimé (XOF) |
| description | TEXT | Description |
| reportedBy | INT FK | Déclarant |
| createdAt | BIGINT | Timestamp |
| deletedAt | BIGINT | Soft delete |

---

## Domaine : Alertes et notifications

### `erp_overrun_alerts`

Alertes de dépassement générées automatiquement.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| projectId | INT FK | Projet |
| alertType | VARCHAR(64) | Type d'alerte (13 types) |
| priority | ENUM | low, medium, high, critical |
| title | VARCHAR(255) | Titre |
| message | TEXT | Message détaillé |
| threshold | DECIMAL | Seuil déclenché |
| currentValue | DECIMAL | Valeur actuelle |
| isAcknowledged | BOOLEAN | Acquittée |
| acknowledgedBy | INT FK | Acquitteur |
| acknowledgedAt | BIGINT | Date acquittement |
| relatedEntityType | VARCHAR(64) | Type entité liée |
| relatedEntityId | INT | ID entité liée |
| createdAt | BIGINT | Timestamp |

### `erp_notifications`

Notifications utilisateur.

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | Identifiant |
| userId | INT FK | Destinataire |
| title | VARCHAR(255) | Titre |
| message | TEXT | Message |
| module | VARCHAR(64) | Module source |
| priority | ENUM | low, medium, high, critical |
| isRead | BOOLEAN | Lue |
| readAt | BIGINT | Date lecture |
| linkUrl | VARCHAR(512) | Lien vers l'action |
| createdAt | BIGINT | Timestamp |

---

## Relations clés

Le diagramme de relations principal s'organise autour de la table `erp_projects` qui est référencée par la majorité des autres tables (tâches, documents, factures, budgets, équipements, incidents, etc.). La table `users` (système Foncier225) est référencée pour tous les champs `*By` (createdBy, assigneeId, managerId, etc.).
