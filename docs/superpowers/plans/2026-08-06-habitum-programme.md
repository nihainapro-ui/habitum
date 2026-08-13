# Habitum — Programme d'exécution, plan par plan

> **Document de pilotage.** Il ne s'exécute pas : il dit **quels plans existent, dans quel ordre,
> ce que chacun produit et à quelle condition on passe au suivant.** Chaque plan est développé en
> tâches bite-sized TDD **au moment de son exécution**, pas avant — écrire 48 j-p de steps
> aujourd'hui produirait un document faux dès la troisième journée.

**Source :** `docs/AUDIT-PRODUCTION-2026-08-06.md` (28 défauts `D1`–`D28`, backlog `T0.1`–`T8.6`)
**Total :** 46–48 j-p ≈ 9 semaines à 1 ETP
**Coût d'infrastructure cible :** 0 €/mois

---

## Contraintes globales — valables pour **tous** les plans

Elles s'appliquent à chaque tâche sans être répétées. Toute PR qui les viole est rejetée.

| # | Contrainte | Source |
|---|---|---|
| G1 | **Ne jamais renommer une clé persistée** : `ov`, `obj`, `occ`, `tt`, `mat`, `cfg`, `habitum.state`, `habitum.state.big`, `habitum.state.bak`, `habitum.best` | `CLAUDE.md` § 1 |
| G2 | **`lib/domain/` n'importe jamais React, Next ni la persistance.** Un calcul descend dans `lib/domain` avec son test ; il ne monte pas dans le composant | `CLAUDE.md` § 2 — imposé par ESLint |
| G3 | **Aucun chiffre affiché ne doit être fabriqué.** Un compte sans session affiche 0 minute. Seul le jeu de démonstration tolère un générateur, explicitement marqué | `CLAUDE.md` § 3 |
| G4 | **Les 62 valeurs de référence sont la spécification.** Si un test du domaine casse, c'est le code qui a tort | `CLAUDE.md` § 4 |
| G5 | **Gratuit uniquement** : MIT / Apache-2.0 / ISC / OFL, et plans gratuits | `CLAUDE.md` § 5 |
| G6 | **Libellés symétriques** : toute clé de `messages/fr.json` existe dans `en.json` | `CLAUDE.md` § 6 |
| G7 | **Ne pas toucher `public/prototype/`** sauf pour reporter une correction du moteur — et alors régénérer `docs/handoff/reference/domain-logic-extract.js` dans la foulée | `CLAUDE.md` § 7 |
| G8 | **Sept** types d'habitude (`check`, `count`, `time`, `total`, `list`, `limit`, `exact`) et **trois** types d'objectif (`cumul`, `milestones`, `reduce`). Déclarés **une seule fois**, dans `lib/domain/types.ts` : les importer, jamais les recopier | `CLAUDE.md` § pièges |
| G9 | **`limit` est inversé** : réussi si `valeur <= cible`, **mais jamais réussi d'avance** — sur le jour courant sans entrée journalisée, c'est faux | `CLAUDE.md` § pièges |
| G10 | **Définition de « terminé »** : `npm run verify` vert · `npm run test:e2e` vert desktop **et** mobile · aucun débordement horizontal à 390/768/1060/1440 px · `CHANGELOG.md` à jour · tout document `docs/` invalidé est corrigé **dans la même livraison** | `CLAUDE.md` § terminé |
| G11 | Node ≥ 20.9. CI en matrice 20 + 22 (Vercel construit en 22) | `package.json` `engines` |
| G12 | Un commit par étape verte. Messages en conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`) | — |

---

## Les neuf plans

| Plan | Fichier | Charge | Prio |
|---|---|---:|---|
| **1 · Stabilisation** | [`…-phase-1-stabilisation.md`](2026-08-06-habitum-phase-1-stabilisation.md) | 4 j | 🔴 |
| **0 · DevOps** | [`…-plan-0-devops.md`](2026-08-06-habitum-plan-0-devops.md) | 3 j | 🟠 |
| **2 · Données** | [`…-plan-2-donnees.md`](2026-08-06-habitum-plan-2-donnees.md) | 6,5 j | 🔴 |
| **3 · État & coque** | [`…-plan-3-etat-coque.md`](2026-08-06-habitum-plan-3-etat-coque.md) | 4 j | 🔴 |
| **4 · Système visuel** | [`…-plan-4-systeme-visuel.md`](2026-08-06-habitum-plan-4-systeme-visuel.md) | 5 j | 🔴 |
| **5 · Les 11 vues** | [`…-plan-5-vues.md`](2026-08-06-habitum-plan-5-vues.md) | 15 j | 🔴 |
| **6 · Fiabilisation & PWA** | [`…-plan-6-fiabilisation-pwa.md`](2026-08-06-habitum-plan-6-fiabilisation-pwa.md) | 6 j | 🟠 |
| **7 · Vitrine & SEO** | [`…-plan-7-vitrine-seo.md`](2026-08-06-habitum-plan-7-vitrine-seo.md) | 3 j | 🟠 |
| **8 · Qualité & lancement** | [`…-plan-8-qualite-lancement.md`](2026-08-06-habitum-plan-8-qualite-lancement.md) | 7 j | 🟠 |

## Carte des plans

```
PLAN 1  Stabilisation          4 j   🔴 ── bloque TOUT le reste
   │
   ├─► PLAN 2  Données         6,5 j 🔴 ── chemin critique
   │      │
   │      └─► PLAN 3  État & coque      4 j 🔴
   │             │
   │             └─► PLAN 4  Système visuel   5 j 🔴
   │                    │
   │                    └─► PLAN 5  Les 11 vues   15 j 🔴 ── 55 % de la charge
   │                           │
   │                           ├─► PLAN 6  Fiabilisation & PWA   6 j 🟠
   │                           │      │
   │                           │      └─► PLAN 8  Qualité & lancement  7 j 🟠
   │                           │
   │                           └─► PLAN 7  Vitrine & SEO   3 j 🟠 (parallélisable)
   │
   └─► PLAN 0  DevOps          3 j 🟠 ── en parallèle dès le jour 1
```

---

## PLAN 1 — Stabilisation · 4 j · 🔴 Critique

**Fichier :** `docs/superpowers/plans/2026-08-06-habitum-phase-1-stabilisation.md` ✅ **écrit**

**But :** faire passer le dépôt de « ne compile pas, non versionné, jetons faux, oracle débranché »
à « socle sain, versionné, protégé par sa propre spécification ».

| Tâche | Défauts levés | Livrable |
|---|---|---|
| 1 · Dépôt Git | D2 | `main`, `.gitattributes`, premier commit |
| 2 · Chaîne de compilation | D1, D13, D18 | `npm run verify` vert, `build` + `format:check` inclus |
| 3 · Modèle de données complété | D14, D15 | `Profile`, `ShoppingItem`, `deletedAt`, horodatages, `startOfWeek` |
| 4 · Oracle branché | **D4** | `tests/unit/golden.test.ts` — 62/62 à chaque commit |
| 5 · Jetons régénérés | **D3** | `tokens.css` extrait du prototype + test anti-dérive |
| 6 · Bug `every` | D16 | Corrigé domaine **et** prototype, extrait régénéré |
| 7 · `date-fns` tranché | D17 | Retirée, décision en ADR-0006 |
| 8 · Documentation | D5, D20, D21, D22 | 4 documents corrigés, CHANGELOG |

**Critère de sortie :** `npm run verify` vert · **62/62** valeurs conformes · `tokens.css` prouvé
identique au prototype par test · aucun document contredit par le code.

**Pourquoi en premier, sans exception :** D3 (jetons faux) et D4 (oracle débranché) sont deux
défauts **silencieux** dont le coût de correction croît linéairement avec le nombre de vues portées.
Porter une vue avant de les régler, c'est accepter de la reporter.

---

## PLAN 0 — DevOps · 3 j · 🟠 Haute · **en parallèle du Plan 1**

**But :** un dépôt GitHub qui bloque ce qui ne doit pas passer.

| Tâche | Défauts | Livrable |
|---|---|---|
| 0.1 | D2 | Dépôt GitHub public, `main` protégée (PR obligatoire, CI verte requise, pas de force-push, historique linéaire) |
| 0.2 | — | 28 défauts + 77 tâches importés en issues ; labels `prio:*`, `phase:*`, `def:*` ; 8 jalons |
| 0.3 | **D24** | CI durcie : `permissions: contents: read`, actions épinglées par SHA, `concurrency` avec annulation, matrice Node 20/22 |
| 0.4 | **D19** | Job `e2e` séparé (Playwright chromium, cache navigateurs) |
| 0.5 | **D11** | Dependabot (npm + actions, hebdo, groupé), CodeQL, `npm audit --audit-level=high` en CI |
| 0.6 | **D9** | En-têtes de sécurité dans `next.config.mjs` : CSP, HSTS, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` minimal |
| 0.7 | D27 | `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS`, templates d'issue, `gitleaks` |
| 0.8 | — | `healthcheck.yml` (cron), `release.yml` (tag → release) |

**Critère de sortie :** une PR qui casse `verify`, l'e2e, ou introduit une vulnérabilité haute est
**mécaniquement bloquée**. `securityheaders.com` note A sur la préversion.

**Dépendance :** tâche 1 du Plan 1 (dépôt Git). Le reste est indépendant.

---

## PLAN 2 — Couche de données · 6,5 j · 🔴 Critique · chemin critique

**But :** des données réelles, persistées, migrables, importables — **aucune vue n'est portable sans ça**.

**Fichiers créés**

```
lib/data/db.ts                  schéma Dexie, 8 tables
lib/data/migrations.ts          migrations numérotées (plus de cascade if v<n)
lib/data/repositories/
  habits.ts  logs.ts  tasks.ts  goals.ts  notes.ts  sessions.ts  profiles.ts  meta.ts
lib/data/import.ts              importeur du format d'export du prototype
lib/data/import.schema.ts       schémas zod
lib/data/seed.ts                seedDemo() et seedEmpty(), strictement séparés
lib/data/index-log.ts           construction du LogIndex depuis la table logs
```

| Tâche | Réf | Livrable | Test |
|---|---|---|---|
| 2.1 | T1.7 | Schéma Dexie : `habits`, `logs` (index composite `[habitId+date]`), `tasks`, `goals`, `notes`, `sessions`, `profiles`, `meta` | Ouverture, index interrogeable, `fake-indexeddb` en Vitest |
| 2.2 | T1.8 | Dépôts typés : CRUD, `updatedAt` automatique, suppression logique `deletedAt`, transactions | Un test par dépôt : créer, lire, modifier, supprimer logiquement, ne pas ressortir |
| 2.3 | T1.9 | Migrations **numérotées** 1→n + rejeu des migrations héritées `v<2`…`v<5` | Une charge au format d'origine par migration ; « déjà à jour → ne rien faire » |
| 2.4 | T1.10, **G8** | Importeur : lit `{app,exported,v,habits,tasks,log|ov,notes,obj,sessions,shop}`, convertit `habitId\|YYYY-MM-DD` en lignes `logs`, produit un `ImportReport` | **Aller-retour** : export du prototype → import → **les 62 valeurs sont identiques**. Le test qui aurait attrapé la perte de 4 habitudes sur 6 |
| 2.5 | T1.10 | Schémas zod : les 7 types d'habitude et 3 types d'objectif **importés de `lib/domain/types.ts`**, jamais recopiés | Un fichier d'import contenant les 7 types passe intégralement |
| 2.6 | **T1.11, B4** | `seedEmpty()` par défaut, `seedDemo()` explicite et drapeauté. **`materialize()` n'existe pas en production** | Un compte vierge affiche 0 partout ; aucun `rnd()` hors du fixture de test |
| 2.7 | — | `buildLogIndex()` : table `logs` → `LogIndex` (Map), par fenêtre, sans balayage complet | 36 500 entrées, construction < 50 ms |

**Critère de sortie :** un export du prototype se réimporte **sans perte** et **reproduit les
62 valeurs** · un compte vierge n'affiche aucune donnée générée · `npm run verify` vert.

**Risque principal :** l'importeur est le point où le projet a **déjà** perdu des données.
Parade : la liste blanche vient de `lib/domain/types.ts` (G8) et le test d'aller-retour recompare
**toutes** les métriques, pas un échantillon.

---

## PLAN 3 — État & coque applicative · 4 j · 🔴 Critique

**But :** naviguer entre les onze routes avec des données réelles chargées.

**Fichiers créés**

```
lib/store/
  habits.ts  tasks.ts  goals.ts  notes.ts  sessions.ts  timer.ts  settings.ts  ui.ts
  undo.ts                        middleware snapshot + toast annulable
  index.ts                       assemblage des tranches
components/shell/
  Rail.tsx  Header.tsx  BottomBar.tsx  ZenToggle.tsx  SkipLink.tsx
components/command/
  CommandPalette.tsx  useCommands.ts
lib/keyboard/shortcuts.ts        ⌘K, Escape, ⌘\, piège de focus
```

| Tâche | Réf | Livrable |
|---|---|---|
| 3.1 | T2.4 | Tranches Zustand ; **persistance déléguée aux dépôts**, jamais de `localStorage` direct |
| 3.2 | T2.5 | `withUndo(action, label)` → toast avec **Annuler** ; porte `snapshot()`/`notify()` du prototype |
| 3.3 | T2.6, **D26** | Coque : rail 3 groupes (Espace / Suivi / Focus), en-tête, mode zen `⌘\`, barre basse < 768 px, **lien d'évitement**, `aria-current="page"` |
| 3.4 | T2.9 | Palette `⌘K` : recherche habitudes/tâches/objectifs, `↑`/`↓`/`Entrée`, création rapide |
| 3.5 | T2.10 | Raccourcis globaux + piège de focus dans les modales, sans conflit avec les champs de saisie |
| 3.6 | **D12** | **Rendre les routes statiques** : sortir la locale de `cookies()` (lecture côté client), vérifier `next build` → `○` et non `ƒ` |
| 3.7 | — | Région `aria-live` pour les toasts et les changements de vue |

**Critère de sortie :** les onze routes affichent des données issues d'IndexedDB · `next build`
produit des routes **statiques** · palette et mode zen pilotables au clavier · e2e vert.

---

## PLAN 4 — Système visuel · 5 j · 🔴 Critique

**But :** un vocabulaire visuel fidèle au prototype, accessible, sur lequel 11 vues peuvent s'écrire.

**Prérequis absolu :** tâche 5 du Plan 1 (jetons régénérés). Écrire une primitive sur des jetons
faux, c'est écrire 11 vues fausses.

**Fichiers créés**

```
components/ui/
  Panel.tsx  Card.tsx  Chip.tsx  Switch.tsx  Field.tsx  Segmented.tsx
  Sheet.tsx  Dialog.tsx  Toast.tsx  Tooltip.tsx  Ring.tsx  Icon.tsx
app/dev/ui/page.tsx              galerie de contrôle (hors production)
components/settings/ThemeSwitcher.tsx
components/settings/LocaleSwitcher.tsx
lib/fonts.ts                     next/font auto-hébergé
```

| Tâche | Réf | Livrable |
|---|---|---|
| 4.1 | T2.3 | 12 primitives : états survol/actif/focus, clavier, ARIA — base Radix (MIT) |
| 4.2 | **D7** | Space Grotesk + JetBrains Mono via `next/font/local`, **zéro requête Google**, pas de FOUT |
| 4.3 | **D6** | `useTranslations` branché dans **tous** les composants — plus une chaîne en dur |
| 4.4 | **D6** | `LocaleSwitcher` appelant `setLocale` ; bascule FR↔EN sans rechargement |
| 4.5 | **D26** | `ThemeSwitcher` réel : `data-theme` piloté et persisté, **sans clignotement** au premier rendu |
| 4.6 | T2.8 | Icônes Lucide pour navigation et actions ; glyphes de catégorie conservés |
| 4.7 | **T7.3** | Contraste WCAG AA sur les 3 thèmes — `--mut` de `plasma` corrigé (documenté sous AA) |

**Critère de sortie :** `/dev/ui` montre les 12 primitives dans **3 thèmes × 2 langues** · aucune
chaîne en dur détectée (règle ESLint) · axe sans violation critique · comparaison visuelle contre
`public/prototype/tests/visual/reference/`.

---

## PLAN 5 — Les 11 vues · 15 j · 🔴 Critique · **55 % de la charge restante**

**But :** parité fonctionnelle avec le prototype, en code de production.

**Ordre imposé par les dépendances** — chaque vue est livrable et testable seule :

| # | Vue | Réf | Points durs | j |
|---|---|---|---|---|
| 5.1 | `today` | T3.2 | Liste unifiée triée par heure, compteurs `−`/`+`, sous-listes, tiroir d'actions (Réussi/Passer/Reporter/Supprimer/Note), toast annulable | 2 |
| 5.2 | `habits` | T3.1 | Cartes : glyphe, objectif, **7 pastilles de semaine cliquables**, série, record, taux 30 j | 1,5 |
| 5.3 | `dash` | T3.3 | Anneau du jour, 4 compteurs, mini-heatmap 30 j, objectifs en cours | 1 |
| 5.4 | Éditeur habitude + tâche | T3.4, T3.5 | **4 onglets**, `react-hook-form` + zod, brouillon isolé, suppression annulable, **les 7 types** | 2 |
| 5.5 | `tasks` | T3.6 | Groupes Aujourd'hui/Demain/Semaine/Plus tard/Terminé, sous-tâches, priorités, liste de courses | 1 |
| 5.6 | `stats` | T3.11, T3.12 | Heatmap 26 semaines, fenêtres 7/30/90/365, journées parfaites, classement par score | 2 |
| 5.7 | `goals` | T3.15 | 3 types, rythme requis, courbe d'avancement, jalons, alerte d'échéance | 1,5 |
| 5.8 | `calendar` | T3.7–T3.10 | **4 modes**, glisser-déposer `@dnd-kit`, redimensionnement ≥ 15 min, **alternative clavier obligatoire** | 2,5 |
| 5.9 | `timer` | T3.13, **T3.14/B5** | 4 modes, phases pomodoro 25/5/15 ×4, crédit d'habitude, **`startedAt` + `accumulatedMs` persistés** | 1 |
| 5.10 | `notes` | T3.16 | Journal auto-sauvegardé, humeur, notes d'habitude, recherche plein texte (index Dexie) | 0,75 |
| 5.11 | `settings` + `profile` | T3.18, T3.17 | Interrupteurs **réels**, export, réinitialisation en deux temps, profils multiples, avatar OKLCH | 0,75 |

**Critère de sortie par vue** — non négociable :
1. **Mêmes chiffres que le prototype à la même date figée** (comparaison manuelle guidée par `/port-view`)
2. Capture comparée à `public/prototype/tests/visual/reference/<n>-<vue>.png`
3. Aucun débordement horizontal à 390 / 768 / 1060 / 1440 px
4. `useTranslations` partout, 3 thèmes vérifiés
5. Aucun calcul dans le composant — tout descend dans `lib/domain` avec son test (G2)

**Commande dédiée :** `.claude/commands/port-view.md` existe déjà — l'utiliser pour chaque vue.

---

## PLAN 6 — Fiabilisation & PWA · 6 j · 🟠 Haute

**But :** plus aucun interrupteur sans effet, plus aucun écran blanc, installable et hors-ligne.

| Tâche | Réf | Livrable |
|---|---|---|
| 6.1 | **D10** | `app/error.tsx`, `app/global-error.tsx`, `loading.tsx`, états vides sur les 11 vues |
| 6.2 | T4.2 | Notifications réelles : permission contextuelle, rappels aux heures `reminders[]`, fin de phase pomodoro, **dégradation propre si refusé** |
| 6.3 | T4.3 | Son (Web Audio, bip synthétisé, **zéro fichier**) et vibration (`navigator.vibrate`), pilotés par les réglages |
| 6.4 | T4.4, **G3** | **Ou retrait des interrupteurs** non branchés. Un réglage décoratif est un mensonge d'interface |
| 6.5 | T4.6 | Onboarding 3 écrans (langue, thème, 3 habitudes suggérées) ; **compte vierge par défaut**, démo optionnelle |
| 6.6 | T1.13 | Récurrence propre : RRULE simplifiée (`daily`, `weekly`, `monthly`, intervalle) + exceptions par occurrence |
| 6.7 | T5.1, **D25** | Manifeste, icônes 192/512/maskable, favicon, `themeColor` par thème actif |
| 6.8 | T5.2 | Service worker **Serwist** (MIT) : coquille et polices en cache, **offline total** |
| 6.9 | T5.3 | Export/import + rappel de sauvegarde périodique (garde-fou anti perte de données) |
| 6.10 | T1.12 | Cache dérivé incrémental : invalidation par `(habitId)` et par `(date)`, **jamais globale** |
| 6.11 | T7.5 | Virtualisation des longues listes ; 200 habitudes × 3 ans, interaction < 100 ms |

**Critère de sortie :** **aucun interrupteur sans effet** · application installable et utilisable
avion activé · aucun écran blanc possible · budget de performance tenu.

---

## PLAN 7 — Vitrine & SEO · 3 j · 🟠 Haute · **parallélisable avec le Plan 6**

**But :** l'unique actif indexable du projet. L'application, elle, est `noindex`.

| Tâche | Réf | Livrable |
|---|---|---|
| 7.1 | **D28** | Vitrine statique bilingue en Next.js (design **Modernist**, décision B1 option (c)) : proposition de valeur, captures, FAQ, comparatifs |
| 7.2 | D28 | `metadataBase`, Open Graph, Twitter Card, canonique, `alternates.languages` FR/EN |
| 7.3 | D28 | `app/robots.ts` + `app/sitemap.ts` ; **`noindex` sur `/today`, `/habits`…** (déjà fait pour `/prototype`) |
| 7.4 | D28 | JSON-LD `SoftwareApplication`, `offers.price = 0` |
| 7.5 | — | Pages de comparaison (« vs HabitNow », « vs Habitica ») et thématiques (alcool, écrans, pomodoro) |
| 7.6 | **D27** | Politique de confidentialité opposable, mentions légales |
| 7.7 | T7.6 | Lighthouse ≥ 95 / ≥ 95 / 100 / **100 SEO**, budget en CI |

**Critère de sortie :** Lighthouse SEO 100 sur la vitrine · données structurées validées ·
`noindex` vérifié sur l'application · politique de confidentialité en ligne.

---

## PLAN 8 — Qualité & lancement · 7 j · 🟠 Haute

| Tâche | Réf | Livrable |
|---|---|---|
| 8.1 | **T8.1** | 8 parcours Playwright : cocher une habitude · créer une tâche · déplacer au calendrier · pomodoro complet · export→import · changer de profil · FR→EN · réinitialiser |
| 8.2 | **T8.6** | Non-régression visuelle : 11 vues × 3 thèmes comparées en CI |
| 8.3 | **T7.4** | Accessibilité : `@axe-core/playwright` sans violation critique, 3 parcours au lecteur d'écran, alternative clavier du calendrier |
| 8.4 | T7.1 | Recette responsive : 390 / 768 / 1060 / 1440 px, cibles tactiles ≥ 44 px, **heatmap qui se réorganise au lieu de défiler** |
| 8.5 | — | Charge **côté client** (pas de serveur à charger) : 200 habitudes × 3 ans, ouverture < 1,5 s |
| 8.6 | **T8.5** | Audit sécurité : OWASP côté client, `npm audit` sans haute, en-têtes vérifiés, montées `next@16` / `next-intl@4` |
| 8.7 | — | Tests utilisateurs : 5 personnes, 3 parcours, mesure du temps jusqu'à la première habitude créée |
| 8.8 | T8.4 | `README` public soigné, `CHANGELOG` complet, page de version dans les réglages |
| 8.9 | — | Déploiement production, tag `v1.0.0`, release GitHub, runbook d'incident + rollback |
| 8.10 | — | Vérifications post-déploiement : 11 routes en 200, PWA installable, offline effectif, aller-retour export/import, FR↔EN, 3 thèmes |

**Critère de sortie :** `v1.0.0` en ligne, `RECETTE.md` passée intégralement, runbook écrit.

---

## Décisions à prendre par vous, pas par moi

Elles bloquent un plan chacune. Aucune n'est technique.

| # | Décision | Bloque | Échéance |
|---|---|---|---|
| **A** | **Nom du compte GitHub** et visibilité (public recommandé : Actions illimitées + l'ouverture est un argument commercial) | Plan 0 | Avant la tâche 1 du Plan 1 |
| **B** | **`date-fns` : la retirer ou l'utiliser ?** Recommandation : la retirer — `lib/domain/date.ts` est juste, testé, et pur ; l'introduire ajouterait une dépendance à un domaine qui n'en a pas besoin | Plan 1 tâche 7 | Jour 1 |
| **C** | **Vercel Hobby ou Cloudflare Pages ?** Hobby est réservé à l'usage **non commercial**. Si Habitum encaisse un jour (même des dons liés au produit), il faut Pro (~20 $/mois) ou Cloudflare (gratuit, commercial autorisé) | Plan 0 tâche 0.1 | Avant le lancement — pas après |
| **D** | **Neon : maintenant ou v1.1 ?** Recommandation : **v1.1**. Le produit tel que spécifié n'a pas de base de données. Mais `deletedAt` et les horodatages entrent **dès le Plan 1 tâche 3** pour éviter une migration plus tard | Plan 2 | Jour 1 (la décision, pas le provisionnement) |
| **E** | **Télémétrie : aucune, ou Sentry opt-in ?** Recommandation : journal d'erreur **local** par défaut, analytique **sur la vitrine seulement**, Sentry derrière un interrupteur jamais activé sans geste de l'utilisateur | Plan 6 | Avant le Plan 6 |
| **G** | **Où vit l'application : `/` ou `/app` ?** La vitrine (Plan 7) a besoin de `/` — c'est l'URL qui se partage, et un visiteur qui arrive sur un tableau de bord vide ne comprend pas le produit. Mais l'application occupe `/` aujourd'hui. **Recommandation : la vitrine prend `/`, l'application passe sous `/app`.** ⚠️ **Cette décision doit être prise AVANT le Plan 3** : les tests e2e des Plans 3 à 6 codent les routes en dur, et les changer après coûte une passe sur chaque fichier de test. Elle impacte aussi `start_url` du manifeste PWA (Plan 6) | Plans 3 à 8 | **Avant le Plan 3** |
| **F** | **Modèle économique.** « Gratuit, local-first, sans compte » et « abonnement SaaS » ne se réconcilient pas. Recommandation : gratuit + dons en v1.0, synchronisation payante en v1.1 — on ne facture que ce qui coûte | Plan 7 (la vitrine l'affiche) | Avant le Plan 7 |

---

## Suivi d'avancement

| Plan | Charge | État | Avancement produit à la sortie |
|---|---:|---|---:|
| 1 · Stabilisation | 4 j | ✅ livré (6 août 2026) | 22 % → 27 % |
| 0 · DevOps | 3 j | ✅ livré (6 août 2026) | 27 % → 31 % |
| 2 · Données | 6,5 j | ✅ livré (8 août 2026) | 31 % → 42 % |
| 3 · État & coque | 4 j | ✅ livré (8 août 2026) | 42 % → 48 % |
| 4 · Système visuel | 5 j | ✅ livré (12 août 2026) | 48 % → 56 % |
| 5 · Les 11 vues | 15 j | ✅ livré (13 août 2026) | 56 % → 80 % |
| 6 · Fiabilisation & PWA | 6 j | ⬜ à faire | 80 % → 91 % |
| 7 · Vitrine & SEO | 3 j | ⬜ à faire | 91 % → 95 % |
| 8 · Qualité & lancement | 7 j | ⬜ à faire | 95 % → **100 % — v1.0** |
| **TOTAL** | **53,5 j** | **6 plans sur 9** | |

> Le tableau était resté à « ⬜ à faire » sur toute la ligne alors que cinq plans étaient livrés :
> corrigé à la sortie du plan 5. Les dates sont celles des entrées de `CHANGELOG.md`, qui numérote
> les phases dans l'ordre d'exécution (phase 0 = plans 1 et 0, phase 1 = plan 2, phase 2 = plan 3,
> phase 3 = plan 4, phase 4 = plan 5).

> L'écart avec les 46–48 j-p de l'audit vient du Plan 0 (DevOps, 3 j) désormais compté à part et
> des marges de recette. Le Plan 0 étant parallélisable, le **délai calendaire reste ~9 semaines**
> à 1 ETP.

---

*Programme établi le 6 août 2026 à partir de `docs/AUDIT-PRODUCTION-2026-08-06.md`.
Chaque plan est développé en tâches bite-sized TDD au moment de son exécution.*
