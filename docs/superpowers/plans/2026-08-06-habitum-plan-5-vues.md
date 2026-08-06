# Habitum — Plan 5 : Les onze vues

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Une vue = un sous-agent = une PR.

**Goal:** Parité fonctionnelle avec le prototype, en code de production, avec les mêmes chiffres à la même date figée.

**Architecture:** Une vue est un **assemblage** de composants alimentés par des sélecteurs du store. Aucun calcul n'est écrit dans un composant : s'il en faut un, il descend dans `lib/domain` **avec son test**. Chaque vue est livrable et testable seule.

**Charge :** 15 j — **55 % de la charge restante du projet** · **Priorité :** 🔴 Critique
**Prérequis :** Plans 1 à 4 terminés

## Global Constraints

Voir `2026-08-06-habitum-programme.md` § G1–G12. **G2** (aucun calcul dans un composant) et **G4** (les 62 valeurs) sont les deux qui gouvernent ce plan.

---

## Protocole par vue — non négociable

**Chaque vue suit ce cycle. Aucune n'est déclarée terminée avant les six points.**

1. **Lire** `docs/handoff/05-SPEC-VUES.md` § de la vue, et ouvrir la capture de référence
   `public/prototype/tests/visual/reference/<n>-<vue>.png`.
2. **Ouvrir le prototype côte à côte** : `http://localhost:3000/prototype/Habitum.dc.html`.
3. **Écrire le test e2e d'abord**, à partir du § « Interactions » de la spécification.
4. **Porter la vue.** Tout calcul absent de `lib/domain` y descend, avec son test unitaire.
5. **Comparer les chiffres** au prototype, à la même date figée.
6. **Vérifier** : 3 thèmes × 2 langues · 390/768/1060/1440 px sans débordement · axe sans
   violation critique · `npm run verify` vert · les 62 valeurs toujours vertes.

**Commande dédiée :** `/port-view <vue>` (`.claude/commands/port-view.md`).

**Modèle de test e2e** — à décliner pour chaque vue :

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('<vue>', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/<route>');
    await page.evaluate(() => window.localStorage.setItem('habitum.test.seed', 'demo'));
    await page.reload();
  });

  test('affiche le contenu attendu', async ({ page }) => { /* § Contenu de la spec */ });
  test('les interactions répondent',   async ({ page }) => { /* § Interactions */ });
  test('état vide',                    async ({ page }) => { /* compte vierge */ });

  for (const w of [390, 768, 1060, 1440]) {
    test(`sans débordement à ${w} px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      expect(await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    });
  }

  test('accessible', async ({ page }) => {
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze();
    expect(violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
```

---

## Task 5.1: Vue `today` — 2 j

**Réf :** T3.2 · `05-SPEC-VUES.md` § 2 · route `/today`

**Fichiers :** `app/today/page.tsx` · `components/today/{DayNav,FilterBar,UnifiedList,HabitRow,TaskRow,SubList,CounterControl,ActionDrawer}.tsx`

**Contenu à porter :**
- Navigation jour précédent / suivant (`ui.day`), retour à aujourd'hui
- Filtres par catégorie (`ui.filter`)
- **Liste unifiée habitudes + tâches, triée par heure**
- Sous-listes dépliables (type `list`)
- Compteurs quantitatifs avec `−` / `+` (types `count`, `time`, `total`)

**Interactions :**
- Case à cocher · incrément / décrément
- Appui long ou `⋯` → **tiroir d'actions** : *Marquer réussi · Passer · Reporter · Supprimer · Note*
- Toast avec **Annuler** sur chaque action destructrice

**Pièges :**
- **`limit` (G9)** : une habitude à plafond n'est **jamais réussie d'avance**. Sur aujourd'hui sans
  entrée journalisée, la case est vide, pas cochée. C'est la règle la plus facile à casser ici.
- Un jour futur ne doit pas être cochable.

**Tests spécifiques :**

```ts
test("une habitude 'limit' n'est jamais réussie d'avance", async ({ page }) => {
  // habitude limit target=2, aucune entrée aujourd'hui
  await expect(page.getByRole('checkbox', { name: /alcool/i })).not.toBeChecked();
  await page.getByRole('button', { name: /\+/ }).first().click();  // valeur 1 <= 2
  await expect(page.getByRole('checkbox', { name: /alcool/i })).toBeChecked();
});

test('le tiroir d’actions propose les cinq actions', async ({ page }) => {
  await page.getByRole('button', { name: '⋯' }).first().click();
  for (const a of [/réussi/i, /passer/i, /reporter/i, /supprimer/i, /note/i]) {
    await expect(page.getByRole('menuitem', { name: a })).toBeVisible();
  }
});

test('supprimer puis annuler restaure l’élément', async ({ page }) => {
  const avant = await page.getByRole('listitem').count();
  await page.getByRole('button', { name: '⋯' }).first().click();
  await page.getByRole('menuitem', { name: /supprimer/i }).click();
  await page.getByRole('button', { name: /annuler/i }).click();
  await expect(page.getByRole('listitem')).toHaveCount(avant);
});
```

---

## Task 5.2: Vue `habits` — 1,5 j

**Réf :** T3.1 · `05-SPEC-VUES.md` § 4 · route `/habits`

**Fichiers :** `app/habits/page.tsx` · `components/habits/{HabitCard,WeekDots,HabitStats,EmptyState}.tsx`

**Contenu :** carte par habitude — glyphe et couleur de catégorie, nom, libellé d'objectif,
**7 pastilles de la semaine courante (lundi → dimanche)**, série courante, record, taux 30 jours,
bouton d'édition. Bouton « Nouvelle habitude » en haut à droite.

**Interactions :** cocher un jour de la semaine **directement depuis la pastille**, ouvrir
l'éditeur, archiver, supprimer.

**Pièges :**
- Les 7 pastilles suivent `Settings.weekStart` (Plan 1 tâche 3, `startOfWeek`).
- Une pastille de jour non planifié n'est **pas cochable** et se distingue visuellement d'un jour
  planifié non fait.
- `bestStreak` balaie 366 jours × N habitudes : passer par le sélecteur `useHabitMetrics`,
  jamais par un calcul en ligne dans la carte.

**Test spécifique :**

```ts
test('les métriques affichées correspondent aux valeurs de référence', async ({ page }) => {
  // Jeu de démonstration, date figée au 2026-08-05
  const carte = page.getByRole('article', { name: /alcool/i });
  await expect(carte.getByTestId('streak')).toHaveText('8');
  await expect(carte.getByTestId('best')).toHaveText('37');
  await expect(carte.getByTestId('pct30')).toHaveText('87 %');
});
```

> Ces trois nombres viennent de `golden.json` (`habit.alc`). Si la vue les affiche, le portage est
> fidèle **jusqu'à l'écran**, pas seulement dans le domaine.

---

## Task 5.3: Vue `dash` — 1 j

**Réf :** T3.3 · `05-SPEC-VUES.md` § 1 · route `/`

**Fichiers :** `app/page.tsx` · `components/dashboard/{DayRing,CounterGrid,TodayHabits,NextTasks,MiniHeatmap,GoalsPreview,ExportReminder}.tsx`

**Contenu :** anneau de progression du jour (`dayRatio`) · 4 compteurs (habitudes réussies /
planifiées, tâches restantes, série la plus longue, minutes de focus) · habitudes du jour avec case
d'action directe · prochaines tâches · mini-heatmap 30 jours · objectifs en cours ·
**bandeau de rappel d'export au-delà de 30 jours sans export, refusable et non récurrent**.

**Piège :** les minutes de focus viennent de `sessions` réellement enregistrées (**G3**). Un compte
sans session affiche **0**, jamais une estimation.

---

## Task 5.4: Éditeur habitude et tâche — 2 j

**Réf :** T3.4, T3.5 · `05-SPEC-VUES.md` § 5

**Fichiers :** `components/editor/{EditorSheet,TabDefinition,TabPlanning,TabReminders,TabAdvanced}.tsx` · `lib/validation/{habit,task}.schema.ts`

**Quatre onglets :**

| Onglet | Habitude | Tâche |
|---|---|---|
| **Définition** | nom, catégorie, **type parmi les SEPT**, cible, unité, sous-éléments (type `list`) | nom, catégorie, note |
| **Planning** | jours de semaine, mode (`dow`/`every`/`week`/`month`), intervalle, début, fin, pause | date, heure, durée, priorité, récurrence |
| **Rappels** | liste d'heures `HH:mm` | heure de rappel |
| **Avancé** | note libre, archivage, suppression annulable | sous-tâches, suppression annulable |

**Pièges :**
- **G8** — la liste des types vient de `HABIT_GOAL_KINDS`. Un `<select>` qui n'en propose que
  quatre reproduit le défaut à l'interface.
- Le brouillon est **isolé du store principal** : fermer sans enregistrer ne doit rien modifier.
- Validation `zod` + `react-hook-form`. Installer : `npm i react-hook-form @hookform/resolvers`.

**Tests spécifiques :**

```ts
test("le sélecteur de type propose les SEPT types", async ({ page }) => {
  await page.getByRole('button', { name: /nouvelle habitude/i }).click();
  const options = await page.getByRole('combobox', { name: /type/i }).locator('option').allTextContents();
  expect(options).toHaveLength(7);
});

test('fermer sans enregistrer ne modifie rien', async ({ page }) => {
  const avant = await page.getByRole('article').count();
  await page.getByRole('button', { name: /nouvelle habitude/i }).click();
  await page.getByLabel(/nom/i).fill('Brouillon jeté');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('article')).toHaveCount(avant);
  await expect(page.getByText('Brouillon jeté')).toHaveCount(0);
});

test('un formulaire invalide affiche une erreur et n’enregistre pas', async ({ page }) => {
  await page.getByRole('button', { name: /nouvelle habitude/i }).click();
  await page.getByRole('button', { name: /enregistrer/i }).click();
  await expect(page.getByRole('alert')).toBeVisible();
});
```

---

## Task 5.5: Vue `tasks` — 1 j

**Réf :** T3.6 · `05-SPEC-VUES.md` § 6 · route `/tasks`

**Contenu :** regroupement *Aujourd'hui / Demain / Cette semaine / Plus tard / Terminé* ·
puce de priorité (1–3) · heure · catégorie · sous-tâches avec compteur · note.
Colonne latérale : **liste de courses** (`shopping`, Plan 2).

**Interactions :** cocher tâche et sous-tâche · reporter (+1 jour) · supprimer · éditer.

**Piège :** le regroupement dépend de `Settings.weekStart` pour « cette semaine ».

---

## Task 5.6: Vue `stats` — 2 j

**Réf :** T3.11, T3.12 · `05-SPEC-VUES.md` § 8 · route `/stats`

**Fichiers :** `app/stats/page.tsx` · `components/stats/{Heatmap,WindowSelector,ScoreTable,CategoryBars,FocusSummary}.tsx`

**Contenu :** sélecteur de fenêtre (7 / 30 / 90 / 365 j) · **heatmap 6 mois** (intensité =
`dayRatio`) · taux global · journées parfaites · meilleure série · classement des habitudes par
score · répartition par catégorie · minutes de focus.

**Calculs à faire descendre dans `lib/domain`** (ils n'existent pas encore) :

```ts
// lib/domain/metrics.ts — à ajouter, avec tests
export function perfectDays(log, habits, tasks, window, now?): number;
export function habitScore(log, habit, now?): number;   // pct pondéré par la série
export function categoryBreakdown(log, habits, window, now?): Record<Category, number>;
```

**Piège :** décision déjà instruite — 182 et 84 cellules restent en DOM ; le `<canvas>` n'est
justifié qu'**au-delà de 400 cellules** (`09-PLAN-AMELIORATION.md`, tâche `B7`). Ne pas
sur-optimiser.

---

## Task 5.7: Vue `goals` — 1,5 j

**Réf :** T3.15 · `05-SPEC-VUES.md` § 7 · route `/goals`

**Contenu existant à porter :** carte par objectif — type (`cumul` / `milestones` / `reduce`),
cible + unité, habitude source, échéance, barre de progression, puce d'état. Création par
brouillon, suppression annulable.

**À compléter** (le prototype ne les a pas) :

```ts
// lib/domain/goals.ts — à ajouter, avec tests
export function requiredPace(g, habits, log, now?): number | null;  // par jour restant
export function goalStatus(g, habits, log, now?): 'ahead' | 'ontime' | 'late' | 'done';
export function goalTrail(g, habits, log, points, now?): { date: DateKey; percent: number }[];
```

**Piège :** `reduce` compte les **échecs** — d'où `percent = 1 − current/total`. Une barre de
progression qui l'ignore affichera l'inverse de la réalité.

---

## Task 5.8: Vue `calendar` — 2,5 j · **la plus risquée**

**Réf :** T3.7 à T3.10 · `05-SPEC-VUES.md` § 3 · route `/calendar`

**Fichiers :** `components/calendar/{MonthGrid,TimeGrid,AgendaList,CalendarNav,dnd.ts}.tsx`

**Modes :** `month` (grille 6×7, intensité = `dayRatio`) · `week` (colonnes horaires) · `day` ·
`agenda` (liste chronologique).

> **À vérifier avant de porter :** `public/prototype/tests/RECETTE.md` § 1 mentionne **cinq** modes
> (« orbite, mois, semaine, jour, agenda ») alors que `05-SPEC-VUES.md` § 3 n'en documente que
> quatre. Ouvrir le prototype, trancher, et **corriger le document qui a tort** (G10).

**Interactions :** navigation par `calOff` avec animation directionnelle · **glisser-déposer**
d'une tâche vers un autre jour ou une autre heure · **redimensionnement** modifiant `duration`
(minimum 15 min) · toast « déplacé / redimensionné » annulable · clic sur un jour → `today` sur
ce jour.

**Dépendance :** `npm i @dnd-kit/core @dnd-kit/modifiers` (MIT).

**Piège majeur — accessibilité :** l'alternative clavier au glisser-déposer est **obligatoire**,
pas optionnelle (T3.9, T7.4). Une tâche doit pouvoir être déplacée et redimensionnée
intégralement au clavier.

**Tests spécifiques :**

```ts
test('déplacer une tâche au clavier change sa date', async ({ page }) => {
  const tache = page.getByRole('button', { name: /réunion de travail/i });
  await tache.focus();
  await page.keyboard.press('Enter');          // entre en mode déplacement
  await page.keyboard.press('ArrowRight');     // jour suivant
  await page.keyboard.press('Enter');          // valide
  await expect(page.getByRole('alert')).toContainText(/déplacé/i);
});

test('le redimensionnement ne descend pas sous 15 minutes', async ({ page }) => {
  const tache = page.getByRole('button', { name: /réunion/i });
  await tache.focus();
  await page.keyboard.press('Shift+ArrowUp');
  for (let i = 0; i < 10; i++) await page.keyboard.press('Shift+ArrowUp');
  await expect(tache).toHaveAttribute('data-duration', '15');
});
```

---

## Task 5.9: Vue `timer` — 1 j

**Réf :** T3.13, T3.14 · `05-SPEC-VUES.md` § 9 · route `/timer` · corrige **B5**

**Modes :** `pomo` (focus 25 min ×4, pause 5 min, pause longue 15 min) · `stopwatch` ·
`countdown` · `interval`.

**Contenu :** cadran circulaire animé · phase et cycle en cours · habitude liée (**crédit
automatique** à la fin de session) · sessions récentes du jour + total.

**Refonte imposée (B5)** — l'état persisté devient :

```ts
interface TimerState {
  mode: 'pomo' | 'stopwatch' | 'countdown' | 'interval';
  phase: 'focus' | 'break' | 'longBreak';
  cycle: number;
  startedAt: number | null;     // horodatage mural, null si en pause
  accumulatedMs: number;
  targetId: { kind: 'h' | 't' | ''; id: string };   // `tt` — clé figée (G1)
}
// écoulé = accumulatedMs + (startedAt ? Date.now() - startedAt : 0)
```

**Règles :**
- Le rendu (`setInterval` 250 ms ou `requestAnimationFrame`) est **purement d'affichage** : la
  fin de phase se détecte par comparaison au seuil, jamais par accumulation de ticks.
- À la restauration, la session reprend **toujours en pause**, écoulé conservé. Additionner le
  temps réel d'une session vieille de trois jours serait faux. Un toast signale la reprise.

**Tests :**

```ts
test('une session survit au rechargement, et reprend en pause', async ({ page }) => {
  await page.getByRole('button', { name: /démarrer/i }).click();
  await page.waitForTimeout(2000);
  await page.reload();
  await expect(page.getByRole('button', { name: /reprendre/i })).toBeVisible();
  await expect(page.getByTestId('elapsed')).not.toHaveText('00:00');
});

test('la dérive reste sous 1 seconde sur une phase simulée', async ({ page }) => {
  // horloge simulée : 25 minutes en accéléré, comparaison à Date.now()
});
```

---

## Task 5.10: Vue `notes` — 0,75 j

**Réf :** T3.16 · `05-SPEC-VUES.md` § 10 · route `/notes`

**Contenu :** journal du jour (zone auto-sauvegardée, clé `j|YYYY-MM-DD`) · humeur du jour ·
historique des entrées · notes liées aux habitudes · **recherche plein texte** (`notesRepo.search`,
Plan 2) · sessions récentes.

**Piège :** **G3** — `journalSeed()` a été neutralisé au lot 2 du prototype. Ne jamais
réintroduire de contenu généré pour les jours sans note. Un jour sans note est vide.

---

## Task 5.11: Vues `settings` et `profile` — 0,75 j

**Réf :** T3.18, T3.17 · `05-SPEC-VUES.md` § 11 et 12

**`settings` :** thème · langue · début de semaine · interrupteurs `notif`, `sound`, `vibrate`,
`confetti`, **« Sauvegarde locale sur cet appareil »** (jamais « cloud ») · export JSON ·
réinitialisation avec confirmation **en deux temps**.

> Les interrupteurs `notif`, `sound` et `vibrate` restent **désactivés et grisés**, avec une
> mention « bientôt », jusqu'à ce que le Plan 6 les branche. Un interrupteur actif sans effet est
> un mensonge d'interface — c'est la règle qui gouverne le Plan 6.

**`profile` :** identité (nom, identifiant, fonction, membre depuis) · avatar génératif OKLCH
(teintes `188, 214, 266, 318, 158, 32` — `04-DESIGN-TOKENS.md`) · statistiques personnelles ·
**liste des profils** avec bascule, création, **suppression avec confirmation** · import JSON.

---

## Critère de sortie du Plan 5

| # | Condition | Vérification |
|---|---|---|
| 1 | Les 11 vues affichent **les mêmes chiffres que le prototype** à la date figée | comparaison manuelle guidée + test de la tâche 5.2 |
| 2 | Chaque vue comparée à sa capture de référence | `public/prototype/tests/visual/reference/` |
| 3 | Aucun débordement à 390/768/1060/1440 px sur les 11 vues | e2e paramétré |
| 4 | 3 thèmes × 2 langues, aucune erreur console | `RECETTE.md` § 1 |
| 5 | Aucun calcul dans un composant | revue + couverture de `lib/domain` |
| 6 | Les 62 valeurs toujours vertes | `npx vitest run tests/unit/golden.test.ts` |
| 7 | axe sans violation critique sur les 11 routes | `tests/e2e/a11y.spec.ts` |
| 8 | Le calendrier est **intégralement pilotable au clavier** | e2e, tâche 5.8 |
| 9 | `npm run verify` et `npm run test:e2e` verts | — |

**À la sortie : parité fonctionnelle avec le prototype. Les Plans 6 et 7 peuvent démarrer en parallèle.**
