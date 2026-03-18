# V1.4-01 Pilot Deployment

## Strategie retenue

Le repo dispose deja de scripts `pnpm check`, `pnpm test`, `pnpm build`, `pnpm start` et `pnpm db:push`. Pour un premier pilote, la strategie la plus simple et la plus realiste est :

- variables d'environnement explicites via `.env`
- deploiement applicatif par runbook
- scripts PowerShell d'appoint pour deploiement et smoke tests
- endpoint `/healthz` minimal pour supervision et verification rapide

Cette approche evite d'introduire Docker, PM2 ou systemd tant qu'aucune stack d'orchestration officielle n'est deja imposee.

## Variables d'environnement

### Requises

- `DATABASE_URL`
- `JWT_SECRET`
- `VITE_APP_ID`
- `OAUTH_SERVER_URL`
- `VITE_OAUTH_PORTAL_URL`
- `BUILT_IN_FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY`

### Recommandees

- `OWNER_OPEN_ID`
- `PORT`
- `NODE_ENV=production`

### Optionnelles

- `VITE_ANALYTICS_ENDPOINT`
- `VITE_ANALYTICS_WEBSITE_ID`
- `CREDIT_WORKFLOW_ENABLED`
- `DOCUMENT_GENERATION_ENABLED`
- `BANK_PORTAL_ENABLED`

## Pre-requis systeme

- Node.js 20+
- pnpm compatible avec `packageManager`
- acces reseau a la base de donnees
- acces reseau au proxy Forge storage
- variables d'environnement renseignees dans `.env`

## Ordre de deploiement recommande

1. Copier `.env.example` vers `.env`
2. Renseigner toutes les variables requises
3. Sauvegarder la base de donnees
4. Executer `pnpm install --frozen-lockfile`
5. Executer `pnpm check`
6. Executer `pnpm test`
7. Executer `pnpm build`
8. Executer `pnpm db:push`
9. Demarrer avec `pnpm start`
10. Lancer les smoke tests

## Commandes

### Preparation pilote

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-pilot.ps1
```

### Preparation pilote sans reexecuter tests

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-pilot.ps1 -SkipTests
```

### Demarrage applicatif

```powershell
pnpm start
```

## Smoke tests post-deploiement

### Script rapide

```powershell
powershell -ExecutionPolicy Bypass -File scripts/smoke-pilot.ps1 -BaseUrl "http://localhost:3000"
```

### Scenarios manuels minimums

#### Public

- ouvrir `/`
- ouvrir `/verify`
- verifier un token invalide
- verifier un token document valide
- verifier un token attestation finale valide

#### Citizen

- se connecter
- ouvrir `/citizen`
- ouvrir `/citizen/credit-habitat`
- ouvrir un dossier existant

#### Bank

- se connecter
- ouvrir `/bank/credit-files`
- ouvrir un dossier existant

#### Admin

- se connecter
- ouvrir `/admin/documents`
- verifier la liste documentaire
- generer un PDF parcelle ou dossier

## Verification DB / migrations

- `drizzle/meta/_journal.json` doit refleter les migrations presentes
- `pnpm db:push` reste la commande de migration retenue par le repo
- sur une base deja alimentee, effectuer un backup avant migration
- verifier apres migration :
  - acces auth
  - listing citizen
  - listing bank
  - listing admin documents
  - verify public

## Logs et supervision minimale

Verifier en priorite :

- demarrage serveur
- erreurs OAuth
- erreurs `verify.check`
- erreurs upload/download documentaire
- erreurs bank transitions
- erreurs emission attestation finale

L'endpoint de sante minimal est :

- `GET /healthz`

## Rollback

### Conditions de rollback

- build de production instable
- erreurs critiques auth
- verify public non fonctionnel
- generation ou telechargement documentaire casse
- transition credit critique invalide

### Procedure recommandee

1. Arreter le service courant
2. Restaurer le package applicatif precedent
3. Restaurer la configuration precedente si elle a change
4. Si une migration a ete appliquee :
   - restaurer la sauvegarde DB si un rollback SQL propre n'est pas disponible
   - sinon appliquer la procedure SQL de retour definie par l'exploitation
5. Redemarrer l'ancienne version
6. Rejouer les smoke tests minimums

## Checklist go / no-go pilote

- `.env` complet
- backup DB effectue
- `pnpm check` OK
- `pnpm test` OK
- `pnpm build` OK
- `pnpm db:push` OK
- `pnpm start` OK
- `/healthz` OK
- smoke script PASS
- verify public OK
- citizen credit detail OK
- bank detail OK
- admin documents OK

## Verdict attendu

Pilote pret si les validations techniques sont vertes et que les smoke tests post-deploiement sont PASS.
