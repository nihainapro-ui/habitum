# Audit technique & plan de mise en production — Habitum

**Date :** 6 août 2026 · **Périmètre :** dépôt complet (`d:\Projet\En cours\habitum`), prototype inclus
**Contrainte cadre :** 100 % gratuit — GitHub · Vercel · Neon PostgreSQL · aucune brique payante obligatoire

> Ce document est un audit **daté et vérifié par exécution**. Chaque constat porte sa preuve
> (commande + sortie). Il ne remplace pas `docs/handoff/` : il le confronte au code réel et
> relève **28 écarts** entre ce que la documentation affirme et ce que le dépôt fait.

---

## 0. Synthèse exécutive

| Question | Réponse |
|---|---|
| Le projet compile-t-il ? | **Non.** Une apostrophe non échappée casse `typecheck`, `lint` et `build`. |
| Le projet est-il versionné ? | **Non.** Aucun dépôt Git. `.git` absent. |
| Quelle part du produit est portée ? | **≈ 22 %.** Les 11 vues sont à 0 %. |
| Le moteur métier est-il fiable ? | **Oui** — porté fidèlement, vérifié fonction par fonction contre la référence. |
| Combien de temps jusqu'à la production ? | **6 à 9 semaines** à 1 ETP, dont ~55 % sur les vues. |
| Coût d'infrastructure cible | **0 €** — atteignable, et même améliorable (voir D12). |

**Trois faits à retenir**

1. Le dépôt est **à un caractère** d'une chaîne de vérification verte — puis à **zéro ligne** d'une interface.
2. `styles/tokens.css` **ne correspond ni au prototype ni à sa propre spécification** (noms et valeurs différents, 7 jetons majeurs absents). Toute vue portée dessus sera visuellement fausse. C'est le risque le plus coûteux du projet et il est invisible tant qu'on ne compare pas.
3. `docs/handoff/03-ARCHITECTURE.md` — le document de référence du portage — **reproduit le piège des 4 types d'objectif au lieu de 7**, celui-là même qui a déjà fait disparaître 4 habitudes sur 6 à l'import.

---

## 1. Compréhension du projet

### 1.1 Objectif

Habitum est un **gestionnaire d'habitudes, de tâches, d'objectifs et de temps de focus**,
positionné **local-first** : aucune donnée ne quitte l'appareil, aucun compte, aucun appel réseau.
FR/EN, trois thèmes, onze écrans.

Le dépôt est explicitement une **base de reprise** : moteur métier porté, structure Next.js posée,
vues non portées. La référence exécutable est un prototype HTML mono-fichier de 336 Ko
(3 877 lignes) servi tel quel depuis `public/prototype/`.

### 1.2 Architecture globale

```
Prototype (archive, jamais compilé)          Application Next.js (en construction)
public/prototype/Habitum.dc.html   ──────►   app/            12 routes App Router
  1 composant, 1 state (~40 clés)            components/     coque minimale
  localStorage, 3 thèmes, FR/EN              lib/domain/     moteur pur, testé  ← porté ✅
  62 valeurs de référence                    lib/storage/    clés figées + amorce d'import
                                             i18n/           next-intl par cookie
                                             messages/       311 clés FR/EN
                                             styles/         jetons  ← incompatible ❌
                                             tests/          9 unitaires + 2 e2e
```

**Règle structurante saine :** `lib/domain/` n'importe jamais React, Next ni la persistance.
Elle est **imposée par ESLint** (`no-restricted-imports` sur `lib/domain/**`), pas seulement écrite.
C'est le meilleur choix d'ingénierie du dépôt.

### 1.3 Technologies

| Couche | Retenu | Licence | Installé | **Utilisé** |
|---|---|---|---|---|
| Framework | Next.js 15.5.22 (App Router) | MIT | ✅ | ✅ |
| Langage | TypeScript 5.9 strict | Apache-2.0 | ✅ | ✅ |
| UI | React 19.2 | MIT | ✅ | ✅ |
| Style | Tailwind v4 + variables CSS | MIT | ✅ | partiel |
| i18n | next-intl 3.26.5 | MIT | ✅ | **plomberie seule** |
| État | Zustand 5 | MIT | ✅ | ❌ **0 import** |
| Persistance | Dexie 4 (IndexedDB) | Apache-2.0 | ✅ | ❌ **0 import** |
| Dates | date-fns 4 | MIT | ✅ | ❌ **0 import** |
| Validation | zod 3 | MIT | ✅ | ❌ **0 import** |
| Icônes | lucide-react | ISC | ✅ | ❌ **0 import** |
| Tests | Vitest 3 · Playwright 1.5 | MIT / Apache-2.0 | ✅ | ✅ / partiel |
| CI | GitHub Actions | gratuit | ✅ (fichier) | ❌ jamais exécutée |
| Hébergement | Vercel Hobby | gratuit | ❌ | ❌ |

> **5 dépendances de production sur 10 sont mortes aujourd'hui.** Ce n'est pas une faute — elles
> anticipent les phases 1 à 3 — mais elles pèsent dans `npm ci`, dans la surface de vulnérabilité
> et dans l'audit de licences. À conserver, en les documentant comme « réservées phase N ».

### 1.4 Fonctionnement général

- **Rendu :** les 12 routes sont **dynamiques** (`ƒ`), pas statiques. Cause : `cookies()` dans
  `i18n/request.ts` interdit la génération statique de tout l'arbre. Conséquence directe sur le
  coût et la latence — voir **D12**.
- **Langue :** cookie `habitum.lang` (1 an, `sameSite: lax`, pas de tracking). Choix documenté et
  justifié dans `i18n/config.ts` : la langue est une préférence de profil, pas une propriété de la
  ressource. **Bon choix**, cohérent avec un produit mono-utilisateur.
- **Données :** aucune persistance dans l'application Next.js aujourd'hui. Le prototype utilise
  `localStorage` découpé en `habitum.state` / `habitum.state.big` / `habitum.state.bak` / `habitum.best`.

### 1.5 Points forts

| # | Force | Pourquoi c'est rare |
|---|---|---|
| 1 | **Spécification exécutable** : 62 valeurs de référence (`golden.json`) + 6 contrôles navigateur | La plupart des reprises n'ont qu'une intention écrite ; ici on a un oracle numérique |
| 2 | **Moteur métier porté fidèlement** — vérifié fonction par fonction contre `domain-logic-extract.js` | `isDone`, `isScheduled`, `currentStreak`, `bestStreak`, `completionRate`, `sumValues`, `dayRatio`, `focusMinutes`, `goalProgress` : conformes |
| 3 | **Pureté du domaine imposée par outillage**, pas par discipline | ESLint bloque tout import React/Next/storage dans `lib/domain/` |
| 4 | **Pièges documentés avant d'être repayés** | `limit` inversé, 7 types d'objectif : dans `CLAUDE.md`, dans les types, dans les tests |
| 5 | **Clés persistées figées et documentées** | `ov`, `obj`, `occ`, `tt`, `mat`, `cfg`, `habitum.*` — la migration des données existantes est possible |
| 6 | **Honnêteté produit** : `DEPLOY.md` § 4 refuse Sentry et l'analytique par cohérence avec la promesse local-first | Décision assumée, argumentée, pas subie |
| 7 | **Historique de décision réel** : 5 ADR, un CHANGELOG de 314 lignes qui documente les bugs graves trouvés | Traçabilité de niveau professionnel |
| 8 | **Coût 0 € réellement instruit**, licences vérifiées (MIT/Apache-2.0/ISC/OFL) | Contrainte tenue |

### 1.6 Points faibles

| # | Faiblesse | Conséquence |
|---|---|---|
| 1 | Le dépôt ne compile pas | Rien n'est déployable, la CI serait rouge au premier push |
| 2 | Aucun versionnement | Aucun historique, aucune PR, aucun retour arrière |
| 3 | Les jetons de design sont fabriqués, pas extraits | Le produit ne ressemblera pas à sa référence |
| 4 | L'oracle (`golden.json`) n'est branché sur rien en TypeScript | La spécification exécutable ne protège pas le portage |
| 5 | i18n à 311 clés, 0 utilisation | Le produit est monolingue français en dur |
| 6 | Documentation par endroits contredite par le code | Un repreneur qui fait confiance aux docs réintroduit des bugs connus |
| 7 | Aucune couche de données | 12 % du produit, entièrement devant nous |
| 8 | Sécurité web à zéro (aucun en-tête, aucune page d'erreur) | Défauts triviaux à corriger, mais bloquants en production |

**Fiche section 1** — *Analyse* : projet bien conçu, mal démarré. · *Recommandations* : réparer la chaîne, versionner, corriger les jetons **avant** la première vue. · *Priorité* **Critique** · *Difficulté* **Faible** (1 j) · *Impact métier* **Décisif** · *Risques* : porter 11 vues sur des jetons faux = tout refaire. · *Livrables* : dépôt vert + Git initialisé + `tokens.css` conforme.

---

## 2. Audit de l'existant

### 2.1 Preuves d'exécution

```
$ npm run check:messages   → OK — 311 clés, symétrie FR/EN vérifiée.        ✅
$ npm test                 → 1 fichier, 9 tests passés (473 ms)             ✅
$ npm run typecheck        → 5 erreurs TS1005/TS1002/TS1136                 ❌
$ npm run lint             → 1 error (Parsing error), 1 warning             ❌
$ npm run build            → Failed to compile (Syntax Error)               ❌
$ npm run format:check     → Code style issues found in 30 files            ❌ (hors verify)
$ npm audit                → 4 vulnérabilités (3 hautes, 1 modérée)         ❌
$ ls -a | grep '^\.git$'   → 0                                              ❌
```

**Contre-preuve** — après correction temporaire du seul caractère fautif (puis restauration
à l'identique du fichier) :

```
$ npm run typecheck  → 0 erreur                                             ✅
$ npm run build      → ✓ Generating static pages (14/14) — 103 kB First Load JS  ✅
$ npm run lint       → 0 erreur (sur checkout propre)                       ✅
```

Le dépôt est donc **à un caractère d'être vert**. Tout le reste tient.

### 2.2 Fonctionnalités terminées

| Élément | État | Preuve |
|---|---|---|
| Moteur métier : planification, complétion (7 types), séries, taux, cumuls, ratio journalier, focus, objectifs (3 types) | ✅ porté, typé, pur | `lib/domain/*` conforme à `domain-logic-extract.js` |
| Catalogue de libellés FR/EN | ✅ 311 clés, symétrie imposée en CI | `scripts/check-messages.mjs` |
| Structure App Router : 12 routes + 404 | ✅ | `next build` : 14 pages |
| Frontière de pureté du domaine | ✅ imposée par ESLint | `eslint.config.mjs` |
| Clés persistées figées et documentées | ✅ | `lib/storage/keys.ts` + `03-ARCHITECTURE.md` |
| Prototype de référence + 6 contrôles + 11 captures + recette | ✅ | `public/prototype/tests/` |
| Documentation de reprise (9 fiches handoff, 5 ADR, backlog 77 tâches) | ✅ | `docs/` |

### 2.3 Fonctionnalités partielles

| Sujet | Existant | Manquant | Avancement |
|---|---|---|---|
| **Moteur métier** | 9 fonctions portées et justes | `perfectDays`, `habitScore`, `recurrence`, cache dérivé, `startOfWeek(weekStart)`, format de date localisé | 70 % |
| **Tests** | 9 cas unitaires ciblés sur les 2 pièges | ≥ 40 cas exigés (T1.6), golden.json non branché, aucun seuil de couverture, e2e non exécutable | 25 % |
| **i18n** | 311 clés, provider monté, action serveur de bascule | **0 composant n'appelle `useTranslations`** ; aucun sélecteur de langue | 45 % |
| **Design system** | `tokens.css` (46 lignes) | Jetons faux (**D3**), 0 primitive UI, 0 icône | 10 % |
| **Import de données** | 4 validateurs, `toLogRows`, garde de taille | Aucune fonction d'import, aucun schéma zod, aucun rapport produit | 15 % |
| **Coque applicative** | Navigation verticale de 47 lignes, styles en ligne | Rail 3 groupes, en-tête, mode zen, palette ⌘K, barre basse mobile | 10 % |
| **CI** | Workflow 6 étapes | Jamais exécutée, pas d'e2e, pas de `permissions:`, actions non épinglées, pas de Dependabot | 20 % |

### 2.4 Fonctionnalités manquantes (0 %)

Les **11 vues** · la **couche Dexie** (schéma, dépôts, migrations, transactions) · le **store Zustand**
et l'annulation · l'**éditeur 4 onglets** · le **calendrier** (4 modes, glisser-déposer) · la **heatmap**
· le **timer persistant** · les **profils multiples** · l'**onboarding** et la séparation démo / compte vierge
· les **notifications, son, vibration** · la **PWA** (manifeste, icônes, service worker) · les **pages
d'erreur et de chargement** · les **en-têtes de sécurité** · le **SEO** et la **vitrine** · le **monitoring**.

### 2.5 Registre des défauts

#### Bloquants — P0

| Réf | Défaut | Preuve | Correction |
|---|---|---|---|
| **D1** | `components/shell/app-shell.tsx:6` — apostrophe droite non échappée dans une chaîne `'…'`. `typecheck`, `lint`, `build` échouent ; **toutes les routes seraient en erreur 500** (`layout.tsx` importe `AppShell`). | `TS1002 Unterminated string literal` / `next build: Expected ',', got 'hui'` | 1 caractère : `"Aujourd'hui"` |
| **D2** | **Aucun dépôt Git.** Pas d'historique, pas de branche, pas de PR, CI jamais déclenchée, Vercel non branchable. | `.git` absent | `git init` + premier commit |
| **D3** | **`styles/tokens.css` est incompatible avec le prototype et avec `04-DESIGN-TOKENS.md`** — noms **et** valeurs différents. Prototype : `--txt`/`--txt2`/`--mut`/`--acc`/`--acc2`/`--acc3`/`--panel2`/`--line2`/`--glow`/`--bg2`. Dépôt : `--fg`/`--fg-dim`/`--accent`/`--accent-hi`/`--bg-2`. **7 jetons majeurs absents**, dont `--acc2` (155 usages), `--mut` (180), `--glow` (65), `--txt2` (54). Aucune valeur ne coïncide (`--bg` : `#04060d` attendu, `#08090d` écrit). L'en-tête du fichier affirme pourtant « Extraits du prototype ». | `grep var(--…)` sur `Habitum.dc.html` vs `styles/tokens.css` | Régénérer par extraction, pas à la main |

> **Pourquoi D3 est le défaut le plus coûteux du dossier.** Il ne casse rien : le projet compile,
> les tests passent, personne ne le voit. Mais chaque vue portée dessus sera décalée de la
> référence, et la non-régression visuelle (11 captures) ne matchera jamais. Découvert après
> 11 vues, c'est une reprise complète du CSS. Découvert maintenant, c'est une heure.

#### Élevés — P1

| Réf | Défaut | Impact |
|---|---|---|
| **D4** | `tests/fixtures/golden.json` (62 valeurs — « la spécification ») **n'est consommé par aucun test TypeScript**. `tests/README.md` affirme le contraire (« consommées par les deux »). | L'oracle ne protège pas le portage. C'est précisément le risque que `PASSATION` désigne comme principal. |
| **D5** | `docs/handoff/03-ARCHITECTURE.md` § 3 déclare `type GoalKind = 'check'\|'total'\|'list'\|'limit'` — **4 types au lieu de 7** (`count` et `time` manquent), et § 4 répète « les 4 types d'objectif ». | Le document de référence du portage **reproduit le piège** qui a déjà fait disparaître 4 habitudes sur 6 à l'import (CHANGELOG 2026-08-05). `CLAUDE.md` l'interdit explicitement. |
| **D6** | i18n branché mais **inutilisé** : 0 appel à `useTranslations`/`getTranslations`. `AppShell` et `PortStatus` sont en français en dur. | Le produit est monolingue. La règle CLAUDE.md § 6 (symétrie FR/EN) protège un catalogue que rien ne lit. |
| **D7** | Polices absentes : `tokens.css` déclare `'Space Grotesk'`/`'JetBrains Mono'`, aucun `next/font`, aucun `@font-face`. | Repli silencieux sur `system-ui` → l'app ne ressemble pas à la référence (aggrave D3). |
| **D8** | Le prototype charge **Google Fonts depuis le réseau** (`fonts.googleapis.com/css2?family=Space+Grotesk…`). | Contredit « aucun appel réseau » (README, ADR-0002) et la promesse produit. **Enjeu RGPD** : transfert d'adresse IP vers un tiers hors UE, sans consentement. |
| **D9** | Aucun en-tête de sécurité : ni CSP, ni HSTS, ni `X-Frame-Options`, ni `Referrer-Policy`, ni `Permissions-Policy`. `next.config.mjs` n'a pas de `headers()`. | Exigence T8.5 non tenue. Clickjacking, fuite de referrer, injection non contrainte. |
| **D10** | Aucune page d'erreur : ni `app/error.tsx`, ni `app/global-error.tsx`, ni `loading.tsx`. | Écran par défaut de Next en production. T4.5 ouvert. |
| **D11** | **4 vulnérabilités npm**, 3 hautes : `postcss` (XSS via `</style>` non échappé, via `next`), `sharp`/libvips (4 CVE, via `next`), `next-intl` **direct** (open redirect + prototype pollution, corrigé en 4.9.1+ — le dépôt est en 3.26.5). | Correctifs = montées majeures (`next@16`, `next-intl@4`). À planifier, pas à subir. |
| **D12** | **Les 12 routes sont dynamiques (`ƒ`)** : `cookies()` dans `i18n/request.ts` interdit toute génération statique. | Pour une application **100 % locale**, chaque affichage consomme une invocation serverless Vercel. Rendu statique = 0 invocation, latence CDN, coût structurellement nul. **Contradiction directe avec l'objectif 0 €.** |
| **D13** | `npm run verify` = typecheck + lint + messages + test. **Ni `build`, ni `format:check`** — alors que `CLAUDE.md` § Définition de terminé et `.claude/commands/verify.md` exigent `build`. `format:check` échoue déjà sur **30 fichiers**. | La commande qui définit « terminé » ne vérifie pas ce que « terminé » signifie. |
| **D14** | Modèle de données incomplet vs sa propre spécification : **`Profile` absent**, `shop` (liste de courses) absent, **`deletedAt` absent partout**, `Session` sans `updatedAt`/`createdAt`, `Note` sans `createdAt`. | `03-ARCHITECTURE.md` § 3.4 exige `updatedAt`/`deletedAt` **sur toutes les entités dès la phase 1**, « prérequis de synchronisation même si la phase 6 n'est jamais faite ». Non tenu → migration forcée en phase Neon. |
| **D15** | `Settings.weekStart: 'mon'\|'sun'` est **inimplémentable en l'état** : `dow()` code en dur lundi = 0 et aucune `startOfWeek(weekStart)` n'existe (T1.2 non tenue). | Un réglage qui ne peut pas fonctionner = la même faute que `notif`/`sound`/`vibrate` décoratifs, déjà dénoncée. |

#### Moyens — P2

| Réf | Défaut | Note |
|---|---|---|
| **D16** | **Bug métier latent** : `isScheduled` mode `'every'` **sans `start`** prend `now − 182 j` comme origine → la phase du cycle se décale d'un jour chaque jour. Une habitude « tous les 2 jours » sans date de début **change de jours planifiés quotidiennement**. | **Porté fidèlement** : le bug vient du prototype (`sched_`). Non couvert par `golden.json` (aucune habitude `every` parmi les 6). À corriger dans les deux, avec régénération de `domain-logic-extract.js` (CLAUDE.md § 7). |
| **D17** | 5 dépendances de production inutilisées (`zustand`, `dexie`, `date-fns`, `zod`, `lucide-react`). `date-fns` déclarée alors que `lib/domain/date.ts` est écrit à la main — contredit T1.2. | Trancher : garder `date-fns` (et l'utiliser) ou l'ôter (et assumer les helpers maison, ce qui est défendable pour un domaine pur). |
| **D18** | ESLint échoue sur `next-env.d.ts` (`@typescript-eslint/triple-slash-reference`) **après un build**, ce fichier étant régénéré avec une référence vers `.next/types/routes.d.ts`. | CI verte sur checkout propre, lint rouge en local dès qu'on a construit une fois. Ajouter `next-env.d.ts` aux `ignores`. |
| **D19** | 9 cas unitaires pour ≥ 40 exigés (T1.6) ; aucun seuil de couverture en CI ; 2 tests e2e non exécutables aujourd'hui ; pas de job e2e en CI. | |
| **D20** | **Divergence de stack phase 6** : `02-ROADMAP` et `03-ARCHITECTURE` prescrivent **Supabase** ; `DEPLOY.md` et `PASSATION` prescrivent **Neon + Auth.js**. | La consigne projet est **Neon**. Deux documents doivent être corrigés. |
| **D21** | Le backlog (77 tâches) référence une arborescence `src/app/`, `src/domain/`, `src/data/`… **qui n'existe pas** — le dépôt est à plat (`app/`, `lib/`, `components/`). | Chaque tâche pointe un chemin faux. À reprendre en une passe. |
| **D22** | Documentation contredite par les faits : README « 308 clés » (**311**) · `PASSATION` « `npm run verify` doit être vert avant la première modification » (**rouge**) · `tests/README` sur `golden.json` (**D4**) · ADR-0002 « toutes les données vivent dans le `localStorage` » (cible = IndexedDB). | CLAUDE.md § Définition de terminé impose de corriger tout document invalidé. |
| **D23** | `exactOptionalPropertyTypes: false` dans un tsconfig annoncé strict, sur un modèle qui utilise massivement `?:` et devra converger en synchronisation. | Activer après le portage du domaine, pas pendant. |
| **D24** | CI sans `permissions:` (droits du `GITHUB_TOKEN` par défaut), actions non épinglées par SHA, pas de `concurrency` (runs redondants), pas de Dependabot, pas de CodeQL. | Durcissement standard, ~1 h. |
| **D25** | Pas de PWA : ni `manifest.webmanifest`, ni icônes, ni service worker, ni favicon. `viewport.themeColor` figé à `#08090d` (valeur elle-même issue des faux jetons). | |
| **D26** | Accessibilité du portage **inférieure au prototype** : pas de lien d'évitement, pas d'`aria-current` sur la navigation, pas de région live, `data-theme="neural"` figé dans `layout.tsx` (3 thèmes en CSS, aucun sélecteur). | Le prototype a `:focus-visible`, `role="switch"`, piège de focus, `aria-live`. Ne pas régresser. |
| **D27** | Pas de `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS`, templates d'issue, ni politique de confidentialité — alors que « rien ne sort de l'appareil » est **l'argument commercial n° 1**. | |
| **D28** | SEO nul côté application : pas de `metadataBase`, pas d'Open Graph, pas de `robots.txt`, pas de `sitemap.xml`, pas de canonique, pas d'icônes. Et la **vitrine** — seul actif réellement indexable — n'existe qu'en prototype HTML non intégré (`Vitrine Habitum.dc.html`). | L'app est un outil privé : le SEO se joue sur la vitrine, qui n'est pas construite. |

### 2.6 Dette technique et risques

| Risque | Probabilité | Gravité | Parade |
|---|---|---|---|
| **Porter 11 vues sur des jetons faux (D3)** | **Élevée** — rien ne le signale | **Critique** — reprise complète du CSS | Corriger D3 avant T3.1, verrouiller par comparaison visuelle en CI |
| **Reperdre une règle métier au portage** | Moyenne | Élevée | Brancher `golden.json` sur Vitest (**D4**) — l'oracle existe, il suffit de le connecter |
| **Suivre `03-ARCHITECTURE` § 3 et réintroduire 4 types au lieu de 7 (D5)** | **Élevée** — c'est le document qu'on lit en premier | **Critique** — perte de données silencieuse | Corriger le document **aujourd'hui**, et n'importer les listes que depuis `lib/domain/types.ts` |
| Migration forcée en phase 6 faute de `deletedAt` (**D14**) | Élevée | Moyenne | Compléter le modèle maintenant : coût nul avant la première donnée |
| Montées majeures subies (`next@16`, `next-intl@4`) sous pression de sécurité (**D11**) | Moyenne | Moyenne | Dependabot + fenêtre de montée planifiée avant le lancement |
| Vercel Hobby **interdit l'usage commercial** (à vérifier aux conditions en vigueur) | Moyenne | **Élevée** si monétisation | Trancher tôt : Cloudflare Pages (usage commercial autorisé en gratuit) ou Vercel Pro |
| Quota `localStorage` / perte de données utilisateur | Faible (produit non lancé) | Élevée | IndexedDB + export/import + rappel de sauvegarde (déjà spécifiés) |
| Prototype qui diverge du portage | Moyenne | Moyenne | Règle CLAUDE.md § 7 déjà écrite ; l'appliquer à D16 |

**Fiche section 2** — *Analyse* : 28 défauts, 3 bloquants, aucun insurmontable ; le plus dangereux (D3, D5) est silencieux. · *Recommandations* : traiter D1→D5 en une journée avant toute vue. · *Priorité* **Critique** · *Difficulté* **Faible à moyenne** · *Impact métier* **Décisif** · *Risques* : chaque jour de portage sur D3/D5 non corrigés multiplie le coût de reprise. · *Livrables* : registre ci-dessus converti en 28 issues GitHub.

---

## 3. Travaux restants, par priorité

### 🔴 Critique — rien ne peut avancer sans

| # | Tâche | Réf | Charge |
|---|---|---|---|
| C1 | Corriger l'apostrophe de `app-shell.tsx` ; `npm run verify` vert | D1 | 5 min |
| C2 | `git init`, `.gitattributes`, premier commit, dépôt GitHub, branche `main` protégée | D2 | 1 h |
| C3 | **Régénérer `styles/tokens.css` par extraction du prototype** (16 jetons × 3 thèmes + catégories) | D3 | 2 h |
| C4 | Corriger `03-ARCHITECTURE.md` § 3 et § 4 : **7 types d'objectif**, `GoalKind` = 3 types | D5 | 30 min |
| C5 | Brancher `golden.json` sur Vitest (reconstituer les 6 habitudes, comparer les 62 valeurs) | D4 | 4 h |
| C6 | Ajouter `build` et `format:check` à `npm run verify` ; `prettier --write` sur les 30 fichiers ; ignorer `next-env.d.ts` | D13, D18 | 1 h |
| C7 | Compléter le modèle : `Profile`, `Shop`, `deletedAt` partout, `createdAt`/`updatedAt` sur `Session` et `Note` | D14 | 2 h |
| C8 | Couche Dexie : schéma 8 tables, index `[habitId+date]`, dépôts typés, migrations numérotées | T1.7–T1.9 | 4 j |
| C9 | Importeur du format prototype avec schéma zod et rapport d'import | T1.10 | 1,5 j |
| C10 | Séparation stricte **seed de démo** / **compte vierge** | T1.11, B4 | 1 j |
| C11 | Store Zustand en tranches + middleware d'annulation | T2.4–T2.5 | 2 j |
| C12 | Primitives UI (10 composants) sur les jetons corrigés | T2.3 | 3 j |
| C13 | Les 11 vues | T3.* | 15–20 j |

### 🟠 Haute — indispensable au lancement

| # | Tâche | Réf | Charge |
|---|---|---|---|
| H1 | Brancher `useTranslations` dans **tous** les composants + sélecteur de langue | D6 | 2 j |
| H2 | Polices auto-hébergées via `next/font` ; supprimer l'appel Google Fonts du prototype | D7, D8 | 3 h |
| H3 | En-têtes de sécurité (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy) | D9 | 3 h |
| H4 | `error.tsx`, `global-error.tsx`, `loading.tsx`, états vides sur les 11 vues | D10 | 1,5 j |
| H5 | Sélecteur de thème réel (3 thèmes, `data-theme` piloté, sans clignotement) | D26 | 1 j |
| H6 | Rendre les routes **statiques** (locale côté client ou `generateStaticParams`) | D12 | 1 j |
| H7 | Compléter le domaine : `perfectDays`, `habitScore`, `recurrence`, `startOfWeek(weekStart)`, cache dérivé | T1.12–T1.14 | 3 j |
| H8 | Porter la couverture à ≥ 40 cas, seuil ≥ 90 % sur `lib/domain`, en CI | D19 | 2 j |
| H9 | 8 parcours Playwright + job e2e en CI | T8.1 | 2 j |
| H10 | Durcir la CI : `permissions`, SHA épinglés, `concurrency`, Dependabot, CodeQL | D24 | 3 h |
| H11 | Timer persistant (`startedAt` + `accumulatedMs`) | T3.14, B5 | 1 j |
| H12 | Notifications, son (Web Audio), vibration — **ou retrait des interrupteurs** | T4.2–T4.3 | 2 j |
| H13 | Onboarding 3 écrans, compte vierge par défaut | T4.6 | 1,5 j |
| H14 | PWA : manifeste, icônes 192/512/maskable, service worker Serwist, offline total | T5.1–T5.2 | 2 j |
| H15 | Audit de contraste WCAG AA sur les 3 thèmes (`--mut` de `plasma` sous AA) | T7.3 | 1 j |
| H16 | Vitrine publique (landing) : c'est là que se joue tout le SEO | D28 | 3 j |
| H17 | Politique de confidentialité + `SECURITY.md` + mentions légales | D27 | 4 h |

### 🟡 Moyenne

| # | Tâche | Réf |
|---|---|---|
| M1 | Corriger D16 (`every` sans `start`) dans le domaine **et** le prototype, régénérer l'extrait | D16 |
| M2 | Reprendre les 77 tâches du backlog sur l'arborescence réelle (plus de `src/`) | D21 |
| M3 | Corriger README (311 clés), `PASSATION`, `tests/README`, ADR-0002 | D22 |
| M4 | Réconcilier la stack phase 6 sur **Neon** dans `02-ROADMAP` et `03-ARCHITECTURE` | D20 |
| M5 | Trancher `date-fns` : l'utiliser ou la retirer | D17 |
| M6 | Accessibilité : lien d'évitement, `aria-current`, région live, clavier sur le calendrier | D26 |
| M7 | Virtualisation des longues listes, heatmap `<canvas>` au-delà de 400 cellules | T7.5 |
| M8 | Budget Lighthouse en CI (≥ 95 / ≥ 95 / 100 / 100) | T7.6 |
| M9 | Non-régression visuelle : comparaison aux 11 captures de référence | T8.6 |
| M10 | Montées de version planifiées : `next@16`, `next-intl@4` | D11 |

### 🟢 Faible

Confettis et micro-récompenses (T4.7) · liste de courses (`shop`) · profils multiples (T3.17) ·
détection de mise à jour PWA (T5.5) · `exactOptionalPropertyTypes: true` (D23) ·
synchronisation Neon (phase 6, **optionnelle**) · écran d'état de synchronisation (T6.4).

**Fiche section 3** — *Analyse* : 13 tâches critiques ≈ 30 j, 17 hautes ≈ 25 j. · *Recommandations* : C1→C7 en un jour, puis séquencer C8→C13. · *Priorité* **Critique** · *Difficulté* **Moyenne** · *Impact métier* **Décisif** · *Risques* : commencer par les vues (le plus visible) avant les données et les jetons. · *Livrables* : 28 issues + 8 jalons GitHub.

---

## 4. Plan d'amélioration

### 4.1 Fonctionnel

| Amélioration | Justification | Prio | Diff. | Impact |
|---|---|---|---|---|
| Onboarding avec **compte vierge par défaut** | Un nouvel utilisateur qui reçoit un historique fabriqué ne fait plus jamais confiance aux chiffres | Haute | Moy. | Rétention J1 |
| Notifications réelles ou **retrait des interrupteurs** | Un réglage sans effet est un mensonge d'interface (règle du projet) | Haute | Moy. | Confiance |
| Objectifs : rythme requis, courbe d'avancement, alerte d'échéance | Un objectif sans projection n'aide pas à décider aujourd'hui | Moy. | Moy. | Engagement |
| Export/import + rappel de sauvegarde périodique | Sans compte, l'export **est** la sauvegarde. C'est un filet de sécurité, pas un confort | **Haute** | Faible | Anti-perte |
| Récurrence propre (RRULE simplifiée + exceptions) | `daily`/`monthly` ne couvre pas les usages réels | Moy. | Élevée | Couverture |
| Widget / raccourci de saisie rapide | Le coût de saisie détermine l'usage quotidien d'un tracker | Faible | Moy. | Rétention |

### 4.2 Technique

| Amélioration | Justification | Prio | Diff. |
|---|---|---|---|
| `golden.json` branché sur Vitest | Transforme une documentation en garde-fou exécutable | **Critique** | Faible |
| Jetons extraits, pas écrits (**D3**) | Supprime la classe entière des dérives visuelles | **Critique** | Faible |
| Dexie + dépôts typés + migrations numérotées | Lève le plafond de 5 Mo, apporte transactions et index | Critique | Moy. |
| Cache dérivé incrémental par `(habitId)` / `(date)` | `bestStreak` balaie 366 j × N habitudes ; l'invalidation globale ne tient pas à 200 habitudes | Haute | Moy. |
| Rendu statique des routes (**D12**) | 0 invocation serverless, latence CDN, coût structurellement nul | Haute | Faible |
| `deletedAt` + `updatedAt` sur toutes les entités | Évite une migration de données en phase Neon | Haute | Faible |
| `exactOptionalPropertyTypes: true` | Un modèle destiné à la synchronisation ne tolère pas `undefined` implicite | Moy. | Moy. |

### 4.3 UX / UI

| Amélioration | Justification | Prio |
|---|---|---|
| Sélecteur de thème réel (3 thèmes livrés, 0 activable) | Le produit annonce trois thèmes et n'en sert qu'un, figé | Haute |
| Sélecteur de langue réel (**D6**) | 311 clés traduites, aucune atteignable | Haute |
| États vides, chargement, erreur sur les 11 vues | Aucun écran blanc possible | Haute |
| Heatmap qui **se réorganise** au lieu de défiler sous 768 px | Dernier point responsive ouvert de l'audit d'origine | Moy. |
| Toasts annulables (`snapshot` + `notify` portés en middleware) | Le prototype le fait déjà ; ne pas régresser | Haute |
| Palette ⌘K et mode zen | Différenciateur réel face aux concurrents mobiles | Moy. |

### 4.4 Sécurité

| Mesure | Détail | Prio |
|---|---|---|
| En-têtes HTTP | CSP stricte (`default-src 'self'`), HSTS, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` minimal | **Haute** |
| Suppression de l'appel Google Fonts | Auto-hébergement via `next/font` : conformité RGPD **et** vraie promesse hors-ligne | **Haute** |
| Validation d'import par zod | L'import est le point où le projet a **déjà** perdu des données | **Haute** |
| Aucun `dangerouslySetInnerHTML` | À imposer par règle ESLint, pas par vigilance | Haute |
| Dependabot + CodeQL + `npm audit` en CI | 4 vulnérabilités présentes dès aujourd'hui (**D11**) | Haute |
| CI durcie (`permissions: contents: read`, SHA épinglés) | Un workflow est du code exécuté avec un jeton | Haute |
| Secrets : aucun aujourd'hui, `gitleaks` en CI dès Neon | Anticipe la phase 6 | Moy. |
| Politique de confidentialité | « Vos données restent sur votre appareil » doit être écrit et opposable | Haute |

> **Point fort de sécurité :** le prototype ne contient **ni `innerHTML`, ni `eval`, ni `new Function`**
> (vérifié : 0 occurrence). La surface d'injection est nulle. À préserver au portage.

### 4.5 Performance

| Mesure | Gain attendu | Prio |
|---|---|---|
| Routes statiques (**D12**) | TTFB CDN au lieu d'un cold start de fonction | Haute |
| Polices auto-hébergées + `display: swap` + préchargement | Supprime une requête tierce bloquante, corrige le FOUT | Haute |
| Cache dérivé incrémental | `bestStreak` = 366 j × N habitudes à chaque coche aujourd'hui | Haute |
| Virtualisation des listes | 200 habitudes × 365 j : interaction < 100 ms | Moy. |
| Heatmap `<canvas>` au-delà de 400 cellules | Décision déjà instruite (182 et 84 cellules : le DOM suffit) | Faible |
| Budget Lighthouse en CI | Empêche la régression silencieuse | Moy. |
| Bundle actuel : **103 kB First Load JS** | Excellent point de départ — à tenir sous 150 kB avec les 11 vues | — |

### 4.6 SEO

**Constat structurant : l'application n'est pas un actif SEO.** C'est un outil privé, sans contenu
public, derrière aucune URL indexable utile. Tout le SEO se joue sur une **vitrine** qui n'existe
aujourd'hui qu'en prototype HTML non intégré.

| Mesure | Prio |
|---|---|
| Construire la vitrine (`/`) en Next.js statique : proposition de valeur, captures, FAQ, comparatifs | **Haute** |
| `metadataBase`, Open Graph, Twitter Card, canonique, `alternates.languages` FR/EN | Haute |
| `robots.txt` + `sitemap.xml` générés (`app/robots.ts`, `app/sitemap.ts`) | Haute |
| `noindex` sur l'application elle-même (`/today`, `/habits`…) — déjà fait pour `/prototype` | Haute |
| JSON-LD `SoftwareApplication` (prix 0, plateforme web, langue) | Moy. |
| Contenu de fond : « suivi d'habitudes sans compte », « alternative libre à HabitNow », « RGPD » | Moy. |
| Icônes et favicon complets (aujourd'hui : aucun) | Haute |

### 4.7 Accessibilité

| Mesure | Prio |
|---|---|
| Audit de contraste WCAG AA sur les 3 thèmes — `--mut` de `plasma` est **documenté comme sous AA** | Haute |
| Lien d'évitement, `aria-current="page"`, région live pour les toasts | Haute |
| Alternative clavier au glisser-déposer du calendrier (obligatoire, pas optionnelle) | Haute |
| Cibles tactiles ≥ 44 px, respect de `prefers-reduced-motion` (déjà en place dans `globals.css`) | Moy. |
| Test lecteur d'écran sur 3 parcours + `@axe-core/playwright` en CI | Moy. |
| Curseur personnalisé désactivé par défaut (déjà tranché dans le prototype) | Faible |

### 4.8 Monitoring

**La tension est réelle et doit être tranchée par écrit :** un produit qui promet que rien ne sort
de l'appareil ne peut pas installer une télémétrie par défaut.

| Option | Coût | Compatible avec la promesse ? |
|---|---|---|
| `error.tsx` + journal **local** consultable dans les réglages | 0 € | ✅ — recommandé par défaut |
| Sentry plan gratuit, **opt-in explicite**, sans PII | 0 € | ⚠️ acceptable si l'utilisateur l'active |
| Vercel Web Analytics (Hobby) | 0 € | ⚠️ mesure d'audience, pas d'usage — acceptable sur la **vitrine seule** |
| Umami auto-hébergé | 0 € (hébergement à trouver) | ✅ sur la vitrine |
| Health check GitHub Actions (cron, URL de production) | 0 € | ✅ |
| Statut de build/déploiement : notifications Vercel + GitHub | 0 € | ✅ |

**Recommandation :** journal d'erreur local par défaut · analytique **uniquement sur la vitrine** ·
Sentry opt-in derrière un interrupteur clair, jamais activé sans geste de l'utilisateur.

### 4.9 Scalabilité

Le produit est mono-utilisateur et local : la scalabilité **n'est pas un enjeu serveur** tant que
la phase 6 n'est pas livrée. Les vrais axes :

| Axe | Enjeu | Parade |
|---|---|---|
| Volume de données par utilisateur | 5 ans × 20 habitudes ≈ 36 500 entrées de journal | IndexedDB + index `[habitId+date]` + cache dérivé |
| Rendu | 200 habitudes × heatmap 6 mois | Virtualisation + invalidation fine |
| Trafic vitrine | Pic de lancement | Statique + CDN = illimité à coût nul |
| Synchronisation (phase 6) | Neon free : autosuspend, connexions limitées | Driver serverless HTTP, journal `logs` **append-only**, écritures groupées |
| Équipe | Un contributeur aujourd'hui | CI verte, ADR, CHANGELOG : déjà en place |

**Fiche section 4** — *Analyse* : 9 axes, tous instruits, aucun ne requiert de brique payante. · *Recommandations* : sécurité et performance sont quasi gratuites (1 j) ; SEO exige de construire la vitrine. · *Priorité* **Haute** · *Difficulté* **Moyenne** · *Impact métier* **Élevé** · *Risques* : la tension monitoring ↔ promesse local-first doit être tranchée par écrit, pas subie. · *Livrables* : ADR-0006 « télémétrie », `next.config.mjs` avec `headers()`, vitrine.

---

## 5. Roadmap

> Hypothèse : **1 ETP**. Les charges sont en jours-personne. Le chemin critique passe par les
> données (C8) puis les vues (C13) — pas par la sécurité ni le DevOps, qui se font en parallèle.

### Phase 1 — Stabilisation · 4 j · 🔴 Critique

| Livrable | Réf | Sortie |
|---|---|---|
| Chaîne de vérification verte | D1, D13, D18 | `npm run verify` (typecheck + lint + messages + test + **build** + **format**) vert |
| Jetons de design conformes au prototype | **D3** | 16 jetons × 3 thèmes extraits, non écrits |
| `golden.json` branché sur Vitest | **D4** | 62/62 valeurs vérifiées à chaque commit |
| Documentation corrigée | D5, D20, D21, D22 | `03-ARCHITECTURE` (7 types, Neon), README, `tests/README`, ADR-0002, backlog sans `src/` |
| Modèle complété | D14, D15 | `Profile`, `Shop`, `deletedAt`, `createdAt`/`updatedAt` partout, `startOfWeek` |
| Bug `every` corrigé des deux côtés | D16 | Domaine + prototype + extrait régénéré |
| Prettier passé, `next-env.d.ts` ignoré | D13, D18 | 30 fichiers formatés |

**Critère d'arrêt :** `npm run verify` vert, 62/62 valeurs de référence conformes, aucun document contredit par le code.

### Phase 2 — Finalisation produit · 32 j · 🔴 Critique

| Lot | Contenu | Charge |
|---|---|---|
| 2.1 Données | Dexie 8 tables, index `[habitId+date]`, dépôts typés, migrations numérotées, importeur zod + rapport, **seed démo / compte vierge séparés** | 6,5 j |
| 2.2 État & coque | Zustand en tranches, middleware d'annulation, rail 3 groupes, mode zen, palette ⌘K, barre basse mobile | 4 j |
| 2.3 Système visuel | 10 primitives UI, polices `next/font`, icônes Lucide, sélecteur de thème, **i18n branché partout** | 5 j |
| 2.4 Les 11 vues | `today` → `habits` → `dash` → `tasks` → `stats` → `goals` → `calendar` → `timer` → `notes` → `settings` → `profile` | 15 j |
| 2.5 Gestion d'erreurs | `error.tsx`, `global-error.tsx`, `loading.tsx`, états vides, validation métier zod sur tous les formulaires | 1,5 j |

**Critère d'arrêt par vue :** mêmes chiffres que le prototype **à la même date figée**, capture comparée à la référence.

### Phase 3 — DevOps · 3 j · 🟠 Haute *(à démarrer dès la phase 1)*

| Livrable | Détail |
|---|---|
| Dépôt GitHub | `git init`, `main` protégée (PR obligatoire, CI verte requise, pas de force-push), `.gitattributes` (`* text=auto eol=lf`) |
| Issues & jalons | 28 défauts + 77 tâches importées, 8 jalons alignés sur les phases, labels `prio:*` / `phase:*` |
| CI durcie | `permissions: contents: read`, actions épinglées par SHA, `concurrency` avec annulation, matrice Node 20/22, cache Playwright, job **e2e**, `npm audit --audit-level=high` |
| Qualité automatisée | Dependabot (npm + actions, hebdo), CodeQL, `@axe-core/playwright`, Lighthouse CI avec budget |
| Variables d'environnement | `.env.example` déjà propre ; validation zod dans `lib/env.ts` ; **aucune variable requise** pour lancer |
| Sécurisation | En-têtes dans `next.config.mjs` (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy), `SECURITY.md`, `gitleaks` |
| Documentation dépôt | `CONTRIBUTING.md`, templates d'issue, `CODEOWNERS`, `CHANGELOG` alimenté à chaque PR |

### Phase 4 — Infrastructure · 2 j · 🟠 Haute

| Livrable | Détail | Coût |
|---|---|---|
| Vercel | Import du dépôt, framework auto-détecté, **aucune variable requise**, préversion par PR, production sur `main` | 0 € |
| Rendu statique | Neutraliser la dynamique induite par `cookies()` (**D12**) → CDN, 0 invocation | 0 € |
| Domaine | Domaine personnalisé + HTTPS automatique | ~10 €/an (seul poste non nul, facultatif) |
| PWA | Manifeste, icônes 192/512/maskable, service worker Serwist, offline total | 0 € |
| Sauvegardes | **Rien à sauvegarder côté serveur** — l'utilisateur exporte. Rappel périodique + garde-fou anti-perte | 0 € |
| Monitoring | `error.tsx` + journal local ; health check cron GitHub Actions ; notifications de déploiement | 0 € |
| Logs | Vercel Runtime Logs (rétention courte en Hobby) — suffisant, il n'y a pas de logique serveur | 0 € |
| **Neon** | **Non provisionné à ce stade** — voir § Plan Neon | 0 € |

### Phase 5 — Qualité · 5 j · 🟠 Haute

| Livrable | Détail |
|---|---|
| Tests utilisateurs | 5 personnes, 3 parcours (première ouverture, une semaine de suivi, export/import) ; mesurer le temps de première habitude créée |
| Tests de charge | Sans objet côté serveur. **À la place** : jeu de 200 habitudes × 3 ans, interaction < 100 ms, ouverture < 1,5 s |
| Audit sécurité | Revue OWASP côté client (XSS, stockage, CSP), `npm audit` à zéro haute, revue des en-têtes, revue de la politique de confidentialité |
| Audit SEO | Lighthouse SEO 100 sur la vitrine, Search Console, données structurées validées, `noindex` vérifié sur l'app |
| Accessibilité | axe sans violation critique, 3 parcours au lecteur d'écran, contraste AA sur les 3 thèmes |
| Recette | `RECETTE.md` : 11 vues × 3 thèmes × 2 langues + 8 parcours + 4 paliers responsive |

### Phase 6 — Lancement · 2 j · 🟠 Haute

| Étape | Détail |
|---|---|
| Mise en production | Tag `v1.0.0`, release GitHub avec notes générées, promotion Vercel |
| Vérifications post-déploiement | Les 11 routes en 200, PWA installable, offline effectif, export/import aller-retour, FR↔EN, 3 thèmes, en-têtes présents (`securityheaders.com`), Lighthouse ≥ budget |
| Gestion d'incidents | Runbook : rollback Vercel en 1 clic (déploiement précédent), critère de gravité, canal de signalement (issues GitHub), engagement de délai |
| Communication | Vitrine en ligne, Product Hunt / Reddit / Hacker News, `README` public soigné |

### Chronologie

```
Sem. 1   ██ Phase 1 (stabilisation)   ▒▒ Phase 3 (DevOps, en parallèle)
Sem. 2-3 ████ Phase 2.1 données · 2.2 état & coque
Sem. 4-6 ██████ Phase 2.4 les 11 vues
Sem. 7   ██ Phase 2.5 + Phase 4 (infra, PWA)
Sem. 8   ██ Phase 5 (qualité)
Sem. 9   █ Phase 6 (lancement)                                  → v1.0
```

**Total : 46–48 j-p ≈ 9 semaines à 1 ETP**, cohérent avec l'estimation d'origine (16–21 j) **augmentée**
de ce que celle-ci n'avait pas compté : la couche de données complète, l'i18n réellement branchée,
la sécurité, la PWA, la vitrine et la reprise des 28 défauts.

**Fiche section 5** — *Analyse* : 6 phases, chemin critique données → vues. · *Recommandations* : DevOps en parallèle de la phase 1, jamais après. · *Priorité* **Critique** · *Difficulté* **Moyenne** · *Impact métier* **Décisif** · *Risques* : sous-estimer les vues (55 % de la charge) et le portage visuel. · *Livrables* : 8 jalons GitHub, une release par phase.

---

## 6. Commercialisation

### 6.1 Positionnement

> **Habitum — le suivi d'habitudes qui ne vous demande pas de compte.**
> Vos données restent sur votre appareil. Gratuit, sans publicité, sans traqueur, en français.

Trois axes différenciants, tous **vérifiables** (pas des promesses marketing) :

1. **Confidentialité par construction** — pas de compte, pas de serveur, pas de télémétrie. Vérifiable : le code est ouvert, l'onglet réseau est vide.
2. **Profondeur du modèle** — 7 types d'habitude (`check`, `count`, `time`, `total`, `list`, `limit`, `exact`) et 3 types d'objectif (`cumul`, `milestones`, `reduce`). Les concurrents grand public en proposent 2 à 4. Le type `limit` (plafond à ne pas dépasser) couvre les **habitudes à réduire**, mal servies ailleurs.
3. **Focus intégré** — timer 4 modes qui crédite automatiquement l'habitude liée. Ailleurs, c'est une seconde application.

### 6.2 Clients cibles

| Segment | Besoin | Pourquoi Habitum | Taille |
|---|---|---|---|
| **Soucieux de leur vie privée** (dev, juristes, santé, secteur public) | Un tracker qui n'exfiltre rien | Le seul argument qui compte, et il est structurel | Niche, mais très prescriptrice |
| **Francophones mal servis** | Applications anglophones ou mal traduites | FR natif, pas traduit après coup | Large |
| **Réduction d'habitudes** (alcool, écrans, tabac) | Suivi de plafond, pas d'objectif à atteindre | Types `limit` et `reduce` de premier ordre | Segment à forte intention |
| **Étudiants / travailleurs du savoir** | Habitudes + tâches + pomodoro **au même endroit** | Trois outils en un | Large |
| **Utilisateurs hors ligne** (déplacements, faible connectivité) | Fonctionne sans réseau | PWA offline totale | Transversal |

### 6.3 Proposition de valeur

| Douleur | Réponse Habitum |
|---|---|
| « Je ne veux pas créer un énième compte » | Aucun compte, aucun e-mail, ouverture immédiate |
| « Mes données de santé partent où ? » | Nulle part. IndexedDB, sur votre appareil |
| « Version gratuite bridée à 3 habitudes » | Tout est gratuit, sans limite, sans publicité |
| « Je ne peux pas suivre ce que je veux *réduire* » | Type `limit` : réussi si vous restez **sous** le seuil |
| « Mes séries me culpabilisent » | Le jour en cours ne casse jamais la série ; pauses planifiables |
| « Je perdrais tout en changeant de téléphone » | Export/import JSON, rappel de sauvegarde, sync optionnelle en option |

### 6.4 Tarification — **et la tension à trancher**

**Il faut le dire franchement : « local-first, sans compte, gratuit » et « SaaS par abonnement » sont
structurellement incompatibles.** Pas de compte = pas de facturation récurrente ; pas de serveur =
pas de coût variable à répercuter ; pas de télémétrie = pas de mesure d'activation. Ce n'est pas un
problème à résoudre par une astuce de pricing, c'est un arbitrage produit.

| Modèle | Compatible ? | Revenu réaliste | Recommandation |
|---|---|---|---|
| **Gratuit total + dons** (GitHub Sponsors, Liberapay, Ko-fi) | ✅ parfaitement | Faible mais non nul | **Retenu pour le lancement** |
| **Sync optionnelle payante** (Neon + Auth) | ✅ — on paie pour un service qui, lui, a un coût | 2–4 €/mois, conversion 2–5 % | **Retenu en v1.1**, honnête : on facture le seul poste qui coûte |
| **Achat unique** (version desktop Tauri, ou déblocage à vie) | ✅ cohérent avec « pas d'abonnement » | 5–15 € une fois | Envisageable en v1.2 |
| **Thèmes / fonctions cosmétiques payants** | ✅ | Marginal | Non prioritaire |
| Abonnement classique | ❌ contredit la promesse | — | À écarter |
| Publicité / revente de données | ❌❌ détruit la proposition de valeur | — | **Jamais** |

> ⚠️ **Contrainte à vérifier avant toute monétisation :** le plan **Vercel Hobby est réservé aux
> usages non commerciaux**. Dès qu'Habitum encaisse (même des dons liés au produit), il faut soit
> Vercel Pro (~20 $/mois), soit basculer sur **Cloudflare Pages**, dont le plan gratuit autorise
> l'usage commercial. **Cette décision doit être prise avant le lancement, pas après.**

### 6.5 Acquisition

| Canal | Coût | Effort | Rendement attendu | Priorité |
|---|---|---|---|---|
| **GitHub public + README soigné** | 0 € | Faible | Le dépôt **est** un canal : « open source » est l'argument | **1** |
| **SEO de la vitrine** (« suivi d'habitudes sans compte », « alternative HabitNow », « RGPD ») | 0 € | Moyen | Trafic durable, intention forte | **1** |
| **Reddit** (r/selfhosted, r/privacy, r/degoogle, r/france, r/productivity) | 0 € | Faible | Audience exactement alignée | **2** |
| **Hacker News / Lobsters** — « Show HN » | 0 € | Faible | Pic + crédibilité technique | 2 |
| **Product Hunt** | 0 € | Moyen | Pic ponctuel, peu de rétention | 3 |
| **AlternativeTo, Privacy Guides, Awesome-*, F-Droid-like** | 0 € | Faible | **Trafic de long terme, très qualifié** | **2** |
| **Article de fond** (« pourquoi votre tracker d'habitudes n'a pas besoin de serveur ») | 0 € | Moyen | Autorité + backlinks | 3 |
| Publicité payante | ≠ 0 € | — | — | **Écarté** |

### 6.6 SEO — plan concret

| Action | Cible |
|---|---|
| Vitrine statique bilingue avec `alternates.languages` FR/EN | Indexation des deux marchés |
| Pages de comparaison : « Habitum vs HabitNow », « vs Habitica », « vs Streaks » | Requêtes à forte intention |
| Pages thématiques : arrêter l'alcool, réduire les écrans, méthode pomodoro | Longue traîne |
| JSON-LD `SoftwareApplication` (`offers.price = 0`) | Rich snippet |
| `robots.txt` + `sitemap.xml` ; **`noindex` sur l'application** | Ne pas diluer le budget de crawl |
| Backlinks : AlternativeTo, Privacy Guides, awesome-lists, annuaires PWA | Autorité |
| Core Web Vitals au vert (statique + CDN) | Facteur de classement direct |

### 6.7 Réseaux sociaux & partenariats

- **Réseaux :** un journal de construction (« build in public ») sur Mastodon/Bluesky/X — cohérent avec un projet ouvert et peu coûteux. Pas de calendrier éditorial lourd : le dépôt et le CHANGELOG **sont** le contenu.
- **Partenariats naturels et gratuits :** associations de protection des données (CNIL-adjacent, La Quadrature), communautés d'addictologie et de sobriété, communautés étudiantes francophones, annuaires d'applications respectueuses de la vie privée, projets open source voisins (agrégateurs de PWA).

### 6.8 KPI

| KPI | Cible v1.0 | Mesurable **sans trahir la promesse** ? |
|---|---|---|
| Visiteurs uniques vitrine | 2 000 / mois à M+3 | ✅ analytique sur la vitrine seulement |
| Taux d'installation PWA | > 8 % des visiteurs | ✅ événement vitrine |
| Étoiles GitHub | 300 à M+6 | ✅ public |
| Rétention J7 / J30 | 40 % / 20 % | ⚠️ **non mesurable sans télémétrie** — à estimer par enquête volontaire |
| Habitudes créées à la première session | ≥ 3 | ⚠️ idem |
| Dons / sponsors | 10 sponsors à M+6 | ✅ |
| Conversion sync payante (v1.1) | 3 % | ✅ (le service a des comptes) |

> **À assumer :** le refus de la télémétrie **coûte la mesure produit**. C'est un choix légitime, mais
> il faut le compenser par des enquêtes volontaires et un canal de retour utilisateur visible,
> sinon on pilote à l'aveugle.

**Fiche section 6** — *Analyse* : positionnement fort et défendable, monétisation structurellement contrainte. · *Recommandations* : gratuit + dons au lancement, sync payante en v1.1, trancher Vercel/Cloudflare **avant** d'encaisser. · *Priorité* **Moyenne** (post-v1.0) · *Difficulté* **Moyenne** · *Impact métier* **Élevé** · *Risques* : Hobby non commercial ; pilotage à l'aveugle faute de mesure. · *Livrables* : vitrine, ADR « modèle économique », dossier de presse, 5 pages SEO.

---

## 7. Vision long terme

### 7.1 Évolutions

| Horizon | Évolution | Valeur |
|---|---|---|
| v1.1 | **Synchronisation multi-appareils** (Neon + Auth.js), chiffrée de bout en bout côté client | Lève le frein n° 1 : « et si je change de téléphone ? » |
| v1.2 | **Application desktop** (Tauri, MIT) — mêmes sources, ~5 Mo | Nouveau canal, achat unique possible |
| v1.3 | **Import depuis les concurrents** (HabitNow, Loop, Habitica, Streaks) | Supprime le coût de changement |
| v1.4 | **Analyse locale** : corrélations habitude ↔ humeur, meilleurs jours, prédiction de rupture de série | Différenciateur fort, **100 % sur l'appareil** |
| v2.0 | **API de plugins locale** : intégrations santé, calendrier, domotique, sans passer par un serveur | Écosystème sans coût d'exploitation |
| v2.x | **Groupes privés** (défis entre proches, pair-à-pair chiffré) | Social sans surveillance |

### 7.2 Fonctionnalités premium — *honnêtes*

Règle : **on ne facture que ce qui coûte, ou ce qui dépasse l'usage personnel.** Jamais une
limitation artificielle du produit de base.

| Premium candidate | Justification | Modèle |
|---|---|---|
| Synchronisation multi-appareils | Coût serveur réel (Neon, calcul, stockage) | 2–4 €/mois |
| Sauvegarde chiffrée hébergée | Coût de stockage réel | Inclus dans la sync |
| Application desktop | Effort de portage et de signature | Achat unique |
| Thèmes supplémentaires | Aucun coût — cosmétique assumé | Achat unique symbolique |
| **Toutes les fonctions de suivi** | — | **Gratuites à jamais.** Non négociable : c'est le contrat de confiance |

### 7.3 Internationalisation

Le socle est bon : catalogue externalisé, 311 clés, symétrie imposée en CI, contenu utilisateur
**non bilingue** (l'i18n ne concerne que l'UI) — décision juste, déjà prise.

| Étape | Effort |
|---|---|
| Brancher réellement FR/EN (**D6**) | 2 j — **prérequis à tout le reste** |
| ES, DE, PT, IT (contributions communautaires via le dépôt public) | Faible, `check:messages` protège la symétrie |
| Formats localisés (dates, nombres, début de semaine) | Moyen — dépend de `startOfWeek` (**D15**) |
| RTL (AR, HE) | Élevé — logique CSS à revoir |
| URL localisées pour la **vitrine** (`localePrefix: 'always'`) | Faible — nécessaire au SEO international ; l'app reste sur cookie, comme décidé |

### 7.4 Scalabilité long terme

| Dimension | Plafond | Parade |
|---|---|---|
| Données par utilisateur | IndexedDB : plusieurs Go, largement au-delà de 10 ans d'usage | Index composites + cache dérivé |
| Trafic vitrine | Illimité en statique + CDN | Coût nul quel que soit le volume |
| Utilisateurs sans sync | **Illimité** — chaque utilisateur porte son propre coût de calcul | Le modèle local-first est nativement scalable |
| Utilisateurs avec sync | Neon free : ~0,5 Go, autosuspend, connexions limitées | Journal append-only, écritures groupées, montée de plan **financée par les abonnements** |
| Maintenance | Un contributeur | CI, ADR, CHANGELOG, `golden.json` : la reprise est documentée |

### 7.5 Monétisation — projection prudente

| Horizon | Utilisateurs actifs | Revenu mensuel | Coût mensuel | Marge |
|---|---|---|---|---|
| M+6 (v1.0, gratuit) | 500 | ~30 € (dons) | ~1 € (domaine) | +29 € |
| M+12 (v1.1, sync) | 3 000 | ~200 € (3 % × 2,5 €) + dons | ~25 € (Vercel Pro + Neon) | +175 € |
| M+24 (v1.2, desktop) | 10 000 | ~800 € | ~90 € | +710 € |

> Projection **délibérément prudente**. L'intérêt du modèle n'est pas le chiffre : c'est que
> **le coût reste proportionnel aux revenus** et jamais l'inverse. Un utilisateur gratuit coûte
> structurellement 0 €.

**Fiche section 7** — *Analyse* : trajectoire cohérente, coût toujours indexé sur le revenu. · *Recommandations* : ne jamais brider les fonctions de suivi ; ne facturer que le coût réel. · *Priorité* **Faible** (post-lancement) · *Difficulté* **Élevée** (sync chiffrée) · *Impact métier* **Élevé** · *Risques* : la sync casse l'argument « rien ne sort » — d'où le chiffrement de bout en bout côté client, **non négociable**. · *Livrables* : ADR « synchronisation chiffrée », schéma Neon, plan tarifaire.

---

# LIVRABLES FINAUX

## 1. Tableau d'avancement

| Domaine | Poids | Avancement | Reste |
|---|---:|---:|---|
| Spécifications & documentation | 8 % | **90 %** | Corriger D5, D20, D21, D22 |
| Moteur métier (`lib/domain/`) | 12 % | **70 %** | `perfectDays`, `habitScore`, `recurrence`, cache, `startOfWeek` |
| Tests | 10 % | **25 %** | golden.json non branché, 9 cas / 40, e2e non exécutable |
| Persistance (Dexie, dépôts, migrations, import) | 12 % | **3 %** | Tout, sauf 4 validateurs |
| État (Zustand, annulation) | 6 % | **0 %** | Tout |
| Design system (jetons, primitives, icônes) | 8 % | **10 %** | Jetons **faux**, 0 primitive |
| **Les 11 vues** | **20 %** | **0 %** | Tout — 55 % de la charge restante |
| i18n | 4 % | **45 %** | Catalogue ✅, plomberie ✅, **usage 0** |
| PWA / hors-ligne | 4 % | **0 %** | Manifeste, icônes, service worker |
| Notifications / son / vibration | 3 % | **0 %** | Tout |
| Accessibilité | 4 % | **5 %** | `prefers-reduced-motion` + `:focus-visible` seulement |
| Sécurité & confidentialité | 3 % | **15 %** | Aucun en-tête, aucune politique |
| SEO / vitrine | 2 % | **5 %** | Vitrine non intégrée |
| DevOps (Git, CI/CD) | 3 % | **20 %** | Fichier CI ✅, **dépôt inexistant** |
| Infrastructure (Vercel, Neon, monitoring) | 1 % | **0 %** | Rien de provisionné |
| **TOTAL PONDÉRÉ** | **100 %** | **≈ 22 %** | **≈ 46–48 j-p** |

```
Documentation   ██████████████████░░  90 %
Moteur métier   ██████████████░░░░░░  70 %
i18n            █████████░░░░░░░░░░░  45 %
Tests           █████░░░░░░░░░░░░░░░  25 %
DevOps          ████░░░░░░░░░░░░░░░░  20 %
Sécurité        ███░░░░░░░░░░░░░░░░░  15 %
Design system   ██░░░░░░░░░░░░░░░░░░  10 %
Persistance     ░░░░░░░░░░░░░░░░░░░░   3 %
Les 11 vues     ░░░░░░░░░░░░░░░░░░░░   0 %
────────────────────────────────────────────
GLOBAL          ████░░░░░░░░░░░░░░░░  22 %
```

## 2. Checklist complète jusqu'à la mise en production

### 🔴 Bloquants
- [ ] `app-shell.tsx:6` : `'Aujourd'hui'` → `"Aujourd'hui"` — **D1**
- [ ] `npm run verify` vert de bout en bout
- [ ] `git init` + dépôt GitHub + `main` protégée — **D2**
- [ ] `styles/tokens.css` **régénéré par extraction** du prototype (16 jetons × 3 thèmes) — **D3**
- [ ] `03-ARCHITECTURE.md` § 3–4 corrigé : **7 types d'habitude, 3 types d'objectif** — **D5**
- [ ] `golden.json` branché sur Vitest, 62/62 vérifiées à chaque commit — **D4**

### 🟠 Socle technique
- [ ] `build` + `format:check` ajoutés à `verify` ; `next-env.d.ts` ignoré par ESLint — D13, D18
- [ ] Modèle complété : `Profile`, `Shop`, `deletedAt`, `createdAt`/`updatedAt` partout — D14
- [ ] `startOfWeek(weekStart)` implémenté, `Settings.weekStart` fonctionnel — D15
- [ ] Bug `every` sans `start` corrigé (domaine **et** prototype, extrait régénéré) — D16
- [ ] `date-fns` : utilisée ou retirée — D17
- [ ] Schéma Dexie 8 tables + index `[habitId+date]` + dépôts typés + migrations numérotées
- [ ] Importeur zod du format prototype + rapport d'import
- [ ] Seed démo / compte vierge strictement séparés — B4
- [ ] Store Zustand + middleware d'annulation
- [ ] Couverture ≥ 40 cas, seuil ≥ 90 % sur `lib/domain` en CI — D19

### 🟠 Produit
- [ ] 10 primitives UI sur les jetons corrigés
- [ ] Polices `next/font` auto-hébergées — D7
- [ ] Appel Google Fonts supprimé du prototype — D8
- [ ] `useTranslations` branché dans **tous** les composants + sélecteur de langue — D6
- [ ] Sélecteur de thème réel (3 thèmes) — D26
- [ ] Coque : rail, en-tête, mode zen, palette ⌘K, barre basse mobile
- [ ] Les 11 vues portées, chiffres identiques à date figée
- [ ] `error.tsx`, `global-error.tsx`, `loading.tsx`, états vides — D10
- [ ] Timer persistant (`startedAt` + `accumulatedMs`) — B5
- [ ] Notifications / son / vibration réels **ou interrupteurs retirés**
- [ ] Onboarding 3 écrans, compte vierge par défaut
- [ ] PWA : manifeste, icônes, service worker, offline total — D25

### 🟠 Sécurité & conformité
- [ ] En-têtes : CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy — D9
- [ ] `npm audit` sans vulnérabilité haute — D11
- [ ] Dependabot + CodeQL + `gitleaks` en CI
- [ ] Règle ESLint interdisant `dangerouslySetInnerHTML`
- [ ] `SECURITY.md`, politique de confidentialité, mentions légales — D27
- [ ] CI durcie : `permissions`, SHA épinglés, `concurrency` — D24

### 🟠 Qualité
- [ ] 8 parcours Playwright + job e2e en CI
- [ ] Aucun débordement horizontal à 390 / 768 / 1060 / 1440 px
- [ ] Contraste WCAG AA sur les 3 thèmes (`--mut` de `plasma`)
- [ ] axe sans violation critique ; 3 parcours au lecteur d'écran
- [ ] Lighthouse ≥ 95 / ≥ 95 / 100 / 100 avec budget en CI
- [ ] Non-régression visuelle contre les 11 captures de référence
- [ ] `RECETTE.md` passée intégralement

### 🟠 Infrastructure & lancement
- [ ] Routes rendues statiques (0 invocation serverless) — **D12**
- [ ] Vercel branché : préversion par PR, production sur `main`
- [ ] **Décision tranchée : Vercel Hobby (non commercial) ou Cloudflare Pages**
- [ ] Domaine + HTTPS
- [ ] Vitrine SEO en ligne (`robots.txt`, `sitemap.xml`, OG, JSON-LD, `noindex` sur l'app) — D28
- [ ] Health check cron + notifications de déploiement
- [ ] `CHANGELOG.md` à jour, tag `v1.0.0`, release GitHub
- [ ] Runbook d'incident + procédure de rollback
- [ ] Vérifications post-déploiement passées

### 🟢 Post-lancement
- [ ] Montées `next@16`, `next-intl@4` — D11
- [ ] `exactOptionalPropertyTypes: true` — D23
- [ ] Backlog réaligné sur l'arborescence réelle — D21
- [ ] Neon + sync chiffrée (v1.1, **optionnel**)

## 3. Top 10 des actions prioritaires

| # | Action | Réf | Charge | Pourquoi maintenant |
|---|---|---|---|---|
| **1** | Corriger l'apostrophe de `app-shell.tsx` | D1 | **5 min** | Un caractère sépare le dépôt d'une chaîne verte. Vérifié : après correction, `build` produit 14 pages |
| **2** | `git init` + GitHub + `main` protégée | D2 | 1 h | Sans versionnement, **aucune** des autres actions n'est traçable, ni révocable, ni déployable |
| **3** | **Régénérer `styles/tokens.css` par extraction** | D3 | 2 h | Le seul défaut dont le coût **croît avec l'avancement**. Après 11 vues, c'est une refonte CSS complète |
| **4** | Corriger `03-ARCHITECTURE.md` : 7 types, pas 4 | D5 | 30 min | Le document qu'on lit en premier contient le bug qui a **déjà** détruit 4 habitudes sur 6 |
| **5** | Brancher `golden.json` sur Vitest | D4 | 4 h | L'oracle existe et ne protège rien. C'est la parade au risque n° 1 identifié par la passation |
| **6** | `build` + `format:check` dans `verify`, `next-env.d.ts` ignoré | D13, D18 | 1 h | La commande qui définit « terminé » ne vérifie pas ce que « terminé » veut dire |
| **7** | Compléter le modèle (`deletedAt`, `Profile`, `Shop`, horodatages) | D14, D15 | 2 h | Gratuit avant la première donnée écrite ; migration douloureuse après |
| **8** | En-têtes de sécurité + suppression de Google Fonts | D9, D8 | 4 h | Deux heures de travail, un risque RGPD levé et un audit sécurité passé |
| **9** | Couche Dexie + importeur + séparation démo/vierge | C8–C10 | 6,5 j | Chemin critique : **aucune vue** ne peut être portée sans données réelles |
| **10** | Brancher `useTranslations` + sélecteurs langue/thème | D6, D26 | 3 j | 311 clés et 3 thèmes livrés, zéro atteignable : le produit annonce ce qu'il ne fait pas |

> **Les 8 premières tiennent en une journée** et déplacent le projet de « ne compile pas » à
> « socle sain, versionné, sécurisé, protégé par son oracle ». C'est le meilleur rapport
> effort/valeur de tout le dossier.

## 4. Plan GitHub + Vercel + Neon

### GitHub

```bash
cd "d:/Projet/En cours/habitum"
git init -b main
printf '* text=auto eol=lf\n*.png binary\n*.webp binary\n' > .gitattributes
git add .
git commit -m "Habitum — base de reprise (portage Next.js 15, moteur métier testé)"
gh repo create habitum --public --source=. --push
```

| Élément | Configuration | Coût |
|---|---|---|
| Visibilité | **Public** — Actions illimitées, et l'ouverture est un argument commercial | 0 € |
| Protection de `main` | PR obligatoire, CI verte requise, pas de force-push, historique linéaire | 0 € |
| Issues | 28 défauts (`D1`…`D28`) + 77 tâches (`T0.1`…`T8.6`), labels `prio:critique\|haute\|moyenne\|faible`, `phase:0..6` | 0 € |
| Jalons | `v0.1 Socle` · `v0.2 Données` · `v0.3 Coque` · `v0.4 Vues` · `v0.5 Fiabilisation` · `v0.6 PWA` · `v0.9 Qualité` · `v1.0 Lancement` | 0 € |
| Projects (tableau) | Vue Kanban liée aux issues | 0 € |
| Releases | Tag semver + notes générées, une par phase | 0 € |
| Dependabot | npm + github-actions, hebdomadaire, groupé | 0 € |
| CodeQL | JS/TS, hebdomadaire + sur PR | 0 € |
| `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS`, templates d'issue | À créer | 0 € |

**CI durcie** (`.github/workflows/ci.yml`) :

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
permissions:
  contents: read                      # ← absent aujourd'hui (D24)
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true            # ← évite les runs redondants
jobs:
  verify:
    runs-on: ubuntu-latest
    strategy:
      matrix: { node: [20, 22] }      # ← Vercel construit en 22
    steps:
      - uses: actions/checkout@<sha>   # ← épingler par SHA
      - uses: actions/setup-node@<sha>
        with: { node-version: '${{ matrix.node }}', cache: npm }
      - run: npm ci
      - run: npm run verify            # typecheck + lint + messages + test + build + format
      - run: npm audit --audit-level=high
  e2e:                                 # ← absent aujourd'hui (D19)
    needs: verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: actions/setup-node@<sha>
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

Workflows additionnels, tous gratuits : `codeql.yml`, `lighthouse.yml` (budget), `release.yml`
(tag → release), `healthcheck.yml` (cron sur l'URL de production).

### Vercel

| Étape | Détail | Coût |
|---|---|---|
| 1 | « Add New… → Project », importer le dépôt GitHub | 0 € |
| 2 | Framework auto-détecté (Next.js). **Aucune variable d'environnement requise** | 0 € |
| 3 | `vercel.json` : région `cdg1`, `X-Robots-Tag: noindex` sur `/prototype/*` — **déjà en place** | 0 € |
| 4 | **Ajouter les en-têtes de sécurité** dans `next.config.mjs` (`headers()`), pas dans `vercel.json` | 0 € |
| 5 | Préversion par PR, production sur `main`, rollback en 1 clic | 0 € |
| 6 | **Rendre les routes statiques (D12)** → 0 invocation, servi par le CDN | 0 € |
| 7 | Domaine personnalisé + HTTPS automatique | ~10 €/an (facultatif) |

**Plan Hobby :** ~100 Go de bande passante/mois — sans commune mesure avec le besoin d'une PWA
statique. ⚠️ **Réservé aux usages non commerciaux.** Dès monétisation : Vercel Pro (~20 $/mois)
ou **Cloudflare Pages** (gratuit, usage commercial autorisé, bande passante illimitée). Le projet
est portable sans effort : rien dans le code n'est spécifique à Vercel.

### Neon PostgreSQL

> **Position d'architecte, à assumer :** dans l'état spécifié, **Habitum n'a pas besoin de base de
> données.** Provisionner Neon aujourd'hui ajouterait un composant sans usage, une chaîne de
> connexion à protéger et une contradiction avec la promesse « rien ne sort de l'appareil ».
> Neon devient pertinent — et alors, excellent — **le jour où la synchronisation multi-appareils
> est décidée (v1.1)**. Le dépôt est déjà prêt pour ce jour : `.env.example` porte les variables,
> et les entités portent `updatedAt` (il manque `deletedAt` — **D14**, à corriger maintenant).

**Le jour où c'est décidé :**

| Étape | Détail |
|---|---|
| 1 | Créer un projet Neon (plan gratuit) · région `eu-central-1` (proximité `cdg1`, et données en UE) |
| 2 | Deux branches Neon : `main` (production) et `dev` (préversions) — le branchement de base est natif chez Neon et gratuit |
| 3 | `DATABASE_URL` (pooled) + `DATABASE_URL_UNPOOLED` dans Vercel → Environment Variables, **jamais dans le dépôt** |
| 4 | **Drizzle ORM** (Apache-2.0) + `@neondatabase/serverless` (driver HTTP : pas de pool à gérer en serverless) — **pas Prisma** (plus lourd, et Accelerate est payant) |
| 5 | Schéma miroir : `users`, `habits`, `logs` (**append-only**), `tasks`, `goals`, `notes`, `sessions` · index `[user_id, habit_id, date]` · `updatedAt`/`deletedAt` sur tout |
| 6 | **RLS par `user_id`** — aucune donnée lisible par un autre compte |
| 7 | Auth.js (MIT) par lien magique — pas de mot de passe à stocker |
| 8 | **Chiffrement de bout en bout côté client** : le serveur stocke des octets opaques. C'est ce qui rend la sync compatible avec la promesse produit |
| 9 | Sauvegardes : `pg_dump` nocturne via GitHub Actions vers un artefact chiffré (le PITR du plan gratuit est court) |
| 10 | Maîtrise du coût : autosuspend activé, écritures groupées (pas une requête par coche), lecture locale d'abord |

**Coût :** 0 € sur le plan gratuit (~0,5 Go de stockage, compute plafonné) — largement suffisant
pour les premiers milliers d'utilisateurs synchronisés, le journal étant très compact.
Le passage au plan payant, s'il arrive, est **financé par les abonnements sync** : le seul poste
qui coûte est le seul poste facturé.

### Coût total d'exploitation

| Poste | Solution | v1.0 | v1.1 (sync) |
|---|---|---|---|
| Versionnement, CI, sécurité, releases | GitHub public | 0 € | 0 € |
| Hébergement, CD, préversions | Vercel Hobby *(ou Cloudflare Pages si commercial)* | 0 € | 0 € → 20 $ |
| Base de données | **aucune** → Neon free en v1.1 | 0 € | 0 € |
| Authentification | — → Auth.js auto-hébergé | 0 € | 0 € |
| Stockage utilisateur | IndexedDB (appareil) | 0 € | 0 € |
| Monitoring | `error.tsx` + journal local + cron GH | 0 € | 0 € |
| Analytique | vitrine seulement | 0 € | 0 € |
| Polices, icônes, UI | OFL / ISC / MIT auto-hébergés | 0 € | 0 € |
| Domaine *(facultatif)* | Registrar | ~10 €/an | ~10 €/an |
| **TOTAL** | | **0 €/mois** | **0 €/mois** |

## 5. Verdict final CTO

### Maturité

| Axe | Note | Commentaire |
|---|---|---|
| Conception & spécification | **A** | Rare à ce niveau : oracle exécutable, ADR, backlog de 77 tâches, pièges documentés |
| Qualité du moteur métier | **A−** | Porté fidèlement, vérifié fonction par fonction ; couverture insuffisante |
| État du code livrable | **D** | Ne compile pas ; 0 des 11 vues |
| Architecture technique | **B+** | Frontière de pureté imposée par outillage, choix i18n justifiés, dette d'anticipation modérée |
| Tests | **C** | 9 cas ; l'oracle de 62 valeurs n'est branché sur rien |
| Sécurité | **C−** | Aucune surface d'injection (bon) ; aucun en-tête, 3 vulnérabilités hautes, appel tiers non consenti |
| DevOps | **D+** | Bon fichier de CI, dans un dépôt qui n'existe pas |
| Accessibilité | **C** | Le prototype fait mieux que le portage |
| SEO / commercialisation | **D** | Non commencé, mais la stratégie est claire et peu coûteuse |
| Maîtrise des coûts | **A** | 0 € réellement instruit, licences vérifiées, aucune brique payante |
| **Global** | **C / 22 %** | **Fondations excellentes, exécution non commencée** |

### Blocages

| # | Blocage | Levée |
|---|---|---|
| 1 | **Le dépôt ne compile pas** (D1) | **5 minutes** |
| 2 | **Aucun versionnement** (D2) | 1 heure |
| 3 | **Jetons de design faux** (D3) | 2 heures — **et le coût double à chaque vue portée** |
| 4 | **Le document de référence contient un bug connu** (D5) | 30 minutes |
| 5 | **L'oracle n'est branché sur rien** (D4) | 4 heures |
| 6 | Aucune couche de données (C8) | 6,5 jours — chemin critique |
| 7 | Décision Vercel Hobby vs commercial | Une décision, à prendre avant le lancement |

**Aucun blocage n'est technique au sens fort.** Il n'y a ni impasse d'architecture, ni dépendance
introuvable, ni règle métier perdue. Ce sont des blocages d'exécution, tous levables — les cinq
premiers en **une seule journée**.

### Recommandations

**1. Faire les huit premières actions du Top 10 aujourd'hui.** Une journée fait passer le projet de
« ne compile pas, non versionné, jetons faux, oracle débranché » à « socle sain et protégé ». Aucun
autre investissement du dossier n'a ce rendement.

**2. Ne pas porter une seule vue avant que D3 et D4 soient réglés.** C'est la seule recommandation
que je qualifierais d'impérative. Les jetons faux et l'oracle débranché sont deux défauts
silencieux dont le coût de correction croît linéairement avec le nombre de vues portées. Porter
`today` avant de les régler, c'est accepter de la reporter.

**3. Traiter la documentation comme du code.** Ce dossier est un actif exceptionnel — et il contient
un bug (D5) qui a déjà coûté des données une fois. `CLAUDE.md` impose déjà de corriger tout document
invalidé par une intervention : appliquer la règle aux documents eux-mêmes, et brancher
`check:messages` d'un contrôle équivalent sur les listes de types.

**4. Assumer le rendu statique (D12).** Une application 100 % locale qui exécute une fonction
serverless à chaque affichage est une contradiction technique et économique. Le rendu statique
donne un coût structurellement nul, une latence CDN et l'indépendance vis-à-vis de l'hébergeur —
ce qui, accessoirement, résout par avance la question Hobby/commercial.

**5. Trancher Neon par écrit, dans un ADR, maintenant.** Non pas pour le provisionner — l'analyse
est claire, il n'a pas d'usage en v1.0 — mais pour que la décision soit datée et que le modèle de
données porte dès aujourd'hui ce qu'elle exige (`deletedAt`, horodatages complets). Cinq lignes de
types aujourd'hui évitent une migration de données dans un an.

**6. Trancher le modèle économique avant le lancement, pas après.** « Gratuit, local-first, sans
compte » et « SaaS par abonnement » ne se réconcilient pas. La seule monétisation honnête est de
facturer ce qui coûte réellement — la synchronisation. Cette décision détermine le choix
d'hébergeur, qu'il vaut mieux ne pas changer après la mise en ligne.

**7. Ne pas céder sur la télémétrie.** Le refus d'analytique coûte la mesure produit — c'est un prix
réel, à compenser par des enquêtes volontaires et un canal de retour visible. Mais c'est aussi le
seul argument que les concurrents ne peuvent pas copier sans se renier. C'est l'actif commercial
n° 1 du projet ; il vaut plus qu'un tableau de bord de rétention.

### Conclusion

Habitum n'est pas un projet en difficulté : c'est un projet **bien préparé et non démarré**. La
partie difficile — comprendre le domaine, isoler les règles subtiles, produire un oracle numérique,
documenter les pièges — est faite, et faite mieux que dans la plupart des projets qui arrivent en
production. La partie longue — écrire les onze écrans — est devant, entièrement, et elle est
banale : c'est du portage guidé par une référence qui s'ouvre dans un navigateur.

Le risque du projet n'est pas de ne pas savoir quoi faire. C'est de commencer par le visible (les
vues) avant le silencieux (les jetons, l'oracle, le modèle de données), et de découvrir trois
semaines plus tard que onze écrans doivent être repris. Les cinq premières actions du Top 10
existent précisément pour rendre cette erreur impossible.

**Verdict : GO, conditionné à une journée de remise en état préalable.** Sans cette journée, le
portage démarre sur des fondations dont deux sont fausses et une n'est pas branchée.

---

*Audit produit le 6 août 2026. Constats vérifiés par exécution (`npm run typecheck / lint / check:messages / test / build / format:check / audit`), lecture intégrale de `lib/`, `app/`, `components/`, `i18n/`, `scripts/`, `tests/`, `styles/`, `.github/`, et comparaison ligne à ligne du moteur porté avec `docs/handoff/reference/domain-logic-extract.js` et `public/prototype/Habitum.dc.html`. Le dépôt a été restauré à l'identique après vérification (`diff` : aucun écart).*
