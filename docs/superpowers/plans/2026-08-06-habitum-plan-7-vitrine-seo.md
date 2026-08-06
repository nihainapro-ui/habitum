# Habitum — Plan 7 : Vitrine et SEO

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Construire le seul actif indexable du projet, et rendre l'application volontairement invisible des moteurs.

**Architecture:** L'application est un outil privé : elle n'a aucun contenu public et passe en `noindex`. Tout le référencement se joue sur une **vitrine statique bilingue**, servie depuis le même déploiement, en design **Modernist** — décision B1 option (c), déjà tranchée et matérialisée par `public/prototype/Vitrine Habitum.dc.html`.

**Tech Stack:** Next.js statique · `app/robots.ts` · `app/sitemap.ts` · JSON-LD · Lighthouse CI

**Charge :** 3 j · **Priorité :** 🟠 Haute · **parallélisable avec le Plan 6**
**Prérequis :** Plan 5 terminé (il faut des captures réelles) · **Décision F** du programme (modèle économique) prise

## Global Constraints

Voir `2026-08-06-habitum-programme.md` § G1–G12. **G5** (gratuit), **G6** (symétrie FR/EN), **G10** (paliers responsive).

**Frontière de design :** `docs/handoff/07-DECISION-B1.md` — l'**application** reste sombre (Space Grotesk, verre dépoli, rayons 11–16) ; la **vitrine et la documentation** sont en Modernist (rouge `#ec3013` sur fond clair, Archivo, rayon 0, règles 2 px, grille modulaire visible). Les deux registres ne se mélangent pas.

---

## Structure des fichiers

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `app/(site)/layout.tsx` | Coque Modernist, distincte de l'application | 7.1 |
| `app/(site)/page.tsx` | Accueil vitrine | 7.1 |
| `app/(site)/fonctionnalites/page.tsx` | Détail produit | 7.1 |
| `app/(site)/confidentialite/page.tsx` | Politique de confidentialité | 7.6 |
| `app/(site)/mentions-legales/page.tsx` | Mentions légales | 7.6 |
| `app/(site)/comparatifs/[slug]/page.tsx` | vs HabitNow · vs Habitica · vs Streaks | 7.5 |
| `app/(site)/guides/[slug]/page.tsx` | Arrêter l'alcool · Réduire les écrans · Pomodoro | 7.5 |
| `app/robots.ts` | `noindex` sur l'app, `allow` sur la vitrine | 7.3 |
| `app/sitemap.ts` | Pages de vitrine uniquement | 7.3 |
| `app/opengraph-image.tsx` | Image sociale générée | 7.2 |
| `lib/seo/jsonld.ts` | `SoftwareApplication`, `FAQPage`, `BreadcrumbList` | 7.4 |
| `styles/modernist.css` | Jetons Modernist, portée `(site)` | 7.1 |
| `.github/workflows/lighthouse.yml` | Budget en CI | 7.7 |
| `tests/e2e/seo.spec.ts` | Métadonnées, robots, sitemap, JSON-LD | 7.2–7.4 |

> **Attention à la route racine.** L'application occupe déjà `/` (tableau de bord). Trancher :
> soit la vitrine prend `/` et l'application passe sous `/app`, soit la vitrine vit sous `/decouvrir`.
> **Recommandation : la vitrine prend `/`.** Un visiteur qui arrive sur un tableau de bord vide ne
> comprend pas le produit, et `/` est l'URL qui se partage. L'application démarre alors sur
> `/app` — et le service worker (Plan 6) doit avoir `start_url: '/app'`.

---

## Task 7.1: Vitrine — 1,5 j

Lève **D28** (cœur)

- [ ] **Step 1: Écrire le test de contenu**

`tests/e2e/site.spec.ts` :

```ts
import { expect, test } from '@playwright/test';

test('la vitrine dit ce que fait le produit en un écran', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // Les trois arguments différenciants doivent être au-dessus de la ligne de flottaison.
  await expect(page.getByText(/sans compte/i)).toBeVisible();
  await expect(page.getByText(/sur votre appareil/i)).toBeVisible();
  await expect(page.getByText(/gratuit/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /ouvrir habitum/i })).toBeVisible();
});

test('la vitrine est en Modernist, l’application reste sombre', async ({ page }) => {
  await page.goto('/');
  const fondSite = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.goto('/app');
  const fondApp = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(fondSite).not.toBe(fondApp);
});

for (const w of [390, 768, 1060, 1440]) {
  test(`vitrine sans débordement à ${w} px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('/');
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
}
```

- [ ] **Step 2: Extraire les jetons Modernist**

Source : `public/prototype/_ds/modernist-*/styles.css`. Les extraire dans `styles/modernist.css`,
**portés au groupe de routes `(site)` uniquement** — jamais sur `<html>`, pour que l'application
ne les hérite pas.

- [ ] **Step 3: Écrire les sections**

| Section | Contenu |
|---|---|
| Accroche | « Le suivi d'habitudes qui ne vous demande pas de compte. » + capture réelle |
| Trois arguments | Confidentialité par construction · 7 types d'habitude · Focus intégré |
| Preuve | Capture des 11 vues, les 3 thèmes, FR/EN |
| Profondeur du modèle | Tableau des 7 types + 3 types d'objectif — c'est ce que les concurrents n'ont pas |
| Confidentialité | « Ouvrez l'onglet réseau. Il est vide. » + lien vers le dépôt |
| Installation | PWA, hors ligne, tous appareils |
| FAQ | 8 questions (données, changement d'appareil, prix, code source, RGPD…) |
| Pied | Confidentialité · Mentions · GitHub · Licence MIT |

- [ ] **Step 4: Bilingue**

Les clés de vitrine vont dans `messages/*.json` sous un préfixe `site.`. **G6** s'applique :
`npm run check:messages` refuse toute asymétrie.

---

## Task 7.2: Métadonnées — 0,5 j

- [ ] **Step 1: Écrire le test**

```ts
test('les métadonnées sociales sont complètes', async ({ page }) => {
  await page.goto('/');
  const meta = async (s: string) => page.locator(s).getAttribute('content');
  expect(await meta('meta[property="og:title"]')).toBeTruthy();
  expect(await meta('meta[property="og:description"]')).toBeTruthy();
  expect(await meta('meta[property="og:image"]')).toMatch(/^https?:\/\//);
  expect(await meta('meta[property="og:type"]')).toBe('website');
  expect(await meta('meta[name="twitter:card"]')).toBe('summary_large_image');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveCount(1);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
});
```

- [ ] **Step 2: Implémenter**

Dans `app/(site)/layout.tsx` :

```ts
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Habitum — suivi d’habitudes sans compte', template: '%s · Habitum' },
  description: "Habitudes, tâches, objectifs et temps de focus. Vos données restent sur votre appareil : aucun compte, aucun traqueur, aucun abonnement.",
  alternates: { canonical: '/', languages: { fr: '/', en: '/en' } },
  openGraph: { type: 'website', siteName: 'Habitum', locale: 'fr_FR' },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};
```

`NEXT_PUBLIC_SITE_URL` est **déjà** dans `.env.example` — l'utiliser, ne pas en créer une autre.

- [ ] **Step 3: Image Open Graph générée**

`app/opengraph-image.tsx` avec `ImageResponse` — 1200 × 630, en Modernist, police embarquée
(**pas de police distante** : la CSP du Plan 0 l'interdit et la promesse produit aussi).

---

## Task 7.3: robots.txt et sitemap.xml — 0,5 j

- [ ] **Step 1: Écrire le test**

```ts
test('l’application est noindex, la vitrine est indexable', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/Disallow: \/app/);
  expect(robots).toMatch(/Disallow: \/prototype/);
  expect(robots).toMatch(/Sitemap: https?:\/\//);

  const map = await (await request.get('/sitemap.xml')).text();
  expect(map).toContain('<urlset');
  expect(map).not.toContain('/app/');        // aucune route applicative indexée
  expect(map).not.toContain('/prototype');
});

test('les routes applicatives portent un en-tête noindex', async ({ request }) => {
  const res = await request.get('/app/habits');
  expect(res.headers()['x-robots-tag']).toContain('noindex');
});
```

- [ ] **Step 2: Implémenter**

```ts
// app/robots.ts
import type { MetadataRoute } from 'next';

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      // L'application est un outil privé : rien à indexer, et le budget de
      // crawl doit aller à la vitrine.
      disallow: ['/app', '/app/', '/prototype', '/dev'],
    }],
    sitemap: `${base}/sitemap.xml`,
  };
}
```

`app/sitemap.ts` liste **uniquement** les pages de vitrine, avec `alternates.languages`.

Ajouter dans `next.config.mjs` (`headers()`, posé au Plan 0) :

```js
      { source: '/app/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
```

---

## Task 7.4: Données structurées — 0,25 j

- [ ] **Step 1: Test**

```ts
test('le JSON-LD est valide et déclare un produit gratuit', async ({ page }) => {
  await page.goto('/');
  const blocs = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(blocs.length).toBeGreaterThan(0);
  const app = blocs.map((b) => JSON.parse(b)).find((o) => o['@type'] === 'SoftwareApplication');
  expect(app).toBeDefined();
  expect(app.offers.price).toBe('0');
  expect(app.applicationCategory).toBe('LifestyleApplication');
});
```

- [ ] **Step 2: Implémenter** `lib/seo/jsonld.ts` — `SoftwareApplication` (prix 0, plateforme web,
  langues fr/en, licence MIT), `FAQPage` sur la section FAQ, `BreadcrumbList` sur les pages
  profondes.

> **Attention CSP :** `script-src 'self'` interdit les scripts en ligne. Le JSON-LD n'est pas un
> script exécutable, mais il est servi dans une balise `<script>`. Utiliser le `nonce` du Plan 4
> tâche 4.5, ou ajouter `'strict-dynamic'` — **jamais `unsafe-inline`**.

---

## Task 7.5: Contenu de fond — 0,5 j

Trois comparatifs et trois guides. Chaque page :

- 800–1 500 mots, en français, avec version anglaise
- Un titre `h1` unique portant la requête cible
- Un tableau de comparaison factuel (**aucune affirmation invérifiable sur un concurrent**)
- Un maillage interne vers l'accueil et vers les fonctionnalités
- `BreadcrumbList` en JSON-LD

| Page | Requête cible |
|---|---|
| `comparatifs/habitnow` | « alternative HabitNow gratuite » |
| `comparatifs/habitica` | « Habitica sans compte » |
| `comparatifs/streaks` | « Streaks alternative Android » |
| `guides/arreter-alcool` | « application suivi arrêt alcool » |
| `guides/reduire-ecrans` | « suivre temps d'écran habitude » |
| `guides/methode-pomodoro` | « pomodoro et habitudes » |

> **Règle éditoriale :** ne rien affirmer sur un concurrent qui ne soit pas vérifiable à la date de
> publication, et dater chaque comparatif. Un comparatif faux se retourne contre le produit.

---

## Task 7.6: Confidentialité et mentions légales — 0,25 j

Lève **D27** (partie publique)

La politique de confidentialité d'Habitum est courte parce qu'il n'y a presque rien à déclarer —
et c'est précisément l'argument :

- **Aucune donnée personnelle collectée.** Pas de compte, pas d'e-mail, pas d'adresse IP journalisée par l'application.
- **Stockage local uniquement** : IndexedDB, sur l'appareil de l'utilisateur. L'utilisateur peut tout exporter et tout supprimer, sans demander.
- **Aucun traqueur, aucun cookie tiers.** Un seul cookie propre : `habitum.lang`, une préférence de langue, un an, sans identifiant.
- **Hébergement** : nommer l'hébergeur et la région (`cdg1`, UE).
- **Analytique de vitrine** : si activée, la nommer, dire qu'elle est sans cookie et sans identifiant, et indiquer comment s'y soustraire.
- **Droits RGPD** : sans traitement de données personnelles, ils sont sans objet — l'écrire, avec un contact.

---

## Task 7.7: Budget de performance en CI — 0,25 j

Réf T7.6

- [ ] **Step 1: Workflow**

`.github/workflows/lighthouse.yml` :

```yaml
name: Lighthouse

on:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  budget:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<SHA_CHECKOUT>
      - uses: actions/setup-node@<SHA_SETUP_NODE>
        with: { node-version: 22, cache: npm }
      - run: npm ci && npm run build
      - run: npx --yes @lhci/cli autorun
```

- [ ] **Step 2: Budget**

`lighthouserc.json` :

```json
{
  "ci": {
    "collect": { "startServerCommand": "npm run start", "url": ["http://localhost:3000/", "http://localhost:3000/app"], "numberOfRuns": 3 },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.95 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 1 }],
        "categories:seo": ["error", { "minScore": 1 }]
      }
    }
  }
}
```

---

## Critère de sortie du Plan 7

| # | Condition | Vérification |
|---|---|---|
| 1 | Lighthouse **SEO 100** sur la vitrine | `lighthouse.yml` |
| 2 | Performance ≥ 95, Accessibilité ≥ 95, Bonnes pratiques 100 | idem |
| 3 | `robots.txt` interdit `/app` et `/prototype` ; `sitemap.xml` ne liste que la vitrine | `tests/e2e/seo.spec.ts` |
| 4 | Les routes applicatives servent `X-Robots-Tag: noindex` | idem |
| 5 | JSON-LD valide, produit déclaré gratuit | idem |
| 6 | Vitrine bilingue, `hreflang` FR/EN, symétrie des clés | `npm run check:messages` |
| 7 | Politique de confidentialité en ligne et exacte | revue manuelle |
| 8 | Aucun débordement à 390/768/1060/1440 px | e2e, tâche 7.1 |
| 9 | Aucune requête réseau tierce sur la vitrine | test du Plan 4, tâche 4.2, étendu à `/` |
