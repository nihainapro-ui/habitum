# Serveur de synchronisation

Un Worker Cloudflare qui ne peut pas lire ce qu'il stocke.

## Déployer

1. `npm install -g wrangler` puis `wrangler login`
2. `wrangler d1 create habitum-sync` → coller l'identifiant dans `wrangler.toml`
3. `wrangler d1 execute habitum-sync --remote --file=schema.sql`
4. `wrangler deploy`
5. Reporter l'URL rendue dans `.env.local` de l'application :
   `NEXT_PUBLIC_SYNC_URL=https://habitum-sync.<compte>.workers.dev`

## Ce qu'il ne fait pas

Il ne journalise rien — ni adresse IP, ni horodatage de requête. Il ne sait pas
combien d'utilisateurs existent : un espace est 32 caractères opaques.

## Types D1 sans dépendance

`src/index.ts` déclare ses propres interfaces minimales pour `D1Database`
plutôt que d'ajouter `@cloudflare/workers-types` au dépôt : aucune nouvelle
dépendance, aucune nouvelle surface d'approvisionnement, pour cinq méthodes
réellement utilisées. Le contrôle de vérité sur ces types reste
`wrangler deploy` — pas la compilation locale, qui exclut ce dossier.
