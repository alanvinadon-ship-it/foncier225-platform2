# FIX-V1.1-02 - Module documentaire admin

## Ecart corrige
La roadmap mentionnait un module documentaire admin avec `generated_documents`, generation PDF admin et listing `/admin/documents`, mais le depot reel n'en contenait pas d'implementation concrete.

## Strategie retenue
- Ajout d'une table `generated_documents` pour materialiser les PDF admin et les documents finaux relies au workflow.
- Reutilisation du meme socle technique que l'attestation finale:
  - stockage via `storagePut` / `storageGet`
  - checksum SHA-256
  - verification publique via `verify_tokens`
  - generation PDF minimale sans dependance lourde
- Conservation de `attestations` comme verite metier du document final, avec un enregistrement `generated_documents` additionnel pour l'ecosysteme documentaire admin.

## Modele documentaire retenu
- `generated_documents` couvre:
  - `PARCEL_PDF`
  - `DOSSIER_PDF`
  - `FINAL_CREDIT_ATTESTATION`
- Les tokens `document` pointent desormais vers des enregistrements `generated_documents`.
- `verify.check` sait lire `generated_documents` et retombe sur `attestations` pour la compatibilite.

## Integration verify
- `/verify` expose uniquement des metadonnees minimales:
  - type du document
  - reference
  - date
  - statut synthese
- Aucun champ PII n'est ajoute.

## Limites actuelles
- Le depot ne contient toujours pas de moteur QR standard externe; les PDF utilisent le meme fallback visuel et le lien `/verify?token=...`.
- Les snapshots Drizzle n'ont pas ete regeneres automatiquement dans cet environnement faute de runtime Node.
