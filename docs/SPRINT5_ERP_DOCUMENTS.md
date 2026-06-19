# Sprint 5 ERP Construction — Documents, Permits & Compliance

## Résumé

Le Sprint 5 ajoute trois modules interconnectés au système ERP Construction de Foncier225 :

1. **Documents** : Gestion documentaire complète (upload S3, versionnement, validation/rejet, expiration)
2. **Permits** : Suivi des permis de construire et autorisations administratives (CRUD, workflow validation, alertes expiration)
3. **Compliance** : Conformité réglementaire (exigences, vérifications, KPI, alertes échéances)

---

## Tables créées (5)

| Table | Description | Colonnes clés |
|-------|-------------|---------------|
| `erp_documents` | Documents de chantier et administratifs | id, projectId, title, type, status, fileUrl, fileKey, fileName, mimeType, fileSize, issuedAt, expiresAt, uploadedBy, validatedBy, rejectedBy, rejectionReason |
| `erp_document_versions` | Historique des versions de documents | id, documentId, version, fileUrl, fileKey, fileName, uploadedBy, comment |
| `erp_permits` | Permis et autorisations | id, projectId, type, reference, issuedBy, issuedAt, expiresAt, status, alertDaysBefore, validatedBy, rejectedBy |
| `erp_compliance_requirements` | Exigences de conformité | id, projectId, title, category, priority, dueDate, status, createdBy |
| `erp_compliance_checks` | Vérifications de conformité | id, requirementId, checkedBy, status, comment, evidenceUrl, checkedAt |

---

## Routeurs tRPC (3)

### erp.documents (9 procédures)

| Procédure | Type | Permission | Description |
|-----------|------|------------|-------------|
| `list` | query | erp_documents.view | Liste avec filtres (projectId, type, status, search) + pagination |
| `getById` | query | erp_documents.view | Détail document + versions |
| `create` | mutation | erp_documents.create | Création + upload S3 optionnel |
| `update` | mutation | erp_documents.update | Modification métadonnées |
| `delete` | mutation | erp_documents.delete | Suppression logique (soft delete) |
| `download` | query | erp_documents.download | URL présignée S3 |
| `addVersion` | mutation | erp_documents.create | Ajout nouvelle version |
| `validate` | mutation | erp_documents.approve | Validation par un approbateur |
| `reject` | mutation | erp_documents.approve | Rejet avec motif obligatoire |
| `expired` | query | erp_documents.view | Documents expirés |

### erp.permits (7 procédures)

| Procédure | Type | Permission | Description |
|-----------|------|------------|-------------|
| `list` | query | erp_compliance.view | Liste avec filtres + pagination |
| `create` | mutation | erp_compliance.create | Création permis |
| `update` | mutation | erp_compliance.update | Modification |
| `delete` | mutation | erp_compliance.delete | Suppression logique |
| `validate` | mutation | erp_compliance.approve | Validation |
| `reject` | mutation | erp_compliance.approve | Rejet avec motif |
| `upcomingExpirations` | query | erp_compliance.view | Permis expirant dans X jours |

### erp.compliance (8 procédures)

| Procédure | Type | Permission | Description |
|-----------|------|------------|-------------|
| `listRequirements` | query | erp_compliance.view | Liste exigences + filtres + pagination |
| `getRequirement` | query | erp_compliance.view | Détail exigence + checks |
| `createRequirement` | mutation | erp_compliance.create | Création exigence |
| `updateRequirement` | mutation | erp_compliance.update | Modification |
| `deleteRequirement` | mutation | erp_compliance.delete | Suppression logique |
| `addCheck` | mutation | erp_compliance.approve | Ajout vérification + auto-update statut |
| `expiredRequirements` | query | erp_compliance.view | Exigences en retard |
| `upcomingRequirements` | query | erp_compliance.view | Échéances prochaines |
| `stats` | query | erp_compliance.view | KPI (total, conformes, non-conformes, taux) |

---

## Pages frontend (3)

| Route | Fichier | Fonctionnalités |
|-------|---------|-----------------|
| `/erp/documents` | `ErpDocuments.tsx` | Liste, création, filtres, validate/reject, détail+versions, alertes expirés |
| `/erp/permits` | `ErpPermits.tsx` | Liste, création, filtres, validate/reject, alertes expirations prochaines |
| `/erp/compliance` | `ErpCompliance.tsx` | KPI cards, liste exigences, filtres, détail+checks, ajout vérification, alertes |

---

## Fichiers créés

| Fichier | Description |
|---------|-------------|
| `server/erp/erp-documents-router.ts` | Routeur tRPC Documents (9 procédures) |
| `server/erp/erp-permits-router.ts` | Routeur tRPC Permits (7 procédures) |
| `server/erp/erp-compliance-router.ts` | Routeur tRPC Compliance (8 procédures) |
| `client/src/pages/erp/ErpDocuments.tsx` | Page Documents |
| `client/src/pages/erp/ErpPermits.tsx` | Page Permis |
| `client/src/pages/erp/ErpCompliance.tsx` | Page Conformité |
| `server/erp/erp-documents-permits-compliance.test.ts` | Tests Sprint 5 (64 tests) |
| `docs/SPRINT5_ERP_DOCUMENTS.md` | Cette documentation |

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `drizzle/schema.ts` | Ajout 5 tables ERP Sprint 5 |
| `server/erp/erp-router.ts` | Montage des 3 nouveaux routeurs |
| `client/src/App.tsx` | Ajout lazy imports + routes /erp/documents, /erp/permits, /erp/compliance |
| `client/src/components/ErpLayout.tsx` | Ajout lien "Permis" dans la sidebar |
| `todo.md` | Items Sprint 5 marqués comme complétés |

---

## Sécurité

- **Fichiers dangereux** : Extensions bloquées (.exe, .bat, .cmd, .sh, .ps1, .vbs, .js, .msi)
- **Permissions RBAC** : Chaque procédure protégée par `erpPermissionProcedure(module, action)`
- **Soft delete** : Aucune suppression physique, colonne `deletedAt` utilisée
- **Upload S3** : Stockage sécurisé via `storagePut`/`storageGet`

---

## Tests

- **64 nouveaux tests** dans `erp-documents-permits-compliance.test.ts`
- **455 tests PASS** au total (non-régression complète)
- **0 erreur TypeScript**

---

## Logique métier notable

### Auto-update statut conformité
Lorsqu'une vérification (`addCheck`) est ajoutée avec statut `passed`, l'exigence passe automatiquement à `completed`. Si `failed`, elle passe à `non_compliant`.

### Alertes expiration
- Documents : `expired` query retourne les documents dont `expiresAt < now`
- Permis : `upcomingExpirations` retourne les permis expirant dans les X prochains jours
- Conformité : `expiredRequirements` et `upcomingRequirements` pour les échéances

### Versionnement documents
Chaque upload crée une nouvelle entrée dans `erp_document_versions` avec un numéro de version incrémenté automatiquement.
