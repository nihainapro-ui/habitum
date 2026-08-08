# 0007 — L'application vit sous `/app`, la racine revient à la vitrine

**Statut :** accepté · **Date :** 8 août 2026 · **Décision G** du programme de reprise

## Contexte

Les onze vues répondaient jusqu'ici à la racine : `/` pour le tableau de bord, `/today`,
`/habits`… La phase 6 prévoit une vitrine publique, bilingue et indexable — le **seul actif
indexable du projet**, et l'argument commercial principal. Les deux ne peuvent pas occuper `/`.

La décision devait être prise **avant** la phase 2, parce que les tests e2e codent les routes en
dur : la trancher après, c'est réécrire chaque test et chaque lien du rail.

## Décision

L'application vit sous **`/app`**. La racine `/` est réservée à la vitrine.

| URL | Contenu |
|---|---|
| `/` | vitrine publique — **phase 6**. En attendant, redirection **temporaire** (307) vers `/app` |
| `/app` | tableau de bord de l'application |
| `/app/today`, `/app/habits`, … | les dix autres vues |
| `/prototype/…` | l'archive, inchangée |

La redirection de `/` est déclarée `permanent: false` **délibérément** : un 308 serait mis en
cache par les navigateurs, et la phase 6 devrait le déloger client par client. Elle disparaît
quand la vitrine prend sa place.

## Conséquences

- `robots.txt` (phase 6) pourra écrire `Disallow: /app` sans exclure la vitrine, et l'en-tête
  `X-Robots-Tag: noindex` se pose sur `/app/:path*` seul.
- Le `start_url` du manifeste PWA (phase 5) vaut `/app`.
- Le budget de crawl se concentre sur les pages qui ont quelque chose à référencer.
- Cette décision est cohérente avec **B1 option (c)** déjà prise : application sombre d'un côté,
  vitrine Modernist de l'autre. Deux univers visuels, deux racines.

## Conséquence non évidente : la CSP perd l'option du `nonce`

`next.config.mjs` notait que le `script-src 'unsafe-inline'` et le rendu statique (défaut **D12**)
« doivent être tranchés ENSEMBLE, pas l'un après l'autre ». C'est fait ici, et dans cet ordre :

**Le rendu statique gagne.** Une application 100 % locale n'a aucune raison d'exécuter une
fonction serveur pour afficher une page, et un `nonce` par requête impose précisément ce rendu
dynamique — c'est-à-dire une invocation serverless par affichage, sur un produit dont le modèle
est « 0 € d'infrastructure ».

Il en découle que la sortie propre pour le script anti-clignotement de thème (phase 3, tâche 3.5)
n'est **pas** un `nonce` mais une **empreinte SHA-256** : le script est unique, court et connu à
la compilation, donc son empreinte peut entrer dans la CSP sans rien rendre dynamique. Le plan de
la phase 3 dit « avec nonce CSP » ; il est corrigé dans le même mouvement.

Le risque résiduel de `'unsafe-inline'` reste celui déjà mesuré le 6 août : le produit ne rend
aucun HTML d'origine utilisateur, n'utilise nulle part `dangerouslySetInnerHTML` et ne charge
aucun script tiers.

## Alternative écartée

**Garder l'application à la racine et loger la vitrine ailleurs** (`/site`, un sous-domaine).
Aucune route à déplacer aujourd'hui — mais la vitrine perd l'autorité de la racine, et changer
d'avis après indexation coûte du référencement qu'on ne rachète pas.
