# 03 — Architecture cible, modèle de données, algorithmes

## 1. Stack recommandée (100 % gratuite / open source)

| Couche | Choix | Licence / plan | Pourquoi |
|---|---|---|---|
| Framework | **Next.js 15** (App Router) | MIT | Rendu statique suffisant, PWA facile, déploiement Vercel Hobby gratuit |
| Langage | **TypeScript strict** | Apache-2.0 | Corrige B7 (modèle riche non typé) |
| Style | **Tailwind CSS v4** + variables CSS | MIT | Les tokens du prototype sont déjà des variables CSS |
| Primitives UI | **shadcn/ui** (Radix) | MIT | Accessibilité fournie (dialog, switch, tabs, popover) |
| Icônes | **Lucide** | ISC | Aligné avec le design system rattaché |
| État | **Zustand** + slices | MIT | Remplace `this.state` monolithique sans boilerplate |
| Persistance | **Dexie** (IndexedDB) | Apache-2.0 | Transactions, index composites, quota ~ Go (corrige B3) |
| Dates | **aucune dépendance** — helpers maison, purs et testés | — | Voir `docs/adr/0006-helpers-de-date-maison.md`. `date-fns` a été retirée le 6 août 2026 : le domaine ne doit dépendre de rien, et `Intl.DateTimeFormat` suffit aux formats localisés |
| Formulaires | **react-hook-form** + **zod** | MIT | Éditeur habitude/tâche à 4 onglets |
| Glisser-déposer | **@dnd-kit** | MIT | Calendrier : déplacement + redimensionnement accessibles |
| Graphiques | SVG maison (comme le prototype) ou **visx** | MIT | Heatmap et barres sont triviales en SVG, pas de gros lib |
| i18n | **next-intl** | MIT | Externalise `L`/`EL`/`PL` |
| Tests | **Vitest** + **Playwright** | MIT / Apache-2.0 | Moteur métier + parcours |
| PWA | **Serwist** | MIT | Service worker, hors ligne. *Les rappels sont planifiés dans l'onglet (`setTimeout`), pas encore par le service worker — voir CHANGELOG phase 5.* |
| Sync (opt.) | **Neon PostgreSQL** + **Drizzle** + **Auth.js** | plans gratuits | Postgres serverless, branches de base natives, driver HTTP adapté au serverless |
| Hébergement | **Vercel Hobby** | gratuit | ou Cloudflare Pages / Netlify free |

Aucune de ces briques n'exige de plan payant pour un produit mono-utilisateur.

## 2. Arborescence proposée

```
app/                     routes (App Router) : /, /today, /habits, /tasks, /goals,
                         /calendar, /stats, /timer, /notes, /profile, /settings
lib/
  domain/                logique pure, sans React, 100 % testée
    types.ts  date.ts  schedule.ts  metrics.ts  goals.ts  recurrence.ts  cache.ts
  data/                  persistance
    db.ts  migrations.ts  seed.ts  repositories/  import.ts  log-index.ts
  store/                 Zustand : habits, tasks, goals, timer, notes, settings, ui, undo
components/
  ui/                    primitives sans métier (Panel, Chip, Switch, Sheet…)
  shell/                 coque applicative
  <domaine>/             composants par vue (habits/, calendar/, stats/…)
messages/                fr.json, en.json
styles/                  tokens.css (GÉNÉRÉ), globals.css
tests/                   unit/  e2e/  fixtures/
drizzle/                 migrations/ (phase 6, optionnel — Neon)
```

> **Le dépôt n'a pas de dossier `src/`.** Les chemins `src/…` des versions
> antérieures de ce document et de `06-BACKLOG.md` étaient faux : corrigés le
> 6 août 2026. `styles/tokens.css` est **généré** par `scripts/extract-tokens.mjs`
> et ne s'édite pas à la main.

Règle : `lib/domain/` et `lib/data/` **n'importent jamais React** — imposé par ESLint. Toute vue est un assemblage de
`components/` alimenté par un sélecteur de store.

## 3. Modèle de données (transposé du prototype)

```ts
type DateKey = string;              // 'YYYY-MM-DD' — clé canonique, jamais un Date sérialisé
type Category = 'health'|'sport'|'mind'|'work'|'home'|'study';
/* ⚠ SEPT types d'habitude, pas quatre. Une liste blanche incomplète fait
   disparaître silencieusement des entités ET leur historique : c'est arrivé
   à l'import, 4 habitudes sur 6 perdues (CHANGELOG 2026-08-05).
   Ce document a lui-même porté la version fautive jusqu'au 6 août 2026.
   SOURCE UNIQUE : lib/domain/types.ts. Ne jamais recopier ces listes. */
type HabitGoalKind = 'check'|'count'|'time'|'total'|'list'|'limit'|'exact';
type GoalKind      = 'cumul'|'milestones'|'reduce';

interface Habit {
  id: string;
  name: string;                     // ⚠ plus de champs fr/en sur le contenu utilisateur
  category: Category;
  goal: { kind: HabitGoalKind; target: number; step: number; unit: string };
  mode: 'dow'|'every'|'week'|'month';
  interval?: number;                // mode 'every' — intervalle en jours
  pause?: { from: DateKey; to: DateKey };
  days: number[];                   // 0 = lundi … 6 = dimanche
  subItems: { label: string }[];    // pour kind = 'list'
  reminders: string[];              // 'HH:mm'
  start?: DateKey; end?: DateKey;
  archived: boolean;
  note: string;
  createdAt: string; updatedAt: string;
}

interface LogEntry {                // table indexée [habitId+date] — remplace l'objet `ov`
  habitId: string; date: DateKey; value: number; updatedAt: string;
}

interface Task {
  id: string; name: string; category: Category;
  date: DateKey; time?: string; duration: number;   // minutes, défaut 60
  priority: 1|2|3; done: boolean;
  subTasks: { label: string; done: boolean }[];
  note: string;
  recurrence?: Recurrence;          // remplace le champ `rep` ('daily'|'monthly')
  createdAt: string; updatedAt: string;
}

interface Goal {
  id: string; name: string; kind: GoalKind;          // cumul | milestones | reduce
  milestones?: { label: string; done: boolean }[];   // kind = 'milestones'
  window?: number;                                    // fenêtre en jours, kind = 'reduce'
  target: number; unit: string;
  sourceHabitId?: string;           // dérivation depuis une habitude
  category: Category; deadline: DateKey;
  createdAt: string; updatedAt: string;
}

interface Session { id: string; label: string; minutes: number; date: DateKey;
                    habitId?: string; mode: 'pomo'|'stopwatch'|'countdown'|'interval';
                    createdAt: string; updatedAt: string; deletedAt?: string; }

interface Note { id: string; kind: 'journal'|'habit'; date?: DateKey; habitId?: string;
                 body: string; mood?: number;
                 createdAt: string; updatedAt: string; deletedAt?: string; }

interface ShoppingItem { id: string; label: string; done: boolean;
                         createdAt: string; updatedAt: string; deletedAt?: string; }

interface Profile { id: string; name: string; handle: string; glyph: string; hue: number;
                    role: number; since: DateKey; }

interface Settings { lang: 'fr'|'en'; theme: 'neural'|'plasma'|'clinical';
                     weekStart: 'mon'|'sun'; notifications: boolean; sound: boolean;
                     vibrate: boolean; confetti: boolean; customCursor: boolean; }
```

**Changements structurels par rapport au prototype (volontaires) :**

1. `ov: { 'habitId|YYYY-MM-DD': number }` devient une **table `logs` indexée** → requêtes par
   fenêtre sans balayage complet (corrige B3).
2. Les champs `fr`/`en` disparaissent du **contenu utilisateur** ; l'i18n ne concerne que l'UI.
3. `off` (décalage en jours) est éliminé au profit de `date: DateKey` partout (le prototype
   supportait encore les deux via `tdate()`/`toff()` : dette de migration `v<5`).
4. `updatedAt`/`deletedAt` sur toutes les entités dès la phase 1 — prérequis de la synchronisation
   même si la phase 6 n'est jamais faite.

## 4. Algorithmes à porter fidèlement

### Planification — `isScheduled(habit, date)`
```
si habit.archived → faux
si habit.start et dateKey < start → faux
si habit.end et dateKey > end → faux
si habit.pause et pause.from <= dateKey <= pause.to → faux
mode 'dow'            → habit.days contient dow(date)   // dow lundi=0
mode 'week'|'month'   → vrai
mode 'every'          → origine = start, à défaut createdAt, à défaut 2020-01-01
                        (JAMAIS « aujourd'hui − 182 j » : l'origine doit être
                         STABLE, sinon la parité du cycle bascule chaque jour —
                         défaut D16, corrigé le 6 août 2026)
                        planifié si (date − origine) >= 0 et % max(1, interval||2) === 0
```

### Complétion — `isDone(habit, date, value)`
```
target = kind==='list' ? subItems.length||1 : kind==='total' ? step||1 : goal.target||1
kind==='limit' : sémantique INVERSÉE — réussi si value <= target,
                 MAIS si date >= aujourd'hui et aucune entrée de journal → non réussi
                 (on ne peut pas déclarer réussi un plafond avant la fin de la journée)
kind==='exact' : réussi si value === target
kind==='total' : réussi si value > 0
sinon ('check', 'count', 'time', 'list') : réussi si value >= target
```
Ce cas `limit` est la subtilité la plus facile à casser : **le couvrir par des tests d'abord.**

### Série courante — `currentStreak(habit)`
```
d = aujourd'hui
si isScheduled(d) et non isDone(d) → d = d - 1 jour   // le jour en cours ne casse pas la série
tant que (non isScheduled(d)) ou isDone(d) : si isScheduled(d) compteur++ ; d = d - 1 jour
```
(Les jours non planifiés sont traversés sans casser ni incrémenter.)

### Autres
- `bestStreak` : balayage 365 jours + `max(record, sérieCourante)` → **à mettre en cache dérivé**.
- `completionRate(habit, window)` : `jours réussis / jours planifiés` sur la fenêtre, jours futurs exclus.
- `dayRatio(date)` : `{planifiés, réussis, ratio}` sur toutes les habitudes non archivées → base de
  la heatmap et des « journées parfaites » (`ratio === 1` et `planifiés > 0`).
- Score d'habitude : dérivé de `completionRate` pondéré par la série (voir `vals2()`, section stats).
- Focus : agr\u00e9g\u00e9 sur `sessions` \u2014 corrig\u00e9 au lot 2 (`focusMin_` \u00e9tait fictif). \u00c0 porter tel quel.

### Timer (à refondre — B5)
```
état persisté : { mode, phase, cycle, startedAt: number|null, accumulatedMs: number }
temps écoulé = accumulatedMs + (startedAt ? Date.now() - startedAt : 0)
pause : accumulatedMs += Date.now() - startedAt ; startedAt = null
rendu : requestAnimationFrame ou setInterval 250 ms, purement d'affichage
fin de phase : détectée par comparaison au seuil, pas par accumulation de ticks
pomodoro : focus 25' ×4, pause 5', pause longue 15' ; crédit auto de l'habitude liée à la fin
```

### Cache dérivé (remplace `memo()`) — livré en phase 5, tâche 5.9
Le prototype invalide **tout** le cache dès qu'une habitude ou une entrée de journal change.

Livré : `lib/domain/cache.ts` — cache en mémoire par clé `(habitId, métrique, fenêtre)`,
invalidé **uniquement** pour l'habitude touchée (`invalidateHabit`) ou pour les fenêtres qui
contiennent la date touchée (`invalidateDate`). L'instance unique vit dans `lib/store/derived.ts` :
le domaine fournit la mécanique, la couche qui écrit décide quand une valeur cesse d'être vraie.
Aucune persistance — un cache reconstruit en quelques millisecondes n'a pas à survivre au
rechargement, et un cache persisté est un cache qu'on peut retrouver périmé.

### Ouverture en deux temps du journal — phase 5, tâche 5.10
`chargerTout(recent = true)` ne lit que les **420 derniers jours** (`N_STREAK`, la fenêtre la plus
profonde du domaine) par une requête de plage unique sur l'index `date`, puis complète l'index en
fond. Le drapeau `logIndexComplete` — exposé par la coque en `data-journal` — dit lequel des deux
états est atteint.

Budget mesuré le 13 août 2026 (build de production, Chromium) : 40 habitudes × 3 ans → ouverture
0,5 à 1,0 s, interaction 70 à 90 ms. À 200 habitudes, l'ouverture atteint 2,2 s : le mur est la
lecture IndexedDB (~40 000 lignes/s), passée avant le premier rendu. La sortie connue est une
lecture fenêtrée **par vue**, non faite.

### Clés de la table `meta` (application portée)

Table clé/valeur de la base Dexie. `occ` reprend le nom et le format du prototype (G1) ; les
autres sont propres à l'application portée et documentées ici plutôt que devinées.

| Clé | Contenu | Posée par |
|---|---|---|
| `settings` | préférences (`lang`, `theme`, `weekStart`, `notifications`, `sound`, `vibrate`, `confetti`, `customCursor`) | réglages |
| `demo` | le jeu de démonstration a été chargé — l'en-tête l'affiche en permanence (B4) | `seedDemo()` |
| `seeded` | amorçage effectué ; rend `seedEmpty()` idempotent | `seedEmpty()` |
| `onboarded` | parcours d'accueil franchi ; absent = première ouverture, l'application renvoie à `/onboarding` (5.5) | `completeOnboarding()` |
| `activeProfile` | profil courant (`pid` du prototype, renommé car nouvelle table) | réglages / profils |
| `timer` | état du minuteur : `startedAt` + `accumulatedMs` (B5) | tranche minuteur |
| `occ` | occurrences de tâches récurrentes accomplies, `{"<taskId>\|YYYY-MM-DD": 1}` — **nom et format figés** (5.6) | bascule de tâche |
| `lastExport` / `nagDismissed` | date du dernier export et refus du rappel de sauvegarde (D8) | export / rappel |
| `backup` | copie de secours `{at, payload}` prise avant import et avant réinitialisation (5.8) | `construireCopie()` |
| `errors` | vingt dernières erreurs attrapées, **local uniquement**, lisibles dans les réglages (5.1) | `lib/logger.ts` |

## 5. Migration des données existantes

Le prototype expose `exportJSON()` :
`{ app:'Habitum', exported, habits, tasks, log, notes }` (`log` = l'objet `ov`).
La phase 1.7 doit fournir un importeur qui :
1. accepte ce format et les clés `habitId|YYYY-MM-DD`,
2. convertit `log` en lignes de la table `logs`,
3. **rejette l'historique généré** si le drapeau `mat` est présent et que l'utilisateur choisit un
   compte vierge (corrige B4),
4. renseigne `updatedAt` = date d'import pour toutes les entités,
5. journalise un rapport d'import (entités lues / créées / ignorées).

Ancienne clé `localStorage` : `habitum.state` (version `SV`). Migrations existantes à rejouer :
`v<2` (cible d'objectif `o4`), `v<3` (`dur` par défaut 60), `v<4` (thème `neural`), `v<5`
(`off` → `d`, `mat=0`). À convertir en migrations Dexie testées (corrige B6).


## Clés d'état persistées (C7 / H4)

Ces noms sont **opaques mais figés** : les renommer détruirait les données des utilisateurs
existants. On les documente, on ne les renomme pas.

### Clés de stockage local

| Clé (`LS_*`) | Contenu | Écrite par |
|---|---|---|
| `habitum.state` | tout l'état **sauf** `ov` et `notes` ; porte `v` (version de format) et `split:1` | `persist()`, débounce 400 ms |
| `habitum.state.big` | `ov` + `notes` — les deux ensembles volumineux, réécrits seulement s'ils ont changé (B5) | `persist()` |
| `habitum.state.bak` | copie de secours d'une génération (`{at, reason, state, big}`) prise avant import et avant réinitialisation (A3) | `backupNow()` |
| `habitum.best` | records mis en cache par habitude : `{id: {sig, v}}` (B1) ; `sig` = définition de l'habitude + empreinte de son journal + jour courant | `persist()` |

Un enregistrement antérieur à `split:1` porte `ov`/`notes` dans `habitum.state` : `seed()` le lit tel
quel. Aucune migration nécessaire.

### Champs d'état

| Champ | Signification |
|---|---|
| `ov` | **o**ver­rides = le journal réel. `{"<habitId>\|YYYY-MM-DD": valeur}`. Clé de voûte de toutes les métriques |
| `obj` | liste des **obj**ectifs (`cumul`, `milestones`, `reduce`) |
| `occ` | **occ**urrences de tâches récurrentes cochées : `{"<taskId>\|YYYY-MM-DD": 1}`. Repris tel quel dans la table `meta` de l'application (phase 5, tâche 5.6) et dans l'export |
| `tt` | **t**imer **t**arget : cible de la session en cours, `{k:'h'\|'t'\|'', id}` |
| `mat` | drapeau : l'historique de démonstration a déjà été matérialisé (`materialize()`) |
| `demo` | `1` = données de démonstration, `0` = compte importé (A6) |
| `nq` / `nsel` | vue Notes : requête de recherche / habitude dont la note est ouverte |
| `cfg` | préférences ; `cfg.cloud=false` **désactive la persistance locale** (A5), `cfg.fastCache=false` rétablit l'invalidation globale du cache (repli B3) |
| `profiles` / `pid` | profils et identifiant du profil actif |

### Champs internes non persistés (préfixe `_`)

`_mc` cache de rendu · `_mh/_mo/_mt/_mq/_ms/_ml/_mk` références surveillées par `memo()` ·
`_mfp/_fp/_fpo` empreintes du journal par habitude · `_bc/_bcd` cache des records et son drapeau
d'écriture · `_po/_pn` dernières références écrites de `ov`/`notes` · `_pt` minuterie de débounce ·
`_pfail` échec d'écriture déjà signalé · `t0` ancrage horloge du timer.

> Le champ `vault` a été **supprimé** au lot 4 (C4) : il était initialisé et persisté sans jamais
> être lu.
