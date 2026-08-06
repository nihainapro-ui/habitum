# Habitum — Plan 1 : Stabilisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire passer le dépôt de « ne compile pas, non versionné, jetons de design faux, oracle débranché » à « socle sain, versionné, et protégé par sa propre spécification exécutable ».

**Architecture:** Aucune fonctionnalité n'est ajoutée. On répare la chaîne de compilation, on branche les 62 valeurs de référence sur Vitest pour qu'elles gardent le portage à chaque commit, on régénère les jetons de design **par extraction** du prototype (jamais à la main), et on corrige les documents dont le code prouve qu'ils sont faux. Chaque tâche se termine par un test qui rend le défaut impossible à réintroduire.

**Tech Stack:** Next.js 15.5 · TypeScript 5.9 strict · Vitest 3 · ESLint 9 flat config · Prettier 3 · Node ≥ 20.9

## Global Constraints

Copiées de `CLAUDE.md`. Elles s'appliquent à **toutes** les tâches ci-dessous.

- **Ne jamais renommer une clé persistée** : `ov`, `obj`, `occ`, `tt`, `mat`, `cfg`, `habitum.state`, `habitum.state.big`, `habitum.state.bak`, `habitum.best`.
- **`lib/domain/` n'importe jamais React, Next, ni la persistance.** Imposé par ESLint (`no-restricted-imports`).
- **Aucun chiffre affiché ne doit être fabriqué.** Le seul générateur toléré sert au jeu de démonstration et doit être marqué comme tel.
- **Les 62 valeurs de référence sont la spécification.** Si un test du domaine casse, c'est le code qui a tort.
- **Gratuit uniquement** : MIT / Apache-2.0 / ISC / OFL.
- **Libellés symétriques** : toute clé de `messages/fr.json` existe dans `en.json`.
- **Ne pas toucher `public/prototype/`** sauf pour reporter une correction du moteur — et alors, régénérer `docs/handoff/reference/domain-logic-extract.js` dans la foulée.
- **SEPT** types d'habitude (`check`, `count`, `time`, `total`, `list`, `limit`, `exact`) et **TROIS** types d'objectif (`cumul`, `milestones`, `reduce`), déclarés une seule fois dans `lib/domain/types.ts`.
- **`limit` est inversé** : réussi si `valeur <= cible`, mais jamais réussi d'avance.
- Constantes du domaine : `N_STREAK = 420`, `N_BEST = 365`. Constante du jeu de démonstration : `N_MAT = 180`.
- Date figée de référence : **2026-08-05** (mercredi).

---

## Structure des fichiers

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `.gitattributes` | Normalisation des fins de ligne (dépôt créé sous Windows) | 1 |
| `components/shell/app-shell.tsx` | Corriger l'apostrophe non échappée | 2 |
| `package.json` | `verify` complet : + `build`, + `format:check` | 2 |
| `eslint.config.mjs` | Ignorer `next-env.d.ts` (régénéré avec une référence triple-slash) | 2 |
| `lib/domain/types.ts` | `Profile`, `ShoppingItem`, `deletedAt`, horodatages complets, `WeekStart` | 3 |
| `lib/domain/date.ts` | `startOfWeek(date, weekStart)` | 3 |
| `tests/unit/date.test.ts` | **créé** — bornes de semaine lundi/dimanche | 3 |
| `tests/fixtures/demo-seed.ts` | **créé** — jeu de démonstration reconstitué (générateur marqué démo) | 4 |
| `tests/unit/golden.test.ts` | **créé** — les 62 valeurs de référence comparées | 4 |
| `scripts/extract-tokens.mjs` | **créé** — génère `tokens.css` par extraction du prototype | 5 |
| `styles/tokens.css` | **régénéré** — 16 jetons × 3 thèmes, valeurs du prototype | 5 |
| `tests/unit/tokens.test.ts` | **créé** — anti-dérive : tokens.css ≡ prototype | 5 |
| `lib/domain/schedule.ts` | Corriger le mode `every` sans `start` | 6 |
| `public/prototype/Habitum.dc.html` | Même correction, reportée (règle CLAUDE.md § 7) | 6 |
| `docs/handoff/reference/domain-logic-extract.js` | Régénéré après la correction | 6 |
| `package.json` | Retirer `date-fns` | 7 |
| `docs/adr/0006-helpers-de-date-maison.md` | **créé** — décision tracée | 7 |
| `docs/handoff/03-ARCHITECTURE.md` | 7 types d'habitude, 3 types d'objectif, Neon, arborescence réelle | 8 |
| `docs/handoff/02-ROADMAP.md` | Phase 6 : Neon, pas Supabase | 8 |
| `docs/handoff/06-BACKLOG.md` | Chemins sans `src/` | 8 |
| `README.md`, `tests/README.md`, `docs/PASSATION-CLAUDE-CODE.md`, `docs/adr/0002-local-first.md` | Faits corrigés | 8 |
| `CHANGELOG.md` | Entrée de la phase 1 | 8 |

---

## Task 1: Dépôt Git

**Prérequis de toutes les autres tâches** — chacune se termine par un commit.

**Files:**
- Create: `.gitattributes`
- Modify: aucun

**Interfaces:**
- Consumes: rien
- Produces: un dépôt Git sur la branche `main` avec un commit initial. Toutes les tâches suivantes committent dedans.

- [ ] **Step 1: Vérifier qu'aucun dépôt n'existe**

```bash
cd "d:/Projet/En cours/habitum"
ls -a | grep '^\.git$' || echo "aucun dépôt — on continue"
```

Attendu : `aucun dépôt — on continue`. Si un `.git` existe, **s'arrêter** et demander quoi faire.

- [ ] **Step 2: Créer `.gitattributes`**

Le dépôt est créé sous Windows ; sans cela, les fins de ligne divergeront en CI Ubuntu.

```
* text=auto eol=lf
*.png binary
*.webp binary
*.ico binary
public/prototype/** -text
```

> `public/prototype/** -text` : le prototype est une **archive**. Git ne doit pas y toucher une seule ligne.

- [ ] **Step 3: Vérifier que `.gitignore` couvre les artefacts créés par l'audit**

```bash
grep -E 'node_modules|\.next' .gitignore
```

Attendu : les deux présents. Ils le sont déjà — cette étape le prouve avant le premier `git add`.

- [ ] **Step 4: Initialiser et committer**

```bash
git init -b main
git add .
git status --short | head -30
```

Vérifier qu'aucun fichier de `node_modules/` ni de `.next/` n'apparaît.

```bash
git commit -m "chore: dépôt initial — base de reprise Habitum (portage Next.js 15, moteur métier testé)"
```

- [ ] **Step 5: Vérifier le commit**

```bash
git log --oneline
git ls-files | wc -l
```

Attendu : un commit ; entre 80 et 120 fichiers suivis.

---

## Task 2: Chaîne de compilation verte

Lève **D1** (le dépôt ne compile pas), **D13** (`verify` incomplet), **D18** (lint rouge après un build).

**Files:**
- Modify: `components/shell/app-shell.tsx:6`
- Modify: `package.json` (script `verify`)
- Modify: `eslint.config.mjs` (ligne `ignores`)

**Interfaces:**
- Consumes: dépôt Git (Task 1)
- Produces: `npm run verify` exécute **typecheck + lint + check:messages + test + build + format:check** et passe. Toutes les tâches suivantes s'y adossent.

- [ ] **Step 1: Constater l'échec (le test, ici, c'est la chaîne elle-même)**

```bash
npm run typecheck
```

Attendu : **FAIL**
```
components/shell/app-shell.tsx(6,37): error TS1005: ',' expected.
components/shell/app-shell.tsx(6,44): error TS1002: Unterminated string literal.
```

- [ ] **Step 2: Corriger l'apostrophe**

Dans `components/shell/app-shell.tsx`, ligne 6 — remplacer :

```tsx
  { href: '/today', label: 'Aujourd'hui' },
```

par :

```tsx
  { href: '/today', label: "Aujourd'hui" },
```

> Guillemets doubles, pas d'échappement par contre-oblique : c'est ce que Prettier produira de toute façon.

- [ ] **Step 3: Vérifier que typecheck et build passent**

```bash
npm run typecheck && npm run build
```

Attendu : 0 erreur TypeScript, puis `✓ Generating static pages (14/14)`.

- [ ] **Step 4: Constater l'échec de lint après build (D18)**

```bash
npm run lint
```

Attendu : **FAIL** — `next-env.d.ts  3:1  error  Do not use a triple slash reference` .
Ce fichier est régénéré par `next build` avec une référence vers `.next/types/routes.d.ts`, il est déjà dans `.gitignore`, et il n'a pas à être linté.

- [ ] **Step 5: Ignorer `next-env.d.ts`**

Dans `eslint.config.mjs`, remplacer la ligne `ignores` :

```js
  { ignores: ['.next/**', 'node_modules/**', 'public/prototype/**', 'docs/**'] },
```

par :

```js
  { ignores: ['.next/**', 'node_modules/**', 'public/prototype/**', 'docs/**', 'next-env.d.ts'] },
```

- [ ] **Step 6: Vérifier que lint passe**

```bash
npm run lint
```

Attendu : 0 erreur (l'avertissement `import/no-anonymous-default-export` sur `eslint.config.mjs` reste, c'est un warning et il est acceptable).

- [ ] **Step 7: Formater les 30 fichiers en dérive**

```bash
npm run format
git diff --stat
```

Attendu : ~30 fichiers modifiés, uniquement de la mise en forme.

- [ ] **Step 8: Compléter `verify` (D13)**

Dans `package.json`, remplacer :

```json
    "verify": "npm run typecheck && npm run lint && npm run check:messages && npm run test"
```

par :

```json
    "verify": "npm run typecheck && npm run lint && npm run check:messages && npm run test && npm run build && npm run format:check"
```

> `CLAUDE.md` § Définition de terminé et `.claude/commands/verify.md` exigent `build`. La commande qui définit « terminé » doit vérifier ce que « terminé » veut dire.

- [ ] **Step 9: Vérifier la chaîne complète**

```bash
npm run verify
```

Attendu : les six étapes passent, aucune sortie en erreur.

- [ ] **Step 10: Commit**

```bash
git add components/shell/app-shell.tsx eslint.config.mjs package.json
git add -u
git commit -m "fix: apostrophe non échappée bloquant la compilation (D1)

- app-shell.tsx:6 : 'Aujourd'hui' -> \"Aujourd'hui\"
- verify inclut désormais build et format:check (D13)
- eslint ignore next-env.d.ts, régénéré par next build (D18)
- prettier passé sur 30 fichiers en dérive"
```

---

## Task 3: Modèle de données complété

Lève **D14** (entités incomplètes vs leur propre spécification) et **D15** (`weekStart` inimplémentable).

**Files:**
- Modify: `lib/domain/types.ts`
- Modify: `lib/domain/date.ts`
- Create: `tests/unit/date.test.ts`

**Interfaces:**
- Consumes: chaîne verte (Task 2)
- Produces:
  - `type WeekStart = 'mon' | 'sun'`
  - `interface Profile { id, name, handle, glyph, hue, role, since, createdAt, updatedAt, deletedAt? }`
  - `interface ShoppingItem { id, label, done, updatedAt, deletedAt? }`
  - `deletedAt?: string` sur `Habit`, `Task`, `Goal`, `Note`, `Session`, `Profile`, `ShoppingItem`
  - `createdAt`/`updatedAt` sur `Note` et `Session`
  - `startOfWeek(d: Date, weekStart?: WeekStart): Date` exporté depuis `lib/domain/date.ts`

  Les tâches 4 et suivantes, et le Plan 2 (dépôts Dexie), consomment ces signatures.

- [ ] **Step 1: Écrire le test de `startOfWeek` (il échoue)**

Créer `tests/unit/date.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { addDays, dateKey, dow, parseKey, startOfWeek } from '@/lib/domain';

const MER = new Date(2026, 7, 5); // mercredi 5 août 2026 — date figée du dossier

describe('startOfWeek', () => {
  it('remonte au lundi par défaut', () => {
    expect(dateKey(startOfWeek(MER))).toBe('2026-08-03');
  });

  it('remonte au dimanche quand weekStart vaut sun', () => {
    expect(dateKey(startOfWeek(MER, 'sun'))).toBe('2026-08-02');
  });

  it('est idempotent : le début de semaine est son propre début de semaine', () => {
    const lundi = startOfWeek(MER);
    expect(dateKey(startOfWeek(lundi))).toBe(dateKey(lundi));
  });

  it('normalise l’heure à minuit', () => {
    const midi = new Date(2026, 7, 5, 12, 34, 56);
    expect(startOfWeek(midi).getHours()).toBe(0);
    expect(startOfWeek(midi).getMinutes()).toBe(0);
  });

  it('reste cohérent avec dow() sur les sept jours de la semaine', () => {
    const lundi = startOfWeek(MER);
    for (let i = 0; i < 7; i++) {
      const jour = addDays(lundi, i);
      expect(dow(jour)).toBe(i);
      expect(dateKey(startOfWeek(jour))).toBe(dateKey(lundi));
    }
  });
});

describe('parseKey', () => {
  it('rejette une clé vide ou malformée', () => {
    expect(parseKey('')).toBeNull();
    expect(parseKey(null)).toBeNull();
    expect(parseKey('pas-une-date')).toBeNull();
  });

  it('fait l’aller-retour avec dateKey', () => {
    expect(dateKey(parseKey('2026-08-05')!)).toBe('2026-08-05');
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

```bash
npx vitest run tests/unit/date.test.ts
```

Attendu : **FAIL** — `startOfWeek` n'est pas exporté (`No "startOfWeek" export is defined`).

- [ ] **Step 3: Implémenter `startOfWeek`**

Ajouter à la fin de `lib/domain/date.ts` :

```ts
/** 'mon' = semaine commençant lundi (défaut du produit), 'sun' = dimanche. */
export type WeekStart = 'mon' | 'sun';

/** Premier jour de la semaine contenant `d`, à minuit.
 *  `dow()` renvoyant 0 pour lundi, le décalage vers dimanche vaut getDay(). */
export const startOfWeek = (d: Date, weekStart: WeekStart = 'mon'): Date => {
  const base = startOfDay(d);
  const offset = weekStart === 'mon' ? dow(base) : base.getDay();
  return addDays(base, -offset);
};
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

```bash
npx vitest run tests/unit/date.test.ts
```

Attendu : **PASS**, 7 tests.

- [ ] **Step 5: Câbler `WeekStart` dans `Settings`**

Dans `lib/domain/types.ts`, remplacer la ligne de `Settings` :

```ts
  weekStart: 'mon' | 'sun';
```

par :

```ts
  weekStart: WeekStart;
```

et ajouter l'import en tête de fichier (le domaine peut s'importer lui-même) :

```ts
import type { WeekStart } from './date';
```

- [ ] **Step 6: Ajouter `deletedAt` et les horodatages manquants**

Dans `lib/domain/types.ts` :

1. Ajouter `deletedAt?: string;` juste après `updatedAt: string;` dans `Habit`, `Task` et `Goal`.
2. Remplacer l'interface `Session` par :

```ts
export interface Session {
  id: string;
  label: string;
  minutes: number;
  date: DateKey;
  habitId?: string;
  mode: 'pomo' | 'stopwatch' | 'countdown' | 'interval';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
```

3. Remplacer l'interface `Note` par :

```ts
export interface Note {
  id: string;
  kind: 'journal' | 'habit';
  date?: DateKey;
  habitId?: string;
  body: string;
  mood?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
```

> **Pourquoi maintenant.** `03-ARCHITECTURE.md` § 3.4 exige `updatedAt`/`deletedAt` sur toutes les entités **dès la phase 1**, « prérequis de synchronisation même si la phase 6 n'est jamais faite ». Ajouter ces champs coûte cinq lignes avant la première donnée écrite, et une migration de données après.

- [ ] **Step 7: Ajouter les entités manquantes**

Toujours dans `lib/domain/types.ts`, ajouter avant `LogIndex` :

```ts
/** Profil utilisateur. Le prototype en gère plusieurs (`profiles` / `pid`).
 *  `hue` et `glyph` alimentent l'avatar génératif OKLCH. */
export interface Profile {
  id: string;
  name: string;
  handle: string;
  glyph: string;
  /** teinte OKLCH, 0–360 */
  hue: number;
  role: number;
  since: DateKey;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/** Article de la liste de courses (`shop` dans le prototype — clé figée). */
export interface ShoppingItem {
  id: string;
  label: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
```

- [ ] **Step 8: Vérifier la chaîne complète**

```bash
npm run verify
```

Attendu : vert. Les 9 tests existants + les 7 nouveaux passent ; aucun type cassé (les champs ajoutés sont optionnels ou sur des entités non encore instanciées).

- [ ] **Step 9: Commit**

```bash
git add lib/domain/types.ts lib/domain/date.ts tests/unit/date.test.ts
git commit -m "feat(domain): compléter le modèle et implémenter startOfWeek

- Profile et ShoppingItem déclarés (D14)
- deletedAt sur toutes les entités, createdAt/updatedAt sur Note et Session (D14)
- startOfWeek(date, weekStart) : Settings.weekStart devient implémentable (D15)
- 7 tests de date, dont la cohérence dow() sur les sept jours"
```

---

## Task 4: Brancher les 62 valeurs de référence sur Vitest

Lève **D4** — le défaut le plus important du dossier après les jetons : la spécification exécutable
du projet n'est comparée à rien en TypeScript.

**Files:**
- Create: `tests/fixtures/demo-seed.ts`
- Create: `tests/unit/golden.test.ts`
- Modify: `tests/README.md` (l'affirmation « consommées par les deux » devient vraie)

**Interfaces:**
- Consumes: `lib/domain` (Task 3), `tests/fixtures/golden.json` (existant, non modifié)
- Produces:
  - `DEMO_NOW: Date` — 2026-08-05
  - `demoHabits(): Habit[]` — les 6 habitudes de démonstration
  - `demoTasks(): Task[]` — les 8 tâches de démonstration
  - `demoSessions(): Session[]` — les 4 sessions de démonstration
  - `demoLogIndex(): LogIndex` — journal matérialisé, déterministe

- [ ] **Step 1: Créer le fixture du jeu de démonstration**

Créer `tests/fixtures/demo-seed.ts` :

```ts
/* ==========================================================================
 * JEU DE DÉMONSTRATION — USAGE TEST UNIQUEMENT.
 *
 * Ce fichier contient le SEUL générateur toléré par CLAUDE.md § 3, et il ne
 * doit JAMAIS être importé depuis lib/, app/ ou components/. Il reconstitue
 * le jeu de démonstration du prototype (HB0, demoTasks, sessions) et rejoue
 * materialize() à l'identique, pour que tests/unit/golden.test.ts puisse
 * comparer le portage TypeScript aux 62 valeurs de tests/fixtures/golden.json.
 *
 * Porté sans modification de public/prototype/Habitum.dc.html :
 *   rnd()         hachage FNV-1a
 *   materialize() historique généré sur N_MAT jours
 * ========================================================================== */
import {
  addDays,
  dailyTarget,
  dateKey,
  isScheduled,
  logKey,
  type Habit,
  type LogIndex,
  type Session,
  type Task,
} from '@/lib/domain';

/** Date figée du dossier : mercredi 5 août 2026. `golden.json._meta.fixedDate`. */
export const DEMO_NOW = new Date(2026, 7, 5);

/** Profondeur de l'historique généré. `NMAT` du prototype. */
export const N_MAT = 180;

/** Hachage FNV-1a du prototype — déterministe, sans état. */
export const rnd = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
};

/** Taux de réussite visé par habitude (champ `rate` de HB0, hors modèle produit). */
export const DEMO_RATES: Record<string, number> = {
  alc: 0.94,
  water: 0.64,
  read: 0.7,
  run: 0.83,
  med: 0.78,
  film: 0.55,
};

const ISO = '2026-08-05T00:00:00.000Z';

const h = (over: Partial<Habit> & Pick<Habit, 'id' | 'name' | 'category' | 'goal' | 'days'>): Habit => ({
  mode: 'dow',
  subItems: [],
  reminders: [],
  archived: false,
  note: '',
  createdAt: ISO,
  updatedAt: ISO,
  ...over,
});

/** Les six habitudes de `HB0`, transposées au modèle cible. */
export const demoHabits = (): Habit[] => [
  h({ id: 'alc', name: "Ne pas boire d'alcool", category: 'health', days: [0, 1, 2, 3, 4, 5, 6],
      goal: { kind: 'check', target: 1, step: 1, unit: '' } }),
  h({ id: 'water', name: "Boire 8 verres d'eau", category: 'health', days: [0, 1, 2, 3, 4, 5, 6],
      goal: { kind: 'count', target: 8, step: 1, unit: 'verres' } }),
  h({ id: 'read', name: 'Lire au moins 20 pages', category: 'study', days: [0, 2, 3, 6],
      goal: { kind: 'count', target: 20, step: 1, unit: 'pages' } }),
  h({ id: 'run', name: 'Courir au moins 3 km', category: 'sport', days: [1, 2, 5, 6],
      goal: { kind: 'count', target: 3, step: 1, unit: 'km' } }),
  h({ id: 'med', name: 'Méditer', category: 'mind', days: [0, 1, 2, 3, 4, 5, 6],
      goal: { kind: 'time', target: 15, step: 1, unit: 'min' } }),
  h({ id: 'film', name: 'Regarder un film', category: 'home', days: [4, 5],
      goal: { kind: 'check', target: 1, step: 1, unit: '' } }),
];

const D = (n: number): string => dateKey(addDays(DEMO_NOW, n));

const t = (
  id: string, name: string, category: Task['category'], offset: number,
  time: string, priority: Task['priority'], done: boolean,
  subTasks: Task['subTasks'] = [],
): Task => ({
  id, name, category, date: D(offset), time, duration: 60, priority, done,
  subTasks, note: '', createdAt: ISO, updatedAt: ISO,
});

/** Les huit tâches de `demoTasks()`. */
export const demoTasks = (): Task[] => [
  t('t1', 'Réunion de travail', 'work', 0, '10:00', 3, true),
  t('t2', 'Cours de guitare', 'mind', 0, '16:00', 2, false),
  t('t3', 'Promener le chien', 'home', 0, '20:00', 1, false),
  t('t4', 'Préparer la revue trimestrielle', 'work', 2, '09:00', 3, false, [
    { label: 'Consolider les chiffres', done: true },
    { label: 'Relire le rapport', done: false },
    { label: 'Envoyer aux associés', done: false },
  ]),
  t('t5', 'Rendez-vous dentiste', 'health', 3, '09:15', 2, false),
  t('t6', 'Payer le loyer', 'home', 5, '12:00', 3, false),
  t('t7', 'Rédiger le chapitre 4', 'study', 1, '18:30', 2, false),
  t('t8', 'Sauvegarder les photos', 'home', -1, '21:00', 1, true),
];

const s = (id: string, label: string, minutes: number, offset: number): Session => ({
  id, label, minutes, date: D(offset), mode: 'pomo', createdAt: ISO, updatedAt: ISO,
});

/** Les quatre sessions de focus du jeu de démonstration. */
export const demoSessions = (): Session[] => [
  s('s1', 'Méditer', 15, 0),
  s('s2', 'Lecture profonde', 45, 0),
  s('s3', 'Rédaction', 50, -1),
  s('s4', 'Course', 28, -1),
];

/** Journal du jeu de démonstration : les 4 entrées du jour, puis materialize()
 *  sur les N_MAT jours précédents. Strictement déterministe. */
export const demoLogIndex = (): LogIndex => {
  const log = new Map<string, number>();
  const today = dateKey(DEMO_NOW);
  log.set(logKey('alc', today), 1);
  log.set(logKey('med', today), 15);
  log.set(logKey('water', today), 5);
  log.set(logKey('run', today), 3);

  for (const habit of demoHabits()) {
    const rate = DEMO_RATES[habit.id] ?? 0.7;
    for (let i = 1; i <= N_MAT; i++) {
      const d = addDays(DEMO_NOW, -i);
      const k = logKey(habit.id, dateKey(d));
      if (log.has(k)) continue;
      if (!isScheduled(habit, d, DEMO_NOW)) continue;
      const r = rnd(habit.id + dateKey(d));
      const tg = dailyTarget(habit);
      log.set(k, r < rate ? tg : Math.round(tg * r * 0.5));
    }
  }
  return log;
};
```

- [ ] **Step 2: Écrire le test des 62 valeurs (il échoue)**

Créer `tests/unit/golden.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import golden from '@/tests/fixtures/golden.json';
import {
  addDays,
  bestStreak,
  completionRate,
  currentStreak,
  dailyTarget,
  dayRatio,
  focusMinutes,
  isDone,
  isScheduled,
  sumValues,
} from '@/lib/domain';
import {
  DEMO_NOW,
  demoHabits,
  demoLogIndex,
  demoSessions,
  demoTasks,
} from '@/tests/fixtures/demo-seed';

/* Les 62 valeurs de référence SONT la spécification (CLAUDE.md § 4).
   Un écart signale une erreur du portage ou du fixture — jamais de golden.json. */

const habits = demoHabits();
const tasks = demoTasks();
const sessions = demoSessions();
const log = demoLogIndex();

describe('golden.json — métadonnées', () => {
  it('porte la date figée et six habitudes', () => {
    expect(golden._meta.fixedDate).toBe('2026-08-05');
    expect(golden._meta.habits).toBe(6);
    expect(habits).toHaveLength(6);
  });
});

describe('golden.json — les six habitudes, neuf mesures chacune', () => {
  for (const habit of demoHabits()) {
    const expected = (golden as Record<string, never>)[`habit.${habit.id}`] as unknown as {
      target: number; streak: number; best: number;
      pct7: number; pct30: number; pct90: number; sum30: number;
      scheduledToday: boolean; doneToday: boolean;
    };

    describe(habit.id, () => {
      it('target', () => expect(dailyTarget(habit)).toBe(expected.target));
      it('streak', () => expect(currentStreak(log, habit, DEMO_NOW)).toBe(expected.streak));
      it('best', () => expect(bestStreak(log, habit, DEMO_NOW)).toBe(expected.best));
      it('pct7', () => expect(completionRate(log, habit, 7, DEMO_NOW)).toBe(expected.pct7));
      it('pct30', () => expect(completionRate(log, habit, 30, DEMO_NOW)).toBe(expected.pct30));
      it('pct90', () => expect(completionRate(log, habit, 90, DEMO_NOW)).toBe(expected.pct90));
      it('sum30', () => expect(sumValues(log, habit, 30, DEMO_NOW)).toBe(expected.sum30));
      it('scheduledToday', () =>
        expect(isScheduled(habit, DEMO_NOW, DEMO_NOW)).toBe(expected.scheduledToday));
      it('doneToday', () =>
        expect(isDone(log, habit, DEMO_NOW, DEMO_NOW)).toBe(expected.doneToday));
    });
  }
});

describe('golden.json — mesures globales', () => {
  /** 30 entrées « planifiés/réussis », du jour courant vers le passé. */
  const ratios = Array.from({ length: 30 }, (_, i) => {
    const r = dayRatio(log, habits, tasks, addDays(DEMO_NOW, -i), DEMO_NOW);
    return `${r.scheduled}/${r.done}`;
  }).join(' ');

  it('dayRatios30', () => {
    expect(ratios).toBe(golden['global.dayRatios30']);
  });

  it('perfectDays30', () => {
    const perfect = Array.from({ length: 30 }, (_, i) =>
      dayRatio(log, habits, tasks, addDays(DEMO_NOW, -i), DEMO_NOW),
    ).filter((r) => r.scheduled > 0 && r.ratio === 1).length;
    expect(perfect).toBe(golden['global.perfectDays30']);
  });

  it('focusMin30', () =>
    expect(focusMinutes(sessions, 30, DEMO_NOW)).toBe(golden['global.focusMin30']));

  it('focusMin7', () =>
    expect(focusMinutes(sessions, 7, DEMO_NOW)).toBe(golden['global.focusMin7']));

  it('tasksOpen', () =>
    expect(tasks.filter((x) => !x.done)).toHaveLength(golden['global.tasksOpen']));

  it('journalSeedIsEmpty — aucun faux contenu généré (E2)', () => {
    expect(golden['global.journalSeedIsEmpty']).toBe(true);
  });
});
```

- [ ] **Step 3: Lancer le test pour vérifier qu'il échoue**

```bash
npx vitest run tests/unit/golden.test.ts
```

Attendu : **FAIL** — `tests/fixtures/demo-seed.ts` n'existe pas encore si l'étape 1 n'a pas été enregistrée, sinon des écarts de valeurs. Le premier passage sert de constat, pas de validation.

- [ ] **Step 4: Autoriser l'import de `tests/` par l'alias `@`**

`vitest.config.ts` fait déjà pointer `@` sur la racine ; `tsconfig.json` aussi. Vérifier qu'aucune erreur de résolution n'apparaît :

```bash
npm run typecheck
```

Attendu : 0 erreur. Si `resolveJsonModule` bloquait l'import de `golden.json`, il est déjà à `true` dans `tsconfig.json` — rien à changer.

- [ ] **Step 5: Faire converger le fixture jusqu'à 62/62**

```bash
npx vitest run tests/unit/golden.test.ts --reporter=verbose
```

Pour chaque écart, dans cet ordre de suspicion :

1. **Le fixture** — une habitude mal transposée (jours, cible, unité), un décalage de date, un `rate` erroné.
2. **L'ordre de `dayRatios30`** — les 30 entrées vont **du jour courant vers le passé** (la première, `8/4`, correspond au 5 août : 5 habitudes planifiées + 3 tâches datées du jour = 8 ; `alc`, `med`, `run` et la tâche `t1` faites = 4).
3. **Le portage** — dernier suspect, et seulement si un écart résiste aux deux premiers. Dans ce cas, c'est `lib/domain/` qui a tort, jamais `golden.json` (CLAUDE.md § 4).

**Ne jamais modifier `tests/fixtures/golden.json`.**

- [ ] **Step 6: Vérifier que tout passe**

```bash
npx vitest run
```

Attendu : **PASS** — `tests/unit/domain.test.ts` (9), `tests/unit/date.test.ts` (7), `tests/unit/golden.test.ts` (**62**).

- [ ] **Step 7: Rendre vraie l'affirmation de `tests/README.md`**

Dans `tests/README.md`, remplacer la ligne :

```
| `fixtures/golden.json` | Les 62 valeurs de référence du prototype | consommées par les deux |
```

par :

```
| `fixtures/golden.json` | Les 62 valeurs de référence du prototype | `tests/unit/golden.test.ts` (Vitest) **et** `public/prototype/tests/domain.test.html` (navigateur) |
| `fixtures/demo-seed.ts` | Jeu de démonstration reconstitué — **usage test uniquement** | idem |
```

- [ ] **Step 8: Commit**

```bash
git add tests/fixtures/demo-seed.ts tests/unit/golden.test.ts tests/README.md
git commit -m "test: brancher les 62 valeurs de référence sur Vitest (D4)

La spécification exécutable du projet n'était comparée à rien côté TypeScript.
tests/fixtures/demo-seed.ts reconstitue le jeu de démonstration (générateur
marqué, usage test uniquement, CLAUDE.md § 3) et golden.test.ts compare les
62 mesures à chaque commit.

golden.json n'est pas modifié."
```

---

## Task 5: Régénérer les jetons de design par extraction

Lève **D3** — le défaut dont le coût croît avec chaque vue portée.

`styles/tokens.css` déclare `--fg`, `--fg-dim`, `--accent`, `--accent-hi`, `--bg-2` avec des valeurs
inventées, alors que le prototype et `docs/handoff/04-DESIGN-TOKENS.md` utilisent `--txt`, `--txt2`,
`--mut`, `--acc`, `--acc2`, `--acc3`, `--panel2`, `--line2`, `--glow`, `--bg2`. Sept jetons majeurs
manquent, dont `--mut` (180 usages), `--acc2` (155) et `--glow` (65). Aucune valeur ne coïncide.

**Files:**
- Create: `scripts/extract-tokens.mjs`
- Modify: `styles/tokens.css` (régénéré)
- Modify: `styles/globals.css` (noms de jetons)
- Modify: `components/shell/app-shell.tsx`, `components/port-status.tsx` (noms de jetons)
- Modify: `app/layout.tsx` (`themeColor`)
- Create: `tests/unit/tokens.test.ts`

**Interfaces:**
- Consumes: `public/prototype/Habitum.dc.html` (lecture seule)
- Produces: `styles/tokens.css` avec, pour `:root` et les trois `[data-theme]`, exactement les jetons du prototype. Le Plan 4 (primitives UI) et le Plan 5 (les 11 vues) s'écrivent dessus.

- [ ] **Step 1: Écrire le test anti-dérive (il échoue)**

Créer `tests/unit/tokens.test.ts` :

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/* D3 : styles/tokens.css avait été écrit à la main, avec des noms et des valeurs
   qui ne correspondaient ni au prototype ni à 04-DESIGN-TOKENS.md. Ce test rend
   la dérive impossible : les jetons sont EXTRAITS, jamais rédigés. */

const THEMES = ['neural', 'plasma', 'clinical'] as const;

/** Extrait `--nom:valeur` d'un bloc CSS mono-ligne. */
const parseBlock = (block: string): Map<string, string> => {
  const out = new Map<string, string>();
  for (const m of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;}]+)/gi)) {
    out.set(m[1]!.trim(), m[2]!.trim());
  }
  return out;
};

/** Récupère le bloc d'un sélecteur, guillemets d'attribut tolérés. */
const blockOf = (css: string, selector: string): string => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${esc}\\s*\\{([^}]*)\\}`, 'i');
  const m = css.match(re);
  if (!m) throw new Error(`Sélecteur introuvable : ${selector}`);
  return m[1]!;
};

const proto = readFileSync('public/prototype/Habitum.dc.html', 'utf8');
const tokens = readFileSync('styles/tokens.css', 'utf8');

describe('styles/tokens.css est extrait du prototype, pas rédigé', () => {
  it(':root reprend les jetons de :root du prototype', () => {
    const attendu = parseBlock(blockOf(proto, ':root'));
    const obtenu = parseBlock(blockOf(tokens, ':root'));
    expect(attendu.size).toBeGreaterThan(10);
    for (const [nom, valeur] of attendu) {
      expect(obtenu.get(nom), `jeton --${nom} de :root`).toBe(valeur);
    }
  });

  for (const theme of THEMES) {
    it(`[data-theme=${theme}] reprend les jetons du prototype`, () => {
      const attendu = parseBlock(blockOf(proto, `\\[data-theme=${theme}\\]`));
      const obtenu = parseBlock(blockOf(tokens, `\\[data-theme='${theme}'\\]`));
      expect(attendu.size).toBeGreaterThan(0);
      for (const [nom, valeur] of attendu) {
        expect(obtenu.get(nom), `jeton --${nom} du thème ${theme}`).toBe(valeur);
      }
    });
  }

  it('aucun jeton utilisé par le prototype n’est absent de tokens.css', () => {
    const utilises = new Set(
      [...proto.matchAll(/var\(--([a-z0-9-]+)\)/gi)].map((m) => m[1]!),
    );
    const declares = parseBlock(blockOf(tokens, ':root'));
    const manquants = [...utilises].filter((n) => !declares.has(n));
    expect(manquants, `jetons utilisés mais non déclarés : ${manquants.join(', ')}`).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

```bash
npx vitest run tests/unit/tokens.test.ts
```

Attendu : **FAIL** — `jeton --bg de :root: expected '#08090d' to be '#04060d'`, puis la liste des jetons manquants (`txt`, `txt2`, `mut`, `acc`, `acc2`, `acc3`, `panel2`, `line2`, `glow`, `bg2`).

- [ ] **Step 3: Écrire le générateur**

Créer `scripts/extract-tokens.mjs` :

```js
#!/usr/bin/env node
/* Génère styles/tokens.css par EXTRACTION de public/prototype/Habitum.dc.html.
   D3 : la version précédente était rédigée à la main, avec des noms et des
   valeurs qui n'existaient nulle part ailleurs. Les jetons ne se rédigent pas.

   Usage : node scripts/extract-tokens.mjs        (écrit styles/tokens.css)
           node scripts/extract-tokens.mjs --check (échoue si le fichier a dérivé) */
import { readFileSync, writeFileSync } from 'node:fs';

const THEMES = ['neural', 'plasma', 'clinical'];
const proto = readFileSync('public/prototype/Habitum.dc.html', 'utf8');

const blockOf = (selector) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = proto.match(new RegExp(`${esc}\\s*\\{([^}]*)\\}`, 'i'));
  if (!m) throw new Error(`Sélecteur introuvable dans le prototype : ${selector}`);
  return m[1];
};

const decls = (block) =>
  [...block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;}]+)/gi)].map(([, k, v]) => [k, v.trim()]);

const render = (selector, block) =>
  `${selector} {\n${decls(block).map(([k, v]) => `  --${k}: ${v};`).join('\n')}\n}`;

const out = [
  '/* --------------------------------------------------------------------------',
  '   Habitum — jetons de thème.',
  '   FICHIER GÉNÉRÉ — ne pas éditer à la main.',
  '   Source : public/prototype/Habitum.dc.html',
  '   Régénérer : node scripts/extract-tokens.mjs',
  '   Vérifié par : tests/unit/tokens.test.ts',
  '   Décision B1 : l’application reste sombre, Modernist est réservé à la',
  '   vitrine et à la documentation (docs/handoff/07-DECISION-B1.md).',
  '   -------------------------------------------------------------------------- */',
  '',
  render(':root', blockOf(':root')),
  ...THEMES.map((t) => render(`[data-theme='${t}']`, blockOf(`\\[data-theme=${t}\\]`))),
  '',
  '/* Typographie — les familles sont chargées par next/font (voir lib/fonts.ts). */',
  ':root {',
  "  --font-ui: var(--font-space-grotesk), system-ui, sans-serif;",
  "  --font-mono: var(--font-jetbrains-mono), ui-monospace, monospace;",
  '}',
  '',
].join('\n');

if (process.argv.includes('--check')) {
  const actuel = readFileSync('styles/tokens.css', 'utf8');
  if (actuel !== out) {
    console.error('styles/tokens.css a dérivé du prototype. Lancer : node scripts/extract-tokens.mjs');
    process.exit(1);
  }
  console.log('OK — tokens.css conforme au prototype.');
} else {
  writeFileSync('styles/tokens.css', out);
  console.log(`OK — tokens.css régénéré (${THEMES.length + 1} blocs).`);
}
```

- [ ] **Step 4: Générer et inspecter**

```bash
node scripts/extract-tokens.mjs
cat styles/tokens.css
```

Attendu : `:root` contient `--bg: #04060d`, `--txt: #eaf2ff`, `--mut: #69809f`, `--acc: #4d7cff`,
`--acc2: #22e0d0`, `--glow: 77,124,255`, etc. Les trois thèmes suivent.

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

```bash
npx vitest run tests/unit/tokens.test.ts
```

Attendu : **PASS**, 5 tests.

- [ ] **Step 6: Réaligner les consommateurs sur les nouveaux noms**

`--fg`, `--fg-dim`, `--accent`, `--accent-hi`, `--bg-2` n'existent plus. Remplacer partout :

| Ancien | Nouveau |
|---|---|
| `var(--fg)` | `var(--txt)` |
| `var(--fg-dim)` | `var(--mut)` |
| `var(--accent)` | `var(--acc)` |
| `var(--accent-hi)` | `var(--acc2)` |
| `var(--bg-2)` | `var(--bg2)` |

Dans `styles/globals.css` :

```css
html,
body {
  margin: 0;
  background: var(--bg);
  color: var(--txt);
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
}

a {
  color: var(--acc);
  text-decoration: none;
}
a:hover {
  color: var(--acc2);
}

:focus-visible {
  outline: 2px solid var(--acc);
  outline-offset: 2px;
}
```

Dans `components/shell/app-shell.tsx` : `var(--line)` reste (le jeton existe), `var(--fg-dim)` → `var(--mut)`.
Dans `components/port-status.tsx` : les deux `var(--fg-dim)` → `var(--mut)`.

Dans `app/layout.tsx`, aligner la couleur de thème sur la vraie valeur :

```tsx
export const viewport: Viewport = {
  themeColor: '#04060d',
  width: 'device-width',
  initialScale: 1,
};
```

- [ ] **Step 7: Vérifier qu'aucun ancien nom ne subsiste**

```bash
grep -rn -- "--fg\b\|--fg-dim\|--accent\|--bg-2" app components styles || echo "aucun jeton obsolète"
```

Attendu : `aucun jeton obsolète`.

- [ ] **Step 8: Ajouter le contrôle à `verify`**

Dans `package.json`, ajouter le script et l'insérer dans `verify` :

```json
    "check:tokens": "node scripts/extract-tokens.mjs --check",
    "verify": "npm run typecheck && npm run lint && npm run check:messages && npm run check:tokens && npm run test && npm run build && npm run format:check"
```

- [ ] **Step 9: Vérifier la chaîne complète**

```bash
npm run verify
```

Attendu : vert, `check:tokens` inclus.

> Si `format:check` signale `styles/tokens.css`, ajouter `styles/tokens.css` à `.prettierignore` : c'est un fichier généré, sa mise en forme appartient au générateur.

- [ ] **Step 10: Commit**

```bash
git add scripts/extract-tokens.mjs styles/ tests/unit/tokens.test.ts package.json app/layout.tsx components/
git commit -m "fix(design): régénérer les jetons par extraction du prototype (D3)

tokens.css avait été rédigé à la main : noms et valeurs sans rapport avec le
prototype ni avec 04-DESIGN-TOKENS.md. Sept jetons majeurs manquaient, dont
--mut (180 usages), --acc2 (155) et --glow (65). Aucune valeur ne coïncidait.

- scripts/extract-tokens.mjs génère tokens.css depuis le prototype
- tests/unit/tokens.test.ts rend la dérive impossible
- check:tokens ajouté à verify
- consommateurs réalignés sur les noms réels"
```

---

## Task 6: Corriger le mode `every` sans date de début

Lève **D16**. Bug **hérité** du prototype et porté fidèlement : une habitude « tous les N jours »
sans `start` prend `aujourd'hui − 182 jours` comme origine du cycle. L'origine avançant d'un jour
par jour, la **phase du cycle se décale quotidiennement** : une habitude « tous les 2 jours »
change de jours planifiés chaque jour.

**Files:**
- Modify: `lib/domain/schedule.ts`
- Modify: `public/prototype/Habitum.dc.html` (report — règle CLAUDE.md § 7)
- Modify: `docs/handoff/reference/domain-logic-extract.js` (régénération obligatoire)
- Modify: `tests/unit/domain.test.ts`

**Interfaces:**
- Consumes: `isScheduled` (inchangé de signature)
- Produces: `isScheduled` déterministe pour `mode: 'every'` sans `start`. Aucune signature ne change.

- [ ] **Step 1: Écrire le test qui expose le bug**

Ajouter à la fin de `tests/unit/domain.test.ts` :

```ts
describe("mode 'every' — la planification ne doit pas dépendre du jour où on la calcule", () => {
  const tousLes2Jours = habit({ mode: 'every', interval: 2, days: [] });

  it('donne le même résultat pour une date donnée, quel que soit le « maintenant »', () => {
    const cible = new Date(2026, 6, 15); // 15 juillet 2026
    const auMercredi = isScheduled(tousLes2Jours, cible, NOW);
    const auLendemain = isScheduled(tousLes2Jours, cible, addDays(NOW, 1));
    const dansUnMois = isScheduled(tousLes2Jours, cible, addDays(NOW, 30));
    expect(auLendemain).toBe(auMercredi);
    expect(dansUnMois).toBe(auMercredi);
  });

  it("respecte l'intervalle depuis start quand start est fourni", () => {
    const h = habit({ mode: 'every', interval: 3, days: [], start: '2026-08-01' });
    expect(isScheduled(h, new Date(2026, 7, 1), NOW)).toBe(true);  // J+0
    expect(isScheduled(h, new Date(2026, 7, 2), NOW)).toBe(false); // J+1
    expect(isScheduled(h, new Date(2026, 7, 4), NOW)).toBe(true);  // J+3
    expect(isScheduled(h, new Date(2026, 6, 31), NOW)).toBe(false); // avant start
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

```bash
npx vitest run tests/unit/domain.test.ts
```

Attendu : **FAIL** sur le premier cas — `expected false to be true` (ou l'inverse) : la valeur bascule d'un jour à l'autre.

- [ ] **Step 3: Corriger le domaine**

Dans `lib/domain/schedule.ts`, remplacer le bloc `if (mode === 'every')` :

```ts
  if (mode === 'every') {
    const base = h.start ? new Date(`${h.start}T00:00:00`) : addDays(now, -182);
    const diff = Math.round((d.getTime() - base.getTime()) / 86_400_000);
    return diff >= 0 && diff % Math.max(1, h.interval || 2) === 0;
  }
```

par :

```ts
  if (mode === 'every') {
    /* D16 — l'origine du cycle doit être STABLE. Le prototype prenait
       `aujourd'hui − 182 j` en l'absence de `start` : l'origine avançant avec
       le jour courant, la phase du cycle se décalait quotidiennement. À défaut
       de `start`, on ancre sur la création de l'habitude, puis sur l'époque. */
    const anchor = h.start ?? (h.createdAt ? dateKey(new Date(h.createdAt)) : EVERY_EPOCH);
    const base = new Date(`${anchor}T00:00:00`);
    const diff = Math.round((d.getTime() - base.getTime()) / 86_400_000);
    return diff >= 0 && diff % Math.max(1, h.interval || 2) === 0;
  }
```

et ajouter en tête du fichier, sous les imports :

```ts
/** Origine de repli du mode 'every' quand ni `start` ni `createdAt` ne sont
 *  exploitables. Valeur figée : elle ne doit jamais dépendre du jour courant. */
export const EVERY_EPOCH = '2020-01-01';
```

> `createdAt` vaut `''` sur les habitudes du fixture de test : `new Date('')` produit une date invalide. Le garde `h.createdAt ? … : EVERY_EPOCH` ne suffit donc pas pour une chaîne vide — elle est falsy, le repli s'applique. Pour une chaîne ISO valide, `dateKey` la ramène à `YYYY-MM-DD`.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run
```

Attendu : **PASS** — les tests du mode `every` passent, **et les 62 valeurs de référence sont inchangées** (aucune habitude de démonstration n'utilise le mode `every` : c'est la preuve que la correction ne régresse rien).

- [ ] **Step 5: Reporter la correction dans le prototype (CLAUDE.md § 7)**

Dans `public/prototype/Habitum.dc.html`, dans `sched_`, remplacer :

```js
      const b=h.start?new Date(h.start+'T00:00:00'):this.add(this.today(),-182);
```

par :

```js
      /* D16 - l'origine du cycle doit etre stable : `today()-182` la faisait
         glisser d'un jour chaque jour. Repli sur une epoque figee. */
      const b=new Date((h.start||'2020-01-01')+'T00:00:00');
```

- [ ] **Step 6: Vérifier que les six contrôles du prototype restent verts**

Ouvrir `public/prototype/tests/domain.test.html` dans un navigateur.
Attendu : **six contrôles verts**, 62/62 valeurs conformes.

- [ ] **Step 7: Régénérer l'extrait de référence**

Dans `docs/handoff/reference/domain-logic-extract.js`, reporter la même modification dans `sched_`
(le fichier est un extrait annoté du prototype : il doit rester le miroir exact du moteur).

- [ ] **Step 8: Vérifier la chaîne complète**

```bash
npm run verify
```

Attendu : vert.

- [ ] **Step 9: Commit**

```bash
git add lib/domain/schedule.ts tests/unit/domain.test.ts public/prototype/Habitum.dc.html docs/handoff/reference/domain-logic-extract.js
git commit -m "fix(domain): ancrer le mode 'every' sur une origine stable (D16)

Sans date de début, l'origine du cycle valait « aujourd'hui − 182 jours » :
elle avançait d'un jour par jour, et une habitude « tous les 2 jours »
changeait de jours planifiés quotidiennement.

Corrigé dans lib/domain, reporté dans le prototype et dans l'extrait de
référence (CLAUDE.md § 7). Les 62 valeurs sont inchangées : aucune habitude
de démonstration n'utilise ce mode — c'est ce qui l'avait laissé passer."
```

---

## Task 7: Trancher `date-fns`

Lève **D17**. `date-fns` est déclarée en dépendance de production et n'est importée nulle part ;
`lib/domain/date.ts` est écrit à la main, juste, testé et pur.

**Décision retenue : retirer `date-fns`.** Le domaine n'a pas besoin d'une bibliothèque de dates ;
il a besoin de rester pur et sans dépendance. La tâche `T1.2` du backlog, qui prescrivait
`date-fns`, est corrigée en tâche 8.

> Si vous préférez conserver `date-fns` (formats localisés à venir en Plan 4), **ne pas exécuter
> cette tâche** : la réintroduire plus tard coûte une ligne, la retirer maintenant est réversible.

**Files:**
- Modify: `package.json`
- Create: `docs/adr/0006-helpers-de-date-maison.md`

**Interfaces:**
- Consumes: rien
- Produces: rien (suppression d'une dépendance inutilisée)

- [ ] **Step 1: Vérifier qu'aucun import n'existe**

```bash
grep -rn "date-fns" app components lib i18n tests types scripts || echo "aucun import"
```

Attendu : `aucun import`. Si un import apparaît, **s'arrêter** : la décision doit être revue.

- [ ] **Step 2: Retirer la dépendance**

```bash
npm uninstall date-fns
```

- [ ] **Step 3: Écrire l'ADR**

Créer `docs/adr/0006-helpers-de-date-maison.md` :

```markdown
# ADR 0006 — Helpers de date maison, sans bibliothèque

- **Statut** : accepté · 2026-08-06

## Décision

`lib/domain/date.ts` reste écrit à la main. `date-fns`, déclarée en dépendance mais jamais
importée, est retirée.

## Pourquoi

- Le domaine tient en sept fonctions (`startOfDay`, `today`, `addDays`, `dateKey`, `parseKey`,
  `dow`, `daysBetween`, `startOfWeek`), toutes testées, toutes pures.
- `lib/domain/` ne doit dépendre de rien (CLAUDE.md § 2). Une bibliothèque de dates y introduirait
  une dépendance dans la couche qui doit en avoir le moins.
- `dateKey()` doit produire une clé **en heure locale** — `toISOString()` décalerait d'un jour.
  C'est exactement le genre de subtilité qu'une bibliothèque générique invite à perdre de vue.
- Une dépendance de production non importée pèse dans `npm ci`, dans l'audit de licences et dans
  la surface de vulnérabilité, sans rien rendre.

## Conséquences

- Les **formats de date localisés** (FR/EN) restent à faire. Ils appartiennent à la couche de
  présentation, pas au domaine : `Intl.DateTimeFormat`, natif, y suffit — sans dépendance.
- La tâche `T1.2` du backlog, qui prescrivait `date-fns`, est corrigée.
- Si un besoin réel de fuseaux horaires apparaît (il n'y en a pas aujourd'hui : tout est en heure
  locale), cette décision est à rouvrir.
```

- [ ] **Step 4: Vérifier la chaîne complète**

```bash
npm run verify
```

Attendu : vert.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json docs/adr/0006-helpers-de-date-maison.md
git commit -m "chore: retirer date-fns, jamais importée (D17)

Le domaine tient en huit fonctions de date pures et testées, et lib/domain/
ne doit dépendre de rien. Décision tracée en ADR-0006 ; T1.2 corrigée."
```

---

## Task 8: Corriger les documents que le code contredit

Lève **D5** (le plus grave : le document de référence contient le bug qui a déjà détruit des données),
**D20**, **D21**, **D22**.

**Files:**
- Modify: `docs/handoff/03-ARCHITECTURE.md`
- Modify: `docs/handoff/02-ROADMAP.md`
- Modify: `docs/handoff/06-BACKLOG.md`
- Modify: `README.md`
- Modify: `docs/PASSATION-CLAUDE-CODE.md`
- Modify: `docs/adr/0002-local-first.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: l'état du code après les tâches 1 à 7
- Produces: aucun document de `docs/` n'affirme quelque chose que le code contredit

- [ ] **Step 1: Corriger `03-ARCHITECTURE.md` § 3 — les sept types (D5)**

Remplacer, dans le bloc de code du modèle de données :

```ts
type GoalKind = 'check'|'total'|'list'|'limit';
```

par :

```ts
/* ⚠ SEPT types d'habitude, pas quatre. Une liste blanche incomplète fait
   disparaître silencieusement des entités ET leur historique — c'est arrivé
   à l'import : 4 habitudes sur 6 perdues (CHANGELOG 2026-08-05).
   Source unique : lib/domain/types.ts. Ne jamais recopier cette liste. */
type HabitGoalKind = 'check'|'count'|'time'|'total'|'list'|'limit'|'exact';
type GoalKind = 'cumul'|'milestones'|'reduce';
```

et dans l'interface `Habit`, remplacer `goal: { kind: GoalKind; …` par `goal: { kind: HabitGoalKind; …`.

- [ ] **Step 2: Corriger `03-ARCHITECTURE.md` § 3 — l'interface `Goal`**

Remplacer :

```ts
interface Goal {
  id: string; name: string; kind: 'cumul'|'reduce';
```

par :

```ts
interface Goal {
  id: string; name: string; kind: 'cumul'|'milestones'|'reduce';
  milestones?: { label: string; done: boolean }[];   // kind = 'milestones'
  window?: number;                                    // fenêtre en jours, kind = 'reduce'
```

- [ ] **Step 3: Corriger `03-ARCHITECTURE.md` § 4 — la complétion**

Dans le pseudo-code de `isDone`, remplacer la ligne d'introduction « les 4 types d'objectif » et
compléter le corps :

```
target = kind==='list'  ? subItems.length||1
       : kind==='total' ? step||1
       : goal.target||1

kind==='limit' : sémantique INVERSÉE — réussi si value <= target,
                 MAIS si date >= aujourd'hui et aucune entrée de journal → non réussi
                 (on ne peut pas déclarer réussi un plafond avant la fin de la journée)
kind==='exact' : réussi si value === target
kind==='total' : réussi si value > 0
sinon ('check', 'count', 'time', 'list') : réussi si value >= target
```

- [ ] **Step 4: Corriger `03-ARCHITECTURE.md` § 1 et § 2 — Neon et arborescence (D20, D21)**

1. Dans le tableau § 1, remplacer la ligne `| Sync (opt.) | **Supabase** | plan gratuit | Postgres 500 Mo + Auth, RLS |` par :

```
| Sync (opt.) | **Neon PostgreSQL** + **Drizzle** + **Auth.js** | plans gratuits | Postgres serverless, branches de base natives, driver HTTP adapté au serverless |
```

2. Remplacer l'arborescence § 2 par celle du dépôt réel :

```
app/                     routes (App Router) : /, /today, /habits, /tasks, /goals,
                         /calendar, /stats, /timer, /notes, /profile, /settings
lib/
  domain/                logique pure, sans React, 100 % testée
    types.ts  date.ts  schedule.ts  metrics.ts  goals.ts  recurrence.ts  cache.ts
  data/                  persistance : db.ts  migrations.ts  seed.ts  repositories/  import.ts
  store/                 Zustand : habits, tasks, goals, timer, notes, settings, ui, undo
components/
  ui/                    primitives sans métier (Panel, Chip, Switch, Sheet…)
  shell/                 coque applicative
  <domaine>/             composants par vue (habits/, calendar/, stats/…)
messages/                fr.json, en.json
styles/                  tokens.css (généré), globals.css
tests/                   unit/  e2e/  fixtures/
```

3. Sous l'arborescence, ajouter :

> **Le dépôt n'a pas de dossier `src/`.** Les chemins `src/…` des versions antérieures de ce
> document et de `06-BACKLOG.md` sont obsolètes.

- [ ] **Step 5: Corriger `02-ROADMAP.md` — phase 6 sur Neon (D20)**

Dans la Phase 6, remplacer les lignes `6.1` et `6.2` :

```
| 6.1 | **Neon PostgreSQL** (plan gratuit) + **Auth.js** par lien magique | `lib/data/remote/` |
| 6.2 | Schéma miroir Drizzle + **RLS par `user_id`** + chiffrement de bout en bout côté client | `drizzle/migrations/` |
```

et dans le tableau « Coût d'exploitation », remplacer les deux lignes Supabase par :

```
| Base distante (opt.) | Neon plan gratuit | 0 € |
| Auth (opt.) | Auth.js auto-hébergé | 0 € |
```

- [ ] **Step 6: Corriger `06-BACKLOG.md` — les chemins (D21)**

Remplacer toutes les occurrences de `src/domain/` par `lib/domain/`, `src/data/` par `lib/data/`,
`src/store/` par `lib/store/`, `src/ui/` par `components/ui/`, `src/components/` par `components/`,
`src/features/` par `components/`, `src/app/` par `app/`, `src/styles/` par `styles/`.

```bash
grep -c "src/" docs/handoff/06-BACKLOG.md
```

Attendu après correction : `0`.

Corriger également `T1.2` (« Utilitaires de date sur `date-fns` ») en « Utilitaires de date sans
dépendance — voir ADR-0006 », et `T1.4` (« couvrant `check`/`total`/`list`/`limit` ») en
« couvrant les **sept** types, dont `limit` inversé et non anticipé ».

- [ ] **Step 7: Corriger `README.md` (D22)**

Remplacer `308 clés` par `311 clés` dans le tableau « Où est quoi ».
Dans le tableau des commandes, remplacer la ligne `verify` par :

```
| **`npm run verify`** | **typecheck · lint · libellés · jetons · tests · build · format — à passer avant toute livraison** |
```

Ajouter une ligne au tableau « Où est quoi » :

```
| `scripts/` | outillage local (contrôle des libellés, **génération des jetons**) |
```

- [ ] **Step 8: Corriger `docs/PASSATION-CLAUDE-CODE.md` (D22)**

Dans « Première demi-heure », remplacer le point 5 :

```
5. `npm run verify` — vert depuis la phase 1 de stabilisation (6 août 2026).
   Il était rouge dans la version initiale du dépôt : une apostrophe non
   échappée dans components/shell/app-shell.tsx bloquait la compilation.
```

Dans « Phase 6 », la mention de Neon est déjà correcte — la laisser.

- [ ] **Step 9: Corriger `docs/adr/0002-local-first.md` (D22)**

Sous « Décision », remplacer la première phrase :

```
Toutes les données vivent sur l'appareil de l'utilisateur : `localStorage` dans le prototype,
**IndexedDB (Dexie)** dans l'application portée. Aucune authentification, aucun appel réseau,
aucune brique payante.
```

Ajouter en fin de « Conséquences » :

```
- Le prototype charge ses polices depuis `fonts.googleapis.com` : c'est un **appel réseau
  résiduel**, contraire à cette décision et problématique au regard du RGPD (transfert d'adresse
  IP vers un tiers). L'application portée auto-héberge ses polices via `next/font` ; le retrait
  côté prototype est suivi sous D8.
```

- [ ] **Step 10: Alimenter le CHANGELOG**

Ajouter en tête de `CHANGELOG.md`, après le titre :

```markdown
## 2026-08-06 — Phase 1 : stabilisation du dépôt de reprise

Aucune fonctionnalité ajoutée. Le dépôt ne compilait pas, n'était pas versionné, ses jetons de
design ne correspondaient pas au prototype, et ses 62 valeurs de référence n'étaient comparées à
rien côté TypeScript.

### Corrigé — bloquant

- **Le dépôt ne compilait pas.** Une apostrophe droite non échappée dans
  `components/shell/app-shell.tsx:6` (`'Aujourd'hui'`) cassait `typecheck`, `lint` et `build` :
  `layout.tsx` important `AppShell`, **toutes les routes** auraient répondu en erreur. (D1)
- **Les jetons de design étaient fabriqués.** `styles/tokens.css` déclarait `--fg`, `--accent`,
  `--bg-2` avec des valeurs sans rapport avec le prototype, dont l'en-tête prétendait pourtant
  qu'elles étaient extraites. Sept jetons majeurs manquaient : `--mut` (180 usages), `--acc2`
  (155), `--glow` (65), `--txt2` (54), `--panel2`, `--line2`, `--acc3`. Toute vue portée dessus
  aurait été visuellement fausse, sans que rien ne le signale. Le fichier est désormais **généré**
  par `scripts/extract-tokens.mjs` et un test rend la dérive impossible. (D3)
- **Le document d'architecture reproduisait un piège déjà payé.** `03-ARCHITECTURE.md` § 3
  déclarait quatre types d'objectif au lieu de sept — exactement le défaut qui avait fait
  disparaître 4 habitudes sur 6 à l'import le 5 août. (D5)

### Ajouté

- **Les 62 valeurs de référence sont vérifiées à chaque commit** (`tests/unit/golden.test.ts`).
  Elles n'étaient consommées que par le harnais navigateur du prototype ; `tests/README.md`
  affirmait le contraire. (D4)
- `startOfWeek(date, weekStart)` : `Settings.weekStart` devient implémentable. (D15)
- `Profile`, `ShoppingItem`, `deletedAt` sur toutes les entités, `createdAt`/`updatedAt` sur
  `Note` et `Session` — prérequis de synchronisation exigé « dès la phase 1 » par
  `03-ARCHITECTURE.md` § 3.4. (D14)
- Dépôt Git, `.gitattributes` (le prototype marqué binaire : c'est une archive). (D2)

### Corrigé — moteur

- **Mode `every` sans date de début.** L'origine du cycle valait « aujourd'hui − 182 jours » :
  elle avançait d'un jour par jour, et une habitude « tous les 2 jours » changeait de jours
  planifiés quotidiennement. Corrigé dans `lib/domain`, **reporté dans le prototype** et dans
  l'extrait de référence. Les 62 valeurs sont inchangées — aucune habitude de démonstration
  n'utilise ce mode, ce qui explique que personne ne l'ait vu. (D16)

### Outillage

- `npm run verify` couvre désormais **typecheck · lint · libellés · jetons · tests · build ·
  format**, conformément à `CLAUDE.md` § Définition de terminé. Il en omettait deux. (D13)
- ESLint ignore `next-env.d.ts`, régénéré par `next build` avec une référence triple-slash qui
  rendait le lint local rouge après toute construction. (D18)
- `date-fns`, déclarée mais jamais importée, retirée — ADR-0006. (D17)

### Documentation

- `02-ROADMAP.md` et `03-ARCHITECTURE.md` : phase 6 sur **Neon**, plus Supabase. (D20)
- `06-BACKLOG.md` : chemins alignés sur l'arborescence réelle, sans `src/`. (D21)
- `README.md` (311 clés, pas 308), `tests/README.md`, `PASSATION-CLAUDE-CODE.md`,
  `adr/0002-local-first.md` : affirmations contredites par le code, corrigées. (D22)
```

- [ ] **Step 11: Vérifier la chaîne complète une dernière fois**

```bash
npm run verify
```

Attendu : **vert sur les sept étapes**.

- [ ] **Step 12: Vérifier que le critère de sortie du plan est atteint**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -20
grep -c "src/" docs/handoff/06-BACKLOG.md
grep -rn "Supabase" docs/handoff/ || echo "plus de Supabase"
node scripts/extract-tokens.mjs --check
git log --oneline
```

Attendu :
- Vitest : **78 tests** (9 domaine + 7 date + 62 golden), tous verts
- `06-BACKLOG.md` : `0` occurrence de `src/`
- `plus de Supabase`
- `OK — tokens.css conforme au prototype.`
- 8 commits

- [ ] **Step 13: Commit**

```bash
git add docs/ README.md CHANGELOG.md
git commit -m "docs: corriger les documents que le code contredit (D5, D20, D21, D22)

- 03-ARCHITECTURE.md : SEPT types d'habitude et TROIS types d'objectif. Le
  document de référence du portage déclarait quatre types — le défaut exact
  qui avait fait disparaître 4 habitudes sur 6 à l'import (D5).
- Phase 6 sur Neon, plus Supabase (D20)
- 06-BACKLOG.md : chemins réels, sans src/ (D21)
- README (311 clés), tests/README, PASSATION, ADR-0002 (D22)
- CHANGELOG : entrée de la phase 1"
```

---

## Critère de sortie du Plan 1

Les cinq conditions, toutes vérifiables par commande :

| # | Condition | Commande |
|---|---|---|
| 1 | `npm run verify` vert sur ses sept étapes | `npm run verify` |
| 2 | **62/62** valeurs de référence conformes, à chaque commit | `npx vitest run tests/unit/golden.test.ts` |
| 3 | `tokens.css` prouvé identique au prototype | `node scripts/extract-tokens.mjs --check` |
| 4 | Aucun document de `docs/` contredit par le code | `grep -c "src/" docs/handoff/06-BACKLOG.md` → `0` ; `grep -rn "Supabase" docs/handoff/` → vide |
| 5 | Dépôt versionné, 8 commits atomiques | `git log --oneline \| wc -l` → `8` |

**À la sortie de ce plan, le Plan 2 (couche de données) peut démarrer.**
Aucune vue ne doit être portée avant.

---

## Auto-revue

**Couverture des défauts de l'audit visés par la phase 1 :**

| Défaut | Tâche | ✓ |
|---|---|---|
| D1 — le dépôt ne compile pas | 2 | ✅ |
| D2 — aucun versionnement | 1 | ✅ |
| D3 — jetons de design faux | 5 | ✅ |
| D4 — oracle débranché | 4 | ✅ |
| D5 — 4 types au lieu de 7 dans l'architecture | 8 | ✅ |
| D13 — `verify` incomplet | 2 | ✅ |
| D14 — modèle incomplet | 3 | ✅ |
| D15 — `weekStart` inimplémentable | 3 | ✅ |
| D16 — bug `every` sans `start` | 6 | ✅ |
| D17 — `date-fns` inutilisée | 7 | ✅ |
| D18 — lint rouge après build | 2 | ✅ |
| D20 — Supabase vs Neon | 8 | ✅ |
| D21 — chemins `src/` inexistants | 8 | ✅ |
| D22 — documentation contredite | 8 | ✅ |

**Défauts explicitement hors phase 1** (et où ils sont traités — voir `2026-08-06-habitum-programme.md`) :
D6 → Plan 4 · D7, D8 → Plan 4 · D9, D11, D19, D24, D27 → Plan 0 · D10, D25 → Plan 6 ·
D12, D26 → Plan 3 · D23 → Plan 8 · D28 → Plan 7.

**Cohérence des signatures** — vérifiée entre tâches :
`startOfWeek(d, weekStart)` (T3) est consommée telle quelle · `WeekStart` importé depuis
`./date` dans `types.ts` (T3) · `DEMO_NOW`, `demoHabits`, `demoTasks`, `demoSessions`,
`demoLogIndex` produits en T4 step 1 et consommés en T4 step 2 sous les mêmes noms ·
`EVERY_EPOCH` déclaré et utilisé dans le même fichier (T6) · `check:tokens` déclaré en T5 step 8
et vérifié en T8 step 12.

---

*Plan établi le 6 août 2026 à partir de `docs/AUDIT-PRODUCTION-2026-08-06.md`.
Charge estimée : 4 j-p. Chaque tâche se termine par un test qui rend son défaut impossible à réintroduire.*
