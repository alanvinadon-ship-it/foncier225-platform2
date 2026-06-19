# Guide Administrateur — ERP Construction

## Introduction

Ce guide est destiné aux administrateurs de l'ERP Construction de Foncier225. Il couvre la configuration initiale, la gestion des utilisateurs et des rôles, la surveillance du système, la maintenance et les procédures de support.

---

## Configuration initiale

### Prérequis

Avant de configurer l'ERP, assurez-vous que les éléments suivants sont en place :

| Élément | Détail |
|---------|--------|
| Base de données | MySQL/TiDB accessible avec `DATABASE_URL` configuré |
| OAuth | Application Manus OAuth configurée (`VITE_APP_ID`, `OAUTH_SERVER_URL`) |
| Stockage | Bucket S3 configuré pour les fichiers |
| Serveur | Node.js 22+ avec les dépendances installées |

### Premier démarrage

Lors du premier démarrage, le système crée automatiquement les rôles et permissions prédéfinis. Le premier utilisateur à se connecter avec le `OWNER_OPEN_ID` reçoit automatiquement le rôle **admin**.

### Attribution du rôle administrateur

Pour promouvoir un utilisateur en administrateur, deux méthodes sont disponibles :

1. **Via l'interface** : Depuis `/erp/admin/users`, recherchez l'utilisateur et attribuez-lui le rôle `admin`.
2. **Via SQL** : Insérez directement dans `erp_user_roles` avec le `roleId` correspondant au rôle admin.

---

## Gestion des utilisateurs

### Visualiser les utilisateurs

La page `/erp/admin/users` affiche tous les utilisateurs ayant accédé à l'ERP, avec leurs rôles actuels et leur date de dernière connexion.

### Attribuer un rôle

Depuis la page utilisateurs, cliquez sur l'utilisateur concerné puis utilisez le bouton **Attribuer un rôle**. Sélectionnez le rôle souhaité dans la liste. Un utilisateur peut posséder plusieurs rôles simultanément.

### Retirer un rôle

Depuis la fiche utilisateur, cliquez sur le badge du rôle à retirer et confirmez la suppression. L'utilisateur perd immédiatement les permissions associées.

> **Attention** : Ne retirez jamais le dernier rôle admin du système. Assurez-vous qu'au moins un administrateur reste actif.

---

## Gestion des rôles et permissions

### Rôles système vs personnalisés

| Type | Caractéristique |
|------|----------------|
| Système | Créés automatiquement, non supprimables, modifiables (permissions) |
| Personnalisé | Créés par l'admin, supprimables, entièrement configurables |

### Créer un rôle personnalisé

Depuis `/erp/admin/roles`, cliquez sur **Nouveau rôle**. Définissez un nom, une description et sélectionnez les permissions souhaitées module par module. Le rôle est immédiatement disponible pour attribution.

### Modifier les permissions d'un rôle

Depuis la page des rôles, cliquez sur un rôle pour voir et modifier ses permissions. Les modifications prennent effet immédiatement pour tous les utilisateurs possédant ce rôle.

---

## Surveillance et monitoring

### Journal d'audit

La page `/erp/audit-logs` affiche toutes les actions sensibles effectuées dans l'ERP. Les filtres disponibles sont :

| Filtre | Description |
|--------|-------------|
| Action | Type d'action (create, update, delete, approve...) |
| Acteur | Utilisateur ayant effectué l'action |
| Type d'entité | Module concerné |
| Période | Plage de dates |
| Recherche | Texte libre dans les détails |

Les statistiques en haut de page indiquent le nombre total d'actions, les actions des dernières 24h et 7 jours, ainsi que les utilisateurs les plus actifs.

### Alertes de dépassement

La page `/erp/finance/overrun-alerts` centralise les alertes générées automatiquement. En tant qu'administrateur, vous pouvez :

1. **Déclencher une vérification** : Le bouton "Vérifier maintenant" lance le moteur d'alertes sur tous les projets actifs.
2. **Acquitter une alerte** : Marquer une alerte comme prise en compte pour la retirer de la liste active.
3. **Filtrer par priorité** : Concentrez-vous sur les alertes critiques en premier.

### Types d'alertes surveillées

| Type | Priorité | Déclencheur |
|------|----------|-------------|
| Budget 75% | Medium | Consommation atteint 75% du budget |
| Budget 90% | High | Consommation atteint 90% |
| Budget 100% | Critical | Budget entièrement consommé |
| Dépassement | Critical | Consommation dépasse le budget |
| Projet en retard | High | Date fin dépassée |
| Tâche en retard | Medium | Échéance tâche dépassée |
| Jalon dépassé | High | Date jalon dépassée |
| Facture échue | Medium | Facture non payée après échéance |
| Document expiré | Low | Document passé sa date d'expiration |
| Certification expirée | Medium | Certification d'un intervenant expirée |
| Stock critique | High | Article sous le seuil minimum |
| Maintenance proche | Low | Maintenance préventive dans les 7 jours |
| Incident critique | Critical | Incident sécurité de sévérité critique |

---

## Maintenance

### Synchronisation budgétaire

Si les montants engagés ou payés d'un budget semblent incohérents, utilisez la procédure de synchronisation manuelle via l'API `erp.finance.budgetSync.syncFromInvoices`. Cette opération recalcule les montants à partir des factures et paiements réels.

### Nettoyage des données

Les suppressions dans l'ERP sont des **soft deletes** (marquage `deletedAt`). Les données ne sont jamais physiquement supprimées. Pour un nettoyage en profondeur (conformité RGPD par exemple), une intervention SQL directe est nécessaire avec sauvegarde préalable.

### Sauvegarde

La base de données TiDB cloud gère ses propres sauvegardes. Pour une sauvegarde manuelle, utilisez `mysqldump` avec les paramètres de connexion disponibles dans les variables d'environnement.

---

## Procédure de support

### Niveaux de support

| Niveau | Responsable | Périmètre |
|--------|-------------|-----------|
| N1 | Utilisateur | Consultation documentation, FAQ |
| N2 | Admin ERP | Gestion rôles, vérification données, alertes |
| N3 | Développeur | Correction bugs, évolutions, migrations |

### Diagnostic d'un problème utilisateur

1. **Vérifier les permissions** : L'utilisateur a-t-il le rôle et la permission nécessaires ?
2. **Consulter l'audit** : Y a-t-il une trace de l'action tentée dans les logs ?
3. **Vérifier les données** : L'entité existe-t-elle et n'est-elle pas soft-deleted ?
4. **Tester la session** : L'utilisateur peut-il se reconnecter ?

### Escalade

Si le problème persiste après les vérifications de niveau 2, documentez les éléments suivants avant d'escalader :

| Information | Détail |
|-------------|--------|
| Utilisateur concerné | Nom, ID, rôles |
| Action tentée | Module, procédure, paramètres |
| Erreur obtenue | Message exact, code HTTP/tRPC |
| Contexte | Date/heure, navigateur, étapes de reproduction |
| Logs pertinents | Extraits du journal d'audit |

---

## Variables d'environnement

Les variables d'environnement suivantes sont utilisées par l'ERP et ne doivent pas être modifiées manuellement en production :

| Variable | Usage |
|----------|-------|
| `DATABASE_URL` | Connexion MySQL/TiDB |
| `JWT_SECRET` | Signature des cookies de session |
| `VITE_APP_ID` | ID application Manus OAuth |
| `OAUTH_SERVER_URL` | URL serveur OAuth |
| `VITE_OAUTH_PORTAL_URL` | URL portail de connexion |
| `OWNER_OPEN_ID` | OpenID du propriétaire |
| `BUILT_IN_FORGE_API_URL` | URL API Manus (LLM, storage...) |
| `BUILT_IN_FORGE_API_KEY` | Clé API Manus (serveur) |

---

## Checklist de mise en production

Avant de mettre l'ERP en production, vérifiez les points suivants :

| Vérification | Statut |
|-------------|--------|
| Toutes les migrations appliquées | ☐ |
| Rôles et permissions initialisés | ☐ |
| Au moins un administrateur configuré | ☐ |
| Variables d'environnement définies | ☐ |
| Stockage S3 accessible | ☐ |
| OAuth fonctionnel (login/logout) | ☐ |
| Tests passants (906+) | ☐ |
| SSL/TLS activé | ☐ |
| Sauvegardes automatiques configurées | ☐ |
