# Module Crédit Habitat — Documentation Technique

## Vue d'ensemble

Le module crédit habitat permet aux citoyens de constituer un dossier de crédit immobilier, de soumettre les documents requis, et de suivre l'avancement de leur demande. Le module est protégé par un feature flag (`CREDIT_WORKFLOW_ENABLED`) et respecte l'isolation stricte par utilisateur.

## Architecture

Le module est composé de 4 couches :

| Couche | Fichier | Responsabilité |
|--------|---------|----------------|
| Types | `shared/credit-types.ts` | Enums, constantes, transitions, audit actions |
| Schéma | `drizzle/schema.ts` | 6 tables crédit avec index |
| Services | `server/credit-workflow.service.ts`, `server/credit-checklist.service.ts` | Machine d'états, règles de complétude |
| API | `server/credit-router.ts` | 8 procédures tRPC isolées |

## Tables DB

| Table | Colonnes clés | Index |
|-------|---------------|-------|
| `credit_files` | publicRef, initiatorId, parcelId, amountRequestedXof, durationMonths, status, lastTransitionAt | owner, status, parcel |
| `credit_file_participants` | creditFileId, userId, role (citizen/co_borrower/bank_agent/agent_terrain), consentGiven | file |
| `credit_documents` | creditFileId, documentType, status, sha256, rejectedAt | file |
| `credit_requests` | creditFileId, requestType, message, createdByUserId, resolvedAt | file |
| `credit_offers` | creditFileId, bankId, amount, apr, monthlyPaymentXof, conditionsText, createdByUserId | file |
| `credit_decisions` | creditFileId, decisionType, approvedAmount, decidedByUserId | file |

## Machine d'états

```
DRAFT → (ADD_DOC) → DOCS_PENDING
DRAFT → (SUBMIT) → SUBMITTED
DOCS_PENDING → (SUBMIT) → SUBMITTED
SUBMITTED → (REVIEW) → UNDER_REVIEW
UNDER_REVIEW → (REQUEST_DOCS) → DOCS_PENDING
UNDER_REVIEW → (MAKE_OFFER) → OFFERED
UNDER_REVIEW → (REJECT) → REJECTED
OFFERED → (ACCEPT_OFFER) → ACCEPTED
OFFERED → (REJECT_OFFER) → CLOSED
ACCEPTED → (APPROVE) → APPROVED
ACCEPTED → (REJECT) → REJECTED
```

Les statuts terminaux sont : `APPROVED`, `REJECTED`, `CLOSED`.

## Procédures tRPC

| Procédure | Type | Rôle requis | Description |
|-----------|------|-------------|-------------|
| `credit.createCreditFile` | mutation | citizen | Crée un dossier DRAFT avec publicRef |
| `credit.listMyCreditFiles` | query | citizen | Liste les dossiers du citoyen |
| `credit.getMyCreditFile` | query | citizen | Détail d'un dossier (owner-only) |
| `credit.submitCreditFile` | mutation | citizen | Soumet avec validation complétude |
| `credit.uploadCreditDocument` | mutation | citizen | Upload document avec sha256 |
| `credit.listCreditFileDocuments` | query | citizen | Liste documents d'un dossier |
| `credit.getCreditFileChecklist` | query | citizen | Checklist complétude + events valides |
| `credit.getCreditFileParticipants` | query | citizen | Liste participants d'un dossier |

## Audit Trail

Chaque action déclenche un événement d'audit dans `audit_events` :

| Action | Déclencheur |
|--------|-------------|
| `credit.file.created` | Création d'un dossier |
| `credit.file.submitted` | Soumission d'un dossier |
| `credit.file.doc_uploaded` | Upload d'un document |
| `credit.file.error` | Erreur de soumission (dossier incomplet) |

Les événements suivants sont préparés pour les versions futures : `credit.file.under_review`, `credit.file.doc.validated`, `credit.file.doc.rejected`, `credit.file.offer_made`, `credit.file.offer_accepted`, `credit.file.offer_rejected`, `credit.file.decided`, `credit.file.attestation_issued`, `credit.file.viewed_bank`, `credit.file.consent.granted`, `credit.file.consent.revoked`, `credit.file.closed`, `credit.offer.expired`, `credit.attestation.verified`.

## Feature Flag

Le module est protégé par `CREDIT_WORKFLOW_ENABLED`. Quand le flag est `false`, toutes les procédures retournent une erreur `FORBIDDEN`. Pour activer :

```
VITE_CREDIT_WORKFLOW_ENABLED=true
```

## Sécurité

Toutes les procédures vérifient que `creditFiles.initiatorId === ctx.user.id` avant de retourner des données. Aucune ressource d'un autre citoyen n'est accessible. Les documents sont vérifiés par hash SHA-256 pour garantir l'intégrité.

## Règles de complétude

| Produit | Documents requis |
|---------|-----------------|
| STANDARD | ID_CARD, PROOF_INCOME, PROOF_RESIDENCE, LAND_TITLE_DEED |
| SIMPLIFIED | ID_CARD, PROOF_RESIDENCE, LAND_TITLE_DEED |

La soumission est bloquée tant que tous les documents requis ne sont pas uploadés.
