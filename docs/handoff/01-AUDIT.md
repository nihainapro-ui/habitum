# 01 — Audit du projet

État analysé : `Habitum.dc.html` — **relu après les lots 1 à 6** (3 877 lignes : template 71–1 615,
logique 1 617–3 877), `support.js` (runtime généré, hors périmètre produit).

> **Ce document est un audit daté.** Les constats marqués ✅ **RÉGLÉ** l'ont été par les lots 1 à 6 ;
> le détail est dans `CHANGELOG.md` à la racine et l'état d'avancement dans
> `09-PLAN-AMELIORATION.md`. Ce qui n'est pas marqué reste vrai.

Architecture actuelle : **un seul composant**, une classe `Component extends DCLogic`, état unique
`this.state` (~40 clés), rendu par `renderVals()` / `vals2()` retournant des objets de style et de
handlers consommés par des trous `{{ }}` dans le template. Persistance `localStorage`.

---

## ✅ Terminé (fiable, à transposer tel quel)

**Moteur métier — c'est l'actif principal du projet.**

| Élément | Détail |
|---|---|
| Modèle de données | `habits`, `ov` (journal), `tasks`, `obj`, `notes`, `sessions`, `shop`, `occ`, `profiles` |
| Planification | `sched_(h,d)` : bornes `start`/`end`, mode `dow`, jours de semaine, archivage |
| Complétion | `isDone_()` gérant les 4 types d'objectif dont la sémantique inversée de `limit` |
| Séries | `streak_()` (jour courant tolérant), `best_()` (balayage 365 j), consolidation |
| Taux | `pct_(h,win)`, `sumVal_(h,win)`, `dayRatio_(d)` sur fenêtre glissante |
| Cache | `memo()` invalidé par identité de `habits/ov/tasks/occ/lang` + clé du jour |
| Dates | `today/add/key/dow/cur/dkey/tdate/toff/soff`, `fmtDate` localisé FR/EN |
| Migrations | versions `v<2` → `v<5` appliquées à la lecture du `localStorage` |
| Undo | `snapshot()` + `notify(msg, snap)` : toast avec restauration d'état |

**UI et interactions livrées**

- 11 vues navigables : `dash`, `today`, `cal`, `habits`, `tasks`, `goals`, `stats`, `timer`,
  `notes`, `settings`, `profile`.
- 3 thèmes complets par attribut `[data-theme]` (`neural`, `plasma`, `clinical` clair).
- Bilingue FR/EN intégral (dictionnaires `L`, `EL`, `PL` + champs `fr`/`en` sur les données).
- Éditeur habitude/tâche à 4 onglets (Définition, Planning, Rappels, Avancé).
- Palette de commandes `⌘K` avec recherche, navigation clavier, création rapide.
- Mode zen `⌘\`, piège de focus (`Tab`) dans les modales, `Escape` global.
- Calendrier mois/semaine/jour/agenda avec **glisser-déposer et redimensionnement** de tâches.
- Timer 4 modes avec `startTick()`, phases pomodoro, crédit automatique de l'habitude liée.
- Export JSON, import JSON par `<input type=file>`, réinitialisation avec confirmation.
- Profils multiples : création, bascule, suppression, avatar génératif OKLCH (teinte + glyphe).
- Écran de démarrage animé (une fois par session via `sessionStorage`), curseur personnalisé.
- ~45 `@keyframes`, respect de `prefers-reduced-motion`.

---

## 🟡 Partiellement terminé

| Sujet | Ce qui existe | Ce qui manque |
|---|---|---|
| **Responsive** | `state.vw` sur `resize`, seuils `<1320` / `<1060` / `<780` / `<768 px`, `navBot()`, `navRail()` | ✅ **RÉGLÉ (lot 5, D6)** : sous 768 px les grilles Semaine/Jour passent en liste et l'éditeur occupe tout l'écran. Reste : la heatmap et certaines grilles denses défilent horizontalement plutôt que de se réorganiser. |
| **Objectifs** | Types `cumul` / `reduce`, cible, unité, source, échéance, brouillon de création | Pas de courbe d'avancement/burndown, pas de jalons, pas de rappel d'échéance, pas de calcul de rythme requis. |
| **Notes** | Journal du jour, historique, humeur, notes par habitude | ✅ **RÉGLÉ (lot 2, E2)** : plus aucun faux contenu généré, et la recherche plein texte existe. Reste : texte brut uniquement, pas de liaison note↔tâche, pas de pièce jointe. |
| **Sessions de focus** | Sessions journalisées `{label,min,d}`, total du jour | ✅ **RÉGLÉ (lot 2, E1)** : `focusMin_()` agrège les sessions réellement enregistrées ; un compte sans session affiche 0. |
| **Timer** | Ticks, phases, cycles, crédit habitude, ancrage horloge murale correct | Ne survit pas au rechargement (`timer` non persisté). Pas de son, pas de notification de fin. |
| **Réglages** | Interrupteurs `notif`, `sound`, `vibrate`, `confetti`, `cloud`, début de semaine | `notif`/`sound`/`vibrate` sont **purement décoratifs** (aucune API Notification / Web Audio / Vibration). `cloud=false` désactive en fait la persistance locale — nommage trompeur. |
| **Rappels d'habitude** | Champ `rem[]` éditable dans l'onglet Rappels | Jamais déclenché : aucun planificateur, aucune notification. |
| **Liste de courses** | `shop[]` avec bascule d'articles | Pas d'ajout/suppression persistés partout, pas de quantités, pas de catégories. |
| **Accessibilité** | `:focus-visible`, `role="switch"`, `aria-label`, piège de focus | Pas d'audit de contraste (thème `plasma` limite), pas de région live pour les toasts, pas de navigation clavier sur le calendrier drag&drop, curseur personnalisé masquant le pointeur système. |
| **Occurrences / récurrence** | `occ{}`, champ `rep` (`daily`/`monthly`) | Expansion des tâches récurrentes non généralisée (pas de RRULE, pas d'exceptions par occurrence). |

---

## ❌ Manquant

1. **Aucun dépôt de code, aucun build, aucun test.** Le prototype n'est pas un projet logiciel :
   pas de `package.json`, pas de TypeScript, pas de CI, pas de linter, pas de versionnement.
2. **Aucune couche de persistance robuste** : `localStorage` uniquement, synchrone, quota ~5 Mo,
   aucun index, aucune transaction, aucune sauvegarde automatique.
3. **Aucune authentification ni synchronisation** : produit mono-appareil, perte de données si le
   navigateur est nettoyé.
4. **Pas de PWA** : pas de manifeste, pas de service worker, pas d'installation, pas d'offline
   explicite, pas d'icônes.
5. **Pas de notifications réelles** (rappels d'habitude, fin de pomodoro) ni de planification en
   arrière-plan.
6. **Pas d'internationalisation industrialisée** : chaînes dupliquées dans 3 gros dictionnaires
   inline + champs `fr`/`en` sur chaque entité de données (le contenu utilisateur ne devrait pas
   être bilingue).
7. **Pas de gestion d'erreur ni d'états de chargement/vide systématiques** (quelques états vides
   existent : `emGoalsT`, `emAgendaT`).
8. **Pas d'onboarding** : l'app démarre sur un jeu de démonstration matérialisé en dur.
9. **Pas d'analytique, pas de télémétrie d'usage, pas de journalisation d'erreurs.**
10. **Pas de documentation développeur** (ce dossier la crée).

---

## 🚧 Blocages techniques

**B1 — Conflit de design system (bloquant produit, à trancher en premier).**
Le projet a *Modernist* rattaché (rouge #ec3013 sur fond clair, Archivo, rayon 0, règles 2 px,
grille modulaire visible) mais l'app est construite sur un système sombre inverse (verre dépoli,
rayons 11–16 px, lueurs, 3 thèmes, Space Grotesk + JetBrains Mono). Les deux ne se réconcilient
pas par ajustement. Options :
&nbsp;&nbsp;**(a)** garder le système sombre du prototype et acter que Modernist ne s'applique pas ;
&nbsp;&nbsp;**(b)** refondre l'UI sous Modernist (≈ refonte visuelle complète, moteur métier intact) ;
&nbsp;&nbsp;**(c)** conserver le sombre comme thème produit et n'utiliser Modernist que pour le site
vitrine / la documentation. **Recommandation : (a) ou (c).**

> ✅ **TRANCHÉ le 5 août 2026 — option (c).** L'application garde son système sombre ; la vitrine et
> la documentation passent en Modernist. La page `Vitrine Habitum.dc.html` matérialise la décision.
> Détail et frontière : `07-DECISION-B1.md`.

**B2 — Monolithe non portable.** ✅ **Atténué (lot 4, C1)** : `vals2()` (≈ 340 lignes, 8 domaines) est
découpée en huit fonctions de rendu, et le reste du fichier est cartographié
(`reference/CARTE-DU-FICHIER.md`). Le constat de fond reste : ~40 clés d'état dans un seul objet et
des styles en objets JS. Aucun découpage « par extraction mécanique » n'est possible : il faut
re-modéliser en composants + store (voir phase 1–3), et c'est un choix assumé du prototype
(`docs/adr/0001-design-component-unique.md`).

**B3 — Plafond de performance.** ✅ **RÉGLÉ (lot 3)** : le record est mis en cache par habitude et
survit au rechargement (`B1`), le cache de rendu n'est plus invalidé globalement mais par habitude
(`B3`, avec l'interrupteur de repli `cfg.fastCache=false`), `materialize()` part en temps mort
(`B4`) et `persist()` n'écrit les milliers de clés de `ov` que lorsqu'elles changent (`B5`).
Un test dédié vérifie qu'aucune valeur périmée n'est affichée. Le plafond réel restant est le
**volume de stockage** à plusieurs années d'historique : il appartient au portage (IndexedDB).

**B4 — Données de démonstration mêlées aux données réelles.** Partiellement traité : `focusMin_()` et
`journalSeed()` n'inventent plus rien (lot 2), et le jeu de démonstration porte un drapeau `demo`
(lot 1, `A6`). **Reste vrai** : `materialize()` transforme toujours un historique généré par hachage
(`rnd()`, FNV-1a) en entrées de journal que rien ne distingue à l'œil des vraies. Un utilisateur réel
ne doit jamais recevoir cet historique — le portage doit séparer *seed de démo* et *compte vierge*.

**B5 — Timer non persistant.** ✅ **RÉGLÉ (finalisation)** : `state.timer` est persisté
(`{mode, phase, cycle, el}`) et restauré **toujours en pause**, avec l'écoulé conservé — reprendre
une course vieille de trois jours en additionnant le temps réel serait faux. Un toast signale la
session reprise. Le constat d'origine, conservé pour mémoire :

Correction d'analyse : le prototype ancre déjà correctement le temps
sur une horloge murale (`this.t0 = Date.now() - el`, `elNow()` recalculé, tick de 250 ms purement
d'affichage) — **il n'y a donc pas de dérive**. Le vrai défaut est ailleurs : `state.timer` n'est
pas dans la liste des clés persistées par `persist()`, et `t0` est un champ d'instance. Une session
en cours est donc **perdue au rechargement**. Correction attendue : persister
`{mode, phase, cycle, startedAt, accumulatedMs}` et reconstruire à l'ouverture.

**B6 — Migrations de schéma artisanales.** ✅ **TESTÉ (finalisation)** : les quatre migrations
(`v<2` … `v<5`) sont couvertes par le contrôle « migrations de schéma » de
`tests/domain.test.html` — chacune reçoit une charge au format d'origine et doit produire exactement
ce qu'elle annonce, y compris ne rien faire sur un état déjà à jour. La forme en cascade reste
artisanale : la reprendre en migrations versionnées appartient au portage.

**B7 — Aucune frontière de typage.** JavaScript non typé sur un modèle riche (4 types d'objectif,
clés composites `habitId|YYYY-MM-DD`, entités bilingues). Source de régressions garantie sans
TypeScript.
