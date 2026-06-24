# Architecture du Système de Paramétrage Solaire

**Module** : ERP Énergie Solaire — Foncier225  
**Version** : 2.0  
**Date** : 24 juin 2026  
**Auteur** : Manus AI

---

## 1. Vue d'ensemble

Le système de paramétrage solaire de Foncier225 implémente une architecture à trois niveaux permettant de gérer les paramètres de dimensionnement, de budgétisation et de câblage pour les installations photovoltaïques en Côte d'Ivoire et en Afrique de l'Ouest.

L'architecture repose sur le principe de **résolution par héritage** : chaque projet peut hériter des paramètres globaux ou les surcharger localement, offrant ainsi une flexibilité maximale tout en garantissant la cohérence des calculs.

---

## 2. Architecture à 3 niveaux

| Niveau | Table DB | Portée | Priorité |
|--------|----------|--------|----------|
| Global | `erp_solar_global_settings` | Tous les projets | Basse (défaut) |
| Site/Projet | `erp_solar_site_settings` | Un projet spécifique | Haute (override) |
| Formules | `erp_solar_calculation_formulas` | Moteur de calcul | Versionnée |

La résolution des paramètres suit l'algorithme suivant :

```
resolve(projectId, parameterCode) →
  1. Chercher dans site_settings WHERE projectId AND parameterCode
  2. Si trouvé → retourner la valeur site
  3. Sinon → retourner la valeur de global_settings WHERE parameterCode
```

---

## 3. Tables de données

### 3.1 `erp_solar_global_settings`

Stocke les 33 paramètres globaux par défaut, organisés en 10 groupes :

| Groupe | Paramètres | Exemples |
|--------|-----------|----------|
| `general` | Rendement global, tension nominale | R=0.70, TN=48V |
| `pv` | Puissance unitaire panneau, rendement PV | PUP=400Wc |
| `battery` | Taux décharge Li/Pb, autonomie | D_Li=0.80, AUTONOMIE=4j |
| `inverter` | Marge sécurité onduleur | MARGE_OND=1.25 |
| `cable` | Résistivité cuivre, longueurs câbles | Rho=0.0179, LC_POR=20m |
| `budget` | Marges, taux TVA | MARGE_INGENIERIE=15% |
| `environment` | Ensoleillement local | ENSOL_LOCAL=4.5 PSH |
| `regulator` | Paramètres régulateur | MARGE_REG=1.25 |
| `monitoring` | Coûts monitoring | — |
| `installation` | Coûts main d'œuvre | — |

### 3.2 `erp_solar_site_settings`

Permet de surcharger n'importe quel paramètre global pour un projet spécifique. Chaque entrée contient :

- `solarProjectId` : référence au projet
- `parameterCode` : code du paramètre à surcharger
- `value` : nouvelle valeur (décimale)
- `overrideReason` : justification de la surcharge
- `overriddenBy` : utilisateur ayant effectué la surcharge

### 3.3 `erp_solar_calculation_formulas`

Stocke les formules de calcul versionnées avec gestion du cycle de vie :

| Champ | Description |
|-------|-------------|
| `formulaCode` | Identifiant unique (ex: `PV_POWER_WC`) |
| `formulaGroup` | Catégorie (pv_sizing, battery_sizing, etc.) |
| `version` | Numéro de version auto-incrémenté |
| `expression` | Expression mathématique |
| `status` | `draft` → `active` → `deprecated` |
| `inputParameters` | Variables d'entrée |
| `outputUnit` | Unité de sortie |

### 3.4 `erp_solar_calculation_runs`

Sauvegarde un snapshot complet à chaque exécution du moteur de calcul :

- Snapshot des paramètres utilisés (globaux + overrides)
- Snapshot des résultats de calcul
- Type de calcul (`sizing` ou `budget`)
- Horodatage et utilisateur

### 3.5 `erp_solar_budget_parameters`

Paramètres spécifiques au calcul budgétaire (marges, TVA, coefficients).

---

## 4. Routeurs tRPC

### 4.1 `solarSettings.global`

| Procédure | Type | Description |
|-----------|------|-------------|
| `list` | Query | Liste tous les paramètres globaux (filtre par groupe) |
| `getByCode` | Query | Récupère un paramètre par son code |
| `upsert` | Mutation | Crée ou met à jour un paramètre global |
| `bulkUpdate` | Mutation | Met à jour plusieurs paramètres en une fois |

### 4.2 `solarSettings.site`

| Procédure | Type | Description |
|-----------|------|-------------|
| `list` | Query | Liste les overrides d'un projet |
| `upsert` | Mutation | Crée ou met à jour un override |
| `resetToGlobal` | Mutation | Supprime un override (retour au global) |
| `resolve` | Query | Résout la valeur effective d'un paramètre |

### 4.3 `solarSettings.formulas`

| Procédure | Type | Description |
|-----------|------|-------------|
| `list` | Query | Liste les formules (filtre par groupe/statut) |
| `create` | Mutation | Crée une nouvelle version de formule |
| `activate` | Mutation | Active une formule (déprécie les précédentes) |
| `duplicate` | Mutation | Duplique une formule pour créer une nouvelle version |

### 4.4 `solarSettings.runs`

| Procédure | Type | Description |
|-----------|------|-------------|
| `list` | Query | Historique des calculs d'un projet |
| `getById` | Query | Détail d'un run avec snapshot |

---

## 5. Moteur de calcul refondu

Le moteur de calcul (`sizing.calculate` et `budget.calculate`) utilise désormais l'algorithme suivant :

```
1. Charger les paramètres globaux depuis erp_solar_global_settings
2. Charger les overrides du projet depuis erp_solar_site_settings
3. Fusionner (override > global) pour obtenir les paramètres effectifs
4. Exécuter les calculs avec les paramètres effectifs
5. Sauvegarder un snapshot dans erp_solar_calculation_runs
6. Retourner les résultats + invalider le cache frontend
```

Les paramètres résolus sont convertis en un objet `DesignInputs` compatible avec le moteur existant, assurant la rétrocompatibilité.

---

## 6. Interface utilisateur

### 6.1 Paramétrage Global (`/erp/solar/settings/global`)

Page avec 10 onglets correspondant aux groupes de paramètres. Chaque paramètre affiche :
- Code, nom, valeur actuelle, unité, description
- Bouton d'édition inline avec validation
- Indicateur visuel de modification

### 6.2 Paramétrage Projet (`/erp/solar/:id/settings`)

Page accessible depuis le bouton "Paramètres" du détail projet. Affiche :
- Liste des paramètres avec valeur globale vs valeur projet
- Possibilité de surcharger avec justification obligatoire
- Bouton "Réinitialiser" pour revenir à la valeur globale
- Badge visuel pour les paramètres surchargés

### 6.3 Formules (`/erp/solar/formulas`)

Page de gestion des formules versionnées :
- Filtre par catégorie (PV, batteries, onduleur, câblage, budget, rendement, régulateur)
- Affichage de l'expression en mode code (fond noir, texte vert)
- Statut visuel (draft, active, dépréciée)
- Actions : activer, dupliquer, créer nouvelle version

---

## 7. Audit et traçabilité

Chaque modification de paramètre ou de formule génère un enregistrement d'audit via `createAuditLog()` :

```typescript
{
  userId: string,
  action: "update_global_setting" | "create_formula" | "activate_formula",
  module: "solar_settings" | "solar_formulas",
  parameterCode: string,
  previousValue?: string,
  newValue: string,
}
```

---

## 8. Sécurité et RBAC

L'accès au paramétrage est contrôlé par le module RBAC `erp_solar` :

| Action | Rôle minimum |
|--------|-------------|
| Consulter les paramètres | `viewer` |
| Modifier les paramètres globaux | `admin` |
| Surcharger un paramètre projet | `project_manager` |
| Créer/activer une formule | `admin` |
| Consulter l'historique des runs | `viewer` |

---

## 9. Seed initial

33 paramètres globaux sont seedés automatiquement lors du déploiement, couvrant tous les besoins de calcul pour les installations solaires en Côte d'Ivoire (ensoleillement moyen 4.5 PSH, tension 48V, panneaux 400Wc).

---

## 10. Évolutions futures

- **Import/Export** : Export des paramètres en JSON/Excel pour partage entre instances
- **Historique des valeurs** : Timeline des modifications avec diff visuel
- **Alertes** : Notification quand un paramètre est modifié (impact sur les projets en cours)
- **Validation IA** : L'IA vérifie la cohérence des paramètres avant calcul
- **Templates de paramétrage** : Jeux de paramètres pré-configurés par type d'installation
