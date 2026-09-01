# Synchronisation multi-appareils — serveur aveugle, chiffrement de bout en bout

**Date** : 2026-09-01
**État** : validé, prêt pour le plan d'implémentation
**Portée** : un module `lib/sync/`, un service `sync-server/`, un écran de réglages,
une révision d'ADR-0002

---

## 1. Ce que ça résout

Aujourd'hui, l'APK Android et le navigateur de bureau sont **trois silos étanches**
(le téléphone, le navigateur, tout autre profil). L'APK est un paquet autonome qui
démarre sur `https://localhost` ; le bureau vit sur une origine web. Même nom de base
IndexedDB, bases différentes. Le seul pont existant est l'export/import JSON manuel.

L'objectif : **toute modification faite sur un appareil est visible sur l'autre, sans
geste de l'utilisateur.**

## 2. Décisions tranchées avec le commanditaire

| Question | Réponse | Conséquence |
| --- | --- | --- |
| Transport | **Micro-serveur** (Cloudflare Workers + D1) | Marche dans tout navigateur, rien à installer. Écarte Syncthing, qui exigeait Chrome/Edge et un clic par session. |
| Confidentialité | **Chiffrement de bout en bout** | Le serveur ne stocke que des octets opaques. L'esprit d'ADR-0002 est préservé, pas renié. |
| Comptes | **Aucun** | Appairage par phrase secrète. Ni email, ni mot de passe, ni base d'utilisateurs. |
| Conflits | **Le plus récent gagne, par entité** | Pas de fusion champ par champ. Simple, prévisible, testable. |
| Activation | **Désactivée par défaut** | Un utilisateur qui n'appaire rien n'émet aucune requête. La promesse publique reste vraie pour lui. |
| Coût | **Palier gratuit Cloudflare** | 100 000 requêtes/jour, 5 Go. Un usage mono-utilisateur en consomme une fraction. |

## 3. Ce que le serveur voit — et ne voit pas

C'est le cœur du contrat, et il doit rester lisible en une phrase :
**le serveur est une boîte aux lettres qui ne sait pas lire.**

Il stocke des lignes :

```
(espace, genre, id, updatedAt, seq, blob)
```

- `espace` — 32 caractères opaques. Ni nom, ni email, ni adresse IP conservée.
- `genre` / `id` — le nom de la table et l'identifiant de la ligne. **En clair**,
  parce que la synchronisation delta en a besoin pour comparer. C'est la seule fuite
  de métadonnée, et elle est écrite ici : un observateur du serveur apprendrait
  *combien* d'habitudes existent et *quand* elles changent, jamais lesquelles.
- `updatedAt` — l'horodatage de l'appareil. En clair, pour arbitrer sans déchiffrer.
- `seq` — compteur monotone attribué par le serveur, propre à chaque espace.
- `blob` — l'entité entière, chiffrée AES-GCM. Opaque.

Il ne voit **jamais** : un libellé d'habitude, une note, une valeur journalisée,
un nom de projet, un responsable.

## 4. Cryptographie

**L'application génère la phrase, l'utilisateur ne l'invente pas.** C'est la décision
qui rend le reste sûr : une phrase choisie par un humain se casse hors ligne en
quelques heures, et le sel doit ici être fixe pour que deux appareils dérivent la
même clé sans se parler. Une phrase tirée au sort de 128 bits d'entropie ferme ce
chemin.

```
phrase   = 6 mots tirés d'une liste de 2048 (≈ 128 bits)   ← généré, affiché, copiable
maître   = PBKDF2-SHA256(phrase, sel = "habitum-sync-v1", 600 000 itérations)
espace   = HKDF(maître, info = "espace")       → 32 caractères, envoyés au serveur
clé      = HKDF(maître, info = "chiffrement")  → AES-GCM 256, ne sort JAMAIS de l'appareil
blob     = IV(96 bits aléatoires) || AES-GCM(clé, JSON(entité))
```

Deux dérivations séparées : **connaître l'espace ne donne rien sur la clé.** Le
porteur de l'espace peut lire des octets chiffrés et en écrire — c'est toute
l'authentification, et elle suffit pour un usage personnel, parce que l'espace est
lui-même un secret de 128 bits.

Tout passe par `WebCrypto`, présent dans le WebView Android comme dans les
navigateurs. Aucune dépendance ajoutée.

## 5. Protocole

Deux points d'entrée, rien de plus.

```
GET  /v1/{espace}?depuis={seq}   → { seq, lignes: [{ genre, id, updatedAt, blob }] }
POST /v1/{espace}                ← { lignes: [{ genre, id, updatedAt, blob }] }
```

- Le curseur de lecture est le **`seq` du serveur**, jamais une date : deux appareils
  dont les horloges divergent rateraient sinon des lignes. Les horodatages ne servent
  qu'à l'arbitrage.
- En écriture, le serveur applique lui aussi « le plus récent gagne » : une ligne dont
  l'`updatedAt` est antérieur à celui qu'il détient est **ignorée**. C'est ce qui
  empêche un appareil en retard de ressusciter une donnée supprimée.
- Limitation de débit par espace, pour qu'un client en boucle ne consomme pas le
  palier gratuit.

## 6. Ce qui se synchronise

**Oui** : `habits`, `logs`, `tasks`, `goals`, `notes`, `sessions`, `profiles`,
`shopping`, `projects`, `projectTasks`, plus deux clés de `meta` — `settings` et `occ`.

**Non**, et volontairement : `timer` (l'état d'un minuteur en cours n'a de sens que
sur l'appareil qui le fait tourner), `logSnapshot` (cache reconstructible),
`errors` (journal local, décision E), `seeded`, `activeProfile`, `lastExport`,
`nagDismissed` — tous propres à l'appareil.

`logs` n'a pas d'identifiant propre : sa clé de synchronisation est `habitId|date`.

### Suppressions

Toutes les entités portent déjà `deletedAt`, et `logsRepo.tombstone()` existe — écrit
en toutes lettres « pour que deux appareils convergent sans ressusciter l'entrée ».
Rien à inventer.

**Un audit est nécessaire** : `logsRepo.clear()` efface *durement*, sans trace. Sur un
appareil synchronisé, une entrée effacée par ce chemin reviendrait au tour suivant.
Tous ses appelants doivent basculer sur `tombstone()`.

### La limite connue de `occ`

Les occurrences de tâches récurrentes sont un **seul objet** (`{"taskId|date": 1}`),
pas une table. Arbitré en bloc, le plus récent gagne : deux appareils hors ligne qui
cochent chacun une occurrence différente en perdent une. C'est accepté pour cette
version, et documenté dans l'écran de réglages. Si ça mord, `occ` devient une table —
sans jamais renommer la clé (règle 1 du `CLAUDE.md`).

## 7. Le module client — `lib/sync/`

Cinq fichiers, chacun testable seul :

| Fichier | Rôle | Dépend de |
| --- | --- | --- |
| `crypto.ts` | dérivation, chiffrement, déchiffrement | WebCrypto |
| `phrase.ts` | génération et validation de la phrase | liste de mots |
| `transport.ts` | les deux appels HTTP, erreurs typées | `fetch` |
| `merge.ts` | arbitrage pur : deux lignes → laquelle gagne | **rien** |
| `engine.ts` | orchestration : lire, fusionner, écrire, pousser | les quatre ci-dessus |

`merge.ts` est **pur** — pas de réseau, pas de base, pas de React. C'est là que vivent
les tests de convergence, et c'est ce qui permet de les écrire sans monter un serveur.

`lib/domain/` n'est pas touché (règle 2 du `CLAUDE.md`) : la synchronisation n'est pas
une règle métier.

### Un aller-retour

1. **Tirer** depuis le `seq` mémorisé (nouvelle clé `meta` : `syncCursor`).
2. **Déchiffrer** et arbitrer chaque ligne contre la locale.
3. **Écrire** les gagnantes **en préservant leur `updatedAt` d'origine**.
4. **Pousser** les lignes locales modifiées depuis le filigrane, moins celles qu'on
   vient d'appliquer.
5. **Mémoriser** le nouveau `seq` et le nouveau filigrane.

L'étape 3 impose une addition à `lib/data/repositories/base.ts` : un `putRaw()` qui
n'écrase pas `updatedAt`. Aujourd'hui `create`/`update` le posent toujours à
maintenant — ce qui est juste pour une saisie humaine, et faux pour une ligne reçue.

### Déclenchement

À l'ouverture, au retour de l'application au premier plan, et après une modification
(groupées, quelques secondes de silence). Jamais fenêtre fermée : sans serveur de
notification, ce n'est pas possible — même raison qu'ADR-0008 pour les rappels.

### Hors ligne et pannes

Rien ne bloque jamais l'interface. Une synchronisation qui échoue est réessayée au
déclenchement suivant, avec un délai croissant. L'écran de réglages affiche l'état
(`jamais` · `à jour` · `en cours` · `hors ligne` · `en erreur`) et la date du dernier
succès. Aucun chiffre fabriqué : « jamais synchronisé » s'écrit ainsi, pas « il y a
0 minute » (règle 3 du `CLAUDE.md`).

## 8. L'écran

Dans `app/(app)/app/settings` — une section « Synchronisation » :

- **Non appairé** : un bouton « Activer la synchronisation » → génère la phrase,
  l'affiche en grand, copiable, avec l'avertissement de perte. Et un champ « J'ai déjà
  une phrase » pour le second appareil.
- **Appairé** : état, dernière synchronisation, « Voir ma phrase », « Délier cet
  appareil » (efface phrase et curseur ; **ne touche à aucune donnée locale**).

Libellés dans `messages/fr.json` **et** `messages/en.json` (règle 6).

## 9. Le serveur — `sync-server/`

Un Worker Cloudflare, une table D1, déployé par `wrangler`. Il vit dans le dépôt mais
**hors du build Next** : il n'entre ni dans le bundle web, ni dans l'APK.

L'URL est un réglage de construction (`NEXT_PUBLIC_SYNC_URL`). Absente, la
fonctionnalité ne s'affiche pas — un fork sans serveur reste strictement local-first.

## 10. Ce qui change ailleurs

| Fichier | Changement | Pourquoi |
| --- | --- | --- |
| `next.config.mjs` | `connect-src 'self' <URL de sync>` | La CSP interdit aujourd'hui tout appel sortant |
| `docs/adr/0002-local-first.md` | statut « amendé », renvoi vers le nouvel ADR | Il affirme « aucun appel réseau » |
| `docs/adr/0009-sync-chiffree.md` | **à écrire** | La décision et son prix |
| `README.md` | « aucun appel réseau » → « aucun appel réseau tant que la synchronisation n'est pas activée ; une fois activée, le serveur ne peut pas lire vos données » | L'affirmation devient fausse sinon |
| `lib/site/contenu` | même correction sur la vitrine | Même raison |
| `docs/handoff/03-ARCHITECTURE.md` | remplacer la ligne « Neon + Drizzle + Auth.js » | Ce n'est plus le choix retenu |
| `CHANGELOG.md` | entrée | Définition de « terminé » |

## 11. Tests

- **Unitaires (`merge.ts`)** — le plus récent gagne ; une suppression ne ressuscite
  pas ; deux appareils partant du même état convergent quel que soit l'ordre ;
  une horloge en retard ne détruit pas une écriture récente.
- **Unitaires (`crypto.ts`)** — un aller-retour chiffrement/déchiffrement ne perd
  rien ; deux phrases différentes donnent deux espaces différents ; la même phrase
  donne le même espace sur deux exécutions.
- **e2e** — deux contextes de navigateur, un serveur de synchronisation en mémoire :
  créer une habitude dans l'un, la voir apparaître dans l'autre ; la supprimer,
  la voir disparaître. Puis : synchronisation coupée, l'application reste utilisable.
- **Non-régression** — sans appairage, **zéro requête réseau**. Le test doit échouer
  si une seule sort.

## 12. Hors périmètre

Pas de partage entre plusieurs personnes. Pas de fusion champ par champ. Pas de
synchronisation fenêtre fermée. Pas d'historique de versions côté serveur. Pas de
récupération de phrase perdue — c'est impossible par construction, et le prétendre
serait mentir.

## 13. Risques

| Risque | Traitement |
| --- | --- |
| **Phrase perdue** | Les données locales restent intactes sur chaque appareil ; seul le pont est coupé. L'avertissement est affiché à la génération, pas enterré dans une aide. |
| Deux appareils hors ligne modifient la même entité | Le plus récent gagne, l'autre modification est perdue. Assumé et documenté. |
| Horloge d'un appareil déréglée | Ses écritures gagnent ou perdent à tort. Le curseur `seq` empêche au moins de *rater* des lignes. Un écart supérieur à 24 h est signalé dans les réglages. |
| Palier gratuit dépassé | Impossible à un utilisateur seul. Un compteur par espace coupe l'abus sans toucher l'usage normal. |
| `occ` arbitré en bloc | Documenté § 6. Devient une table si le problème se manifeste. |
