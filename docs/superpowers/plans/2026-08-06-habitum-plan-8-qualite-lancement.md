# Habitum — Plan 8 : Qualité et lancement

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Prouver que le produit tient, puis le mettre en production avec un moyen de revenir en arrière.

**Architecture:** On ne cherche plus à construire, on cherche à casser. Huit parcours critiques, non-régression visuelle, lecteur d'écran, charge côté client, audit de sécurité, montées majeures. Puis mise en ligne, vérifications post-déploiement et runbook d'incident.

**Charge :** 7 j · **Priorité :** 🟠 Haute
**Prérequis :** Plans 5, 6 et 7 terminés

## Global Constraints

Voir `2026-08-06-habitum-programme.md` § G1–G12. **G10** (définition de « terminé ») est le critère de ce plan.

---

## Task 8.1: Les huit parcours critiques — 2 j

Réf T8.1 · `public/prototype/tests/RECETTE.md` § 2

**Fichiers :** `tests/e2e/parcours/*.spec.ts` — un fichier par parcours

| # | Parcours | Ce qu'il prouve |
|---|---|---|
| 1 | **Cocher / décocher une habitude quantifiée** puis recharger | La valeur, la série et le taux suivent, et l'état survit — c'est le cœur du produit |
| 2 | **Créer une tâche par la palette ⌘K** avec catégorie et priorité | La palette n'est pas décorative |
| 3 | **Déplacer une tâche au calendrier**, à la souris **et au clavier** | Le glisser-déposer n'exclut personne |
| 4 | **Pomodoro complet** : démarrer, recharger, reprendre, terminer, créditer l'habitude | B5 est réellement corrigé |
| 5 | **Export → réinitialisation → import** | Aucune perte de données : le parcours qui a déjà échoué une fois |
| 6 | **Changer de profil** | L'isolation des profils tient |
| 7 | **Passer FR → EN** | Les 311 clés sont atteignables, sans rechargement |
| 8 | **Réinitialiser** avec confirmation en deux temps | On ne détruit pas par accident |

- [ ] **Step 1: Écrire le parcours 5 en premier**

C'est celui qui a **déjà échoué** : l'import rejetait quatre des six habitudes de notre propre
export. Il doit être écrit avant les autres.

```ts
import { expect, test } from '@playwright/test';

test('export → réinitialisation → import : aucune perte', async ({ page }) => {
  await page.goto('/app?seed=demo');

  // Relever l'état de référence AVANT.
  const avant = await page.evaluate(() => ({
    habitudes: document.querySelectorAll('[data-habit-id]').length,
    series: [...document.querySelectorAll('[data-testid="streak"]')].map((e) => e.textContent),
  }));

  await page.goto('/app/settings');
  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /exporter/i }).click(),
  ]);
  const fichier = await telechargement.path();

  // Réinitialiser, en deux temps.
  await page.getByRole('button', { name: /réinitialiser/i }).click();
  await page.getByRole('button', { name: /confirmer/i }).click();
  await page.goto('/app/habits');
  await expect(page.getByTestId('empty-state')).toBeVisible();

  // Réimporter.
  await page.goto('/app/settings');
  await page.getByLabel(/importer/i).setInputFiles(fichier!);
  await expect(page.getByRole('status')).toContainText(/6 .*(gardée|kept)/i);

  // L'état doit être IDENTIQUE, pas « proche ».
  await page.goto('/app/habits');
  const apres = await page.evaluate(() => ({
    habitudes: document.querySelectorAll('[data-habit-id]').length,
    series: [...document.querySelectorAll('[data-testid="streak"]')].map((e) => e.textContent),
  }));
  expect(apres).toEqual(avant);
});
```

- [ ] **Step 2: Écrire les sept autres**

Chacun se termine par une assertion sur un **état observable**, jamais sur un simple clic réussi.

- [ ] **Step 3: Vérifier sur les deux projets**

```bash
npm run build && CI=1 npm run test:e2e
```

Attendu : les 8 parcours verts sur `desktop` **et** `mobile` (Pixel 7).

---

## Task 8.2: Non-régression visuelle — 1 j

Réf T8.6

- [ ] **Step 1: Écrire le harnais**

`tests/e2e/visual/vues.spec.ts` — 11 vues × 3 thèmes, comparées aux captures de référence de
`public/prototype/tests/visual/reference/`.

```ts
import { expect, test } from '@playwright/test';

const VUES = [
  ['dash', '/app'], ['today', '/app/today'], ['habits', '/app/habits'],
  ['tasks', '/app/tasks'], ['goals', '/app/goals'], ['cal', '/app/calendar'],
  ['stats', '/app/stats'], ['timer', '/app/timer'], ['notes', '/app/notes'],
  ['profile', '/app/profile'], ['settings', '/app/settings'],
] as const;

for (const [nom, route] of VUES) {
  for (const theme of ['neural', 'plasma', 'clinical'] as const) {
    test(`capture — ${nom} / ${theme}`, async ({ page }) => {
      await page.goto(`${route}?seed=demo&freeze=2026-08-05`);
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      // Neutraliser les animations : une capture ne doit pas dépendre du hasard.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page).toHaveScreenshot(`${nom}-${theme}.png`, {
        maxDiffPixelRatio: 0.02,
        animations: 'disabled',
        mask: [page.getByTestId('clock')],
      });
    });
  }
}
```

- [ ] **Step 2: Geler la date**

Le paramètre `freeze` installe une horloge simulée sur `2026-08-05`. Sans lui, les captures
divergent chaque jour et le harnais devient du bruit.

- [ ] **Step 3: Comparer aux références du prototype**

Les captures du prototype sont la cible visuelle. Un écart supérieur au seuil demande une
décision explicite : soit le portage est fautif, soit l'écart est voulu et la référence est
régénérée **avec une entrée au CHANGELOG**.

- [ ] **Step 4: Ajouter le job en CI**

Les captures sont générées sur `ubuntu-latest` : ne comparer que des captures produites sur la
même plateforme, sinon le rendu des polices produit de faux écarts.

---

## Task 8.3: Accessibilité approfondie — 1 j

Réf T7.4

- [ ] **Step 1: axe sur les 11 vues × 3 thèmes** (le harnais du Plan 4 est étendu aux thèmes)

- [ ] **Step 2: Trois parcours au lecteur d'écran**

Manuel, à consigner dans `docs/a11y/rapport-lecteur-ecran.md` :

| Parcours | Lecteur | Ce qui doit être annoncé |
|---|---|---|
| Cocher une habitude depuis `today` | NVDA (Windows) | Nom, état, nouvelle valeur, confirmation |
| Créer une tâche par ⌘K | VoiceOver (macOS) | Ouverture de la palette, nombre de résultats, sélection |
| Déplacer une tâche au calendrier | NVDA | Mode déplacement, jour visé, confirmation |

- [ ] **Step 3: Vérifier les points historiquement faibles**

- Alternative clavier au glisser-déposer (Plan 5, tâche 5.8) — **testée, pas déclarée**
- Région `aria-live` sur les toasts et les changements de vue (Plan 3, tâche 3.7)
- Curseur personnalisé **désactivé par défaut**, neutralisé sur `pointer: coarse` et en
  mouvement réduit
- Contraste AA sur les 3 thèmes (Plan 4, tâche 4.7)
- Cibles tactiles ≥ 44 px sur les 11 vues

---

## Task 8.4: Recette responsive et manuelle — 0,5 j

Réf T7.1 · `public/prototype/tests/RECETTE.md`

- [ ] **Step 1: Les quatre paliers, les 11 vues, automatisé**

Le test paramétré du Plan 5 couvre le débordement. Ajouter ici : cibles tactiles ≥ 44 px, et
**heatmap qui se réorganise au lieu de défiler sous 768 px** (dernier point responsive ouvert
depuis l'audit du prototype).

- [ ] **Step 2: Passer `RECETTE.md` intégralement**

11 vues × 3 thèmes × 2 langues, les 8 parcours, l'a11y et les paliers. Consigner le résultat et
la date dans `CHANGELOG.md`.

> Ce qu'un test ne juge pas, c'est la **sensation** du geste : le glisser-déposer du calendrier et
> l'aller-retour export/import demandent une passe à la main. Ce n'est pas du travail restant,
> c'est un rituel de recette.

---

## Task 8.5: Charge côté client — 0,5 j

**Il n'y a pas de serveur à charger** — c'est tout l'intérêt du produit. Le test de charge porte
donc sur l'appareil.

| Scénario | Seuil |
|---|---|
| 200 habitudes × 3 ans (≈ 219 000 entrées de journal) | Ouverture < 1,5 s |
| Cocher une habitude à cache chaud | < 100 ms |
| Heatmap 6 mois, 200 habitudes | Rendu < 300 ms |
| Import d'un fichier de 2 Mo | < 5 s, avec indicateur de progression |
| Export complet | < 3 s |

- [ ] **Vérifier aussi qu'aucun recalcul global n'a lieu au clic** (cache dérivé, Plan 6 tâche 6.10) :

```ts
test('cocher une habitude ne recalcule pas les métriques des 199 autres', async ({ page }) => {
  await page.goto('/app/habits?seed=charge');
  await page.evaluate(() => { (window as never as { __calculs: number }).__calculs = 0; });
  await page.getByRole('checkbox').first().click();
  const n = await page.evaluate(() => (window as never as { __calculs: number }).__calculs);
  expect(n).toBeLessThan(10);   // l'habitude touchée et ses agrégats du jour, pas 200
});
```

---

## Task 8.6: Audit de sécurité et montées majeures — 1 j

Réf T8.5 · lève **D11**, **D23**

- [ ] **Step 1: Revue OWASP côté client**

| Point | Vérification |
|---|---|
| XSS | Aucun `dangerouslySetInnerHTML` — **imposé par règle ESLint**, pas par vigilance |
| Stockage | Aucune donnée sensible hors IndexedDB ; aucun secret côté client |
| CSP | `securityheaders.com` note **A** ; aucune violation en console sur les 11 vues + la vitrine |
| Dépendances | `npm audit` sans vulnérabilité haute |
| Chaîne de construction | Actions épinglées par SHA, `permissions: contents: read`, `gitleaks` vert |
| Import | Fichier > 2 Mo rejeté ; JSON malformé rejeté avec message ; **prototype pollution** impossible (`__proto__`, `constructor` filtrés) |

- [ ] **Step 2: Test de robustesse de l'import**

```ts
it('rejette une charge tentant une pollution de prototype', async () => {
  const charge = JSON.parse('{"app":"Habitum","habits":[],"tasks":[],"log":{},"__proto__":{"pollué":true}}');
  await importFromJson(charge);
  expect(({} as Record<string, unknown>).pollué).toBeUndefined();
});

it('rejette un fichier au-delà de la taille maximale', async () => {
  const gros = { app: 'Habitum', habits: [], tasks: [], log: {}, note: 'x'.repeat(3_000_000) };
  await expect(importFromJson(gros)).rejects.toThrow(/taille|size/i);
});
```

- [ ] **Step 3: Monter `next@16` et `next-intl@4`**

C'est le moment : les 8 parcours e2e et la non-régression visuelle peuvent détecter une régression.

```bash
npm i next@16 eslint-config-next@16
npm i next-intl@4
npm run verify && npm run build && CI=1 npm run test:e2e
npm audit
```

Attendu : `npm audit` sans vulnérabilité haute. Remonter alors le seuil de la CI :

```yaml
      - run: npm audit --audit-level=high
```

Consulter le guide de migration `next-intl` v3 → v4 : la configuration `getRequestConfig` et
l'API de navigation ont changé. Fermer l'issue **D11**.

- [ ] **Step 4: Activer `exactOptionalPropertyTypes`** (D23)

```json
    "exactOptionalPropertyTypes": true,
```

Le modèle est destiné à la synchronisation : `undefined` implicite et propriété absente n'y sont
pas la même chose. Corriger les erreurs remontées ; il y en aura sur `Habit.start`, `Habit.end`,
`Task.time`, `Goal.window`.

---

## Task 8.7: Tests utilisateurs — 0,5 j

Cinq personnes, trois parcours, sans assistance :

| Parcours | Ce qu'on mesure |
|---|---|
| Première ouverture | **Temps jusqu'à la première habitude créée** — l'indicateur qui prédit la rétention |
| Une semaine simulée | Le suivi quotidien est-il évident sans explication ? |
| Changement d'appareil | L'export/import est-il trouvable et compréhensible ? |

Consigner dans `docs/recherche/tests-utilisateurs-2026-XX.md` : ce qui a bloqué, ce qui a été
mal compris, les mots employés par les personnes (ils valent mieux que les nôtres pour la vitrine).

> **Rappel de la décision E** : sans télémétrie, c'est la seule mesure produit dont on dispose.
> Elle n'est pas optionnelle.

---

## Task 8.8: Documentation de version — 0,25 j

Réf T8.4

- [ ] `README.md` public : démarrage en < 5 min, captures, badges CI et licence
- [ ] `CHANGELOG.md` complet, une entrée par plan livré
- [ ] **Page de version dans les réglages** : version de l'application, version de schéma Dexie,
      date de construction, lien vers le CHANGELOG. C'est ce qui rend un rapport d'anomalie exploitable.

---

## Task 8.9: Mise en production — 0,5 j

- [ ] **Step 1: Vérifier la définition de « terminé »** (G10)

```bash
npm run verify            # 7 étapes
npm run build && CI=1 npm run test:e2e   # desktop + mobile
npx vitest run tests/unit/golden.test.ts # 62/62
node scripts/extract-tokens.mjs --check
```

- [ ] **Step 2: Trancher la décision C**

**Vercel Hobby est réservé aux usages non commerciaux.** Si le produit encaisse — même des dons
liés au produit — il faut Vercel Pro ou Cloudflare Pages. **Cette décision se prend avant la mise
en ligne, pas après** : changer d'hébergeur après indexation coûte du référencement.

- [ ] **Step 3: Publier**

```bash
git tag -a v1.0.0 -m "Habitum v1.0.0 — première version publique"
git push origin v1.0.0     # déclenche release.yml
```

Promouvoir le déploiement en production, poser le domaine, renseigner `NEXT_PUBLIC_SITE_URL` et
la variable de dépôt `SITE_URL` (sonde du Plan 0).

- [ ] **Step 4: Vérifications post-déploiement**

| # | Vérification | Attendu |
|---|---|---|
| 1 | Les 11 routes applicatives + les pages de vitrine | HTTP 200 |
| 2 | PWA installable (Android, iOS, desktop) | invite d'installation |
| 3 | Hors ligne effectif | avion activé, l'app fonctionne |
| 4 | Aller-retour export → import | état identique |
| 5 | Bascule FR ↔ EN | libellés changés, URL inchangée |
| 6 | Les 3 thèmes | rendu correct, pas de clignotement |
| 7 | En-têtes de sécurité | `securityheaders.com` note **A** |
| 8 | Aucune requête tierce | onglet réseau vide |
| 9 | `robots.txt` et `sitemap.xml` | `/app` interdit, vitrine listée |
| 10 | Lighthouse en production | ≥ budget |
| 11 | Sonde périodique | verte |

- [ ] **Step 5: Search Console**

Déclarer le domaine, soumettre le sitemap, vérifier que `/app` n'est pas indexé.

---

## Task 8.10: Runbook d'incident — 0,25 j

`docs/RUNBOOK.md` :

```markdown
# Runbook d'incident

## Revenir en arrière — 1 minute

Vercel → Deployments → sélectionner le déploiement précédent → « Promote to Production ».
Le déploiement précédent est toujours conservé. Aucune migration de base à défaire :
**il n'y a pas de base côté serveur.**

## Gravité

| Niveau | Définition | Délai |
|---|---|---|
| **S1** | Perte de données utilisateur, ou application inutilisable | Rollback immédiat |
| **S2** | Une vue cassée, ou une fonction majeure indisponible | Correctif sous 24 h |
| **S3** | Défaut visuel, libellé, cas limite | Prochaine version |

## Le seul incident S1 réellement possible

Habitum n'a pas de serveur : le seul incident critique est une **régression de la couche de
données** qui corromprait ou effacerait des données locales. Signaux : rapports de « mes habitudes
ont disparu », erreurs de migration Dexie dans le journal local.

**Réaction :** rollback immédiat, puis vérifier que `habitum.state.bak` (prototype) ou la copie de
secours (application) permet la restauration. Communiquer la procédure de restauration **avant**
de publier le correctif.

## Signalement

Issues GitHub, gabarit « Anomalie ». Avis de sécurité privé pour tout ce qui touche à la sécurité.
La page de version des réglages donne les informations à joindre.

## Ce qu'on ne peut pas faire

Sans télémétrie, **on ne détecte pas un incident par les métriques**. On le détecte par la sonde
(disponibilité) et par les signalements. C'est le prix assumé de la promesse produit — d'où
l'importance d'un canal de signalement visible depuis l'application.
```

---

## Critère de sortie du Plan 8 — et du projet

| # | Condition | Vérification |
|---|---|---|
| 1 | 8 parcours verts sur desktop **et** mobile | `npm run test:e2e` |
| 2 | Non-régression visuelle : 11 vues × 3 thèmes | `tests/e2e/visual/` |
| 3 | axe sans violation critique ; 3 parcours au lecteur d'écran consignés | rapport a11y |
| 4 | `npm audit` sans vulnérabilité haute ; `next@16`, `next-intl@4` | `npm audit` |
| 5 | `securityheaders.com` note **A** | manuel |
| 6 | Lighthouse ≥ 95 / ≥ 95 / 100 / 100 | `lighthouse.yml` |
| 7 | `RECETTE.md` passée intégralement, consignée | `CHANGELOG.md` |
| 8 | Les 62 valeurs toujours vertes | `npx vitest run` |
| 9 | `v1.0.0` en ligne, 11 vérifications post-déploiement passées | tâche 8.9 |
| 10 | Runbook écrit, rollback testé au moins une fois | `docs/RUNBOOK.md` |

**À la sortie : Habitum v1.0 est en production, à 0 €/mois d'infrastructure.**
