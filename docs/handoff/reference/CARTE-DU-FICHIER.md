# Carte du fichier `Habitum.dc.html`

3940 lignes. Table de navigation — **à régénérer après toute édition importante** (elle s'est
périmée deux fois : les numéros bougent à chaque insertion). Relevé le 5 août 2026, après revue.

## Structure générale

| Lignes | Contenu |
|---|---|
| 1–9 | Enveloppe du document, chargement de `support.js` |
| 10–86 | `<helmet>` : polices, **tokens des 3 thèmes**, resets, ~45 `@keyframes`, requêtes média (**mouvement réduit**, **badge démo sous 1200 px**, **palier 767 px**) |
| 87–1612 | **Template** (markup) |
| 1613 | Balise de script + `data-props` (`accent`, `startTheme`, `startLang`, `showRail`) |
| 1614–3938 | **Classe de logique** `Component extends DCLogic` |

## Template

| Section | Repère |
|---|---|
| Écran de démarrage (`data-boot`), curseur, coquille (`data-app`, `data-side`, `data-topbar`) | début |
| En-tête : titre, sous-titre, badge `data-demo-txt` / `data-demo-mark` | `data-topbar` |
| Vue `dash` — tableau de bord ; **bandeau de rappel d'export** (`data-nag`) en tête | `v.dash` |
| Vues `today`, `habits`, `tasks`, `goals` | `sc-if` correspondants |
| Vue `cal` — orbite, mois, semaine, jour, agenda | `cal.m.*` |
| Vues `stats`, `timer`, `notes`, `profile`, `settings` | `sc-if` correspondants |
| Éditeur 4 onglets (`data-ed-panel`), tiroir d'actions, palette `⌘K` | fin |
| **Région annoncée** aux lecteurs d'écran (`srView`), puis toasts | avant-dernier bloc |

## Logique

| Lignes | Section |
|---|---|
| 1615–1642 | `CAT`, `HB0`, `OBJ0`, `GLYPHS`, `AVA`, `HUES` |
| 1643–1771 | `PL` (profil) et les fonctions de profil, dont `profVals` |
| 1772–1815 | `L2` — libellés ajoutés aux lots 1 à 6 |
| 1816–1857 | `L` — libellés de l'application |
| 1858–1893 | `EL` — libellés de l'éditeur |
| **1894–1913** | **Constantes nommées** (`SV`, `LS_*`, `NMAT`, `NBEST`, `NAG_DAYS`, `TOAST_MS`, `BP_TABLET`, `POMO`…) — ⚠ **doivent rester avant la ligne suivante** |
| **1914** | `state = this.seed()` — ⚠ **tout champ utilisé par `seed()` se déclare AVANT** |
| 1945–1995 | **`seed()`** — état initial, lecture du stockage, migrations `v<2`…`v<5` |
| 1996–2042 | **`persist()`** (écriture découpée), sauvegarde de secours, restauration |
| 2043–2151 | **`validateImport()`** — ⚠ listes blanches : 7 types d'objectif d'habitude, 3 pour les objectifs |
| 2152–2266 | **`memo()`** — cache de rendu à invalidation fine, planification, complétion |
| 2267–2314 | **`best()`** — cache persistant du record, `pct`, `sumVal`, `dayRatio`, `focusMin` |
| 2315–2857 | `dayTitle` (mention « démo »), mutations, éditeur, fabriques de style, recherche, objectifs |
| 2858–2922 | `coreVals()` — valeurs partagées coquille / profil |
| 2923–3365 | `renderVals()` : navigation, vues, modales, `srView`, badge `demo`, cycle de vie, timer |
| 3366–3543 | `nagVals()` (rappel d'export), `freqLabel`, `dayItems`, `laneOut`, glisser-déposer |
| 3544–3556 | **`vals2()`** — compose seulement les 8 fonctions ci-dessous |
| 3557–3586 | `habitVals()` → `habitCards` |
| 3587–3620 | `taskVals()` → `taskGroups`, `shop`, `lists` |
| 3621–3678 | `goalVals()` → `goals`, `objDraft` |
| 3679–3773 | `calVals()` → `cal` (**liste sous 768 px**, D6) |
| 3774–3824 | `statVals()` → `stats` |
| 3825–3860 | `timerVals()` → `timer` |
| 3861–3902 | `noteVals()` → `notes` |
| 3903–3929 | `settingVals()` → `settings` |
| 3930–3938 | `doAdd()` |

## Trois pièges déjà payés

1. **Ordre d'initialisation.** `state = this.seed()` (ligne 1914) est un champ de classe : tout
   champ qu'il lit doit être déclaré avant, sinon il vaut `undefined`. C'a cassé toute la
   restauration du stockage pendant trois lots.
2. **Listes blanches de `validateImport()`** (ligne 2043). Un type oublié fait disparaître des
   données à l'import, sans un mot : sept types d'objectif d'habitude, trois pour les objectifs.
3. **Un élément à largeur fixe dans l'en-tête** vole la place du titre et du sous-titre, y compris
   au-dessus de 1060 px. Tout ajout dans `data-topbar` doit se réduire sous 1200 px.

Les deux premiers sont verrouillés par `tests/domain.test.html`, le troisième se voit dans
`tests/responsive.html`.

## Points d'entrée les plus fréquents

- Ajouter un libellé → `L` (1816), `EL` (1858), `PL` (1643) ou `L2` (1772), **dans les deux langues**.
- Changer une couleur → tokens du helmet, jamais en dur dans le template.
- Toucher une métrique → 2152–2315, puis relancer `tests/domain.test.html` (six contrôles).
- Ajouter une vue → template (nouvelle `sc-if`), `nav` / `v` dans `renderVals()`, puis une fonction
  `…Vals()` dédiée référencée par `vals2()`.
- Modifier la persistance → `seed` (1945) **et** `persist` (1996), toujours de pair, plus les
  constantes `LS_*` (1894).
- Régler un nombre → bloc des constantes nommées (1894), jamais en dur.
- Toucher au responsive → `layVals` et les requêtes média du helmet **uniquement** ; vérifier avec
  `tests/responsive.html`. Le rendu ≥ 1060 px est la référence.
