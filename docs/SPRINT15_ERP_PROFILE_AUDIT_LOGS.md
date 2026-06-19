# Sprint 15 — Profile Details & Audit Logs

## Objectif

Permettre aux utilisateurs de gérer leur profil complet (informations personnelles, avatar, mot de passe, préférences) et tracer toutes les actions sensibles ERP dans un journal d'audit consultable.

## Migrations

### Table `erp_user_profiles`

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT AUTO_INCREMENT | Clé primaire |
| userId | INT NOT NULL | FK vers users.id (unique) |
| phone | VARCHAR(32) | Téléphone |
| company | VARCHAR(255) | Entreprise |
| position | VARCHAR(128) | Poste |
| avatarUrl | TEXT | URL de l'avatar (S3) |
| preferences | JSON | Préférences utilisateur |
| securitySettings | JSON | Paramètres de sécurité |
| createdAt | BIGINT | Timestamp création |
| updatedAt | BIGINT | Timestamp dernière modification |

**Note :** La table `audit_events` existante est réutilisée pour le journal d'audit ERP. Les actions ERP sont préfixées par `erp.` pour les distinguer.

## API (Procédures tRPC)

### Profile Router (`erp.profile.*`)

| Procédure | Type | Description |
|-----------|------|-------------|
| `get` | Query | Récupérer le profil complet |
| `update` | Mutation | Modifier nom, téléphone, entreprise, poste |
| `updatePassword` | Mutation | Modifier le mot de passe |
| `uploadAvatar` | Mutation | Uploader un avatar (base64 → S3) |
| `getPreferences` | Query | Récupérer les préférences |
| `updatePreferences` | Mutation | Modifier les préférences |

### Audit Logs Router (`erp.auditLogs.*`)

| Procédure | Type | Description |
|-----------|------|-------------|
| `list` | Query | Liste paginée avec filtres (action, acteur, type, dates, recherche) |
| `getById` | Query | Détail d'un log d'audit |
| `byProject` | Query | Logs liés à un projet spécifique |
| `stats` | Query | Statistiques (total, 24h, 7j, top acteurs) |

## Écrans Frontend

| Route | Composant | Description |
|-------|-----------|-------------|
| `/erp/profile` | ErpProfile | Informations personnelles + avatar |
| `/erp/profile/security` | ErpProfileSecurity | Mot de passe + paramètres sécurité |
| `/erp/profile/preferences` | ErpProfilePreferences | Langue, fuseau, devise, notifications, thème |
| `/erp/audit-logs` | ErpAuditLogs | Journal d'audit avec KPI, filtres et pagination |

## Actions tracées

Le système d'audit trace automatiquement :

- **Créations** : `erp.*.create`
- **Modifications** : `erp.*.update`
- **Suppressions** : `erp.*.delete`
- **Validations** : `erp.*.approve`, `erp.*.reject`
- **Paiements** : `erp.payments.create`
- **Changements de permissions** : `erp.roles.*`, `erp.permissions.*`
- **Profil** : `erp.profile.update`, `erp.profile.password_change`, `erp.profile.avatar_upload`, `erp.profile.preferences_update`

## Préférences par défaut

```json
{
  "language": "fr",
  "timezone": "Africa/Abidjan",
  "dateFormat": "DD/MM/YYYY",
  "currency": "XOF",
  "emailNotifications": true,
  "pushNotifications": true,
  "theme": "system"
}
```

## Tests

- 32 fichiers de tests, **906 tests PASS**
- Tests Sprint 15 : modification profil, mot de passe, avatar, préférences, sécurité, création logs, filtrage, pagination, accès admin

## Fichiers créés

- `drizzle/schema.ts` (table erp_user_profiles ajoutée)
- `drizzle/0043_*.sql` (migration)
- `server/erp/erp-profile-router.ts`
- `server/erp/erp-audit-logs-router.ts`
- `server/erp/erp-sprint15.test.ts`
- `client/src/pages/erp/ErpProfile.tsx`
- `client/src/pages/erp/ErpProfileSecurity.tsx`
- `client/src/pages/erp/ErpProfilePreferences.tsx`
- `client/src/pages/erp/ErpAuditLogs.tsx`
- `docs/SPRINT15_ERP_PROFILE_AUDIT_LOGS.md`

## Fichiers modifiés

- `server/erp/erp-router.ts` (montage profile + auditLogs)
- `client/src/App.tsx` (routes ajoutées)
