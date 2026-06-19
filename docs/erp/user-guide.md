# Guide Utilisateur — ERP Construction

## Introduction

Ce guide est destiné aux utilisateurs opérationnels de l'ERP Construction de Foncier225 : chefs de projet, ingénieurs, comptables, magasiniers et responsables sécurité. Il couvre l'ensemble des fonctionnalités accessibles depuis l'interface web.

---

## Connexion et navigation

### Première connexion

L'accès à l'ERP nécessite un compte Manus OAuth. Lors de la première connexion, cliquez sur **Se connecter** depuis la page d'accueil de Foncier225, puis authentifiez-vous avec vos identifiants Manus. Après connexion, accédez à l'ERP via le menu principal ou directement à l'adresse `/erp`.

### Interface principale

L'interface ERP se compose de trois zones :

| Zone | Description |
|------|-------------|
| **Sidebar gauche** | Navigation entre les modules (repliable) |
| **Header** | Fil d'Ariane, recherche, icône notifications, profil |
| **Zone principale** | Contenu du module actif |

La sidebar est organisée par domaine fonctionnel. Cliquez sur un domaine pour déplier ses sous-modules. L'icône de cloche dans le header affiche le nombre de notifications non lues et permet un accès rapide au panneau de notifications.

---

## Tableau de bord

Le tableau de bord (`/erp`) affiche une vue synthétique de l'activité :

| Widget | Information |
|--------|------------|
| Projets actifs | Nombre de projets en cours |
| Tâches en retard | Tâches dépassant leur échéance |
| Budget global | Somme des budgets et consommation |
| Incidents ouverts | Incidents sécurité non résolus |
| Activité récente | Dernières actions sur les projets |

---

## Gestion de projets

### Créer un projet

Depuis la page `/erp/projects`, cliquez sur **Nouveau projet**. Remplissez les champs obligatoires : nom, description, dates de début et fin prévues, budget, chef de projet et localisation. Le projet est créé en statut **Brouillon** et peut être activé ultérieurement.

### Statuts d'un projet

| Statut | Signification |
|--------|--------------|
| `draft` | Brouillon, en préparation |
| `active` | En cours d'exécution |
| `on_hold` | Suspendu temporairement |
| `completed` | Terminé avec succès |
| `cancelled` | Annulé |

### Gestion des tâches

Chaque projet possède un onglet **Tâches** (`/erp/projects/:id/tasks`) permettant de créer, assigner et suivre les tâches. Les tâches peuvent être filtrées par statut, priorité et assigné. Le pourcentage d'avancement est modifiable manuellement ou calculé automatiquement selon les sous-tâches.

### Diagramme de Gantt

L'onglet **Gantt** (`/erp/projects/:id/gantt`) affiche la planification temporelle des tâches avec leurs dépendances. Les tâches peuvent être déplacées par glisser-déposer pour ajuster les dates. Les dépendances sont représentées par des flèches entre les barres.

### Jalons

Les jalons (`/erp/projects/:id/milestones`) représentent les livrables clés du projet. Chaque jalon possède une date cible et un statut (en attente, complété, en retard). Les jalons en retard génèrent automatiquement des alertes.

---

## Documents et conformité

### Gestion documentaire

Le module Documents (`/erp/documents`) permet d'uploader, versionner et approuver les documents de projet (plans, contrats, rapports, photos). Chaque document passe par un workflow de validation :

| Étape | Action |
|-------|--------|
| 1. Upload | Le document est créé en statut **Brouillon** |
| 2. Soumission | Passage en **En attente de revue** |
| 3. Validation | Approuvé ou Rejeté par un validateur |

### Permis de construire

Le module Permis (`/erp/permits`) centralise le suivi des autorisations administratives. Chaque permis est lié à un projet et possède une date d'expiration. Les permis expirant bientôt génèrent des alertes automatiques.

### Conformité réglementaire

Le module Compliance (`/erp/compliance`) permet de définir les exigences réglementaires par projet et d'enregistrer les contrôles effectués. Le tableau de bord affiche le taux de conformité global.

---

## Ressources et équipements

### Parc matériel

Le module Équipement (`/erp/equipment`) gère l'inventaire du parc matériel : engins, outillage, véhicules. Chaque équipement peut être alloué à un projet pour une période donnée. Le calendrier de maintenance (`/erp/equipment/maintenance-calendar`) affiche les opérations préventives planifiées.

### Sécurité

Le module Sécurité (`/erp/safety`) couvre trois aspects :

| Fonction | Description |
|----------|-------------|
| **Incidents** | Déclaration et suivi des incidents de chantier |
| **Audits** | Audits de sécurité avec scoring |
| **Actions correctives** | Suivi des mesures correctives |

Les incidents de sévérité **critique** génèrent automatiquement une alerte et une notification aux responsables.

---

## Intervenants externes

### Fournisseurs

Le module Fournisseurs (`/erp/vendors`) gère le répertoire des fournisseurs avec leurs contacts, catégories et statuts. Un fournisseur peut être marqué comme **actif**, **inactif** ou **blacklisté**.

### Sous-traitants

Le module Sous-traitants (`/erp/contractors`) gère les entreprises sous-traitantes, leurs affectations aux projets et leurs contrats. Chaque contrat possède un montant, des dates et un statut.

### Évaluation des prestataires

Le module Performance (`/erp/performance-ratings`) permet d'évaluer les fournisseurs et sous-traitants selon 6 critères : qualité, délais, coût, sécurité, communication et conformité. La note globale est calculée automatiquement.

### Intégration fournisseurs

Le module Supplier Integration (`/erp/supplier-integration`) permet de comparer les prix entre fournisseurs pour un même article, de définir un fournisseur préféré et de configurer des intégrations automatiques (API, EDI, email).

---

## Finance et comptabilité

### Factures

Le module Factures (`/erp/invoices`) gère les factures entrantes (fournisseurs) et sortantes (clients). Chaque facture possède des lignes détaillées et passe par un workflow d'approbation. Les factures approuvées mettent automatiquement à jour les montants engagés du budget.

### Paiements

Le module Paiements (`/erp/payments`) enregistre les règlements effectués. Les méthodes supportées sont : virement bancaire, chèque, espèces et mobile money. Les paiements mettent automatiquement à jour les montants payés du budget.

### Budget

Le module Budget (`/erp/finance/budgets`) permet de créer des budgets par projet avec des lignes par catégorie (matériaux, main-d'œuvre, équipement, sous-traitance, frais généraux). Le budget doit être approuvé avant utilisation. L'analyse des écarts compare le prévu au réalisé.

### Trésorerie

Le module Cash Flow (`/erp/finance/cash-flow`) enregistre les entrées et sorties de trésorerie par projet. Le résumé par période et les prévisions à 30 jours aident à anticiper les besoins de financement.

### Rentabilité

Le module Profitability (`/erp/finance/profitability`) calcule la marge brute et nette par projet. Le classement permet d'identifier les projets les plus et les moins rentables.

---

## Inventaire et approvisionnement

### Stock

Le module Inventaire (`/erp/inventory`) gère les articles, emplacements et mouvements de stock. Les niveaux de stock sont surveillés : un article passant sous le seuil minimum génère une alerte **stock critique**.

### Demandes de matériaux

Le module Material Requests (`/erp/material-requests`) permet aux équipes terrain de demander des matériaux. La demande passe par un workflow d'approbation avant d'être livrée depuis le stock.

### Analyse des pertes

Le module Wastage (`/erp/wastage`) enregistre les pertes de matériaux (dommage, vol, expiration, surconsommation, intempéries, défaut). Les analyses par projet, article et cause permettent d'identifier les axes d'amélioration.

---

## Alertes et notifications

### Alertes de dépassement

Le module Overrun Alerts (`/erp/finance/overrun-alerts`) affiche les alertes générées automatiquement par le moteur de détection. Les 13 types d'alertes couvrent les dépassements budgétaires, les retards, les expirations et les situations critiques. Chaque alerte peut être acquittée pour indiquer qu'elle a été prise en compte.

### Notifications

Le centre de notifications (`/erp/notifications`) regroupe toutes les notifications personnelles. L'icône de cloche dans le header affiche un badge avec le nombre de notifications non lues. Les notifications peuvent être filtrées par module et par priorité.

---

## Profil utilisateur

### Informations personnelles

La page Profil (`/erp/profile`) permet de modifier son nom, téléphone, entreprise et poste. L'avatar peut être uploadé depuis cette page.

### Sécurité

La page Sécurité (`/erp/profile/security`) permet de changer son mot de passe et de configurer les paramètres de sécurité du compte.

### Préférences

La page Préférences (`/erp/profile/preferences`) permet de configurer :

| Préférence | Options |
|-----------|---------|
| Langue | Français, Anglais |
| Fuseau horaire | Africa/Abidjan (par défaut) |
| Format de date | DD/MM/YYYY |
| Devise | XOF |
| Notifications email | Activé/Désactivé |
| Notifications push | Activé/Désactivé |
| Thème | Clair, Sombre, Système |

---

## Erreurs fréquentes et support

| Problème | Solution |
|----------|----------|
| "Permission insuffisante" | Contactez votre administrateur pour obtenir le rôle approprié |
| "Session expirée" | Reconnectez-vous via Manus OAuth |
| Page blanche après connexion | Videz le cache du navigateur et réessayez |
| Données non mises à jour | Rafraîchissez la page (F5) |
| Fichier trop volumineux | La limite d'upload est de 16 Mo |

Pour toute autre question, contactez votre administrateur ERP ou consultez le guide administrateur.
