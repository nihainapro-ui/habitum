# 09 — Plan d'amélioration du projet existant (non destructif)

Portée : améliorer, optimiser et renforcer **le projet tel qu'il existe aujourd'hui**
(`Habitum.dc.html`, organisation du dépôt, documentation) — **sans remplacer ni modifier les
fonctionnalités opérationnelles**. Ce document est distinct de `02-ROADMAP.md` / `06-BACKLOG.md`,
qui décrivent le portage vers un dépôt de production.

## État d'avancement (5 août 2026)

**Les 6 lots sont livrés.** Détail dans `CHANGELOG.md` à la racine.

| Tâche | État |
|---|---|
| `G1` harnais de test sans build | ✅ `tests/domain.test.html` |
| `G2` valeurs de référence | ✅ `tests/golden.json` — 62 mesures, **62/62 conformes** |
| `A1` validation d'import | ✅ `validateImport()` |
| `A2` import et réinitialisation annulables | ✅ |
| `A3` sauvegarde automatique + restauration | ✅ `habitum.state.bak` + ligne dans les réglages |
| `A4` échec d'écriture remonté | ✅ |
| `A5` libellé « Sauvegarde locale » | ✅ |
| `A6` drapeau `demo` | ✅ |
| `A7` revue d'injection | ✅ aucune surface (`innerHTML`, `eval`, `new Function` : néant) |
| `E1` minutes de focus réelles | ✅ |
| `E2` journal sans faux contenu | ✅ (règle aussi `B2`) |
| `E3` inventaire des usages de `rnd()` | ✅ 2 usages, tous deux légitimes ou neutralisés |
| `D1` états vides Notes / Focus / Statistiques | ✅ (Habitudes / Tâches / Objectifs / Agenda existaient) |
| `B2` faux journaux générés par rendu | ✅ supprimé avec `E2` |
| `C5` constantes magiques | ✅ bloc complet (`LS_*`, `NMAT`, `NBEST`, `NSTREAK`, `TOAST_MS`, `BP_TABLET`, `POMO`…) |
| `B1` cache persistant du record | ✅ `habitum.best`, signature par habitude |
| `B3` invalidation fine du cache | ✅ + repli `cfg.fastCache=false` + test dédié |
| `B4` matérialisation en temps mort | ✅ `requestIdleCallback` |
| `B5` écriture découpée | ✅ `habitum.state.big` (`split:1`) |
| `C1` découpage de `vals2()` | ✅ 8 fonctions, contrat de sortie inscrit |
| `C4` état mort `vault` | ✅ supprimé |
| `C6` contrat des fonctions du domaine | ✅ JSDoc (`@ts-check` écarté, voir CHANGELOG) |
| `C7` clés persistées documentées | ✅ `03-ARCHITECTURE.md` § Clés d'état persistées |
| `C2` fabrique `panelSt()` | ⛔ écartée — casserait la peinture progressive (voir CHANGELOG) |
| `C3` i18n externalisée | ⛔ écartée — libellés absents au premier rendu (tâche du portage) |

**Correction non planifiée trouvée en route :** `SV` valait `4` alors que la dernière migration est
`v<5` — la migration se rejouait à chaque chargement et relançait `materialize()` (180 j × N
habitudes) à chaque ouverture. Corrigé (`SV=5`).

**Deux corrections non planifiées trouvées au lot 3 :** les minutes de focus n'étaient jamais
invalidées (`memo()` ne surveillait pas `sessions`), et la réinitialisation ne supprimait qu'une
des clés de stockage.

### Lots 5 et 6

| Tâche | État |
|---|---|
| `D2` curseur désactivé par défaut | ✅ |
| `D3` région `aria-live`, changement de vue annoncé | ✅ |
| `D4` confirmation avant suppression d'un profil | ✅ |
| `D5` retour d'échec visible (export inclus) | ✅ |
| `D6` palier 768 px (calendrier en liste, éditeur plein écran) | ✅ rendu ≥ 1060 px intouché |
| `D7` `prefers-reduced-motion` : démarrage et curseur | ✅ |
| `D8` rappel d'export après 30 jours | ✅ refusable, une seule fois |
| `B6` flou allégé | ✅ retiré des 5 panneaux en boucle, 12 px ailleurs |
| `B7` heatmap en canvas | ✅ vérifié : 182 et 84 cellules < 400, le DOM reste le bon choix |
| `F3` captures rangées et légendées | ✅ `assets/references/habitnow/` |
| `F4` orphelin supprimé | ✅ |
| `F5` gabarit déplacé | ✅ `docs/references/landing-modernist/` (+ `ds-base.js` repointé) |
| `F6` `.gitignore`, `LICENSE`, `CHANGELOG` | ✅ |
| `G3` checklist de recette | ✅ `tests/RECETTE.md` |
| `G4` non-régression visuelle | ✅ `tests/visual/reference/` (11 captures + protocole) |
| `H3` journal de décisions | ✅ `docs/adr/` (5 fiches) |
| `H4` clés d'état documentées | ✅ (lot 4) |
| `H5` `CHANGELOG` alimenté | ✅ à chaque lot |
| `F2` passation sous `docs/handoff/` | ⛔ écartée — le dossier porte son propre `CLAUDE.md` (voir CHANGELOG) |

**Deux corrections non planifiées trouvées au lot 5 :** `exportJSON()` n'avait aucun `try/catch`
(un échec restait muet), et le curseur animé laissait un anneau figé en haut à gauche quand la
préférence « mouvement réduit » coupait sa boucle.

### Finalisation (5 août 2026) — le plan est clos

| Tâche | État |
|---|---|
| `B1` décision du système visuel | ✅ **tranchée** — option (c), `Vitrine Habitum.dc.html` livrée |
| `B4` démo discernable du réel | ✅ badge dans l'en-tête + mention « démo » sur les jours passés |
| `B5` `state.timer` persisté | ✅ restauré en pause, écoulé conservé |
| `B6` migrations testées | ✅ les quatre, plus le cas « déjà à jour » |
| `D6` vérifié à la vraie largeur | ✅ `tests/responsive.html` — 0 débordement à 390 / 768 / 1060 / 1440 px |

**Trois défauts réels trouvés en finalisant**, tous invisibles pour les valeurs de référence :
la restauration du stockage était **cassée** depuis le lot 3 (constante de clé déclarée après
`state = this.seed()`), `validateImport()` rejetait 4 des 6 habitudes de notre propre export
(types d'objectif `count` et `time` absents de la liste blanche, `milestones` idem pour les
objectifs), et l'en-tête débordait de 54 px sur téléphone. Corrigés et verrouillés par des tests.

**Il ne reste aucune tâche de ce plan.** Ce qui subsiste appartient au portage :
`03-ARCHITECTURE.md` et `06-BACKLOG.md`.

---

## Ligne rouge — ce qui ne doit PAS être touché

Ces éléments fonctionnent et portent la valeur du produit. **Aucune réécriture, aucune
« amélioration » d'opportunité :**

- `sched_`, `isDone_`, `tgt`, `streak_`, `best_`, `pct_`, `sumVal_`, `dayRatio_` (comportement) ;
- les helpers de date (`today`, `add`, `key`, `dow`, `cur`, `dkey`, `tdate`, `toff`, `soff`, `dnum`) ;
- les migrations `v<2` → `v<5` de `seed()` ;
- le mécanisme d'annulation `snapshot()` / `notify()` / `undoLast()` ;
- l'ancrage horloge du timer (`t0`, `elNow`, `startTick`) — **déjà correct** ;
- le glisser-déposer du calendrier ;
- la palette `⌘K`, les raccourcis, le piège de focus ;
- les 3 thèmes et leurs valeurs de tokens ;
- les 271 clés de libellés FR/EN (contenu figé).

Toute tâche ci-dessous est **additive ou interne** : mêmes entrées, mêmes sorties observables.

---

## Phase A — Sécurité et intégrité des données · **Critique**

**Objectifs :** rendre impossible la perte ou la corruption silencieuse des données de
l'utilisateur ; ne jamais faire confiance à un fichier importé.

| Id | Tâche | Fichiers / lignes | Risque | Résultat attendu |
|---|---|---|---|---|
| **A1** | Valider l'import JSON avant application : forme des entités, types, taille max (2 Mo), clés inconnues ignorées ; rapport « n lues / n appliquées / n rejetées » | `Habitum.dc.html` — `onImport` (≈ L1666–1675) | Refuser un fichier légitime → prévoir un mode tolérant qui applique ce qui est valide et liste le reste | Un fichier corrompu ne peut plus écraser l'état ; message explicite |
| **A2** | Prendre un `snapshot()` avant import et avant réinitialisation → toast **Annuler** | `onImport`, `resetAll` (≈ L2938–2943) | Aucun (le mécanisme existe déjà) | Import et réinitialisation deviennent réversibles |
| **A3** | Sauvegarde automatique avant toute opération destructrice (téléchargement JSON silencieux ou copie sous `habitum.state.bak`) | `persist`, `resetAll`, `onImport` | Doubler l'occupation du quota → ne garder qu'une génération | Une copie de secours existe toujours |
| **A4** | Remonter l'échec d'écriture : le `catch` de `persist()` est **muet** ; en cas de quota dépassé l'utilisateur croit être sauvegardé | `persist` (L1822–1825) | Aucun | Toast d'alerte + invitation à exporter |
| **A5** | Clarifier `cfg.cloud` : ce réglage **désactive la persistance locale** sous un nom trompeur | libellés `L.fr/en`, `settings` (≈ L3424) | Aucun (changement de libellé) | Plus de perte de données par méprise |
| **A6** | Marquer les données de démonstration (`demo:true` additif) pour ne jamais les confondre avec du réel | `demoData`, `materialize` | Aucun si le drapeau est ignoré par le reste du code | Distinction démo / réel tracée |
| **A7** | Revue d'injection : vérifier qu'aucun contenu utilisateur (notes, noms) n'atteint un rendu HTML brut | `Habitum.dc.html` (grep `innerHTML`) | Aucun | Confirmation écrite : aucun `innerHTML`, tout passe par du texte React |

---

## Phase B — Performances · **Haute**

**Objectifs :** supprimer les recalculs inutiles sans changer un seul résultat affiché.
Méthode obligatoire : **figer les valeurs actuelles du jeu de démo avant/après** (voir G3).

| Id | Tâche | Fichiers / lignes | Risque | Résultat attendu |
|---|---|---|---|---|
| **B1** | `best_()` balaie 366 jours × N habitudes ; le mettre en cache persistant par habitude, invalidé sur écriture de journal de cette habitude | `best`, `best_` (L1911–1916) | Cache périmé → clé d'invalidation = `habitId` + dernière date modifiée | Rendu des vues `habits`/`stats` divisé par 5 à 10 |
| **B2** | `journalSeed()` est appelé jusqu'à **160 fois par rendu** dans la recherche de notes | `notes` (L3388–3392) | Aucun (voir aussi E2 qui le supprime) | Vue `notes` instantanée à la saisie |
| **B3** | `memo()` invalide **tout** dès qu'une habitude ou une entrée de journal change → recalcul complet à chaque case cochée. Passer à une invalidation par habitude et par date | `memo` (L1855–1861) | Le plus risqué du plan : une invalidation trop fine affiche une valeur périmée → livrer avec les tests G3 et un interrupteur de repli | Clic sur une case < 16 ms au lieu de recalcul global |
| **B4** | `materialize()` écrit 180 j × N habitudes dans `ov` puis persiste ; l'exécuter en `requestIdleCallback` et n'écrire que les jours planifiés | `materialize` (L1833–1847) | Décalage visible au premier chargement → n'écrire le jour courant qu'en synchrone | Démarrage plus rapide, `localStorage` plus léger |
| **B5** | `persist()` sérialise tout l'état (dont des milliers de clés `ov`) ; le debounce de 400 ms existe déjà ✅ — ajouter un découpage : clés volumineuses (`ov`, `notes`) écrites séparément des petites (`cfg`, `lang`, `theme`) | `persist` (L1822), `componentDidUpdate` (L2875) | Deux clés à migrer → conserver la lecture de l'ancienne clé | Écriture 10× plus légère sur un changement de réglage |
| **B6** | `backdrop-filter: blur(20px)` répété sur des panneaux imbriqués et dans des listes | template, `<style>` du helmet | Léger écart visuel → limiter aux panneaux de premier niveau uniquement | Défilement fluide sur machine modeste |
| **B7** | Heatmap : au-delà de ~400 cellules, passer en `<canvas>` (option, pas obligatoire) | `stats` (L3307+) | Perte du survol par élément → conserver le DOM si < 400 | Rendu stable sur la fenêtre 365 j |

---

## Phase C — Qualité et maintenabilité du code · **Haute**

**Objectifs :** rendre les 3 451 lignes navigables et modifiables sans risque. **Aucune sortie ne
change** : ce sont des déplacements et des factorisations.

| Id | Tâche | Fichiers / lignes | Risque | Résultat attendu |
|---|---|---|---|---|
| **C1** | Découper `vals2()` (≈ 340 lignes, 8 domaines) en `habitVals`, `taskVals`, `goalVals`, `calVals`, `statVals`, `timerVals`, `noteVals`, `settingVals` — le précédent existe déjà (`profVals`, `coreVals`) | L3110–3451 | Oubli d'une clé retournée → comparer les clés de l'objet final avant/après | Chaque vue modifiable isolément |
| **C2** | Factoriser le panneau « verre » répété ~20 fois en une fabrique `panelSt()` | template + `style factories` (L2139+) | Écart visuel si un panneau avait une variante → relever les variantes d'abord | −150 lignes de style dupliqué |
| **C3** | Externaliser les dictionnaires `L`, `EL`, `PL` dans un module `habitum-i18n.js` chargé par le composant | L1579–1757 → nouveau fichier | Chargement asynchrone → garder un repli minimal intégré | Fichier principal allégé de ~180 lignes très denses |
| **C4** | Supprimer l'état mort : `vault:{}` est initialisé et **persisté mais jamais lu** | L1794, `persist` (L1824), `seed` (L1803) | Vérifier l'absence totale de lecture avant retrait | Moins d'état à comprendre |
| **C5** | Nommer les constantes magiques : 180 (matérialisation), 366 (record), 400 (debounce), 25/5/15 (pomodoro), 6000 (toast), 1060 (seuil tablette), 160 (fenêtre de recherche) | ensemble du fichier | Aucun | Intentions lisibles, réglages centralisés |
| **C6** | Ajouter `// @ts-check` + annotations JSDoc sur les fonctions pures du domaine | bloc L1826–1952 | Bruit d'erreurs au démarrage → traiter fichier par bloc | Typage sans build, erreurs détectées dans l'éditeur |
| **C7** | Uniformiser les noms : `ov`/`obj`/`occ`/`tt`/`nq`/`nsel` sont opaques → conserver les clés persistées mais documenter chacune en une ligne | `03-ARCHITECTURE.md`, commentaires | Renommer casserait la persistance → **ne pas renommer**, documenter | Lecture immédiate par un nouvel arrivant |

---

## Phase D — Expérience utilisateur et accessibilité · **Haute**

**Objectifs :** aucune promesse d'interface non tenue, aucune impasse, utilisable au clavier.

| Id | Tâche | Fichiers / lignes | Risque | Résultat attendu |
|---|---|---|---|---|
| **D1** | Compléter les états vides : `habits` sans habitude, `tasks` sans tâche, `stats` sans historique, `notes` sans entrée, `timer` sans session (les états `emGoalsT` / `emAgendaT` servent de modèle) | template, libellés `L` | Aucun (additif) | Aucun écran vide non expliqué |
| **D2** | Curseur personnalisé désactivé par défaut (`cfg.cursor:false`) ; il masque le pointeur système | `seed` (L1797), `[data-cursor=on]` (helmet) | Perte d'effet « signature » → laisser l'option activable | Accessibilité et confort par défaut |
| **D3** | Toasts dans une région `aria-live="polite"` ; annoncer le changement de vue | template (toast), coquille | Aucun | Lecteur d'écran informé |
| **D4** | Confirmation avant suppression d'un profil (la réinitialisation l'a déjà, la suppression de profil non) | `profVals` (L1661–1663) | Aucun | Plus de suppression accidentelle |
| **D5** | Retour d'échec visible : import invalide, quota plein, permission refusée | avec A1, A4 | Aucun | L'utilisateur sait toujours ce qui s'est passé |
| **D6** | Palier responsive 768 px : calendrier semaine/jour en liste, éditeur en feuille plein écran. **Ne pas toucher au rendu ≥ 1060 px** | `navSt`/`navBot` (L2140+), vues `cal`, éditeur | Régression desktop → travailler uniquement dans des requêtes média/branches `vw<768` | Utilisable sur téléphone sans casser le poste de travail |
| **D7** | `prefers-reduced-motion` : neutraliser aussi l'écran de démarrage (1,9 s) et le curseur animé | helmet (L~60) | Aucun | Conformité réelle de la préférence système |
| **D8** | Ajouter un rappel d'export : si aucune sauvegarde depuis 30 jours, bandeau discret | `settings`, `persist` | Perçu comme intrusif → une seule fois, dismissible | Risque de perte de données réduit |

---

## Phase E — Sincérité des données affichées · **Haute**

**Objectifs :** aucun chiffre ni texte inventé présenté comme réel. C'est le défaut de crédibilité
le plus visible du prototype.

| Id | Tâche | Fichiers / lignes | Risque | Résultat attendu |
|---|---|---|---|---|
| **E1** | `focusMin_()` fabrique les minutes de focus par hachage (`rnd('f'+date)`) → agréger les `sessions` réelles, 0 si aucune | `focusMin_` (L1937–1941), `dash`, `stats` | Les écrans paraîtront plus vides → livrer avec D1 | Statistiques de focus vraies |
| **E2** | `journalSeed()` génère un faux journal pour les jours sans note → retourner une chaîne vide | `journalSeed`, `notes` (L3387–3392) | Idem : livrer avec D1 ; améliore aussi B2 | Le journal ne contient que ce que l'utilisateur a écrit |
| **E3** | Contrôler tous les autres usages de `rnd()` et distinguer « décor » (accepté) de « donnée » (interdit) | `rnd` (L1854) + appels | Aucun | Inventaire écrit des usages légitimes |

---

## Phase F — Organisation des fichiers et dossiers · **Moyenne**

**Objectifs :** un dépôt dont la structure s'explique d'elle-même. Opérations de déplacement pur.

| Id | Tâche | Fichiers | Risque | Résultat attendu |
|---|---|---|---|---|
| **F1** | Créer `README.md` et `CLAUDE.md` **à la racine** (fait) | racine | Aucun | Point d'entrée immédiat |
| **F2** | Regrouper la documentation : `docs/handoff/` ← `design_handoff_habitum/` | dossier | Rompre les liens internes → mettre à jour les renvois relatifs | Racine lisible |
| **F3** | Ranger les 12 captures HabitNow de `uploads/` en `assets/references/habitnow/` avec un `index.md` légendé | `uploads/*.webp` | `uploads/` est un espace de dépôt utilisateur → **copier**, ne pas déplacer | Références visuelles exploitables |
| **F4** | Supprimer l'orphelin `screenshots/cal-week.png` (ou le légender s'il documente une vue) | `screenshots/` | Aucun (aucun code ne le référence) | Plus de fichier inexpliqué |
| **F5** | Déplacer `reference-landing-modernist/` sous `docs/references/landing-modernist/` | dossier | Le gabarit référence `_ds/…` en relatif → vérifier `ds-base.js` après déplacement | Distinction claire app / références |
| **F6** | Ajouter `.gitignore`, `LICENSE` et `CHANGELOG.md` en prévision du dépôt | racine | Aucun | Dépôt prêt à initialiser |

---

## Phase G — Tests · **Moyenne**

**Objectifs :** pouvoir modifier le moteur sans crainte, **sans introduire de chaîne de build**.

| Id | Tâche | Fichiers | Risque | Résultat attendu |
|---|---|---|---|---|
| **G1** | Harnais de test sans build : une page `tests/domain.test.html` qui charge les fonctions pures et affiche les assertions en vert/rouge | nouveau `tests/` | Duplication du code testé → charger depuis un module partagé | Tests exécutables par simple ouverture du fichier |
| **G2** | **Valeurs de référence (golden values)** : figer les métriques du jeu de démo (série, record, taux 30 j, journées parfaites, ratio par jour sur 30 jours) | `tests/golden.json` | Dépendance à la date du jour → figer une date de référence injectable | Toute régression de calcul détectée immédiatement — **prérequis des phases B et C** |
| **G3** | Checklist de recette manuelle : 11 vues × 3 thèmes × 2 langues + 8 parcours critiques | `tests/RECETTE.md` | Aucun | Recette reproductible avant chaque livraison |
| **G4** | Test de non-régression visuelle léger : captures de référence des 11 vues | `tests/visual/` | Rendu dépendant de la machine → tolérance de diff | Écarts visuels repérés à l'œil en une passe |

---

## Phase H — Documentation et reprise dans Claude Code · **Moyenne**

| Id | Tâche | Fichiers | Risque | Résultat attendu |
|---|---|---|---|---|
| **H1** | `CLAUDE.md` racine (fait) | racine | Aucun | Règles projet chargées à chaque session |
| **H2** | **Carte du fichier** : table « plage de lignes → section » de `Habitum.dc.html` (fait : `reference/CARTE-DU-FICHIER.md`) | `reference/` | Se périme à chaque édition → régénérer à chaque livraison | Navigation directe dans 3 451 lignes |
| **H3** | Journal de décisions (ADR) : DC unique, local-first, 3 thèmes, FR/EN sur les données, B1 | `docs/adr/` | Aucun | Plus de décision à re-débattre |
| **H4** | Documenter chaque clé d'état persistée en une ligne (`ov`, `obj`, `occ`, `tt`, `mat`, `vault`) | `03-ARCHITECTURE.md` | Aucun | Modèle compréhensible sans lire le code |
| **H5** | `CHANGELOG.md` alimenté dès maintenant | racine | Aucun | Historique des améliorations tracé |

---

## Ordonnancement et priorités

```
G2 (valeurs de référence)  ──┬──▶ B1 B3 B4 B5   (perf, sous filet de sécurité)
                             └──▶ C1 C2 C3      (refonte interne, sous filet)
A1 A2 A4 A5  (indépendants, à faire en premier)
E1 E2  ──▶  D1  (états vides, obligatoire dans la même livraison)
D2 D3 D4 D5 D7  (indépendants, additifs)
F* H*  (à tout moment)
D6 B7 G4  (fin de parcours)
```

**Ordre recommandé de livraison :**

1. **Lot 1 — Filet de sécurité** : `G2`, `G1` puis `A1`, `A2`, `A4`, `A5`, `A7`.
   *Rien ne change à l'écran ; le projet devient modifiable sans risque.*
2. **Lot 2 — Sincérité** : `E1`, `E2`, `E3` + `D1`.
   *Seul lot qui modifie l'affichage — et c'est une correction, pas une régression.*
3. **Lot 3 — Performances** : `B1`, `B2`, `B5`, `B4`, puis `B3` (le plus délicat, en dernier).
4. **Lot 4 — Maintenabilité** : `C1`, `C2`, `C3`, `C4`, `C5`, `C6`, `C7`.
5. **Lot 5 — UX et accessibilité** : `D2`, `D3`, `D4`, `D5`, `D7`, `D8`, puis `D6`.
6. **Lot 6 — Rangement et documentation** : `F2`–`F6`, `H3`–`H5`, `B6`, `B7`, `G3`, `G4`.

Charge estimée : **6 à 8 jours-personne** pour les 6 lots, dont ~1,5 j sur le lot 1.

## Registre des risques

| Risque | Probabilité | Impact | Parade |
|---|---|---|---|
| `B3` (invalidation fine du cache) affiche une valeur périmée | Moyenne | Élevé | Valeurs de référence `G2` + interrupteur de repli vers l'invalidation globale |
| `C1`/`C3` (découpage) perd une clé de `renderVals()` | Moyenne | Moyen | Comparer la liste des clés retournées avant/après, automatiquement |
| `E1`/`E2` donnent une impression de régression (« mes stats ont disparu ») | Élevée | Faible | Livrer avec `D1` et une note de version explicite |
| `D6` (responsive) casse le rendu ≥ 1060 px | Faible | Élevé | Ne modifier que des branches conditionnelles `vw < 768` |
| `F2`/`F5` (déplacements) rompent des chemins relatifs | Moyenne | Faible | Vérifier `ds-base.js` et les renvois inter-documents après déplacement |
| `A1` (validation d'import) rejette un export légitime | Faible | Moyen | Mode tolérant + rapport d'import détaillé |
| Perte de données pendant les travaux | Faible | Critique | `A3` (sauvegarde automatique) livré au lot 1 |
