# Cahier des Charges Administratif

## Demande d'Interfaçage auprès de l'ARTCI

### Interconnexion Foncier225 avec les Plateformes Numériques de l'État (SIGFU, IDUFCI, SIFOR-CI)

**Version :** 1.0  
**Date :** 12 juin 2026  
**Référence :** CDA-F225-ARTCI-2026-001  
**Classification :** Officiel — Diffusion restreinte  
**Destinataire :** Monsieur le Directeur Général de l'ARTCI  

---

## Table des matières

1. [Objet de la demande](#1-objet-de-la-demande)
2. [Identification du demandeur](#2-identification-du-demandeur)
3. [Contexte et justification](#3-contexte-et-justification)
4. [Cadre juridique applicable](#4-cadre-juridique-applicable)
5. [Description des systèmes concernés](#5-description-des-systèmes-concernés)
6. [Périmètre technique de l'interfaçage](#6-périmètre-technique-de-linterfaçage)
7. [Engagements du demandeur](#7-engagements-du-demandeur)
8. [Mesures de sécurité et de protection des données](#8-mesures-de-sécurité-et-de-protection-des-données)
9. [Plan de mise en œuvre](#9-plan-de-mise-en-œuvre)
10. [Conditions financières](#10-conditions-financières)
11. [Pièces jointes au dossier](#11-pièces-jointes-au-dossier)
12. [Formulaire de soumission](#12-formulaire-de-soumission)

---

## 1. Objet de la demande

La présente demande a pour objet de solliciter auprès de l'Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire (ARTCI) l'autorisation d'interfaçage de la plateforme numérique **Foncier225** avec les systèmes d'information foncière de l'État ivoirien, conformément aux dispositions de la loi n°2024-352 du 06 juin 2024 relative aux communications électroniques et aux conditions définies dans la consultation publique de l'ARTCI relative à l'accès ouvert aux API (juin 2025).

L'interfaçage sollicité concerne spécifiquement les trois systèmes suivants :

| Système | Organisme gestionnaire | Nature de l'interfaçage |
|---------|----------------------|------------------------|
| SIGFU (Système Intégré de Gestion du Foncier Urbain) | Ministère de la Construction, du Logement et de l'Urbanisme (MCLU) | Bidirectionnel |
| IDUFCI (Identifiant Unique du Foncier de Côte d'Ivoire) | MCLU / DMISSA | Bidirectionnel |
| SIFOR-CI (Système d'Information du Foncier Rural) | Agence Foncière Rurale (AFOR) | Bidirectionnel |

---

## 2. Identification du demandeur

### 2.1 Informations sur la société

| Rubrique | Information |
|----------|------------|
| **Dénomination sociale** | [Raison sociale de l'entreprise exploitant Foncier225] |
| **Forme juridique** | [SARL / SA / SAS] |
| **Capital social** | [Montant] FCFA |
| **Siège social** | [Adresse complète], Abidjan, Côte d'Ivoire |
| **RCCM** | [Numéro du Registre du Commerce et du Crédit Mobilier] |
| **Numéro contribuable (DGI)** | [Numéro fiscal] |
| **Date de création** | [Date] |
| **Objet social** | Développement et exploitation de solutions numériques pour la gestion foncière |
| **Effectif** | [Nombre de salariés] |
| **Chiffre d'affaires (N-1)** | [Montant] FCFA |

### 2.2 Représentant légal

| Rubrique | Information |
|----------|------------|
| **Nom et prénoms** | [Nom complet du dirigeant] |
| **Qualité** | [Directeur Général / Gérant] |
| **Téléphone** | [Numéro] |
| **Email** | [Adresse email] |

### 2.3 Responsable technique du projet

| Rubrique | Information |
|----------|------------|
| **Nom et prénoms** | [Nom du responsable technique] |
| **Fonction** | Directeur Technique / CTO |
| **Téléphone** | [Numéro] |
| **Email** | [Adresse email] |

### 2.4 Délégué à la protection des données (DPO)

| Rubrique | Information |
|----------|------------|
| **Nom et prénoms** | [Nom du DPO] |
| **Téléphone** | [Numéro] |
| **Email** | [Adresse email] |
| **Numéro de déclaration ARTCI** | [Numéro si déjà déclaré] |

---

## 3. Contexte et justification

### 3.1 Présentation de la plateforme Foncier225

Foncier225 est une plateforme numérique de services fonciers destinée aux citoyens, aux professionnels du foncier et aux administrations de Côte d'Ivoire. Elle offre un guichet numérique unifié permettant la dématérialisation des procédures foncières, le suivi des dossiers, le paiement en ligne des taxes et frais, et la prise de rendez-vous avec les agents fonciers.

La plateforme est actuellement opérationnelle et propose les services suivants :

- Enregistrement et suivi des demandes de titres fonciers
- Demandes d'Arrêtés de Concession Définitive (ACD)
- Demandes de crédit foncier
- Paiement des taxes foncières (via TrésorPay et CinetPay)
- Géolocalisation GPS des parcelles
- Prise de rendez-vous en ligne avec les agents fonciers
- Notifications multicanal (email, SMS, in-app)

### 3.2 Justification de la demande d'interfaçage

L'interconnexion avec les systèmes étatiques est motivée par les considérations suivantes :

**Intérêt public.** L'interfaçage permettra de réduire significativement les délais de traitement des procédures foncières en éliminant les doubles saisies, les déplacements physiques inutiles et les pertes de documents. Le citoyen bénéficiera d'un suivi en temps réel de ses dossiers sans avoir à se rendre physiquement aux guichets.

**Sécurisation foncière.** La vérification automatique des IDUFCI et la synchronisation avec les registres officiels contribueront à réduire les litiges fonciers liés aux doubles ventes, aux faux documents ou aux erreurs d'identification des parcelles.

**Modernisation de l'administration.** L'interfaçage s'inscrit dans la stratégie nationale de transformation numérique et contribue à l'atteinte des objectifs du Plan National de Développement (PND 2021-2025) en matière de gouvernance numérique.

**Conformité au RGI.** Le Décret N°2021-913 du 22 décembre 2021 impose aux organismes publics de se conformer au Référentiel Général d'Interopérabilité. L'interfaçage proposé respecte intégralement les normes techniques et sémantiques du RGI.

### 3.3 Bénéfices attendus

| Bénéficiaire | Bénéfice | Indicateur |
|--------------|----------|------------|
| Citoyens | Réduction des délais de traitement | -60% du temps moyen |
| Citoyens | Suppression des déplacements inutiles | -80% des visites physiques |
| Administration | Réduction des erreurs de saisie | -90% des doublons |
| Administration | Traçabilité complète des transactions | 100% des opérations journalisées |
| Économie | Réduction des litiges fonciers | -40% des contentieux |
| État | Augmentation des recettes fiscales foncières | +25% de recouvrement |

---

## 4. Cadre juridique applicable

La présente demande s'inscrit dans le cadre juridique suivant :

### 4.1 Textes de portée générale

| Texte | Objet | Pertinence |
|-------|-------|------------|
| Loi n°2024-352 du 06/06/2024 | Communications électroniques | Cadre général de régulation des services numériques |
| Loi n°2013-450 du 19/06/2013 | Protection des données personnelles | Obligations en matière de traitement des données des citoyens |
| Décret N°2021-913 du 22/12/2021 | Référentiel Général d'Interopérabilité | Normes techniques d'échange entre systèmes d'information |
| Loi n°2023-901 | Promotion des startups numériques | Accès facilité au marché et à la commande publique |
| Ordonnance n°2012-293 du 21/03/2012 | Transactions électroniques | Validité juridique des échanges dématérialisés |

### 4.2 Textes spécifiques au foncier

| Texte | Objet |
|-------|-------|
| Décret N°2021-862 du 15/12/2021 | Création et organisation du SIGFU |
| Décret N°2019-221 du 13/03/2019 | Institution de l'IDUFCI |
| Arrêté N°757/MCLU du 24/07/2020 | Modalités de génération et gestion de l'IDUFCI |
| Ordonnance N°2025-85 du 12/02/2025 | Création du SIFOR-CI |
| Loi n°98-750 du 23/12/1998 | Domaine foncier rural |

### 4.3 Référence à la consultation publique ARTCI

La présente demande fait suite à la consultation publique lancée par l'ARTCI en juin 2025 relative aux « Conditions et modalités d'un accès ouvert aux API pour les plateformes numériques ». Foncier225 se conforme aux principes énoncés dans ce document, notamment :

> « L'accès aux API doit être accordé dans des conditions objectives, transparentes et non discriminatoires. Le demandeur doit démontrer sa capacité technique, sa conformité réglementaire et son engagement en matière de sécurité et de protection des données. »

---

## 5. Description des systèmes concernés

### 5.1 SIGFU — Système Intégré de Gestion du Foncier Urbain

Le SIGFU, créé par le Décret N°2021-862, est un système informatisé et intégré de gestion des données spatiales et textuelles du foncier urbain. Développé par IGN FI (filiale du groupe GEOFIT) dans le cadre d'un projet de 27 millions d'euros, il couvre le Grand Abidjan et Assinie (4 500 km²) et intègre 49 procédures foncières du MCLU. Il dispose d'un portail web public (sigfu.gouv.ci) et d'une application mobile.

**Données échangées :** Demandes d'actes fonciers, statuts de traitement, informations parcellaires, répertoire des géomètres-experts, plans de lotissement.

### 5.2 IDUFCI — Identifiant Unique du Foncier de Côte d'Ivoire

L'IDUFCI, institué par le Décret N°2019-221, est un code alphanumérique de 20 caractères attribué à toute parcelle foncière en Côte d'Ivoire. Il constitue le référentiel national d'identification des parcelles et permet l'interconnexion de toutes les bases de données foncières. La plateforme IDUFCI est gérée par la DMISSA (Direction de la Modernisation et de l'Information Statistique et de l'Archivage) du MCLU.

**Données échangées :** Identifiants de parcelles, métadonnées parcellaires (localisation, superficie, nature juridique), opérations d'attribution/morcellement/fusion, QR codes de vérification.

### 5.3 SIFOR-CI — Système d'Information du Foncier Rural

Le SIFOR-CI, créé par l'Ordonnance N°2025-85 du 12 février 2025, est le registre foncier rural officiel en matière de données foncières rurales numériques. Logé au sein de l'AFOR, il comprend 8 modules fonctionnels couvrant l'ensemble du cycle de certification foncière rurale.

**Données échangées :** Demandes de certificats fonciers ruraux, données de délimitation villageoise (points GPS), enquêtes foncières, statuts de certification, documents officiels dématérialisés.

---

## 6. Périmètre technique de l'interfaçage

### 6.1 Nature des échanges

| Type d'échange | Protocole | Format | Fréquence |
|---------------|-----------|--------|-----------|
| Requêtes synchrones | REST API (HTTPS) | JSON | Temps réel |
| Notifications asynchrones | Webhooks (HTTPS POST) | JSON | Événementiel |
| Échange de fichiers | HTTPS (multipart) | PDF, GeoJSON, JPEG | À la demande |
| Données géographiques | REST API | GeoJSON (RFC 7946) | Temps réel |

### 6.2 Volumétrie prévisionnelle

| Indicateur | Estimation (Année 1) | Estimation (Année 3) |
|-----------|----------------------|----------------------|
| Nombre d'utilisateurs actifs | 10 000 | 100 000 |
| Requêtes API / jour (IDUFCI) | 5 000 | 50 000 |
| Requêtes API / jour (SIGFU) | 2 000 | 20 000 |
| Requêtes API / jour (SIFOR-CI) | 1 000 | 15 000 |
| Volume de données échangées / jour | 50 Mo | 500 Mo |
| Pics de charge (max requêtes/minute) | 200 | 2 000 |

### 6.3 Exigences de qualité de service

| Exigence | Valeur cible | Justification |
|----------|-------------|---------------|
| Disponibilité | 99,5% | Continuité de service pour les citoyens |
| Temps de réponse (P95) | < 2 secondes | Expérience utilisateur acceptable |
| Taux d'erreur | < 1% | Fiabilité des transactions |
| RTO (Recovery Time Objective) | < 4 heures | Reprise après incident |
| RPO (Recovery Point Objective) | < 1 heure | Perte de données maximale acceptable |

### 6.4 Standards techniques

Conformément au RGI (Décret N°2021-913), les standards techniques suivants sont adoptés :

| Domaine | Standard | Version |
|---------|----------|---------|
| Protocole de transport | HTTPS (TLS 1.3) | RFC 8446 |
| Format d'échange | JSON | RFC 8259 |
| Authentification | OAuth 2.0 | RFC 6749 |
| Données géographiques | GeoJSON | RFC 7946 |
| Système de coordonnées | WGS 84 (EPSG:4326) | ISO 19111 |
| Horodatage | ISO 8601 (UTC) | ISO 8601:2019 |
| Encodage | UTF-8 | RFC 3629 |
| Versioning API | Semantic Versioning | SemVer 2.0 |
| Documentation API | OpenAPI Specification | 3.1.0 |

---

## 7. Engagements du demandeur

### 7.1 Engagements techniques

Le demandeur s'engage à :

1. **Respecter les spécifications techniques** publiées par chaque système partenaire et se conformer aux mises à jour dans un délai de 90 jours après notification.

2. **Maintenir la rétrocompatibilité** de ses propres interfaces pendant une durée minimale de 12 mois après chaque changement de version.

3. **Implémenter les mécanismes de sécurité** requis (authentification forte, chiffrement, journalisation) conformément aux recommandations de l'ANSSI-CI.

4. **Respecter les quotas d'appels** (rate limiting) définis par chaque système partenaire et implémenter des mécanismes de backoff exponentiel en cas de dépassement.

5. **Mettre en place un monitoring** continu des interfaces et alerter les équipes partenaires en cas de détection d'anomalies (temps de réponse dégradé, taux d'erreur élevé).

6. **Participer aux tests d'intégration** planifiés par les systèmes partenaires et aux exercices de continuité d'activité.

### 7.2 Engagements en matière de données

Le demandeur s'engage à :

1. **Ne traiter les données** qu'aux fins strictement nécessaires à la fourniture des services décrits dans le présent cahier des charges.

2. **Ne pas stocker les données** au-delà de la durée nécessaire au traitement de la requête, à l'exception des métadonnées de suivi (numéro de demande, statut, dates).

3. **Ne pas transmettre les données** à des tiers sans autorisation expresse de l'administration gestionnaire et du citoyen concerné.

4. **Garantir le droit d'accès** des citoyens à leurs données conformément à la loi n°2013-450.

5. **Notifier toute violation de données** dans un délai de 72 heures à l'ARTCI, à l'Autorité de Protection des Données Personnelles et aux administrations partenaires.

### 7.3 Engagements financiers

Le demandeur s'engage à :

1. **Prendre en charge les coûts** de développement, de test et de maintenance de ses propres interfaces d'interconnexion.

2. **S'acquitter des redevances** éventuellement fixées par les administrations partenaires pour l'accès à leurs API.

3. **Souscrire une assurance** responsabilité civile professionnelle couvrant les dommages éventuels liés à l'exploitation de l'interfaçage.

---

## 8. Mesures de sécurité et de protection des données

### 8.1 Architecture de sécurité

| Couche | Mesure | Détail |
|--------|--------|--------|
| Réseau | Pare-feu applicatif (WAF) | Filtrage des requêtes malveillantes |
| Transport | TLS 1.3 + mTLS (webhooks) | Chiffrement et authentification mutuelle |
| Application | OAuth 2.0 + JWT (RS256) | Authentification et autorisation |
| Données | AES-256-GCM (repos) | Chiffrement des données sensibles stockées |
| Audit | Journalisation immuable | Conservation 5 ans, intégrité cryptographique |

### 8.2 Gestion des accès

L'accès aux API partenaires est contrôlé par un système de scopes OAuth granulaires. Chaque opération requiert un scope spécifique, et les tokens d'accès ont une durée de vie limitée (1 heure maximum). Les refresh tokens sont stockés de manière chiffrée et révocables à tout moment par l'administration partenaire.

### 8.3 Plan de réponse aux incidents

En cas d'incident de sécurité affectant l'interfaçage, le protocole suivant est activé :

| Étape | Délai | Action |
|-------|-------|--------|
| Détection | T+0 | Alerte automatique via monitoring |
| Qualification | T+15 min | Évaluation de la gravité et du périmètre |
| Confinement | T+30 min | Isolation du composant compromis |
| Notification | T+72h max | Information ARTCI + partenaires + citoyens |
| Remédiation | Variable | Correction et renforcement |
| Retour d'expérience | T+30 jours | Rapport post-incident |

### 8.4 Conformité RGPD / Loi n°2013-450

| Principe | Mise en œuvre |
|----------|-------------|
| Licéité | Consentement explicite du citoyen avant chaque transmission |
| Finalité | Traitement limité aux services fonciers décrits |
| Minimisation | Seules les données nécessaires sont transmises |
| Exactitude | Synchronisation régulière avec les registres officiels |
| Limitation de conservation | Suppression après traitement (sauf métadonnées de suivi) |
| Intégrité et confidentialité | Chiffrement, contrôle d'accès, journalisation |
| Responsabilité | DPO désigné, registre des traitements tenu à jour |

---

## 9. Plan de mise en œuvre

### 9.1 Calendrier prévisionnel

| Phase | Durée | Début prévu | Fin prévue | Livrables |
|-------|-------|-------------|------------|-----------|
| **Instruction du dossier ARTCI** | 2 mois | M0 | M2 | Autorisation d'interfaçage |
| **Convention MCLU (SIGFU/IDUFCI)** | 1 mois | M1 | M3 | Convention signée, accès sandbox |
| **Convention AFOR (SIFOR-CI)** | 1 mois | M1 | M3 | Convention signée, accès sandbox |
| **Développement Phase 1 (IDUFCI)** | 3 mois | M3 | M6 | Intégration IDUFCI opérationnelle |
| **Développement Phase 2 (SIGFU)** | 4 mois | M4 | M8 | Intégration SIGFU opérationnelle |
| **Développement Phase 3 (SIFOR-CI)** | 4 mois | M6 | M10 | Intégration SIFOR-CI opérationnelle |
| **Audit de sécurité** | 1 mois | M10 | M11 | Rapport d'audit favorable |
| **Mise en production** | 1 mois | M11 | M12 | Déploiement progressif |

### 9.2 Gouvernance du projet

| Rôle | Responsabilité | Fréquence de reporting |
|------|---------------|----------------------|
| Comité de pilotage | Validation des orientations stratégiques | Trimestriel |
| Chef de projet Foncier225 | Coordination technique et planning | Hebdomadaire |
| Correspondant MCLU | Validation fonctionnelle SIGFU/IDUFCI | Bimensuel |
| Correspondant AFOR | Validation fonctionnelle SIFOR-CI | Bimensuel |
| DPO | Conformité données personnelles | Mensuel |
| ARTCI | Supervision réglementaire | Sur demande |

### 9.3 Procédure de recette

La mise en production est conditionnée à la validation des critères suivants :

1. **Tests unitaires** : couverture > 80% du code d'interconnexion.
2. **Tests d'intégration** : scénarios de bout en bout validés sur l'environnement de pré-production.
3. **Tests de charge** : validation de la tenue en charge (1 000 requêtes/minute sans dégradation).
4. **Tests de sécurité** : audit de pénétration (pentest) réalisé par un prestataire agréé.
5. **Validation fonctionnelle** : recette métier par les équipes des administrations partenaires.
6. **Validation réglementaire** : conformité ARTCI et Autorité de Protection des Données.

---

## 10. Conditions financières

### 10.1 Investissement initial

| Poste | Estimation (FCFA) |
|-------|------------------|
| Développement des adaptateurs API | [À compléter] |
| Infrastructure technique (serveurs, sécurité) | [À compléter] |
| Audit de sécurité | [À compléter] |
| Formation des équipes | [À compléter] |
| Certification et homologation | [À compléter] |
| **Total investissement** | **[À compléter]** |

### 10.2 Coûts récurrents (annuels)

| Poste | Estimation (FCFA/an) |
|-------|---------------------|
| Maintenance et évolutions | [À compléter] |
| Hébergement et infrastructure | [À compléter] |
| Monitoring et support | [À compléter] |
| Redevances API (si applicable) | [À compléter] |
| Assurance RC professionnelle | [À compléter] |
| **Total récurrent** | **[À compléter]** |

### 10.3 Modèle économique

Le modèle économique de Foncier225 repose sur les frais de service facturés aux citoyens pour la facilitation des procédures foncières. L'interconnexion avec les systèmes étatiques n'a pas vocation à générer des revenus directs mais à améliorer la qualité et la rapidité du service rendu, justifiant ainsi la valeur ajoutée de la plateforme.

---

## 11. Pièces jointes au dossier

Le dossier de demande d'interfaçage est accompagné des pièces suivantes :

| N° | Document | Format |
|----|----------|--------|
| 1 | Statuts de la société (certifiés conformes) | PDF |
| 2 | Extrait du RCCM (moins de 3 mois) | PDF |
| 3 | Attestation fiscale (moins de 3 mois) | PDF |
| 4 | Attestation CNPS (moins de 3 mois) | PDF |
| 5 | Pièce d'identité du représentant légal | PDF |
| 6 | Document technique d'architecture d'interconnexion | PDF (voir MODULE_INTERCONNEXION_API.md) |
| 7 | Politique de sécurité des systèmes d'information (PSSI) | PDF |
| 8 | Politique de protection des données personnelles | PDF |
| 9 | Registre des traitements de données | PDF |
| 10 | Attestation d'assurance RC professionnelle | PDF |
| 11 | Références et certifications techniques | PDF |
| 12 | Déclaration préalable de traitement de données (ARTCI) | PDF |
| 13 | Lettre d'intention de convention avec le MCLU | PDF |
| 14 | Lettre d'intention de convention avec l'AFOR | PDF |

---

## 12. Formulaire de soumission

### Déclaration sur l'honneur

Je soussigné(e), [Nom et prénoms du représentant légal], agissant en qualité de [Qualité] de la société [Dénomination sociale], déclare sur l'honneur que :

- Les informations contenues dans le présent dossier sont exactes et sincères.
- La société est en règle vis-à-vis de ses obligations fiscales et sociales.
- La société dispose des capacités techniques et financières nécessaires à la mise en œuvre de l'interfaçage décrit.
- La société s'engage à respecter l'ensemble des obligations décrites dans le présent cahier des charges.
- La société a pris connaissance des sanctions applicables en cas de manquement aux obligations réglementaires.

Fait à Abidjan, le [Date]

**Signature du représentant légal :**

[Signature]

[Cachet de l'entreprise]

---

### Adresse de soumission

> **Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire (ARTCI)**  
> Direction Générale  
> Marcory Anoumabo  
> 18 BP 2203 Abidjan 18  
> Côte d'Ivoire  
>  
> **Email :** ConsultationpubliqueAPI@artci.ci  
> **Directeur Général :** Monsieur Lakoun OUATTARA

---

### Procédure de dépôt

1. **Dépôt physique** : Le dossier complet (original + 2 copies) est déposé au secrétariat de la Direction Générale de l'ARTCI contre accusé de réception.

2. **Dépôt électronique** : Une version numérique du dossier complet est envoyée simultanément à l'adresse ConsultationpubliqueAPI@artci.ci.

3. **Délai d'instruction** : L'ARTCI dispose d'un délai de 60 jours ouvrables à compter de la réception du dossier complet pour notifier sa décision.

4. **Demande de compléments** : En cas de dossier incomplet, l'ARTCI notifie le demandeur des pièces manquantes dans un délai de 15 jours ouvrables. Le demandeur dispose alors de 30 jours pour compléter son dossier.

5. **Recours** : En cas de refus, le demandeur peut introduire un recours gracieux dans un délai de 30 jours suivant la notification de la décision.

---

## Annexe — Modèle de convention d'interfaçage (à adapter par partenaire)

### CONVENTION D'INTERFAÇAGE

**Entre :**

**[Administration partenaire]**, représentée par [Nom et qualité], ci-après dénommée « l'Administration »,

**Et :**

**[Société Foncier225]**, représentée par [Nom et qualité], ci-après dénommée « le Partenaire »,

**Il est convenu ce qui suit :**

**Article 1 — Objet.** La présente convention a pour objet de définir les conditions techniques, juridiques et financières de l'interfaçage entre le système d'information [SIGFU/IDUFCI/SIFOR-CI] et la plateforme Foncier225.

**Article 2 — Périmètre.** L'interfaçage porte sur les opérations décrites dans le document technique d'architecture d'interconnexion annexé à la présente convention.

**Article 3 — Durée.** La présente convention est conclue pour une durée de [3 ans] renouvelable par tacite reconduction, sauf dénonciation par l'une des parties avec un préavis de [6 mois].

**Article 4 — Obligations de l'Administration.** L'Administration s'engage à : (a) fournir un accès aux environnements de test et de production ; (b) documenter ses API conformément au standard OpenAPI ; (c) notifier les évolutions avec un préavis de 90 jours ; (d) garantir une disponibilité de 99,5%.

**Article 5 — Obligations du Partenaire.** Le Partenaire s'engage à respecter l'ensemble des engagements décrits à l'article 7 du cahier des charges administratif.

**Article 6 — Propriété intellectuelle.** Chaque partie conserve la propriété intellectuelle de ses développements propres. Les interfaces communes sont exploitées conjointement.

**Article 7 — Confidentialité.** Les parties s'engagent à maintenir la confidentialité des informations échangées dans le cadre de la présente convention.

**Article 8 — Responsabilité.** Chaque partie est responsable des dommages causés par le dysfonctionnement de son propre système. La responsabilité est limitée au montant des dommages directs et prévisibles.

**Article 9 — Résiliation.** La convention peut être résiliée de plein droit en cas de manquement grave d'une partie à ses obligations, après mise en demeure restée sans effet pendant 30 jours.

**Article 10 — Litiges.** Tout litige relatif à l'interprétation ou à l'exécution de la présente convention sera soumis à la juridiction compétente d'Abidjan.

Fait en deux exemplaires originaux, à Abidjan, le [Date].

**Pour l'Administration :**                    **Pour le Partenaire :**

[Signature]                                      [Signature]
