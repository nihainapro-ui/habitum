# Lot C — Calendrier mensuel depuis l'en-tête : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Depuis n'importe quelle vue, un bouton de l'en-tête ouvre la grille du mois ; choisir un jour mène à la vue Aujourd'hui réglée sur ce jour.

**Architecture:** Aucun calcul neuf — `monthGrid()` et `daysBetween()` existent déjà dans `lib/domain` avec leurs tests. Le lot ajoute un bouton dans la coque, un `Dialog` du système visuel qui dessine la grille, et le câblage vers `ui.day`. Le geste « ouvrir ce jour » existe déjà dans `components/calendar/MonthGrid.tsx` : il est ramené à une seule écriture plutôt que dupliqué.

**Tech Stack:** Next.js 15, TypeScript strict (`exactOptionalPropertyTypes`), Radix Dialog, next-intl, `Intl.DateTimeFormat`, Playwright, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-02-ameliorations-ui-design.md` § Lot C

## Global Constraints

- **CLAUDE.md prime.** `lib/domain/` n'importe ni React, ni Next, ni la persistance (règle 2).
  Aucun chiffre affiché ne doit être fabriqué (règle 3).
- **Jamais de littéral de texte dans le JSX** (`react/jsx-no-literals`, `noStrings: true`) ;
  toute clé ajoutée à `messages/fr.json` existe dans `en.json` (`npm run check:messages`).
- Couleurs par variables du thème (`var(--txt2)`, `var(--line)`…), jamais en dur.
- **Piège déjà payé, écrit dans l'en-tête lui-même** (`components/shell/header.tsx`, en-tête de
  fichier) : « un élément à largeur fixe dans l'en-tête vole la place du titre et du
  sous-titre, y compris au-dessus de 1060 px ». Tout ce qui s'y ajoute porte `flex-none`, et
  seul le bloc de titre porte `flex:1 1 120px` + `min-width:0`.
- **L'en-tête est un ANGLE MORT du filet de mesure.** `tests/e2e/debordements.spec.ts` balaie
  `main *` ; l'en-tête, la barre basse et tout contenu porté par un portail (`Dialog`, tiroir,
  palette, menu) vivent hors de `<main>` et ne sont jamais mesurés. Ce lot touche les deux :
  l'en-tête ET un portail. Il apporte donc sa propre mesure — c'est la tâche 1.
- **Pas de pastilles d'activité sur les jours en v1** (décision de la spec) : elles
  demanderaient de calculer l'état de chaque jour du mois à l'ouverture, alors que la valeur
  première est la navigation.
- Tout invariant nouveau est éprouvé par mutation (défaire le correctif → le test tombe).
- Fin de lot : `npm run verify` vert, e2e vert desktop + mobile, CHANGELOG à jour, tout
  document de `docs/` qu'une décision rend faux corrigé dans la même livraison.

---

### Task 1: Le filet de l'en-tête — mesurer avant d'y toucher

Rien de visible dans cette tâche. Ce qu'elle livre, c'est le droit d'ajouter un bouton à un
en-tête que personne ne mesure — et dont le fichier lui-même documente qu'on s'y est déjà
brûlé.

**Files:**

- Modify: `tests/e2e/helpers/debordement.ts` (paramètre de racine)
- Modify: `tests/e2e/debordements.spec.ts` (appel explicite de la racine par défaut)
- Test: `tests/e2e/shell.spec.ts`

**Interfaces:**

- Consumes: `releverDebordements(page)` et `LARGEURS_MESUREES`, livrés par le lot B dans
  `tests/e2e/helpers/debordement.ts`.
- Produces: `releverDebordements(page, racine?: string)` — `racine` vaut `'main'` par défaut,
  ce qui laisse les 35 cas du filet existant strictement inchangés. Les tâches 2 et 5
  l'appellent avec `'header'`.

- [ ] **Step 1: Écrire le test de l'en-tête — il doit PASSER aujourd'hui**

Dans `tests/e2e/shell.spec.ts`, à la fin du fichier :

```ts
/* L'EN-TÊTE N'ÉTAIT MESURÉ PAR RIEN. `debordements.spec.ts` balaie `main *` et
   documente l'en-tête parmi ses angles morts assumés ; or `header.tsx` porte
   lui-même la trace d'un piège déjà payé — « un élément à largeur fixe dans
   l'en-tête vole la place du titre et du sous-titre ». Le lot C y ajoute un
   bouton : il mesure d'abord, il ajoute ensuite.

   Ce test est VERT dès son écriture, et c'est voulu : il fixe l'état d'avant.
   S'il rougit à la tâche 2, c'est le bouton qui est en trop, pas la mesure. */
test.describe('en-tête', () => {
  for (const largeur of LARGEURS_MESUREES) {
    test(`l'en-tête ne déborde pas et ne coupe aucun texte à ${largeur}px`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 900 });
      await ouvrirAvecDemo(page, '/app/today');

      /* LA MESURE DÉCISIVE est celle de l'en-tête LUI-MÊME : c'est un conteneur
         en ligne sans repli (`flex-nowrap`), donc un enfant de trop ne coupe
         aucun texte — il pousse la boîte. `scrollWidth > clientWidth` sur le
         `<header>` est la seule chose qui l'attrape. */
      const boite = await page.evaluate(() => {
        const h = document.querySelector('header');
        return h ? { scroll: h.scrollWidth, client: h.clientWidth } : null;
      });
      expect(boite, 'aucun <header> trouvé — la coque a changé de forme').not.toBeNull();
      expect(
        boite!.scroll,
        `l'en-tête déborde de ${boite!.scroll - boite!.client} px à ${largeur} px`,
      ).toBeLessThanOrEqual(boite!.client + 1);

      /* Et les textes de ses enfants, avec la même mesure que le filet des
         vues — mêmes exclusions, même doctrine, une seule implémentation. */
      const { releve, balayes } = await releverDebordements(page, 'header');
      expect(
        balayes,
        `${balayes} élément(s) balayé(s) dans l'en-tête — la mesure est suspecte`,
      ).toBeGreaterThan(5);
      expect(releve).toEqual([]);
    });
  }
});
```

Ajouter en tête de `tests/e2e/shell.spec.ts` :
`import { LARGEURS_MESUREES, releverDebordements } from './helpers/debordement';`
et, si `ouvrirAvecDemo` n'y est pas déjà importé, l'ajouter à l'import existant de
`./helpers/app`.

- [ ] **Step 2: Ajouter le paramètre de racine à l'assistant**

Dans `tests/e2e/helpers/debordement.ts`, la signature devient :

```ts
export async function releverDebordements(
  page: Page,
  /** Racine du balayage. `'main'` par défaut — les sept vues du filet. Le lot C
   *  passe `'header'` : la coque vit HORS de `<main>`, elle n'était donc mesurée
   *  par rien, et c'est là qu'il ajoute un bouton. Les exclusions et la doctrine
   *  ne changent pas d'un iota d'une racine à l'autre : c'est tout l'intérêt de
   *  n'avoir qu'une implémentation. */
  racine = 'main',
): Promise<{ releve: string[]; balayes: number; exclusSwitch: number; exclusSwitchAttendus: number }> {
  return page.evaluate((sel) => {
    /* … corps inchangé, à ceci près … */
    for (const el of Array.from(document.querySelectorAll(`${sel} *`))) {
```

et l'appel `page.evaluate` passe `racine` en second argument. **Ne change rien d'autre** :
ni les exclusions, ni le calcul de `exclusSwitchAttendus`, ni les messages.

Dans `tests/e2e/debordements.spec.ts`, l'appel reste `releverDebordements(page)` — le
défaut préserve les 35 cas à l'identique.

- [ ] **Step 3: Lancer les deux filets**

```
npm run build
CI=1 npx playwright test tests/e2e/shell.spec.ts tests/e2e/debordements.spec.ts --project=desktop --project=mobile
```

Expected: tout vert. Le filet des vues doit compter exactement le même nombre de cas
qu'avant (7 vues × 5 largeurs × 2 projets = 70) ; l'en-tête en ajoute 5 × 2.

- [ ] **Step 4: Éprouver la mesure par mutation**

Ajoute temporairement dans `components/shell/header.tsx`, juste avant le bouton de
recherche, un élément large et insécable :

```tsx
<span className="flex-none" style={{ width: 400 }} aria-hidden="true" />
```

Relance le test de l'en-tête : il DOIT rougir à 360 et 390 px en annonçant le nombre de
pixels de débordement. Retire l'élément, reconfirme le vert. Cite les deux sorties dans ton
rapport — sans cette preuve, on ne saura pas si le filet de la tâche 2 est un filet.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/helpers/debordement.ts tests/e2e/shell.spec.ts
git commit -m "$(cat <<'EOF'
test(e2e): l'en-tête est mesuré avant qu'on y ajoute quoi que ce soit

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Le bouton du calendrier, et un dialogue qui s'ouvre

**Files:**

- Create: `components/shell/month-picker.tsx`
- Modify: `components/shell/header.tsx`
- Modify: `messages/fr.json`, `messages/en.json`
- Test: `tests/e2e/shell.spec.ts`

**Interfaces:**

- Consumes: `Dialog` de `@/components/ui` (Radix : `Escape`, piège de focus et retour du
  focus au déclencheur sont fournis) ; le filet de la tâche 1.
- Produces: `<MonthPicker open onOpenChange />` — le dialogue, vide à ce stade. La tâche 3 le
  remplit. Le bouton de l'en-tête porte le nom accessible `t('app.openMonth')` ; les tâches 3
  et 5 s'en servent comme sélecteur.
- Clés neuves : `app.openMonth` (« Ouvrir le calendrier » / « Open the calendar ») et
  `app.pickDay` (« Choisir un jour » / « Pick a day »).

- [ ] **Step 1: Écrire le test — il DOIT échouer**

Dans `tests/e2e/shell.spec.ts`, avant le `describe('en-tête')` de la tâche 1 :

```ts
test('le calendrier de l’en-tête s’ouvre, se ferme, et rend le focus', async ({ page }) => {
  await ouvrirAvecDemo(page, '/app/today');

  const bouton = page.getByRole('button', { name: 'Ouvrir le calendrier' });
  await expect(bouton).toBeVisible();
  await bouton.click();

  const boite = page.getByRole('dialog', { name: 'Choisir un jour' });
  await expect(boite).toBeVisible();

  /* Échap ferme, et LE FOCUS REVIENT au bouton : sans ce retour, l'utilisateur
     au clavier est renvoyé au début du document à chaque fermeture. Radix le
     garantit — encore faut-il que le test le dise, sinon un jour où le
     dialogue sera remonté à la main, personne ne s'en apercevra. */
  await page.keyboard.press('Escape');
  await expect(boite).toBeHidden();
  await expect(bouton).toBeFocused();
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `CI=1 npx playwright test tests/e2e/shell.spec.ts --project=desktop -g "s’ouvre"`
Expected: FAIL — aucun bouton nommé « Ouvrir le calendrier ».

- [ ] **Step 3: Ajouter les deux clés de libellé, dans les deux langues**

`messages/fr.json`, namespace `app`, à leur place alphabétique — vérifié dans le fichier :
`openMonth` vient JUSTE AVANT `"openProject"` (ligne 249), et `pickDay` JUSTE AVANT
`"prevDay"` (ligne 258). Les numéros de ligne bougeront d'une insertion à l'autre ; ce sont
les voisins qui font foi.

```json
    "openMonth": "Ouvrir le calendrier",
    "pickDay": "Choisir un jour",
```

`messages/en.json`, aux mêmes emplacements :

```json
    "openMonth": "Open the calendar",
    "pickDay": "Pick a day",
```

Run: `npm run check:messages` — doit rester vert.

- [ ] **Step 4: Créer le dialogue, vide**

`components/shell/month-picker.tsx` :

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui';

/* Le calendrier mensuel de l'en-tête — spec du 2026-09-02, lot C.

   IL N'AFFICHE AUCUNE PASTILLE D'ACTIVITÉ, et c'est une décision : les
   calculer demanderait l'état de chaque jour du mois à l'ouverture, alors que
   ce que l'utilisateur vient chercher ici est la NAVIGATION — « aller voir un
   autre jour, vite ». À réévaluer sur usage, pas avant.

   Le dialogue vient du système visuel (`components/ui/dialog.tsx`, Radix) :
   fermeture par Échap, piège de focus et retour du focus au déclencheur sont
   fournis, pas réécrits. */

export function MonthPicker({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useTranslations('app');

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('pickDay')}>
      <div />
    </Dialog>
  );
}
```

- [ ] **Step 5: Poser le bouton dans l'en-tête**

Dans `components/shell/header.tsx` :

- imports : ajouter `CalendarDays` à l'import de `lucide-react`, et
  `import { MonthPicker } from './month-picker';`
- état local, à côté des autres `useState` du composant :

```tsx
  const [moisOuvert, setMoisOuvert] = useState(false);
```

- le bouton, JUSTE AVANT le bouton de recherche (la spec dit « à côté de la recherche ») :

```tsx
      {/* Le calendrier est visible à TOUTES les largeurs, contrairement au mode
          zen et à la pilule de profil qui disparaissent sous 640 px. C'est le
          geste que la spec vient chercher — « aller voir un autre jour, vite » —
          et il est né de captures prises sur téléphone : le masquer là serait le
          retirer à l'appareil qui l'a demandé. Sa cible fait 34 px, `flex-none`,
          comme la recherche repliée : le bloc de titre reste le seul à s'étirer.
          `tests/e2e/shell.spec.ts` mesure l'en-tête aux cinq largeurs. */}
      <button
        type="button"
        onClick={() => setMoisOuvert(true)}
        aria-label={t('app.openMonth')}
        title={t('app.openMonth')}
        className="grid h-[34px] w-[34px] flex-none cursor-pointer place-items-center rounded-[10px] border"
        style={{ borderColor: 'var(--line)', background: 'var(--panel2)', color: 'var(--txt2)' }}
      >
        <CalendarDays size={15} strokeWidth={1.8} aria-hidden="true" />
      </button>
```

- le dialogue, en dernier enfant du `<header>`, après le bouton « Nouveau » :

```tsx
      <MonthPicker open={moisOuvert} onOpenChange={setMoisOuvert} />
```

- [ ] **Step 6: Lancer les tests, dont le filet de la tâche 1**

```
npm run build
CI=1 npx playwright test tests/e2e/shell.spec.ts --project=desktop --project=mobile
```

Expected: tout vert, y compris les cinq mesures de l'en-tête. **Si le filet rougit à 360 ou
390 px, c'est un vrai défaut** : le bouton ne tient pas. Ne le masque pas sous un palier
sans mesurer d'abord ce qui déborde et de combien — remonte les chiffres, et fais céder le
voisin le moins porteur d'information, jamais le texte (doctrine tranchée en clôture du
lot A).

- [ ] **Step 7: Commit**

```bash
git add components/shell/month-picker.tsx components/shell/header.tsx messages/fr.json messages/en.json tests/e2e/shell.spec.ts
git commit -m "$(cat <<'EOF'
feat(shell): un bouton de calendrier dans l'en-tête, et le dialogue qu'il ouvre

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: La grille du mois, et sa navigation

**Files:**

- Modify: `components/shell/month-picker.tsx`
- Test: `tests/e2e/shell.spec.ts`

**Interfaces:**

- Consumes: `monthGrid(offset, weekStart, now)` de `@/lib/domain` — **déjà écrite et déjà
  testée** (`tests/unit/calendar.test.ts` : 42 cases toujours, premier jour selon
  `weekStart`, `inMonth` et `isToday`). N'en écris pas une seconde ; n'ajoute pas de test
  unitaire pour ce qui en a déjà un. `useSettings()` de `@/lib/store` rend `weekStart`,
  `useLocaleSwitcher()` de `@/components/shell/locale-provider` rend `locale`.
- Produces: la grille dans le dialogue — 42 cases, chacune un `<button>` dont le nom
  accessible est la date longue formatée (`jeudi 6 août`). La tâche 4 clique dessus.
- Réemploie les clés existantes `app.prevPeriod`, `app.nextPeriod` et `app.calToday` :
  **aucune clé neuve dans cette tâche.**

- [ ] **Step 1: Écrire le test — il DOIT échouer**

Dans `tests/e2e/shell.spec.ts`, après le test de la tâche 2 :

```ts
test('la grille du mois montre 42 cases et navigue de mois en mois', async ({ page }) => {
  await ouvrirAvecDemo(page, '/app/today');
  await page.getByRole('button', { name: 'Ouvrir le calendrier' }).click();

  const boite = page.getByRole('dialog', { name: 'Choisir un jour' });
  /* 42 CASES TOUJOURS, jamais 28 ni 35 : une grille qui change de hauteur d'un
     mois à l'autre fait sauter le dialogue sous le curseur. C'est déjà la règle
     de `monthGrid`, et elle se vérifie ici à l'écran. */
  await expect(boite.locator('[data-jour]')).toHaveCount(42);

  /* L'horloge des tests est figée au 5 août 2026. */
  await expect(boite.getByText('août 2026')).toBeVisible();

  await boite.getByRole('button', { name: 'Période précédente' }).click();
  await expect(boite.getByText('juillet 2026')).toBeVisible();
  await expect(boite.locator('[data-jour]')).toHaveCount(42);

  await boite.getByRole('button', { name: 'Période suivante' }).click();
  await boite.getByRole('button', { name: 'Période suivante' }).click();
  await expect(boite.getByText('septembre 2026')).toBeVisible();

  /* Le retour au mois courant est un geste, pas trois clics arrière. */
  await boite.getByRole('button', { name: 'Aujourd’hui' }).click();
  await expect(boite.getByText('août 2026')).toBeVisible();
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `CI=1 npx playwright test tests/e2e/shell.spec.ts --project=desktop -g "42 cases"`
Expected: FAIL — le dialogue est vide, `[data-jour]` en compte 0.

- [ ] **Step 3: Dessiner la grille**

`components/shell/month-picker.tsx` — le composant complet :

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, monthGrid, startOfWeek, today } from '@/lib/domain';
import { useSettings } from '@/lib/store';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import { Dialog } from '@/components/ui';

/* Le calendrier mensuel de l'en-tête — spec du 2026-09-02, lot C.

   IL N'AFFICHE AUCUNE PASTILLE D'ACTIVITÉ, et c'est une décision : les calculer
   demanderait l'état de chaque jour du mois à l'ouverture, alors que ce que
   l'utilisateur vient chercher ici est la NAVIGATION — « aller voir un autre
   jour, vite ». À réévaluer sur usage, pas avant.

   AUCUN CALCUL DE GRILLE N'EST ÉCRIT ICI. `monthGrid()` vit dans
   `lib/domain/calendar.ts` avec ses tests (42 cases toujours, premier jour selon
   la préférence de début de semaine) — la vue ne fait que dessiner ce qu'elle
   rend. C'est la règle 2 du CLAUDE.md, et c'est aussi ce qui fait que la grille
   du dialogue et celle de la vue Calendrier ne peuvent pas diverger.

   Le dialogue vient du système visuel (`components/ui/dialog.tsx`, Radix) :
   fermeture par Échap, piège de focus et retour du focus au déclencheur sont
   fournis, pas réécrits. */

export function MonthPicker({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useTranslations('app');
  const { locale } = useLocaleSwitcher();
  const { weekStart } = useSettings();
  const [offset, setOffset] = useState(0);

  const cases = useMemo(() => monthGrid(offset, weekStart), [offset, weekStart]);

  const nomsJours = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const debut = startOfWeek(today(), weekStart);
    return Array.from({ length: 7 }, (_, i) => format.format(addDays(debut, i)));
  }, [locale, weekStart]);

  const titreMois = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
        new Date(today().getFullYear(), today().getMonth() + offset, 1),
      ),
    [locale, offset],
  );

  const jourLong = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
    [locale],
  );

  const nav =
    'grid h-[30px] w-[30px] place-items-center rounded-btn-sm border cursor-pointer';

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('pickDay')}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOffset(offset - 1)}
            aria-label={t('prevPeriod')}
            className={nav}
            style={{ borderColor: 'var(--line)', background: 'var(--panel2)', color: 'var(--txt2)' }}
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>

          {/* Le mois occupe le centre et peut céder : c'est le seul élément de
              la rangée dont la largeur dépend de la langue (« septembre 2026 »
              contre « May 2026 »). */}
          <span className="min-w-0 flex-1 truncate text-center text-[13px] font-semibold">
            {titreMois}
          </span>

          <button
            type="button"
            onClick={() => setOffset(offset + 1)}
            aria-label={t('nextPeriod')}
            className={nav}
            style={{ borderColor: 'var(--line)', background: 'var(--panel2)', color: 'var(--txt2)' }}
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setOffset(0)}
            className="rounded-btn-sm flex-none cursor-pointer border px-2.5 py-1.5 font-mono text-[10.5px] tracking-[0.08em] uppercase"
            style={{
              borderColor: offset === 0 ? 'var(--line2)' : 'var(--line)',
              background: 'var(--panel2)',
              color: offset === 0 ? 'var(--txt)' : 'var(--txt2)',
            }}
          >
            {t('calToday')}
          </button>
        </div>

        <div className="grid grid-cols-7">
          {nomsJours.map((nom) => (
            <span
              key={nom}
              className="px-1 py-1 text-center font-mono text-[9px] tracking-[0.12em] uppercase"
              style={{ color: 'var(--txt2)' }}
            >
              {nom}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cases.map((c) => (
            <button
              key={c.key}
              type="button"
              data-jour={c.key}
              /* Le nom accessible est la date LONGUE, pas le seul quantième :
                 « 6 » quarante-deux fois ne désigne rien à l'oreille. */
              aria-label={jourLong.format(c.date)}
              aria-current={c.isToday ? 'date' : undefined}
              className="rounded-btn-sm grid h-8 cursor-pointer place-items-center border text-[12px]"
              style={{
                borderColor: c.isToday ? 'var(--acc2)' : 'transparent',
                background: c.isToday ? 'rgba(var(--glow),.18)' : 'transparent',
                /* Les jours des mois voisins complètent la grille sans se faire
                   passer pour le mois affiché. Ils restent CLIQUABLES : refuser
                   le 31 juillet depuis la grille d'août serait un cul-de-sac. */
                color: c.inMonth ? 'var(--txt)' : 'var(--mut)',
              }}
            >
              {c.date.getDate()}
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 4: Lancer les tests**

```
npm run build
CI=1 npx playwright test tests/e2e/shell.spec.ts --project=desktop --project=mobile
```

Expected: tout vert, filet de l'en-tête compris.

- [ ] **Step 5: Éprouver la grille par mutation**

Remplace `monthGrid(offset, weekStart)` par `monthGrid(offset, weekStart).slice(0, 35)` :
le test des 42 cases DOIT rougir. Défais, reconfirme le vert. Cite les deux sorties.

- [ ] **Step 6: Commit**

```bash
git add components/shell/month-picker.tsx tests/e2e/shell.spec.ts
git commit -m "$(cat <<'EOF'
feat(shell): la grille du mois, dessinée par la vue et calculée par le domaine

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Choisir un jour — et un seul geste dans tout le produit

**Files:**

- Modify: `components/shell/month-picker.tsx`
- Modify: `components/calendar/MonthGrid.tsx:113-116`
- Test: `tests/e2e/shell.spec.ts`

**Interfaces:**

- Consumes: `setDay(day: number)` du store (`ui.day` est un DÉCALAGE EN JOURS par rapport à
  aujourd'hui, pas une date — c'est ce qui garde la vue juste au passage de minuit) ;
  `daysBetween(a, b)` de `@/lib/domain` ; `useRouter` de `next/navigation`.
- Produces: le geste complet — choisir un jour règle `ui.day` et mène à `/app/today`.

- [ ] **Step 1: Écrire le test — il DOIT échouer**

Dans `tests/e2e/shell.spec.ts`, après le test de la tâche 3 :

**Ce que la vue Aujourd'hui donne à observer, et ce qu'elle ne donne pas** — vérifié avant
d'écrire ces tests, parce que s'y tromper coûte une ronde entière : elle n'affiche **aucune
date en toutes lettres**. Le seul témoin du jour choisi est le bandeau `DayStrip`, dont le
bouton actif porte `aria-current="date"` et, pour nom accessible, la date longue
(« mercredi 12 août »). Ce bandeau est **ancré sur aujourd'hui**, de −4 à +7 jours
(`components/today/DayStrip.tsx`) : un jour hors de cette fenêtre n'y a pas de bouton, donc
aucun bouton n'y est courant. Les deux tests exploitent chacun un côté de ce fait.

```ts
test('choisir un jour mène à Aujourd’hui, réglé sur ce jour', async ({ page }) => {
  /* L'horloge des tests est figée au mercredi 5 août 2026 : le 12 est donc à
     sept jours, la dernière position du bandeau (−4 … +7). */
  await ouvrirAvecDemo(page, '/app');
  await page.getByRole('button', { name: 'Ouvrir le calendrier' }).click();

  const boite = page.getByRole('dialog', { name: 'Choisir un jour' });
  await boite.locator('[data-jour="2026-08-12"]').click();

  await expect(page).toHaveURL(/\/app\/today/);
  await expect(boite).toBeHidden();

  /* Le témoin est le bandeau, pas une variable interne : c'est ce que
     l'utilisateur voit surligné qui doit être juste. */
  await expect(page.getByRole('button', { name: 'mercredi 12 août' })).toHaveAttribute(
    'aria-current',
    'date',
  );
});

test('un jour d’un mois voisin est choisissable, pas un cul-de-sac', async ({ page }) => {
  /* La grille d'août 2026 commence le 27 juillet. Refuser ces cases obligerait
     à revenir en arrière pour un jour déjà sous les yeux.

     Le 28 juillet est à −8, donc HORS du bandeau (−4 … +7) : il n'y a pas de
     bouton à surligner, et c'est précisément l'observable. Si le clic n'avait
     rien réglé, `ui.day` vaudrait 0 et « mercredi 5 août » serait courant —
     l'assertion tomberait. */
  await ouvrirAvecDemo(page, '/app');
  await page.getByRole('button', { name: 'Ouvrir le calendrier' }).click();
  await page.getByRole('dialog').locator('[data-jour="2026-07-28"]').click();

  await expect(page).toHaveURL(/\/app\/today/);
  await expect(page.locator('[aria-current="date"]')).toHaveCount(0);
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `CI=1 npx playwright test tests/e2e/shell.spec.ts --project=desktop -g "mène à|cul-de-sac"`
Expected: FAIL — cliquer une case ne fait rien ; l'URL reste `/app`.

- [ ] **Step 3: Câbler le choix**

Dans `components/shell/month-picker.tsx` :

- imports : ajouter `useRouter` de `next/navigation`, `daysBetween` à l'import de
  `@/lib/domain`, et `useStore` à celui de `@/lib/store`.
- dans le composant :

```tsx
  const router = useRouter();
  const setDay = useStore((s) => s.setDay);

  /* `ui.day` est un DÉCALAGE EN JOURS, pas une date — c'est le choix du
     prototype (`state.day`), et il garde la vue juste au passage de minuit :
     une date figée deviendrait « hier » sans que rien ne bouge à l'écran.
     `daysBetween` vit dans le domaine ; le décalage ne se recalcule pas ici. */
  const choisir = (date: Date) => {
    setDay(daysBetween(date, today()));
    onOpenChange(false);
    router.push('/app/today');
  };
```

- sur chaque case : `onClick={() => choisir(c.date)}`

- [ ] **Step 4: Ramener le geste à une seule écriture**

`components/calendar/MonthGrid.tsx` fait déjà exactement cela, mais recalcule le décalage à
la main :

```tsx
  const ouvrirJour = (date: Date) => {
    setDay(Math.round((date.getTime() - today().getTime()) / 86_400_000));
    router.push('/app/today');
  };
```

Cette expression EST `daysBetween(date, today())`, écrite une seconde fois — et sans le
`startOfDay` que la version du domaine applique aux deux bornes, ce qui la rendrait fausse
d'un jour si l'une des dates portait une heure. Remplace-la :

```tsx
  const ouvrirJour = (date: Date) => {
    /* `daysBetween` plutôt qu'une soustraction de millisecondes recopiée : la
       version du domaine ramène les deux bornes à minuit, ce que celle-ci ne
       faisait pas. Deux écritures du même calcul finissent toujours par
       diverger — celle-ci avait déjà commencé. */
    setDay(daysBetween(date, today()));
    router.push('/app/today');
  };
```

et ajoute `daysBetween` à l'import existant de `@/lib/domain` dans ce fichier.

- [ ] **Step 5: Lancer les tests, y compris ceux de la vue Calendrier**

```
npm run build
CI=1 npx playwright test tests/e2e/shell.spec.ts tests/e2e/vue-calendar.spec.ts --project=desktop --project=mobile
```

Expected: tout vert. `vue-calendar.spec.ts` couvre le geste que le Step 4 vient de
réécrire : s'il rougit, c'est que les deux expressions n'étaient PAS équivalentes — remonte
la différence au lieu de l'aplanir.

- [ ] **Step 6: Éprouver le câblage par mutation**

Remplace `daysBetween(date, today())` par `0` dans `month-picker.tsx` : le test du 12 août
DOIT rougir (la vue afficherait le 5 août). Défais, reconfirme le vert.

- [ ] **Step 7: Commit**

```bash
git add components/shell/month-picker.tsx components/calendar/MonthGrid.tsx tests/e2e/shell.spec.ts
git commit -m "$(cat <<'EOF'
feat(shell): choisir un jour depuis l'en-tête — et un seul calcul de décalage dans le produit

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Recette — le portail, le clavier, et la clôture

Le dialogue vit dans un PORTAIL : il est monté hors de `<main>` et hors du `<header>`. Ni le
filet des vues ni celui de la tâche 1 ne le voient. C'est le même angle mort que la tâche 1
a fermé pour l'en-tête, et il se ferme ici pour le portail.

**Files:**

- Test: `tests/e2e/shell.spec.ts`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Écrire le contrôle de débordement du dialogue**

Dans `tests/e2e/shell.spec.ts`, après les tests de la tâche 4 :

```ts
test('le dialogue du mois ne coupe rien et ne déborde pas, aux cinq largeurs', async ({
  page,
}) => {
  /* LE DIALOGUE EST DANS UN PORTAIL : Radix le monte au `body`, donc ni
     `main *` (filet des vues) ni `header *` (tâche 1) ne l'atteignent. Sans ce
     contrôle, sept jours de la semaine et six rangées de quantièmes tiendraient
     sur un écran de 360 px par pure chance. */
  await ouvrirAvecDemo(page, '/app/today');
  await page.getByRole('button', { name: 'Ouvrir le calendrier' }).click();
  await expect(page.getByRole('dialog', { name: 'Choisir un jour' })).toBeVisible();

  for (const largeur of LARGEURS_MESUREES) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.waitForTimeout(50);

    /* LA MÊME MESURE, une troisième racine. La tâche 1 a rendu
       `releverDebordements` paramétrable précisément pour cela : en écrire ici
       une seconde version, avec ses propres exclusions, ferait diverger les
       trois filets au premier ajustement de doctrine — c'est l'erreur que le
       lot B a évitée en DÉPLAÇANT cette fonction plutôt qu'en la recopiant. */
    const { releve, balayes } = await releverDebordements(page, '[role="dialog"]');
    expect(
      balayes,
      `${balayes} élément(s) balayé(s) dans le dialogue à ${largeur}px — mesure suspecte`,
    ).toBeGreaterThan(20);
    expect(releve, `dialogue du mois à ${largeur}px`).toEqual([]);

    /* La boîte du dialogue elle-même n'est pas dans `[role="dialog"] *` : on la
       mesure à part, comme l'en-tête à la tâche 1. */
    const boite = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? { scroll: d.scrollWidth, client: d.clientWidth } : null;
    });
    expect(boite, 'aucun dialogue trouvé').not.toBeNull();
    expect(boite!.scroll, `le dialogue déborde à ${largeur}px`).toBeLessThanOrEqual(
      boite!.client + 1,
    );

    /* Et le DOCUMENT ne doit pas s'élargir non plus : un dialogue plus large
       que l'écran fait défiler la page derrière lui. */
    const deborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(deborde, `la page déborde à ${largeur}px, dialogue ouvert`).toBe(false);
  }
});

test('le dialogue du mois est accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ouvrirAvecDemo(page, '/app/today');
  await page.getByRole('button', { name: 'Ouvrir le calendrier' }).click();
  await expect(page.getByRole('dialog', { name: 'Choisir un jour' })).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const graves = violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => `${v.id} — ${v.nodes.length} nœud(s)`);
  expect(graves).toEqual([]);
});
```

Ajoute `import AxeBuilder from '@axe-core/playwright';` en tête du fichier s'il n'y est pas
déjà.

- [ ] **Step 2: Lancer, et corriger un vrai défaut s'il s'en révèle un**

```
CI=1 npx playwright test tests/e2e/shell.spec.ts --project=desktop --project=mobile
```

Expected: vert. **Si le débordement rougit à 360 px**, c'est un vrai défaut : la grille de
sept colonnes ne tient pas. Fais céder ce qui porte le moins d'information — l'écart entre
les cases, puis la taille du quantième —, JAMAIS en scindant un texte, et jamais en
masquant une colonne (six jours de semaine ne sont pas une semaine). Consigne le relevé et
le correctif dans ton rapport.

- [ ] **Step 3: Lancer la recette complète**

```
npm run verify
npm run build
CI=1 npx playwright test --project=desktop      # plafond 600000 ms
CI=1 npx playwright test --project=mobile       # plafond 600000 ms
```

Les deux exécutions par projet remplacent `npm run test:e2e`, qui dépasse le plafond de
durée d'une commande. **`CI=1` arme deux reprises** que l'exécution locale n'a pas : si une
reprise a lieu, elle doit apparaître dans ton rapport — un test qui ne passe qu'au second
essai n'est pas vert.

- [ ] **Step 4: Écrire l'entrée de CHANGELOG**

En tête de `CHANGELOG.md`, une section datée du jour :

```markdown
## 2026-09-03 (suite 2) — Lot C : le mois s'ouvre depuis l'en-tête

Un bouton de calendrier rejoint l'en-tête, à côté de la recherche. Il ouvre la
grille du mois ; choisir un jour règle `ui.day` et mène à la vue Aujourd'hui.
C'est le geste que les captures d'usage réclamaient : aller voir un autre jour,
vite, depuis n'importe quelle vue — sans passer par le Calendrier, le régler,
puis en ressortir.

**Aucun calcul de grille n'a été écrit.** `monthGrid()` vit dans
`lib/domain/calendar.ts` depuis le portage, avec ses tests — 42 cases toujours,
premier jour selon la préférence de début de semaine. Le dialogue dessine ce
qu'elle rend, et c'est ce qui garantit que sa grille et celle de la vue
Calendrier ne peuvent pas diverger.

**Le décalage de jour ne se calcule plus qu'à un seul endroit.** La vue
Calendrier recopiait `Math.round((date - today()) / 86_400_000)` à la main, sans
le passage à minuit que `daysBetween` applique aux deux bornes — faux d'un jour
dès qu'une des dates aurait porté une heure. Les deux appellent maintenant la
même fonction du domaine.

**Pas de pastilles d'activité sur les jours.** Elles demanderaient l'état de
chaque jour du mois à l'ouverture, alors que ce qu'on vient chercher ici est la
navigation. À réévaluer sur usage, pas avant.

**Deux angles morts de la recette se ferment au passage.** Le filet de mesure
des textes coupés balaie `main *` : l'en-tête et tout contenu porté par un
portail lui échappaient, et c'est précisément là que ce lot ajoute quelque
chose. L'en-tête est désormais mesuré aux cinq largeurs — boîte comprise, la
seule mesure qui attrape un enfant de trop dans un conteneur sans repli — et le
dialogue a son propre contrôle. L'un et l'autre ont été éprouvés par mutation
avant d'être tenus pour acquis.
```

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md tests/e2e/shell.spec.ts
git commit -m "$(cat <<'EOF'
docs: le lot C au journal — et le portail rejoint la mesure

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Ce que ce plan NE fait PAS, et pourquoi

- **Pas de pastilles d'activité** sur les jours du dialogue — décision de la spec, motivée
  par le coût de calcul à l'ouverture contre la valeur réelle (la navigation).
- **Pas de raccourci clavier** pour ouvrir le calendrier. La palette (`⌘K`) est déjà le
  chemin clavier du produit ; un second raccourci global demanderait sa propre table de
  conflits, pour un geste qui est d'abord tactile.
- **Pas de sélection de plage** ni de saisie de date au clavier dans le dialogue. La vue
  Calendrier reste l'outil complet ; celui-ci est un raccourci.
- **Pas de régénération du socle de captures.** Les 33 références datent du 18 août et
  montrent une interface antérieure à la refonte de la coque : le job `visuel` est rouge
  pour cette raison, pas à cause d'un lot. Ce lot ajoute un bouton à l'en-tête, donc modifie
  les 33 captures — raison de plus pour ne régénérer qu'APRÈS lui, une seule fois, et en
  regardant les captures. C'est une décision qui appartient à l'utilisateur, pas une étape
  d'implémentation.
