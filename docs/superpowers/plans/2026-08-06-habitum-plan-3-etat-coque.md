# Habitum — Plan 3 : État et coque applicative

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Naviguer entre les onze routes avec des données réelles chargées depuis IndexedDB, dans une coque complète et pilotable au clavier.

**Architecture:** Zustand en tranches, une par domaine métier. La persistance est **déléguée aux dépôts** du Plan 2 — aucune tranche n'écrit dans IndexedDB directement. Un middleware d'annulation prend un instantané avant toute action destructrice et l'expose dans un toast. La coque porte le rail, l'en-tête, le mode zen, la palette ⌘K et la barre basse mobile.

**Tech Stack:** Zustand 5 (MIT) · React 19 · next-intl

**Charge :** 4 j · **Priorité :** 🔴 Critique
**Prérequis :** Plan 2 terminé

## Global Constraints

Voir `2026-08-06-habitum-programme.md` § G1–G12. Critiques ici : **G2** (le domaine reste pur), **G10** (aucun débordement à 390/768/1060/1440 px).

---

## Structure des fichiers

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `lib/store/types.ts` | Types transverses des tranches | 3.1 |
| `lib/store/habits.ts` `tasks.ts` `goals.ts` `notes.ts` `sessions.ts` `settings.ts` `ui.ts` | Une tranche par domaine | 3.1 |
| `lib/store/undo.ts` | `withUndo(action, label)` + instantané | 3.2 |
| `lib/store/index.ts` | Assemblage, hooks sélecteurs | 3.1 |
| `lib/store/hydrate.ts` | Chargement initial depuis les dépôts | 3.1 |
| `components/shell/Rail.tsx` | Rail 3 groupes, `aria-current` | 3.3 |
| `components/shell/Header.tsx` | Date, recherche, badge démo | 3.3 |
| `components/shell/BottomBar.tsx` | Navigation < 768 px | 3.3 |
| `components/shell/ZenToggle.tsx` | Mode zen `⌘\` | 3.3 |
| `components/shell/SkipLink.tsx` | Lien d'évitement | 3.3 |
| `components/shell/LiveRegion.tsx` | `aria-live` de changement de vue | 3.7 |
| `components/command/CommandPalette.tsx` | Palette `⌘K` | 3.4 |
| `lib/keyboard/shortcuts.ts` | Raccourcis globaux, piège de focus | 3.5 |
| `i18n/client-locale.ts` | Locale côté client — rend les routes statiques | 3.6 |

---

## Task 3.1: Tranches Zustand

**Réf :** T2.4

**Interfaces produites** (consommées par tout le Plan 5) :

```ts
// lib/store/index.ts
export const useStore: UseBoundStore<StoreApi<AppState>>;

interface AppState {
  // données
  habits: Habit[];  tasks: Task[];  goals: Goal[];
  notes: Note[];    sessions: Session[];  shopping: ShoppingItem[];
  logIndex: LogIndex;
  settings: Settings;
  profiles: Profile[];  activeProfileId: string | null;

  // état d'interface
  ui: { view: string; day: number; filter: string; range: 7|30|90|365;
        zen: boolean; editor: EditorState | null; toast: ToastState | null;
        commandOpen: boolean; loading: boolean; error: string | null };

  // cycle de vie
  hydrate(): Promise<void>;        // charge tout depuis les dépôts (lib/store/hydrate.ts)

  // actions habitudes
  createHabit(input: CreateInput<Habit>): Promise<void>;
  updateHabit(id: string, patch: UpdatePatch<Habit>): Promise<void>;
  deleteHabit(id: string): Promise<void>;          // logique + annulable
  archiveHabit(id: string, archived: boolean): Promise<void>;
  setLogValue(habitId: string, date: DateKey, value: number): Promise<void>;
  toggleHabit(habitId: string, date: DateKey): Promise<void>;
  // … même surface pour tasks, goals, notes, sessions, shopping
}

// sélecteurs dérivés — AUCUN calcul dans les composants (G2)
export const useHabitsOfDay: (date: Date) => Habit[];
export const useDayRatio: (date: Date) => DayRatio;
export const useHabitMetrics: (habitId: string) => {
  streak: number; best: number; pct7: number; pct30: number; pct90: number; sum30: number;
};
```

- [ ] **Step 1: Écrire le test d'une tranche (il échoue)**

`tests/unit/store/habits.test.ts` :

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { useStore } from '@/lib/store';
import { logKey } from '@/lib/domain';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
  useStore.setState(useStore.getInitialState?.() ?? {});
});

const input = {
  name: 'Méditer', category: 'mind' as const,
  goal: { kind: 'time' as const, target: 15, step: 1, unit: 'min' },
  mode: 'dow' as const, days: [0,1,2,3,4,5,6], subItems: [], reminders: [],
  archived: false, note: '',
};

describe('tranche habitudes', () => {
  it('crée dans le store ET dans la base', async () => {
    await useStore.getState().createHabit(input);
    expect(useStore.getState().habits).toHaveLength(1);
    expect(await db.habits.count()).toBe(1);
  });

  it('coche une habitude : le journal et l’index suivent', async () => {
    await useStore.getState().createHabit(input);
    const h = useStore.getState().habits[0]!;
    await useStore.getState().setLogValue(h.id, '2026-08-05', 15);
    expect(useStore.getState().logIndex.get(logKey(h.id, '2026-08-05'))).toBe(15);
    expect(await db.logs.count()).toBe(1);
  });

  it('recharge l’état depuis la base après réinitialisation du store', async () => {
    await useStore.getState().createHabit(input);
    useStore.setState({ habits: [] });
    await useStore.getState().hydrate();
    expect(useStore.getState().habits).toHaveLength(1);
  });

  it('supprime logiquement : disparaît du store, reste en base', async () => {
    await useStore.getState().createHabit(input);
    const h = useStore.getState().habits[0]!;
    await useStore.getState().deleteHabit(h.id);
    expect(useStore.getState().habits).toHaveLength(0);
    expect(await db.habits.count()).toBe(1);
  });
});
```

- [ ] **Step 2: Vérifier l'échec, implémenter, vérifier le succès**

Règles d'implémentation :

1. **Toute action écrit d'abord dans le dépôt, puis met à jour le store.** Jamais l'inverse : un échec d'écriture ne doit pas laisser une interface qui ment.
2. Aucune tranche n'appelle `localStorage` ni `db` directement — uniquement les dépôts.
3. `logIndex` est reconstruit par `buildLogIndex` après toute écriture de journal.
4. Les sélecteurs dérivés appellent `lib/domain` ; **aucun calcul n'est écrit dans une tranche**.

- [ ] **Step 3: Écrire l'hydratation**

`lib/store/hydrate.ts` charge en une passe : habitudes, tâches, objectifs, notes, sessions, courses, profils, réglages, index de journal. Il pose `ui.loading` à `true` puis `false`, et `ui.error` en cas d'échec.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(store): tranches Zustand, persistance déléguée aux dépôts (T2.4)"
```

---

## Task 3.2: Middleware d'annulation

**Réf :** T2.5 — porte `snapshot()` / `notify()` du prototype

**Interfaces produites :**

```ts
export function withUndo<T>(
  label: string,
  action: () => Promise<T>,
): Promise<T>;
```

- [ ] **Step 1: Écrire le test**

```ts
describe('withUndo', () => {
  it('affiche un toast avec une action Annuler', async () => {
    await useStore.getState().createHabit(input);
    const h = useStore.getState().habits[0]!;
    await useStore.getState().deleteHabit(h.id);

    const toast = useStore.getState().ui.toast;
    expect(toast).not.toBeNull();
    expect(toast!.undo).toBeInstanceOf(Function);
  });

  it('restaure l’état complet à l’annulation', async () => {
    await useStore.getState().createHabit(input);
    const h = useStore.getState().habits[0]!;
    await useStore.getState().setLogValue(h.id, '2026-08-05', 15);
    await useStore.getState().deleteHabit(h.id);

    await useStore.getState().ui.toast!.undo!();

    expect(useStore.getState().habits).toHaveLength(1);
    // Le journal aussi : supprimer une habitude sans restaurer son historique
    // serait une perte de données déguisée en annulation.
    expect(useStore.getState().logIndex.size).toBe(1);
  });

  it('n’affiche qu’un seul toast à la fois', async () => {
    await useStore.getState().createHabit(input);
    await useStore.getState().createHabit({ ...input, name: 'Lire' });
    const [a, b] = useStore.getState().habits;
    await useStore.getState().deleteHabit(a!.id);
    await useStore.getState().deleteHabit(b!.id);
    expect(useStore.getState().ui.toast!.label).toContain('Lire');
  });
});
```

- [ ] **Step 2: Implémenter**

L'instantané couvre **l'entité et ses dépendances** : supprimer une habitude emporte son journal, ses notes liées et les objectifs qui la référencent. L'annulation les restaure tous. Un seul toast à la fois, `clearTimeout` sur le précédent (comportement du prototype).

- [ ] **Step 3: Commit**

---

## Task 3.3: Coque applicative

**Réf :** T2.6 · lève **D26** (partiel)

- [ ] **Step 1: Écrire le test e2e**

`tests/e2e/shell.spec.ts` :

```ts
import { expect, test } from '@playwright/test';

test('le rail marque la page courante', async ({ page }) => {
  await page.goto('/habits');
  await expect(page.getByRole('link', { name: /habitudes/i })).toHaveAttribute('aria-current', 'page');
});

test('le lien d’évitement mène au contenu principal', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: /contenu/i });
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('le mode zen masque le rail', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: /principale/i })).toBeVisible();
  await page.keyboard.press('Meta+Backslash');
  await expect(page.getByRole('navigation', { name: /principale/i })).toBeHidden();
});

test('sous 768 px, la barre basse remplace le rail', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByTestId('bottom-bar')).toBeVisible();
  await expect(page.getByRole('navigation', { name: /principale/i })).toBeHidden();
});

for (const w of [390, 768, 1060, 1440]) {
  test(`aucun débordement horizontal à ${w} px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('/');
    const debordement = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(debordement, `débordement à ${w} px`).toBe(false);
  });
}
```

- [ ] **Step 2: Implémenter le rail à 3 groupes**

Groupes du prototype : **Espace** (`dash`, `today`, `calendar`) · **Suivi** (`habits`, `tasks`, `goals`, `stats`) · **Focus** (`timer`, `notes`, `profile`, `settings`). Chaque lien porte son icône Lucide (Plan 4) et `aria-current="page"` sur la route active.

- [ ] **Step 3: En-tête**

Date localisée, champ de recherche ouvrant la palette, badge « jeu de démonstration » si `meta.demo` — avec la contrainte du CHANGELOG : sous 1200 px, le badge se réduit à sa marque (21 px) pour ne pas voler la place du sous-titre.

- [ ] **Step 4: Barre basse et mode zen**

Barre basse sous 768 px, cibles ≥ 44 px. Mode zen `⌘\` masquant rail et panneau latéral, état persisté dans `ui`.

- [ ] **Step 5: Vérifier et committer**

```bash
npm run build && CI=1 npm run test:e2e
```

---

## Task 3.4: Palette de commandes ⌘K

**Réf :** T2.9

- [ ] **Step 1: Test e2e**

```ts
test('la palette cherche et navigue au clavier', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Meta+k');
  const palette = page.getByRole('dialog', { name: /commandes/i });
  await expect(palette).toBeVisible();

  await page.keyboard.type('médit');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(palette).toBeHidden();
});

test('Escape ferme la palette et rend le focus', async ({ page }) => {
  await page.goto('/');
  const declencheur = page.getByRole('button', { name: /rechercher/i });
  await declencheur.click();
  await page.keyboard.press('Escape');
  await expect(declencheur).toBeFocused();
});
```

- [ ] **Step 2: Implémenter**

Recherche sur habitudes, tâches, objectifs et articles de courses. `↑`/`↓` pour parcourir, `Entrée` pour activer, `Escape` pour fermer **en rendant le focus au déclencheur**. Création rapide de tâche avec catégorie et priorité (comportement du prototype). `role="dialog"`, `aria-modal`, piège de focus.

---

## Task 3.5: Raccourcis globaux et piège de focus

**Réf :** T2.10

- [ ] **Step 1: Test**

```ts
test('les raccourcis ne se déclenchent pas dans un champ de saisie', async ({ page }) => {
  await page.goto('/notes');
  const zone = page.getByRole('textbox').first();
  await zone.click();
  await zone.type('k');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(zone).toHaveValue(/k/);
});

test('Tab reste piégé dans une modale ouverte', async ({ page }) => {
  await page.goto('/habits');
  await page.getByRole('button', { name: /nouvelle habitude/i }).click();
  const modale = page.getByRole('dialog');
  for (let i = 0; i < 30; i++) await page.keyboard.press('Tab');
  await expect(modale.locator(':focus')).toHaveCount(1);
});
```

- [ ] **Step 2: Implémenter**

`⌘K`/`Ctrl+K`, `Escape`, `⌘\`. **Neutralisés** quand la cible est un `input`, `textarea` ou `[contenteditable]`. Piège de focus dans toute modale ouverte.

---

## Task 3.6: Rendre les routes statiques

Lève **D12** — enjeu direct de coût et de latence.

**Diagnostic actuel :** `cookies()` dans `i18n/request.ts` force les 12 routes en rendu dynamique (`ƒ`). Pour une application 100 % locale, chaque affichage consomme une invocation serverless.

- [ ] **Step 1: Écrire le test**

`tests/unit/build-output.test.ts` :

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/* D12 — une application local-first ne doit exécuter aucune fonction serveur
   pour afficher une page. Ce test lit le manifeste de build et échoue si une
   route redevient dynamique. */
describe('sortie de build', () => {
  it('ne produit aucune route dynamique', () => {
    const manifest = JSON.parse(readFileSync('.next/prerender-manifest.json', 'utf8')) as {
      routes: Record<string, unknown>;
      dynamicRoutes: Record<string, unknown>;
    };
    expect(Object.keys(manifest.routes).length).toBeGreaterThanOrEqual(12);
    expect(Object.keys(manifest.dynamicRoutes)).toEqual([]);
  });
});
```

> Ce test exige un `next build` préalable. L'exécuter dans le job `e2e` de la CI, après `npm run build`.

- [ ] **Step 2: Déplacer la locale côté client**

Créer `i18n/client-locale.ts` : lecture du cookie `habitum.lang` **dans le navigateur**, application via `NextIntlClientProvider`. `i18n/request.ts` ne lit plus `cookies()` : il retourne la locale par défaut, et le client la corrige à l'hydratation.

> Le choix « la langue est une préférence de profil, pas une propriété de la ressource »
> (`i18n/config.ts`) reste valable et n'est pas remis en cause : on change **où** la préférence
> est lue, pas ce qu'elle signifie.

- [ ] **Step 3: Vérifier**

```bash
npm run build
```

Attendu : les 12 routes marquées `○` (statique) et non `ƒ`.

- [ ] **Step 4: Commit**

```bash
git commit -m "perf: rendre les 12 routes statiques (D12)

cookies() dans i18n/request.ts forçait le rendu dynamique de tout l'arbre.
Une application 100 % locale n'a aucune raison d'exécuter une fonction
serveur pour afficher une page : 0 invocation, latence CDN, coût nul.
Un test lit le manifeste de build et échoue si une route redevient dynamique."
```

---

## Task 3.7: Région annoncée

Lève **D26** (suite)

- [ ] **Step 1: Test**

```ts
test('le changement de vue est annoncé aux lecteurs d’écran', async ({ page }) => {
  await page.goto('/');
  const region = page.locator('[aria-live="polite"]');
  await page.getByRole('link', { name: /habitudes/i }).click();
  await expect(region).toContainText(/habitudes/i);
});
```

- [ ] **Step 2: Implémenter** `components/shell/LiveRegion.tsx` — `aria-live="polite"`, visuellement masqué, portant le nom de la vue courante puis les messages de toast.

---

## Critère de sortie du Plan 3

| # | Condition | Vérification |
|---|---|---|
| 1 | Les onze routes affichent des données issues d'IndexedDB | e2e de navigation |
| 2 | `next build` produit **12 routes statiques**, 0 dynamique | `tests/unit/build-output.test.ts` |
| 3 | Aucun débordement horizontal à 390/768/1060/1440 px | e2e paramétré, tâche 3.3 |
| 4 | Palette et mode zen pilotables au clavier, focus rendu à la fermeture | e2e, tâches 3.4 et 3.5 |
| 5 | L'annulation restaure l'entité **et ses dépendances** | test unitaire, tâche 3.2 |
| 6 | Les 62 valeurs restent vertes | `npx vitest run tests/unit/golden.test.ts` |
| 7 | `npm run verify` et `npm run test:e2e` verts | — |
