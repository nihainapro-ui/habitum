# Habitum — Plan 6 : Fiabilisation et PWA

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Plus aucun interrupteur sans effet, plus aucun écran blanc, une application installable et utilisable hors ligne.

**Architecture:** On tient les promesses que l'interface fait déjà. Les notifications, le son et la vibration sont branchés sur de vraies API — ou les interrupteurs sont retirés. L'onboarding impose le compte vierge par défaut. Le service worker rend l'application autonome. Le cache dérivé remplace l'invalidation globale.

**Tech Stack:** Serwist (MIT) · Notification API · Web Audio API · `navigator.vibrate` · `@tanstack/react-virtual` (MIT)

**Charge :** 6 j · **Priorité :** 🟠 Haute
**Prérequis :** Plan 5 terminé

## Global Constraints

Voir `2026-08-06-habitum-programme.md` § G1–G12. **G3** gouverne ce plan : *un réglage décoratif est un mensonge d'interface*.

---

## Task 6.1: États d'erreur, de chargement et vides — 1,5 j

Lève **D10** · Réf T4.5

**Fichiers :** `app/error.tsx` · `app/global-error.tsx` · `app/loading.tsx` · `app/<vue>/loading.tsx` (×11) · `components/state/{EmptyState,ErrorState,LoadingState}.tsx` · `lib/logger.ts`

- [ ] **Step 1: Écrire le test**

```ts
import { expect, test } from '@playwright/test';

test('une erreur de rendu affiche un écran de reprise, pas un écran blanc', async ({ page }) => {
  await page.goto('/?forceError=1');   // garde de test, active uniquement hors production
  await expect(page.getByRole('heading', { name: /quelque chose/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /réessayer/i })).toBeVisible();
  // L'erreur ne doit jamais coûter les données de l'utilisateur.
  await expect(page.getByRole('link', { name: /exporter/i })).toBeVisible();
});

test('chaque vue a un état vide explicite sur un compte vierge', async ({ page }) => {
  for (const r of ['/today','/habits','/tasks','/goals','/stats','/timer','/notes']) {
    await page.goto(r);
    await expect(page.getByTestId('empty-state'), `état vide manquant sur ${r}`).toBeVisible();
  }
});
```

- [ ] **Step 2: Implémenter**

`app/error.tsx` et `app/global-error.tsx` proposent **trois** actions : réessayer, revenir à
l'accueil, **exporter ses données**. La troisième est la plus importante : une erreur ne doit
jamais mettre l'utilisateur en position de perdre son historique.

`lib/logger.ts` — journal **local** uniquement (**décision E** du programme). Il stocke les
dernières erreurs dans `meta`, consultables depuis les réglages. **Aucun envoi réseau.**

- [ ] **Step 3: Commit**

---

## Task 6.2: Notifications réelles — 1 j

Réf T4.2 · lève une promesse non tenue depuis l'origine

**Fichiers :** `lib/features/reminders/{permission,scheduler,index}.ts` · `components/settings/NotificationSetting.tsx`

- [ ] **Step 1: Écrire le test**

```ts
test('la permission est demandée dans un contexte explicite, jamais au chargement', async ({ page, context }) => {
  await context.grantPermissions([]);            // aucune permission accordée
  await page.goto('/');
  // Rien ne doit être demandé sans geste de l'utilisateur.
  expect(await page.evaluate(() => Notification.permission)).toBe('default');

  await page.goto('/settings');
  await page.getByRole('switch', { name: /notifications/i }).click();
  await expect(page.getByText(/autoriser les notifications/i)).toBeVisible();
});

test('un refus dégrade proprement : l’interrupteur revient à l’arrêt, avec explication', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'requestPermission', { value: async () => 'denied' });
  });
  await page.goto('/settings');
  await page.getByRole('switch', { name: /notifications/i }).click();
  await expect(page.getByRole('switch', { name: /notifications/i })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('alert')).toContainText(/navigateur/i);
});
```

- [ ] **Step 2: Implémenter**

- Permission demandée **au clic sur l'interrupteur**, jamais au chargement.
- Planificateur : rappels aux heures `reminders[]` de chaque habitude + fin de phase pomodoro.
- Repli : si l'onglet est ouvert, `setTimeout` ; sinon, planification via le service worker
  (tâche 6.8) — les deux chemins doivent donner le même résultat.
- **Dégradation propre** : permission refusée ou API absente → l'interrupteur revient à l'arrêt
  avec un message expliquant que c'est le navigateur qui refuse, pas l'application.

---

## Task 6.3: Son et vibration — 0,5 j

Réf T4.3

**Fichiers :** `lib/features/feedback/{beep,vibrate,index}.ts`

- [ ] **Step 1: Implémenter le bip synthétisé**

**Zéro fichier audio** — Web Audio suffit et ne pèse rien :

```ts
/** Bip de fin de phase. Synthétisé : aucun fichier, aucune requête. */
export function beep(ctx: AudioContext, freq = 880, ms = 160): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  // Enveloppe courte : un bip franc, sans clic de coupure.
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + ms / 1000);
}
```

**Piège :** un `AudioContext` créé hors d'un geste utilisateur démarre suspendu. Le créer au
premier clic sur « démarrer », pas au montage.

- [ ] **Step 2: Vibration**

`navigator.vibrate` avec garde de disponibilité (absent sur iOS Safari — l'interrupteur doit être
masqué, pas affiché puis inopérant).

---

## Task 6.4: Aucun interrupteur sans effet — 0,5 j

Réf T4.4 · **G3**

- [ ] **Step 1: Écrire le test qui interdit la régression**

```ts
test('chaque interrupteur des réglages a un effet observable', async ({ page }) => {
  await page.goto('/settings');
  const inters = page.getByRole('switch');
  const n = await inters.count();
  for (let i = 0; i < n; i++) {
    const s = inters.nth(i);
    const nom = await s.getAttribute('aria-label');
    // Soit il est actionnable, soit il est désactivé avec une raison affichée.
    const desactive = await s.isDisabled();
    if (desactive) {
      await expect(page.getByTestId(`reason-${nom}`), `raison manquante pour ${nom}`).toBeVisible();
    } else {
      await s.click();
      await expect(s).toHaveAttribute('aria-checked', 'true');
    }
  }
});
```

- [ ] **Step 2: Renommer `cloud`**

Le libellé devient **« Sauvegarde locale sur cet appareil »** (déjà fait dans le prototype, lot 1
`A5`). **La clé `cfg.cloud` n'est PAS renommée** (G1) : ce sont des données d'utilisateurs réels.
Un réglage « Synchronisation » n'apparaîtra que si la phase Neon est livrée.

---

## Task 6.5: Onboarding — 1,5 j

Réf T4.6 · dépend de `seedEmpty` / `seedDemo` (Plan 2 tâche 2.5)

**Fichiers :** `app/onboarding/page.tsx` · `components/onboarding/{StepLang,StepTheme,StepHabits,StepDone}.tsx`

- [ ] **Step 1: Écrire le test**

```ts
test('une première ouverture mène à l’onboarding, pas au tableau de bord', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding/);
});

test('le parcours par défaut produit un compte VIERGE', async ({ page }) => {
  await page.goto('/onboarding');
  await page.getByRole('button', { name: /français/i }).click();
  await page.getByRole('button', { name: /neural/i }).click();
  await page.getByRole('button', { name: /commencer/i }).click();     // sans cocher d'habitude
  await page.goto('/stats');
  // G3 : aucun chiffre fabriqué sur un compte neuf.
  await expect(page.getByTestId('focus-minutes')).toHaveText('0');
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('le jeu de démonstration est un choix explicite, et il est signalé', async ({ page }) => {
  await page.goto('/onboarding');
  await page.getByRole('link', { name: /essayer avec des données/i }).click();
  await page.goto('/');
  await expect(page.getByText(/jeu de démonstration/i)).toBeVisible();
});
```

- [ ] **Step 2: Implémenter**

Trois écrans : **langue** → **thème** → **trois habitudes suggérées** (cases à cocher, aucune
pré-cochée). Le bouton principal mène à un **compte vierge**. La démonstration est un lien
secondaire, et elle affiche un badge permanent tant que `meta.demo` est vrai.

---

## Task 6.6: Récurrence de tâches — 1 j

Réf T1.13

**Fichiers :** `lib/domain/recurrence.ts` + `tests/unit/recurrence.test.ts`

**Interfaces produites :**

```ts
export type Recurrence =
  | { freq: 'daily'; interval?: number }
  | { freq: 'weekly'; interval?: number; days: number[] }
  | { freq: 'monthly'; interval?: number; dayOfMonth?: number };

/** Occurrences d'une tâche récurrente sur une fenêtre, exceptions retirées. */
export function expandRecurrence(
  task: Task, from: DateKey, to: DateKey, exceptions: ReadonlySet<DateKey>,
): DateKey[];

/** Clé d'occurrence cochée — format `occ` du prototype, FIGÉ (G1). */
export const occurrenceKey = (taskId: string, date: DateKey): string => `${taskId}|${date}`;
```

**Piège :** `occ` est une clé persistée (**G1**). Le format `taskId|YYYY-MM-DD` ne change pas.

**Cas de test obligatoires :** intervalle > 1 · exception au milieu d'une série · fin de mois
(31 janvier → février) · changement d'heure d'été · fenêtre vide.

---

## Task 6.7 et 6.8: PWA — 2 j

Lève **D25** · Réf T5.1, T5.2

**Fichiers :** `app/manifest.ts` · `public/icons/{192,512,maskable-512}.png` · `app/icon.svg` · `app/apple-icon.png` · `app/sw.ts` · `next.config.mjs`

- [ ] **Step 1: Écrire le test**

```ts
test('le manifeste est complet et servi', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m.name).toBe('Habitum');
  expect(m.display).toBe('standalone');
  expect(m.start_url).toBe('/');
  const tailles = m.icons.map((i: { sizes: string }) => i.sizes);
  expect(tailles).toContain('192x192');
  expect(tailles).toContain('512x512');
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
});

test('l’application fonctionne hors ligne', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('navigation', { name: /principale/i })).toBeVisible();
  await page.getByRole('link', { name: /habitudes/i }).click();
  await expect(page).toHaveURL(/\/habits/);
});
```

- [ ] **Step 2: Implémenter**

```bash
npm i @serwist/next && npm i -D serwist
```

Stratégies de cache : coquille et polices en **précache** ; pas de cache réseau à gérer — il n'y a
aucun appel réseau (c'est tout l'intérêt du produit).

**Attention CSP** (Plan 0) : `worker-src 'self'` est déjà posé. Vérifier qu'aucune violation
n'apparaît à l'enregistrement du service worker.

- [ ] **Step 3: Détection de mise à jour** (T5.5)

Bandeau « nouvelle version disponible », rechargement contrôlé par l'utilisateur — jamais
automatique en cours de saisie.

---

## Task 6.9: Sauvegarde et garde-fou — 0,5 j

Réf T5.3

- [ ] Export JSON complet · import avec rapport visible (le `ImportReport` du Plan 2 s'affiche :
  lues / gardées / écartées, avec le détail des écartées)
- [ ] **Rappel de sauvegarde après 30 jours** sans export, **refusable et non récurrent**
  (comportement du prototype, lot 5 `D8`)
- [ ] Copie de secours automatique avant import et avant réinitialisation (`habitum.state.bak`
  dans le prototype ; équivalent dans `meta`)

---

## Task 6.10: Cache dérivé incrémental — 1 j

Réf T1.12 · corrige **B3**

**Fichiers :** `lib/domain/cache.ts` + tests

**Problème :** `bestStreak` balaie 366 jours × N habitudes. Le prototype invalidait **tout** le
cache dès qu'une case était cochée, même sur une autre habitude.

**Interfaces produites :**

```ts
export interface DerivedCache {
  get<T>(habitId: string, metric: string, window: number, compute: () => T): T;
  invalidateHabit(habitId: string): void;
  invalidateDate(date: DateKey): void;
  clear(): void;
}
export function createDerivedCache(): DerivedCache;
```

**Règle (ADR-0004) :** les métriques d'une habitude dépendent de **sa définition** et de **son
journal** — jamais de celui des autres. L'invalidation est donc toujours ciblée.

- [ ] **Test obligatoire :**

```ts
it('cocher une habitude n’invalide pas les métriques des autres', () => {
  const cache = createDerivedCache();
  let calculs = 0;
  const calc = () => { calculs++; return 42; };

  cache.get('h1', 'best', 365, calc);
  cache.get('h2', 'best', 365, calc);
  expect(calculs).toBe(2);

  cache.invalidateHabit('h1');
  cache.get('h1', 'best', 365, calc);   // recalculé
  cache.get('h2', 'best', 365, calc);   // servi par le cache
  expect(calculs).toBe(3);
});

it("n'affiche jamais une valeur périmée", () => {
  const cache = createDerivedCache();
  expect(cache.get('h1', 'streak', 30, () => 3)).toBe(3);
  cache.invalidateHabit('h1');
  expect(cache.get('h1', 'streak', 30, () => 8)).toBe(8);
});
```

---

## Task 6.11: Virtualisation et budget de performance — 0,5 j

Réf T7.5

```bash
npm i @tanstack/react-virtual
```

- [ ] **Test de charge côté client :**

```ts
test('200 habitudes × 3 ans : interaction sous 100 ms, ouverture sous 1,5 s', async ({ page }) => {
  await page.goto('/?seed=charge');       // garde de test : 200 habitudes, 219 000 entrées
  const t0 = Date.now();
  await page.goto('/habits');
  await expect(page.getByRole('article').first()).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(1500);

  const t1 = Date.now();
  await page.getByRole('checkbox').first().click();
  await expect(page.getByRole('checkbox').first()).toBeChecked();
  expect(Date.now() - t1).toBeLessThan(100);
});
```

---

## Critère de sortie du Plan 6

| # | Condition | Vérification |
|---|---|---|
| 1 | **Aucun interrupteur sans effet** | e2e, tâche 6.4 |
| 2 | Application **installable** et utilisable **avion activé** | e2e hors ligne, tâche 6.8 |
| 3 | Aucun écran blanc possible ; l'écran d'erreur propose d'exporter | e2e, tâche 6.1 |
| 4 | Un compte vierge affiche **0**, jamais une estimation | e2e onboarding, tâche 6.5 |
| 5 | Cocher une habitude n'invalide pas les métriques des autres | test unitaire, tâche 6.10 |
| 6 | 200 habitudes × 3 ans : interaction < 100 ms | e2e de charge, tâche 6.11 |
| 7 | Les 62 valeurs toujours vertes | `npx vitest run tests/unit/golden.test.ts` |
| 8 | `npm run verify` et `npm run test:e2e` verts | — |
