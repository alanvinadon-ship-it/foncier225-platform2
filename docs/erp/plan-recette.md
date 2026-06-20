# Plan de Recette — ERP Construction Foncier225

## 1. Objectif

Ce document définit les scénarios de test fonctionnel pour la recette de l'ERP Foncier225 avant mise en production. Chaque scénario doit être validé par l'équipe métier.

## 2. Environnement de recette

| Élément | Détail |
|---------|--------|
| URL | URL de prévisualisation Manus |
| Comptes test | Admin ERP, Finance Manager, Chef de Projet, Viewer |
| Données | Jeu de données de test (projets, budgets, factures) |

## 3. Scénarios de recette

### 3.1 Authentification et RBAC

| # | Scénario | Résultat attendu | Statut |
|---|----------|-------------------|--------|
| 1 | Connexion avec compte admin | Accès complet à tous les modules | [ ] |
| 2 | Connexion avec compte viewer | Lecture seule, pas de boutons d'action | [ ] |
| 3 | Accès à un module non autorisé | Message "Accès refusé" | [ ] |
| 4 | Déconnexion | Retour à la page de login | [ ] |

### 3.2 Gestion de projets

| # | Scénario | Résultat attendu | Statut |
|---|----------|-------------------|--------|
| 5 | Créer un projet | Projet visible dans la liste | [ ] |
| 6 | Modifier le statut d'un projet | Statut mis à jour, audit log créé | [ ] |
| 7 | Assigner un entrepreneur | Entrepreneur visible sur le projet | [ ] |
| 8 | Visualiser le Gantt | Diagramme affiché avec les tâches | [ ] |

### 3.3 Finance et Budget

| # | Scénario | Résultat attendu | Statut |
|---|----------|-------------------|--------|
| 9 | Créer une facture | Facture visible, numéro auto-généré | [ ] |
| 10 | Enregistrer un paiement | Solde mis à jour, notification | [ ] |
| 11 | Créer un budget prévisionnel | Budget avec lignes et périodes | [ ] |
| 12 | Vérifier alerte dépassement | Alerte créée si budget > seuil | [ ] |

### 3.4 Vente Immobilière

| # | Scénario | Résultat attendu | Statut |
|---|----------|-------------------|--------|
| 13 | Créer un programme immobilier | Programme avec unités | [ ] |
| 14 | Enregistrer une réservation | Unité marquée "réservée" | [ ] |
| 15 | Finaliser une vente | Vente enregistrée, paiements planifiés | [ ] |
| 16 | Encaisser un paiement client | Solde client mis à jour | [ ] |

### 3.5 Direction et Gouvernance

| # | Scénario | Résultat attendu | Statut |
|---|----------|-------------------|--------|
| 17 | Accéder au Dashboard 360 | KPIs affichés, graphiques chargés | [ ] |
| 18 | Exporter un rapport PDF | PDF généré et téléchargeable | [ ] |
| 19 | Créer une revue mensuelle | Revue en statut "brouillon" | [ ] |
| 20 | Soumettre et approuver une revue | Workflow complet validé | [ ] |
| 21 | Créer un plan d'action | Action avec responsable et échéance | [ ] |
| 22 | Drill-down sur un KPI | Données détaillées affichées | [ ] |
| 23 | Lancer contrôle qualité données | Score calculé, résultats affichés | [ ] |

### 3.6 Jobs et Monitoring

| # | Scénario | Résultat attendu | Statut |
|---|----------|-------------------|--------|
| 24 | Accéder à Santé Système | Métriques serveur affichées | [ ] |
| 25 | Consulter historique jobs | Liste des exécutions avec statuts | [ ] |
| 26 | Lancer manuellement un job | Job exécuté, résultat affiché | [ ] |
| 27 | Vérifier notifications admin | Notifications reçues pour erreurs critiques | [ ] |

### 3.7 Comptabilité

| # | Scénario | Résultat attendu | Statut |
|---|----------|-------------------|--------|
| 28 | Créer une écriture comptable | Écriture équilibrée (débit = crédit) | [ ] |
| 29 | Valider un journal | Journal verrouillé après validation | [ ] |
| 30 | Exporter la balance | Fichier CSV/Excel généré | [ ] |

## 4. Critères d'acceptation

- Tous les scénarios critiques (1-16, 17-23) doivent être validés
- Aucune erreur bloquante en production
- Temps de réponse < 3 secondes pour toutes les pages
- 0 erreur TypeScript, tous les tests automatisés passent

## 5. Procédure de validation

1. L'équipe métier exécute les scénarios dans l'ordre
2. Chaque scénario est marqué OK/KO avec commentaires
3. Les KO sont remontés pour correction
4. Après correction, re-test des scénarios KO
5. Validation finale par le responsable projet
