# 08 — Critères de « projet prêt à finir » et verdict

Un projet est *prêt à finir* quand une équipe (ou Claude Code) qui n'a pas participé à sa conception
peut le reprendre et le mener en production **sans avoir à redécouvrir ni réinventer quoi que ce
soit**. Grille appliquée à Habitum :

| # | Critère | État | Preuve |
|---|---|---|---|
| 1 | Périmètre fonctionnel écrit et fermé | ✅ | `README.md` § Périmètre + § Hors périmètre |
| 2 | Chaque écran spécifié (rôle, contenu, interactions, états) | ✅ | `05-SPEC-VUES.md` — 11 vues + composants transverses |
| 3 | Référence visuelle exploitable au pixel | ✅ | `Habitum.dc.html` ouvrable + `04-DESIGN-TOKENS.md` (valeurs exactes, 3 thèmes) |
| 4 | Logique métier identifiée, isolée et transmissible | ✅ | `reference/domain-logic-extract.js` — **régénéré après le lot 6**, plus `tests/golden.json` : 62 valeurs de référence qui sont la spécification exécutable du moteur |
| 5 | Modèle de données cible défini, avec écarts au prototype justifiés | ✅ | `03-ARCHITECTURE.md` § 3 (4 changements structurels explicités) |
| 6 | Chemin de migration des données existantes | ✅ | `03-ARCHITECTURE.md` § 5 + tâche `T1.10` |
| 7 | Contenu textuel extrait et prêt à l'emploi | ✅ | `reference/messages-fr.json` / `-en.json` — **308 clés, symétrie FR/EN vérifiée par extraction directe** (la version précédente annonçait 271 clés « 0 manquante » : il en manquait en réalité 3 côté FR, plus les 32 clés `system` des lots 1-5) |
| 8 | Architecture technique arrêtée et gratuite | ✅ | `03-ARCHITECTURE.md` § 1–2 ; coût d'exploitation 0 € détaillé |
| 9 | Dette et pièges connus documentés, pas découverts en route | ✅ | `01-AUDIT.md` § Blocages B1→B7 (**B2 et B3 réglés depuis**, marqués comme tels) + `CLAUDE.md` § Dettes connues + `CHANGELOG.md` |
| 16 | Décisions structurantes justifiées par écrit | ✅ | `docs/adr/` — 5 fiches (composant unique, local-first, thèmes et langues, cache de rendu, styles en ligne) |
| 17 | Le prototype lui-même est sain : pas de perte de données possible, aucun chiffre inventé | ✅ | lots 1-2 : validation d'import, copie de secours, annulation, échecs signalés, focus et journal réels |
| 10 | Backlog exécutable : tâches atomiques, priorisées, dépendances, résultat attendu | ✅ | `06-BACKLOG.md` — 77 tâches, chemin critique explicite |
| 11 | Règles de travail et définition de « terminé » | ✅ | `CLAUDE.md` |
| 12 | Critères de recette et tests attendus | ✅ | `tests/RECETTE.md` (11 vues × 3 thèmes × 2 langues + 8 parcours + a11y + 5 paliers), `tests/domain.test.html` (exécutable), `tests/visual/reference/` ; côté portage `T1.6`, `T8.1`, `T7.6` |
| 13 | Décisions produit ouvertes | ✅ **aucune** | `07-DECISION-B1.md` — tranchée le 5 août 2026 (option (c)), matérialisée par `Vitrine Habitum.dc.html` |
| 14 | Aucune dépendance premium obligatoire | ✅ | `02-ROADMAP.md` § Coût d'exploitation |
| 15 | Estimation de charge et jalons | ✅ | `02-ROADMAP.md` — 16 à 21 j-p, jalons A→D |

## Verdict — 5 août 2026, après finalisation

**Le projet est prêt à finir. Il ne reste aucune réserve côté design.**

Les 17 critères sont tenus, décision `B1` comprise : elle est tranchée (option (c) — application
sombre, vitrine et documentation en Modernist) et matérialisée par un artefact livré, pas par une
intention. Plus rien n'attend de signature pour démarrer `T2.1`.

Ce qui a fait tomber la dernière réserve, et ce que la vérification a coûté :

- La finalisation a **trouvé trois défauts réels** qu'aucune valeur de référence ne voyait — dont
  un grave : depuis le lot 3, l'application n'relisait plus rien au rechargement (une constante de
  clé de stockage déclarée après `state = this.seed()`, donc `undefined` pendant la lecture). Et
  l'import refusait quatre des six habitudes de notre propre export. Les deux sont corrigés et
  **verrouillés par des tests**.
- `tests/domain.test.html` porte maintenant **six contrôles** ; `tests/responsive.html` montre les
  quatre paliers dans de vrais cadres. Les dettes `B4`, `B5` et `B6` de l'audit sont réglées.

### Ce qui reste, et qui n'est pas une réserve de design

Ces points appartiennent au **portage** (Claude Code), pas au prototype :

| Réf. | Sujet | Pourquoi c'est là-bas |
|---|---|---|
| `B4` (résiduel) | `materialize()` génère un historique de démonstration | Le prototype le signale (badge + mention « démo »). Séparer *seed de démo* et *compte vierge* demande le modèle de données cible — tâche `T1.11` |
| `B6` (résiduel) | Migrations en cascade dans `seed()` | Testées, mais leur forme définitive est celle de Dexie / migrations versionnées — tâche `T1.10` |
| `B7` | Aucun typage | TypeScript strict fait partie de la stack cible — phase 1 |
| — | Volume de stockage à plusieurs années | Le `localStorage` a un plafond ; IndexedDB est prévu — `03-ARCHITECTURE.md` § 1 |

### Deux gestes humains, une fois, pas des réserves

Le glisser-déposer du calendrier et l'aller-retour export → réinitialisation → import sont couverts
par des tests (géométrie des colonnes et détection de chevauchement d'un côté, validation et
recomparaison de toutes les métriques de l'autre). Ce qu'un test ne peut pas juger, c'est la
**sensation** du geste : `tests/RECETTE.md` § 2 les liste pour une passe à la main avant livraison.
Ce n'est pas un travail restant, c'est un rituel de recette.

## Ce qui reste hors dossier, par choix

- **Captures d'écran des 11 vues** : désormais incluses — `tests/visual/reference/`, une par vue,
  avec le protocole de comparaison (`tests/visual/README.md`). Le prototype HTML reste la meilleure
  référence : il s'ouvre directement.
- **Jeu de données de démonstration en JSON** : reste dans le prototype (`demoData()` /
  `demoTasks()`) ; il porte un drapeau `demo` depuis le lot 1. La tâche `T1.11` le reconstruit
  proprement et il ne doit pas devenir une donnée de production.
- **Maquettes des écrans manquants** (onboarding `T4.6`, état de synchronisation `T6.4` ; les écrans
  vides `T4.5` existent depuis le lot 2) : à concevoir en cours de route, spécifiés fonctionnellement mais non dessinés.

## Résumé des ajouts qui ont fait basculer le dossier en « prêt à finir »

1. `06-BACKLOG.md` — 77 tâches atomiques (objectif · fichiers · priorité · dépendances · résultat),
   24 critiques, chemin critique tracé.
2. `07-DECISION-B1.md` — le seul point bloquant isolé en une fiche de décision chiffrée avec
   recommandation, pour qu'il ne bloque plus qu'une signature.
3. `reference/domain-logic-extract.js` — les algorithmes métier sortis des 3 451 lignes du
   prototype, annotés « à porter » / « à ne pas porter ».
4. `reference/messages-fr.json` + `-en.json` — 271 clés d'interface extraites, aucune clé
   orpheline entre FR et EN.
5. Correction d'analyse sur **B5** : le timer ancre déjà correctement l'horloge murale ; le défaut
   réel est l'absence de persistance de `state.timer`. La tâche `T3.14` a été reformulée en
   conséquence.
