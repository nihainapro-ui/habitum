# Lot A — Affichage et affordances : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les six défauts d'affichage relevés par l'audit du 2026-09-02, rendre l'édition des habitudes visible, et verrouiller le tout par un test de non-régression qui mesure les débordements au lieu de les deviner.

**Architecture:** Corrections locales aux composants fautifs (`DashView`, `RowShell`, `HabitCard`), un test e2e nouveau qui reprend la détection de l'audit, aucun changement de modèle ni de store.

**Tech Stack:** Next.js 15, Tailwind (classes utilitaires + variables CSS du thème), Playwright, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-02-ameliorations-ui-design.md`

## Global Constraints

- CLAUDE.md prime : jamais de littéral dans le JSX (`react/jsx-no-literals`), toute clé de `messages/fr.json` existe dans `en.json`, `npm run check:messages` doit rester vert.
- Couleurs par variables du thème (`var(--txt2)`, `var(--line)`…), jamais en dur.
- Un correctif d'affichage ne touche PAS les largeurs ≥ 768 px quand le rendu y est bon : les captures de recette visuelle (`tests/e2e/visual`) ne doivent pas bouger sans raison.
- Tout invariant nouveau est éprouvé par mutation (défaire le correctif → le test tombe) avant d'être tenu pour acquis.
- Fin de lot : `npm run verify` vert, `CI=1 npx playwright test` vert desktop + mobile, CHANGELOG à jour.

---

### Task 1: Le test de non-régression des débordements

**Files:**
- Create: `tests/e2e/debordements.spec.ts`
- Test: lui-même

**Interfaces:**
- Produces: l'assistant `releverDebordements(page)` (local au fichier de test), utilisé par toutes les assertions du fichier ; les tâches 2 et 3 le font passer au vert.

- [ ] **Step 1: Écrire le test — il DOIT échouer aujourd'hui**

```ts
import { expect, test } from '@playwright/test';
import { ouvrirAvecDemo, attendreHydratation } from './helpers/app';

/* Débordements MESURÉS, pas devinés — la version permanente de l'audit du
   2026-09-02. Un texte coupé par sa boîte ne se voit dans aucune capture
   comparée (la coupe est stable d'une exécution à l'autre) : seule la mesure
   `scrollWidth > clientWidth` l'attrape.

   CE QUI EST EXCLU, et pourquoi ce n'est pas de la complaisance :
   `sr-only` (boîte de 1 px par définition), `truncate` (troncature choisie,
   assumée par des points de suspension), les conteneurs défilants (déborder
   est leur fonction), le halo du logo (`aria-hidden`, décoratif) et le
   bouton-interrupteur (marge négative documentée dans Switch.tsx). */

const LARGEURS = [360, 390, 768, 1060, 1440] as const;
const VUES = ['/app', '/app/stats', '/app/today'] as const;

async function releverDebordements(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const releve: string[] = [];
    for (const el of Array.from(document.querySelectorAll('main *'))) {
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') continue;
      if (st.overflowX === 'auto' || st.overflowX === 'scroll') continue;
      if (el.closest('[aria-hidden="true"], .sr-only, [class*="truncate"], button')) continue;
      if (el.clientWidth === 0) continue;
      if (el.scrollWidth > el.clientWidth + 1) {
        const texte = (el.textContent ?? '').trim().slice(0, 40);
        releve.push(`${el.tagName.toLowerCase()} « ${texte} » ${el.scrollWidth}>${el.clientWidth}`);
      }
    }
    return releve;
  });
}

for (const largeur of LARGEURS) {
  for (const vue of VUES) {
    test(`aucun texte coupé — ${vue} à ${largeur}px`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 900 });
      await ouvrirAvecDemo(page, vue);
      await attendreHydratation(page);

      expect(await releverDebordements(page)).toEqual([]);
    });
  }
}
```

- [ ] **Step 2: Le lancer et CONSIGNER les échecs**

Run: `CI=1 npx playwright test tests/e2e/debordements.spec.ts --project=desktop`
Expected: FAIL sur `/app` et `/app/stats` à 360 et 390 px (libellés de tuiles), et sur `/app/today` à 360 px (ligne écrasée). Noter la liste exacte — c'est l'oracle des tâches 2 et 3. Si un échec IMPRÉVU apparaît, ne pas élargir les exclusions pour le faire taire : c'est un défaut de plus, l'ajouter au lot.

- [ ] **Step 3: Commit du test seul (rouge assumé)**

```bash
git add tests/e2e/debordements.spec.ts
git commit -m "test(e2e): mesurer les textes coupés au lieu de les deviner — rouge attendu"
```

---

### Task 2: Les tuiles de statistiques (Tableau de bord + Statistiques)

**Files:**
- Modify: `components/dashboard/DashView.tsx:142-153`
- Modify: la vue Statistiques si ses tuiles sont un composant distinct (chercher `text-[8.5px]` dans `components/stats/` ; si c'est le même composant partagé, un seul point de correction)
- Test: `tests/e2e/debordements.spec.ts` (Task 1)

**Interfaces:**
- Consumes: le test de Task 1.
- Produces: rien de nouveau — correction pure.

- [ ] **Step 1: Vérifier où vivent les tuiles des deux vues**

Run: `grep -rn "text-\[8.5px\]" components/`
Expected: les occurrences exactes. Si Dash et Stats dupliquent le même bloc, les corriger TOUTES — le test de Task 1 couvre les deux vues et le dira de toute façon.

- [ ] **Step 2: Corriger le libellé et la valeur**

Dans `DashView.tsx` (et ses jumeaux trouvés au Step 1), remplacer :

```tsx
<div
  className="font-mono text-[8.5px] tracking-[0.18em] uppercase"
  style={{ color: 'var(--txt2)' }}
>
  {c.libelle}
</div>
<div data-testid={`compteur-${c.cle}`} className="mt-1 font-mono text-[20px] font-bold">
  {c.valeur}
</div>
```

par :

```tsx
{/* L'interlettrage de 0.18em rendait le seul mot « prioritaires » plus large
    (80 px) que la tuile de 360 px (62 px) : un mot insécable qui ne tient pas
    DÉBORDE, il ne passe pas à la ligne. Sous 480 px l'interlettrage se
    resserre et le retour à la ligne est permis ; au-delà, rien ne change —
    le rendu y était bon, et les captures de recette ne doivent pas bouger. */}
<div
  className="font-mono text-[8.5px] leading-[1.5] tracking-[0.08em] uppercase min-[480px]:tracking-[0.18em]"
  style={{ color: 'var(--txt2)' }}
>
  {c.libelle}
</div>
{/* La valeur est UNE grandeur — « 4 h 36 » cassé en trois lignes se lit
    « 4 h » puis « 36 », deux nombres qui n'existent pas. */}
<div
  data-testid={`compteur-${c.cle}`}
  className="mt-1 font-mono text-[20px] font-bold whitespace-nowrap"
>
  {c.valeur}
</div>
```

- [ ] **Step 3: Vérifier au test**

Run: `CI=1 npx playwright test tests/e2e/debordements.spec.ts --project=desktop -g "app à 360|app à 390|stats"`
Expected: PASS sur `/app` et `/app/stats` à toutes largeurs. Si « prioritaires » déborde ENCORE à 360 px malgré l'interlettrage réduit, réduire à `tracking-[0.04em]` avant d'envisager une taille de police plus petite — l'interlettrage est décoratif, la taille est de la lisibilité.

- [ ] **Step 4: Mutation — remettre `tracking-[0.18em]` sans le `min-[480px]:`, relancer, vérifier que le test TOMBE, restaurer**

- [ ] **Step 5: Contrôle visuel ≥ 768 px inchangé**

Run: `CI=1 npx playwright test tests/e2e/visual --project=desktop`
Expected: PASS sans mise à jour de capture. Une capture qui bouge = le correctif a fui hors de son périmètre.

- [ ] **Step 6: Commit**

```bash
git add components/
git commit -m "fix(ui): les libellés de tuile tiennent dans leur tuile, la valeur est insécable"
```

---

### Task 3: La ligne d'Aujourd'hui à 360 px

**Files:**
- Modify: `components/today/RowShell.tsx:75-115` (à confirmer par le diagnostic)
- Test: `tests/e2e/debordements.spec.ts`

**Interfaces:**
- Consumes: le test de Task 1.
- Produces: rien de nouveau — correction pure.

- [ ] **Step 1: DIAGNOSTIC AVANT CORRECTIF (règle du dépôt)**

Le relevé dit : conteneur central à 36 px pour un contenu de 59 px. Hypothèse : les voisins insécables (quantité `whitespace-nowrap` + jauge) prennent toute la place, et la jauge censée disparaître « quand la place manque » (commentaire existant dans `RowShell.tsx`) ne disparaît pas à 360 px. Vérifier :

Run: `grep -n "hidden\|min-\[" components/today/RowShell.tsx`
Expected: identifier le seuil actuel de la jauge (probablement `max-[…]:hidden` ou l'inverse). Noter le seuil mesuré : à 360 px, glyphe (30) + espaces + quantité (~70) + jauge (~90) ne laissent que ~36 px au centre — le seuil doit englober 360.

- [ ] **Step 2: Corriger — le titre peut se couper proprement, la jauge disparaît plus tôt**

Sur le `span` du titre dans `RowShell.tsx`, ajouter la possibilité de passer à la ligne sans déborder :

```tsx
<span
  data-name
  className="min-w-0 text-[13.5px] font-medium break-words"
  style={{
    color: done ? 'var(--mut)' : 'var(--txt)',
    textDecoration: done ? 'line-through' : 'none',
  }}
>
  {name}
</span>
```

et abaisser le seuil de disparition de la jauge pour couvrir 360 px (la classe exacte dépend du Step 1 — l'intention : sous 400 px, la jauge cède la place, la quantité reste, conformément au commentaire déjà présent : « la quantité EST l'information de la ligne »).

- [ ] **Step 3: Vérifier au test, puis mutation (remettre l'ancien seuil → le test tombe), puis restaurer**

Run: `CI=1 npx playwright test tests/e2e/debordements.spec.ts -g "today"`
Expected: PASS aux cinq largeurs.

- [ ] **Step 4: Commit**

```bash
git add components/today/
git commit -m "fix(ui): à 360 px la jauge cède la place — le titre et la pastille respirent"
```

---

### Task 4: L'élément fantôme du Calendrier

**Files:**
- Modify: à déterminer par le diagnostic (`components/calendar/`)

**Interfaces:**
- Consumes: rien.
- Produces: soit un correctif, soit une exclusion DOCUMENTÉE dans `tests/e2e/debordements.spec.ts`.

- [ ] **Step 1: Identifier l'élément**

Un `div` vide à −344 px à gauche de son parent, présent à toutes les largeurs sur `/app/calendar`. Repérer avec :

Run: `CI=1 npx playwright test` — ou plus direct, dans une session Playwright jetable : relever `document.querySelectorAll('main div')` dont `getBoundingClientRect().right < 0`, remonter à son parent nommé.
Expected: un composant précis de `components/calendar/`.

- [ ] **Step 2: Trancher — défaut ou artefact voulu**

Deux issues possibles, une seule autorisée à la fois :
- défaut réel (élément mal positionné) → le corriger, et l'ajouter aux vues couvertes par `debordements.spec.ts` ;
- artefact voulu (ex. : ligne « maintenant » hors du jour affiché, couche de glisser-déposer) → le documenter d'un commentaire à l'endroit où il naît, et NE PAS l'exclure du test en douce : l'exclusion, si nécessaire, se fait par `aria-hidden="true"` sur l'élément — ce qui est vrai pour un élément purement décoratif — jamais par une règle spéciale dans le test.

- [ ] **Step 3: Commit selon l'issue**

```bash
git add components/calendar/ tests/e2e/
git commit -m "fix(calendar): l'élément hors écran est <corrigé|documenté et marqué décoratif>"
```

---

### Task 5: Le crayon sur les cartes d'habitude

**Files:**
- Modify: `components/habits/HabitCard.tsx:39-50`
- Test: `tests/e2e/vue-habits.spec.ts`

**Interfaces:**
- Consumes: `openEditor({ kind: 'habit', id })` (existant, déjà importé dans `HabitCard.tsx:25`) ; la clé de libellé `app.editFor` (« Modifier {name} » / « Edit {name} »), qui existe déjà — `messages/fr.json:107`, `messages/en.json:107`. **Aucune clé nouvelle n'est nécessaire.**
- Produces: un bouton nommé « Modifier <nom de l'habitude> », donc adressable par `getByRole('button', { name: /Modifier/ })`.

- [ ] **Step 1: Test e2e d'abord**

Dans `tests/e2e/vue-habits.spec.ts`, ajouter (adapter les imports d'assistants à ceux déjà en tête du fichier) :

```ts
test('le crayon ouvre l’éditeur — l’édition cesse d’être un secret', async ({ page }) => {
  await ouvrirAvecDemo(page, '/app/habits');
  await attendreHydratation(page);

  /* Le nom cliquable existait déjà (HabitCard.tsx:45) ; rien ne le signalait.
     Le crayon rend l'action VISIBLE, du même dessin que Work et Tâches.
     Le nom de l'habitude est dans le libellé du bouton — c'est ce que fait
     déjà ProjectCard, et c'est ce qui distingue les crayons entre eux pour
     un lecteur d'écran. */
  await page.getByRole('button', { name: /^Modifier / }).first().click();

  await expect(page.getByRole('dialog')).toBeVisible();
});
```

Run: `CI=1 npx playwright test tests/e2e/vue-habits.spec.ts -g "crayon"`
Expected: FAIL — le bouton n'existe pas.

- [ ] **Step 2: Le bouton, au dessin EXACT de Work**

Relevé dans `components/work/ProjectCard.tsx:61-69` — ce sont ces classes-là qui font foi, la cohérence entre onglets étant le but de la tâche. Dans `HabitCard.tsx`, ajouter `import { Pencil } from 'lucide-react';` puis, à droite de l'en-tête de carte :

```tsx
<button
  type="button"
  onClick={() => openEditor({ kind: 'habit', id: habit.id })}
  aria-label={t('editFor', { name: habit.name })}
  className="rounded-btn-sm grid h-7 w-7 flex-none cursor-pointer place-items-center border"
  style={{ borderColor: 'var(--line)', color: 'var(--mut)' }}
>
  <Pencil size={12} aria-hidden="true" />
</button>
```

Vérifier que le `t` du fichier pointe bien sur l'espace de noms qui contient `editFor` (`useTranslations('app')`) ; sinon utiliser le bon.

Le titre-bouton existant N'EST PAS retiré : on ajoute une affordance, on ne déplace pas un geste que des utilisateurs ont pu apprendre.

- [ ] **Step 3: Vérifier, puis recette de la vue**

Run: `CI=1 npx playwright test tests/e2e/vue-habits.spec.ts`
Expected: PASS intégral, y compris « accessible » (le bouton a un nom) et « sans débordement horizontal ».

- [ ] **Step 4: Commit**

```bash
git add components/habits/ tests/e2e/vue-habits.spec.ts
git commit -m "feat(habits): un crayon sur la carte — l'édition existait, elle est maintenant visible"
```

---

### Task 6: La date coupée — vérifier avant de corriger

**Files:**
- Aucun a priori.

- [ ] **Step 1: Reproduire — ou constater que c'est déjà corrigé**

La capture utilisateur montre « 2026-08- / 31 » coupé en pleine date, or `TaskItem.tsx:75` porte déjà `whitespace-nowrap` par segment et un commentaire de correctif antérieur. Sur le build COURANT :

Run: `CI=1 npx playwright test tests/e2e/debordements.spec.ts -g "today"` puis contrôle manuel de `/app/tasks` à 390 px avec une tâche à catégorie longue + heure + date.
Expected: pas de coupe. Si coupe il y a : c'est un défaut réel → l'ajouter aux vues de `debordements.spec.ts` et corriger dans `TaskItem.tsx` (la césure au trait d'union se neutralise sur le segment de date). Si pas de coupe : consigner au CHANGELOG que la capture venait de l'ancien APK, et NE RIEN « corriger » — un correctif sans défaut reproduit est du bruit.

---

### Task 7: Clôture du lot

- [ ] **Step 1: Vérification complète**

Run: `npm run verify` puis `CI=1 npx playwright test`
Expected: tout vert, desktop et mobile. Les échecs de contention connus (tests lourds sous charge parallèle) se rejouent seuls avant d'être imputés au lot.

- [ ] **Step 2: CHANGELOG**

Une entrée datée : les six défauts, la méthode (mesure, pas devinette), le sort du n°4 (corrigé ou documenté) et du n°6 (reproduit ou imputé à l'ancien APK), et le verrou de non-régression.

- [ ] **Step 3: Commit final**

```bash
git add CHANGELOG.md
git commit -m "docs: lot A — six défauts d'affichage, mesurés, corrigés, verrouillés"
```
