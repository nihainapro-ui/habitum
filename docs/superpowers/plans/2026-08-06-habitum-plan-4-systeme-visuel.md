# Habitum — Plan 4 : Système visuel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Un vocabulaire visuel fidèle au prototype, accessible, bilingue et thémable, sur lequel onze vues peuvent s'écrire sans réinventer une seule bordure.

**Architecture:** Douze primitives sans métier, construites sur les jetons **générés** par le Plan 1 et sur Radix pour l'accessibilité. Les polices sont auto-hébergées. Aucune chaîne n'est écrite en dur : tout passe par `useTranslations`. Une galerie `/dev/ui` montre chaque primitive dans 3 thèmes × 2 langues.

**Tech Stack:** Radix UI (MIT) · Tailwind v4 + `@theme` · `next/font/local` · Lucide (ISC) · next-intl

**Charge :** 5 j · **Priorité :** 🔴 Critique
**Prérequis absolu :** Plan 1 tâche 5 (jetons régénérés). Écrire une primitive sur des jetons faux, c'est écrire onze vues fausses.

## Global Constraints

Voir `2026-08-06-habitum-programme.md` § G1–G12. Critiques ici : **G5** (licences), **G6** (symétrie FR/EN), **G10** (paliers responsive).

**Références de valeurs :** `docs/handoff/04-DESIGN-TOKENS.md` — rayons, typographie, ombres, animations, espacements. Ne rien inventer : tout y est chiffré.

---

## Structure des fichiers

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `lib/fonts.ts` | `next/font/local` — Space Grotesk, JetBrains Mono | 4.2 |
| `public/fonts/*.woff2` | Fichiers de police auto-hébergés (OFL) | 4.2 |
| `styles/theme.css` | Pont `@theme` Tailwind v4 ← jetons CSS | 4.1 |
| `components/ui/Panel.tsx` `Card.tsx` `Chip.tsx` `Switch.tsx` `Field.tsx` `Segmented.tsx` `Sheet.tsx` `Dialog.tsx` `Toast.tsx` `Tooltip.tsx` `Ring.tsx` `Icon.tsx` | 12 primitives | 4.1 |
| `components/ui/index.ts` | Point d'entrée | 4.1 |
| `app/dev/ui/page.tsx` | Galerie de contrôle | 4.1 |
| `components/settings/ThemeSwitcher.tsx` | Bascule de thème réelle | 4.5 |
| `components/settings/LocaleSwitcher.tsx` | Bascule FR/EN réelle | 4.4 |
| `app/theme-script.tsx` | Applique le thème avant peinture (anti-clignotement) | 4.5 |
| `tests/e2e/ui-gallery.spec.ts` | 12 primitives × 3 thèmes × 2 langues | 4.1 |
| `tests/e2e/a11y.spec.ts` | axe sur la galerie et les routes | 4.7 |
| `eslint.config.mjs` | Règle interdisant les chaînes en dur | 4.3 |

---

## Task 4.1: Les douze primitives

**Réf :** T2.3

**Interfaces produites** — consommées par tout le Plan 5 :

```ts
// components/ui/index.ts
export { Panel } from './Panel';       // <Panel title? actions? padding?>  — verre dépoli, rayon 16
export { Card } from './Card';         // <Card interactive? tone?>          — rayon 11, bordure --line
export { Chip } from './Chip';         // <Chip tone='neutral'|'ok'|'warn'|'bad' size='sm'|'md'>
export { Switch } from './Switch';     // <Switch checked onChange label>    — role="switch"
export { Field } from './Field';       // <Field label hint error>{input}</Field>
export { Segmented } from './Segmented'; // <Segmented options value onChange> — role="radiogroup"
export { Sheet } from './Sheet';       // tiroir latéral / plein écran < 768 px
export { Dialog } from './Dialog';     // modale, piège de focus, Escape
export { Toast } from './Toast';       // message + Annuler, aria-live
export { Tooltip } from './Tooltip';   // survol + focus clavier
export { Ring } from './Ring';         // anneau de progression SVG, 0–1
export { Icon } from './Icon';         // <Icon name size> — Lucide + glyphes de catégorie
```

- [ ] **Step 1: Écrire le pont Tailwind**

Créer `styles/theme.css` :

```css
/* Tailwind v4 consomme les jetons CSS, il ne les remplace pas.
   04-DESIGN-TOKENS.md § Notes de portage : « ne pas les convertir en échelle
   Tailwind par défaut ». */
@theme inline {
  --color-bg: var(--bg);
  --color-bg2: var(--bg2);
  --color-panel: var(--panel);
  --color-panel2: var(--panel2);
  --color-line: var(--line);
  --color-line2: var(--line2);
  --color-txt: var(--txt);
  --color-txt2: var(--txt2);
  --color-mut: var(--mut);
  --color-acc: var(--acc);
  --color-acc2: var(--acc2);
  --color-acc3: var(--acc3);
  --color-ok: var(--ok);
  --color-warn: var(--warn);
  --color-bad: var(--bad);

  --radius-chip: 5px;
  --radius-btn-sm: 7px;
  --radius-btn: 9px;
  --radius-field: 11px;
  --radius-panel: 16px;
  --radius-pill: 99px;

  --font-ui: var(--font-space-grotesk), system-ui, sans-serif;
  --font-mono: var(--font-jetbrains-mono), ui-monospace, monospace;
}
```

Importer depuis `styles/globals.css`, après `tokens.css`.

- [ ] **Step 2: Écrire le test de galerie (il échoue)**

`tests/e2e/ui-gallery.spec.ts` :

```ts
import { expect, test } from '@playwright/test';

const PRIMITIVES = ['panel','card','chip','switch','field','segmented','sheet','dialog','toast','tooltip','ring','icon'];
const THEMES = ['neural', 'plasma', 'clinical'] as const;

for (const theme of THEMES) {
  test(`les 12 primitives se rendent en thème ${theme}`, async ({ page }) => {
    const erreurs: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });

    await page.goto('/dev/ui');
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);

    for (const p of PRIMITIVES) {
      await expect(page.getByTestId(`ui-${p}`), `primitive ${p}`).toBeVisible();
    }
    expect(erreurs, `erreurs console en thème ${theme}`).toEqual([]);
  });
}

test('les primitives interactives répondent au clavier', async ({ page }) => {
  await page.goto('/dev/ui');
  const inter = page.getByTestId('ui-switch').getByRole('switch');
  await inter.focus();
  await expect(inter).toBeFocused();
  await page.keyboard.press('Space');
  await expect(inter).toHaveAttribute('aria-checked', 'true');
});

test('le focus visible respecte le jeton --acc2', async ({ page }) => {
  await page.goto('/dev/ui');
  await page.getByTestId('ui-card').getByRole('button').first().focus();
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineWidth);
  expect(outline).not.toBe('0px');
});
```

- [ ] **Step 3: Implémenter les primitives**

Valeurs imposées par `04-DESIGN-TOKENS.md` — ne pas improviser :

| Aspect | Valeur |
|---|---|
| Rayons | 5 (puces) · 7 (petits boutons) · 9 (boutons) · 11 (champs, cartes) · 16 (panneaux) · 99px (pastilles) |
| Bordures | `1px solid var(--line)` ; accent `var(--line2)` |
| Verre | `background: var(--panel)` + `backdrop-filter: blur(20px) saturate(150%)` — **panneaux de premier plan uniquement, jamais dans une liste** |
| Lueur | `box-shadow: 0 Npx Mpx -Kpx rgba(var(--glow), α)` |
| Focus | `outline: 1.5px solid var(--acc2)` ; `outline-offset: 3px` |
| Micro-libellé | JetBrains Mono, `9.5px`, `letter-spacing: .18em`, majuscules, `var(--mut)` |
| Corps | `12.5px`–`13px` · champs `13px`, padding `10px 12px` |
| Transitions | `.18s ease` (interrupteurs) · `.2s` (fonds) · `.5s ease` (barres de progression) |

Chaque primitive porte `data-testid="ui-<nom>"` sur son conteneur de démonstration.

- [ ] **Step 4: Écrire la galerie**

`app/dev/ui/page.tsx` — une section par primitive, chacune dans ses états (repos, survol, actif, focus, désactivé, erreur). Exclue de la production :

```ts
// dans next.config.mjs
  async redirects() {
    return process.env.NODE_ENV === 'production'
      ? [{ source: '/dev/:path*', destination: '/', permanent: false }]
      : [];
  },
```

- [ ] **Step 5: Vérifier et committer**

```bash
npm run build && CI=1 npx playwright test tests/e2e/ui-gallery.spec.ts
git commit -m "feat(ui): 12 primitives sur les jetons générés, galerie /dev/ui (T2.3)"
```

---

## Task 4.2: Polices auto-hébergées

Lève **D7** · prépare **D8**

- [ ] **Step 1: Écrire le test**

`tests/e2e/fonts.spec.ts` :

```ts
import { expect, test } from '@playwright/test';

test('aucune requête vers un domaine tiers', async ({ page }) => {
  const tiers: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (url.hostname !== 'localhost' && url.protocol !== 'data:') tiers.push(r.url());
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(tiers, `requêtes tierces : ${tiers.join(', ')}`).toEqual([]);
});

test('Space Grotesk est réellement appliquée', async ({ page }) => {
  await page.goto('/');
  const famille = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(famille).toMatch(/Space Grotesk/i);
});
```

> Le premier test vaut plus que la police : il **verrouille la promesse produit**. Toute
> régression qui réintroduirait un appel réseau casse la CI.

- [ ] **Step 2: Télécharger les polices sous licence OFL**

Space Grotesk (400/500/600/700) et JetBrains Mono (400/500/700), en `woff2`, dans `public/fonts/`.
Vérifier que le fichier `OFL.txt` de chaque famille est joint (obligation de la licence).

- [ ] **Step 3: Implémenter `lib/fonts.ts`**

```ts
import localFont from 'next/font/local';

export const spaceGrotesk = localFont({
  variable: '--font-space-grotesk',
  display: 'swap',
  src: [
    { path: '../public/fonts/SpaceGrotesk-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/SpaceGrotesk-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/SpaceGrotesk-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/SpaceGrotesk-Bold.woff2', weight: '700', style: 'normal' },
  ],
});

export const jetbrainsMono = localFont({
  variable: '--font-jetbrains-mono',
  display: 'swap',
  src: [
    { path: '../public/fonts/JetBrainsMono-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/JetBrainsMono-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/JetBrainsMono-Bold.woff2', weight: '700', style: 'normal' },
  ],
});
```

Appliquer les deux variables sur `<html>` dans `app/layout.tsx`.

- [ ] **Step 4: Retirer l'appel Google Fonts du prototype (D8)**

`public/prototype/Habitum.dc.html` charge `fonts.googleapis.com` — contraire à ADR-0002 et
problématique au regard du RGPD. C'est une modification du prototype : elle relève de la
règle **G7**.

Remplacer les balises `<link>` vers Google par un `@font-face` local pointant `../fonts/`, ou —
si l'autonomie du fichier prime — par un repli explicite sur `system-ui` accompagné d'un
commentaire. **Vérifier ensuite que les six contrôles de `tests/domain.test.html` restent verts**
et que le fichier s'ouvre toujours seul dans un navigateur.

> Cette modification ne touche pas le moteur : `docs/handoff/reference/domain-logic-extract.js`
> n'a pas à être régénéré. Le noter dans le message de commit pour lever le doute.

- [ ] **Step 5: Vérifier et committer**

```bash
git commit -m "feat(ui): polices auto-hébergées, plus aucune requête tierce (D7, D8)

Un test e2e échoue si une requête sort du domaine : la promesse « aucun appel
réseau » devient vérifiable, pas déclarative. L'appel Google Fonts du prototype
est retiré (RGPD, ADR-0002). Le moteur n'est pas touché : pas de régénération
de domain-logic-extract.js."
```

---

## Task 4.3: Brancher l'internationalisation

Lève **D6** — 311 clés traduites, aujourd'hui aucune atteignable.

- [ ] **Step 1: Écrire la règle qui interdit les chaînes en dur**

Dans `eslint.config.mjs` :

```js
  {
    files: ['app/**/*.tsx', 'components/**/*.tsx'],
    // Exclut la galerie de développement, qui n'est pas un écran produit.
    ignores: ['app/dev/**'],
    rules: {
      'react/jsx-no-literals': ['error', { noStrings: true, allowedStrings: ['·', '—', '/', ':', '%'], ignoreProps: true }],
    },
  },
```

- [ ] **Step 2: Constater l'échec**

```bash
npm run lint
```

Attendu : **FAIL** sur `AppShell` (11 libellés de navigation) et `PortStatus`.

- [ ] **Step 3: Brancher `useTranslations` partout**

Remplacer chaque libellé par une clé de `messages/fr.json` / `en.json`. Les 311 clés existent
déjà : les utiliser, ne pas en créer de nouvelles sans nécessité. Toute clé ajoutée doit exister
dans les deux fichiers (**G6**, imposé par `npm run check:messages`).

- [ ] **Step 4: Écrire le test e2e de bascule**

```ts
test('la bascule FR → EN change les libellés sans rechargement', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('link', { name: 'Habitudes' })).toBeVisible();
  await page.getByRole('button', { name: /english/i }).click();
  await expect(page.getByRole('link', { name: 'Habits' })).toBeVisible();
  await expect(page).toHaveURL(/\/settings$/);   // pas de segment de langue dans l'URL
});

test('aucune clé brute n’est affichée', async ({ page }) => {
  for (const route of ['/', '/today', '/habits', '/tasks', '/goals', '/calendar', '/stats', '/timer', '/notes', '/profile', '/settings']) {
    await page.goto(route);
    const texte = await page.locator('body').innerText();
    expect(texte, `clé brute visible sur ${route}`).not.toMatch(/\b[a-z]+\.[a-z]+\.[a-zA-Z]+\b/);
  }
});
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(i18n): brancher useTranslations dans tous les composants (D6)

311 clés traduites et symétriques, aucune atteignable : AppShell et PortStatus
étaient en français en dur. Une règle ESLint interdit désormais toute chaîne
littérale dans app/ et components/."
```

---

## Task 4.4: Sélecteur de langue

- [ ] **Step 1: Implémenter `LocaleSwitcher`**

Appelle `setLocale` (`i18n/actions.ts`, existant), met à jour la locale côté client
(`i18n/client-locale.ts`, Plan 3 tâche 3.6), **sans rechargement** et **sans segment d'URL** —
conformément à la décision documentée dans `i18n/config.ts`.

- [ ] **Step 2: Vérifier** que le test de bascule de la tâche 4.3 passe.

---

## Task 4.5: Sélecteur de thème

Lève **D26** — trois thèmes livrés en CSS, `data-theme="neural"` figé dans `layout.tsx`.

- [ ] **Step 1: Écrire le test**

```ts
test('le thème bascule et survit au rechargement', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('radio', { name: /plasma/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'plasma');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'plasma');
});

test('aucun clignotement de thème au chargement', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('radio', { name: /clinical/i }).click();
  await page.reload();
  // Le thème doit être posé AVANT la première peinture : jamais 'neural' d'abord.
  const premier = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(premier).toBe('clinical');
});
```

- [ ] **Step 2: Implémenter l'anti-clignotement**

`app/theme-script.tsx` — un script en ligne, injecté avant l'hydratation, qui lit la préférence et
pose `data-theme` sur `<html>`. **Attention CSP** : le Plan 0 pose `script-src 'self'` sans
`unsafe-inline`. Utiliser un `nonce` fourni par le middleware, ou déplacer la lecture dans un
fichier statique servi depuis le même domaine.

> C'est le seul endroit du produit où la CSP et le rendu se contredisent. Ne pas relâcher la CSP
> pour contourner : utiliser un nonce.

- [ ] **Step 3: Commit**

---

## Task 4.6: Icônes

**Réf :** T2.8

- [ ] **Step 1: Implémenter `components/ui/Icon.tsx`**

Lucide pour la navigation et les actions. **Les glyphes typographiques de catégorie sont
conservés** (`✚ ▲ ◉ ■ ◆ ●`) : `04-DESIGN-TOKENS.md` les qualifie de porteurs d'identité visuelle.

Import nommé par icône, jamais `import * as icons` — cela ferait entrer toute la bibliothèque dans le bundle.

- [ ] **Step 2: Vérifier le poids du bundle**

```bash
npm run build
```

Attendu : First Load JS partagé **< 150 kB** (point de départ : 103 kB).

---

## Task 4.7: Contraste WCAG AA

**Réf :** T7.3 — `--mut` du thème `plasma` est **documenté comme sous AA**

- [ ] **Step 1: Écrire le test de contraste**

`tests/unit/contrast.test.ts` — calcul du ratio de luminance relative entre chaque couleur de
texte et son fond, pour les trois thèmes, à partir de `styles/tokens.css` :

```ts
import { describe, expect, it } from 'vitest';

/* T7.3 — `--mut` du thème plasma est documenté sous AA dans 04-DESIGN-TOKENS.md.
   Ce test le prouve, puis empêche toute régression sur les trois thèmes. */

const PAIRES = [
  ['txt', 'bg'], ['txt2', 'bg'], ['mut', 'bg'],
  ['txt', 'bg2'], ['mut', 'bg2'],
] as const;

const AA_TEXTE_NORMAL = 4.5;
const AA_TEXTE_LARGE = 3;

// … parse styles/tokens.css, convertit en luminance relative, calcule le ratio …

describe('contraste WCAG AA', () => {
  for (const theme of ['neural', 'plasma', 'clinical'] as const) {
    for (const [avant, arriere] of PAIRES) {
      it(`${theme} — --${avant} sur --${arriere}`, () => {
        expect(ratio(theme, avant, arriere)).toBeGreaterThanOrEqual(
          avant === 'mut' ? AA_TEXTE_LARGE : AA_TEXTE_NORMAL,
        );
      });
    }
  }
});
```

- [ ] **Step 2: Corriger `--mut` de `plasma`**

> **Correction du 12 août 2026 — ce n'est pas `plasma`.** Mesure faite, `plasma` est conforme
> (4,85 sur `--bg`, 4,72 sur `--bg2`). C'est **`clinical`** qui échouait : 3,73 et 3,47.
> `04-DESIGN-TOKENS.md` désignait le mauvais thème, et le plan a repris l'erreur. La correction
> porte donc sur `clinical` — `#6c7d95` → `#596a82`, à la source, puis régénération.
> Le seuil retenu est **4,5 pour `--mut` aussi** : « texte large » au sens WCAG signifie 24 px
> (ou 18,66 px en gras), et les micro-libellés du produit font 9,5 px.

La correction porte sur `public/prototype/Habitum.dc.html` (source des jetons), puis
`node scripts/extract-tokens.mjs` régénère `styles/tokens.css`. **Ne jamais éditer `tokens.css`
directement** — le test `check:tokens` du Plan 1 le refuserait.

Vérifier ensuite que la valeur corrigée reste lisible dans le prototype lui-même.

- [ ] **Step 3: axe sur la galerie et les routes**

`tests/e2e/a11y.spec.ts` :

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ROUTES = ['/', '/today', '/habits', '/tasks', '/goals', '/calendar', '/stats', '/timer', '/notes', '/profile', '/settings'];

for (const route of ROUTES) {
  test(`axe — ${route}`, async ({ page }) => {
    await page.goto(route);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critiques = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(critiques.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}
```

```bash
npm i -D @axe-core/playwright
```

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(a11y): contraste WCAG AA sur les trois thèmes, axe en CI (T7.3)

--mut du thème plasma était sous AA, documenté depuis l'audit du prototype.
Corrigé à la source (prototype), tokens.css régénéré par extraction."
```

---

## Critère de sortie du Plan 4

| # | Condition | Vérification |
|---|---|---|
| 1 | `/dev/ui` montre les 12 primitives en **3 thèmes × 2 langues**, sans erreur console | `tests/e2e/ui-gallery.spec.ts` |
| 2 | **Aucune requête réseau tierce** sur aucune route | `tests/e2e/fonts.spec.ts` |
| 3 | Aucune chaîne littérale dans `app/` et `components/` | `npm run lint` |
| 4 | Aucune clé de traduction brute affichée | e2e, tâche 4.3 |
| 5 | Le thème bascule, survit au rechargement, sans clignotement | e2e, tâche 4.5 |
| 6 | Contraste AA sur les 3 thèmes | `tests/unit/contrast.test.ts` |
| 7 | axe sans violation critique ni sérieuse sur les 11 routes | `tests/e2e/a11y.spec.ts` |
| 8 | First Load JS < 150 kB | `npm run build` |
| 9 | `tokens.css` toujours conforme au prototype | `npm run check:tokens` |

**À la sortie : le Plan 5 (les onze vues) peut démarrer.**
