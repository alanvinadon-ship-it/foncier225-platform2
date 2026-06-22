# Analyse du Modèle Bon de Commande (PO_OCI-BC0043_26_0.pdf)

## Structure du document

### En-tête (logo + titre)
- Logo Orange (en haut à gauche, bloc orange)
- Titre centré : **BON DE COMMANDE** (gras, grande taille)
- Sous le logo : adresse émetteur (Immeuble Orange Village, Cocody Riviera Golf, Boulevard de France, 11 BP 202 Abidjan 11, Tél: (225) 27 21 23 90 10, Site Web: www.orange.ci)

### Bloc informations principales (2 colonnes)
**Colonne gauche :**
- Acheteur : ADOU, Yao Eugène
- Organisation : 30011
- Type : CAPEX
- Devise : XOF
- Taux : (vide)

**Colonne droite :**
- N° Commande : OCI-BC0043/26
- N° Demande d'achat : OCI-DA0153/26
- N° De Contrat : (vide)
- Date d'émission : 15/01/2026
- Date d'impression : 15/01/2026
- Code fournisseur : 371941

### Bloc adresses (3 colonnes)
- **Adresse de livraison /d'exécution :** Service DT (3000001), DANGA, ABIDJAN, Côte d'Ivoire
- **Adresse de facturation :** Direction Financière, Les factures doivent être déposées à la Direction Financière au bureau centralisateur des factures : Imm. Orange Village Cocody Riviera Golf Boulevard de France, Abidjan, Côte d'Ivoire, ComptaFournisseursDF.oci@orange.com
- **Adresse du fournisseur :** AGILES TELECOMS, COCODY 7EME TRANCHE, ABIDJAN, Côte d'Ivoire

### Bloc Observations
- DESCRIPTION: MISE DE DISPOSITION DE 6 CONSULTANTS_RECONDUCTION PLATEAU OPTIMUS_T1 2026
- MONTANT: 63 000 000 CFA
- DELAI D'EXÉCUTION: 3 MOIS
- CONDITIONS DE REGLEMENT: PAIEMENT PAR MENSUALITÉ À 30 JOURS DATE DE DEPOT FACTURE

### Tableau des lignes
Colonnes :
| N° Ligne | Quantité | UM | Référence Article | Description | Code Catégorie | Description de La catégorie | Date de livraison | Coût unitaire HT | Coût total HT |
|----------|----------|-----|-------------------|-------------|----------------|---------------------------|-------------------|------------------|---------------|
| 1 | | | | Renouvellement des 6 consultants pour le T1 2026 | G6003290 | G6003290 - P2 : Etudes et Mûrissement - Consultant SI / Ingénieur Qualité | | | 63 000 000 |

### Bloc Totaux (en bas à droite)
- Total Net HT : 63 000 000
- Montant TVA : 11 340 000
- Total TTC : 74 340 000

### Bloc Signature
- Directeur des Achats et de la Logistique:
- Date : 15/01/2026
- Signature :
- Par intérim
- (Signature manuscrite)
- Eugène BROU, Directeur Achats & Logistique.pl

### Pied de page
- Orange Côte d'Ivoire S.A. Société à participation financière publique avec Conseil d'administration au capital de 6 028 214 000 Fcfa.
- RCCM N° CI-ABJ-1996-B-196491, CC N° 9606125P, Régime d'imposition : Réel Normal Centre des impôts : DGE
- Compte BICICI 09961 00253590005
- Page 1 / 1

## Éléments clés pour l'implémentation
1. Numérotation : {PREFIX}-BC{SEQUENCE}/{ANNEE_2CHIFFRES} (ex: OCI-BC0043/26)
2. Référence demande d'achat liée
3. Type : CAPEX / OPEX
4. Devise : XOF par défaut
5. Adresses : livraison, facturation, fournisseur
6. Observations : description détaillée, montant, délai, conditions
7. Tableau lignes avec catégories
8. Totaux : HT, TVA, TTC
9. Bloc signature avec date et signataire
10. Pied de page avec informations légales société
