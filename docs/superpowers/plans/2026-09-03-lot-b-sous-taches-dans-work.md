# Lot B — Sous-tâches dans Work : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une étape de projet peut porter des sous-tâches cochables — nommées dans l'éditeur, comptées et cochées sur le tableau —, et elles traversent la sauvegarde sans se perdre.

**Architecture:** Un champ optionnel sur `ProjectTask`, deux fonctions pures dans `lib/domain/projects.ts`, une action de tranche, et deux composants existants réemployés (`LigneListe` pour la saisie, `SubList` pour le cochage). Aucune nouvelle table, aucune version de base : le champ s'ajoute à une entité déjà transportée en bloc par la synchronisation.

**Tech Stack:** Next.js 15, TypeScript strict (`exactOptionalPropertyTypes`), Zod, Dexie, Zustand, next-intl, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-02-ameliorations-ui-design.md` § Lot B

## Global Constraints

- **CLAUDE.md prime.** Piège n°1 : une liste de types recopiée finit par en oublier un —
  `PROJECT_STATUSES` s'importe, ne se réécrit pas. Piège du lot B (dit par la spec) :
  l'export et l'import énumèrent les champs de `ProjectTask` un par un, et un champ oublié
  là **disparaît en silence à chaque aller-retour**. C'est pourquoi la tâche 1 est
  l'aller-retour, pas l'interface.
- **Aucun chiffre affiché ne doit être fabriqué** (règle 3) : une étape sans sous-tâche
  n'affiche pas « 0/0 », elle n'affiche rien.
- **La progression du projet ne change pas de définition** : elle reste
  « étapes faites / étapes totales ». Cocher une sous-tâche ne doit déplacer aucune
  jauge de projet. C'est un invariant testé, pas une intention.
- Jamais de littéral dans le JSX (`react/jsx-no-literals`) ; toute clé ajoutée à
  `messages/fr.json` existe dans `en.json` (`npm run check:messages`).
- Couleurs par variables du thème (`var(--txt2)`, `var(--line)`…), jamais en dur.
- `lib/domain/` n'importe ni React, ni Next, ni la persistance (règle 2).
- Ne jamais renommer une clé persistée (règle 1). `sub` sur `ptask` est une clé **neuve**,
  elle n'en renomme aucune.
- Tout invariant nouveau est éprouvé par mutation (défaire le correctif → le test tombe)
  avant d'être tenu pour acquis.
- Fin de lot : `npm run verify` vert, `npm run test:e2e` vert desktop + mobile, CHANGELOG
  à jour, tout document de `docs/` qu'une décision rend faux corrigé dans la même livraison.

---

### Task 1: Le champ, sa lecture tolérante, et sa traversée de la sauvegarde

Le piège en premier, comme la spec l'exige. Rien d'affichable dans cette tâche : ce qui
est livré, c'est qu'un champ neuf ne puisse plus disparaître entre un export et un import.

**Files:**

- Modify: `lib/domain/types.ts:152-168` (interface `ProjectTask`)
- Modify: `lib/domain/projects.ts` (ajout de `projectSubItems`)
- Modify: `lib/data/export.ts:59-67` (interface `ExportedProjectTask`) et `:260-268` (projection)
- Modify: `lib/data/import.schema.ts:133-141` (`legacyProjectTask`)
- Modify: `lib/data/import.ts:296-312` (projection inverse)
- Modify: `docs/superpowers/specs/2026-09-02-ameliorations-ui-design.md` (§ Lot B — Modèle)
- Test: `tests/unit/data/work-aller-retour.test.ts`, `tests/unit/projects.test.ts`

**Interfaces:**

- Consumes: rien.
- Produces:
  - `ProjectTask.subItems?: { label: string; done: boolean }[]` — **optionnel**, voir le
    commentaire posé au Step 3.
  - `projectSubItems(t: ProjectTask): readonly { label: string; done: boolean }[]` —
    exporté par `lib/domain` (via `export * from './projects'`). C'est **le seul endroit du
    produit qui défait l'absence du champ** ; les tâches 2, 3 et 4 l'appellent, aucune
    n'écrit son propre `?? []`.
  - Clé d'export `sub` sur chaque entrée de `ptask` : `{ fr, en, done }[]`.

- [ ] **Step 1: Écrire les tests d'aller-retour — ils DOIVENT échouer**

Dans `tests/unit/data/work-aller-retour.test.ts`, à l'intérieur du `describe('aller-retour
de sauvegarde')`, après le test « réimporte tout, champ par champ » :

```ts
  it('les sous-tâches d’une étape traversent l’aller-retour', async () => {
    /* LE PIÈGE DU LOT B, pris de face. `export.ts` et `import.ts` énumèrent les
       champs de `ProjectTask` UN PAR UN : un champ ajouté au domaine et oublié
       là ne casse rien, ne dit rien, et se perd à chaque sauvegarde restaurée.
       Ce test est écrit AVANT le champ pour cette seule raison. */
    const projet = await projectsRepo.create({ name: 'Refonte', note: '' });
    await projectTasksRepo.create({
      projectId: projet.id,
      name: 'Intégration',
      assignee: '',
      deadline: '',
      status: 'doing',
      note: '',
      subItems: [
        { label: 'Pages statiques', done: true },
        { label: 'Menu mobile', done: false },
      ],
    });

    const charge = await exportToJson();
    await db.projects.clear();
    await db.projectTasks.clear();
    await importFromJson(JSON.stringify(charge));

    const etapes = await projectTasksRepo.list();
    /* L'ORDRE ET LE `done` COMPTENT AUTANT QUE LES INTITULÉS : une liste
       restituée toute décochée serait « importée » et pourtant fausse. */
    expect(etapes[0]?.subItems).toEqual([
      { label: 'Pages statiques', done: true },
      { label: 'Menu mobile', done: false },
    ]);
  });

  it('une étape d’AVANT le lot B s’importe, sans sous-tâche et sans erreur', async () => {
    /* Toutes les sauvegardes produites jusqu'à aujourd'hui ont des `ptask`
       SANS clé `sub`. Rendre la clé obligatoire écarterait toutes leurs
       étapes — la disparition silencieuse, dans l'autre sens. */
    const charge = JSON.stringify({
      app: 'Habitum',
      v: 5,
      habits: [],
      tasks: [],
      obj: [],
      log: {},
      ov: {},
      notes: {},
      sessions: [],
      shop: [],
      occ: {},
      proj: [{ id: 'p1', name: 'P', note: '' }],
      ptask: [{ id: 't1', projectId: 'p1', name: 'X', status: 'todo' }],
    });

    const rapport = await importFromJson(charge);
    expect(rapport.byEntity.projectTasks).toEqual({ read: 1, kept: 1 });
    const etapes = await projectTasksRepo.list();
    expect(etapes[0]?.subItems).toEqual([]);
  });
```

Et dans `tests/unit/projects.test.ts`, à la fin du fichier :

```ts
describe('projectSubItems', () => {
  it('rend une liste vide pour une étape écrite AVANT le lot B', () => {
    /* Une étape d'avant ce lot n'a pas le champ — ni en base locale, ni dans
       une ligne reçue d'un appareil resté en arrière (la synchronisation
       transporte l'entité telle quelle, sans validation). Lire `.length` sur
       `undefined` planterait le tableau ; c'est ici, et ici seulement, que
       l'absence est défaite. */
    expect(projectSubItems(tache({ id: 'a' }))).toEqual([]);
  });

  it('rend la liste telle quelle quand elle existe', () => {
    const items = [{ label: 'Menu mobile', done: false }];
    expect(projectSubItems(tache({ id: 'a', subItems: items }))).toEqual(items);
  });
});
```

Ajouter `projectSubItems` à la liste d'imports en tête de `tests/unit/projects.test.ts`.

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run tests/unit/data/work-aller-retour.test.ts tests/unit/projects.test.ts`
Expected: FAIL — `subItems` vaut `undefined` après l'aller-retour (l'export ne le porte
pas), et `projectSubItems` n'existe pas (`is not a function`).

- [ ] **Step 3: Ajouter le champ au domaine**

Dans `lib/domain/types.ts`, interface `ProjectTask`, après `note: string;` :

```ts
  /** Sous-tâches de l'étape — lot B (spec du 2026-09-02).
   *
   *  DIFFÉRENCE ASSUMÉE avec `Habit.subItems` (`{ label }` seul) : pour une
   *  habitude, l'accompli du jour vit dans le journal, une même liste étant
   *  recochée chaque jour ; pour une étape de projet, l'accompli est
   *  intrinsèque et unique — il vit donc dans l'entité.
   *
   *  OPTIONNEL, ET CE N'EST PAS UN OUBLI. Les étapes écrites avant ce lot n'ont
   *  pas ce champ : ni celles déjà en base, ni celles qu'un appareil resté en
   *  arrière enverra (`lib/sync/entites.ts` écrit la ligne reçue telle quelle,
   *  sans validation ni valeur par défaut). Le déclarer requis mentirait au
   *  compilateur — la ligne existe, sans le champ — et le tableau planterait
   *  sur `.length`. `projectSubItems()` défait l'absence, en un seul endroit. */
  subItems?: { label: string; done: boolean }[];
```

- [ ] **Step 4: Ajouter la lecture tolérante au domaine**

Dans `lib/domain/projects.ts`, après `groupProjectTasks` :

```ts
/** Sous-tâches d'une étape, absence comprise.
 *
 *  LE SEUL `?? []` DU PRODUIT SUR CE CHAMP. Recopié dans chaque vue, il
 *  finirait par manquer dans une — et cette vue-là planterait sur la première
 *  étape d'avant le lot B, c'est-à-dire sur toutes celles des utilisateurs
 *  actuels. */
export const projectSubItems = (t: ProjectTask): readonly { label: string; done: boolean }[] =>
  t.subItems ?? [];
```

- [ ] **Step 5: Porter le champ dans l'export**

Dans `lib/data/export.ts`, interface `ExportedProjectTask`, après `note: string;` :

```ts
  /** Sous-tâches — clé NEUVE (lot B). Format `{ fr, en, done }` comme les
   *  sous-tâches de `tasks` : c'est celui que l'importateur sait déjà lire, et
   *  il garde la place d'un libellé traduit sans en inventer un. */
  sub: { fr: string; en: string; done: boolean }[];
```

Dans la projection `ptask` (`lib/data/export.ts`, ~ligne 260), après `note: t.note,` :

```ts
      sub: projectSubItems(t).map((s) => ({ fr: s.label, en: s.label, done: s.done })),
```

`lib/data/export.ts:2` importe déjà `@/lib/domain` (`logKey, parseOccurrenceKey, type
Frequence`) : y ajouter `projectSubItems`, sans créer un second import.

- [ ] **Step 6: Porter le champ dans l'import**

Dans `lib/data/import.schema.ts`, objet `legacyProjectTask`, après `note: z.string().default('')` :

```ts
  /* Sous-tâches — lot B. `.default([])` n'est pas de la complaisance : une
     sauvegarde produite avant ce lot n'a pas la clé, et l'absence ne doit
     écarter aucune étape. Même forme que `sub` sur `legacyTask`. */
  sub: z
    .array(
      z.object({
        fr: z.string().optional(),
        en: z.string().optional(),
        done: z.boolean().default(false),
      }),
    )
    .default([]),
```

Dans `lib/data/import.ts`, projection `projectTasks`, après `note: t.note,` :

```ts
      subItems: t.sub.map((s) => ({ label: texte(s.fr, s.en), done: s.done })),
```

- [ ] **Step 7: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run tests/unit/data/ tests/unit/projects.test.ts`
Expected: PASS, y compris les tests d'aller-retour préexistants (une sauvegarde d'avant
Work, une étape orpheline, un statut inconnu).

- [ ] **Step 8: Éprouver le filet par mutation**

Retirer la ligne `sub:` de la projection d'export (Step 5), relancer
`npx vitest run tests/unit/data/work-aller-retour.test.ts` : le premier test doit
ÉCHOUER (`subItems` rendu `[]` au lieu des deux entrées). Remettre la ligne, revérifier le
vert. Consigner le résultat dans le rapport de tâche : un filet qui reste vert quand on le
sabote ne protège rien.

- [ ] **Step 9: Corriger la spec, qui dit autre chose**

`docs/superpowers/specs/2026-09-02-ameliorations-ui-design.md` § Lot B — Modèle annonce
`subItems: { label: string; done: boolean }[]`, défaut `[]` — donc un champ requis.
Remplacer la phrase par ce qui est réellement livré :

```markdown
`ProjectTask` gagne `subItems?: { label: string; done: boolean }[]`. **Optionnel, et non
requis comme annoncé au cadrage** : les étapes déjà écrites n'ont pas ce champ — ni en
base, ni dans une ligne reçue d'un appareil resté en arrière, la synchronisation écrivant
l'entité telle quelle sans valeur par défaut. Le déclarer requis mentirait au compilateur
et ferait planter le tableau sur `.length`. L'absence est défaite en un seul endroit,
`projectSubItems()` dans `lib/domain/projects.ts`, jamais dans les vues.
```

- [ ] **Step 10: Commit**

```bash
git add lib/domain/types.ts lib/domain/projects.ts lib/data/export.ts lib/data/import.ts lib/data/import.schema.ts tests/unit/data/work-aller-retour.test.ts tests/unit/projects.test.ts docs/superpowers/specs/2026-09-02-ameliorations-ui-design.md
git commit -m "$(cat <<'EOF'
feat(work): une étape peut porter des sous-tâches, et elles survivent à la sauvegarde

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Le compte, dans le domaine — et la progression qui ne bouge pas

**Files:**

- Modify: `lib/domain/projects.ts`
- Test: `tests/unit/projects.test.ts`

**Interfaces:**

- Consumes: `projectSubItems` (tâche 1).
- Produces: `subItemCount(t: ProjectTask): { done: number; total: number } | null` — `null`
  quand l'étape n'a aucune sous-tâche. Les tâches 3 et 4 s'en servent pour décider
  d'afficher, ou non, un compteur.

- [ ] **Step 1: Écrire les tests — ils DOIVENT échouer**

Dans `tests/unit/projects.test.ts`, après le `describe('projectSubItems')` :

```ts
describe('subItemCount', () => {
  it('rend null quand il n’y a rien à avancer', () => {
    /* « 0/0 » afficherait un avancement là où il n'existe pas — un chiffre
       fabriqué, ce que la règle 3 du CLAUDE.md interdit. Même doctrine que
       `subTaskCount` pour les tâches. */
    expect(subItemCount(tache({ id: 'a' }))).toBeNull();
    expect(subItemCount(tache({ id: 'b', subItems: [] }))).toBeNull();
  });

  it('compte les faites sur le total', () => {
    const t = tache({
      id: 'a',
      subItems: [
        { label: 'un', done: true },
        { label: 'deux', done: false },
        { label: 'trois', done: true },
      ],
    });
    expect(subItemCount(t)).toEqual({ done: 2, total: 3 });
  });
});

describe('les sous-tâches ne redéfinissent PAS la progression du projet', () => {
  /* L'invariant le plus facile à casser du lot, et le plus coûteux : si une
     sous-tâche cochée faisait bouger la jauge du projet, deux jauges
     bougeraient d'un même geste et plus personne ne saurait ce que mesure
     celle du projet. La progression reste « étapes faites / étapes totales ». */

  it('une étape non terminée dont TOUTES les sous-tâches sont faites ne compte pas comme faite', () => {
    const av = projectProgress([
      tache({
        id: 'a',
        status: 'doing',
        subItems: [
          { label: 'un', done: true },
          { label: 'deux', done: true },
        ],
      }),
      tache({ id: 'b', status: 'todo' }),
    ]);
    expect(av).toEqual({ done: 0, total: 2, pct: 0 });
  });

  it('une étape terminée dont AUCUNE sous-tâche n’est faite compte comme faite', () => {
    const av = projectProgress([
      tache({
        id: 'a',
        status: 'done',
        subItems: [
          { label: 'un', done: false },
          { label: 'deux', done: false },
        ],
      }),
      tache({ id: 'b', status: 'todo' }),
    ]);
    expect(av).toEqual({ done: 1, total: 2, pct: 50 });
  });
});
```

Ajouter `subItemCount` aux imports en tête du fichier.

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run tests/unit/projects.test.ts`
Expected: FAIL — `subItemCount is not a function`. Les deux tests d'invariance, eux,
doivent passer DÈS MAINTENANT (`projectProgress` ne lit pas les sous-tâches) : ils
verrouillent un comportement existant contre une modification future. Si l'un des deux
échoue à ce stade, c'est que `projectProgress` a été touché à tort — s'arrêter et le dire.

- [ ] **Step 3: Écrire la fonction**

Dans `lib/domain/projects.ts`, après `projectSubItems` :

```ts
/** Sous-tâches faites sur le total d'une étape. `null` s'il n'y en a pas :
 *  « 0/0 » afficherait un avancement là où il n'y a rien à avancer — même
 *  règle que `subTaskCount` pour les tâches du calendrier.
 *
 *  CE COMPTE NE NOURRIT PAS `projectProgress`, et c'est délibéré : les
 *  sous-tâches DÉTAILLENT une étape, elles ne la fractionnent pas. Les faire
 *  entrer dans l'avancement du projet ferait bouger deux jauges d'un même
 *  geste, et plus personne ne saurait ce que mesure celle du projet. */
export const subItemCount = (t: ProjectTask): { done: number; total: number } | null => {
  const items = projectSubItems(t);
  return items.length ? { done: items.filter((s) => s.done).length, total: items.length } : null;
};
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run tests/unit/projects.test.ts`
Expected: PASS (tous les `describe` du fichier, les anciens compris).

- [ ] **Step 5: Éprouver l'invariant par mutation**

Modifier temporairement `projectProgress` pour qu'il compte une étape comme faite quand
toutes ses sous-tâches le sont, relancer : les deux tests d'invariance doivent ROUGIR.
Défaire la mutation, revérifier le vert. Consigner dans le rapport de tâche.

- [ ] **Step 6: Commit**

```bash
git add lib/domain/projects.ts tests/unit/projects.test.ts
git commit -m "$(cat <<'EOF'
feat(domain): compter les sous-tâches d'une étape, sans toucher à la progression du projet

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Le tableau — compteur, dépliage, cochage en place

**Files:**

- Modify: `components/today/SubList.tsx` (retrait facultatif du décalage)
- Modify: `components/work/ProjectBoard.tsx` (`LigneTache`)
- Modify: `lib/store/types.ts:172-181` (`ProjectsActions`)
- Modify: `lib/store/slices/projects.ts` (action `toggleProjectSubItem`)
- Modify: `messages/fr.json`, `messages/en.json` (clé `app.subA`)
- Modify: `lib/data/seed.ts:396-410` et `tests/fixtures/demo-seed.ts:345-355` (jeu de démonstration)
- Test: `tests/e2e/vue-work.spec.ts`

**Interfaces:**

- Consumes: `subItemCount`, `projectSubItems` (tâches 1 et 2) ; `SubList` et `RowCheck`
  (existants).
- Produces:
  - `toggleProjectSubItem(id: string, index: number): Promise<void>` sur le store.
  - Le bouton de dépliage porte le nom accessible `` `${t('subA')} : ${tache.name}` `` —
    soit « Afficher les sous-tâches : Intégration ». La tâche 4 et la tâche 5 s'en servent
    comme sélecteur.
  - Le jeu de démonstration : l'étape `pt3` « Intégration » porte 3 sous-tâches dont 1
    faite ; les quatre autres étapes n'ont PAS le champ.

- [ ] **Step 1: Écrire le test e2e — il DOIT échouer**

Dans `tests/e2e/vue-work.spec.ts`, avant le test « sans débordement horizontal » :

```ts
  test('les sous-tâches se comptent, se déplient et se cochent sur la ligne', async ({
    page,
  }) => {
    await ouvrirAvecDemo(page, ROUTE);
    await page.getByRole('button', { name: 'Ouvrir Refonte du site' }).click();

    const detail = page.getByRole('button', { name: 'Afficher les sous-tâches : Intégration' });
    await expect(detail).toContainText('1/3');

    /* Une étape SANS sous-tâche n'affiche pas « 0/0 » : il n'y a rien à
       avancer, et un compteur vide serait un chiffre fabriqué (règle 3). */
    await expect(
      page.getByRole('button', { name: 'Afficher les sous-tâches : Mise en ligne' }),
    ).toHaveCount(0);

    /* Replié par défaut : trois colonnes de listes ouvertes rendraient le
       tableau illisible sur téléphone. */
    await expect(page.getByRole('checkbox', { name: 'Menu mobile' })).toHaveCount(0);
    await detail.click();

    const projet = page.getByText('2 sur 5');
    await expect(projet).toBeVisible();

    await page.getByRole('checkbox', { name: 'Menu mobile' }).click();
    await expect(detail).toContainText('2/3');

    /* LA JAUGE DU PROJET NE BOUGE PAS. Les sous-tâches détaillent une étape,
       elles ne la fractionnent pas : deux jauges qui bougent d'un même geste
       ne mesurent plus rien de compréhensible. */
    await expect(projet).toBeVisible();
    await expect(page.locator('[data-colonne="done"] [data-ptask]')).toHaveCount(2);

    /* ÉCRIT EN BASE, pas seulement à l'écran : un cochage qui ne survit pas au
       rechargement est un cochage perdu. */
    await page.reload();
    await page.getByRole('button', { name: 'Ouvrir Refonte du site' }).click();
    await expect(
      page.getByRole('button', { name: 'Afficher les sous-tâches : Intégration' }),
    ).toContainText('2/3');
  });
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx playwright test tests/e2e/vue-work.spec.ts --project=desktop -g "se comptent"`
Expected: FAIL — aucun bouton nommé « Afficher les sous-tâches : Intégration ».

- [ ] **Step 3: Poser les sous-tâches dans les deux jeux de démonstration**

Dans `tests/fixtures/demo-seed.ts`, l'entrée `pt3` gagne le champ (les quatre autres n'y
touchent pas) :

```ts
  {
    id: 'pt3',
    projectId: DEMO_PROJECT_ID,
    name: 'Intégration',
    assignee: 'Alex',
    deadline: '2026-08-04',
    status: 'doing',
    note: '',
    /* UNE SEULE étape en porte, et les quatre autres restent SANS le champ :
       c'est l'état réel d'une base d'avant le lot B, reproduit dans le jeu de
       test plutôt que supposé absent. */
    subItems: [
      { label: 'Pages statiques', done: true },
      { label: 'Formulaire de contact', done: false },
      { label: 'Menu mobile', done: false },
    ],
    createdAt: ISO,
    updatedAt: ISO,
  },
```

Dans `lib/data/seed.ts`, le tableau des cinq étapes gagne une clé `sub` sur chacune (vide
pour quatre d'entre elles), et la création la porte :

```ts
  for (const etape of [
    { name: 'Cadrer le besoin', assignee: 'Alex', off: -6, status: 'done', sub: [] },
    { name: 'Maquettes des trois pages', assignee: 'Sam', off: -2, status: 'done', sub: [] },
    {
      name: 'Intégration',
      assignee: 'Alex',
      off: -1,
      status: 'doing',
      /* Une seule étape détaillée : montrer à quoi sert le dépliage sans
         transformer la démonstration en liste de courses. */
      sub: [
        { label: 'Pages statiques', done: true },
        { label: 'Formulaire de contact', done: false },
        { label: 'Menu mobile', done: false },
      ],
    },
    { name: 'Relire les textes', assignee: '', off: 4, status: 'todo', sub: [] },
    { name: 'Mise en ligne', assignee: 'Sam', off: null, status: 'todo', sub: [] },
  ] as const) {
    await projectTasksRepo.create({
      projectId: projet.id,
      name: etape.name,
      assignee: etape.assignee,
      deadline: etape.off === null ? '' : dateKey(addDays(maintenant, etape.off)),
      status: etape.status,
      note: '',
      subItems: [...etape.sub],
    });
  }
```

- [ ] **Step 4: Ajouter l'action au store**

Dans `lib/store/types.ts`, interface `ProjectsActions`, après `setProjectTaskStatus` :

```ts
  /** Coche ou décoche la sous-tâche à cette position. */
  toggleProjectSubItem(id: string, index: number): Promise<void>;
```

Dans `lib/store/slices/projects.ts`, après `setProjectTaskStatus` :

```ts
  /* Cocher SUR LA LIGNE, comme le statut : passer par l'éditeur coûterait
     quatre gestes là où un seul suffit.
     L'index est celui de la liste affichée, qui EST celle de l'entité — aucune
     réindexation entre les deux. Une position hors liste ne fait rien plutôt
     que d'écrire un trou en base. */
  async toggleProjectSubItem(id, index) {
    const tache = get().projectTasks.find((x) => x.id === id);
    if (!tache) return;
    const items = projectSubItems(tache);
    if (!items[index]) return;
    await get().updateProjectTask(id, {
      subItems: items.map((s, i) => (i === index ? { ...s, done: !s.done } : s)),
    });
  },
```

Ajouter en tête du fichier : `import { projectSubItems } from '@/lib/domain';`

- [ ] **Step 5: Ajouter la clé de libellé, dans les deux langues**

`messages/fr.json`, namespace `app`, entre `"streaks"` et `"switchLang"` (l'ordre est
alphabétique dans tout le fichier) :

```json
    "subA": "Afficher les sous-tâches",
```

`messages/en.json`, au même endroit :

```json
    "subA": "Show subtasks",
```

Run: `npm run check:messages` — doit rester vert.

- [ ] **Step 6: Rendre le décalage de `SubList` réglable**

`components/today/SubList.tsx` décale sa liste de 38 px, largeur de la case à cocher des
lignes d'Aujourd'hui et de Tâches. Le tableau de projet n'a pas de case en tête de ligne :
le décalage y serait un renfoncement sans cause. Rendre la valeur paramétrable, défaut
inchangé pour les trois appelants existants (`components/today/HabitRow.tsx`,
`components/today/TaskRow.tsx` et `components/tasks/TaskItem.tsx`) :

```tsx
export function SubList({
  items,
  disabled,
  onToggle,
  indent = 38,
}: {
  items: readonly SousElement[];
  disabled?: boolean;
  onToggle: (index: number) => void;
  /** Décalage à gauche, en pixels. 38 = largeur de la case à cocher qui ouvre
   *  les lignes d'Aujourd'hui et de Tâches, sous laquelle la sous-liste
   *  s'aligne. Le tableau de projet n'a pas cette case : il passe 0. */
  indent?: number | undefined;
}) {
```

et sur le `<ul>`, remplacer la classe `pl-[38px]` par le style :

```tsx
    <ul
      className="m-0 flex list-none flex-col gap-2 border-t p-0 pt-2.5"
      style={{ borderColor: 'var(--line)', paddingLeft: indent }}
      aria-label={t('toggleSub')}
    >
```

- [ ] **Step 7: Afficher le compteur, le chevron et la liste dans `LigneTache`**

Dans `components/work/ProjectBoard.tsx` :

- imports : ajouter `useState` de `react`, `ChevronDown` de `lucide-react`,
  `projectSubItems` et `subItemCount` à l'import de `@/lib/domain`, et
  `import { SubList } from '@/components/today/SubList';`
- dans `LigneTache`, après les autres `useStore` :

```tsx
  const toggleProjectSubItem = useStore((s) => s.toggleProjectSubItem);
  /* Replié par défaut, état LOCAL à la ligne : trois colonnes de listes
     ouvertes rendraient le tableau illisible sur téléphone, et le pli d'une
     ligne n'intéresse ni la base ni les autres appareils. */
  const [deplie, setDeplie] = useState(false);

  const sous = subItemCount(tache);
  /* Assemblé en JavaScript et non en JSX : « / » entre deux accolades est un
     littéral, que `react/jsx-no-literals` refuse. Même forme que `TaskItem`. */
  const avancement = sous ? `${sous.done}/${sous.total}` : '';
```

- dans le premier `<div className="flex items-start gap-3">`, entre le nom et le bouton
  crayon :

```tsx
        {sous ? (
          <button
            type="button"
            onClick={() => setDeplie((x) => !x)}
            aria-expanded={deplie}
            aria-label={`${t('subA')} : ${tache.name}`}
            className="rounded-btn-sm flex h-7 flex-none cursor-pointer items-center gap-1 border px-1.5"
            style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
          >
            <span className="font-mono text-[11px] whitespace-nowrap">{avancement}</span>
            <ChevronDown
              size={12}
              aria-hidden="true"
              style={{ transform: deplie ? 'rotate(180deg)' : 'none' }}
            />
          </button>
        ) : null}
```

- à la fin du `<li>`, après le `<Select>` :

```tsx
      {sous && deplie ? (
        /* `indent={0}` : la ligne du tableau n'a pas de case à cocher en tête,
           donc rien sous quoi aligner la sous-liste. */
        <SubList
          items={projectSubItems(tache)}
          indent={0}
          onToggle={(i) => void toggleProjectSubItem(tache.id, i)}
        />
      ) : null}
```

- [ ] **Step 8: Lancer le test et vérifier qu'il passe**

Run: `npx playwright test tests/e2e/vue-work.spec.ts --project=desktop --project=mobile`
Expected: PASS — le test neuf comme les six existants (dont « le jeu de démonstration
montre un projet réel », qui compte toujours 5 étapes, et le contrôle d'accessibilité).

- [ ] **Step 9: Vérifier que le reste du produit n'a pas bougé**

Run: `npx vitest run && npx playwright test tests/e2e/vue-today.spec.ts tests/e2e/vue-tasks.spec.ts --project=desktop`
Expected: PASS — `SubList` sert aussi Aujourd'hui et Tâches, par trois appelants
(`components/today/HabitRow.tsx`, `components/today/TaskRow.tsx` et
`components/tasks/TaskItem.tsx`) ; son décalage par défaut doit y être resté exactement le
même (38 px).

- [ ] **Step 10: Commit**

```bash
git add components/work/ProjectBoard.tsx components/today/SubList.tsx lib/store/types.ts lib/store/slices/projects.ts lib/data/seed.ts tests/fixtures/demo-seed.ts messages/fr.json messages/en.json tests/e2e/vue-work.spec.ts
git commit -m "$(cat <<'EOF'
feat(work): les sous-tâches se comptent, se déplient et se cochent sur la ligne

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: L'éditeur d'étape — nommer les sous-tâches sans défaire ce qui est fait

**Files:**

- Modify: `lib/validation/project.schema.ts`
- Modify: `components/editor/ProjectTaskEditor.tsx`
- Test: `tests/e2e/vue-work.spec.ts`

**Interfaces:**

- Consumes: le bouton nommé `« Afficher les sous-tâches : {nom} »` (tâche 3), `LigneListe`
  et `TextInput` de `components/editor/fields.tsx` (existants), les clés `editor.fSub` et
  `editor.addSub` (existantes — aucune clé neuve dans cette tâche).
- Produces: `ProjectTaskForm.subItems: { label: string; done: boolean }[]`.

- [ ] **Step 1: Écrire les tests e2e — ils DOIVENT échouer**

Dans `tests/e2e/vue-work.spec.ts`, après le test de la tâche 3 :

```ts
  test('l’éditeur nomme les sous-tâches, et ne défait pas ce qui est fait', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    await page.getByRole('button', { name: 'Ouvrir Refonte du site' }).click();

    const detail = page.getByRole('button', { name: 'Afficher les sous-tâches : Intégration' });
    await expect(detail).toContainText('1/3');

    await page.getByRole('button', { name: 'Modifier Intégration' }).click();
    const boite = page.getByRole('dialog');
    await boite.getByRole('button', { name: 'Ajouter une sous-tâche' }).click();
    await boite.getByLabel('Sous-tâches 4').fill('Pied de page');
    await page.getByRole('button', { name: /enregistrer/i }).click();

    /* 1/4, PAS 0/4. `done` traverse le formulaire sans être modifié : un
       éditeur qui ne transporte que les intitulés décocherait toutes les
       sous-tâches faites au premier enregistrement de l'étape — une perte
       silencieuse, invisible à la relecture du diff. */
    await expect(
      page.getByRole('button', { name: 'Afficher les sous-tâches : Intégration' }),
    ).toContainText('1/4');
  });

  test('une étape neuve peut naître avec ses sous-tâches', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    await page.getByRole('button', { name: 'Nouveau projet' }).first().click();
    await page.getByRole('dialog').getByRole('textbox').first().fill('Déménagement');
    await page.getByRole('button', { name: /enregistrer/i }).click();

    await page.getByRole('button', { name: 'Ouvrir Déménagement' }).click();
    await page.getByRole('button', { name: 'Nouvelle tâche' }).first().click();

    const boite = page.getByRole('dialog');
    await boite.getByRole('textbox').first().fill('Réserver le camion');
    await boite.getByRole('button', { name: 'Ajouter une sous-tâche' }).click();
    await boite.getByLabel('Sous-tâches 1').fill('Comparer trois loueurs');
    await boite.getByRole('button', { name: 'Ajouter une sous-tâche' }).click();
    await boite.getByLabel('Sous-tâches 2').fill('Réserver');
    await page.getByRole('button', { name: /enregistrer/i }).click();

    await expect(
      page.getByRole('button', { name: 'Afficher les sous-tâches : Réserver le camion' }),
    ).toContainText('0/2');
  });
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx playwright test tests/e2e/vue-work.spec.ts --project=desktop -g "éditeur|neuve"`
Expected: FAIL — l'éditeur d'étape n'a pas de bouton « Ajouter une sous-tâche ».

- [ ] **Step 3: Ajouter le champ au schéma de formulaire**

Dans `lib/validation/project.schema.ts`, objet `projectTaskFormSchema`, après `note` :

```ts
  /* Sous-tâches — lot B. Intitulé non vide, comme les sous-éléments d'habitude
     (`habit.schema.ts`) : une ligne ajoutée puis laissée vide serait une case à
     cocher sans nom.

     `done` FAIT PARTIE DU FORMULAIRE et n'y est jamais modifié : l'éditeur
     nomme, il ne coche pas (le cochage se fait sur la ligne du tableau).
     L'omettre ici ferait repasser à `false` toute sous-tâche déjà faite au
     premier enregistrement de l'étape — une perte que rien n'annoncerait. */
  subItems: z
    .array(z.object({ label: z.string().trim().min(1, 'labelRequired'), done: z.boolean() }))
    .default([]),
```

- [ ] **Step 4: Ajouter le champ à l'éditeur**

Dans `components/editor/ProjectTaskEditor.tsx` :

- `versFormulaire` gagne une ligne, après `note` :

```ts
  /* `projectSubItems`, et non `t?.subItems ?? []` : l'absence du champ se
     défait à UN SEUL endroit du produit (tâche 1). La copie est nécessaire —
     le domaine rend une liste en lecture seule, le formulaire la modifie. */
  subItems: t ? [...projectSubItems(t)] : [],
```

- imports : `import { LigneListe, Select, TextArea, TextInput } from './fields';` et
  `projectSubItems` ajouté à l'import existant depuis `@/lib/domain`
  (`PROJECT_STATUSES, type ProjectTask`)
- dans le JSX, entre le `<Select>` du statut et le `<TextArea>` de la note :

```tsx
      <LigneListe
        legend={t('fSub')}
        items={v.subItems}
        addLabel={t('addSub')}
        onAdd={() => setValue('subItems', [...v.subItems, { label: '', done: false }])}
        onRemove={(i) =>
          setValue(
            'subItems',
            v.subItems.filter((_, j) => j !== i),
          )
        }
        error={errors.subItems ? messageErreur('labelRequired') : undefined}
      >
        {(i) => (
          <TextInput
            label={`${t('fSub')} ${i + 1}`}
            value={v.subItems[i]?.label ?? ''}
            onChange={(x) =>
              setValue(
                'subItems',
                /* `{ ...s, label: x }` et non `{ label: x }` : le second
                   perdrait `done` à chaque frappe. */
                v.subItems.map((s, j) => (j === i ? { ...s, label: x } : s)),
              )
            }
          />
        )}
      </LigneListe>
```

- [ ] **Step 5: Lancer les tests et vérifier qu'ils passent**

Run: `npx playwright test tests/e2e/vue-work.spec.ts --project=desktop --project=mobile`
Expected: PASS — les neuf tests du fichier.

- [ ] **Step 6: Éprouver le piège par mutation**

Remplacer `{ ...s, label: x }` par `{ label: x, done: false }` dans le Step 4, relancer
`-g "éditeur"` : le test doit ÉCHOUER en affichant `0/4`. Défaire, revérifier le vert.
Consigner dans le rapport de tâche — c'est l'unique preuve que ce test attrape ce pour quoi
il est écrit.

- [ ] **Step 7: Commit**

```bash
git add lib/validation/project.schema.ts components/editor/ProjectTaskEditor.tsx tests/e2e/vue-work.spec.ts
git commit -m "$(cat <<'EOF'
feat(editor): l'éditeur d'étape nomme les sous-tâches sans décocher celles qui sont faites

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Le filet — aucun texte coupé sur le tableau déplié, aux cinq largeurs

Le filet du lot A (`tests/e2e/debordements.spec.ts`) balaie sept **routes**. Le tableau
d'un projet n'en est pas une : il s'atteint en cliquant une carte, l'ouverture étant un
état local (`WorkView` le documente). Les lignes que le lot B vient d'alourdir — un
compteur, un chevron et une liste de plus — sont donc hors de portée du filet existant.
Cette tâche leur en donne un, en réemployant sa mesure plutôt qu'en la recopiant.

**Files:**

- Create: `tests/e2e/helpers/debordement.ts`
- Modify: `tests/e2e/debordements.spec.ts` (import au lieu de définition locale)
- Test: `tests/e2e/vue-work.spec.ts`

**Interfaces:**

- Consumes: le bouton `« Afficher les sous-tâches : {nom} »` (tâche 3).
- Produces: `releverDebordements(page): Promise<{ releve: string[]; balayes: number; exclusSwitch: number }>`,
  exportée depuis `tests/e2e/helpers/debordement.ts`.

- [ ] **Step 1: Déplacer la mesure dans un module d'aide, sans en changer une ligne**

Créer `tests/e2e/helpers/debordement.ts` : y couper **tel quel** le bloc commentaire de
tête de `tests/e2e/debordements.spec.ts` (de « Débordements MESURÉS » jusqu'à la fin des
angles morts) et la fonction `releverDebordements`, en l'exportant :

```ts
import type { Page } from '@playwright/test';

/* … le commentaire de `debordements.spec.ts`, déplacé sans retouche … */

export async function releverDebordements(
  page: Page,
): Promise<{ releve: string[]; balayes: number; exclusSwitch: number }> {
  return page.evaluate(() => {
    /* … corps inchangé … */
  });
}
```

Dans `tests/e2e/debordements.spec.ts`, remplacer la définition par
`import { releverDebordements } from './helpers/debordement';`, et ajouter une phrase au
commentaire restant :

```ts
/* La mesure vit dans `helpers/debordement.ts` depuis le lot B : le tableau d'un
   projet ne s'atteint pas par une route (l'ouverture est un état local de
   `WorkView`), donc `vue-work.spec.ts` la réemploie plutôt que de la recopier —
   une deuxième copie de la doctrine d'exclusion aurait divergé de celle-ci au
   premier ajustement. */
```

- [ ] **Step 2: Vérifier que le filet du lot A n'a pas bougé**

Run: `npx playwright test tests/e2e/debordements.spec.ts --project=desktop`
Expected: PASS — 35 cas, exactement comme avant le déplacement.

- [ ] **Step 3: Écrire le test du tableau déplié**

Dans `tests/e2e/vue-work.spec.ts` : ajouter
`import { releverDebordements } from './helpers/debordement';` en tête, puis, après le test
de non-débordement existant :

```ts
  test('le tableau ouvert, sous-tâches dépliées, ne coupe aucun texte', async ({ page }) => {
    /* `verifierPaliers` ci-dessus ne voit que le défilement du DOCUMENT : un
       libellé coupé PAR SA BOÎTE n'y paraît jamais. C'est la mesure du lot A
       qui l'attrape, et le tableau d'un projet lui échappe faute d'être une
       route — il s'ouvre au clic. */
    await ouvrirAvecDemo(page, ROUTE);
    await page.getByRole('button', { name: 'Ouvrir Refonte du site' }).click();
    await page.getByRole('button', { name: 'Afficher les sous-tâches : Intégration' }).click();
    await expect(page.getByRole('checkbox', { name: 'Menu mobile' })).toBeVisible();

    for (const largeur of [360, 390, 768, 1060, 1440]) {
      await page.setViewportSize({ width: largeur, height: 900 });
      await page.waitForTimeout(50);
      const { releve, balayes, exclusSwitch } = await releverDebordements(page);

      expect(
        balayes,
        `${largeur}px : seulement ${balayes} élément(s) balayé(s) — mesure suspecte`,
      ).toBeGreaterThan(20);
      /* Work n'affiche aucun interrupteur : l'exclusion du `Switch` n'a rien à
         y écarter. Un chiffre non nul dirait qu'elle s'est élargie. */
      expect(exclusSwitch, `${largeur}px`).toBe(0);
      expect(releve, `à ${largeur}px`).toEqual([]);
    }
  });
```

- [ ] **Step 4: Lancer le test**

Run: `npx playwright test tests/e2e/vue-work.spec.ts --project=desktop --project=mobile -g "ne coupe aucun texte"`
Expected: PASS. **S'il échoue, c'est un vrai défaut d'affichage introduit par ce lot** :
corriger la mise en page — en faisant céder le voisin le moins porteur d'information,
JAMAIS en scindant un mot (doctrine tranchée en clôture du lot A) —, puis relancer.
Consigner le relevé exact et le correctif dans le rapport de tâche.

- [ ] **Step 5: Éprouver le filet par mutation**

Remplacer temporairement `whitespace-nowrap` du compteur par rien et forcer un intitulé
long (par exemple `subItems: [{ label: 'Formulaire de contact et de rappel immédiat', … }]`
dans `tests/fixtures/demo-seed.ts`) : le test doit rougir à 360 px. Tout défaire, revérifier
le vert. Consigner dans le rapport de tâche.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/helpers/debordement.ts tests/e2e/debordements.spec.ts tests/e2e/vue-work.spec.ts
git commit -m "$(cat <<'EOF'
test(e2e): la mesure des coupes de texte suit le tableau de projet, qui n'est pas une route

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Clôture du lot

**Files:**

- Modify: `CHANGELOG.md`
- Test: la recette entière

- [ ] **Step 1: Lancer la vérification complète**

Run: `npm run verify`
Expected: vert — types, lint, format, symétrie FR/EN, jetons, polices, icônes, build,
tests unitaires.

- [ ] **Step 2: Lancer la recette de bout en bout, desktop ET mobile**

Run: `npm run test:e2e`
Expected: vert sur les deux projets. Un test intermittent se rejoue SEUL avant d'être
déclaré intermittent ; s'il échoue encore, c'est un défaut, pas de la contention.

- [ ] **Step 3: Écrire l'entrée de CHANGELOG**

En tête de `CHANGELOG.md`, une section datée du jour, sur le ton des précédentes — ce qui a
été fait, ce qui a été refusé, et ce que ça a coûté :

```markdown
## 2026-09-03 — Lot B : une étape de projet se détaille sans se fractionner

`ProjectTask` gagne `subItems` — une liste de sous-tâches cochables, nommées
dans l'éditeur d'étape et cochées directement sur la ligne du tableau, avec
un compteur « 1/3 » et un dépliage par chevron.

**Le champ est OPTIONNEL, contrairement à ce que la spec annonçait.** Les
étapes écrites avant ce lot n'ont pas la clé — ni celles déjà en base, ni
celles qu'un appareil resté en arrière enverra, la synchronisation écrivant
la ligne reçue telle quelle, sans validation ni valeur par défaut. Un champ
déclaré requis aurait menti au compilateur et fait planter le tableau sur
`.length` dès la première étape existante. L'absence est défaite en UN SEUL
endroit, `projectSubItems()` dans `lib/domain/projects.ts` : recopié dans
chaque vue, le `?? []` aurait fini par manquer dans une.

**L'aller-retour de sauvegarde a été écrit AVANT le champ.** `export.ts` et
`import.ts` énumèrent les champs de `ProjectTask` un par un : un champ ajouté
au domaine et oublié là ne casse rien, ne dit rien, et se perd à chaque
sauvegarde restaurée. Le test a été éprouvé par mutation (clé d'export
retirée → rouge).

**La progression du projet n'a pas changé de définition** : elle reste
« étapes faites / étapes totales ». Une étape dont les trois sous-tâches sont
faites mais qui reste « en cours » ne compte toujours pas comme faite, et
l'inverse est vrai aussi — deux tests le verrouillent. Faire entrer les
sous-tâches dans l'avancement aurait fait bouger deux jauges d'un même geste,
et plus personne n'aurait su ce que mesure celle du projet.

**`done` traverse le formulaire d'édition sans être modifié.** L'éditeur
nomme, il ne coche pas. Un formulaire qui n'aurait transporté que les
intitulés aurait décoché toutes les sous-tâches faites au premier
enregistrement de l'étape — perte silencieuse, invisible à la relecture du
diff, attrapée ici par un test éprouvé par mutation.

**Le filet des coupes de texte suit le tableau.** La mesure du lot A balaie
des routes ; le tableau d'un projet s'ouvre au clic et lui échappait. Elle
vit désormais dans `tests/e2e/helpers/debordement.ts`, et `vue-work.spec.ts`
la réemploie sur le tableau déplié aux cinq largeurs — sans en faire une
seconde copie qui aurait divergé au premier ajustement.
```

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "$(cat <<'EOF'
docs: le lot B au journal — ce qui a été livré, et ce qui a été refusé

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Ce que ce plan NE fait PAS, et pourquoi

- **Pas de pastille de sous-tâches sur la carte de projet** (`ProjectCard`). La carte dit
  l'avancement du PROJET ; y ajouter un second compte inviterait exactement à la confusion
  que l'invariant de la tâche 2 refuse.
- **Pas de liste dépliée par défaut**, contrairement à `TaskItem` qui affiche toujours ses
  sous-tâches. Le tableau range trois colonnes de lignes : ouvertes d'office, elles
  rendraient une colonne de cinq étapes illisible sur téléphone. La différence est
  délibérée, pas une incohérence.
- **Pas de glisser-déposer pour réordonner les sous-tâches.** Le tableau lui-même y a
  renoncé (commentaire de `ProjectBoard.tsx`), pour les mêmes raisons.
- **Pas de version de base de données.** Le champ n'est pas indexé et rien n'est à migrer :
  l'absence est une valeur lisible, gérée en lecture. Une migration Dexie aurait de toute
  façon laissé passer les lignes reçues par synchronisation d'un appareil resté en arrière.
