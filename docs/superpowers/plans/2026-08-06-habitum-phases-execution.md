# Habitum — Phases d'exécution

**53,5 jours-personne · ~9 semaines à 1 ETP · 0 €/mois d'infrastructure**
Source : `docs/AUDIT-PRODUCTION-2026-08-06.md` (défauts `D1`–`D28`) · `docs/handoff/06-BACKLOG.md` (tâches `T0.1`–`T8.6`)

---

## Protocole d'exécution — applicable à **toute** tâche de **toute** phase

**Pour chaque tâche :**

1. **Analyse les prérequis et dépendances.**
2. **Utilise automatiquement les outils, ressources, skills et mécanismes de mémoire pertinents.**
3. **Exécute les actions dans l'ordre optimal.**
4. **Fournis les livrables attendus.**
5. **Identifie les risques, blocages et hypothèses.**
6. **Vérifie la cohérence et la complétude du résultat.**
7. **Mets à jour l'état d'avancement du projet.**

> **Ne passe jamais à la tâche suivante tant que la tâche en cours n'est pas totalement terminée et validée.**

**Validation d'une tâche = les quatre conditions réunies :**
`npm run verify` vert · les 62 valeurs de référence conformes · le test dédié à la tâche passe · un commit atomique est enregistré.

---

## Contraintes globales — jamais répétées, toujours applicables

| # | Contrainte |
|---|---|
| G1 | Ne jamais renommer une clé persistée : `ov`, `obj`, `occ`, `tt`, `mat`, `cfg`, `habitum.state`, `habitum.state.big`, `habitum.state.bak`, `habitum.best` |
| G2 | `lib/domain/` n'importe jamais React, Next ni la persistance — imposé par ESLint |
| G3 | Aucun chiffre affiché ne doit être fabriqué. Un compte sans session affiche 0 |
| G4 | Les 62 valeurs de référence sont la spécification. Si un test du domaine casse, c'est le code qui a tort |
| G5 | Gratuit uniquement : MIT / Apache-2.0 / ISC / OFL |
| G6 | Toute clé de `messages/fr.json` existe dans `en.json` |
| G7 | Ne pas toucher `public/prototype/` sauf report d'une correction du moteur — et alors régénérer `domain-logic-extract.js` |
| G8 | SEPT types d'habitude, TROIS types d'objectif, déclarés une seule fois dans `lib/domain/types.ts` |
| G9 | `limit` est inversé : réussi si `valeur <= cible`, mais jamais réussi d'avance |
| G10 | Terminé = `verify` vert · e2e desktop **et** mobile · aucun débordement à 390/768/1060/1440 px · CHANGELOG à jour · documents invalidés corrigés dans la même livraison |
| G11 | Node ≥ 20.9 · CI en matrice 20 + 22 |
| G12 | Un commit par étape verte, en conventional commits |

---

# Phase 0 – Fondations

**Objectif :** Mettre en place les fondations du projet : Git, GitHub, CI/CD, tests moteur et validation du pipeline.

**Charge :** 7 j · **Prérequis :** aucun · **Priorité :** 🔴 Critique
**Défauts levés :** D1, D2, D3, D4, D5, D9, D11, D13, D14, D15, D16, D17, D18, D19, D20, D21, D22, D24, D27

**Pour chaque tâche :** appliquer le protocole en 7 points ci-dessus.
**Ne passe jamais à la tâche suivante tant que la tâche en cours n'est pas totalement terminée et validée.**

| # | Tâche | Prérequis | Actions & outils | Livrables | Risques & hypothèses | Vérification |
|---|---|---|---|---|---|---|
| **0.1** | Dépôt Git local | aucun | `git init -b main` · écrire `.gitattributes` (`* text=auto eol=lf`, `public/prototype/** -text`) · premier commit | Dépôt versionné, 1 commit | **Risque :** conversion de fins de ligne sur le prototype (336 396 octets exactement). **Hypothèse :** aucun `.git` préexistant | `git ls-files \| wc -l` entre 80 et 120 · aucun fichier de `node_modules/` |
| **0.2** | Chaîne de compilation | 0.1 | Corriger `app-shell.tsx:6` (`'Aujourd'hui'` → `"Aujourd'hui"`) · ignorer `next-env.d.ts` dans ESLint · `prettier --write` · ajouter `build` et `format:check` à `verify` | `npm run verify` vert sur 7 étapes | **Risque :** aucun — la correction est d'un caractère, vérifiée. **Blocage levé :** toutes les routes seraient en erreur 500 | `npm run verify` · `next build` → 14 pages |
| **0.3** | Modèle de données complété | 0.2 | Ajouter `Profile`, `ShoppingItem`, `deletedAt` partout, `createdAt`/`updatedAt` sur `Note` et `Session` · implémenter `startOfWeek(date, weekStart)` | `lib/domain/types.ts` complet · `lib/domain/date.ts` + 7 tests | **Risque :** gratuit maintenant, migration douloureuse après la 1ʳᵉ donnée. **Hypothèse :** `03-ARCHITECTURE §3.4` fait autorité | `npx vitest run tests/unit/date.test.ts` |
| **0.4** | **Oracle branché** | 0.3 | Créer `tests/fixtures/demo-seed.ts` (6 habitudes, 8 tâches, 4 sessions, FNV-1a + `materialize`, **usage test uniquement**) · créer `tests/unit/golden.test.ts` | **62 valeurs vérifiées à chaque commit** | **Risque majeur :** sans lui, le portage n'est protégé par rien. **Règle G4 :** ne jamais modifier `golden.json` | `npx vitest run` → 78 tests |
| **0.5** | **Jetons régénérés** | 0.2 | Créer `scripts/extract-tokens.mjs` · régénérer `tokens.css` par extraction · créer `tests/unit/tokens.test.ts` · réaligner `globals.css` et les composants · ajouter `check:tokens` à `verify` | `tokens.css` **généré**, 16 jetons × 3 thèmes | **Risque le plus coûteux du projet :** coût × nombre de vues portées. **Hypothèse :** le prototype fait foi, pas le fichier actuel | `node scripts/extract-tokens.mjs --check` |
| **0.6** | Bug `every` sans `start` | 0.4 | Ancrer sur `start` → `createdAt` → époque figée · reporter dans le prototype · régénérer `domain-logic-extract.js` (**G7**) | Planification déterministe | **Hypothèse :** aucune habitude de démo n'utilise `every` — c'est pourquoi les 62 valeurs ne bougent pas, et c'est la preuve de non-régression | 62 valeurs inchangées · 6 contrôles du prototype verts |
| **0.7** | `date-fns` tranché | 0.3 | `npm uninstall date-fns` · écrire ADR-0006 | Dépendance retirée, décision tracée | **Décision B requise.** Si conservée, ne pas exécuter | `grep -rn date-fns` → aucun import |
| **0.8** | Documentation corrigée | 0.2–0.7 | `03-ARCHITECTURE` (**7 types**, Neon, arborescence réelle) · `02-ROADMAP` (Neon) · `06-BACKLOG` (chemins sans `src/`) · README (311 clés) · `PASSATION` · ADR-0002 · CHANGELOG | 7 documents alignés sur le code | **Risque :** un repreneur qui suit `03-ARCHITECTURE §3` réintroduit le bug des 4 types au lieu de 7 | `grep -c "src/" 06-BACKLOG.md` → 0 · `grep -rn Supabase docs/handoff/` → vide |
| **0.9** | Dépôt GitHub | 0.8 | `gh repo create` · protéger `main` (pas de force-push, historique linéaire, chaîne verte exigée) | Dépôt distant protégé | **Décision A tranchée le 7 août : dépôt PRIVÉ.** La protection côté serveur n'existe donc pas (plan gratuit). **Révision du 11 août :** elle est posée là où elle reste possible — `.githooks/pre-push` · alerte automatique sur `main` rouge | `npx vitest run tests/unit/hooks.test.ts` · une issue critique s'ouvre si `main` casse |
| **0.10** | Issues, labels, jalons | 0.9 | Créer 17 labels · 8 jalons · 28 issues de défaut · fermer les 14 traitées en phase 0 | Backlog traçable | **Hypothèse :** les identifiants `D1`–`D28` et `T0.1`–`T8.6` restent stables | `gh issue list --state all` ≥ 28 |
| **0.11** | CI durcie | 0.9 | `permissions: contents: read` · actions épinglées par SHA · `concurrency` · matrice Node 20/22 · `npm run verify` | `.github/workflows/ci.yml` | **Risque :** un workflow est du code exécuté avec un jeton. **Hypothèse :** SHA relevés à la date du jour | Une PR cassée est bloquée (preuve enregistrée) |
| **0.12** | Job e2e | 0.11 | Job séparé, cache navigateurs Playwright, e2e **sur le build de production** | Contexte de statut `e2e` requis | **Risque :** `dev` et `start` ne se comportent pas pareil ; tester ce qui sera déployé | `npm run build && CI=1 npm run test:e2e` |
| **0.13** | Veille de vulnérabilités | 0.11 | Dependabot (npm + actions) · analyse statique · `npm audit` en CI | Veille automatique | **Blocage connu :** 4 vulnérabilités, correctifs = montées majeures. Seuil abaissé à `critical`, **daté et rattaché à l'issue D11**. **Révision du 11 août :** CodeQL exige un dépôt public — remplacé par `eslint-plugin-security` (Apache-2.0), en **erreur** dans `verify` | `npm run lint` échoue sur un `eval` · Onglet Security actif |
| **0.14** | En-têtes de sécurité | 0.2 | CSP stricte, HSTS, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` dans `next.config.mjs` · dédoublonner `vercel.json` | En-têtes servis et testés | **Risque :** `style-src 'unsafe-inline'` reste nécessaire tant que des styles en ligne subsistent (ADR-0005) — il tombe en phase 3 | `npx playwright test tests/e2e/headers.spec.ts` |
| **0.15** | Gouvernance | 0.9 | `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS`, gabarits d'issue, `gitleaks` en CI | Dépôt gouverné | **Hypothèse :** le prototype est **hors périmètre de sécurité** — c'est une archive `noindex` | `gitleaks` vert |
| **0.16** | Sonde et releases | 0.11 | `healthcheck.yml` (cron, ouvre une issue si HTTP ≠ 200) · `release.yml` (tag → release) | Supervision et publication | **Hypothèse :** `vars.SITE_URL` renseignée après la phase 7 | `workflow_dispatch` manuel |

**Livrables de la phase :** dépôt versionné et protégé · `npm run verify` vert sur 7 étapes · **78 tests** (9 domaine + 7 date + 62 golden) · `tokens.css` généré et verrouillé · CI durcie avec e2e · en-têtes de sécurité · 7 documents corrigés.

**Validation de la phase :**

```bash
npm run verify                            # 7 étapes vertes
npx vitest run                            # tous verts, dont hooks.test.ts
node scripts/extract-tokens.mjs --check   # tokens.css ≡ prototype
grep -c "src/" docs/handoff/06-BACKLOG.md # → 0
gh pr checks                              # verify (20), verify (22), e2e
```

> **Révision du 11 août 2026.** Trois critères de cette phase supposaient un dépôt public :
> protection de branche, contrôles obligatoires, CodeQL. La décision A ayant tranché pour le
> **privé**, ils sont remplacés par des équivalents qui fonctionnent en privé — hook `pre-push`,
> alerte automatique sur `main` rouge, `eslint-plugin-security`. Même objectif, obtenu là où
> c'est possible ; ce que les équivalents ne couvrent pas est écrit dans `SECURITY.md`.

**Avancement projet à la sortie : 22 % → 31 %**

---

# Phase 1 – Données

**Objectif :** Doter le produit d'une couche de persistance réelle : schéma IndexedDB, dépôts typés, migrations numérotées, importeur du format prototype, et séparation stricte du jeu de démonstration et du compte vierge.

**Charge :** 6,5 j · **Prérequis :** Phase 0 validée · **Priorité :** 🔴 Critique · **Chemin critique**
**Réf :** T1.7 à T1.11 · corrige **B4**, **B6**

**Pour chaque tâche :** appliquer le protocole en 7 points.
**Ne passe jamais à la tâche suivante tant que la tâche en cours n'est pas totalement terminée et validée.**

| # | Tâche | Prérequis | Actions & outils | Livrables | Risques & hypothèses | Vérification |
|---|---|---|---|---|---|---|
| **1.1** | Schéma Dexie | 0.3 | Dexie 4 · 9 tables · clé primaire composite `[habitId+date]` sur `logs` · index `deletedAt` · `fake-indexeddb` en Vitest · règle ESLint « pas de React dans `lib/data` » | `lib/data/db.ts` | **Hypothèse :** l'unicité « une valeur par habitude et par jour » devient structurelle, plus implicite | Fenêtre interrogée sans balayage complet |
| **1.2** | Dépôts typés | 1.1 | `makeRepo()` centralise identifiant, horodatages, suppression logique · dépôts spécialisés `habits`, `logs`, `tasks`, `goals`, `notes`, `sessions`, `profiles`, `shopping`, `meta` | `lib/data/repositories/` | **Risque :** un dépôt qui réimplémente les horodatages en oubliera un — d'où la fabrique unique | 10 tests : création, modification, suppression logique, restauration |
| **1.3** | Migrations héritées | 1.1 | Relever les 4 migrations `v<2`…`v<5` **à l'identique** dans le prototype · `readLegacyState` (gère `split:1`) · `applyLegacyMigrations` idempotent | `lib/data/legacy.ts` | **Risque :** une migration réécrite « au propre » est une perte de données. **Piège connu :** `SV=4` relançait `materialize()` à chaque ouverture | 9 tests dont l'idempotence |
| **1.4** | Index du journal | 1.2 | `buildLogIndex` : table `logs` → `ReadonlyMap` · `loadLogIndexWindow` ciblé | `lib/data/log-index.ts` | **Piège G9 :** une clé absente doit renvoyer `undefined`, **jamais 0** — sinon `limit` casse | 36 500 entrées en < 100 ms |
| **1.5** | Importeur zod | 1.2, 1.4 | Schémas zod avec listes blanches **importées de `lib/domain/types.ts`** · conversion `habitId\|date` → lignes `logs` · rejet des journaux orphelins · transaction unique · `ImportReport` | `lib/data/import.ts`, `import.schema.ts`, `export.ts` | **Le point où le projet a déjà perdu des données.** Risque : recopier la liste blanche (G8) | **Aller-retour : toutes les métriques recomparées** · 7 types acceptés · 3 types d'objectif acceptés |
| **1.6** | Démo / compte vierge | 1.2 | `seedEmpty()` par défaut · `seedDemo()` explicite et drapeauté · **`materialize()` n'existe pas en production** · supprimer `lib/storage/legacy-import.ts` absorbé | `lib/data/seed.ts` | **Risque G3 :** un utilisateur réel qui reçoit un historique fabriqué ne fait plus confiance aux chiffres | Un test parcourt `lib/` et échoue si FNV-1a y réapparaît |

**Livrables de la phase :** IndexedDB opérationnelle · un export du prototype se réimporte sans perte · un compte vierge n'affiche rien de généré.

**Validation de la phase :**

```bash
npx vitest run tests/unit/data/      # tous verts
npx vitest run tests/unit/golden.test.ts   # 62/62 toujours
npx vitest run --coverage            # ≥ 90 % sur lib/data
npm run verify
```

**Avancement projet à la sortie : 31 % → 42 %**

---

# Phase 2 – État et coque applicative

**Objectif :** Rendre les onze routes navigables avec des données réelles, dans une coque complète, pilotable au clavier, et servie en statique.

**Charge :** 4 j · **Prérequis :** Phase 1 validée · **Priorité :** 🔴 Critique
**Réf :** T2.4, T2.5, T2.6, T2.9, T2.10 · lève **D12**, **D26** (partiel)

**Pour chaque tâche :** appliquer le protocole en 7 points.
**Ne passe jamais à la tâche suivante tant que la tâche en cours n'est pas totalement terminée et validée.**

| # | Tâche | Prérequis | Actions & outils | Livrables | Risques & hypothèses | Vérification |
|---|---|---|---|---|---|---|
| **2.1** | Tranches Zustand | 1.2 | 7 tranches · **écriture au dépôt d'abord, store ensuite** · `hydrate()` initial · sélecteurs dérivés appelant `lib/domain` | `lib/store/` | **Risque G2 :** un calcul écrit dans une tranche échappe aux tests du domaine | Créer, cocher, recharger, supprimer : 4 tests |
| **2.2** | Middleware d'annulation | 2.1 | `withUndo(label, action)` · instantané de l'entité **et de ses dépendances** · un seul toast à la fois | `lib/store/undo.ts` | **Risque :** supprimer une habitude sans restaurer son journal serait une perte de données déguisée en annulation | L'annulation restaure habitude **et** journal |
| **2.3** | Coque applicative | 2.1 | Rail 3 groupes (Espace / Suivi / Focus) · en-tête (date, recherche, badge démo) · mode zen `⌘\` · barre basse < 768 px · lien d'évitement · `aria-current` | `components/shell/` | **Contrainte connue :** le badge démo doit se réduire à 21 px sous 1200 px pour ne pas voler le sous-titre | 4 paliers sans débordement · `aria-current` présent |
| **2.4** | Palette `⌘K` | 2.1, 2.3 | Recherche habitudes / tâches / objectifs / courses · `↑`/`↓`/`Entrée` · création rapide · `role="dialog"`, piège de focus | `components/command/` | **Risque a11y :** `Escape` doit **rendre le focus au déclencheur** | Test clavier complet |
| **2.5** | Raccourcis globaux | 2.4 | `⌘K`, `Escape`, `⌘\` · **neutralisés dans `input`, `textarea`, `[contenteditable]`** · piège de focus dans toute modale | `lib/keyboard/` | **Risque :** un raccourci qui se déclenche pendant la saisie rend le produit inutilisable | Taper « k » dans une zone de texte n'ouvre pas la palette |
| **2.6** | **Routes statiques** | 2.1 | Sortir la locale de `cookies()` · lecture client · vérifier `next build` → `○` et non `ƒ` | `i18n/client-locale.ts` | **Enjeu de coût :** une app 100 % locale ne doit exécuter aucune fonction serveur. **Décision G requise** (`/` ou `/app`) — à trancher **avant** cette phase | Test lisant `.next/prerender-manifest.json` : 0 route dynamique |
| **2.7** | Région annoncée | 2.3 | `aria-live="polite"` invisible portant la vue courante puis les toasts | `components/shell/LiveRegion.tsx` | — | Le changement de vue est annoncé |

**Livrables de la phase :** onze routes alimentées par IndexedDB · 12 routes **statiques** · annulation fonctionnelle · navigation clavier complète.

**Validation de la phase :**

```bash
npm run build                # 12 routes ○, 0 ƒ
npx vitest run tests/unit/build-output.test.ts
CI=1 npm run test:e2e        # shell, palette, raccourcis, 4 paliers
npm run verify
```

**Avancement projet à la sortie : 42 % → 48 %**

---

# Phase 3 – Système visuel

**Objectif :** Constituer un vocabulaire visuel fidèle au prototype, accessible, bilingue et thémable, sur lequel les onze vues s'écriront sans réinventer une bordure.

**Charge :** 5 j · **Prérequis :** Phase 2 validée **et** tâche 0.5 (jetons régénérés) · **Priorité :** 🔴 Critique
**Réf :** T2.2, T2.3, T2.7, T2.8, T7.3 · lève **D6**, **D7**, **D8**, **D26**

**Pour chaque tâche :** appliquer le protocole en 7 points.
**Ne passe jamais à la tâche suivante tant que la tâche en cours n'est pas totalement terminée et validée.**

| # | Tâche | Prérequis | Actions & outils | Livrables | Risques & hypothèses | Vérification |
|---|---|---|---|---|---|---|
| **3.1** | 12 primitives | 0.5 | `Panel`, `Card`, `Chip`, `Switch`, `Field`, `Segmented`, `Sheet`, `Dialog`, `Toast`, `Tooltip`, `Ring`, `Icon` sur Radix · pont `@theme` Tailwind v4 · galerie `/dev/ui` (redirigée en production) | `components/ui/` | **Hypothèse :** toutes les valeurs viennent de `04-DESIGN-TOKENS.md` — rayons 5/7/9/11/16/99, focus `1.5px var(--acc2)`, verre `blur(20px) saturate(150%)` **sur les panneaux de premier plan uniquement** | 12 primitives × 3 thèmes, 0 erreur console |
| **3.2** | Polices auto-hébergées | 3.1 | Space Grotesk + JetBrains Mono en `woff2` via `next/font/local` · **retirer l'appel Google Fonts du prototype** (G7, RGPD) | `lib/fonts.ts`, `public/fonts/` | **Risque juridique :** transfert d'IP vers un tiers hors UE. **Hypothèse :** le moteur n'est pas touché → pas de régénération de l'extrait | Test e2e : **aucune requête hors du domaine** |
| **3.3** | i18n branchée | 3.1 | `useTranslations` dans **tous** les composants · règle ESLint `jsx-no-literals` · réutiliser les 311 clés existantes | Produit réellement bilingue | **Constat :** 311 clés symétriques, **0 atteignable** aujourd'hui | `npm run lint` · aucune clé brute affichée sur les 11 routes |
| **3.4** | Sélecteur de langue | 3.3, 2.6 | Appelle `setLocale` · bascule sans rechargement · **sans segment d'URL** | `LocaleSwitcher.tsx` | **Hypothèse :** décision documentée dans `i18n/config.ts`, non remise en cause | FR → EN change les libellés, l'URL ne bouge pas |
| **3.5** | Sélecteur de thème | 3.1 | `data-theme` piloté et persisté · script anti-clignotement **avec nonce CSP** | `ThemeSwitcher.tsx`, `theme-script.tsx` | **Conflit connu :** seul endroit où CSP et rendu se contredisent. **Ne pas relâcher la CSP** — utiliser un nonce | Après rechargement, le thème est posé **avant** la 1ʳᵉ peinture |
| **3.6** | Icônes | 3.1 | Lucide en **imports nommés** · glyphes de catégorie conservés (`✚ ▲ ◉ ■ ◆ ●`) | `components/ui/Icon.tsx` | **Risque :** `import * as icons` ferait entrer toute la bibliothèque dans le bundle | First Load JS < 150 kB |
| **3.7** | Contraste WCAG AA | 3.1 | Test de luminance sur les 3 thèmes · corriger `--mut` de `plasma` **à la source (prototype)** puis régénérer | Thèmes conformes AA | **Hypothèse :** `04-DESIGN-TOKENS.md` documente déjà `--mut` de `plasma` sous AA. **Interdit :** éditer `tokens.css` à la main | `tests/unit/contrast.test.ts` · axe sur 11 routes |

**Livrables de la phase :** 12 primitives dans 3 thèmes × 2 langues · aucune requête tierce · aucune chaîne en dur · contraste AA.

**Validation de la phase :**

```bash
CI=1 npx playwright test tests/e2e/ui-gallery.spec.ts tests/e2e/fonts.spec.ts tests/e2e/a11y.spec.ts
npx vitest run tests/unit/contrast.test.ts
npm run check:tokens && npm run verify
```

**Avancement projet à la sortie : 48 % → 56 %**

---

# Phase 4 – Les onze vues

**Objectif :** Atteindre la parité fonctionnelle avec le prototype, en code de production, avec **les mêmes chiffres à la même date figée**.

**Charge :** 15 j — **55 % de la charge restante** · **Prérequis :** Phase 3 validée · **Priorité :** 🔴 Critique
**Réf :** T3.1 à T3.18

**Pour chaque vue :** appliquer le protocole en 7 points. Une vue = une tâche = une PR.
**Ne passe jamais à la vue suivante tant que la vue en cours n'est pas totalement terminée et validée.**

**Protocole spécifique — obligatoire pour chaque vue :**
1. Lire `docs/handoff/05-SPEC-VUES.md` § de la vue + ouvrir `public/prototype/tests/visual/reference/<n>-<vue>.png`
2. Ouvrir le prototype côte à côte
3. **Écrire le test e2e d'abord**, à partir du § « Interactions »
4. Porter la vue — tout calcul absent descend dans `lib/domain` **avec son test**
5. Comparer les chiffres au prototype, à la même date figée
6. Vérifier : 3 thèmes × 2 langues · 4 paliers · axe · `verify` · 62 valeurs
7. Commit + mise à jour du jalon

| # | Vue | j | Contenu et interactions | Risques & pièges | Vérification |
|---|---|---|---|---|---|
| **4.1** | `today` | 2 | Navigation jour · filtres · liste unifiée triée par heure · sous-listes · compteurs `−`/`+` · tiroir *Réussi / Passer / Reporter / Supprimer / Note* · toast annulable | **G9 :** une habitude `limit` n'est **jamais réussie d'avance**. Un jour futur n'est pas cochable | `limit` non cochée sans entrée · 5 actions présentes · annulation restaure |
| **4.2** | `habits` | 1,5 | Carte : glyphe, objectif, **7 pastilles de semaine cliquables**, série, record, taux 30 j · archiver, supprimer | Les pastilles suivent `weekStart`. Un jour non planifié n'est pas cochable. `bestStreak` passe par le sélecteur, jamais par un calcul en ligne | **La carte `alc` affiche streak 8 / best 37 / 87 %** = `golden.json` |
| **4.3** | `dash` | 1 | Anneau du jour · 4 compteurs · habitudes du jour · prochaines tâches · mini-heatmap 30 j · objectifs · bandeau de rappel d'export | **G3 :** les minutes de focus viennent des sessions réelles. Compte sans session → **0** | Compte vierge : tous les compteurs à 0 |
| **4.4** | Éditeur habitude + tâche | 2 | 4 onglets (Définition / Planning / Rappels / Avancé) · `react-hook-form` + zod · brouillon isolé · suppression annulable | **G8 :** le sélecteur de type propose **SEPT** options. Fermer sans enregistrer ne modifie rien | 7 options listées · brouillon jeté sans effet · formulaire invalide bloqué |
| **4.5** | `tasks` | 1 | Groupes Aujourd'hui / Demain / Cette semaine / Plus tard / Terminé · priorités · sous-tâches · liste de courses | « Cette semaine » dépend de `weekStart` | Regroupement correct aux deux réglages |
| **4.6** | `stats` | 2 | Fenêtres 7/30/90/365 · heatmap 6 mois · taux global · journées parfaites · classement par score · répartition par catégorie | **À descendre dans `lib/domain` :** `perfectDays`, `habitScore`, `categoryBreakdown`. Ne pas sur-optimiser : `<canvas>` au-delà de 400 cellules seulement | `perfectDays30 = 6` = `golden.json` |
| **4.7** | `goals` | 1,5 | 3 types · cible, unité, source, échéance · barre de progression · **à ajouter :** rythme requis, courbe, jalons, alerte | **`reduce` compte les ÉCHECS** → `percent = 1 − current/total`. Une barre qui l'ignore affiche l'inverse | Tests unitaires de `requiredPace`, `goalStatus`, `goalTrail` |
| **4.8** | `calendar` | 2,5 | 4 modes (`month`/`week`/`day`/`agenda`) · glisser-déposer `@dnd-kit` · redimensionnement ≥ 15 min · toast annulable | **La plus risquée.** L'**alternative clavier est obligatoire**, pas optionnelle. À vérifier : `RECETTE.md` mentionne un 5ᵉ mode « orbite » que la spec ignore — trancher et corriger le document fautif | Déplacement **au clavier** · resize plancher à 15 min |
| **4.9** | `timer` | 1 | 4 modes · cadran animé · phases pomodoro 25/5/15 ×4 · crédit automatique de l'habitude | **B5 :** `startedAt` + `accumulatedMs` persistés. Reprise **toujours en pause** — additionner 3 jours de temps réel serait faux. Le tick est **purement d'affichage** | Session survit au rechargement · dérive < 1 s sur 25 min |
| **4.10** | `notes` | 0,75 | Journal auto-sauvegardé (`j\|YYYY-MM-DD`) · humeur · historique · notes d'habitude · recherche plein texte | **G3 :** `journalSeed()` a été neutralisé. Un jour sans note est **vide** | Aucun contenu généré sur un jour vide |
| **4.11** | `settings` + `profile` | 0,75 | Thème, langue, `weekStart`, interrupteurs, export, réinitialisation en deux temps · profils multiples, avatar OKLCH | `notif`/`sound`/`vibrate` restent **désactivés et grisés** avec mention « bientôt » jusqu'à la phase 5. Jamais « cloud » : « Sauvegarde locale sur cet appareil » (clé `cfg.cloud` **non renommée**, G1) | Aucun interrupteur actif sans effet |

**Livrables de la phase :** parité fonctionnelle avec le prototype · 11 vues comparées à leurs captures de référence.

**Validation de la phase :**

```bash
CI=1 npm run test:e2e            # 11 vues × interactions × 4 paliers × axe
npx vitest run                   # 62 valeurs + domaine étendu
npm run verify
```

**Avancement projet à la sortie : 56 % → 80 %**

---

# Phase 5 – Fiabilisation et PWA

**Objectif :** Tenir les promesses que l'interface fait déjà : aucun interrupteur sans effet, aucun écran blanc, application installable et utilisable hors ligne.

**Charge :** 6 j · **Prérequis :** Phase 4 validée · **Priorité :** 🟠 Haute
**Réf :** T1.12, T1.13, T4.2 à T4.6, T5.1 à T5.5, T7.5 · lève **D10**, **D25** · corrige **B3**

**Pour chaque tâche :** appliquer le protocole en 7 points.
**Ne passe jamais à la tâche suivante tant que la tâche en cours n'est pas totalement terminée et validée.**

| # | Tâche | j | Actions & outils | Livrables | Risques & hypothèses | Vérification |
|---|---|---|---|---|---|---|
| **5.1** | États erreur / vide / chargement | 1,5 | `error.tsx`, `global-error.tsx`, `loading.tsx` ×11 · états vides sur les 11 vues · `lib/logger.ts` **local uniquement** | Aucun écran blanc possible | **Règle :** l'écran d'erreur propose **d'exporter ses données**. Une erreur ne doit jamais mettre l'utilisateur en position de perdre son historique. **Décision E** : aucun envoi réseau | Chaque vue a son état vide · l'écran d'erreur propose l'export |
| **5.2** | Notifications réelles | 1 | Permission **au clic sur l'interrupteur**, jamais au chargement · planificateur (`setTimeout` si onglet ouvert, service worker sinon) | Rappels d'habitude, fin de pomodoro | **Risque :** un refus doit ramener l'interrupteur à l'arrêt **avec explication** — c'est le navigateur qui refuse, pas l'application | Permission `default` au chargement · refus dégradé proprement |
| **5.3** | Son et vibration | 0,5 | Bip Web Audio **synthétisé, zéro fichier** · `navigator.vibrate` avec garde | `lib/features/feedback/` | **Piège :** un `AudioContext` créé hors geste utilisateur démarre suspendu. Vibration absente sur iOS Safari → **masquer** l'interrupteur, pas l'afficher inopérant | Bip audible · interrupteur masqué si API absente |
| **5.4** | Aucun interrupteur mort | 0,5 | Test parcourant tous les `switch` : soit actionnable, soit désactivé **avec raison affichée** · renommer le libellé `cloud` | **G3 tenue** | **G1 :** la clé `cfg.cloud` n'est **pas** renommée — données d'utilisateurs réels | Test automatique sur tous les `role="switch"` |
| **5.5** | Onboarding | 1,5 | 3 écrans (langue → thème → 3 habitudes suggérées, aucune pré-cochée) · bouton principal → **compte vierge** · démo en lien secondaire, badgée | `app/onboarding/` | **B4 :** un utilisateur réel ne doit **jamais** recevoir l'historique de démonstration | Parcours par défaut → focus à **0**, état vide visible |
| **5.6** | Récurrence | 1 | RRULE simplifiée (`daily`/`weekly`/`monthly` + intervalle) · exceptions par occurrence | `lib/domain/recurrence.ts` | **G1 :** la clé `occ` garde le format `taskId\|YYYY-MM-DD`. Cas obligatoires : intervalle > 1, exception au milieu, 31 janvier → février, heure d'été | Tests unitaires des 5 cas limites |
| **5.7** | PWA | 2 | Manifeste, icônes 192/512/maskable, favicon · service worker **Serwist** · précache coquille + polices · bandeau de mise à jour | Installable, offline total | **CSP :** `worker-src 'self'` déjà posé (0.14) — vérifier l'absence de violation. **Décision G** impacte `start_url` | Avion activé : l'application fonctionne et navigue |
| **5.8** | Sauvegarde | 0,5 | Export complet · import avec **rapport visible** · rappel après 30 jours, refusable et non récurrent · copie de secours avant import et réinitialisation | Garde-fou anti perte | **Hypothèse :** sans compte, l'export **est** la sauvegarde | Rappel affiché puis refusable une seule fois |
| **5.9** | Cache dérivé | 1 | Invalidation par `(habitId)` et par `(date)`, **jamais globale** | `lib/domain/cache.ts` | **ADR-0004 :** les métriques d'une habitude dépendent de sa définition et de **son** journal, jamais de celui des autres | Cocher `h1` ne recalcule pas `h2` · aucune valeur périmée |
| **5.10** | Virtualisation | 0,5 | `@tanstack/react-virtual` sur les longues listes | Performance tenue | **Décision instruite :** heatmap en DOM tant que < 400 cellules | 200 habitudes × 3 ans : interaction < 100 ms |

**Livrables de la phase :** aucun interrupteur sans effet · application installable et hors ligne · compte vierge honnête.

**Validation de la phase :**

```bash
CI=1 npm run test:e2e     # interrupteurs, onboarding, offline, PWA
npx vitest run            # récurrence, cache dérivé, 62 valeurs
npm run verify
```

**Avancement projet à la sortie : 80 % → 91 %**

---

# Phase 6 – Vitrine et SEO

**Objectif :** Construire le seul actif indexable du projet, et rendre l'application volontairement invisible des moteurs.

**Charge :** 3 j · **Prérequis :** Phase 4 validée · **Priorité :** 🟠 Haute · **parallélisable avec la phase 5**
**Réf :** T7.6, T8.5 · lève **D27**, **D28**

**Pour chaque tâche :** appliquer le protocole en 7 points.
**Ne passe jamais à la tâche suivante tant que la tâche en cours n'est pas totalement terminée et validée.**

| # | Tâche | j | Actions & outils | Livrables | Risques & hypothèses | Vérification |
|---|---|---|---|---|---|---|
| **6.1** | Vitrine Modernist | 1,5 | Groupe de routes `(site)` · jetons Modernist extraits de `_ds/`, **portée limitée au groupe** · accroche, 3 arguments, profondeur du modèle, preuve, installation, FAQ, pied · bilingue | `app/(site)/` | **Décision B1 option (c) :** application sombre, vitrine Modernist. **Décision G** : la vitrine prend `/`, l'application `/app`. **G6** s'applique aux clés `site.` | Vitrine et application ont des fonds différents · 4 paliers sans débordement |
| **6.2** | Métadonnées | 0,5 | `metadataBase` (`NEXT_PUBLIC_SITE_URL`, déjà dans `.env.example`) · OG, Twitter Card, canonique, `hreflang` FR/EN · image OG générée, **police embarquée** | Partage social correct | **CSP :** aucune police distante autorisée | 7 balises vérifiées par test |
| **6.3** | robots et sitemap | 0,5 | `app/robots.ts` : `Disallow /app`, `/prototype`, `/dev` · `app/sitemap.ts` : vitrine seule · en-tête `X-Robots-Tag: noindex` sur `/app/:path*` | Budget de crawl concentré | **Hypothèse :** l'application est un outil privé, sans contenu public indexable | `/app/habits` sert `noindex` · sitemap sans route applicative |
| **6.4** | JSON-LD | 0,25 | `SoftwareApplication` (prix 0, catégorie, licence MIT) · `FAQPage` · `BreadcrumbList` | Rich snippet | **CSP :** utiliser le nonce de 3.5 — **jamais `unsafe-inline`** | JSON-LD parsable, `offers.price = "0"` |
| **6.5** | Contenu de fond | 0,5 | 3 comparatifs (HabitNow, Habitica, Streaks) · 3 guides (alcool, écrans, pomodoro) · 800–1 500 mots, bilingues, maillés | Longue traîne | **Règle éditoriale :** rien d'invérifiable sur un concurrent, chaque comparatif **daté**. Un comparatif faux se retourne contre le produit | Relecture factuelle |
| **6.6** | Confidentialité et mentions | 0,25 | Aucune donnée collectée · stockage local · un seul cookie propre (`habitum.lang`) · hébergeur et région · droits RGPD sans objet, avec contact | Documents opposables | **C'est l'argument commercial n° 1** — il doit être écrit et exact | Relecture juridique |
| **6.7** | Budget Lighthouse | 0,25 | `lighthouse.yml` + `lighthouserc.json` sur `/` et `/app` | Budget en CI | — | ≥ 95 / ≥ 95 / 100 / **100 SEO** |

**Livrables de la phase :** vitrine bilingue en ligne · application `noindex` · politique de confidentialité.

**Validation de la phase :**

```bash
CI=1 npx playwright test tests/e2e/site.spec.ts tests/e2e/seo.spec.ts
npx @lhci/cli autorun
npm run check:messages && npm run verify
```

**Avancement projet à la sortie : 91 % → 95 %**

---

# Phase 7 – Qualité et lancement

**Objectif :** Prouver que le produit tient, le mettre en production, et se donner les moyens de revenir en arrière.

**Charge :** 7 j · **Prérequis :** Phases 5 et 6 validées · **Priorité :** 🟠 Haute
**Réf :** T7.1, T7.4, T8.1, T8.4, T8.5, T8.6 · lève **D11**, **D23**

**Pour chaque tâche :** appliquer le protocole en 7 points.
**Ne passe jamais à la tâche suivante tant que la tâche en cours n'est pas totalement terminée et validée.**

| # | Tâche | j | Actions & outils | Livrables | Risques & hypothèses | Vérification |
|---|---|---|---|---|---|---|
| **7.1** | 8 parcours critiques | 2 | Cocher une habitude · créer une tâche par ⌘K · déplacer au calendrier (souris **et** clavier) · pomodoro complet · **export → reset → import** · changer de profil · FR→EN · réinitialiser | `tests/e2e/parcours/` | **Écrire le parcours export/import EN PREMIER** : c'est celui qui a déjà échoué (4 habitudes sur 6 perdues). Chaque parcours se termine sur un **état observable**, jamais sur un clic réussi | 8 parcours verts sur `desktop` **et** `mobile` |
| **7.2** | Non-régression visuelle | 1 | 11 vues × 3 thèmes · **date gelée au 2026-08-05** · `reducedMotion`, animations désactivées, horloge masquée | Captures de référence | **Risque :** sans date gelée, les captures divergent chaque jour et le harnais devient du bruit. Ne comparer que des captures produites sur la même plateforme | Écart ≤ 2 % vs `visual/reference/` |
| **7.3** | Accessibilité approfondie | 1 | axe sur 11 vues × 3 thèmes · **3 parcours au lecteur d'écran** (NVDA, VoiceOver), consignés · vérifier alternative clavier, région live, curseur désactivé par défaut, cibles ≥ 44 px | `docs/a11y/rapport-lecteur-ecran.md` | **Testée, pas déclarée** : l'alternative clavier au glisser-déposer est le point le plus exposé | 0 violation critique ou sérieuse |
| **7.4** | Recette responsive et manuelle | 0,5 | 4 paliers × 11 vues · **heatmap qui se réorganise au lieu de défiler sous 768 px** · `RECETTE.md` intégrale (11 vues × 3 thèmes × 2 langues) | Recette consignée au CHANGELOG | **Hypothèse :** ce qu'un test ne juge pas, c'est la **sensation** du geste — glisser-déposer et export/import demandent une passe à la main | `RECETTE.md` datée et signée |
| **7.5** | Charge côté client | 0,5 | 200 habitudes × 3 ans (≈ 219 000 entrées) · ouverture, clic, heatmap, import 2 Mo, export | Seuils tenus | **Il n'y a pas de serveur à charger** — c'est tout l'intérêt du produit | Ouverture < 1,5 s · clic < 100 ms · **< 10 recalculs** au clic |
| **7.6** | Sécurité et montées majeures | 1 | Revue OWASP client · test de **prototype pollution** à l'import · fichier > 2 Mo rejeté · monter `next@16` et `next-intl@4` · remonter le seuil d'audit à `high` · activer `exactOptionalPropertyTypes` | **D11** et **D23** levés | **Le bon moment :** les 8 parcours et la non-régression visuelle peuvent détecter une régression. Consulter le guide de migration next-intl v3→v4 (`getRequestConfig` et navigation ont changé) | `npm audit` sans haute · `securityheaders.com` note **A** |
| **7.7** | Tests utilisateurs | 0,5 | 5 personnes, 3 parcours, sans assistance · relever les **mots employés** (ils valent mieux que les nôtres pour la vitrine) | `docs/recherche/tests-utilisateurs-*.md` | **Décision E :** sans télémétrie, c'est la **seule** mesure produit disponible. Elle n'est pas optionnelle | Temps jusqu'à la 1ʳᵉ habitude créée mesuré |
| **7.8** | Documentation de version | 0,25 | README public (démarrage < 5 min, badges) · CHANGELOG complet · **page de version dans les réglages** (app, schéma Dexie, date de build) | Documentation à jour | **Hypothèse :** la page de version rend un rapport d'anomalie exploitable | Relecture |
| **7.9** | Mise en production | 0,5 | Vérifier G10 · **trancher la décision C** (Hobby non commercial vs Cloudflare) · `git tag v1.0.0` · promouvoir · domaine · `NEXT_PUBLIC_SITE_URL` et `vars.SITE_URL` | **v1.0.0 en ligne** | **Décision C avant la mise en ligne, pas après** : changer d'hébergeur après indexation coûte du référencement | **11 vérifications post-déploiement** |
| **7.10** | Runbook d'incident | 0,25 | Rollback Vercel en 1 clic · niveaux S1/S2/S3 · canal de signalement · **le seul S1 possible : une régression de la couche de données** | `docs/RUNBOOK.md` | **Sans télémétrie, on ne détecte pas un incident par les métriques** — seulement par la sonde et les signalements. D'où l'importance d'un canal visible | Rollback testé au moins une fois |

**Les 11 vérifications post-déploiement (7.9) :** 11 routes en 200 · PWA installable · offline effectif · aller-retour export/import identique · FR↔EN · 3 thèmes sans clignotement · en-têtes note A · aucune requête tierce · `robots.txt` et `sitemap.xml` corrects · Lighthouse ≥ budget · sonde verte.

**Validation de la phase — et du projet :**

```bash
npm run verify                              # 7 étapes
npm run build && CI=1 npm run test:e2e      # 8 parcours × 2 projets
npx vitest run                              # 62/62
node scripts/extract-tokens.mjs --check
npm audit --audit-level=high                # 0 vulnérabilité haute
npx @lhci/cli autorun                       # budget tenu
```

**Avancement projet à la sortie : 95 % → 100 % — v1.0 en production**

---

# Décisions requises — elles bloquent une phase chacune

| # | Décision | Recommandation | Bloque | Échéance |
|---|---|---|---|---|
| **A** | Compte GitHub et visibilité | **Public** — Actions illimitées, et l'ouverture est l'argument commercial | Phase 0 tâche 0.9 | Jour 1 |
| **B** | `date-fns` : garder ou retirer ? | **Retirer** — `lib/domain/` ne doit dépendre de rien | Phase 0 tâche 0.7 | Jour 1 |
| **D** | Neon maintenant ou v1.1 ? | **v1.1** — mais `deletedAt` et les horodatages entrent dès la tâche 0.3 | Phase 1 | Jour 1 (la décision, pas le provisionnement) |
| **G** | Application sur `/` ou `/app` ? | **`/app`**, la vitrine prend `/` | Phases 2 à 7 | **Avant la phase 2** — les tests e2e codent les routes en dur |
| **E** | Télémétrie ? | Journal **local** par défaut · analytique sur la vitrine seule · Sentry opt-in jamais activé sans geste | Phase 5 | Avant la phase 5 |
| **F** | Modèle économique | Gratuit + dons en v1.0 · synchronisation payante en v1.1 — on ne facture que ce qui coûte | Phase 6 | Avant la phase 6 |
| **C** | **Vercel Hobby ou Cloudflare Pages ?** | Hobby **interdit l'usage commercial** — trancher selon la décision F | Phase 7 tâche 7.9 | **Avant le lancement** |

---

# Chronologie et suivi

| Phase | Charge | Cumul | État | Avancement à la sortie |
|---|---:|---:|---|---:|
| **0 · Fondations** | 7 j | 7 j | ✅ 11 août 2026 | 22 % → **31 %** |
| **1 · Données** | 6,5 j | 13,5 j | ✅ 8 août 2026 | 31 % → **42 %** |
| **2 · État & coque** | 4 j | 17,5 j | ✅ 8 août 2026 | 42 % → **48 %** |
| **3 · Système visuel** | 5 j | 22,5 j | ✅ 12 août 2026 | 48 % → **56 %** |
| **4 · Les onze vues** | 15 j | 37,5 j | ⬜ | 56 % → **80 %** |
| **5 · Fiabilisation & PWA** | 6 j | 43,5 j | ⬜ | 80 % → **91 %** |
| **6 · Vitrine & SEO** | 3 j | 46,5 j | ⬜ | 91 % → **95 %** |
| **7 · Qualité & lancement** | 7 j | 53,5 j | ⬜ | 95 % → **100 %** |

```
Sem. 1-2  ██████ Phase 0 — Fondations
Sem. 2-3  ██████ Phase 1 — Données
Sem. 3-4  ████ Phase 2 — État & coque
Sem. 4-5  █████ Phase 3 — Système visuel
Sem. 5-7  ███████████████ Phase 4 — Les onze vues
Sem. 8    ██████ Phase 5 — Fiabilisation & PWA   ▒▒▒ Phase 6 — Vitrine (parallèle)
Sem. 9    ███████ Phase 7 — Qualité & lancement                        → v1.0
```

**Délai calendaire : ~9 semaines à 1 ETP.** La phase 6 se parallélise avec la phase 5.

---

*Établi le 6 août 2026. Le détail par tâche — fichiers exacts, signatures, code de test, étapes de 2 à 5 minutes — vit dans les documents `2026-08-06-habitum-plan-*.md` du même dossier.*
