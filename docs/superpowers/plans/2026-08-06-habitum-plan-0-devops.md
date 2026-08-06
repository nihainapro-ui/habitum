# Habitum — Plan 0 : DevOps

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Un dépôt GitHub qui bloque mécaniquement ce qui ne doit pas passer, et une application qui sert des en-têtes de sécurité corrects.

**Architecture:** Aucun code produit n'est touché. On pose la chaîne de garde : protection de branche, CI durcie, veille de vulnérabilités, en-têtes HTTP, documents de gouvernance. Tout est gratuit sur dépôt public.

**Tech Stack:** GitHub Actions · Dependabot · CodeQL · gitleaks · Next.js `headers()`

**Charge :** 3 j · **Priorité :** 🟠 Haute · **Démarre :** dès la tâche 1 du Plan 1

## Global Constraints

Voir `2026-08-06-habitum-programme.md` § Contraintes globales (G1–G12). En particulier :
G5 (gratuit uniquement), G10 (définition de « terminé »), G11 (Node ≥ 20.9, CI en matrice 20 + 22), G12 (conventional commits).

---

## Structure des fichiers

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `.github/workflows/ci.yml` | Vérification + e2e, durcie | 0.3, 0.4 |
| `.github/workflows/codeql.yml` | Analyse statique de sécurité | 0.5 |
| `.github/workflows/healthcheck.yml` | Sonde cron sur la production | 0.8 |
| `.github/workflows/release.yml` | Tag → release GitHub | 0.8 |
| `.github/dependabot.yml` | Veille npm + actions | 0.5 |
| `.github/ISSUE_TEMPLATE/bug.yml`, `tache.yml` | Gabarits d'issue | 0.7 |
| `.github/CODEOWNERS` | Revue obligatoire | 0.7 |
| `SECURITY.md`, `CONTRIBUTING.md` | Gouvernance | 0.7 |
| `next.config.mjs` | En-têtes de sécurité | 0.6 |
| `tests/e2e/headers.spec.ts` | Vérifie les en-têtes servis | 0.6 |

---

## Task 0.1: Dépôt GitHub et protection de branche

**Décision requise (A) :** nom du compte et visibilité. **Public recommandé** — Actions illimitées, et l'ouverture est l'argument commercial n° 1 du produit.

**Files:** aucun (configuration GitHub)

**Interfaces:**
- Consumes: dépôt Git local (Plan 1, tâche 1)
- Produces: `origin/main` protégée. Toutes les tâches suivantes passent par des PR.

- [ ] **Step 1: Créer le dépôt distant**

```bash
gh repo create habitum --public --source=. --description "Gestionnaire d'habitudes local-first. Aucun compte, aucune donnée qui sort de l'appareil. FR/EN." --push
```

- [ ] **Step 2: Vérifier que le prototype est bien poussé et intact**

```bash
gh api repos/:owner/habitum/contents/public/prototype/Habitum.dc.html --jq '.size'
```

Attendu : `336396`. Le prototype est une archive — un octet d'écart signale une conversion de fins de ligne, donc un `.gitattributes` défaillant.

- [ ] **Step 3: Protéger `main`**

```bash
gh api -X PUT repos/:owner/habitum/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["verify (20)", "verify (22)", "e2e"] },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true
}
JSON
```

- [ ] **Step 4: Vérifier que la protection est active**

```bash
gh api repos/:owner/habitum/branches/main/protection --jq '.allow_force_pushes.enabled, .required_linear_history.enabled'
```

Attendu : `false`, `true`.

- [ ] **Step 5: Vérifier qu'un push direct est refusé**

```bash
git commit --allow-empty -m "test: vérifier la protection de branche"
git push origin main
```

Attendu : **refus** du serveur. Puis :

```bash
git reset --hard HEAD~1
```

---

## Task 0.2: Issues, labels et jalons

**Files:** aucun (configuration GitHub)

**Interfaces:**
- Consumes: `docs/AUDIT-PRODUCTION-2026-08-06.md` (28 défauts), `docs/handoff/06-BACKLOG.md` (77 tâches)
- Produces: chaque commit peut référencer une issue (`fix: … (#12)`)

- [ ] **Step 1: Créer les labels**

```bash
for l in "prio:critique:b60205" "prio:haute:d93f0b" "prio:moyenne:fbca04" "prio:faible:0e8a16" \
         "phase:0:c5def5" "phase:1:c5def5" "phase:2:c5def5" "phase:3:c5def5" "phase:4:c5def5" \
         "phase:5:c5def5" "phase:6:c5def5" "phase:7:c5def5" "phase:8:c5def5" \
         "type:defaut:e11d21" "type:tache:1d76db" "type:doc:0052cc" "type:securite:b60205"; do
  IFS=: read -r nom couleur <<< "${l%:*}:${l##*:}"
  gh label create "${l%:*}" --color "${l##*:}" --force
done
```

- [ ] **Step 2: Créer les 8 jalons**

```bash
for m in "v0.1 Socle" "v0.2 Données" "v0.3 Coque" "v0.4 Vues" "v0.5 Fiabilisation" "v0.6 PWA" "v0.9 Qualité" "v1.0 Lancement"; do
  gh api -X POST repos/:owner/habitum/milestones -f title="$m"
done
```

- [ ] **Step 3: Créer les 28 issues de défaut**

Une issue par défaut `D1`…`D28`, titre `D<n> — <résumé>`, corps = l'extrait correspondant de `docs/AUDIT-PRODUCTION-2026-08-06.md` § 2.5, labels `type:defaut` + `prio:*` + `phase:*`.

```bash
gh issue create --title "D3 — styles/tokens.css incompatible avec le prototype" \
  --label "type:defaut,prio:critique,phase:1" --milestone "v0.1 Socle" \
  --body "Voir docs/AUDIT-PRODUCTION-2026-08-06.md § 2.5.

tokens.css déclare --fg, --fg-dim, --accent, --accent-hi, --bg-2 avec des valeurs
sans rapport avec le prototype. Sept jetons majeurs manquent : --mut (180 usages),
--acc2 (155), --glow (65), --txt2 (54), --panel2, --line2, --acc3.

Traité par : Plan 1, tâche 5."
```

Répéter pour les 27 autres.

- [ ] **Step 4: Fermer les issues déjà traitées par le Plan 1**

```bash
for n in D1 D2 D3 D4 D5 D13 D14 D15 D16 D17 D18 D20 D21 D22; do
  gh issue list --search "$n in:title" --json number --jq '.[0].number' | \
    xargs -I{} gh issue close {} --comment "Traité par le Plan 1 (stabilisation), livré le 2026-08-06."
done
```

- [ ] **Step 5: Vérifier**

```bash
gh issue list --state all --limit 100 | wc -l
```

Attendu : ≥ 28.

---

## Task 0.3: CI durcie

Lève **D24**.

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `npm run verify` (Plan 1, tâche 2 — sept étapes)
- Produces: contextes de statut `verify (20)`, `verify (22)`, `e2e`, requis par la protection de branche

- [ ] **Step 1: Relever les SHA des actions**

```bash
gh api repos/actions/checkout/git/ref/tags/v5 --jq '.object.sha'
gh api repos/actions/setup-node/git/ref/tags/v5 --jq '.object.sha'
gh api repos/actions/upload-artifact/git/ref/tags/v4 --jq '.object.sha'
```

Noter les trois SHA. Épingler par SHA, pas par tag : un tag est mutable, et un workflow est du code exécuté avec un jeton.

- [ ] **Step 2: Réécrire `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push: { branches: [main] }
  pull_request:

# D24 — droits minimaux. Par défaut, GITHUB_TOKEN a bien plus que nécessaire.
permissions:
  contents: read

# D24 — un push sur une PR annule le run précédent.
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: verify (${{ matrix.node }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: [20, 22]        # 20 = plancher engines ; 22 = ce que Vercel construit
    steps:
      - uses: actions/checkout@<SHA_CHECKOUT>       # v5
      - uses: actions/setup-node@<SHA_SETUP_NODE>   # v5
        with:
          node-version: ${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm run verify
      - name: Vulnérabilités
        run: npm audit --audit-level=high
```

- [ ] **Step 3: Ouvrir une PR et vérifier que la CI passe**

```bash
git switch -c ci/durcissement
git add .github/workflows/ci.yml
git commit -m "ci: durcir le workflow (permissions, SHA épinglés, concurrency, matrice) (D24)"
git push -u origin ci/durcissement
gh pr create --fill
gh pr checks --watch
```

Attendu : `verify (20)` et `verify (22)` verts.

- [ ] **Step 4: Vérifier qu'une PR cassée est bloquée**

Sur une branche jetable, introduire une erreur de type volontaire, pousser, constater que la PR est bloquée, puis supprimer la branche.

```bash
git switch -c ci/preuve-blocage
printf '\nconst x: number = "cassé";\n' >> lib/utils.ts
git commit -am "test: preuve que la CI bloque"
git push -u origin ci/preuve-blocage
gh pr create --fill
gh pr checks --watch || echo "CI rouge — c'est le résultat attendu"
gh pr close --delete-branch
git switch main
```

---

## Task 0.4: Job e2e

Lève **D19** (partiel).

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `npm run test:e2e`, `playwright.config.ts` (existant, projets `desktop` et `mobile`)
- Produces: contexte de statut `e2e`

- [ ] **Step 1: Ajouter le job**

À la fin de `.github/workflows/ci.yml` :

```yaml
  e2e:
    needs: verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<SHA_CHECKOUT>
      - uses: actions/setup-node@<SHA_SETUP_NODE>
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - name: Cache des navigateurs Playwright
        uses: actions/cache@<SHA_CACHE>
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ hashFiles('package-lock.json') }}
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run test:e2e
      - if: failure()
        uses: actions/upload-artifact@<SHA_UPLOAD>
        with:
          name: rapport-playwright
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 2: Faire tourner l'e2e sur le build de production, pas sur `dev`**

Dans `playwright.config.ts`, remplacer le bloc `webServer` :

```ts
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
```

> En CI, on teste ce qui sera déployé. En local, `dev` reste plus pratique.

- [ ] **Step 3: Vérifier localement**

```bash
npm run build && CI=1 npm run test:e2e
```

Attendu : 4 tests verts (2 spécifications × 2 projets).

- [ ] **Step 4: Pousser et vérifier en CI**

```bash
git add .github/workflows/ci.yml playwright.config.ts
git commit -m "ci: ajouter le job e2e sur le build de production (D19)"
git push
gh pr checks --watch
```

---

## Task 0.5: Veille de vulnérabilités

Lève **D11**.

**Files:**
- Create: `.github/dependabot.yml`
- Create: `.github/workflows/codeql.yml`

- [ ] **Step 1: Dependabot**

Créer `.github/dependabot.yml` :

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly, day: monday }
    open-pull-requests-limit: 5
    groups:
      mineures-et-correctifs:
        update-types: [minor, patch]
    labels: [type:securite, prio:moyenne]

  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: weekly, day: monday }
    labels: [type:securite]
```

- [ ] **Step 2: CodeQL**

Créer `.github/workflows/codeql.yml` :

```yaml
name: CodeQL

on:
  push: { branches: [main] }
  pull_request:
  schedule: [{ cron: '0 6 * * 1' }]

permissions:
  contents: read
  security-events: write

jobs:
  analyse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<SHA_CHECKOUT>
      - uses: github/codeql-action/init@<SHA_CODEQL>
        with:
          languages: javascript-typescript
          # Le prototype est une archive : ne pas l'analyser.
          config: |
            paths-ignore:
              - public/prototype
      - uses: github/codeql-action/analyze@<SHA_CODEQL>
```

- [ ] **Step 3: Traiter les 4 vulnérabilités présentes**

```bash
npm audit --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=JSON.parse(s);for(const[k,v]of Object.entries(a.vulnerabilities))console.log(k,v.severity,v.fixAvailable&&v.fixAvailable.isSemVerMajor?'(majeure)':'')})"
```

Attendu : `postcss high`, `sharp high`, `next high`, `next-intl moderate (majeure)`.

Les correctifs exigent `next@16` et `next-intl@4` — deux montées majeures. **Ne pas les faire ici** : elles sont planifiées au Plan 8, tâche 8.6, une fois les vues portées et l'e2e capable de détecter une régression. Ouvrir une issue de suivi :

```bash
gh issue create --title "D11 — montées majeures next@16 et next-intl@4" \
  --label "type:securite,prio:moyenne,phase:8" --milestone "v0.9 Qualité" \
  --body "4 vulnérabilités (3 hautes) : postcss XSS, sharp/libvips, next-intl open redirect + prototype pollution.

Les correctifs sont des montées majeures. À faire au Plan 8 tâche 8.6, quand
l'e2e couvre 8 parcours et peut détecter une régression."
```

- [ ] **Step 4: Autoriser temporairement le seuil d'audit en CI**

Tant que D11 n'est pas levé, `npm audit --audit-level=high` échouerait. Remplacer, dans `ci.yml` :

```yaml
      - name: Vulnérabilités
        # D11 : 3 hautes connues (postcss, sharp, next-intl), correctifs en
        # montées majeures planifiées au Plan 8. Le seuil redescend à `high`
        # dès que l'issue D11 est fermée.
        run: npm audit --audit-level=critical
```

> Le seuil est explicitement daté et rattaché à une issue. Un seuil abaissé sans justification écrite est une dette invisible.

- [ ] **Step 5: Commit**

```bash
git add .github/
git commit -m "ci: dependabot, CodeQL et audit npm (D11)"
```

---

## Task 0.6: En-têtes de sécurité

Lève **D9**.

**Files:**
- Modify: `next.config.mjs`
- Create: `tests/e2e/headers.spec.ts`

**Interfaces:**
- Consumes: rien
- Produces: en-têtes servis sur toutes les routes. Le Plan 6 (service worker) et le Plan 7 (vitrine) doivent rester compatibles avec la CSP.

- [ ] **Step 1: Écrire le test (il échoue)**

Créer `tests/e2e/headers.spec.ts` :

```ts
import { expect, test } from '@playwright/test';

/* D9 — aucun en-tête de sécurité n'était servi. T8.5 du backlog. */

const ATTENDUS: Record<string, RegExp> = {
  'content-security-policy': /default-src 'self'/,
  'strict-transport-security': /max-age=\d{7,}/,
  'x-frame-options': /^DENY$/i,
  'referrer-policy': /no-referrer/,
  'permissions-policy': /camera=\(\)/,
  'x-content-type-options': /^nosniff$/i,
};

test('les en-têtes de sécurité sont servis sur la racine', async ({ request }) => {
  const res = await request.get('/');
  const headers = res.headers();
  for (const [nom, motif] of Object.entries(ATTENDUS)) {
    expect(headers[nom], `en-tête ${nom}`).toBeDefined();
    expect(headers[nom]!, `en-tête ${nom}`).toMatch(motif);
  }
});

test('le prototype reste noindex', async ({ request }) => {
  const res = await request.get('/prototype/Habitum.dc.html');
  expect(res.headers()['x-robots-tag']).toContain('noindex');
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

```bash
npm run build && CI=1 npx playwright test tests/e2e/headers.spec.ts --project=desktop
```

Attendu : **FAIL** — `en-tête content-security-policy: expected undefined to be defined`.

- [ ] **Step 3: Implémenter les en-têtes**

Dans `next.config.mjs` :

```js
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/* D9 — Habitum ne charge aucune ressource tierce : la CSP peut être stricte.
   `unsafe-inline` sur style-src est nécessaire tant que des styles en ligne
   subsistent (ADR-0005) ; il tombera quand le Plan 4 aura porté les
   primitives sur des classes. `data:` sur img-src sert aux avatars OKLCH. */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const SECURITE = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  async headers() {
    return [
      { source: '/:path*', headers: SECURITE },
      // Le prototype est une archive : il charge Google Fonts (D8) et ne peut
      // pas vivre sous la CSP de l'application tant que D8 n'est pas levé.
      {
        source: '/prototype/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 4: Retirer la duplication de `vercel.json`**

`vercel.json` posait `X-Robots-Tag` sur `/prototype/*`. C'est désormais dans `next.config.mjs` : deux sources pour un même en-tête sont garanties de diverger.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "regions": ["cdg1"]
}
```

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

```bash
npm run build && CI=1 npx playwright test tests/e2e/headers.spec.ts --project=desktop
```

Attendu : **PASS**, 2 tests.

- [ ] **Step 6: Vérifier que l'application fonctionne toujours sous CSP**

```bash
npm run start
```

Ouvrir `http://localhost:3000`, ouvrir la console. Attendu : **aucune violation CSP**. Si `style-src` bloque un style en ligne, c'est le signe qu'il faut avancer le Plan 4 — pas relâcher la CSP.

- [ ] **Step 7: Commit**

```bash
git add next.config.mjs vercel.json tests/e2e/headers.spec.ts
git commit -m "feat(sécurité): en-têtes CSP, HSTS, X-Frame-Options, Referrer-Policy (D9)

T8.5 du backlog. Vérifié par un test e2e : un en-tête retiré casse la CI.
X-Robots-Tag sur /prototype déplacé de vercel.json vers next.config.mjs —
une seule source par en-tête."
```

---

## Task 0.7: Gouvernance du dépôt

Lève **D27**.

**Files:**
- Create: `SECURITY.md`, `CONTRIBUTING.md`, `.github/CODEOWNERS`
- Create: `.github/ISSUE_TEMPLATE/bug.yml`, `.github/ISSUE_TEMPLATE/tache.yml`

- [ ] **Step 1: `SECURITY.md`**

```markdown
# Politique de sécurité

## Ce que Habitum protège

Habitum est **local-first** : vos données ne quittent pas votre appareil. Il n'y a ni compte, ni
serveur applicatif, ni base de données distante, ni télémétrie. La surface d'attaque se limite au
navigateur et à la chaîne de construction.

## Signaler une vulnérabilité

Ouvrir un **avis de sécurité privé** (onglet Security → Report a vulnerability). Ne pas ouvrir
d'issue publique.

Réponse sous 7 jours, correctif visé sous 30 jours pour une gravité haute ou critique.

## Périmètre

**Dans le périmètre :** l'application (`app/`, `components/`, `lib/`), la chaîne de construction,
les dépendances, les en-têtes servis.

**Hors périmètre :** `public/prototype/` — c'est une **archive** de référence, servie telle quelle,
en `noindex`, et jamais exécutée dans le contexte de l'application. Elle charge des polices depuis
`fonts.googleapis.com` (défaut connu D8, suivi en issue).

## Mesures en place

- CSP stricte, HSTS, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`
- Aucune surface d'injection : ni `innerHTML`, ni `eval`, ni `new Function` (vérifié)
- Dependabot hebdomadaire, CodeQL, `npm audit` en intégration continue
- Aucun secret dans le dépôt ; `gitleaks` en CI
```

- [ ] **Step 2: `CONTRIBUTING.md`**

```markdown
# Contribuer à Habitum

## En cinq minutes

```bash
npm install
npm run dev        # http://localhost:3000
npm run verify     # à passer AVANT toute PR
```

Le prototype de référence : `public/prototype/Habitum.dc.html`, ouvrable directement.

## Avant d'écrire une ligne

Lire `CLAUDE.md`. Les règles y sont courtes et non négociables — deux d'entre elles ont déjà coûté
des données.

## Définition de « terminé »

- `npm run verify` vert (typecheck · lint · libellés · jetons · tests · build · format)
- `npm run test:e2e` vert sur desktop **et** mobile
- Aucun débordement horizontal à 390 / 768 / 1060 / 1440 px
- `CHANGELOG.md` à jour
- Tout document de `docs/` invalidé par la PR est corrigé **dans la même PR**

## Ce qu'une PR ne peut pas faire

- Renommer une clé persistée (`ov`, `obj`, `occ`, `tt`, `mat`, `cfg`, `habitum.*`)
- Modifier `tests/fixtures/golden.json` — les 62 valeurs sont la spécification
- Modifier `public/prototype/` sauf pour reporter une correction du moteur, et alors en régénérant
  `docs/handoff/reference/domain-logic-extract.js`
- Éditer `styles/tokens.css` à la main — il est généré par `scripts/extract-tokens.mjs`
- Introduire une dépendance non gratuite ou sous licence non permissive
- Ajouter un appel réseau vers un tiers

## Commits

Conventional commits : `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ci:`, `refactor:`.
```

- [ ] **Step 3: `CODEOWNERS` et gabarits d'issue**

`.github/CODEOWNERS` :

```
*                       @<compte>
/lib/domain/            @<compte>
/public/prototype/      @<compte>
/tests/fixtures/        @<compte>
```

`.github/ISSUE_TEMPLATE/bug.yml` :

```yaml
name: Anomalie
description: Signaler un comportement incorrect
labels: [type:defaut]
body:
  - type: textarea
    attributes: { label: Ce qui se passe }
    validations: { required: true }
  - type: textarea
    attributes: { label: Ce qui devrait se passer }
    validations: { required: true }
  - type: textarea
    attributes:
      label: Reproduction
      placeholder: "1. Ouvrir…\n2. Cliquer…\n3. Observer…"
    validations: { required: true }
  - type: dropdown
    attributes:
      label: Vue concernée
      options: [dash, today, habits, tasks, goals, calendar, stats, timer, notes, profile, settings, autre]
  - type: dropdown
    attributes: { label: Thème, options: [neural, plasma, clinical] }
  - type: dropdown
    attributes: { label: Langue, options: [fr, en] }
```

- [ ] **Step 4: Ajouter `gitleaks` à la CI**

Dans `.github/workflows/ci.yml`, job `verify`, après `npm ci` :

```yaml
      - name: Secrets
        uses: gitleaks/gitleaks-action@<SHA_GITLEAKS>
        env: { GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}' }
```

- [ ] **Step 5: Commit**

```bash
git add SECURITY.md CONTRIBUTING.md .github/
git commit -m "docs: gouvernance du dépôt — sécurité, contribution, gabarits (D27)"
```

---

## Task 0.8: Sonde de production et releases

**Files:**
- Create: `.github/workflows/healthcheck.yml`
- Create: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: URL de production (disponible après le Plan 6, tâche d'infrastructure)
- Produces: une issue automatique en cas d'indisponibilité ; une release par tag

- [ ] **Step 1: Sonde**

Créer `.github/workflows/healthcheck.yml` :

```yaml
name: Sonde de production

on:
  schedule: [{ cron: '0 */6 * * *' }]
  workflow_dispatch:

permissions:
  contents: read
  issues: write

jobs:
  sonde:
    runs-on: ubuntu-latest
    steps:
      - name: Interroger la production
        id: sonde
        run: |
          code=$(curl -s -o /dev/null -w '%{http_code}' "${{ vars.SITE_URL }}")
          echo "code=$code" >> "$GITHUB_OUTPUT"
          [ "$code" = "200" ] || exit 1
      - if: failure()
        uses: actions/github-script@<SHA_SCRIPT>
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner, repo: context.repo.repo,
              title: `Production indisponible (HTTP ${{ steps.sonde.outputs.code }})`,
              labels: ['type:defaut', 'prio:critique'],
              body: 'La sonde périodique a échoué. Vérifier le dernier déploiement Vercel et, si besoin, revenir au précédent.'
            })
```

> `vars.SITE_URL` est une variable de dépôt, pas un secret : `gh variable set SITE_URL --body "https://…"` une fois le domaine en place.

- [ ] **Step 2: Releases**

Créer `.github/workflows/release.yml` :

```yaml
name: Release

on:
  push: { tags: ['v*'] }

permissions:
  contents: write

jobs:
  publier:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<SHA_CHECKOUT>
        with: { fetch-depth: 0 }
      - run: gh release create "${{ github.ref_name }}" --generate-notes --verify-tag
        env: { GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}' }
```

- [ ] **Step 3: Commit et fusion**

```bash
git add .github/workflows/
git commit -m "ci: sonde de production périodique et publication de release sur tag"
git push
gh pr create --fill && gh pr merge --squash --delete-branch
```

---

## Critère de sortie du Plan 0

| # | Condition | Vérification |
|---|---|---|
| 1 | Une PR qui casse `verify` est mécaniquement bloquée | Preuve enregistrée en tâche 0.3 step 4 |
| 2 | `verify (20)`, `verify (22)` et `e2e` sont des contextes requis | `gh api repos/:owner/habitum/branches/main/protection --jq '.required_status_checks.contexts'` |
| 3 | Les en-têtes de sécurité sont servis et testés | `npx playwright test tests/e2e/headers.spec.ts` |
| 4 | Dependabot et CodeQL sont actifs | Onglets Security et Insights du dépôt |
| 5 | 28 issues de défaut existent, 14 fermées par le Plan 1 | `gh issue list --state all \| wc -l` |
| 6 | Aucun secret dans l'historique | `gitleaks` vert en CI |
| 7 | `securityheaders.com` note **A** sur la préversion | manuel, une fois Vercel branché |
