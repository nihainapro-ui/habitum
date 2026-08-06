# Habitum — Plan 2 : Couche de données

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Des données réelles, persistées en IndexedDB, migrables, importables depuis le prototype — sans quoi aucune vue n'est portable.

**Architecture:** Dexie (IndexedDB) sous `lib/data/`, strictement séparé de `lib/domain/` qui reste pur. Des dépôts typés exposent le CRUD ; le domaine ne les connaît pas, il reçoit un `LogIndex` en mémoire. L'importeur du format prototype est validé par zod, et ses listes blanches sont **importées** de `lib/domain/types.ts`, jamais recopiées.

**Tech Stack:** Dexie 4 (Apache-2.0) · zod 3 (MIT) · `fake-indexeddb` (dev, MIT) · Vitest

**Charge :** 6,5 j · **Priorité :** 🔴 Critique · **Chemin critique**
**Prérequis :** Plan 1 terminé (critère de sortie atteint)

## Global Constraints

Voir `2026-08-06-habitum-programme.md` § G1–G12. Critiques ici :

- **G1** — clés persistées figées : `habitum.state`, `habitum.state.big`, `habitum.state.bak`, `habitum.best`, et les champs `ov`, `obj`, `occ`, `tt`, `mat`, `cfg`.
- **G2** — `lib/domain/` n'importe jamais `lib/data/`. L'inverse est autorisé.
- **G3** — aucun chiffre fabriqué : `seedEmpty()` est le défaut, `materialize()` n'existe pas en production.
- **G4** — les 62 valeurs restent vertes après chaque tâche.
- **G8** — les sept types d'habitude et les trois types d'objectif viennent de `lib/domain/types.ts`.

---

## Structure des fichiers

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `lib/data/db.ts` | Schéma Dexie, 9 tables, index composites | 2.1 |
| `lib/data/repositories/base.ts` | Fabrique de dépôt : CRUD, `updatedAt`, `deletedAt` | 2.2 |
| `lib/data/repositories/habits.ts` | + requêtes métier (actives, par catégorie) | 2.2 |
| `lib/data/repositories/logs.ts` | + `getWindow(habitId, from, to)`, `setValue` | 2.2 |
| `lib/data/repositories/{tasks,goals,notes,sessions,profiles,shopping}.ts` | CRUD spécialisé | 2.2 |
| `lib/data/repositories/meta.ts` | Clé/valeur : version, drapeaux, cache dérivé | 2.2 |
| `lib/data/repositories/index.ts` | Point d'entrée unique | 2.2 |
| `lib/data/migrations.ts` | Migrations Dexie numérotées + rejeu du format hérité | 2.3 |
| `lib/data/legacy.ts` | Lecture des clés `habitum.*` du prototype | 2.3 |
| `lib/data/import.schema.ts` | Schémas zod du format d'export | 2.4 |
| `lib/data/import.ts` | Importeur + `ImportReport` | 2.4 |
| `lib/data/export.ts` | Export au format prototype (aller-retour) | 2.4 |
| `lib/data/seed.ts` | `seedEmpty()` et `seedDemo()`, strictement séparés | 2.5 |
| `lib/data/log-index.ts` | Table `logs` → `LogIndex` | 2.6 |
| `tests/unit/data/*.test.ts` | Un fichier par module | toutes |
| `tests/setup/indexeddb.ts` | Amorce `fake-indexeddb` pour Vitest | 2.1 |

---

## Task 2.1: Schéma Dexie

**Réf :** T1.7

**Files:**
- Create: `lib/data/db.ts`, `tests/setup/indexeddb.ts`, `tests/unit/data/db.test.ts`
- Modify: `vitest.config.ts`, `package.json`, `eslint.config.mjs`

**Interfaces:**
- Consumes: `lib/domain/types.ts` (Plan 1, tâche 3 — `deletedAt` partout)
- Produces:
  - `db: HabitumDB` — instance Dexie exportée
  - `HabitumDB` avec `habits`, `logs`, `tasks`, `goals`, `notes`, `sessions`, `profiles`, `shopping`, `meta`
  - `DB_NAME`, `DB_VERSION` (déjà dans `lib/storage/keys.ts` — réutiliser, ne pas redéclarer)

- [ ] **Step 1: Installer les dépendances de test**

```bash
npm i -D fake-indexeddb
```

- [ ] **Step 2: Amorcer IndexedDB dans Vitest**

Créer `tests/setup/indexeddb.ts` :

```ts
/* Dexie a besoin d'un IndexedDB. fake-indexeddb en fournit un en mémoire.
   Chaque fichier de test repart d'une base vierge (voir beforeEach des tests). */
import 'fake-indexeddb/auto';
```

Dans `vitest.config.ts`, ajouter `setupFiles` et élargir `include` :

```ts
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['tests/setup/indexeddb.ts'],
    coverage: { include: ['lib/domain/**', 'lib/data/**'], reporter: ['text'] },
  },
```

- [ ] **Step 3: Écrire le test du schéma (il échoue)**

Créer `tests/unit/data/db.test.ts` :

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

describe('schéma Dexie', () => {
  it('déclare les neuf tables attendues', () => {
    const noms = db.tables.map((t) => t.name).sort();
    expect(noms).toEqual([
      'goals', 'habits', 'logs', 'meta', 'notes',
      'profiles', 'sessions', 'shopping', 'tasks',
    ]);
  });

  it('indexe le journal par [habitId+date] — une fenêtre sans balayage complet', async () => {
    const now = '2026-08-05T00:00:00.000Z';
    await db.logs.bulkPut([
      { habitId: 'h1', date: '2026-08-01', value: 1, updatedAt: now },
      { habitId: 'h1', date: '2026-08-02', value: 2, updatedAt: now },
      { habitId: 'h1', date: '2026-08-05', value: 3, updatedAt: now },
      { habitId: 'h2', date: '2026-08-02', value: 9, updatedAt: now },
    ]);

    const fenetre = await db.logs
      .where('[habitId+date]')
      .between(['h1', '2026-08-01'], ['h1', '2026-08-03'], true, true)
      .toArray();

    expect(fenetre.map((l) => l.value)).toEqual([1, 2]);
  });

  it('interdit deux entrées de journal pour la même habitude au même jour', async () => {
    const now = '2026-08-05T00:00:00.000Z';
    await db.logs.put({ habitId: 'h1', date: '2026-08-01', value: 1, updatedAt: now });
    await db.logs.put({ habitId: 'h1', date: '2026-08-01', value: 7, updatedAt: now });
    expect(await db.logs.count()).toBe(1);
    expect((await db.logs.get(['h1', '2026-08-01']))?.value).toBe(7);
  });

  it('permet de retrouver les tâches d’une date', async () => {
    const now = '2026-08-05T00:00:00.000Z';
    await db.tasks.bulkPut([
      { id: 't1', name: 'A', category: 'work', date: '2026-08-05', duration: 60, priority: 2, done: false, subTasks: [], note: '', createdAt: now, updatedAt: now },
      { id: 't2', name: 'B', category: 'home', date: '2026-08-06', duration: 60, priority: 1, done: false, subTasks: [], note: '', createdAt: now, updatedAt: now },
    ]);
    expect(await db.tasks.where('date').equals('2026-08-05').count()).toBe(1);
  });
});
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il échoue**

```bash
npx vitest run tests/unit/data/db.test.ts
```

Attendu : **FAIL** — `Cannot find module '@/lib/data/db'`.

- [ ] **Step 5: Implémenter le schéma**

Créer `lib/data/db.ts` :

```ts
import Dexie, { type EntityTable } from 'dexie';
import { DB_NAME, DB_VERSION } from '@/lib/storage/keys';
import type {
  Goal, Habit, LogEntry, Note, Profile, Session, ShoppingItem, Task,
} from '@/lib/domain';

/** Ligne de la table clé/valeur : version de schéma, drapeaux, cache dérivé. */
export interface MetaRow {
  key: string;
  value: unknown;
  updatedAt: string;
}

export class HabitumDB extends Dexie {
  habits!: EntityTable<Habit, 'id'>;
  logs!: EntityTable<LogEntry, never>;
  tasks!: EntityTable<Task, 'id'>;
  goals!: EntityTable<Goal, 'id'>;
  notes!: EntityTable<Note, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  profiles!: EntityTable<Profile, 'id'>;
  shopping!: EntityTable<ShoppingItem, 'id'>;
  meta!: EntityTable<MetaRow, 'key'>;

  constructor() {
    super(DB_NAME);

    /* Version 1 — schéma initial du portage.
       `logs` a une clé primaire composite [habitId+date] : l'unicité « une
       valeur par habitude et par jour » est structurelle, pas défendue par du
       code. C'est ce que l'objet `ov` du prototype garantissait implicitement.
       Les index `deletedAt` servent aux requêtes « non supprimés » et à la
       synchronisation future. */
    this.version(1).stores({
      habits: 'id, category, archived, updatedAt, deletedAt',
      logs: '[habitId+date], habitId, date, updatedAt',
      tasks: 'id, date, category, done, updatedAt, deletedAt',
      goals: 'id, kind, sourceHabitId, deadline, updatedAt, deletedAt',
      notes: 'id, kind, date, habitId, updatedAt, deletedAt',
      sessions: 'id, date, habitId, updatedAt, deletedAt',
      profiles: 'id, updatedAt, deletedAt',
      shopping: 'id, done, updatedAt, deletedAt',
      meta: 'key, updatedAt',
    });
  }
}

export const db = new HabitumDB();

/** Numéro de version courant, pour les diagnostics et l'écran de réglages. */
export const CURRENT_DB_VERSION = DB_VERSION;
```

- [ ] **Step 6: Interdire l'import inverse (G2)**

Dans `eslint.config.mjs`, ajouter un bloc après celui de `lib/domain` :

```js
  {
    // La persistance peut dépendre du domaine ; jamais l'inverse (déjà couvert),
    // et jamais de React dans la couche de données.
    files: ['lib/data/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'next', 'next/*'],
              message: 'lib/data reste sans React — la persistance ne rend rien.',
            },
          ],
        },
      ],
    },
  },
```

- [ ] **Step 7: Lancer le test pour vérifier qu'il passe**

```bash
npx vitest run tests/unit/data/db.test.ts
```

Attendu : **PASS**, 4 tests.

- [ ] **Step 8: Vérifier la chaîne et committer**

```bash
npm run verify
git add lib/data/db.ts tests/ vitest.config.ts eslint.config.mjs package.json package-lock.json
git commit -m "feat(data): schéma Dexie, 9 tables, index composite [habitId+date] (T1.7)

L'unicité « une valeur par habitude et par jour » devient structurelle :
c'est la clé primaire, plus une garantie implicite de l'objet ov."
```

---

## Task 2.2: Dépôts typés

**Réf :** T1.8

**Files:**
- Create: `lib/data/repositories/base.ts`, `habits.ts`, `logs.ts`, `tasks.ts`, `goals.ts`, `notes.ts`, `sessions.ts`, `profiles.ts`, `shopping.ts`, `meta.ts`, `index.ts`
- Create: `tests/unit/data/repositories.test.ts`

**Interfaces:**
- Consumes: `db` (2.1)
- Produces (consommé par le Plan 3, store Zustand) :
  - `habitsRepo.list(): Promise<Habit[]>` — non supprimés uniquement
  - `habitsRepo.listActive(): Promise<Habit[]>` — non supprimés **et** non archivés
  - `habitsRepo.get(id)`, `.create(input)`, `.update(id, patch)`, `.softDelete(id)`, `.restore(id)`
  - `logsRepo.getWindow(habitId, from: DateKey, to: DateKey): Promise<LogEntry[]>`
  - `logsRepo.setValue(habitId, date, value): Promise<void>`
  - `logsRepo.all(): Promise<LogEntry[]>`
  - `metaRepo.get<T>(key): Promise<T | undefined>`, `.set(key, value)`
  - Même surface pour `tasksRepo`, `goalsRepo`, `notesRepo`, `sessionsRepo`, `profilesRepo`, `shoppingRepo`

- [ ] **Step 1: Écrire le test (il échoue)**

Créer `tests/unit/data/repositories.test.ts` :

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { habitsRepo, logsRepo, metaRepo } from '@/lib/data/repositories';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

const habitInput = {
  name: 'Méditer',
  category: 'mind' as const,
  goal: { kind: 'time' as const, target: 15, step: 1, unit: 'min' },
  mode: 'dow' as const,
  days: [0, 1, 2, 3, 4, 5, 6],
  subItems: [],
  reminders: [],
  archived: false,
  note: '',
};

describe('habitsRepo', () => {
  it('crée avec un identifiant et des horodatages', async () => {
    const h = await habitsRepo.create(habitInput);
    expect(h.id).toMatch(/.{6,}/);
    expect(h.createdAt).toBe(h.updatedAt);
    expect(h.deletedAt).toBeUndefined();
  });

  it('avance updatedAt à chaque modification, jamais createdAt', async () => {
    const h = await habitsRepo.create(habitInput);
    const modifie = await habitsRepo.update(h.id, { name: 'Méditation' });
    expect(modifie!.createdAt).toBe(h.createdAt);
    expect(modifie!.updatedAt >= h.updatedAt).toBe(true);
    expect(modifie!.name).toBe('Méditation');
  });

  it('supprime logiquement : la ligne reste, la liste ne la rend plus', async () => {
    const h = await habitsRepo.create(habitInput);
    await habitsRepo.softDelete(h.id);
    expect(await habitsRepo.list()).toHaveLength(0);
    expect(await db.habits.count()).toBe(1);
    expect((await db.habits.get(h.id))?.deletedAt).toBeDefined();
  });

  it('restaure une suppression logique', async () => {
    const h = await habitsRepo.create(habitInput);
    await habitsRepo.softDelete(h.id);
    await habitsRepo.restore(h.id);
    expect(await habitsRepo.list()).toHaveLength(1);
  });

  it('listActive exclut les archivées', async () => {
    await habitsRepo.create(habitInput);
    await habitsRepo.create({ ...habitInput, archived: true });
    expect(await habitsRepo.list()).toHaveLength(2);
    expect(await habitsRepo.listActive()).toHaveLength(1);
  });
});

describe('logsRepo', () => {
  it('écrit une valeur et l’écrase sans dupliquer', async () => {
    await logsRepo.setValue('h1', '2026-08-05', 3);
    await logsRepo.setValue('h1', '2026-08-05', 8);
    const rows = await logsRepo.all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.value).toBe(8);
  });

  it('retourne une fenêtre bornée, bornes incluses', async () => {
    for (const [d, v] of [['2026-07-31', 1], ['2026-08-01', 2], ['2026-08-05', 3], ['2026-08-06', 4]] as const) {
      await logsRepo.setValue('h1', d, v);
    }
    const w = await logsRepo.getWindow('h1', '2026-08-01', '2026-08-05');
    expect(w.map((r) => r.value)).toEqual([2, 3]);
  });

  it('ne mélange pas les journaux de deux habitudes', async () => {
    await logsRepo.setValue('h1', '2026-08-05', 1);
    await logsRepo.setValue('h2', '2026-08-05', 9);
    const w = await logsRepo.getWindow('h1', '2026-08-01', '2026-08-31');
    expect(w).toHaveLength(1);
    expect(w[0]!.habitId).toBe('h1');
  });
});

describe('metaRepo', () => {
  it('stocke et relit une valeur typée', async () => {
    await metaRepo.set('onboarded', true);
    expect(await metaRepo.get<boolean>('onboarded')).toBe(true);
  });

  it('retourne undefined sur une clé absente', async () => {
    expect(await metaRepo.get('inconnue')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

```bash
npx vitest run tests/unit/data/repositories.test.ts
```

Attendu : **FAIL** — module introuvable.

- [ ] **Step 3: Implémenter la fabrique de dépôt**

Créer `lib/data/repositories/base.ts` :

```ts
import type { Table } from 'dexie';

/** Toute entité versionnée du modèle. */
export interface Versioned {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export const nowIso = (): string => new Date().toISOString();

/** Identifiant opaque. `crypto.randomUUID` est disponible partout où l'app tourne
 *  (navigateurs modernes, Node ≥ 19) ; le repli couvre les environnements de test
 *  exotiques sans jamais produire de collision en usage réel. */
export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export type CreateInput<T extends Versioned> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> &
  Partial<Pick<T, 'id'>>;

export type UpdatePatch<T extends Versioned> = Partial<Omit<T, 'id' | 'createdAt'>>;

/** CRUD commun : identifiant, horodatages, suppression logique.
 *  Aucune entité ne réimplémente cela — c'est ainsi qu'on garantit que
 *  `updatedAt` est toujours renseigné, prérequis de synchronisation. */
export function makeRepo<T extends Versioned>(table: Table<T, string>) {
  return {
    async list(): Promise<T[]> {
      return (await table.toArray()).filter((r) => !r.deletedAt);
    },

    async listAll(): Promise<T[]> {
      return table.toArray();
    },

    async get(id: string): Promise<T | undefined> {
      const row = await table.get(id);
      return row && !row.deletedAt ? row : undefined;
    },

    async create(input: CreateInput<T>): Promise<T> {
      const at = nowIso();
      const row = { ...input, id: input.id ?? newId(), createdAt: at, updatedAt: at } as T;
      await table.put(row);
      return row;
    },

    async update(id: string, patch: UpdatePatch<T>): Promise<T | undefined> {
      const row = await table.get(id);
      if (!row) return undefined;
      const next = { ...row, ...patch, id: row.id, createdAt: row.createdAt, updatedAt: nowIso() } as T;
      await table.put(next);
      return next;
    },

    /** Suppression LOGIQUE. La ligne reste : c'est ce qui permettra à deux
     *  appareils de converger sans ressusciter une entité effacée. */
    async softDelete(id: string): Promise<void> {
      const at = nowIso();
      await table.update(id, { deletedAt: at, updatedAt: at } as never);
    },

    async restore(id: string): Promise<void> {
      const at = nowIso();
      await table.update(id, { deletedAt: undefined, updatedAt: at } as never);
    },

    async count(): Promise<number> {
      return (await this.list()).length;
    },
  };
}
```

- [ ] **Step 4: Implémenter les dépôts spécialisés**

`lib/data/repositories/habits.ts` :

```ts
import { db } from '../db';
import { makeRepo } from './base';
import type { Category, Habit } from '@/lib/domain';

const base = makeRepo<Habit>(db.habits);

export const habitsRepo = {
  ...base,
  /** Non supprimées ET non archivées — ce que les vues affichent par défaut. */
  async listActive(): Promise<Habit[]> {
    return (await base.list()).filter((h) => !h.archived);
  },
  async listByCategory(category: Category): Promise<Habit[]> {
    return (await base.list()).filter((h) => h.category === category);
  },
};
```

`lib/data/repositories/logs.ts` — le journal n'a pas d'`id`, sa clé est composite :

```ts
import { db } from '../db';
import { nowIso } from './base';
import type { DateKey, LogEntry } from '@/lib/domain';

export const logsRepo = {
  async all(): Promise<LogEntry[]> {
    return db.logs.toArray();
  },

  async get(habitId: string, date: DateKey): Promise<LogEntry | undefined> {
    return db.logs.get([habitId, date]);
  },

  /** Fenêtre bornée, bornes incluses. Passe par l'index composite :
   *  aucun balayage complet, quelle que soit la taille du journal. */
  async getWindow(habitId: string, from: DateKey, to: DateKey): Promise<LogEntry[]> {
    return db.logs
      .where('[habitId+date]')
      .between([habitId, from], [habitId, to], true, true)
      .toArray();
  },

  async setValue(habitId: string, date: DateKey, value: number): Promise<void> {
    await db.logs.put({ habitId, date, value, updatedAt: nowIso() });
  },

  async clear(habitId: string, date: DateKey): Promise<void> {
    await db.logs.delete([habitId, date]);
  },

  /** Journal complet d'une habitude — utilisé à la suppression définitive. */
  async deleteForHabit(habitId: string): Promise<void> {
    await db.logs.where('habitId').equals(habitId).delete();
  },

  async bulkPut(rows: LogEntry[]): Promise<void> {
    await db.logs.bulkPut(rows);
  },
};
```

`lib/data/repositories/meta.ts` :

```ts
import { db } from '../db';
import { nowIso } from './base';

export const metaRepo = {
  async get<T>(key: string): Promise<T | undefined> {
    return (await db.meta.get(key))?.value as T | undefined;
  },
  async set(key: string, value: unknown): Promise<void> {
    await db.meta.put({ key, value, updatedAt: nowIso() });
  },
  async remove(key: string): Promise<void> {
    await db.meta.delete(key);
  },
};
```

`tasks.ts`, `goals.ts`, `notes.ts`, `sessions.ts`, `profiles.ts`, `shopping.ts` — même patron que `habits.ts` :

```ts
// lib/data/repositories/tasks.ts
import { db } from '../db';
import { makeRepo } from './base';
import type { DateKey, Task } from '@/lib/domain';

const base = makeRepo<Task>(db.tasks);

export const tasksRepo = {
  ...base,
  async listByDate(date: DateKey): Promise<Task[]> {
    return (await base.list()).filter((t) => t.date === date);
  },
  async listOpen(): Promise<Task[]> {
    return (await base.list()).filter((t) => !t.done);
  },
};
```

```ts
// lib/data/repositories/sessions.ts
import { db } from '../db';
import { makeRepo } from './base';
import type { DateKey, Session } from '@/lib/domain';

const base = makeRepo<Session>(db.sessions);

export const sessionsRepo = {
  ...base,
  async listWindow(from: DateKey, to: DateKey): Promise<Session[]> {
    return (await base.list()).filter((s) => s.date >= from && s.date <= to);
  },
};
```

```ts
// lib/data/repositories/notes.ts
import { db } from '../db';
import { makeRepo } from './base';
import type { DateKey, Note } from '@/lib/domain';

const base = makeRepo<Note>(db.notes);

export const notesRepo = {
  ...base,
  async journalOf(date: DateKey): Promise<Note | undefined> {
    return (await base.list()).find((n) => n.kind === 'journal' && n.date === date);
  },
  async forHabit(habitId: string): Promise<Note[]> {
    return (await base.list()).filter((n) => n.kind === 'habit' && n.habitId === habitId);
  },
  /** Recherche plein texte — la vue Notes en dépend (T3.16). */
  async search(query: string): Promise<Note[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (await base.list()).filter((n) => n.body.toLowerCase().includes(q));
  },
};
```

```ts
// lib/data/repositories/goals.ts
import { db } from '../db';
import { makeRepo } from './base';
import type { Goal } from '@/lib/domain';
export const goalsRepo = makeRepo<Goal>(db.goals);
```

```ts
// lib/data/repositories/profiles.ts
import { db } from '../db';
import { makeRepo } from './base';
import type { Profile } from '@/lib/domain';
export const profilesRepo = makeRepo<Profile>(db.profiles);
```

```ts
// lib/data/repositories/shopping.ts
import { db } from '../db';
import { makeRepo } from './base';
import type { ShoppingItem } from '@/lib/domain';
export const shoppingRepo = makeRepo<ShoppingItem>(db.shopping);
```

`lib/data/repositories/index.ts` :

```ts
export * from './base';
export { habitsRepo } from './habits';
export { logsRepo } from './logs';
export { tasksRepo } from './tasks';
export { goalsRepo } from './goals';
export { notesRepo } from './notes';
export { sessionsRepo } from './sessions';
export { profilesRepo } from './profiles';
export { shoppingRepo } from './shopping';
export { metaRepo } from './meta';
```

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

```bash
npx vitest run tests/unit/data/repositories.test.ts
```

Attendu : **PASS**, 10 tests.

- [ ] **Step 6: Vérifier et committer**

```bash
npm run verify
git add lib/data/repositories/ tests/unit/data/repositories.test.ts
git commit -m "feat(data): dépôts typés — CRUD, updatedAt automatique, suppression logique (T1.8)

makeRepo() centralise les horodatages : aucune entité ne peut être écrite sans
updatedAt, prérequis de la synchronisation (03-ARCHITECTURE § 3.4)."
```

---

## Task 2.3: Migrations numérotées et lecture du format hérité

**Réf :** T1.9 · corrige **B6**

**Files:**
- Create: `lib/data/legacy.ts`, `lib/data/migrations.ts`, `tests/unit/data/migrations.test.ts`

**Interfaces:**
- Consumes: `LEGACY_KEYS`, `LEGACY_SCHEMA_VERSION` (`lib/storage/keys.ts`, existants — **ne pas renommer**, G1)
- Produces:
  - `readLegacyState(storage: Storage): LegacyState | null` — lit `habitum.state` (+ `habitum.state.big` si `split:1`)
  - `applyLegacyMigrations(state: LegacyState): LegacyState` — rejoue `v<2` … `v<5`, idempotent
  - `migrateFromLegacy(storage: Storage): Promise<ImportReport>` — écrit dans Dexie

- [ ] **Step 1: Écrire le test (il échoue)**

Créer `tests/unit/data/migrations.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { applyLegacyMigrations, readLegacyState } from '@/lib/data/legacy';

/* B6 — les migrations du prototype étaient une cascade `if v<n` dans seed().
   Testées côté navigateur, jamais côté portage. Ici, chacune reçoit une charge
   au format d'origine et doit produire exactement ce qu'elle annonce, y compris
   ne rien faire sur un état déjà à jour. */

/** Stockage en mémoire conforme à l'interface Storage. */
const memStorage = (init: Record<string, string> = {}): Storage => {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
};

describe('readLegacyState', () => {
  it('retourne null si rien n’est stocké', () => {
    expect(readLegacyState(memStorage())).toBeNull();
  });

  it('lit un état antérieur à split:1 — ov et notes dans la clé principale', () => {
    const s = memStorage({
      'habitum.state': JSON.stringify({ v: 5, habits: [], ov: { 'h1|2026-08-01': 1 }, notes: { a: 'x' } }),
    });
    const etat = readLegacyState(s)!;
    expect(etat.ov).toEqual({ 'h1|2026-08-01': 1 });
    expect(etat.notes).toEqual({ a: 'x' });
  });

  it('recompose un état split:1 depuis les deux clés', () => {
    const s = memStorage({
      'habitum.state': JSON.stringify({ v: 5, split: 1, habits: [] }),
      'habitum.state.big': JSON.stringify({ ov: { 'h1|2026-08-01': 2 }, notes: { b: 'y' } }),
    });
    const etat = readLegacyState(s)!;
    expect(etat.ov).toEqual({ 'h1|2026-08-01': 2 });
    expect(etat.notes).toEqual({ b: 'y' });
  });

  it('survit à un JSON corrompu sans lever', () => {
    expect(readLegacyState(memStorage({ 'habitum.state': '{cassé' }))).toBeNull();
  });
});

describe('applyLegacyMigrations', () => {
  it('v<2 — renseigne la cible d’objectif manquante', () => {
    const out = applyLegacyMigrations({ v: 1, obj: [{ id: 'o4', kind: 'cumul' }] } as never);
    expect((out.obj as { target: number }[])[0]!.target).toBeGreaterThan(0);
  });

  it('v<3 — durée de tâche par défaut à 60', () => {
    const out = applyLegacyMigrations({ v: 2, tasks: [{ id: 't1' }] } as never);
    expect((out.tasks as { dur: number }[])[0]!.dur).toBe(60);
  });

  it('v<4 — thème par défaut neural', () => {
    const out = applyLegacyMigrations({ v: 3 } as never);
    expect(out.theme).toBe('neural');
  });

  it('v<5 — convertit off en date et remet mat à 0', () => {
    const out = applyLegacyMigrations({ v: 4, tasks: [{ id: 't1', off: 0 }], mat: 1 } as never);
    expect((out.tasks as { d?: string }[])[0]!.d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(out.mat).toBe(0);
  });

  it('est idempotent — un état déjà à jour n’est pas modifié', () => {
    const dejaAJour = { v: 5, theme: 'plasma', tasks: [{ id: 't1', d: '2026-08-05', dur: 30 }], mat: 1 } as never;
    expect(applyLegacyMigrations(dejaAJour)).toEqual(dejaAJour);
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

```bash
npx vitest run tests/unit/data/migrations.test.ts
```

Attendu : **FAIL** — module introuvable.

- [ ] **Step 3: Relever les migrations exactes du prototype**

```bash
node -e "
const s=require('fs').readFileSync('public/prototype/Habitum.dc.html','utf8');
const i=s.indexOf('const p=JSON.parse(raw)');
console.log(s.slice(i, i+2200));
"
```

Transcrire **à l'identique** les quatre migrations `v<2` … `v<5`. Ne pas les réinventer : une
migration réécrite « au propre » est une perte de données.

- [ ] **Step 4: Implémenter `lib/data/legacy.ts`**

En reprenant les migrations relevées à l'étape 3, avec la structure suivante :

```ts
import { LEGACY_KEYS, LEGACY_SCHEMA_VERSION } from '@/lib/storage/keys';
import { dateKey, addDays, today } from '@/lib/domain';

/** État du prototype, tel qu'il est écrit dans localStorage.
 *  Volontairement laxiste : on lit ce qui existe chez de vrais utilisateurs. */
export interface LegacyState {
  v?: number;
  split?: number;
  ov?: Record<string, number>;
  notes?: Record<string, unknown>;
  habits?: unknown[];
  tasks?: unknown[];
  obj?: unknown[];
  sessions?: unknown[];
  shop?: unknown[];
  occ?: Record<string, number>;
  cfg?: Record<string, unknown>;
  theme?: string;
  lang?: string;
  mat?: number;
  demo?: number;
  [k: string]: unknown;
}

/** Lit `habitum.state`, et `habitum.state.big` si l'état porte `split:1`.
 *  Les noms de clés sont FIGÉS (CLAUDE.md § 1) : de vrais utilisateurs ont des
 *  données dessous. */
export function readLegacyState(storage: Storage): LegacyState | null {
  let raw: string | null;
  try {
    raw = storage.getItem(LEGACY_KEYS.main);
  } catch {
    return null;
  }
  if (!raw) return null;

  let state: LegacyState;
  try {
    state = JSON.parse(raw) as LegacyState;
  } catch {
    return null;
  }
  if (!state || typeof state !== 'object') return null;

  if (state.split) {
    try {
      const big = JSON.parse(storage.getItem(LEGACY_KEYS.big) ?? 'null') as LegacyState | null;
      if (big) {
        if (state.ov === undefined && big.ov !== undefined) state.ov = big.ov;
        if (state.notes === undefined && big.notes !== undefined) state.notes = big.notes;
      }
    } catch {
      /* clé volumineuse illisible : on garde ce qu'on a, sans perdre le reste */
    }
  }
  return state;
}

/** Rejoue les migrations du prototype, en cascade et dans l'ordre.
 *  Idempotent : un état déjà en v5 ressort inchangé. */
export function applyLegacyMigrations(input: LegacyState): LegacyState {
  const v = input.v ?? 1;
  if (v >= LEGACY_SCHEMA_VERSION) return input;

  const s: LegacyState = structuredClone(input);
  // ... les quatre migrations relevées à l'étape 3, à transcrire ici ...
  s.v = LEGACY_SCHEMA_VERSION;
  return s;
}
```

- [ ] **Step 5: Faire passer les tests**

```bash
npx vitest run tests/unit/data/migrations.test.ts
```

Attendu : **PASS**, 9 tests. Un échec sur l'idempotence signale une migration qui s'applique deux fois — c'est exactement le défaut `SV=4` corrigé au lot 3 du prototype (`materialize()` relancé à chaque ouverture).

- [ ] **Step 6: Commit**

```bash
git add lib/data/legacy.ts tests/unit/data/migrations.test.ts
git commit -m "feat(data): migrations héritées rejouées et testées (T1.9, B6)

Les quatre migrations v<2..v<5 du prototype, transcrites à l'identique, avec
le cas « déjà à jour, ne rien faire » — celui qui relançait materialize() à
chaque ouverture quand SV valait 4."
```

---

## Task 2.4: Importeur et exportateur

**Réf :** T1.10 · **le point où le projet a déjà perdu des données**

**Files:**
- Create: `lib/data/import.schema.ts`, `lib/data/import.ts`, `lib/data/export.ts`
- Create: `tests/unit/data/import.test.ts`
- Modify: `lib/storage/legacy-import.ts` (absorbé, puis supprimé)

**Interfaces:**
- Consumes: dépôts (2.2), `HABIT_GOAL_KINDS` et `GOAL_KINDS` (`lib/domain/types.ts` — **importés, jamais recopiés**, G8), et `buildLogIndex` (tâche **2.6**)

> ⚠ **Ordre d'exécution.** Le test d'aller-retour importe `buildLogIndex` de `lib/data/log-index.ts`,
> créé en tâche 2.6. Implémenter la tâche 2.6 **avant** celle-ci — c'est dix lignes — ou exécuter
> 2.6 puis 2.4. Le reste de l'ordre du plan est indifférent.
- Produces:
  - `importFromJson(json: unknown): Promise<ImportReport>`
  - `exportToJson(): Promise<HabitumExport>`
  - `ImportReport { read, kept, dropped: string[], byEntity: Record<string, {read,kept}> }`

- [ ] **Step 1: Écrire le test d'aller-retour (il échoue)**

Ce test est **le plus important du plan** : c'est celui qui aurait attrapé la perte de 4 habitudes sur 6.

Créer `tests/unit/data/import.test.ts` :

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { exportToJson, importFromJson } from '@/lib/data';
import { habitsRepo, logsRepo } from '@/lib/data/repositories';
import { HABIT_GOAL_KINDS, GOAL_KINDS, bestStreak, completionRate, currentStreak, sumValues } from '@/lib/domain';
import { DEMO_NOW, demoHabits, demoLogIndex, demoSessions, demoTasks } from '@/tests/fixtures/demo-seed';
import { buildLogIndex } from '@/lib/data/log-index';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

/** Export au format du prototype, construit depuis le fixture de démonstration. */
const exportPrototype = () => ({
  app: 'Habitum',
  exported: '2026-08-05T12:00:00.000Z',
  v: 5,
  habits: demoHabits().map((h) => ({
    id: h.id, fr: h.name, en: h.name, cat: h.category,
    g: { k: h.goal.kind, t: h.goal.target, step: h.goal.step, fr: h.goal.unit, en: h.goal.unit },
    mode: h.mode, days: h.days, sub: [], rem: [], arch: false, note: '',
  })),
  tasks: demoTasks().map((t) => ({
    id: t.id, fr: t.name, en: t.name, cat: t.category, d: t.date,
    time: t.time, dur: t.duration, prio: t.priority, done: t.done, sub: [], note: '',
  })),
  log: Object.fromEntries(demoLogIndex()),
  notes: {},
  obj: [],
  sessions: demoSessions().map((s) => ({ label: s.label, min: s.minutes, d: s.date })),
  shop: [],
});

describe("importFromJson — les SEPT types d'habitude", () => {
  it('accepte les sept types, sans en perdre un seul', async () => {
    const habits = HABIT_GOAL_KINDS.map((kind, i) => ({
      id: `h${i}`, fr: kind, en: kind, cat: 'health',
      g: { k: kind, t: 1, step: 1, fr: '', en: '' },
      mode: 'dow', days: [0, 1, 2, 3, 4, 5, 6], sub: [{ fr: 'a', en: 'a' }], rem: [], arch: false, note: '',
    }));

    const rapport = await importFromJson({ app: 'Habitum', v: 5, habits, tasks: [], log: {}, notes: {} });

    expect(rapport.dropped).toEqual([]);
    expect(await habitsRepo.count()).toBe(HABIT_GOAL_KINDS.length);
  });

  it("accepte les trois types d'objectif, jalons compris", async () => {
    const obj = GOAL_KINDS.map((kind, i) => ({
      id: `o${i}`, fr: kind, en: kind, kind, target: 10,
      unit: { fr: 'u', en: 'u' }, cat: 'sport', ms: [], cur: 0,
    }));
    const rapport = await importFromJson({ app: 'Habitum', v: 5, habits: [], tasks: [], log: {}, notes: {}, obj });
    expect(rapport.dropped).toEqual([]);
    expect(await db.goals.count()).toBe(GOAL_KINDS.length);
  });

  it('rejette un type inconnu en le signalant, sans avaler le reste', async () => {
    const rapport = await importFromJson({
      app: 'Habitum', v: 5, tasks: [], log: {}, notes: '',
      habits: [
        { id: 'ok', fr: 'A', en: 'A', cat: 'health', g: { k: 'check', t: 1 }, mode: 'dow', days: [0], sub: [], rem: [] },
        { id: 'ko', fr: 'B', en: 'B', cat: 'health', g: { k: 'inventé' }, mode: 'dow', days: [0], sub: [], rem: [] },
      ],
    } as never);
    expect(await habitsRepo.count()).toBe(1);
    expect(rapport.dropped.join(' ')).toContain('ko');
  });

  it('ne garde aucune entrée de journal orpheline', async () => {
    await importFromJson({
      app: 'Habitum', v: 5, tasks: [], notes: {},
      habits: [{ id: 'h1', fr: 'A', en: 'A', cat: 'health', g: { k: 'check', t: 1 }, mode: 'dow', days: [0], sub: [], rem: [] }],
      log: { 'h1|2026-08-01': 1, 'fantome|2026-08-01': 5, 'clé invalide': 3 },
    } as never);
    const rows = await logsRepo.all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.habitId).toBe('h1');
  });

  it('rejette un fichier qui n’est pas un export Habitum', async () => {
    await expect(importFromJson({ quelquechose: true })).rejects.toThrow(/Habitum/i);
  });
});

describe("aller-retour export → import → les 62 valeurs sont identiques", () => {
  it('reproduit toutes les métriques après un cycle complet', async () => {
    const attendu = demoHabits().map((h) => {
      const log = demoLogIndex();
      return {
        id: h.id,
        streak: currentStreak(log, h, DEMO_NOW),
        best: bestStreak(log, h, DEMO_NOW),
        pct30: completionRate(log, h, 30, DEMO_NOW),
        sum30: sumValues(log, h, 30, DEMO_NOW),
      };
    });

    const rapport = await importFromJson(exportPrototype());
    expect(rapport.dropped).toEqual([]);
    expect(await habitsRepo.count()).toBe(6);

    const habits = await habitsRepo.list();
    const log = buildLogIndex(await logsRepo.all());

    for (const a of attendu) {
      const h = habits.find((x) => x.id === a.id)!;
      expect(currentStreak(log, h, DEMO_NOW), `${a.id}.streak`).toBe(a.streak);
      expect(bestStreak(log, h, DEMO_NOW), `${a.id}.best`).toBe(a.best);
      expect(completionRate(log, h, 30, DEMO_NOW), `${a.id}.pct30`).toBe(a.pct30);
      expect(sumValues(log, h, 30, DEMO_NOW), `${a.id}.sum30`).toBe(a.sum30);
    }
  });

  it('un export réimporté est stable au second tour', async () => {
    await importFromJson(exportPrototype());
    const premier = await exportToJson();
    await db.delete();
    await db.open();
    await importFromJson(premier);
    const second = await exportToJson();
    expect(second.habits).toEqual(premier.habits);
    expect(second.log).toEqual(premier.log);
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

```bash
npx vitest run tests/unit/data/import.test.ts
```

Attendu : **FAIL** — modules introuvables.

- [ ] **Step 3: Implémenter les schémas zod**

Créer `lib/data/import.schema.ts` :

```ts
import { z } from 'zod';
import { GOAL_KINDS, HABIT_GOAL_KINDS } from '@/lib/domain';

/* ⚠ PIÈGE DÉJÀ PAYÉ. Les listes blanches ci-dessous sont IMPORTÉES de
   lib/domain/types.ts. Les recopier, c'est reproduire le défaut qui a fait
   disparaître 4 habitudes sur 6 à l'import (CHANGELOG 2026-08-05). */
const habitGoalKind = z.enum(HABIT_GOAL_KINDS);
const goalKind = z.enum(GOAL_KINDS);

const category = z.enum(['health', 'sport', 'mind', 'work', 'home', 'study']);
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Libellé bilingue du prototype : { fr, en }. L'i18n ne concerne plus le
 *  contenu utilisateur — on retient le français, à défaut l'anglais. */
const bilingue = z.union([
  z.string(),
  z.object({ fr: z.string().optional(), en: z.string().optional() }),
]);

export const legacyHabit = z.object({
  id: z.string().min(1),
  fr: z.string().optional(),
  en: z.string().optional(),
  cat: category.catch('health'),
  g: z.object({
    k: habitGoalKind,
    t: z.number().optional(),
    step: z.number().optional(),
    fr: z.string().optional(),
    en: z.string().optional(),
  }),
  mode: z.enum(['dow', 'every', 'week', 'month']).catch('dow'),
  days: z.array(z.number().int().min(0).max(6)).default([]),
  n: z.number().int().positive().optional(),
  sub: z.array(bilingue).default([]),
  rem: z.array(z.string()).default([]),
  start: z.string().optional(),
  end: z.string().optional(),
  pause: z.object({ from: dateKey, to: dateKey }).optional(),
  arch: z.boolean().default(false),
  note: z.string().default(''),
});

export const legacyTask = z.object({
  id: z.string().min(1),
  fr: z.string().optional(),
  en: z.string().optional(),
  cat: category.catch('work'),
  d: dateKey.optional(),
  off: z.number().int().optional(),
  time: z.string().optional(),
  dur: z.number().positive().default(60),
  prio: z.union([z.literal(1), z.literal(2), z.literal(3)]).catch(2),
  done: z.boolean().default(false),
  sub: z.array(z.object({ fr: z.string().optional(), en: z.string().optional(), done: z.boolean().default(false) })).default([]),
  note: z.string().default(''),
  rep: z.enum(['daily', 'monthly']).optional(),
});

export const legacyGoal = z.object({
  id: z.string().min(1),
  fr: z.string().optional(),
  en: z.string().optional(),
  kind: goalKind,
  target: z.number().default(1),
  unit: bilingue.optional(),
  src: z.string().optional(),
  ms: z.array(z.object({ fr: z.string().optional(), en: z.string().optional(), done: z.boolean().default(false) })).default([]),
  win: z.number().optional(),
  cat: category.catch('work'),
  start: z.string().optional(),
  due: z.string().optional(),
  cur: z.number().optional(),
});

export const legacySession = z.object({
  label: z.string().default(''),
  en: z.string().optional(),
  min: z.number().nonnegative().default(0),
  d: dateKey.optional(),
  off: z.number().int().optional(),
});

export const habitumExport = z.object({
  app: z.literal('Habitum'),
  exported: z.string().optional(),
  v: z.number().optional(),
  habits: z.array(z.unknown()).default([]),
  tasks: z.array(z.unknown()).default([]),
  // `log` dans les exports récents, `ov` dans les plus anciens.
  log: z.record(z.string(), z.number()).optional(),
  ov: z.record(z.string(), z.number()).optional(),
  notes: z.unknown().optional(),
  obj: z.array(z.unknown()).default([]),
  sessions: z.array(z.unknown()).default([]),
  shop: z.array(z.unknown()).default([]),
});

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const LOG_KEY_RE = /^[^|]+\|\d{4}-\d{2}-\d{2}$/;
```

- [ ] **Step 4: Implémenter l'importeur**

Créer `lib/data/import.ts`, en respectant ces cinq règles :

1. Valider l'enveloppe avec `habitumExport` ; lever une erreur explicite mentionnant « Habitum » si le fichier n'en est pas un.
2. Valider **entité par entité** : une entité invalide est **signalée dans `dropped`**, jamais silencieusement écartée, et n'empêche pas les autres d'entrer.
3. Convertir `log` (ou `ov`) en lignes `logs`, en **écartant les clés qui ne matchent pas `LOG_KEY_RE`** et les entrées dont l'`habitId` n'existe pas parmi les habitudes importées.
4. Renseigner `createdAt`/`updatedAt` = date d'import sur toutes les entités.
5. Écrire **dans une seule transaction Dexie** : un import partiel ne doit pas laisser une base à moitié peuplée.

Signature :

```ts
export interface ImportReport {
  read: number;
  kept: number;
  dropped: string[];
  byEntity: Record<'habits' | 'tasks' | 'goals' | 'logs' | 'notes' | 'sessions' | 'shopping', { read: number; kept: number }>;
}

export async function importFromJson(input: unknown): Promise<ImportReport>;
```

- [ ] **Step 5: Implémenter l'exportateur**

`lib/data/export.ts` produit le format que `importFromJson` accepte — c'est la condition du test de stabilité au second tour.

- [ ] **Step 6: Supprimer l'amorce devenue redondante**

`lib/storage/legacy-import.ts` (45 lignes : quatre validateurs et `toLogRows`) est absorbé par `lib/data/import.ts`. Le supprimer, et vérifier qu'aucun import ne subsiste :

```bash
grep -rn "legacy-import" app components lib tests || echo "aucune référence"
git rm lib/storage/legacy-import.ts
```

- [ ] **Step 7: Faire passer les tests**

```bash
npx vitest run tests/unit/data/import.test.ts
```

Attendu : **PASS**, 7 tests — dont l'aller-retour qui recompare toutes les métriques.

- [ ] **Step 8: Commit**

```bash
git add lib/data/ tests/unit/data/import.test.ts
git commit -m "feat(data): importeur validé par zod, aller-retour vérifié (T1.10)

Les listes blanches des SEPT types d'habitude et des TROIS types d'objectif
sont IMPORTÉES de lib/domain/types.ts. Le test d'aller-retour recompare toutes
les métriques : c'est celui qui aurait attrapé la perte de 4 habitudes sur 6.

lib/storage/legacy-import.ts absorbé et supprimé."
```

---

## Task 2.5: Séparer le jeu de démonstration du compte vierge

**Réf :** T1.11 · corrige **B4** · **G3**

**Files:**
- Create: `lib/data/seed.ts`, `tests/unit/data/seed.test.ts`

**Interfaces:**
- Consumes: dépôts (2.2)
- Produces:
  - `seedEmpty(): Promise<void>` — **le défaut**. Ne crée qu'un profil et des réglages.
  - `seedDemo(): Promise<void>` — explicite, marque `meta.demo = true`, et **n'invente aucun historique**.
  - `isDemo(): Promise<boolean>`

- [ ] **Step 1: Écrire le test (il échoue)**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { isDemo, seedDemo, seedEmpty } from '@/lib/data/seed';
import { habitsRepo, logsRepo, sessionsRepo } from '@/lib/data/repositories';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

describe('seedEmpty — le chemin par défaut', () => {
  it("ne crée AUCUNE habitude, AUCUNE entrée de journal, AUCUNE session", async () => {
    await seedEmpty();
    expect(await habitsRepo.count()).toBe(0);
    expect(await logsRepo.all()).toHaveLength(0);
    expect(await sessionsRepo.count()).toBe(0);
  });

  it('crée un profil et des réglages, rien d’autre', async () => {
    await seedEmpty();
    expect(await db.profiles.count()).toBe(1);
    expect(await isDemo()).toBe(false);
  });
});

describe('seedDemo — explicite, et jamais confondu avec du réel', () => {
  it('marque la base comme démonstration', async () => {
    await seedDemo();
    expect(await isDemo()).toBe(true);
  });

  it("crée les six habitudes et leurs entrées du jour, mais AUCUN historique fabriqué", async () => {
    await seedDemo();
    expect(await habitsRepo.count()).toBe(6);
    const rows = await logsRepo.all();
    // Les quatre entrées du jour du prototype — et rien de plus.
    expect(rows).toHaveLength(4);
  });
});

describe('B4 — materialize() n’existe pas en production', () => {
  it("aucun fichier de lib/ ne contient de générateur d'historique", async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const parcourir = (d: string): string[] =>
      readdirSync(d).flatMap((f) => {
        const p = join(d, f);
        return statSync(p).isDirectory() ? parcourir(p) : p.endsWith('.ts') ? [p] : [];
      });
    const suspects = parcourir('lib').filter((p) => {
      const src = readFileSync(p, 'utf8');
      return /2166136261|materialize|journalSeed/.test(src);
    });
    expect(suspects, `générateur trouvé dans : ${suspects.join(', ')}`).toEqual([]);
  });
});
```

- [ ] **Step 2: Vérifier l'échec, implémenter, vérifier le succès**

```bash
npx vitest run tests/unit/data/seed.test.ts   # FAIL puis PASS
```

`seedDemo()` reprend les six habitudes de `HB0`, les huit tâches, les quatre sessions et les
**quatre** entrées de journal du jour. **Il ne rejoue pas `materialize()`** : le jeu de
démonstration en production montre un produit vide mais crédible, pas un historique fabriqué.
La reconstitution de l'historique n'existe que dans `tests/fixtures/demo-seed.ts`, pour comparer
aux 62 valeurs.

- [ ] **Step 3: Commit**

```bash
git add lib/data/seed.ts tests/unit/data/seed.test.ts
git commit -m "feat(data): seedEmpty par défaut, seedDemo explicite (T1.11, B4)

Un compte vierge n'affiche aucune donnée générée. Le test parcourt lib/ et
échoue si un générateur d'historique y réapparaît (CLAUDE.md § 3)."
```

---

## Task 2.6: Index du journal en mémoire

**Files:**
- Create: `lib/data/log-index.ts`, `tests/unit/data/log-index.test.ts`

**Interfaces:**
- Consumes: `logsRepo` (2.2), `logKey` (`lib/domain/types.ts`)
- Produces:
  - `buildLogIndex(rows: LogEntry[]): LogIndex`
  - `loadLogIndex(): Promise<LogIndex>` — lit toute la table
  - `loadLogIndexWindow(habitIds: string[], from, to): Promise<LogIndex>` — lecture ciblée

> C'est le **joint** entre `lib/data` et `lib/domain` : le domaine ne connaît que `LogIndex`, une
> `ReadonlyMap`. Il ne saura jamais qu'IndexedDB existe (G2).

- [ ] **Step 1: Écrire le test**

```ts
import { describe, expect, it } from 'vitest';
import { buildLogIndex } from '@/lib/data/log-index';
import { logKey } from '@/lib/domain';

const row = (habitId: string, date: string, value: number) => ({
  habitId, date, value, updatedAt: '2026-08-05T00:00:00.000Z',
});

describe('buildLogIndex', () => {
  it('produit une Map indexée par habitId|date', () => {
    const idx = buildLogIndex([row('h1', '2026-08-01', 3)]);
    expect(idx.get(logKey('h1', '2026-08-01'))).toBe(3);
  });

  it('retourne undefined sur une clé absente — jamais 0', () => {
    const idx = buildLogIndex([]);
    expect(idx.get(logKey('h1', '2026-08-01'))).toBeUndefined();
  });

  it('tient 36 500 entrées en moins de 100 ms', () => {
    const rows = Array.from({ length: 36_500 }, (_, i) =>
      row(`h${i % 20}`, `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`, i % 10),
    );
    const t0 = performance.now();
    const idx = buildLogIndex(rows);
    expect(performance.now() - t0).toBeLessThan(100);
    expect(idx.size).toBeGreaterThan(0);
  });
});
```

> Le second cas n'est pas cosmétique : `isDone` distingue « aucune entrée » de « valeur 0 » pour le
> type `limit` (G9). Un index qui renverrait 0 au lieu de `undefined` casserait la règle.

- [ ] **Step 2: Implémenter**

```ts
import type { LogEntry, LogIndex } from '@/lib/domain';
import { logKey } from '@/lib/domain';
import { logsRepo } from './repositories';

export function buildLogIndex(rows: readonly LogEntry[]): LogIndex {
  const m = new Map<string, number>();
  for (const r of rows) m.set(logKey(r.habitId, r.date), r.value);
  return m;
}

export async function loadLogIndex(): Promise<LogIndex> {
  return buildLogIndex(await logsRepo.all());
}

export async function loadLogIndexWindow(
  habitIds: readonly string[],
  from: string,
  to: string,
): Promise<LogIndex> {
  const parts = await Promise.all(habitIds.map((id) => logsRepo.getWindow(id, from, to)));
  return buildLogIndex(parts.flat());
}
```

- [ ] **Step 3: Vérifier, exporter, committer**

Créer `lib/data/index.ts` :

```ts
export * from './db';
export * from './repositories';
export * from './log-index';
export * from './import';
export * from './export';
export * from './seed';
export * from './legacy';
```

```bash
npm run verify
git add lib/data/ tests/unit/data/log-index.test.ts
git commit -m "feat(data): index du journal en mémoire, joint entre data et domain"
```

---

## Critère de sortie du Plan 2

| # | Condition | Vérification |
|---|---|---|
| 1 | Un export du prototype se réimporte **sans perte** et **reproduit les 62 valeurs** | `npx vitest run tests/unit/data/import.test.ts` |
| 2 | Un compte vierge n'affiche **aucune** donnée générée | `npx vitest run tests/unit/data/seed.test.ts` |
| 3 | Aucun générateur d'historique dans `lib/` | test dédié, tâche 2.5 |
| 4 | Les 62 valeurs restent vertes | `npx vitest run tests/unit/golden.test.ts` |
| 5 | Fenêtre de journal sans balayage complet | test d'index composite, tâche 2.1 |
| 6 | `npm run verify` vert | `npm run verify` |
| 7 | Couverture ≥ 90 % sur `lib/data/` | `npx vitest run --coverage` |

**À la sortie : le Plan 3 (état et coque) peut démarrer.**
