# Serveur de synchronisation

Un Worker Cloudflare qui ne peut pas lire ce qu'il stocke.

## Déployer

1. `npm install -g wrangler` puis `wrangler login`
2. `wrangler d1 create habitum-sync` → coller l'identifiant dans `wrangler.toml`
3. `wrangler d1 execute habitum-sync --remote --file=schema.sql`
4. `wrangler deploy` — **wrangler 4.36 ou plus récent** : la liaison `[[ratelimits]]` de
   `wrangler.toml` n'est pas comprise avant.
5. Reporter l'URL rendue dans `.env.local` de l'application :
   `NEXT_PUBLIC_SYNC_URL=https://habitum-sync.<compte>.workers.dev`

## Les trois routes

`espace` est 32 caractères de l'alphabet de Crockford, dérivés du code de l'utilisateur
par une fonction à sens unique. **Le connaître est la seule autorisation** : qui l'a peut
lire, écrire et effacer — mais pas déchiffrer, la clé ne quitte jamais l'appareil.

| Route | Effet |
|---|---|
| `GET /v1/:espace?depuis=<seq>` | rend au plus 500 lignes de `seq` strictement supérieur, le `seq` de la dernière servie, et `encore` (vrai s'il en reste). Sur une page vide, rend aussi `tete`, le plus grand `seq` de l'espace |
| `POST /v1/:espace` | applique les lignes recevables (`{lignes: [...]}`), arbitrage compris ; rend le dernier `seq` écrit |
| `DELETE /v1/:espace` | efface **tout** l'espace et rend `{seq: 0}` |

`DELETE` existe pour que ce qui est parti puisse revenir en arrière. Sans elle, désappairer
un appareil le rend muet mais laisse les octets ici indéfiniment — intenable pour un produit
qui met la confidentialité en avant. Refuser l'effacement en bloc ne protégerait d'ailleurs
personne : qui connaît l'espace peut déjà tout écraser ligne à ligne par des `POST` plus
récents. Cela rendrait seulement la reprise impossible à son légitime propriétaire.

## Limites

Le relais n'authentifie personne : connaître un espace suffit, en inventer un aussi. Ces
plafonds (`src/logique.ts`) sont posés largement au-dessus de tout usage réel.

| Limite | Valeur | Réponse |
|---|---|---|
| Lignes par requête | 500 | `413` |
| Corps d'un envoi | 4 millions de caractères | `413` |
| Un chiffré | 1,9 million de caractères (D1 refuse au-delà de 2 Mo) | ligne ignorée — le client ne l'envoie pas et la compte |
| Identifiant, genre, horodatage | 256 caractères, des lettres, un début de date ISO | ligne ignorée |
| Écritures dans la vie d'un espace | 2 millions (`seq`) | `507` ; effacer l'espace remet le compte à zéro |
| Requêtes par espace | 600 par minute, approximatif, par emplacement Cloudflare | `429` |

La limite de débit a pour clé **l'espace, jamais l'adresse IP**. Elle est facultative : sans
la liaison `LIMITE`, le Worker fonctionne sans elle, et un limiteur en panne laisse passer.

**Ce que ces limites ne ferment pas : la création d'espaces en masse.** Chaque espace
inventé est borné, leur nombre ne l'est pas. Le fermer demanderait de compter par adresse
IP, que ce serveur s'interdit de regarder ; la purge des espaces muets reste le seul remède.

**Quota D1 du palier gratuit : 100 000 lignes écrites par jour.** Un premier appairage de
plus de 100 000 lignes de journal le dépasse : l'envoi échoue en cours de route et reprend
au passage suivant, le relais écartant ce qu'il détient déjà. Il aboutit donc en deux
jours au lieu d'un, sans perte.

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
lui-même au prochain passage — et c'est `tete` qui le permet : un appareil dont le curseur
dépasse la tête de l'espace comprend qu'il a été vidé, repart de zéro et renvoie tout ce
qu'il détient. Jusqu'au 12 novembre 2026 cette phrase était fausse : l'appareil gardait son
curseur et son filigrane, ne renvoyait que le neuf, et un appareil appairé ensuite ne
recevait qu'une base partielle.

**`touche_le` est posé par le SERVEUR**, dans la table `espaces`, et non déduit du
`updated_at` des lignes — celui-ci vient du client, et une horloge d'appareil déréglée
ferait expirer un espace vivant ou en maintiendrait un mort pendant des années. Toute
requête rafraîchit la marque, lecture comprise : un téléphone qui ne fait que recevoir
garde son espace en vie. L'écriture est sautée si la marque a moins d'un jour — sans cette
retenue, chaque lecture coûterait une écriture, or c'est le quota qu'on cherche à ménager.
