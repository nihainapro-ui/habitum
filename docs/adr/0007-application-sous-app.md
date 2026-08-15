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
| `/` | vitrine publique française — **livrée le 15 août 2026** (phase 6, tâche 7.1) |
| `/en` | la même vitrine en anglais |
| `/app` | tableau de bord de l'application |
| `/app/today`, `/app/habits`, … | les dix autres vues |
| `/prototype/…` | l'archive, inchangée |

La redirection provisoire de `/` vers `/app` était déclarée `permanent: false` **délibérément** :
un 308 aurait été mis en cache par les navigateurs, et la phase 6 aurait dû le déloger client par
client. Elle a été retirée le 15 août 2026, quand la vitrine a pris sa place — sans qu'aucun cache
n'ait à être purgé. C'est la seule raison pour laquelle ce détail méritait d'être écrit.

## Ce que la mise en place a révélé : deux layouts racines, pas un

Réserver la racine ne suffisait pas. `app/layout.tsx` posait `<html lang="fr">`, la feuille de
style sombre et `AppShell` — qui ouvre la base et arme les rappels. Une vitrine rendue là-dedans
aurait hérité des trois.

La structure est donc devenue **trois groupes de routes, chacun avec son propre layout racine** :

| Groupe | `<html lang>` | Feuille | Coque |
|---|---|---|---|
| `app/(app)/` | `fr` | `globals.css` (sombre) | `AppShell` |
| `app/(site-fr)/` | `fr` | `modernist.css` (clair) | `CoqueSite` |
| `app/(site-en)/` | `en` | `modernist.css` (clair) | `CoqueSite` |

Ce n'est pas une portée CSS, c'est une séparation de documents : la vitrine ne télécharge ni
Space Grotesk, ni les jetons de thème ; l'application ne télécharge pas Archivo. C'est aussi ce
qui rend `lang="en"` possible sur `/en` — un attribut de document se décide au layout racine ou
nulle part, et un `hreflang` qui pointe une page annoncée dans la mauvaise langue coûte le
critère « SEO 100 ».

## Conséquences

- `robots.txt` écrit `Disallow: /app` sans exclure la vitrine, et l'en-tête `X-Robots-Tag:
  noindex` se pose sur `/app`, `/app/:path*` et `/onboarding` seuls. Fait, tâche 7.3 — avec une
  précision apprise en chemin : `/app/:path*` ne couvre pas toujours `/app` nu, et c'est
  justement l'URL qu'on partage. Les deux motifs sont posés, et un test les vérifie.
- La vitrine ne porte AUCUN `X-Robots-Tag` — un test le vérifie aussi, parce qu'un `noindex`
  posé trop large sur la racine annulerait tout le travail de la phase sans rien casser de
  visible.
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
n'est **pas** un `nonce`. Le plan de la phase 3 dit « avec nonce CSP » ; il est corrigé.

> **Correction du 12 août 2026, à l'implémentation.** Cette ADR annonçait une **empreinte
> SHA-256**. C'est faux, et pour une raison qui n'est pas un détail : dès qu'une empreinte ou un
> `nonce` figure dans `script-src`, le navigateur **ignore `'unsafe-inline'`** — c'est la règle
> CSP. Or Next en a encore besoin pour s'hydrater. Ajouter l'empreinte aurait donc cassé
> l'application au lieu de la durcir.
>
> La sortie retenue est la seconde que le plan proposait : **un fichier statique servi depuis le
> même domaine** (`public/theme.js`), chargé de façon bloquante. Il passe par `'self'` : aucune
> tolérance à ajouter, aucune à retirer, et le rendu reste statique.

Le risque résiduel de `'unsafe-inline'` reste celui déjà mesuré le 6 août : le produit ne rend
aucun HTML d'origine utilisateur, n'utilise nulle part `dangerouslySetInnerHTML` et ne charge
aucun script tiers.

## Alternative écartée

**Garder l'application à la racine et loger la vitrine ailleurs** (`/site`, un sous-domaine).
Aucune route à déplacer aujourd'hui — mais la vitrine perd l'autorité de la racine, et changer
d'avis après indexation coûte du référencement qu'on ne rachète pas.
