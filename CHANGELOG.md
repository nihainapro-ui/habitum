# Journal des modifications

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
