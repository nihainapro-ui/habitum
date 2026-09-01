# Serveur de synchronisation

Un Worker Cloudflare qui ne peut pas lire ce qu'il stocke.

## Déployer

1. `npm install -g wrangler` puis `wrangler login`
2. `wrangler d1 create habitum-sync` → coller l'identifiant dans `wrangler.toml`
3. `wrangler d1 execute habitum-sync --remote --file=schema.sql`
4. `wrangler deploy`
5. Reporter l'URL rendue dans `.env.local` de l'application :
   `NEXT_PUBLIC_SYNC_URL=https://habitum-sync.<compte>.workers.dev`

## Les trois routes

`espace` est 32 caractères de l'alphabet de Crockford, dérivés du code de l'utilisateur
par une fonction à sens unique. **Le connaître est la seule autorisation** : qui l'a peut
lire, écrire et effacer — mais pas déchiffrer, la clé ne quitte jamais l'appareil.

| Route | Effet |
|---|---|
| `GET /v1/:espace?depuis=<seq>` | rend au plus 500 lignes de `seq` strictement supérieur, et le `seq` de la dernière servie |
| `POST /v1/:espace` | applique les lignes recevables (`{lignes: [...]}`), arbitrage compris ; rend le dernier `seq` écrit |
| `DELETE /v1/:espace` | efface **tout** l'espace et rend `{seq: 0}` |

`DELETE` existe pour que ce qui est parti puisse revenir en arrière. Sans elle, désappairer
un appareil le rend muet mais laisse les octets ici indéfiniment — intenable pour un produit
qui met la confidentialité en avant. Refuser l'effacement en bloc ne protégerait d'ailleurs
personne : qui connaît l'espace peut déjà tout écraser ligne à ligne par des `POST` plus
récents. Cela rendrait seulement la reprise impossible à son légitime propriétaire.

## Ce qu'il ne fait pas

Il ne journalise rien — ni adresse IP, ni horodatage de requête. Il ne sait pas
combien d'utilisateurs existent : un espace est 32 caractères opaques.

## Types D1 sans dépendance

`src/index.ts` déclare ses propres interfaces minimales pour `D1Database`
plutôt que d'ajouter `@cloudflare/workers-types` au dépôt : aucune nouvelle
dépendance, aucune nouvelle surface d'approvisionnement, pour cinq méthodes
réellement utilisées. Le contrôle de vérité sur ces types reste
`wrangler deploy` — pas la compilation locale, qui exclut ce dossier.

## Ce qui n'est pas encore fait

**Aucune purge automatique.** Un espace abandonné — code perdu, utilisateur parti — reste
en base indéfiniment. Ce n'est pas une fuite (les octets sont illisibles sans le code, et
rien ne les rattache à une personne), mais c'est du stockage qui ne se libère jamais. Une
expiration sur `updated_at` serait le prochain geste utile ; elle n'est pas écrite, et le
README le dit plutôt que de le laisser croire.
