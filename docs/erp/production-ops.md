# Guide d'Exploitation Production — ERP Foncier225

## 1. Architecture de déploiement

L'ERP Foncier225 est déployé sur l'infrastructure Manus en mode **Autoscale** (serverless). Le serveur Node.js (Express + tRPC) sert à la fois l'API et les fichiers statiques du client React.

| Composant | Technologie | Détails |
|-----------|-------------|---------|
| Runtime | Node.js 22 | Serveur Express unique |
| Base de données | TiDB (MySQL compatible) | Hébergée Manus, SSL requis |
| Stockage fichiers | S3 | Via helpers `storagePut`/`storageGet` |
| Authentification | Manus OAuth 2.0 | Session cookie JWT |
| Jobs planifiés | Manus Heartbeat | Endpoints `/api/scheduled/*` |

## 2. Jobs planifiés (Heartbeat)

Les jobs sont déclenchés par le service Manus Heartbeat via des requêtes HTTP POST sur des endpoints protégés par un header secret.

| Job | Endpoint | Fréquence | Description |
|-----|----------|-----------|-------------|
| Alertes ERP | `/api/scheduled/erp-alerts` | Toutes les heures | Dépassements budget, factures échues, docs expirés |
| Snapshots Budget | `/api/scheduled/budget-snapshots` | Quotidien (02h00) | Snapshots P&L et Cash Flow |
| Intégration Budget | `/api/scheduled/budget-integrations` | Quotidien (03h00) | Full sync budget/objectifs/ventes |
| Alertes Retard | `/api/scheduled/delay-alerts` | Toutes les heures | Échéances client, RFQ expirées |
| Rappels RDV | `/api/scheduled/appointment-reminders` | Toutes les 30min | Rappels de rendez-vous |

### Sécurité des endpoints scheduled

Chaque endpoint vérifie le header `x-manus-secret` contre la variable d'environnement `HEARTBEAT_SECRET`. Les requêtes sans ce header reçoivent une réponse 401.

### Monitoring des jobs

La page **ERP > Admin > Jobs Planifiés** (`/erp/scheduled-jobs`) permet de :
- Visualiser l'historique d'exécution de chaque job
- Voir le statut (success/failed), la durée, et les erreurs
- Relancer manuellement le job d'intégration budget

## 3. Monitoring système

La page **ERP > Admin > Santé Système** (`/erp/system-health`) affiche :
- Nombre d'utilisateurs, événements d'audit (24h), jobs exécutés
- Mémoire serveur (RSS, Heap), uptime, version Node.js
- Derniers événements d'audit (actions, cibles, dates)
- Alertes sur les jobs échoués (7 derniers jours)

## 4. Contrôle qualité données

La page **ERP > Admin > Qualité Globale** (`/erp/admin-data-quality`) exécute 11 contrôles automatiques :

| Contrôle | Module | Sévérité |
|----------|--------|----------|
| Projets sans budget | projects | Critique |
| Dépenses sans catégorie | expenses | Critique |
| Factures échues | invoices | Critique |
| Documents expirés | documents | Warning |
| Fournisseurs sans info fiscale | vendors | Critique |
| Équipements non assignés | equipment | Warning |
| Actions Direction en retard | direction | Critique |
| Projets en retard | projects | Critique |
| Ventes en attente longue | sales | Warning |
| Dépenses en attente d'approbation | expenses | Warning |
| Fournisseurs sans évaluation | vendors | Warning |

Une notification est envoyée au propriétaire si des erreurs critiques sont détectées.

## 5. Sauvegarde et restauration

### Base de données
La base TiDB est gérée par Manus avec des sauvegardes automatiques. Pour une restauration manuelle :
1. Accéder au panneau Database dans l'interface de gestion
2. Les informations de connexion sont disponibles dans les paramètres (Settings > Database)
3. Utiliser un client MySQL compatible pour exporter/importer les données

### Fichiers S3
Les fichiers uploadés (documents, rapports PDF, pièces jointes) sont stockés sur S3 avec des clés non-énumérables. Les URLs sont persistées en base de données.

## 6. Variables d'environnement critiques

| Variable | Usage |
|----------|-------|
| `DATABASE_URL` | Connexion TiDB |
| `JWT_SECRET` | Signature des cookies de session |
| `HEARTBEAT_SECRET` | Protection des endpoints scheduled |
| `BUILT_IN_FORGE_API_KEY` | API Manus (LLM, storage, notifications) |

## 7. Procédures d'urgence

### Job échoué
1. Consulter `/erp/scheduled-jobs` pour identifier l'erreur
2. Vérifier les logs dans `.manus-logs/devserver.log`
3. Relancer manuellement via le bouton "Lancer" ou corriger la cause

### Erreur de qualité données critique
1. Consulter `/erp/admin-data-quality` pour le détail
2. Corriger les données via les modules ERP concernés
3. Relancer le contrôle pour valider la correction

### Serveur non-responsive
1. Vérifier le statut via le Dashboard de gestion
2. Redémarrer le serveur via l'interface Manus
3. Vérifier les logs après redémarrage
