# Journal des modifications

## 2026-08-27 — 8.9 close à un point près : dix vérifications sur onze

### Le blocage de Vercel, expliqué par sa disparition

Deux commits — `2686f7f` et `c80dc68` — étaient restés en **`Blocked`**, jamais construits.
Sur un plan Hobby, Vercel refuse un déploiement dont il ne rattache pas l'auteur au
propriétaire du compte. Aucune métadonnée Git ne les distinguait pourtant des autres : auteur
et committer identiques sur les quatre derniers commits, vérifié.

**Ce qui les distinguait, c'est la date : ils ont été poussés quand le dépôt était PRIVÉ.**
Depuis son passage en public, les déploiements par `git push` repassent en `Ready` — `98dbc57`,
`e3c360a` et `41a0bfb` l'ont fait sans intervention. Le blocage n'a donc pas été contourné, il
a cessé d'exister.

Entre-temps, le déploiement est passé par `vercel deploy --prod`, qui attribue le déploiement
au compte **connecté** plutôt qu'à l'auteur du commit. Cette voie reste utile le jour où le
blocage reviendrait.

### Un piège que `vercel link` pose dans `.gitignore`

La CLI y écrit deux lignes : `.vercel` et **`.env*`**. La seconde avale `.env.example` — un
fichier **suivi**, et le seul endroit où les variables attendues sont documentées. Les deux
sont retirées ; `.vercel/` était déjà couvert, les fichiers d'environnement réels aussi.

Le fichier étant en CRLF, le défaut s'est d'abord caché : `git check-ignore` répondait « non
ignoré », parce que le motif écrit par la CLI portait un `` final et ne matchait rien. Il se
serait réveillé à la première normalisation des fins de ligne. Le commentaire laissé sur place
dit de revérifier après chaque `vercel link`.

### Dix vérifications sur onze, et la onzième est écrite comme ouverte

| # | Vérification | |
|---|---|---|
| 1 | 11 routes applicatives + 14 URL de vitrine | ✅ 200 |
| 2 | **PWA installable** | ✅ installée à la main, sur téléphone |
| 3 | **Hors ligne effectif** | ✅ éprouvé sur la production |
| 4 | Export → réinitialisation → import | ✅ |
| 5 | Bascule FR ↔ EN | ✅ |
| 6 | Les trois thèmes | ✅ |
| 7 | **`securityheaders.com`** | ✅ **note A** |
| 8 | Aucune requête tierce | ✅ |
| 9 | `robots.txt` et `sitemap.xml` | ✅ |
| 10 | **Lighthouse en production** | ❌ **ouverte** |
| 11 | Sonde périodique | ✅ verte |

Plus **le rollback, réellement exécuté** : le site est repassé au build de 07:41 — vérifié
répondant en 200, vitrine et application — puis revenu à celui de 08:24. Un rollback jamais
essayé n'est pas un filet ; celui-ci a été essayé au calme plutôt qu'en panique.

**La onzième reste ouverte, et pour une raison structurelle :** `lighthouserc.json` code
`localhost` en dur dans ses cinq URL comme dans les motifs de son `assertMatrix`. Il n'existe
aucun chemin outillé vers une URL de production — le même défaut que celui corrigé le 25 août
sur les contrôles de requêtes tierces. S'y ajoute, sur la machine de développement, le
plantage `EPERM` de Chrome au nettoyage de son dossier temporaire. **Aucun score de production
n'est donc relevé, et aucun n'est déclaré.**

### CodeQL activé

Listé jusqu'ici parmi les limitations assumées, au motif que GitHub le réserve aux dépôts
publics sur un plan gratuit. Le motif a disparu avec le passage en public. Configuration par
défaut posée, suites `javascript-typescript` et `actions`. `eslint-plugin-security` reconnaît
des **motifs** ; CodeQL fait l'analyse de flux inter-procédurale que ces motifs ne voient pas.

### Le suivi d'anomalies disait n'importe quoi

**Onze issues ouvertes décrivaient toutes des défauts déjà corrigés** — entre le 8 et le 25
août. `main est rouge`, `Aucune PWA`, `i18n inutilisée`, `4 vulnérabilités hautes`, `SEO nul`…
Toutes fermées, chacune avec, dans son commentaire, ce qui l'a réglée et où le vérifier. **Zéro
issue ouverte.** Un suivi qui ment est pire qu'un suivi vide : il fait rouvrir des chantiers
terminés.

---

## 2026-08-25 — D11 fermée, et un contrôle qui ne prouvait plus rien

Passe de vérification avant mise en service, puis fermeture de **D11**. `npm run verify`
vert — **479 tests**, 37 fichiers ; `npm run test:e2e` : **625 passés, 0 échec**. Deux
défauts trouvés en exécutant la chaîne plutôt qu'en la lisant : un contrôle d'outillage
qui ne prouvait plus rien, et une montée majeure qu'on croyait obligatoire.

### Le dépôt passe en PUBLIC, et trois choses se règlent d'un coup

**Découvert en révisant la portée : les pages opposables du site affirmaient quelque chose de
faux.** La politique de confidentialité et les mentions légales — servies publiquement —
disaient « le code d'Habitum est **public** sous licence MIT : github.com/nihainapro-ui/habitum.
Vous pouvez le lire, le modifier, le construire et l'héberger vous-même ». Le pied de page y
renvoyait, et le JSON-LD déclarait `codeRepository`. **Le dépôt était privé : tous ces liens
étaient un 404 pour quiconque n'était pas son propriétaire.**

C'est exactement le défaut que ce dépôt s'interdit ailleurs — « une page opposable qui donne un
contact injoignable est pire qu'une page qui n'en donne pas » — appliqué cette fois à l'argument
central de la vitrine.

Le dépôt est donc **public** depuis le 25 août 2026. Vérifié avant de publier : seul
`.env.example` est suivi, avec un `localhost` en valeur ; aucun motif de secret dans l'arbre ;
et `gitleaks` analyse l'**historique complet** (`fetch-depth: 0`), vert.

Trois conséquences, toutes acquises par le même geste :

1. **Les pages légales disent vrai.**
2. **Les minutes GitHub Actions deviennent illimitées.** Un dépôt privé plafonne à 2 000
   minutes par mois sur le plan gratuit, et cette CI fait tourner six jobs dont `e2e` et
   `visuel`. La contrainte « tout doit rester gratuit » tient désormais sans arithmétique.
3. **La protection de branche est POSÉE**, côté serveur — l'écart `0.1` du plan 0, ouvert
   depuis le 11 août parce que GitHub la refusait sur un dépôt privé gratuit. `main` refuse le
   *force push* et la suppression **chez GitHub**, là où `git push --no-verify` ne peut rien.

**Ce qui n'est délibérément pas exigé : les contrôles de statut obligatoires.** Sur un dépôt
mono-contributeur qui pousse directement sur `main`, ils forment un cercle vicieux — ils
s'exécutent après le push qu'ils devraient bloquer. Le hook `pre-push` reste donc le contrôle
de fond, avec sa limite écrite. `SECURITY.md` et le hook lui-même portent le nouvel état ;
CodeQL, indisponible en privé, devient une amélioration ouverte au lieu d'une impossibilité.

### Portée révisée — un seul utilisateur, et deux tâches qui perdent leur objet

Le propriétaire a tranché : **l'application n'est destinée qu'à lui.** Deux tâches du plan 8
avaient été écrites pour un produit ayant un public.

- **8.7 — cinq tests utilisateurs : SANS OBJET.** Leur justification était la décision E : sans
  télémétrie, ces séances étaient la seule source d'information sur ce que des gens font du
  produit. L'argument tombe quand il n'y a pas de « gens ». Le protocole n'est pas supprimé —
  il redevient exigible tel quel le jour où quelqu'un d'autre s'en sert.
- **8.3 — trois parcours au lecteur d'écran : portée révisée.** Ils ne conditionnent plus la
  livraison, et redeviennent exigibles si l'application s'ouvre à d'autres, ou immédiatement si
  le propriétaire utilise lui-même un lecteur d'écran. **Aucun contrôle automatique n'est
  retiré** : les onze vues × trois thèmes restent auditées par axe à chaque exécution, et
  l'écart chiffré sur la taille de confort des cibles reste écrit. Une application à un seul
  utilisateur n'est pas dispensée d'être utilisable ; elle est dispensée de le PROUVER à
  d'autres.

Viser « 100 % du plan 8 » n'avait plus de sens tel quel : le plan a été écrit pour un produit
destiné à des tiers. Ce qui est écrit ici vaut mieux qu'un pourcentage obtenu en cochant des
cases vides.

### En ligne — 8.9, et un défaut que seul un vrai déploiement pouvait montrer

**https://habitum-one.vercel.app** — Vercel Hobby, région `cdg1`, décision C appliquée.

**Le premier build a échoué, et c'était notre faute, pas celle de Vercel.**

    Failed to collect configuration for /en/comparisons/[creneau]
    TypeError: Invalid URL — input: ''

`NEXT_PUBLIC_SITE_URL` avait été créée avec un champ **vide**. Or :

```ts
process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
```

`??` ne se déclenche que sur `null` et `undefined`, **jamais sur `''`**. `BASE_SITE` valait donc
la chaîne vide, et `new URL(chemin, '')` levait `ERR_INVALID_URL` au fond de la collecte de
pages. Le message ne nommait **ni la variable, ni le fichier, ni ce qu'on attendait** :
quarante secondes de build pour apprendre qu'un champ était vide.

Une variable d'environnement déclarée mais vide est l'erreur la plus banale d'une mise en
ligne. Aucun test ne la couvrait, parce que tous nos essais posaient soit une vraie valeur,
soit rien du tout — jamais la chaîne vide, qui est pourtant l'état par défaut d'un formulaire.

`BASE_SITE` passe donc par une fonction, et trois règles :

1. **vide ou blanc == absente** — repli sur le local, comme si rien n'avait été posé ;
2. **présente mais invalide == échec immédiat, qui se nomme** — mieux vaut un build rouge
   lisible qu'une vitrine annonçant `localhost` à tous les moteurs ;
3. **on rend l'ORIGINE** — la barre finale est retirée au lieu d'être interdite. Une consigne
   qu'un humain doit tenir à la main est une consigne qui sera oubliée ; `new URL().origin` la
   rend sans objet, et `DEPLOY.md` n'a plus à la répéter.

**Huit tests** verrouillent le tout, dont celui de la chaîne vide. Build rejoué avec
`NEXT_PUBLIC_SITE_URL=""` : vert.

**Corrigé dans la foulée, parce que le même build l'annonçait :** `lib/version.ts` importait
`version` en export NOMMÉ depuis `package.json` — « only default export is available soon ».
Un avertissement aujourd'hui, une rupture à la prochaine montée. Passé en import par défaut.

**Les onze vérifications post-déploiement, exécutées :**

| Bloc | Résultat |
|---|---|
| 11 routes applicatives + 14 URL de vitrine | ✅ 200 |
| `noindex` sur `/app`, vitrine indexable | ✅ |
| `robots.txt`, `sitemap.xml` — bon domaine, aucun `localhost` | ✅ |
| Six en-têtes de sécurité, `X-Powered-By` absent | ✅ |
| PWA — manifeste, trois icônes, `sw.js`, `start_url` | ✅ |
| **Hors ligne, sur la production** | ✅ |
| **Export → réinitialisation → import** | ✅ |
| FR ↔ EN sur les onze vues, trois thèmes | ✅ |

46 contrôles HTTP par `scripts/verif-production.mjs`, puis 14 tests de navigateur pointés sur
la production (`BASE_URL=…`). La **sonde périodique est armée** : `SITE_URL` est posée, le
workflow s'exécute toutes les six heures et ouvre une issue critique si le site ne répond plus.

Restent, et ils demandent une main humaine : la note `securityheaders.com`, un rollback
réellement exécuté une fois, et le tag `v1.0.0`. La Search Console attend délibérément que le
domaine définitif soit tranché — déplacer un domaine déjà indexé coûte du référencement.

### Corrigé — deux des onze vérifications de 8.9 étaient INEXÉCUTABLES en production

`playwright.config.ts` annonce `BASE_URL` comme le moyen de passer en production les quatre
vérifications qui demandent un navigateur. Au premier usage réel, six tests ont rougi — et la
liste des « requêtes tierces » qu'ils affichaient contenait… `https://habitum-one.vercel.app`.

Le filtre codait l'origine en dur :

```ts
if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;
```

Pointé ailleurs que sur la machine locale, le contrôle déclarait donc TIERCES les propres
ressources du site. **Le test censé prouver la promesse produit — « rien ne sort de
l'appareil » — était précisément celui qu'on ne pouvait pas passer là où elle engage.**

`estMemeOrigine(url, baseURL)` déduit l'origine du `baseURL` de Playwright, et le contrôle des
polices ne cherche plus `^http://localhost` mais la même origine, plus l'extension `.woff2`.
Vérifié dans les DEUX contextes, ce qui est tout l'intérêt : **57 tests verts en local, 57
verts contre la production.**

**Le contrôle 10 reste ouvert, et pour la même raison de fond :** `lighthouserc.json` code lui
aussi `localhost` en dur — dans ses cinq URL comme dans les motifs de son `assertMatrix`. Il
n'existe donc aucun chemin outillé pour « Lighthouse en production ». S'y ajoute, sur cette
machine, le plantage `EPERM` de Chrome au nettoyage de son dossier temporaire, déjà consigné le
20 août : l'audit s'exécute et meurt en rendant ses résultats. Le score de production n'a donc
pas été relevé, et il n'est pas déclaré.

### Fermé — D11 : zéro vulnérabilité haute, sans la montée majeure (8.6)

La tentative du 18 août visait la mauvaise cible, et c'est ce qui l'a fait échouer. Les
quatre vulnérabilités hautes ne sont **pas dans `next`** : ce sont `postcss@8.4.31` et
`sharp@0.34.5`, IMBRIQUÉS sous lui. On les remonte par `overrides` sans toucher à Next.

| Paquet | Avant | Après |
|---|---|---|
| `postcss` | 8.4.31 | 8.5.26 |
| `nanoid` | 3.3.17 | 3.3.18 |
| `sharp` | 0.34.5 | 0.35.3 |

`npm audit --audit-level=high` sort désormais en **0**, et le seuil de la CI y est remonté —
il était à `critical` depuis le premier jour, avec sa date et son motif.

**Ce que la montée du 18 août coûtait, et que celle-ci ne coûte pas.** Les deux régressions
qui avaient fait annuler `next@16` étaient le service worker qui ne prenait plus le contrôle
et la vitrine qui téléchargeait les dix fichiers de polices. Les deux contrôles ont été
rejoués NOMMÉMENT, pas déduits d'une suite verte : « le service worker s'enregistre et prend
le contrôle », « l'application fonctionne hors ligne », et les cinq contrôles de polices —
onze tests, tous verts.

**Deux raisons qui rendent l'échange peu risqué**, et qui sont écrites dans `package.json`
à côté du bloc :

- **`sharp` n'est jamais appelé.** `next/image` n'apparaît nulle part dans le dépôt. Le
  paquet est installé et ne sert à rien — c'est une dépendance optionnelle de `next`.
- **La modérée `next-intl` qui subsiste est hors surface.** Ses deux avis visent l'API de
  navigation next-intl — ce dépôt n'a **aucun `middleware`** et n'importe ni
  `next-intl/navigation` ni `createNavigation` — et `experimental.messages.precompile`, non
  utilisé. Le produit ne se sert que de `useTranslations`, `getMessages` et
  `getRequestConfig`.

Les `overrides` sont un emplâtre, et le commentaire de `package.json` le dit : ils partent le
jour où `next@16` passe. Ce jour dépend toujours de `@serwist/next`, qui en est à `9.5.12`
en stable, sans version compatible Next 16.

### Profilé — 8.5 : le dossier accusait les mauvaises causes, les trois

La lenteur de l'import était documentée depuis le 17 août avec trois causes présumées. Elles
ont été **mesurées** avant d'ouvrir le chantier ; les trois tombent.

Import de 2 Mo (43 691 entrées) sur un compte vierge, build de production :

| Phase | Coût |
|---|---:|
| Copie de secours | **12 ms** |
| Analyse et validation | 69 ms |
| **Transaction d'écriture** | **35 798 ms** |
| `rechargerDonnees()` | **13 ms** |

**99,6 % du temps est dans l'écriture.** Les causes 2 et 3 du dossier — la copie de secours
qui ré-exporte tout, la relecture derrière — coûtent 25 ms à elles deux sur ce cas.

La cause 1 ne tient pas davantage. Expérience isolée en IndexedDB brut, mêmes 43 691 lignes :

| Forme | Coût |
|---|---:|
| Clé composite + 3 index secondaires | 33 995 ms |
| Clé composite, **aucun index** | 36 221 ms |
| **Clé simple**, aucun index | **20 147 ms** |

**Retirer les trois index secondaires ne gagne rien** — l'écart est du bruit. La migration
Dexie que la recette prescrivait aurait coûté un chantier et une migration de schéma pour
zéro gain. Et même la forme la plus favorable donne 20 s, quatre fois le budget de 5 s :
**aucun réglage du schéma n'atteint la cible.**

Ce qui pèse est le NOMBRE de lignes — ~0,8 ms par `put`, quelle que soit la forme. Le seul
levier restant est donc la **forme du journal** : une ligne par (habitude, jour) fait 43 691
écritures là où le prototype gardait `ov` en un seul objet. C'est une décision de conception,
pas une migration à ajouter — et elle n'est pas prise ici.

C'est la **deuxième fois** que ce chemin dément une hypothèse écrite : la première accusait
`zod`, qui ne coûte que 246 ms sur 219 000 entrées. La leçon vaut d'être notée deux fois.

L'horloge simulée de Playwright a été écartée comme cause : sans elle, 33 995 ms au lieu de
34 325. Les commentaires des deux tests `fixme` portent désormais ces chiffres — c'est là
qu'on les lira.

### Corrigé — `npm run test:e2e` exécutait la non-régression visuelle

`playwright test` sans argument exécute les **trois** projets, `visual` compris. Le commentaire
de `tests/e2e/visual/vues.spec.ts` § 3 affirmait pourtant que ces fichiers en étaient « exclus »,
et le job `visuel` de la CI est décrit comme séparé de `e2e` — la configuration, elle, ne
séparait rien.

Ce que cela coûtait, mesuré : sur Windows, `npm run test:e2e` cherche un socle `-win32` qui
n'existe pas. Playwright ne s'arrête pas là — **il l'écrit**, signale 33 échecs, et la seconde
exécution passe au VERT en comparant Windows à Windows. Le contrôle survit à sa propre
raison d'être : il ne compare plus rien au socle Linux de la CI, et il l'annonce en vert.
`.gitignore` empêchait déjà ce faux socle d'entrer au dépôt — mais c'est le second garde-fou,
et le premier manquait.

En CI le job `e2e` rejouait donc les 33 captures que le job `visuel` refait juste après.

`test:e2e` nomme désormais ses deux projets (`desktop`, `mobile`). Vérifié par énumération :
**644 tests** pour `npm run test:e2e`, **33** pour `--project=visual`, 677 au total — la somme
est exacte, aucun test n'est tombé du partage.

### Corrigé — trois affirmations périmées dans `docs/`

- `docs/RECETTE-2026-08-17.md` § 8 disait encore « aucun indicateur de progression » à l'import.
  Il existe depuis le 20 août : attente visible, boutons grisés, message en région live polie
  (`import-busy`). L'attente est **dite** ; elle n'est toujours pas raccourcie, et le § 8 reste
  ouvert sur ce point.
- Le tableau d'avancement de `2026-08-06-habitum-programme.md` portait « ⬜ à faire » sur les
  plans 6, 7 et 8, livrés respectivement les 13, 15 et 20 août. Les quatre réserves du plan 8 y
  sont maintenant nommées avec ce que chacune demande.

### Vérifié en amont, pas supposé

`@serwist/next` n'a **toujours pas** de version stable compatible Next 16 : dernière stable
`9.5.12`, seule une `10.0.0-preview.14` existe. Le blocage de la tâche 8.6 est donc extérieur au
dépôt, et la décision d'annuler la montée du 18 août tient sans réexamen.

---

## 2026-08-20 — Phase 7 : ce qui pouvait être clos l'a été

Suite directe de l'entrée du 17 août. Quatre points restaient à ma portée sans personne ni
déploiement ; les quatre sont faits. **475 tests unitaires**, `npm run verify` vert.

### Tenu

- **`exactOptionalPropertyTypes` activé (D23).** 34 erreurs, corrigées selon une règle et non
  au cas par cas — parce que la règle est justement ce que le drapeau sert à révéler :

  | Situation | Traitement |
  |---|---|
  | `undefined` ≠ absent, et la différence est RÉELLE | spread conditionnel, la distinction est rendue explicite |
  | `undefined` = absent, sur nos propres composants | `?: T \| undefined`, la déclaration dit la vérité |
  | Entité qui part EN BASE | le champ vide est **omis**, jamais posé à `undefined` |

  Le premier cas couvre Radix, où `open={undefined}` bascule un composant en mode NON
  CONTRÔLÉ — ce n'est pas un détail de typage, c'est un changement de comportement. Le
  troisième couvre les trois éditeurs : dans IndexedDB, une clé absente et une clé valant
  `undefined` ne se relisent pas pareil, et le modèle vise la synchronisation, où « jamais
  renseigné » et « effacé » ne se fusionnent pas de la même façon.

- **Le contrat de `UpdatePatch` est devenu explicite, et testé.** `{ sourceHabitId: undefined }`
  voulait dire deux choses à la fois — « ne touche pas » ou « efface » — et la ligne écrite
  gardait la clé avec une valeur `undefined`, qui n'est ni l'un ni l'autre. Désormais :
  **clé absente = ne pas toucher, clé à `undefined` = RETIRER le champ**, et `update` supprime
  réellement la clé. Deux tests le verrouillent, dont un qui relit depuis la base — c'est là
  que le défaut se serait vu, pas en mémoire. Cas d'usage réel : supprimer une habitude
  détache les objectifs qu'elle alimentait.

- **Indicateur de progression à l'import** — le plan le demandait, il n'existait pas. L'import
  d'un fichier de 2 Mo prend 32 s, et l'écran ne disait RIEN : ni sablier, ni bouton grisé.
  Une interface muette sur une opération longue est une interface qu'on croit plantée, et
  l'utilisateur ferme l'onglet **au milieu d'une écriture**. L'attente est maintenant visible,
  **annoncée** en région live polie — trente secondes de silence n'existent pas pour qui ne
  voit pas l'écran — et elle retombe **même quand l'import échoue** : sans ce `finally`, un
  refus laissait les boutons grisés pour toujours. Deux tests, dont celui du refus.

- **Décision C tranchée : Vercel Hobby.** Le produit est **non commercial**, et les conditions
  du plan Hobby ne l'interdisent qu'à l'usage commercial. La décision est donc durable, et
  elle est écrite là où elle engage : `lib/site/routes.ts` (d'où les mentions légales tirent
  le nom de l'hébergeur), `DEPLOY.md`, et la table des décisions du programme.

  **La contrainte qui l'accompagne, et qui vaut pour la suite :** Hobby interdit TOUTE
  monétisation. Cela ferme les **dons** rattachés au produit (décision F) et la
  **synchronisation payante** de la v1.1. Si l'une revient, il faut Cloudflare Pages ou Vercel
  Pro — et il faut en changer **avant** l'indexation, parce que déplacer un domaine déjà
  référencé coûte du référencement.

### Mesuré

- **Budget de performance rejoué** après les corrections de jetons du 17 août :
  **100 / 100 / 100 / 100** sur `/` et `/en`, 100 / 100 / 100 sur `/onboarding` (dont le SEO à
  63 est attendu — la page est `noindex`, et le budget y désactive `is-crawlable`). Assombrir
  quatre couleurs du thème `clinical` ne coûte rien au budget, et l'accessibilité reste à 100.

  L'exécution se fait dans le conteneur officiel : sous Windows, Chrome échoue sur le nettoyage
  de son dossier temporaire (`EPERM`), et la CI mesure de toute façon sur `ubuntu-latest`.

### Un détail qui aurait cassé la construction en silence

`app/sw.ts` mentionnait `self.__SW_MANIFEST` deux fois après le passage au spread conditionnel,
et l'injecteur de Serwist refuse d'en trouver deux — la construction échouait avec « Multiple
instances of self.__SW_MANIFEST ». Une constante intermédiaire suffit, et le commentaire dit
pourquoi elle est là, pour qu'on ne la « simplifie » pas plus tard.

### Ce qui reste, et ce que ça demande

| # | Reste | Ce qu'il faut |
|---|---|---|
| 8.6 | `next@16` / `next-intl@4` | Serwist compatible + découpage des polices par groupe de routes |
| 8.3 | 3 parcours au lecteur d'écran | une personne qui écoute — protocole prêt |
| 8.7 | 5 tests utilisateurs | cinq personnes — protocole prêt |
| 8.9 | mise en ligne, 11 vérifications, rollback éprouvé | des accès Vercel — **plus aucune décision en amont** |

Le chemin critique n'est plus une décision : c'est un accès.

---

## 2026-08-17 — Phase 7 : qualité (parcours, non-régression visuelle, accessibilité)

Première moitié de la phase de sortie. On ne cherche plus à construire, on cherche à casser :
huit parcours critiques de bout en bout, un socle de non-régression visuelle, un audit
d’accessibilité étendu aux vues peuplées et aux trois thèmes. **Six défauts réels trouvés et
corrigés**, dont deux sur le chemin de RESTAURATION — l'application refusait de relire sa
propre sauvegarde au-delà d'une quarantaine d'habitudes. **Un septième reste ouvert, mesuré
et documenté** : à pleine charge, la restauration n'aboutit toujours pas.

`npm run verify` vert — **473 tests unitaires**. Non-régression visuelle : 33 captures vertes.
Recette consignée : `docs/RECETTE-2026-08-17.md`.

### Tenu

- **Les huit parcours critiques**, un fichier par parcours, verts sur desktop et mobile
  (`tests/e2e/parcours/`). Chacun se termine sur un **état observable**, jamais sur un clic
  réussi. Le parcours 5 — export → réinitialisation → import — est écrit en premier : c'est
  le seul qui a déjà échoué. Il ne compare pas à une charge fabriquée mais à l'état AFFICHÉ
  avant l'export, et exige l'égalité `gardées == lues` plutôt qu'un nombre en dur, qui
  rougirait à la première entrée ajoutée au jeu de démonstration. (8.1)
- **Ce que les parcours ajoutent aux tests de vue : le RECHARGEMENT au milieu du geste.** Une
  écriture avalée par le store ne se voit qu'à la relecture — d'où le plafond `limit` repris
  trois fois autour de sa cible (G9), le Pomodoro repris après rechargement, et le
  déplacement au calendrier vérifié en base. (8.1)
- **Socle de non-régression visuelle** : 11 vues × 3 thèmes, 33 captures, date figée au
  5 août 2026 (`tests/e2e/visual/`). Le socle est celui de **Linux** — celui que produit
  `ubuntu-latest`. Hors Linux, `npm run test:visual` passe par le conteneur officiel
  Playwright : mêmes polices, mêmes pixels qu'en CI. Job `visuel` séparé du job `e2e` : un
  écart visuel et un parcours cassé ne se lisent pas de la même façon. (8.2)
- **axe étendu** aux onze vues PEUPLÉES, dans les trois thèmes, et à WCAG 2.2 — c'est
  l'étiquette `wcag22aa` qui apporte `target-size`. Zéro violation critique ou sérieuse. (8.3)
- **Charge côté client complétée** : heatmap six mois, export, import du fichier produit, et
  **3 recalculs au clic sur 600 entrées en cache** — le plan en tolérait dix. (8.5)
- **Robustesse de l'import** : pollution de prototype (`__proto__`, `constructor`, clés de
  journal hostiles), fichier au-delà du plafond refusé **avant analyse**, JSON malformé refusé
  avec un code stable, et un refus qui n'écrit ni ne détruit rien. (8.6, partiel)
- **`react/no-danger` en ERREUR** dans ESLint. Le contrôle existait en e2e, sous forme de
  grep sur les fichiers : il arrivait après coup, et seulement si on le lançait. (8.6, partiel)
- **Page de version** (Réglages → À propos) : version applicative, version de schéma Dexie,
  date de construction figée à la compilation. C'est ce qui rend un rapport d'anomalie
  exploitable quand on n'a ni compte ni télémétrie. (8.8)
- **`docs/RUNBOOK.md`** : rollback en une minute, trois niveaux de gravité, et le seul
  incident S1 réellement possible — une régression de la couche de données. (8.10)

### Corrigé — six défauts, dont deux sur le chemin de restauration des données

- **Quatre couleurs de rôle échouaient à WCAG AA dans le thème `clinical`.** `--acc2` mesurait
  **2,55:1** — la couleur qui porte les séries, les taux et les liens ; `--ok`, `--warn` et
  `--bad` échouaient aussi. Personne ne le voyait parce que `contrast.test.ts` ne surveillait
  que `txt`, `txt2` et `mut` : tout, sauf les couleurs qui portent les CHIFFRES. Corrigé **à
  la source** (jetons du prototype), teinte et saturation conservées, puis `tokens.css`
  régénéré par extraction — même méthode que la correction de `--mut` du 12 août. Les treize
  paires sont désormais sous contrôle unitaire, sur les trois thèmes.
- **Dix composants écrivaient une encre presque noire en dur** (`#04060d`) sur un aplat `--ok`
  ou `--acc2`, ou sur le dégradé `--acc → --acc2` : bouton principal, case cochée, pastille de
  semaine, jour courant du calendrier, bandeau de mise à jour, accueil, minuteur. Juste dans
  les deux thèmes sombres, **faux dans `clinical`**, dont les accents sont sombres — texte
  sombre sur fond sombre. **axe ne pouvait pas le voir** : il n'évalue pas le contraste d'un
  élément dont le fond est un dégradé. L'encre se déduit maintenant du thème
  (`components/ui/encre.ts`), et la seule exception — l'avatar, dont le dégradé OKLCH est
  clair dans les trois thèmes — est écrite sur place.
- **La carte de chaleur défilait au lieu de se réorganiser sous 768 px** — dernier point
  responsive ouvert depuis l'audit du prototype. Vingt-six colonnes demandent 364 px ; il en
  reste environ 320 à 390 px de large. Le cadre `overflow-x: auto` absorbait le débordement :
  **la page ne débordait pas, et le contrôle des quatre paliers ne voyait rien.** Ce qui
  restait, c'était la moitié droite de six mois d'historique atteignable par un geste
  horizontal, et par lui seul — hors de portée sans souris ni doigt, ses cellules étant de
  simples `<span>`. La carte montre désormais treize semaines sous 768 px, et **le dit** :
  l'intitulé passe à « 3 derniers mois » (G3).
- **L'écriture du journal à l'import était trois fois trop lente.** Profilé plutôt que deviné,
  et la première hypothèse était fausse : la validation `zod` ne coûte que **246 ms** sur
  219 000 entrées, `JSON.parse` **134 ms**. Le coût était entièrement dans **`logs.bulkPut`
  d'un seul bloc de 219 000 lignes : 90 s**. Les mêmes lignes **par lots de 10 000 : 27 s**,
  un facteur 3,3 pour trois lignes de code. Les lots restent DANS la transaction : l'atomicité
  ne cède rien, un import interrompu ne laisse toujours pas une base à moitié peuplée.
- **Le plafond d'import était plus bas que l'export du produit lui-même — perte de données
  différée.** `MAX_IMPORT_BYTES` valait **2 Mo** ; à la charge documentée du plan — 200
  habitudes × 3 ans, 219 000 entrées — `exportToJson()` produit **10,6 Mo** (5,32 Mo pour
  `log`, autant pour `ov`, qui porte le même objet sous son ancien nom, G1). Au-delà d'une
  quarantaine d'habitudes tenues sur trois ans, l'utilisateur téléchargeait une sauvegarde que
  l'application **refusait de relire**. Sans compte, l'export EST la sauvegarde : le garde-fou
  détruisait exactement ce qu'il devait protéger. Trouvé par le test de charge de la tâche 8.5,
  qui réimporte le fichier qu'il vient de produire — **aucun test ne le faisait avant**, parce
  qu'aucun ne partait d'un export réel à l'échelle. Plafond porté à 64 Mo, six fois la charge
  du plan, et le refus reste posé AVANT lecture. Un test unitaire recalcule la taille attendue
  au lieu de la recopier : si le format d'export change, le chiffre suit.
- **Le panneau « À propos » affichait `Habitum 2.4 · Web`**, une chaîne écrite en dur, jamais
  mise à jour, et fausse. Un numéro de version inventé est pire qu'absent : il fait
  diagnostiquer la mauvaise version.

### Trois écarts au plan, tous délibérés et écrits sur place

- **Le parcours 6 ne prouve pas « l'isolation des profils »** : il n'y en a pas. Un profil est
  une identité — nom, identifiant, fonction, avatar — et non une partition de données ; aucune
  table ne porte de colonne de profil, ici comme dans le prototype. Le parcours fixe donc ce
  que la bascule garantit réellement, et **consigne explicitement que les données sont
  PARTAGÉES**, pour qu'une isolation ajoutée un jour casse ici plutôt que d'être supposée.
- **Les cibles tactiles sont jugées par `target-size` d'axe, pas par une mesure maison.** Le
  critère WCAG 2.2 n'est pas « chaque cible fait 24 px » : une cible plus petite est conforme
  si un cercle de 24 px centré sur elle ne croise aucune autre cible. Une mesure maison qui
  ignorait cette exception a inventé trente-quatre violations sur des cases à cocher qu'axe
  déclare conformes, à raison. Le seuil de **confort de 44 px demandé par le plan n'est pas
  atteint** : 174 commandes sont dessous. Il est **mesuré, imprimé à chaque exécution et
  chiffré par famille** dans `docs/a11y/rapport-lecteur-ecran.md` § 3 plutôt que passé sous
  silence — l'atteindre voudrait dire épaissir toutes les commandes de l'application, un
  remaniement visuel que la phase n'a pas budgété et qui s'écarterait du prototype.
- **Le compteur de recalculs du plan vivait sur `window`, dans un test de navigateur.** Il est
  mesuré à la place dans le test unitaire du store, où l'unité est exacte — le nombre
  d'entrées oubliées EST le nombre de recalculs à payer — et où il n'exige aucune trappe en
  production.

### Le harnais visuel a failli n'asserter rien

Le contrôle négatif (`VISUEL_CONTROLE_NEGATIF=1` : rotation de teinte de 40° sur toute la
page) **passait au vert** avec le seuil par défaut de Playwright. La raison tient au produit :
deux thèmes sur trois sont quasi monochromes, et tourner la teinte d'un gris ne le déplace
presque pas en espace YIQ. Le harnais était donc aveugle à la régression la plus probable —
un jeton de couleur qui change — c'est-à-dire exactement ce que la tâche 8.3 venait de trouver
à la main. Relevé sur les 33 captures : seuil 0,2 → **0 échec** ; 0,05 → 7 ; **0,02 → 27**.
Le seuil retenu est 0,02, et le contrôle négatif reste dans le fichier.

Une deuxième cause d'instabilité a été trouvée au passage : le thème était posé **avant** que
les transitions soient neutralisées, si bien que quatre captures sur trente-trois saisissaient
la page à mi-interpolation — toutes en `clinical`, dont les fonds partent de plus loin. Même
défaut, même correction, dans l'audit axe : on mesurait des couleurs intermédiaires qui
n'existent dans aucun état stable du produit.

### Les montées majeures : tentées, mesurées, ANNULÉES (8.6, D11 et D23)

`next@16` + `next-intl@4` ont été installées, éprouvées, puis **retirées**. Ce n'est pas un
renoncement de principe : c'est le résultat de l'essai, et il vaut mieux qu'il soit écrit que
refait de zéro dans six mois.

**Ce que la montée apporte, et c'est réel :** `npm audit` passe de **quatre vulnérabilités
hautes à ZÉRO** (`postcss`, `sharp` par `next`, plus `nanoid` corrigé au passage). C'est
exactement ce que D11 attendait.

**Ce qu'elle coûte, mesuré sur la chaîne complète :** `npm run verify` reste vert — 473 tests
unitaires, build statique intact, aucune route repassée en dynamique (D12 tenu). Mais **six
contrôles e2e tombent, et deux régressions sont réelles** :

1. **La vitrine télécharge tout le registre sombre.** `/` réclame les dix fichiers de
   polices — Space Grotesk et JetBrains Mono compris — sur une page qui n'en affiche pas un
   caractère. Next 16 ne découpe plus la feuille de styles de `next/font` par import :
   séparer `lib/fonts.ts` en deux modules, l'un pour la vitrine l'autre pour l'application,
   **n'y change rien** (essayé, mesuré). La séparation des registres de la phase 6, et le
   budget Lighthouse qui en dépend, ne tiennent plus. C'est `tests/e2e/seo.spec.ts` qui l'a vu.
2. **Le service worker ne prend plus le contrôle.** Les quatre contrôles PWA expirent :
   installable et hors ligne tombent tous les deux. `@serwist/next@9.5.12` déclare pourtant
   `next: >=14` — la compatibilité annoncée n'est pas la compatibilité constatée.

**Trois autres frottements, ceux-là traités :** `eslint-config-next@16` livre des
configurations plates et `FlatCompat` ne les traduit plus (référence circulaire au
validateur) ; le compilateur React ajoute deux règles qui relèvent quatorze occurrences — non
des défauts, mais le motif « lire le navigateur après le montage » qu'impose le prérendu
(D12), et dont la sortie propre est `useSyncExternalStore` sur treize composants ; `next build`
réécrit `tsconfig.json`.

**`exactOptionalPropertyTypes` (D23)** a été activé dans la foulée : **34 erreurs**,
concentrées dans les trois éditeurs (21 sur 34) et exactement là où le plan les annonçait —
`Habit.start`, `Habit.end`, `Task.time`, `Goal.window`. Rien d'insurmontable, mais c'est un
chantier à part entière, et l'enchaîner à une montée qu'on vient d'annuler n'aurait rien
prouvé.

**Pourquoi annuler plutôt que livrer :** livrer aurait échangé quatre vulnérabilités hautes
— dans des dépendances de construction, sur une application qui ne reçoit aucune entrée
réseau — contre la perte du fonctionnement hors ligne et du budget de performance de la
vitrine. Ce n'est pas un bon échange, et surtout ce n'est pas un échange à faire en fin de
phase. Le seuil d'audit de la CI reste donc à `critical`, avec sa date et son motif.

**Ce que la prochaine tentative doit régler d'abord :** la compatibilité Serwist ↔ Next 16,
et le découpage des polices par groupe de routes. Les deux sont indépendantes du reste du
produit, et les huit parcours plus les 33 captures sont désormais là pour juger le résultat —
c'est précisément ce que le plan attendait d'eux.

### Reste ouvert — et pourquoi

| # | Ce qui manque | Ce qu'il faut |
|---|---|---|
| 8.6 | `next@16`, `next-intl@4`, `exactOptionalPropertyTypes`, seuil d'audit à `high` | **tenté et annulé** — voir ci-dessus |
| 8.3 | Trois parcours au lecteur d'écran (NVDA, VoiceOver) | une personne qui écoute — protocole prêt |
| 8.7 | Tests utilisateurs, 5 personnes × 3 parcours | cinq personnes — protocole prêt |
| 8.9 | Mise en production, 11 vérifications, `securityheaders.com` | décision C et accès d'hébergeur |

### Un défaut connu, mesuré, laissé ouvert — la lenteur de l'import

**L'écriture du journal à l'import reste trop lente**, à deux échelles :

| Charge | Attendu (plan) | Mesuré |
|---|---|---|
| Fichier de 2 Mo (~43 700 entrées) | < 5 s | **32,3 s** |
| Export à pleine charge (10,7 Mo, 219 000 entrées) | doit aboutir | **n'aboutit pas en 5 min** |

Et dans les deux cas, **aucun indicateur de progression** — que le plan demandait pourtant.
L'écriture par lots a déjà gagné un facteur 3,3 ; ce qui reste tient au schéma : chaque ligne
de journal entretient **trois index secondaires** en plus de sa clé primaire composite, et le
réduire demande une migration Dexie. À instruire, pas à bricoler en fin de phase, sur le
chemin qui restaure les données des gens.

Les deux tests restent dans le harnais, marqués `fixme` : ils gardent le budget du plan
**écrit**, et repasseront au vert le jour où il sera tenu. Abaisser un seuil pour faire passer
la suite aurait produit un contrôle qui ne mesure plus rien — c'est exactement le défaut que
la phase 6 avait trouvé sur le budget Lighthouse.

Portée : un compte ordinaire — quelques habitudes, un an — importe en quelques secondes. Il
faut une quarantaine d'habitudes tenues trois ans pour atteindre 2 Mo. Mesures et pistes :
`docs/RECETTE-2026-08-17.md` § 8.

---

## 2026-08-15 — Phase 6 : vitrine et SEO

Le projet a enfin un actif indexable, et l'application a cessé d'en être un. La racine sert une
vitrine bilingue en système **Modernist** ; les onze vues passent `noindex`, par `robots.txt` et
par en-tête. **Lighthouse 100 / 100 / 100 / 100** sur les quatre URL de vitrine mesurées, `npm run
verify` vert, **438 tests unitaires** et **558 tests e2e** verts sur desktop et mobile.

### Tenu

- **La racine appartient à la vitrine.** La redirection provisoire `/` → `/app` a disparu — elle
  était posée en `permanent: false` précisément pour ce jour, et aucun cache de navigateur n'a eu
  à être purgé. (7.1, ADR-0007)
- **Vingt-quatre URL bilingues** : accueil, fonctionnalités, deux index de rubrique, trois
  comparatifs, trois guides, confidentialité, mentions légales — chacune en français à la racine
  et en anglais sous `/en`, avec des créneaux **traduits** (`/guides/arreter-alcool` ↔
  `/en/guides/quit-alcohol`). Tout est prérendu : zéro fonction serveur, D12 intact. (7.1, 7.5, 7.6)
- **Jetons Modernist EXTRAITS**, pas recopiés. `scripts/extract-modernist-tokens.mjs` les tire du
  système livré dans l'archive, et `npm run check:modernist` échoue s'ils dérivent — même
  discipline que `styles/tokens.css`, et pour la même raison (D3). Seules `--font-heading` et
  `--font-body` sont réaffectées : le système les charge depuis Google Fonts, la vitrine sert
  **Archivo** depuis son domaine (OFL 1.1, `check:fonts`). (7.1)
- **Métadonnées complètes** : `metadataBase`, canonique, `hreflang` fr/en/x-default réciproques,
  Open Graph, Twitter Card, et une **image sociale 1200 × 630 générée** en Modernist avec sa police
  **embarquée** — lue sur le disque, jamais récupérée en ligne. (7.2)
- **`robots.txt` et `sitemap.xml` engendrés par la table des URL**, jamais rédigés. Une page
  ajoutée à `lib/site/routes.ts` entre au plan du site avec ses alternats, ou n'existe pas. (7.3)
- **JSON-LD** `SoftwareApplication` (`price: "0"`, `isAccessibleForFree`), `FAQPage` sur les huit
  questions réellement affichées, `BreadcrumbList` et `Article` sur les pages de fond. (7.4)
- **Politique de confidentialité et mentions légales** opposables, datées, et alignées sur le
  code : l'hébergeur, la région et le contact sont lus depuis `lib/site/routes.ts`, pas recopiés —
  la décision C peut encore changer l'hébergeur. (7.6)
- **Budget Lighthouse en CI** sur cinq URL, trois passes chacune, rapports en artefact et non sur
  un stockage public tiers. (7.7)

### Trois écarts au plan, tous délibérés

- **Deux layouts racines pour le site, un troisième pour l'application.** Le plan prévoyait un
  groupe `(site)` sous le layout existant. Impossible : ce layout pose `lang="fr"`, la feuille
  sombre et `AppShell` — qui ouvre la base et arme les rappels. La vitrine n'a besoin d'aucun des
  trois, et `/en` a besoin de `lang="en"`, qui ne se décide qu'au layout racine. Les trois groupes
  sont donc des documents distincts : la vitrine ne télécharge ni Space Grotesk ni les jetons de
  thème, l'application ne télécharge pas Archivo, et un test le vérifie.
- **Aucun `nonce` pour le JSON-LD**, contrairement au plan. ADR-0007 avait déjà tranché l'inverse,
  et la raison n'a pas bougé : un nonce impose un rendu dynamique. Il n'a pas fallu de
  `dangerouslySetInnerHTML` pour autant — React ne réencode pas le texte d'une balise `<script>`,
  et le sérialiseur échappe `<`, ce qui rend un `</script>` inséré structurellement impossible à
  refermer.
- **Pas de capture d'écran dans la section « preuve ».** Les captures de recette vivent hors de
  Git et pèsent 3,3 Mo. La preuve est donc factuelle — le modèle en entier, et l'onglet réseau
  vide — ce qui est aussi le choix qu'avait fait le prototype de vitrine.

### Corrigé — six défauts, dont deux que personne ne regardait

- **La séparation des layouts racines avait coûté le 404 du projet.** Sans layout racine unique,
  Next ne sait pas lequel appliquer à une URL qui ne correspond à rien : il servait sa page
  interne — pas d'attribut `lang`, pas de marque, aucun lien de retour. Le code de statut restait
  correct, et **aucun test ne regardait le reste** : trouvé à la main, en vérifiant ce que voit
  quelqu'un qui se trompe d'adresse. Réparé par `app/global-not-found.tsx`, qui rend son propre
  document ; le 404 reste **statique**, et quatre contrôles l'empêchent de repartir. Le
  fourre-tout `[...slug]` a été essayé puis retiré : sans créneau prérendu il ne correspond à
  rien, et avec un rendu à la demande chaque 404 redevenait une invocation serveur.
- **Les tableaux de comparaison étaient inatteignables au clavier sur mobile.** Sous 768 px ils
  défilent dans leur cadre — ce qui évite que la page déborde — mais un conteneur qui défile sans
  être focalisable met sa moitié droite hors d'atteinte de qui n'a pas de souris. Relevé par axe
  sur le profil **mobile uniquement** : à 1440 px rien ne défile et aucune règle ne se déclenche.
  C'est la raison pour laquelle l'audit tourne désormais sur la vitrine, et sur les deux profils.

- **`og:type` disparaissait de toutes les pages.** Next **remplace** les clés `openGraph` et
  `twitter` du parent au lieu de les fusionner champ par champ : les métadonnées de page effaçaient
  le socle, et l'aperçu social retombait sur une vignette carrée à image rognée.
- **Le budget Lighthouse n'assertait RIEN.** `assertMatrix` était posé à la racine de `ci` au lieu
  de vivre sous `assert` : `lhci` répondait « No assertions to use » et serait passé au vert sans
  rien vérifier — le pire état possible pour un garde-fou, celui où l'on croit être protégé. Vu
  seulement en exécutant réellement `lhci assert` sur les rapports mesurés, puis confirmé par un
  contrôle négatif : en exigeant SEO 100 sur la page `noindex`, l'outil échoue bien (0,63 < 1).
- **Le contrôle « aucun `dangerouslySetInnerHTML` » échouait sur sa propre documentation.** Il
  cherchait le motif dans le fichier entier, commentaires compris : la seule façon de le satisfaire
  aurait été de retirer l'explication de pourquoi on s'en passe. Il ignore désormais les
  commentaires, et rien d'autre.
- **Deux contrôles encodaient l'état d'avant la phase.** `build-output.test.ts` exigeait
  `dynamicRoutes` vide — ce que six pages `[creneau]` rendent faux sans rien changer à D12 ; il
  vérifie maintenant l'invariant réel, `fallback: false`, c'est-à-dire aucun rendu à la demande.
  `smoke.spec.ts` attendait la redirection de la racine ; il vérifie maintenant son absence, ce qui
  protège la vitrine d'une règle réintroduite par inadvertance.

### Mesuré

Lighthouse 12, build de production, préréglage bureau :

| URL | Perf. | A11y | Bonnes pratiques | SEO |
|---|---:|---:|---:|---:|
| `/` | **100** | **100** | **100** | **100** |
| `/fonctionnalites` | **100** | **100** | **100** | **100** |
| `/comparatifs/habitnow` | **100** | **100** | **100** | **100** |
| `/en` | **100** | **100** | **100** | **100** |
| `/onboarding` — ce que `/app` sert à un compte neuf | 99 | **100** | **100** | 63 |

Le 63 **est le résultat attendu** : Lighthouse sanctionne une page bloquée à l'indexation, et
c'est exactement ce que la phase a posé. Le budget est donc écrit par URL — SEO 100 exigé sur la
vitrine, non asservi sur l'application. Un budget uniforme aurait été rouge par construction, et
on l'aurait désactivé au premier échec.

**La dernière ligne dit `/onboarding` et non `/app`, et ce n'est pas un détail.** Mesurer `/app`
sur un profil neuf mesure en réalité `/onboarding` : la coque y renvoie tant que le compte n'est
pas accueilli. Une première rédaction de ce tableau annonçait `/app` — c'était faux, relevé en
relisant l'URL finale des rapports. Le budget vise donc explicitement `/onboarding`, qui est ce
qu'un visiteur reçoit réellement.

Deux écarts de contraste ont été corrigés à la source plutôt qu'expliqués deux fois : l'accent
Modernist (#ec3013) donne 3,74:1 sur son fond — assez pour un filet ou un titre d'affiche, pas pour
du texte — et le gris 600 donne 3,80:1. Tout aplat rouge portant du texte passe par
`--color-accent-700` (7,18:1 avec du blanc), et le texte atténué par le gris 700 (5,73:1). Sans
cela, « Accessibilité ≥ 95 » était hors d'atteinte.

### Limites connues, écrites

- **`experimental.globalNotFound` est un drapeau expérimental de Next 15.5.** C'est le mécanisme
  prévu pour un projet à plusieurs layouts racines, et il n'y en a pas d'autre qui reste statique.
  S'il change de nom à une montée de version, la conduite à tenir est écrite dans
  `next.config.mjs`, à côté du drapeau — et surtout, ce qu'il ne faut **pas** faire à la place.
- **Le contact est le suivi d'anomalies du dépôt**, pas une adresse électronique. Une page
  opposable qui donne un contact injoignable est pire qu'une page qui n'en donne pas ;
  `NEXT_PUBLIC_SITE_CONTACT` permet d'en poser une vraie sans toucher au code, à la mise en
  production.
- **L'hébergeur nommé est celui que `vercel.json` fixe aujourd'hui.** La décision C (Vercel Hobby
  ou Cloudflare Pages) est tranchée en phase 7 : si elle change l'hébergeur, elle change la
  politique de confidentialité et les mentions légales, qui la lisent depuis le code.
- **Les comparatifs ne retiennent du produit comparé que des faits publics** — plateformes, modèle
  économique, existence d'un compte — avec le lien officiel pour les revérifier et une date de
  relecture. Un comparatif faux se retourne contre le produit ; celui-ci se relit, il ne se croit
  pas.

## 2026-08-13 — Phase 5 : fiabilisation et PWA

Le produit tient ce que son interface promettait. Plus un seul interrupteur sans effet, plus
d'écran blanc possible, une application installable et utilisable **avion activé**.
`npm run verify` vert, **393 tests unitaires** et **448 tests e2e** verts sur desktop et mobile.

### Tenu

- **Aucun écran blanc.** Frontière d'erreur applicative et dernier filet global. Les deux
  proposent réessayer, revenir à l'accueil et **exporter ses données** — la troisième action est
  celle qui compte, et elle lit la base sans passer par le store, qui peut être exactement ce qui
  vient de tomber. Journal d'erreurs **local** (vingt entrées, aucun réseau, décision E),
  consultable et effaçable depuis les réglages. (5.1)
- **Notifications réelles.** Permission demandée AU CLIC, jamais au chargement. Un refus ramène
  l'interrupteur à l'arrêt et dit que c'est le navigateur qui refuse — sans cette phrase, on
  re-clique indéfiniment sur un interrupteur qui ne s'allumera plus. Rappels d'habitude aux heures
  configurées, et fin de phase du minuteur. Elles sont affichées **par le service worker** et le
  clic ramène sur la journée, dans l'onglet déjà ouvert. (5.2)
- **Son et vibration.** Bip Web Audio **synthétisé** — aucun fichier, aucune requête. La vibration
  masque son interrupteur là où l'API n'existe pas plutôt que de l'afficher inopérant. (5.3)
- **Plus aucun interrupteur mort.** `interrupteurs.spec.ts` est générique : il ne connaît pas la
  liste des réglages. Un interrupteur ajouté demain doit soit changer d'état quand on le manœuvre,
  soit être désactivé avec une raison lisible **et annoncée** (`aria-describedby`). (5.4)
- **Parcours d'accueil en trois écrans** — langue, thème, trois habitudes suggérées, **aucune
  pré-cochée**. Le bouton principal mène à un compte VIERGE ; la démonstration est un lien
  secondaire, et elle reste signalée par le badge permanent de l'en-tête (B4). (5.5)
- **Récurrence de tâches** : quotidienne, hebdomadaire, mensuelle, intervalle et exceptions par
  occurrence. Les cinq cas limites du plan ont leur test, dont le 31 janvier ramené au dernier jour
  de février sans perdre son quantième, et la traversée du changement d'heure. (5.6)
- **PWA** : manifeste, icônes 192/512/maskable **générées depuis les jetons**, service worker
  Serwist. Un rechargement réseau coupé rend la vue attendue — c'est éprouvé, pas annoncé. Bandeau
  de mise à jour : une nouvelle version attend, l'utilisateur décide. (5.7)
- **Sauvegarde** : import avec **rapport visible** (lues / gardées / écartées, détail des refus),
  et copie de secours automatique avant import et avant réinitialisation. (5.8)
- **Cache dérivé ciblé** (corrige B3) et **ouverture par instantané** du journal. (5.9, 5.10)

### Corrigé — des promesses que rien ne tenait

- **Les toasts d'annulation n'étaient pas le seul cas.** « ⟳ Quotidienne » s'affichait depuis la
  phase 4 sur une tâche qui, cochée, disparaissait pour toujours. Une tâche récurrente mémorise
  désormais l'occurrence du jour (`occ`, format figé) et avance à son échéance suivante.
- **Le jeu de démonstration de recette était plus pauvre que le produit** : ses tâches n'avaient
  aucune récurrence là où la production en pose deux. C'est ce qui a laissé passer le défaut
  ci-dessus.
- **Le précache du service worker embarquait l'archive du prototype** — 336 Ko et ses captures de
  référence, téléchargés à chaque installation. `exclude` ne filtre que les sorties du build ;
  `public/` demande `globPublicPatterns`.
- **Le rechargement hors ligne échouait alors que la page ÉTAIT en cache.** La règle « pages » de
  `defaultCache` filtre sur le `Content-Type` de la requête, qu'une navigation n'envoie pas.
- **Le bandeau de mise à jour rechargeait à la première installation** : `controllerchange`
  survient aussi quand le worker prend le contrôle d'un onglet déjà ouvert.
- **Trois libellés d'erreur d'import étaient inatteignables** (`imp_JSON`, `imp_FORMAT`,
  `imp_EMPTY`) : l'importeur levait des messages, pas des codes.
- **L'interface laissait croire que l'import remplaçait tout.** Il ajoute et remplace ce qui porte
  le même identifiant. C'est écrit à l'écran, maintenant.

### Mesuré, et écrit plutôt que caché

Budget de performance du 13 août 2026, build de production, Chromium, à la charge du plan —
**200 habitudes × 3 ans, 219 000 entrées de journal** :

| Mesure | Budget | Obtenu |
|---|---|---|
| Ouverture (hors première) | < 1,5 s | **822 ms** |
| Interaction (clic → DOM) | < 100 ms | **36 ms** |

Comment. Lire 219 000 lignes coûtait cinq secondes : IndexedDB en sert ~40 000 par seconde, et ce
temps passe **avant** le premier rendu. L'ouverture lit désormais un **instantané** — une ligne de
`meta` portant l'index déjà construit et un filigrane — puis ne relit que ce qui a changé depuis.
L'index est complet dès le premier écran ; rien n'est approximé, rien n'arrive en retard. La
première ouverture d'une base importée reste lente, une fois : c'est elle qui construit
l'instantané.

Deux corrections sont sorties de la mesure elle-même : les deux cents lignes de la file se
redessinaient à chaque coche (comparaison par valeurs sur `HabitRow` et `TaskRow` : 180 → 60 ms), et
le test mesurait sa propre granularité de sondage (la latence se mesure dans la page, du clic à la
mutation du DOM, comme l'INP).

`@tanstack/react-virtual` n'a **pas** été ajouté : après ces deux corrections, le coût restant est
dans la lecture et le recalcul, pas dans le DOM. Une dépendance qui ne corrige pas ce qui a été
mesuré n'a pas sa place ; la virtualisation reste inscrite en phase 7, si une liste devient
réellement longue.

### Limites connues, écrites

- Les rappels sonnent **tant qu'un onglet est ouvert**, et le réglage le dit. Ce n'est pas un
  raccourci : les quatre voies possibles ont été examinées et écartées, mesures à l'appui —
  Notification Triggers n'existe plus (`showTrigger` vaut `false` en Chrome 151), Web Push exige un
  serveur et fait quitter l'appareil à l'abonnement (contre l'ADR-0002), Periodic Background Sync
  laisse le navigateur choisir l'heure, et un `setTimeout` dans un service worker ne survit pas à
  son arrêt. La décision et ses raisons sont écrites dans **ADR-0008**, avec la condition qui la
  rouvrirait.
- Le précache ne peut pas contenir les documents des onze vues — leur HTML référence des morceaux
  dont l'empreinte change à chaque build. Une route jamais ouverte demande une connexion, une fois.
- La copie de secours vit dans le même navigateur : elle protège d'un geste malheureux, pas d'une
  perte d'appareil. C'est pourquoi le rappel d'export à 30 jours reste en place.

## 2026-08-13 — Phase 4 : les onze vues

Le produit se manipule. Onze vues portées, alimentées par IndexedDB, comparées aux 62 valeurs de
référence **à l'écran** et non plus seulement dans le moteur. `npm run verify` vert,
**303 tests unitaires** et **368 tests e2e** verts sur desktop et mobile.

### Porté

- **`today`** — file d'exécution unique, habitudes et tâches triées par heure, compteurs `−`/`+`,
  sous-listes, tiroir d'actions contextuel, toast annulable. (T3.2)
- **`habits`** — cartes, sept pastilles de la semaine suivant `Settings.weekStart`, série, record,
  taux 30 jours. Le test compare les trois chiffres des six habitudes à `golden.json`. (T3.1)
- **`dash`** — anneau du jour, quatre compteurs, mini-carte 30 jours, objectifs, rappel de
  sauvegarde. (T3.3)
- **Éditeurs** habitude (4 onglets), tâche (3) et objectif (2), `react-hook-form` + `zod`,
  brouillon isolé, suppression confirmée puis annulable. (T3.4, T3.5)
- **`tasks`** — cinq groupes d'échéance, sous-tâches, priorités écrites, liste de courses. (T3.6)
- **`calendar`** — mois, semaine, jour, agenda ; glisser-déposer `@dnd-kit` et **pilotage clavier
  complet**. (T3.7 → T3.10)
- **`stats`** — indicateurs, barres du mois, carte de chaleur six mois, classement, répartition par
  catégorie. (T3.11, T3.12)
- **`timer`** — quatre modes ancrés sur l'horloge murale, session survivant au rechargement, crédit
  d'habitude. (T3.13, T3.14)
- **`goals`** — rythme requis, statut d'échéance, courbe d'avancement, jalons. (T3.15)
- **`notes`** — journal auto-enregistré, humeur, historique, recherche plein texte. (T3.16)
- **`profile`** et **`settings`** — profils multiples, avatar OKLCH, statistiques réelles, export,
  import, réinitialisation en deux temps. (T3.17, T3.18)

**Sept modules de domaine** neufs — `agenda`, `tasks`, `stats`, `timer`, `calendar`, `backup`, et
les compléments de `goals` — chacun avec ses tests. Aucun calcul n'est écrit dans un composant
(G2) : c'est ce qui permet aux vues d'afficher les mêmes nombres que le moteur, et au moteur de
rester protégé par l'oracle.

### Corrigé — dix défauts, dont quatre invisibles à l'œil

- **Les toasts n'étaient affichés nulle part.** `withUndo` en posait depuis la phase 2 et aucun
  composant ne les rendait : **toute suppression était en pratique irréversible**. Le défaut ne
  pouvait pas se voir tant qu'aucune vue n'offrait de suppression.
- **Les glyphes `home` et `study` étaient intervertis**, et `04-DESIGN-TOKENS.md` laissait trois
  couleurs de catégorie non renseignées.
- **`/app/settings` portait deux `<h1>`** depuis la phase 3 — le test de fumée était rouge sur
  `main`.
- **Le bandeau de dates et la grille du calendrier cassaient l'hydratation** (React #418) : bâtis
  sur `today()` au rendu, ils portaient la date de la **compilation**.
- **Une clé de libellé manquante ne casse rien** : next-intl journalise et affiche le chemin de la
  clé. Les sept tests de la vue Statistiques étaient verts pendant que l'écran affichait
  « app.emStatsT ». `console.spec.ts` fait désormais échouer la recette sur toute erreur ou tout
  avertissement de console, sur les onze vues, compte vierge **et** compte de démonstration.
- **`redimensionner(0, d)` ajoutait quinze minutes** : son premier argument est la durée courante,
  et `0 || DUREE_MIN` vaut 15. D'où `borneDuree`.
- **Une touche de redimensionnement maintenue perdait neuf frappes sur dix** : chaque ajustement
  lisait la durée avant que le précédent ne soit écrit.
- **Une session de minuteur en cours perdait tout son écoulé au rechargement** : seul `startedAt`
  était enregistré.
- **La fin d'une phase de Pomodoro pouvait être enregistrée deux fois** — l'écriture prend
  quelques millisecondes, pendant lesquelles les ticks suivants voient encore le seuil franchi.
- **Une concentration terminée n'était enregistrée nulle part** : le prototype ne journalisait que
  le compte à rebours, et les minutes de Pomodoro n'apparaissaient dans aucune statistique.

### Écarts assumés au prototype

Chacun est écrit dans le code, à côté de la ligne qu'il explique, et reporté dans
`05-SPEC-VUES.md`.

- **Le réglage `cloud` disparaît** (T4.4). Il ne gouvernait aucun nuage, et ce n'est pas un
  interrupteur : proposer de désactiver l'enregistrement local, c'est proposer de perdre ses
  données. **La réinitialisation repart d'un compte vierge**, et non du jeu de démonstration —
  rendre six habitudes qu'on n'a pas créées est exactement le défaut B4. Le libellé qui
  l'annonçait est corrigé dans les deux langues.
- **Les interrupteurs non branchés sont désactivés et disent pourquoi** : un interrupteur qui
  s'allume sans rien déclencher est un mensonge d'interface (plan 6 § 6.4). Même raison pour le
  tiroir d'actions, dont les cinq actions sont **contextuelles** : le prototype affichait
  « Reporter » sur une habitude et se contentait d'annoncer l'action sans rien faire.
- **« Cette semaine » s'arrête à la fin de la semaine courante**, et non sept jours après
  aujourd'hui : la fenêtre glissante du prototype ignorait `Settings.weekStart`.
- **Le cinquième mode du calendrier, `orbit`, n'est pas porté** : projection décorative du mois,
  elle n'affiche rien que la grille ne donne. `05-SPEC-VUES.md` n'en parlait pas et
  `RECETTE.md` disait vrai — le document est corrigé.
- **Le classement des habitudes se fait au taux de réussite**, la série départageant les ex æquo.
  Le plan proposait « pct pondéré par la série » : aucune référence ne donne cette pondération, et
  un coefficient inventé rendrait le classement invérifiable (G3). Même raison pour l'« indice
  cognitif » et le « niveau » du profil, qui ne sont pas portés.
- **Cinq mesures de contraste ont déplacé des couleurs** : une ligne faite se signale par un
  liseré et non par un fond teinté, l'étiquette « Habitude / Tâche » est neutre et la catégorie
  est écrite, les micro-libellés sur `--panel2` passent en `--txt2`, et le numéro du jour porte
  son propre fond. À chaque fois `--mut` mesurait entre 2,07 et 4,39 là où AA demande 4,5.

### Dépendances ajoutées

`react-hook-form` (MIT), `@hookform/resolvers` (MIT), `@radix-ui/react-tabs`,
`@radix-ui/react-dropdown-menu` (MIT), `@dnd-kit/core`, `@dnd-kit/modifiers` (MIT) — conformes
à **G5**. First Load JS **partagé inchangé à 103 kB** pour un budget de 150 ; les douze routes
restent **statiques**. Le poids par route monte à 213–228 kB, à surveiller au budget de
performance du plan 8.

### Ce que la comparaison visuelle a trouvé

Les onze vues ont été comparées à leur capture de référence. Quatre défauts en
sont sortis, qu'aucun test automatisé ne pouvait voir :

- **Les groupes de tâches s'appelaient « Jour suivant » et « Plus »** — les
  libellés du bouton de navigation, réutilisés faute d'en avoir écrit d'autres.
  Ils s'appellent « Demain » et « Plus tard », comme dans le prototype.
- **Le panneau de répartition par catégorie était titré « Focus par cible »**,
  ce qu'il n'est pas : il montre un taux de réussite, pas des sessions.
- **Les sessions récentes de la vue Notes affichaient « 15 »** sans unité. Un
  nombre nu ne dit pas des minutes.
- **L'identité du profil n'avait que le nom** : `05-SPEC-VUES.md` § 11 demande
  aussi l'identifiant et la fonction, qui existent dans le modèle depuis la
  phase 1 et que rien n'exposait.

Deux écarts sont **assumés** : la grille du mois ne montre que les tâches, pas
les habitudes — le prototype les empile toutes, ce qui remplit chaque case de
cinq puces et rend les tâches invisibles ; la charge du jour est portée par
l'intensité de la case. Et l'humeur du journal est une échelle de 1 à 5 là où
le prototype propose quatre humeurs nommées : le modèle stocke un nombre.

### Limite connue — la comparaison visuelle

La comparaison aux captures de `public/prototype/tests/visual/reference/` reste **manuelle** : la
non-régression visuelle automatisée est la tâche 8.2, et elle demande un socle de captures pris
sur l'application, pas sur le prototype. `tests/e2e/captures.spec.ts` produit les onze images à la
demande, et **les onze ont été comparées** à leur référence à la clôture — les quatre défauts
ci-dessus en viennent. Ce qui reste à automatiser, c'est la RÉPÉTITION de cette comparaison à
chaque livraison.

Ce que la comparaison montre, et qui vaut pour les onze : le **contenu** et les **chiffres**
correspondent, la **coque** est plus sobre que le prototype. Le rail est une colonne de libellés
là où le prototype a une bande d'icônes, et l'en-tête n'a ni avatar ni compteur décoratif. C'est
un héritage de la **phase 3**, pas une dérive de celle-ci — les onze vues sont posées dans la
coque telle qu'elle a été livrée. À trancher au moment de la recette visuelle (tâche 8.2) :
soit la coque rejoint le prototype, soit la référence est refaite sur l'application.

Ce qui est automatisé aujourd'hui : les chiffres (contre `golden.json`), la structure, l'absence
de débordement aux quatre paliers dans les trois thèmes, l'accessibilité, et l'absence d'erreur
de console.

**409 libellés** traduits et symétriques.

---

## 2026-08-12 — Phase 3 : système visuel

Onze vues peuvent maintenant s'écrire sans réinventer une bordure. Douze primitives sur les jetons
générés, polices auto-hébergées, produit réellement bilingue, trois thèmes qui basculent sans
clignoter, contraste AA mesuré et vérifié à chaque commit.

### Ajouté

- **Douze primitives** (`components/ui/`) : `Panel`, `Card`, `Chip`, `Switch`, `Field`,
  `Segmented`, `Sheet`, `Dialog`, `Toast`, `Tooltip`, `Ring`, `Icon`. Elles ne portent aucun
  métier — ni calcul, ni dépôt, ni store. Radix (MIT) fournit le piège de focus, `Escape`, le
  retour du focus au déclencheur et les rôles ARIA : les réécrire à la main, ce serait réécrire
  les bogues qu'il a déjà corrigés. (T2.3)
- **Galerie `/dev/ui`** — les douze primitives dans leurs états, contrôlées par e2e dans les trois
  thèmes, erreurs de console comprises.
- **Icônes Lucide en imports nommés** — jamais `import * as icons`, qui ferait entrer toute la
  bibliothèque. Les glyphes typographiques de catégorie (`✚ ▲ ◉ ■ ◆ ●`) sont conservés tels
  quels : ils portent l'identité visuelle. First Load JS partagé : **103 kB**, budget 150. (T2.8)
- **Polices auto-hébergées** (OFL 1.1), avec leur texte de licence, extraites par
  `scripts/extract-fonts.mjs`. `tests/e2e/fonts.spec.ts` verrouille la promesse produit : quatre
  routes, **zéro requête hors du domaine**. (D7)
- **Bascule de langue et de thème**, sans rechargement et sans segment d'URL. Le thème est posé
  **avant la première peinture** par `public/theme.js`. (D6, D26)
- **`tests/unit/contrast.test.ts`** — 15 paires de couleurs sur les trois thèmes, calculées depuis
  `tokens.css`. **`tests/e2e/a11y.spec.ts`** — axe sur les onze routes, la galerie et les deux
  thèmes alternatifs : zéro violation critique ou sérieuse.

### Corrigé

- **Le prototype chargeait Google Fonts** : chaque ouverture transmettait l'adresse IP du visiteur
  à un tiers hors UE, sur un produit dont la promesse est que rien ne sort de l'appareil. Remplacé
  par des `@font-face` locaux en chemin relatif — rendu identique, archive toujours autonome. Le
  moteur n'est pas touché : `domain-logic-extract.js` n'avait pas à être régénéré. (D8)
- **L'archive était servie MORTE depuis la tâche 0.14.** Next applique *toutes* les règles
  d'en-têtes dont le motif correspond : `/:path*` attrapait aussi `/prototype`, qui recevait donc
  la CSP stricte de l'application par-dessus son jeu réduit. Elle bloquait le chargement de son
  moteur. HTTP 200, page vide, aucun signal — le test de fumée ne vérifiait que le code de statut.
  Le motif exclut désormais l'archive, qui a son propre jeu complet, et le test exige qu'elle
  **démarre**.
- **`04-DESIGN-TOKENS.md` désignait le mauvais thème.** Il avertissait depuis l'audit que `--mut`
  de `plasma` était sous WCAG AA, et le plan de la phase a repris l'erreur. Mesure faite :
  `plasma` est conforme (4,85 / 4,72) ; c'est **`clinical`** qui échouait (3,73 / 3,47). Corrigé
  **à la source** — `#6c7d95` → `#596a82`, soit 4,91 et 4,56 — puis `tokens.css` régénéré par
  extraction. (T7.3)
- **Aucune chaîne littérale dans `app/` et `components/`** : 311 clés traduites et symétriques,
  aucune atteignable. `react/jsx-no-literals` rend la rechute impossible. Les onze pages tirent
  leur titre d'une **clé**, plus d'une chaîne passée en prop — la règle ne voit pas les props, et
  un titre en dur reste français quelle que soit la langue.

### Deux décisions techniques, corrigées à l'implémentation

- **Le script anti-clignotement ne peut pas porter d'empreinte SHA-256.** Dès qu'une empreinte ou
  un `nonce` figure dans `script-src`, le navigateur **ignore `'unsafe-inline'`**, dont Next a
  encore besoin pour s'hydrater : l'ajouter aurait cassé l'application au lieu de la durcir. La
  sortie retenue est un **fichier statique** servi depuis le même domaine, chargé de façon
  bloquante. ADR-0007 est corrigée en conséquence.
- **La galerie reste servie en production**, en `noindex` et sans lien entrant. Le plan la
  redirigeait ; les e2e tournant sur le build de production, elle y aurait été inatteignable et le
  critère de sortie n° 1 serait devenu invérifiable. Un critère qu'on ne peut pas vérifier ne
  protège rien.

### Licences

`eslint-plugin-security` (Apache-2.0), Radix (MIT), Lucide (ISC), polices (OFL 1.1) — conformes
à **G5**. **`axe-core` est en MPL-2.0**, hors de la liste blanche : dépendance de développement,
hors bundle, sans obligation sur le code du produit. L'écart est écrit dans le test.

### Limite connue

Le moteur de l'archive charge React depuis `unpkg` (avec contrôle d'intégrité) : elle ne s'ouvre
donc pas hors ligne. Propriété héritée, pas régression. La corriger demande d'auto-héberger les
deux fichiers UMD dans `public/prototype/vendor/`.

**213 tests unitaires · 128 e2e verts sur desktop et mobile.**

---

## 2026-08-11 — Les trois limites de la phase 0, remplacées plutôt qu'assumées

Trois critères de la phase 0 étaient hors de portée : protection de la branche `main`, contrôles
obligatoires sur les PR, analyse CodeQL. Même cause pour les trois — le dépôt est **privé sur un
plan GitHub gratuit** — et la décision du 7 août de le garder privé tient toujours.

Ils sont désormais remplacés par des équivalents qui fonctionnent en privé. Ce n'est pas un
abaissement du niveau : c'est le même objectif — *rien de rouge n'atteint `main`, et le code est
analysé* — obtenu là où c'est possible.

### Ajouté

- **`.githooks/pre-push`** — le garde-fou de `main`, côté client. Refuse un push sur `main` si
  `npm run verify` n'est pas vert, refuse un push non fast-forward, refuse la suppression de la
  branche. Installé par `npm install` (`scripts/install-hooks.mjs` pose `core.hooksPath`).
  Les hooks vivent **dans le dépôt**, donc versionnés et relus, au lieu de `.git/hooks/`.
- **`tests/unit/hooks.test.ts`** — cinq contrôles sur le garde-fou lui-même. Un hook mal installé
  échoue **en silence** : Git l'ignore et on croit protégé ce qui ne l'est pas. Le test vérifie
  notamment le mode `100755` **dans l'index Git** — pas celui du disque, que NTFS ne porte pas.
- **Alerte `main` rouge** (`ci.yml`) — si la chaîne échoue sur `main`, une issue critique est
  ouverte automatiquement, une par incident. GitHub ne peut pas bloquer une fusion rouge en
  privé ; il reste le signal, et un signal qu'on peut manquer n'en est pas un. Même mécanisme
  que la sonde de production, même raison.
- **`eslint-plugin-security`** (Apache-2.0) — analyse de sécurité statique en remplacement de
  CodeQL, dans `npm run lint`, donc dans `verify`, donc en CI sur chaque push et chaque PR.
  `eval`, `new Function`, `child_process`, expressions régulières non littérales et lectures de
  fichier par chemin construit sont des **erreurs**. Vérifié en écrivant un `eval` volontaire :
  la chaîne passe au rouge.

### Deux réglages assumés, pour que le signal reste un signal

- `security/detect-object-injection` est **désactivée**. Elle signale tout accès `objet[clé]` —
  l'index de journal, les sélecteurs, les libellés en sont faits. Active, elle produirait des
  centaines d'avertissements et apprendrait à ignorer le rouge. Le risque qu'elle vise, la
  pollution de prototype, est traité à sa vraie place : la validation zod de l'importeur et le
  test dédié de la tâche 7.6.
- Les règles de chemin de fichier et d'expression régulière sont neutralisées dans `scripts/` et
  `tests/`, où les entrées viennent du dépôt et non d'un utilisateur. Elles restent en **erreur**
  sur le code applicatif.

### Ce que les équivalents ne font pas

Écrit dans `SECURITY.md` plutôt que sous-entendu :

- un hook s'exécute chez celui qui pousse — `git push --no-verify` le contourne ;
- une fusion faite depuis l'interface web de GitHub ne passe par aucun hook. C'est là que
  l'alerte sur `main` rouge prend le relais ;
- `eslint-plugin-security` reconnaît des motifs ; il ne fait pas l'analyse de flux
  inter-procédurale de CodeQL.

### Conséquence

**La phase 0 est close à 100 %** : ses sept critères de sortie sont tenus, trois par équivalence
documentée. Les phases 0, 1 et 2 sont désormais complètes sans réserve.

198 tests unitaires (193 → 198).

---

## 2026-08-08 — Phase 2 : état et coque applicative

Les onze routes existaient et n'affichaient rien. Elles sont maintenant alimentées par IndexedDB,
navigables au clavier, servies en statique, et l'application a une adresse à elle. Les vues
elles-mêmes restent à porter — c'est la phase 4, et ce document ne prétend pas le contraire.

### Décidé

- **Décision G tranchée : l'application vit sous `/app`** (ADR-0007). La racine est réservée à la
  vitrine de la phase 6, le seul actif indexable du projet. La redirection `/` → `/app` est
  **temporaire** (307, jamais 308) : un 308 mis en cache serait à déloger navigateur par
  navigateur le jour où la vitrine prend sa place.
- **Conséquence tranchée dans le même mouvement** : `next.config.mjs` notait que le rendu statique
  et le `nonce` de la CSP « doivent être tranchés ENSEMBLE ». Le rendu statique gagne — un nonce
  impose une invocation serveur par affichage, sur un produit dont le modèle est 0 € d'infra. La
  sortie propre pour le script de thème (phase 3) est donc une **empreinte SHA-256**, pas un nonce.

### Ajouté

- **Store Zustand en huit tranches** (`lib/store/`), une par domaine. Trois règles tenues par la
  structure : écriture au **dépôt d'abord**, store ensuite ; aucune tranche ne calcule — les
  sélecteurs dérivés appellent `lib/domain`, protégé par les 62 valeurs ; ESLint interdit `dexie`,
  `@/lib/data/db`, `@/lib/storage` et `localStorage` dans `lib/store`. (T2.4)
- **Annulation qui restaure l'entité ET ses dépendances** (`lib/store/undo.ts`). Supprimer une
  habitude emporte son journal et ses notes ; les objectifs qui la référencent **survivent**, seul
  le lien vers la source disparaît — un objectif appartient à l'utilisateur, pas à l'habitude.
  L'annulation réécrit dans les **dépôts**, pas seulement dans le store : un test le vérifie en
  réhydratant depuis la base. Un seul toast à la fois. (T2.5)
- **Coque applicative** : rail à trois groupes (Espace / Suivi / Focus), en-tête, barre basse sous
  768 px avec des cibles de 44 px, mode zen `⌘\`, lien d'évitement. Aucun débordement horizontal à
  390 / 768 / 1060 / 1440 px. (T2.6)
- **Palette `⌘K`** : recherche habitudes, tâches, objectifs et courses ; `↑`/`↓`/`Entrée` ;
  `Escape` **rend le focus au déclencheur**. Une recherche infructueuse propose toujours la
  création rapide — le prototype ne laisse jamais l'utilisateur dans un cul-de-sac. (T2.9)
- **Raccourcis globaux neutralisés dans les champs de saisie**, `Escape` excepté. Piège de focus
  dans la modale. (T2.10)
- **Région annoncée** `aria-live="polite"` : une navigation côté client ne recharge pas la page,
  rien ne dit donc à un lecteur d'écran que la vue a changé. Elle porte aussi les toasts.

### Corrigé

- **Les douze routes sont statiques** (`○`, plus aucune `ƒ`). `i18n/request.ts` lisait `cookies()`,
  ce qui forçait tout l'arbre en rendu dynamique : une invocation serverless par affichage, sur une
  application qui ne consulte aucun serveur. La préférence de langue se lit désormais dans le
  navigateur et bascule sans rechargement. Sa nature n'a pas changé — elle reste une préférence de
  profil, pas une propriété de la ressource ; on change **où** elle est lue. `tests/unit/build-output.test.ts`
  échoue si une route redevient dynamique. (D12)
- **La suite e2e testait le serveur de développement.** La tâche 0.12 annonçait l'inverse et le
  workflow de CI le croyait, mais `playwright.config.ts` lançait `npm run dev`. Tant qu'aucune vue
  n'avait besoin de JavaScript, l'écart ne se voyait pas ; il est apparu à la première interaction.
  `next dev` charge Fast Refresh, qui **évalue du code en chaîne** et tombe sous notre propre CSP :
  l'application restait un rendu mort. La configuration lance maintenant le build de production et
  ne réutilise plus un serveur déjà ouvert — c'est cette réutilisation qui masquait le défaut.
  `script-src 'unsafe-eval'` est toléré **en développement seulement**.
- **next-intl levait `ENVIRONMENT_FALLBACK`** faute de `timeZone`, ce qui cassait le rendu. UTC est
  figé côté serveur — un prérendu doit être déterministe — et le fuseau réel du navigateur est
  appliqué à l'hydratation.
- **`buildLogIndex` indexait les entrées effacées.** `deletedAt` sur `LogEntry` est une pierre
  tombale : une valeur effacée doit être **absente** de l'index, pas présente. Sans cela, supprimer
  l'entrée d'une habitude `limit` la rendait réussie. Défaut latent de la phase 1, sans effet
  jusqu'ici parce que rien n'écrivait encore de pierre tombale. (G9)
- **La barre basse portait le même nom accessible que le rail.** Deux repères de navigation
  homonymes, c'est un défaut d'accessibilité, pas seulement un test qui hésite.
- **La date de l'en-tête se calcule après le montage.** Les pages étant prérendues, une date rendue
  côté serveur serait celle du *build* — un chiffre affiché qui ne correspond à rien (G3).

### Supprimé

- `i18n/actions.ts` — une action serveur pour poser un cookie est une invocation de plus dans une
  application qui vise zéro.

### Outillage

- `npm run verify` **construit avant de tester** : le contrôle de la sortie de build en dépend.
- 193 tests unitaires (170 → 193), 62 e2e verts sur desktop **et** mobile, sur le build de production.
- 15 clés de libellé ajoutées dans les deux langues (326 au total, symétrie vérifiée en CI).

### Écarts assumés au plan

- Les tests de raccourcis du plan visaient une zone de texte de `/notes` et un bouton de `/habits`,
  qui n'existeront qu'en phase 4. Le contrôle est exercé sur le champ et la modale de la palette —
  même mécanisme, vérifiable aujourd'hui plutôt que reporté.
- Le plan reconstruisait `logIndex` en relisant tout le journal après chaque écriture, soit
  219 000 lignes à la charge visée en tâche 7.5 pour un objectif de « clic < 100 ms ». On recopie
  la Map et on modifie l'entrée concernée : même immuabilité, sans le trajet en base.
- `withUndo` reçoit `set` et `get` explicitement : sans cela le module importerait le store, que le
  store importe déjà par ses tranches.

---

## 2026-08-08 — Phase 1 : couche de données

Le produit avait un moteur métier testé et aucun endroit où ranger une donnée. Il a maintenant
une base locale, des dépôts typés, un importeur qui rend compte de ce qu'il refuse, et deux
amorces qu'on ne peut pas confondre. Aucune vue n'a bougé : cette phase ne se voit pas, elle se
vérifie. Plan détaillé : `docs/superpowers/plans/2026-08-06-habitum-plan-2-donnees.md`.

### Ajouté — persistance

- **Schéma Dexie, neuf tables** (`lib/data/db.ts`). Le journal a pour clé primaire le couple
  `[habitId+date]` : l'unicité « une valeur par habitude et par jour », que l'objet `ov` du
  prototype garantissait implicitement, devient **structurelle**. Une fenêtre de journal se lit
  par l'index composite, sans balayage complet. (T1.7)
- **Dépôts typés** (`lib/data/repositories/`). `makeRepo()` centralise identifiant, horodatages
  et suppression logique : aucune entité ne peut être écrite sans `updatedAt`, prérequis de
  synchronisation exigé par `03-ARCHITECTURE.md` § 3.4. Neuf dépôts, dont `logs` qui ne passe pas
  par la fabrique — il n'a pas d'identifiant propre. (T1.8)
- **Index du journal en mémoire** (`lib/data/log-index.ts`) : le joint entre `lib/data` et
  `lib/domain`. Le domaine ne reçoit qu'une `ReadonlyMap` et n'apprendra jamais qu'IndexedDB
  existe. Une clé absente y rend `undefined`, **jamais 0** — sans quoi une habitude `limit`
  serait réussie d'avance (CLAUDE.md § piège 2). 36 500 entrées indexées en moins de 100 ms.

### Ajouté — entrées et sorties

- **Importeur validé par zod** (`lib/data/import.ts`). Les listes blanches des **sept** types
  d'habitude et des **trois** types d'objectif sont **importées** de `lib/domain/types.ts` —
  jamais recopiées. C'est le défaut qui avait fait disparaître 4 habitudes sur 6 le 5 août.
  Chaque entité est validée séparément : une entité refusée est **nommée dans le rapport**, elle
  n'empêche pas les autres d'entrer et ne disparaît pas en silence. Le journal est filtré des
  clés malformées et des entrées orphelines. L'écriture tient dans une seule transaction. (T1.10)
- **Exportateur** (`lib/data/export.ts`) au format que l'importeur relit. Il porte les objectifs,
  les sessions, la liste de courses, les notes, l'humeur et **les habitudes archivées** — tout ce
  que `exportJSON()` du prototype perdait avant sa correction du lot 1.
- **Le test d'aller-retour** recompare `currentStreak`, `bestStreak`, `completionRate` et
  `sumValues` des six habitudes de démonstration après un cycle export → import complet, puis
  vérifie qu'un second tour ne fait dériver ni les habitudes, ni le journal, ni les objectifs,
  ni les notes. C'est le test qui aurait attrapé la perte du 5 août.
- **Reprise d'un utilisateur du prototype** (`lib/data/legacy.ts`, `lib/data/migrations.ts`) :
  les quatre migrations `v<2`…`v<5` sont transcrites **à l'identique** depuis
  `public/prototype/Habitum.dc.html`, avec le cas « déjà à jour, ne rien faire » — celui qui
  relançait la génération de l'historique à chaque ouverture quand `SV` valait 4. Un stockage qui
  refuse d'être lu (navigation privée iOS) ne fait pas échouer l'ouverture. `migrateFromLegacy`
  passe par le **même** importeur qu'un fichier de sauvegarde : un seul chemin d'entrée dans la
  base, donc une seule liste blanche à tenir à jour. (T1.9, B6)

### Ajouté — démonstration et compte vierge, définitivement séparés

- `seedEmpty()` est **le chemin par défaut** : un profil, des réglages, rien d'autre. Un compte
  neuf affiche 0 minute de focus et des listes vides, parce que c'est la vérité. (T1.11, B4)
- `seedDemo()` est explicite et drapeauté dans `meta`. Il pose les six habitudes, leurs **quatre**
  entrées du jour, les huit tâches, les quatre sessions, les quatre objectifs et la liste de
  courses — et **rien d'antérieur**. La reconstitution des 180 jours d'historique reste cantonnée
  à `tests/fixtures/demo-seed.ts`, où elle sert à comparer aux 62 valeurs de référence.
- Un test parcourt `lib/` et échoue si un générateur d'historique y réapparaît.
- Les réglages d'un compte neuf posent `notifications`, `sound` et `vibrate` **à l'arrêt** :
  la phase 5 ne les a pas encore implémentés, et un interrupteur allumé sans effet est un
  mensonge de plus.

### Supprimé

- `lib/storage/legacy-import.ts` — ses quatre validateurs et `toLogRows` sont absorbés par
  `lib/data/import.ts`. Deux importeurs, c'était deux listes blanches à tenir.

### Outillage

- `fake-indexeddb` (Apache-2.0) amorcé pour Vitest, `@vitest/coverage-v8` (MIT) pour mesurer.
- ESLint interdit désormais `@/lib/data` et `dexie` dans `lib/domain` : la règle G2 n'était
  imposée que dans un sens. Et `lib/data` n'importe ni React ni Next — la persistance ne rend rien.
- **170 tests** (contre 118 à la fin de la phase 0), dont 64 sur la couche de données.
  Couverture de `lib/data` : **100 % des lignes**, 92,7 % des branches.

### Corrigé — documentation

- `02-ROADMAP.md` : les chemins `src/…` n'ont jamais existé dans ce dépôt — un repreneur qui les
  suivait créait une arborescence parallèle. Corrigés (`lib/domain/`, `lib/data/`, `components/`…),
  comme l'avait été `06-BACKLOG.md` en phase 0. La ligne 1.2 annonçait encore `date-fns`, retirée
  depuis (ADR-0006).
- `PASSATION-CLAUDE-CODE.md` et `README.md` : `lib/storage/` ne porte plus l'importeur.
- Le plan de la phase contenait un test faux pour la migration `v<2` — il portait sur un objectif
  `kind:'cumul'`, que la migration réelle ne touche pas. Corrigé et daté dans le document ; c'est
  le test qui a changé, pas la migration.

### Inchangé (ligne rouge respectée)

Les clés persistées `habitum.state`, `habitum.state.big`, `habitum.state.bak`, `habitum.best` et
les champs `ov`, `obj`, `occ`, `tt`, `mat`, `cfg` ; `public/prototype/` ; les 62 valeurs de
référence ; `lib/domain/`, qui n'a pas été touché de la phase.

---

## 2026-08-06 — Phase 0 : fondations du dépôt

Aucune fonctionnalité ajoutée. Le dépôt ne compilait pas, n'était pas versionné, ses jetons de
design ne correspondaient pas au prototype, et ses 62 valeurs de référence n'étaient comparées à
rien côté TypeScript. Détail des constats : `docs/AUDIT-PRODUCTION-2026-08-06.md`.

### Corrigé — bloquant

- **Le dépôt ne compilait pas.** Une apostrophe droite non échappée dans
  `components/shell/app-shell.tsx:6` (`'Aujourd'hui'`) cassait `typecheck`, `lint` et `build`.
  `layout.tsx` important `AppShell`, **toutes les routes** auraient répondu en erreur 500. (D1)
- **Les jetons de design étaient fabriqués.** `styles/tokens.css` déclarait `--fg`, `--fg-dim`,
  `--accent`, `--accent-hi`, `--bg-2` avec des valeurs sans rapport avec le prototype, dont
  l'en-tête affirmait pourtant qu'elles en étaient extraites. `--bg` valait `#08090d` au lieu de
  `#04060d`, et sur les trois thèmes aucune valeur ne coïncidait. Sept jetons majeurs manquaient :
  `--mut` (180 usages), `--acc2` (155), `--glow` (65), `--txt2` (54), `--panel2`, `--line2`,
  `--acc3`. Rien ne le signalait — mais toute vue portée dessus aurait été visuellement fausse.
  Le fichier est désormais **généré** par `scripts/extract-tokens.mjs`, et `tests/unit/tokens.test.ts`
  rend la dérive impossible. (D3)
- **Le document d'architecture reproduisait un piège déjà payé.** `03-ARCHITECTURE.md` § 3
  déclarait quatre types d'objectif au lieu de sept — exactement le défaut qui avait fait
  disparaître 4 habitudes sur 6 à l'import le 5 août. (D5)

### Corrigé — moteur

- **Mode `every` sans date de début.** L'origine du cycle valait « aujourd'hui − 182 jours » :
  elle avançait d'un jour par jour, et une habitude « tous les 2 jours » changeait de jours
  planifiés quotidiennement. Ancrée désormais sur `start`, à défaut `createdAt`, à défaut une
  époque figée. Bug **hérité** du prototype et porté fidèlement ; corrigé des deux côtés et dans
  `docs/handoff/reference/domain-logic-extract.js` (CLAUDE.md § 7). Les six contrôles de
  `tests/domain.test.html` ont été rouverts dans un navigateur après la modification :
  **62 / 62 mesures identiques**. Aucune habitude de démonstration n'utilise ce mode — c'est ce
  qui avait laissé passer le défaut. (D16)

### Ajouté

- **Les 62 valeurs de référence sont vérifiées à chaque commit** — `tests/unit/golden.test.ts`,
  67 assertions, alimentées par `tests/fixtures/demo-seed.ts` qui reconstitue le jeu de
  démonstration de façon strictement déterministe. Elles n'étaient consommées que par le harnais
  navigateur ; `tests/README.md` affirmait pourtant le contraire. L'oracle a été validé **par
  mutation** : neutraliser la tolérance du jour courant dans `currentStreak` le fait échouer. (D4)
- `startOfWeek(date, weekStart)` : `Settings.weekStart` devient implémentable. (D15)
- `Profile`, `ShoppingItem`, `deletedAt` sur toutes les entités, `createdAt`/`updatedAt` sur
  `Note` et `Session` — prérequis de synchronisation exigé « dès la phase 1 » par
  `03-ARCHITECTURE.md` § 3.4. Sur `LogEntry`, `deletedAt` est une pierre tombale : elle distingue
  « valeur effacée » de « jamais saisie », distinction vitale pour le type `limit`. (D14)
- Dépôt Git, `.gitattributes` — le prototype est marqué non-texte : c'est une archive, et
  `Habitum.dc.html` doit rester octet pour octet ce qu'il est. (D2)

### Outillage

- `npm run verify` couvre désormais **sept** contrôles — typecheck · lint · format · libellés ·
  jetons · tests · build — conformément à `CLAUDE.md` § Définition de terminé. Il en omettait
  trois. (D13)
- ESLint ignore `next-env.d.ts`, régénéré par `next build` avec une référence triple-slash qui
  rendait le lint local rouge après toute construction. (D18)
- Convention `_` pour un identifiant délibérément inutilisé, reconnue par ESLint.
- Prettier passé sur les fichiers de code ; la documentation en est exclue (elle reflue les
  tableaux Markdown, et `domain-logic-extract.js` doit rester le miroir du prototype).

### Documentation

- `03-ARCHITECTURE.md` : sept types d'habitude et trois types d'objectif, `Goal` complété,
  horodatages alignés sur le code, pseudo-code de `isScheduled` incluant les quatre modes,
  arborescence réelle du dépôt. (D5, D14, D16, D21)
- `02-ROADMAP.md` et `03-ARCHITECTURE.md` : phase 6 sur **Neon**, plus Supabase. (D20)
- `06-BACKLOG.md` : 61 chemins `src/…` remplacés par l'arborescence réelle ; `T1.4` couvre les
  sept types. (D21, D5)
- `README.md` (311 clés, pas 308), `tests/README.md`, `PASSATION-CLAUDE-CODE.md`,
  `ANALYSE-REPRISE.md`, `adr/0002-local-first.md` : affirmations contredites par le code. (D22)

### Suivi de projet sur GitHub

Dépôt `nihainapro-ui/habitum`, privé. Le prototype y arrive **intact à l'octet près**
(336 613 octets) — c'est ce que `.gitattributes` protège en le marquant non-texte.

- 17 étiquettes, 8 jalons alignés sur les phases du plan d'exécution
- **28 issues**, une par défaut de l'audit, chacune portant sa priorité, sa phase et son jalon
- **18 fermées immédiatement** : celles que cette phase a levées. L'historique porte ainsi la
  trace du travail fait, pas seulement de ce qui reste.
- 10 restent ouvertes, réparties sur les phases 2 à 7

Le tout est reproductible : `scripts/github-bootstrap.sh`, idempotent.

### Un point de la phase non tenu, et pourquoi

- **Protection de la branche `main`** : impossible, et GitHub le dit lui-même —
  *« Upgrade to GitHub Pro or make this repository public to enable this feature »* (HTTP 403).
  Sur un dépôt **privé** en plan gratuit, les règles de protection de branche n'existent pas.
  Le dépôt reste privé par décision du 6 août 2026. Conséquence assumée : la CI signale les
  échecs mais ne bloque pas la fusion.

**Décision du 7 août 2026 : le dépôt reste privé.** Les trois limites ci-dessus — protection de
branche, contrôles obligatoires, analyse CodeQL — sont donc **assumées définitivement**, et non
reportées. Elles ont toutes la même cause et se débloqueraient ensemble si le dépôt passait un
jour en public ; ce n'est pas prévu.

Ce qui les compense :

- Le dépôt est **mono-contributeur**. La protection de branche existe pour empêcher *un tiers*
  de fusionner du rouge : ce risque n'existe pas ici.
- La chaîne de vérification **existe et tourne** — `verify` sur sept contrôles, 96 tests
  unitaires, 22 parcours e2e sur desktop et mobile, en matrice Node 20 et 22. Elle signale.
- `gitleaks` analyse l'historique complet, Dependabot surveille les dépendances, `npm audit`
  tourne à chaque exécution, les en-têtes de sécurité sont vérifiés par test.
- La règle de travail reste : **rien n'est poussé sans `npm run verify` vert**. Elle a tenu sur
  les quinze commits de cette phase, y compris là où elle a rattrapé une erreur.

Le garde-fou n'est pas le blocage de GitHub. C'est que la chaîne existe, qu'elle est verte, et
qu'on ne pousse pas quand elle ne l'est pas.
- **Analyse CodeQL** : retirée pour la même raison. Un workflow qui échoue à chaque exécution
  cesse d'être un signal et apprend à ignorer le rouge. Dependabot, `npm audit` et `gitleaks`
  restent en place et fonctionnent en privé.
Un seul point reste donc hors de portée : la protection de branche. Tout le reste de la phase
est livré.

### Écarté du suivi Git

Des fichiers personnels se trouvaient dans le dossier de travail (`Phase.docx`, `Photo/`). Le
dépôt étant destiné à être public, ils sont exclus par `.gitignore` — et il reste préférable de
les déplacer hors du projet.


## 2026-08-05 — Finalisation : plus aucune réserve côté design

Objectif de cette passe : ne plus rien laisser d'ouvert qui relève du design. **Elle a trouvé trois
défauts réels, dont un grave**, tous invisibles pour les 62 valeurs de référence.

### Corrigé — grave

- **Plus rien n'était restauré au rechargement.** Depuis le lot 3, `seed()` lisait
  `localStorage.getItem(this.LS_MAIN)` — mais `LS_MAIN` est un **champ de classe déclaré après**
  `state = this.seed()`. Les champs s'initialisent dans l'ordre du code : il valait `undefined`
  pendant la lecture. L'application écrivait donc correctement et ne relisait **jamais** : chaque
  ouverture repartait du jeu de démonstration. Le bloc de constantes est remonté **avant**
  `state = this.seed()`, avec un commentaire qui dit pourquoi il doit y rester, et le contrôle
  « restauration du stockage » verrouille le comportement (clé principale, clé volumineuse, format
  ancien).
- **L'import rejetait notre propre export.** `validateImport()` n'acceptait que quatre types
  d'objectif d'habitude (`check`, `total`, `list`, `limit`) alors que le produit en compte sept :
  `count` et `time` manquaient. Sur le jeu de démonstration, **4 habitudes sur 6 disparaissaient**
  à l'import, et leur historique partait avec elles au nettoyage des journaux orphelins. Même défaut
  sur les objectifs : le type `milestones` (jalons) était rejeté. Corrigé, et verrouillé par le
  contrôle « aller-retour export / import » qui recompare **toutes** les métriques.
- **Débordement horizontal de 54 px sur téléphone.** L'en-tête ne pouvait pas passer à la ligne
  (l'attribut que visait la requête média n'existait plus depuis une refonte). Ajouté, plus la
  fermeture du défilement horizontal résiduel (26 px d'anneaux et d'auras décoratifs).

### Réglé — dettes de l'audit

- **`B5` — le minuteur survit au rechargement.** `state.timer` est persisté et restauré
  **toujours en pause**, écoulé conservé, phase et cycle intacts. Un toast signale la reprise.
- **`B4` — le jeu de démonstration ne peut plus passer pour du réel.** Un badge « jeu de
  démonstration » est affiché dans l'en-tête tant que `demo === 1`, avec une infobulle qui explique
  comment partir d'un compte vierge ; les infobulles des jours passés portent la mention « démo ».
- **`B6` — les migrations sont testées.** Les quatre (`v<2` … `v<5`) reçoivent une charge au format
  d'origine et sont vérifiées, y compris le cas « déjà à jour, ne rien faire ».
- **`B1` — décision tranchée : option (c).** Système sombre pour l'application, **Modernist pour la
  vitrine et la documentation**. La décision est matérialisée par un artefact, pas par une phrase :
  `Vitrine Habitum.dc.html` consomme le bundle du design system et ses classes, et documente la
  frontière entre les deux registres. Détail dans `07-DECISION-B1.md`.

### Corrigé — relevé en revue

- **Le badge « jeu de démonstration » volait la place du sous-titre de l'en-tête**, y compris
  au-dessus de 1060 px — le rendu que `CLAUDE.md` déclare intouchable. À largeur fixe (132 px) et
  `flex:none` dans un bloc qui rogne, il se servait le premier : le sous-titre tombait à deux
  lettres entre ~1060 et ~1200 px. Sous 1200 px le badge se réduit désormais à sa marque (21 px),
  l'infobulle restant accessible ; à 1440 px, sous-titre **et** libellé complet tiennent tous les
  deux. Mesuré aux quatre paliers : aucun débordement, sous-titre entier à la largeur de référence.

### Ajouté — vérification

- `tests/domain.test.html` compte désormais **six contrôles** : 62 valeurs de référence,
  invalidation fine du cache, restauration du stockage, migrations de schéma, aller-retour
  export/import, géométrie du calendrier (le placement en colonnes et la détection de chevauchement
  derrière le glisser-déposer — la seule partie qui ne se vérifie pas au geste).
- `tests/responsive.html` — la même application à 390, 768, 1060 et 1440 px, côte à côte, dans de
  vrais cadres. C'est ce qui a permis de mesurer le débordement et de confirmer que sous 768 px la
  grille horaire du calendrier devient bien une liste (`D6`) sans toucher au rendu de référence.

**Mesures après correction** : aucune erreur console sur les 33 rendus (11 vues × 3 thèmes ×
2 langues), aucun débordement horizontal aux quatre paliers, six contrôles verts.

## 2026-08-05 — Vérification finale du dossier

Aucun changement dans l'application. Contrôle de cohérence entre le prototype et son dossier de
passation, après les six lots. **Trois artefacts étaient périmés** :

- `reference/domain-logic-extract.js` — présenté comme « source d'autorité », c'était en réalité une
  copie **d'avant le lot 1** : elle portait encore `focusMin_()` fabriquant les minutes par hachage
  (supprimé au lot 2), le `memo()` à invalidation globale et le `best()` sans cache. Quelqu'un
  portant fidèlement ce fichier aurait réintroduit exactement ce que nous avions retiré.
  **Régénéré** depuis le fichier courant, avec des annotations « à porter » / « à ne pas porter »
  revues et un renvoi à `tests/golden.json` comme spécification exécutable.
- `reference/messages-fr.json` / `-en.json` — annonçaient « 271 clés, 0 manquante ». En réalité
  3 clés manquaient côté français (`today`, `navToday`, `habitsToday`) et les 32 clés ajoutées aux
  lots 1 à 5 étaient absentes. **Régénérés par extraction directe** des dictionnaires `L`, `EL`,
  `PL`, `L2` : **308 clés, symétrie FR/EN vérifiée**.
- `01-AUDIT.md`, `05-SPEC-VUES.md`, `03-ARCHITECTURE.md` — annonçaient encore comme défauts des
  choses réglées depuis (focus fictif, faux journal, curseur activé par défaut, états vides
  partiels, absence de layout téléphone, `B2`/`B3`). Les constats réglés sont marqués comme tels,
  ceux qui restent vrais sont laissés intacts.

`08-PRET-A-FINIR.md` porte un verdict revérifié, deux critères supplémentaires (décisions écrites,
santé du prototype) et une règle explicite : **régénérer les trois copies de `reference/` à chaque
livraison**.

## 2026-08-05 — Lot 5 (UX et accessibilité) et Lot 6 (rangement, documentation, tests)

Le lot 5 change des **comportements par défaut** et ajoute des garde-fous ; le lot 6 ne touche pas
au code de l'application. `tests/domain.test.html` : **62 / 62** et invalidation fine saine.

### UX et accessibilité (lot 5)

- **`D2` — le curseur personnalisé est désactivé par défaut** (`cfg.cursor:false`). Il masquait le
  pointeur système, ce qui est un défaut d'accessibilité pour un effet de signature. Il reste
  activable depuis le profil, et ne s'active jamais sur écran tactile ni en mouvement réduit.
- **`D3` — le changement de vue est annoncé** : une région `aria-live="polite"` invisible porte le
  nom de la vue courante. Les toasts étaient déjà annoncés (`role="status"`).
- **`D4` — la suppression d'un profil demande confirmation.** Elle était immédiate (seul le toast
  « Annuler » rattrapait le geste), alors que la réinitialisation, moins destructrice, demandait
  déjà confirmation.
- **`D5` — l'export peut désormais échouer à voix haute.** `exportJSON()` n'avait aucun `try/catch` :
  un refus du navigateur ne disait rien. Un toast confirme la réussite, un autre explique l'échec.
  Les autres retours d'échec (import invalide, fichier trop gros, quota plein) existaient depuis le
  lot 1.
- **`D7` — la préférence « mouvement réduit » est réellement respectée** : l'écran de démarrage
  (1,9 s) est supprimé, le curseur animé est désactivé (l'anneau restait auparavant figé en haut à
  gauche, la boucle d'animation étant coupée sans que l'élément soit caché), les transitions et le
  défilement fluide sont neutralisés.
- **`D8` — rappel d'export.** Au-delà de 30 jours sans export, un bandeau discret s'affiche en tête
  du tableau de bord : *Exporter maintenant* ou *Plus tard*. Refusé, il ne revient pas. La date de
  référence (`cfg.since`) est posée une seule fois, à la première ouverture.
- **`D6` — palier téléphone (< 768 px).** Les grilles horaires **Semaine** et **Jour** du calendrier
  deviennent une liste (la même que l'Agenda, restreinte à la semaine ou au jour affiché), et
  l'éditeur occupe tout l'écran. Tout passe par une branche conditionnelle `vw < 768` et une seule
  requête média `max-width:767px` : **le rendu ≥ 1060 px n'est pas touché.**
- **`B6` — flou allégé.** `backdrop-filter: blur(20px)` était répété sur 50 panneaux, dont 5 rendus
  en boucle (cartes d'habitudes, d'objectifs, groupes de tâches, prévisions) — donc autant de fois
  qu'il y a d'éléments. Le flou est retiré de ces panneaux répétés et ramené à 12 px sur les
  autres. Écart visuel négligeable, défilement nettement plus fluide sur machine modeste.
- **`B7` — vérifié, aucune modification nécessaire.** Le passage de la heatmap en `<canvas>` était
  conditionné à « plus de 400 cellules » : la matrice du tableau de bord en compte 182 (26 × 7) et
  celle du calendrier 84 (12 × 7). Le rendu DOM reste le bon choix — il conserve le survol par
  cellule. À reconsidérer seulement si une fenêtre plus large est ajoutée.

### Rangement et documentation (lot 6)

- **`F3`** — les 12 captures de HabitNow sont **copiées** (`uploads/` reste intact, c'est l'espace de
  dépôt de l'utilisateur) dans `assets/references/habitnow/`, renommées par écran et légendées dans
  un `index.md` qui dit, pour chacune, ce qui a été retenu.
- **`F4`** — `screenshots/cal-week.png`, orphelin et référencé par personne, supprimé.
- **`F5`** — `reference-landing-modernist/` déplacé sous `docs/references/landing-modernist/` ; la
  ligne `base` de son `ds-base.js` a été repointée (`../_ds/…` → `../../../_ds/…`), sans quoi le
  gabarit aurait perdu son design system.
- **`F6`** — `.gitignore` et `LICENSE` (MIT, avec les réserves sur `support.js`, les polices OFL et
  les captures de HabitNow) ajoutés ; `CHANGELOG.md` existait déjà.
- **`H3`** — journal de décisions dans `docs/adr/` : composant unique, local-first, trois thèmes et
  deux langues jusque dans les données, cache de rendu, styles en ligne. Cinq fiches courtes, pour
  ne plus re-débattre ces choix. La décision `B1` (système visuel) y est signalée comme **encore
  ouverte** : elle appartient au commanditaire.
- **`H5`** — `README.md` réécrit autour de la nouvelle arborescence et de l'ordre de lecture ;
  `CLAUDE.md` mis à jour (dettes réglées retirées, nouvelles règles sur le cache, le responsive et
  les styles statiques, définition de « terminé » alignée sur la recette).
- **`G3`** — `tests/RECETTE.md` : 11 vues × 3 thèmes × 2 langues, 8 parcours critiques, contrôles
  d'accessibilité et de préférences système, 5 paliers responsive.
- **`G4`** — `tests/visual/reference/` : une capture par vue (thème Neural, français, jeu de
  démonstration) et un protocole de comparaison qui dit explicitement ce qui compte (élément
  disparu, chevauchement, texte tronqué) et ce qui ne compte pas (un pixel, un antialiasing).

### Écarté volontairement

- **`F2` (regrouper la passation sous `docs/handoff/`)** — non appliqué. Le dossier contient son
  propre `CLAUDE.md`, destiné à être chargé automatiquement par l'outillage du futur dépôt de
  production : le déplacer casserait ce rôle sans rien apporter, et la racine reste lisible avec
  trois dossiers de documentation clairement nommés (`docs/`, `assets/references/`,
  `design_handoff_habitum/`). À trancher au moment d'initialiser le dépôt de production, où le
  dossier de passation devient la racine.

### Inchangé (ligne rouge respectée)

Les fonctions du domaine, les helpers de date, les migrations, le mécanisme d'annulation, l'ancrage
horloge du timer, le glisser-déposer, la palette `⌘K`, les 3 thèmes et leurs tokens, les libellés
existants. Le rendu au-dessus de 1060 px est identique.

## 2026-08-05 — Lot 3 (performances) et Lot 4 (maintenabilité)

Interventions **internes uniquement** : aucune fonctionnalité remplacée, aucun écran modifié.
Les 62 métriques de référence sont **identiques avant et après** (`tests/domain.test.html` → 62/62),
et le nouveau contrôle d'invalidation fine ne relève **aucune valeur périmée**.

### Performances (lot 3)

- **`B1` — record (`best_()`) mis en cache par habitude, et le cache survit au rechargement.**
  La fonction balayait 366 jours × N habitudes et était relancée dès qu'une case était cochée,
  même sur une autre habitude. Le résultat est désormais conservé sous une signature
  « définition de l'habitude + empreinte de son journal + jour courant » (`habitum.best`).
  Signature différente → recalcul : aucune valeur périmée ne peut être affichée.
- **`B3` — invalidation fine du cache de rendu (`memo()`).** Auparavant le moindre changement
  vidait **tout** le cache. Désormais seules les entrées réellement concernées sont jetées :
  l'empreinte du journal est calculée par habitude en une passe, et seules les habitudes dont
  l'empreinte a changé perdent leurs métriques. Les clés du cache portent un séparateur `|` après
  l'identifiant d'habitude, ce qui rend cette sélection possible.
  **Interrupteur de repli :** `cfg.fastCache=false` rétablit l'invalidation globale.
- **`B4` — `materialize()` (180 j × N habitudes) ne bloque plus le premier rendu** : elle part en
  `requestIdleCallback` (repli `setTimeout`). Elle n'écrivait déjà que les jours planifiés.
- **`B5` — écriture découpée.** `persist()` sérialisait tout l'état, dont les milliers de clés de
  `ov`, à chaque changement — y compris pour une simple bascule de réglage. `ov` et `notes` vivent
  maintenant dans `habitum.state.big`, réécrit **seulement quand l'une des deux a changé**.
  `split:1` signale le nouveau format ; un enregistrement antérieur reste lu tel quel, sans
  migration. La copie de secours (`A3`) et la réinitialisation traitent les deux clés ensemble.

### Corrigé en route

- **Les minutes de focus n'étaient jamais invalidées.** Depuis `E1` (lot 2) elles agrègent
  `sessions`, mais `memo()` ne surveillait pas ce champ : enregistrer une session sans toucher au
  journal laissait le total affiché inchangé jusqu'au rendu suivant. `memo()` surveille désormais
  `sessions`.
- **La réinitialisation ne supprimait que `habitum.state`.** Avec l'écriture découpée, `ov` et
  `notes` auraient survécu à une remise à zéro. Les trois clés sont supprimées ensemble.

### Maintenabilité (lot 4)

- **`C1` — `vals2()` (340 lignes, 8 domaines) découpée** en `habitVals`, `taskVals`, `goalVals`,
  `calVals`, `statVals`, `timerVals`, `noteVals`, `settingVals`. `vals2()` ne fait plus que
  composer. Le contrat de sortie (11 clés) est inscrit en commentaire au-dessus.
- **`C4` — état mort retiré :** `vault` était initialisé, persisté et relu, mais **jamais lu** par
  aucune vue. Supprimé de `seed()`, de `persist()` et de la liste de lecture.
- **`C5` — constantes nommées** rassemblées en un bloc : `LS_MAIN`, `LS_BIG`, `LS_BAK`, `LS_BEST`,
  `NMAT` (180), `NBEST` (365), `NSTREAK` (420), `NAGENDA` (21), `NCELLS` (42),
  `DEBOUNCE_SAVE` (400 ms), `TOAST_MS` (6 000 ms), `BP_TABLET` (1 060 px), `POMO` (25/5/15 min).
  Plus aucun de ces nombres n'est écrit en dur ailleurs.
- **`C6` — contrat documenté (JSDoc)** sur les fonctions pures du domaine : `tgt`, `sched_`,
  `val_`, `isDone_`, `streak_`, `pct_`, `sumVal_`, `dayRatio_`, `habFp`.
  `// @ts-check` **n'a pas été activé** : `DCLogic` et `React` sont injectés à l'exécution, le
  contrôleur les signalerait comme introuvables à chaque ligne. Le typage réel appartient au
  portage (`B7`).
- **`C7` — toutes les clés persistées documentées** (`ov`, `obj`, `occ`, `tt`, `mat`, `demo`,
  `nq`/`nsel`, `cfg`, `profiles`/`pid`) plus les champs internes `_*`, dans
  `03-ARCHITECTURE.md` § « Clés d'état persistées ». **Aucun renommage** : ce serait une perte de
  données.
- `tests/domain.test.html` gagne un **second contrôle** : chaque habitude est cochée avec un cache
  déjà chaud, puis **toutes** les métriques de **toutes** les habitudes sont comparées à un
  recalcul à froid. C'est le filet de sécurité exigé par le registre des risques pour `B3`.
  Le harnais est aussi rendu hermétique au cache `habitum.best` du navigateur.

### Écarté volontairement

- **`C2` (fabrique `panelSt()` pour le panneau « verre » répété)** — écarté. Faire passer un style
  **statique** par une valeur calculée empêcherait la peinture progressive : le panneau ne
  pourrait plus s'afficher avant la fin du rendu de la logique. Le gain (−150 lignes dupliquées)
  ne vaut pas cette régression. À reprendre au portage, où les classes CSS sont disponibles.
- **`C3` (externaliser `L`/`EL`/`PL` dans un module)** — écarté ici pour la même raison : un
  module chargé de façon asynchrone afficherait une interface sans libellés au premier rendu.
  Tâche du portage (`next-intl`), pas du fichier unique.

### Inchangé (ligne rouge respectée)

`sched_`, `isDone_`, `tgt`, `streak_`, `best_`, `pct_`, `sumVal_`, `dayRatio_` (comportement
identique, vérifié par les 62 valeurs de référence), les helpers de date, les migrations
`v<2`…`v<5`, `snapshot`/`notify`/`undoLast`, l'ancrage horloge du timer, le glisser-déposer du
calendrier, la palette `⌘K`, les 3 thèmes, les 271 libellés.

## 2026-08-05 — Lot 1 (filet de sécurité) et Lot 2 (sincérité des données)

Aucune fonctionnalité existante n'a été remplacée. Toutes les interventions sont additives,
internes, ou correctives. Les 62 métriques de référence du jeu de démonstration sont **identiques
avant et après** (`tests/domain.test.html` → 62/62).

### Ajouté

- `tests/domain.test.html` — **harnais de test sans chaîne de build** (`G1`). Charge la classe de
  logique directement depuis `Habitum.dc.html` (aucune duplication), la fait tourner sur le jeu de
  démonstration à une **date figée (5 août 2026)** et compare 62 mesures aux valeurs de référence.
  Ne touche ni `localStorage` ni les données de l'application.
- `tests/golden.json` — **valeurs de référence** (`G2`) : cible, série, record, taux 7/30/90 j,
  cumul 30 j et état du jour pour les 6 habitudes de démonstration, plus les ratios journaliers sur
  30 jours, les journées parfaites, les minutes de focus et les tâches ouvertes.
- `validateImport()` (`A1`) — un fichier importé est **validé avant d'être appliqué** : JSON,
  structure, taille (2 Mo max), types de chaque entité, catégories connues, jours 0–6, types
  d'objectif autorisés, clés de journal au format `habitId|YYYY-MM-DD`, valeurs numériques
  positives. Les entrées invalides sont ignorées, jamais appliquées ; les journaux orphelins (dont
  l'habitude n'existe plus après import) sont retirés. Un rapport `n gardées / n lues` s'affiche.
- `backupNow()` / `readBackup()` / `backupInfo()` / `restoreBackup()` (`A3`) — copie de secours
  automatique sous `habitum.state.bak` **avant chaque import et chaque réinitialisation**, avec une
  ligne « Sauvegarde automatique · Restaurer » dans les réglages.
- Dictionnaire `L2` — libellés FR/EN des nouveaux messages, séparé de `L` pour ne pas toucher aux
  271 clés existantes ; fusionné dans `renderVals()`.
- États vides (`D1`) : vue **Notes** (aucune entrée), vue **Focus** (aucune session), vue
  **Statistiques** (aucune habitude). Les états vides Habitudes / Tâches / Objectifs / Agenda
  existaient déjà.
- Drapeau `demo` (`A6`) — le jeu de démonstration est marqué (`demo:1`), un compte importé passe à
  `demo:0`. Aucune logique ne dépend encore du drapeau : il rend seulement la distinction traçable.
- Constantes nommées `MAX_IMPORT`, `NSPAN_SEARCH`, `NSPAN_RECENT` (amorce de `C5`).

### Corrigé

- **`SV` valait 4 alors que la dernière migration écrite est `v<5`.** La migration se rejouait donc
  à *chaque* chargement et remettait `mat=0`, ce qui relançait `materialize()` (180 j × N habitudes)
  à chaque ouverture de l'application. `SV=5` — la migration ne s'exécute plus qu'une fois.
- **`persist()` échouait en silence** (`A4`) : quota dépassé ou navigation privée, et l'utilisateur
  se croyait sauvegardé. Un avertissement s'affiche désormais une fois, invitant à exporter.
- **`exportJSON()` perdait des données** : les habitudes archivées (`this.HB` au lieu de
  `state.habits`), les objectifs, les sessions et la liste de courses n'étaient pas exportés.
  L'export porte maintenant `v`, `habits`, `tasks`, `log`, `ov`, `notes`, `obj`, `sessions`, `shop` ;
  la clé `log` est conservée pour que les anciens fichiers restent lisibles.
- **Import et réinitialisation sont désormais annulables** (`A2`) : instantané pris avant
  application, bouton **Annuler** dans le toast.
- Le champ de fichier est réinitialisé après import — on peut réimporter le même fichier.
- **`focusMin_()` fabriquait les minutes de focus** par hachage (`rnd('f'+date)`) et les affichait
  comme réelles (`E1`). Elles agrègent désormais les sessions réellement enregistrées ; un compte
  sans session affiche 0. *Effet visible : les minutes de focus du tableau de bord et des
  statistiques changent — c'est la correction attendue, pas une régression.*
- **`journalSeed()` inventait un journal** pour les jours sans note (`E2`) : il retourne maintenant
  une chaîne vide, et l'historique du journal ne liste que les entrées réellement écrites.
  *Effet de bord bénéfique :* la recherche dans le journal générait jusqu'à **160 faux textes par
  rendu** (`B2`) — supprimé.
- Réglage « Sauvegarde cloud » renommé **« Sauvegarde locale sur cet appareil »** avec une mention
  explicite : désactivé, rien n'est enregistré (`A5`). Le comportement du réglage est inchangé.

### Vérifié (sans modification)

- `A7` — aucun `innerHTML`, aucun `dangerouslySetInnerHTML`, aucun `eval`, aucun `new Function`
  dans l'application : tout contenu utilisateur passe par du texte React. Aucune surface
  d'injection.
- `E3` — inventaire des usages de `rnd()` : **deux seulement**, tous deux légitimes ou neutralisés —
  `materialize()` (génération de l'historique de démonstration, explicitement marqué `demo`) et
  `journalSeed()` (désormais inaccessible). Aucun autre chiffre affiché n'est fabriqué.

### Inchangé (ligne rouge respectée)

`sched_`, `isDone_`, `tgt`, `streak_`, `best_`, `pct_`, `sumVal_`, `dayRatio_`, les helpers de date,
les migrations `v<2`…`v<5`, `snapshot`/`notify`/`undoLast`, l'ancrage horloge du timer, le
glisser-déposer du calendrier, la palette `⌘K`, les 3 thèmes, les 271 libellés existants.
