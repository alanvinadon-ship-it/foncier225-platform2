# V1.3-02 Release Candidate

## Optimisations appliquees

- Le snippet analytics n'est plus injecte depuis `client/index.html`.
- Le chargement analytics est maintenant conditionnel au runtime via `VITE_ANALYTICS_ENDPOINT` et `VITE_ANALYTICS_WEBSITE_ID`.
- Les pages citoyen credit, banque, admin et verify sont chargees en lazy loading depuis `client/src/App.tsx`.
- Le build Vite segmente maintenant les dependances principales en chunks `react-vendor`, `data-vendor`, `ui-vendor` et `visual-vendor`.

## Nettoyages effectues

- Correction de libelles mal encodes sur la page publique de verification.
- Correction des messages publics de `verify.check` pour eviter les chaines corrompues.
- Nettoyage du titre HTML principal pour eviter un rendu degrade.

## Risques residuels

- La validation finale `pnpm check`, `pnpm test`, `pnpm build` depend de la presence effective de Node et pnpm dans l'environnement.
- La segmentation exacte des chunks doit etre verifiee sur un build reel avant fusion.

## Checklist avant release

- Verifier `pnpm check`
- Verifier `pnpm test`
- Verifier `pnpm build`
- Comparer les tailles de chunks avant/apres build
- Ouvrir `/verify`, `/admin/documents`, un detail credit citoyen et un detail banque pour un smoke test final
