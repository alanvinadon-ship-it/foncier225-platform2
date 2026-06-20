# Guide Utilisateur — ERP Construction Foncier225

## 1. Accès à l'ERP

L'ERP est accessible via le menu principal de Foncier225 ou directement à l'URL `/erp`. L'authentification se fait via Manus OAuth (connexion unique).

### Rôles disponibles

| Rôle | Accès principal |
|------|----------------|
| Super Admin | Toutes les fonctionnalités |
| Admin ERP | Tout sauf les paiements |
| Chef de Projet | Projets, Gantt, documents, entrepreneurs |
| Finance Manager | Finances, budgets, achats, dépenses, comptabilité, direction |
| Safety Officer | Sécurité, conformité, équipements |
| Inventory Manager | Stocks, équipements, commandes |
| Viewer | Lecture seule sur tous les modules |
| Contractor | Projets assignés, documents, sécurité |
| Vendor | Commandes, livraisons, documents |

## 2. Navigation

La sidebar gauche organise les modules par catégorie :
- **Opérationnel** : Projets, Gantt, Documents, Permis, Conformité, Équipements, Sécurité
- **Fournisseurs** : Fournisseurs, Entrepreneurs, Certifications, Performance
- **Achats** : Dashboard, Demandes, Bons de commande, Réceptions, RFQ, Rapprochement
- **Finance** : Factures, Paiements, Budgets, Trésorerie, Rentabilité, Alertes
- **Vente Immobilière** : Programmes, Unités, Clients, Réservations, Ventes, Encaissements
- **Comptabilité** : Journaux, Écritures, Balance, Export
- **Direction** : Dashboard 360, Drill-down KPI, Revues, Actions, Diffusion, Qualité

## 3. Module Direction

### Dashboard 360
Vue consolidée de tous les KPIs de l'entreprise :
- Chiffre d'affaires, marge brute, taux de recouvrement
- Graphiques P&L, Cash Flow, Budget vs Réalisé
- Alertes actives et objectifs commerciaux

### Drill-down KPI
Cliquez sur un KPI pour explorer les données détaillées avec filtres par période et module.

### Revues Mensuelles
Workflow de revue de direction :
1. **Créer** une revue (titre, période, participants)
2. **Soumettre** pour approbation
3. **Approuver** ou demander des modifications
4. **Clôturer** avec commentaires

### Plans d'Actions
Suivi des actions décidées en comité de direction :
- Création avec responsable, priorité, date d'échéance
- Suivi de progression (0-100%)
- Alertes automatiques sur les actions en retard

### Diffusion Rapports
Planification de l'envoi automatique de rapports PDF par email aux destinataires configurés.

### Qualité Données
Contrôles automatiques sur la cohérence des données ERP avec score qualité global.

## 4. Exports et rapports

### Export PDF Direction
Depuis le Dashboard 360, cliquez sur "Exporter PDF" pour générer un rapport analytique complet incluant :
- Résumé exécutif avec KPIs
- Analyse P&L et Cash Flow
- État des ventes immobilières
- Alertes et recommandations

### Exports comptables
Les modules Finance et Comptabilité proposent des exports CSV/Excel pour intégration avec les logiciels comptables externes.

## 5. Notifications

Le système envoie des notifications pour :
- Alertes de dépassement budget
- Factures arrivant à échéance
- Documents expirés
- Actions de direction en retard
- Résultats des contrôles qualité

Les notifications sont accessibles via l'icône cloche dans la barre supérieure.

## 6. Support

En cas de problème :
1. Vérifier les permissions de votre rôle ERP
2. Consulter ce guide utilisateur
3. Contacter l'administrateur ERP de votre organisation
