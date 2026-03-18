# V1.3-01 - Hardening audit

## Synthese
- Le workflow credit principal est bien present de bout en bout dans le depot: citoyen, banque, decision, attestation finale, verify public.
- Les surfaces critiques sont routees dans `client/src/App.tsx` et exposees dans `server/routers.ts`.
- Le principal risque de stabilisation n'est pas le workflow credit lui-meme, mais l'ecart entre les missions documentaires annoncees et le code reellement present.

## Correctif applique dans cette passe
- Alignement de `admin.generateVerifyToken` avec l'enum `verify_tokens` pour accepter aussi `document`.

## Ecarts reels constates
- `generated_documents` n'existe pas dans le depot; seule la roadmap en parle.
- Aucun ecran `/admin/documents` reel n'est route dans `client/src/App.tsx`.
- Le journal Drizzle `drizzle/meta/_journal.json` n'inclut pas encore `0004` ni `0005`.
- La validation finale `pnpm check`, `pnpm test`, `pnpm build` n'a pas pu etre executee dans cet environnement car `node`, `npm` et `pnpm` ne sont pas installes.
- Quelques chaines UI/serveur conservent un encodage degrade visible.

## Checklist avant fusion
- Installer un runtime Node avec `pnpm`.
- Executer `pnpm check`, `pnpm test`, `pnpm build`.
- Regenerer / aligner le journal Drizzle et les snapshots si la pipeline l'exige.
- Decider explicitement si le module documentaire attendu doit rester base sur `attestations`/`documents` ou si `generated_documents` doit exister pour de vrai.
- Nettoyer les textes mal encodes avant release publique.
