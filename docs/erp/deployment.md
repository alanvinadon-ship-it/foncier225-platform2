# Guide de déploiement

## Vue d'ensemble

L'ERP Construction de Foncier225 est déployé sur l'infrastructure **Manus** en mode **Autoscale** (serverless). Le déploiement est géré via l'interface Manus avec un système de checkpoints et de publication.

---

## Architecture de déploiement

| Composant | Service | Détail |
|-----------|---------|--------|
| Frontend | Manus CDN | React SPA bundlé par Vite |
| Backend | Manus Autoscale | Node.js Express + tRPC |
| Base de données | TiDB Cloud | MySQL compatible, haute disponibilité |
| Stockage | S3 | Fichiers, avatars, documents |
| Authentification | Manus OAuth | SSO centralisé |

### Caractéristiques du runtime

| Paramètre | Valeur |
|-----------|--------|
| Runtime | Node.js (image Cloud Run) |
| CPU | 1 vCPU |
| RAM | 512 MiB |
| Timeout requête | 180 secondes |
| Min instances | 0 (cold starts possibles) |
| Auto-scaling | Basé sur le trafic |

---

## Procédure de déploiement

### Prérequis

Avant de déployer, assurez-vous que :

1. Tous les tests passent (`pnpm test -- --run`)
2. TypeScript compile sans erreur (`npx tsc --noEmit`)
3. Les migrations sont à jour en base
4. Un checkpoint a été sauvegardé

### Étapes

1. **Sauvegarder un checkpoint** : Depuis l'interface Manus, créez un checkpoint qui capture l'état actuel du code.

2. **Vérifier le preview** : Utilisez l'URL de preview pour valider le comportement en environnement sandbox.

3. **Publier** : Cliquez sur le bouton **Publish** dans l'interface Manus. Le système build le projet et le déploie automatiquement.

4. **Vérifier en production** : Accédez au domaine de production et testez les fonctionnalités critiques.

---

## Variables d'environnement

Les variables d'environnement sont gérées via l'interface Manus (Settings → Secrets). Elles sont automatiquement injectées au runtime.

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | Oui | URL de connexion MySQL/TiDB |
| `JWT_SECRET` | Oui | Secret pour signer les JWT |
| `VITE_APP_ID` | Oui | ID application OAuth |
| `OAUTH_SERVER_URL` | Oui | URL serveur OAuth |
| `VITE_OAUTH_PORTAL_URL` | Oui | URL portail login |
| `OWNER_OPEN_ID` | Oui | OpenID du propriétaire |
| `OWNER_NAME` | Oui | Nom du propriétaire |
| `BUILT_IN_FORGE_API_URL` | Oui | URL API Manus |
| `BUILT_IN_FORGE_API_KEY` | Oui | Clé API Manus (serveur) |
| `VITE_FRONTEND_FORGE_API_KEY` | Oui | Clé API Manus (client) |
| `VITE_FRONTEND_FORGE_API_URL` | Oui | URL API Manus (client) |

> **Important** : Ne jamais commiter de fichier `.env` dans le dépôt. Les secrets sont gérés exclusivement via l'interface Manus.

---

## Domaines

Le projet est accessible via les domaines suivants :

| Type | Domaine |
|------|---------|
| Production | `foncier225-5jqvpxra.manus.space` |
| Preview | URL générée par checkpoint |
| Personnalisé | Configurable via Settings → Domains |

Pour configurer un domaine personnalisé, accédez à Settings → Domains dans l'interface Manus et suivez les instructions de configuration DNS.

---

## Base de données

### Connexion

La base de données TiDB est accessible via l'URL `DATABASE_URL`. La connexion utilise SSL par défaut.

| Paramètre | Valeur |
|-----------|--------|
| Moteur | MySQL 8.0 compatible (TiDB) |
| SSL | Requis |
| Pool | Géré par Drizzle ORM |

### Migrations en production

Les migrations sont appliquées automatiquement lors du déploiement via `pnpm db:push`. En cas de migration manuelle nécessaire, utilisez la console DB de l'interface Manus (Database panel).

> **Attention** : Les opérations destructives (DROP TABLE, DROP COLUMN) sont irréversibles. Toujours sauvegarder avant d'exécuter des migrations destructives.

---

## Monitoring

### Logs

Les logs de l'application sont accessibles via :

| Source | Emplacement |
|--------|-------------|
| Serveur | `.manus-logs/devserver.log` (dev) |
| Console navigateur | `.manus-logs/browserConsole.log` (dev) |
| Réseau | `.manus-logs/networkRequests.log` (dev) |
| Production | Dashboard Manus |

### Métriques

Le dashboard Manus (accessible via le panneau Management UI) fournit :

| Métrique | Description |
|----------|-------------|
| UV/PV | Visiteurs uniques et pages vues |
| Temps de réponse | Latence des requêtes |
| Erreurs | Taux d'erreur HTTP |
| Disponibilité | Uptime du service |

---

## Rollback

En cas de problème après un déploiement, le rollback s'effectue via l'interface Manus :

1. Accédez à la liste des checkpoints (More → Version history)
2. Sélectionnez le checkpoint stable précédent
3. Cliquez sur **Rollback**
4. Republiez depuis le checkpoint restauré

---

## Limites et contraintes

| Contrainte | Détail |
|-----------|--------|
| Pas de binaires natifs | Seuls les packages npm sont disponibles |
| Pas de processus persistants | Les workers doivent terminer dans le timeout |
| Cold starts | Première requête après inactivité peut prendre 2-5s |
| Taille upload | 16 Mo max par fichier |
| Pas de cron natif | Utiliser Manus Heartbeat pour les tâches planifiées |

### Tâches planifiées

Pour les opérations récurrentes (vérification des alertes, nettoyage, synchronisations), utiliser le système **Manus Heartbeat** qui permet de déclencher des endpoints à intervalles réguliers.

---

## Checklist de déploiement

| Étape | Vérification |
|-------|-------------|
| 1 | Tests passants (`pnpm test -- --run`) |
| 2 | TypeScript sans erreur (`npx tsc --noEmit`) |
| 3 | Migrations appliquées |
| 4 | Variables d'environnement configurées |
| 5 | Checkpoint sauvegardé |
| 6 | Preview fonctionnel |
| 7 | Publication via bouton Publish |
| 8 | Vérification post-déploiement |
| 9 | Test login OAuth en production |
| 10 | Test fonctionnalités critiques |
