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

## Expiration des espaces abandonnés

Une minuterie quotidienne (3 h UTC) efface les espaces dont **plus aucun appareil n'a donné
signe depuis six mois**. Sans elle, un essai sans lendemain occupait la base pour toujours.

**Par espace entier, jamais ligne à ligne.** Effacer « les lignes de plus de six mois »
paraît plus fin ; c'est un piège. Une habitude créée il y a deux ans et jamais modifiée
depuis porte un `updatedAt` ancien alors qu'elle est vivante : on l'effacerait, et le
prochain appareil appairé ne la recevrait jamais — une synchronisation incomplète,
silencieuse, indiagnosticable depuis l'appareil.

**Et rien n'est perdu.** Le relais est une boîte aux lettres, pas un coffre-fort : les
données vivent sur les appareils. Un espace expiré qui redevient actif se remplit de
lui-même au prochain envoi.

**`touche_le` est posé par le SERVEUR**, dans la table `espaces`, et non déduit du
`updated_at` des lignes — celui-ci vient du client, et une horloge d'appareil déréglée
ferait expirer un espace vivant ou en maintiendrait un mort pendant des années. Toute
requête rafraîchit la marque, lecture comprise : un téléphone qui ne fait que recevoir
garde son espace en vie. L'écriture est sautée si la marque a moins d'un jour — sans cette
retenue, chaque lecture coûterait une écriture, or c'est le quota qu'on cherche à ménager.
