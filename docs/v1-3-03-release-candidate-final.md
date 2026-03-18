# V1.3-03 Release Candidate Finale

## Synthese

Le workflow principal de Foncier225 est raccorde en lecture statique sur les surfaces publique, citoyenne, banque et admin. Les routes critiques, les procedures documentaires admin, le portail banque, le parcours credit citoyen et la verification publique sont presents dans le depot.

La validation executable complete reste toutefois conditionnee a la disponibilite de Node et pnpm dans l'environnement de recette.

## Grille UAT

| Scenario | Role | Prerequis | Resultat attendu | Resultat observe | Statut |
| --- | --- | --- | --- | --- | --- |
| Verify token valide | Public | token actif existant | document valide, sans PII | wiring confirme dans `verify.check` et tests presents | PARTIAL |
| Verify token invalide/inconnu | Public | token inconnu | erreur propre | messages et tests presents | PARTIAL |
| Verify token expire | Public | token expire | refus propre | logique serveur presente | PARTIAL |
| Creation dossier credit | Citizen | session citizen | dossier cree | routes et mutation presentes | PARTIAL |
| Upload documents | Citizen | dossier editable | document ajoute | UI et mutation presentes | PARTIAL |
| Soumission dossier | Citizen | dossier complet | statut SUBMITTED | mutation et tests presents | PARTIAL |
| Retour DOCS_PENDING apres request docs | Citizen/Bank | dossier UNDER_REVIEW | demande visible puis re-soumission possible | surfaces presentes | PARTIAL |
| Consultation offre | Citizen | offre emise | offre visible | surfaces presentes | PARTIAL |
| Acceptation/refus offre | Citizen | owner + offre active | ACCEPTED ou CLOSED | mutations presentes | PARTIAL |
| Lecture statut final | Citizen | decision finale | statut final lisible | surfaces presentes | PARTIAL |
| Telechargement attestation finale | Citizen | attestation emise | download owner-only | surfaces presentes | PARTIAL |
| Review -> UNDER_REVIEW | Bank | dossier SUBMITTED | statut mis a jour | mutation presente | PARTIAL |
| Request docs | Bank | dossier UNDER_REVIEW | DOCS_PENDING | mutation presente | PARTIAL |
| Make offer | Bank | dossier UNDER_REVIEW | OFFERED | mutation presente | PARTIAL |
| Decision finale | Bank | dossier ACCEPTED | APPROVED ou REJECTED | mutation presente | PARTIAL |
| Issue final attestation | Bank | decision finale persistée | attestation emise | mutation presente | PARTIAL |
| Generation PDF parcelle | Admin | parcelle existante | document genere | procedure presente | PARTIAL |
| Generation PDF dossier | Admin | dossier existant | document genere | procedure presente | PARTIAL |
| Listing documents admin | Admin | documents presents | liste chargee | route et page presentes | PARTIAL |
| Telechargement document admin | Admin | document genere | URL de download | route presente | PARTIAL |

## Verifications techniques

- `pnpm check` : non verifiable dans cet environnement (`pnpm` absent du PATH)
- `pnpm test` : non verifiable dans cet environnement (`pnpm` absent du PATH)
- `pnpm build` : non verifiable dans cet environnement (`pnpm` absent du PATH)

## Variables d'environnement

### Requises

- `DATABASE_URL`
- `JWT_SECRET`
- `VITE_APP_ID`
- `OAUTH_SERVER_URL`

### Optionnelles

- `VITE_ANALYTICS_ENDPOINT`
- `VITE_ANALYTICS_WEBSITE_ID`

## Ordre recommande de mise en route

1. Installer les dependances
2. Configurer les variables d'environnement
3. Executer les migrations
4. Lancer `pnpm check`
5. Lancer `pnpm test`
6. Lancer `pnpm build`
7. Demarrer l'application

## Checklist de deploiement

- Verifier les variables requises
- Verifier l'acces base de donnees
- Executer les migrations Drizzle
- Verifier le build de production
- Tester `/verify`
- Tester `/admin/documents`
- Tester un parcours citizen credit complet
- Tester un detail banque avec transition

## Checklist post-deploiement

- Verifier l'authentification
- Verifier les telechargements documentaires
- Verifier la generation d'un document admin
- Verifier une verification publique sans fuite de PII
- Verifier les logs d'audit sur une action critique

## Checklist rollback

- Revenir au package applicatif precedent
- Restaurer la configuration precedente si modifiee
- Ne pas appliquer de nouvelle migration tant que la version applicative n'est pas stable
- Si une migration a deja ete appliquee, preparer une procedure de rollback SQL dediee avant retour production

## Risques residuels

- Validation executable impossible sans Node/pnpm disponibles dans l'environnement courant
- UAT constatee principalement en revue statique tant que l'environnement de run n'est pas complet
- Les chemins de deploiement reels doivent encore etre verifies sur l'infrastructure cible

## Verdict

Pret UAT interne conditionnel.

Pret pilote uniquement apres execution reelle de `pnpm check`, `pnpm test`, `pnpm build` et smoke tests sur l'environnement cible.
