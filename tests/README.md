# Tests

| Dossier | Quoi | Commande |
|---|---|---|
| `unit/domain.test.ts` | Les deux pièges de `CLAUDE.md` : `limit` inversé, tolérance du jour courant | `npm test` |
| `unit/date.test.ts` | Helpers de date, bornes de semaine lundi / dimanche | `npm test` |
| `unit/golden.test.ts` | **Les 62 valeurs de référence, comparées à chaque commit** | `npm test` |
| `unit/tokens.test.ts` | Anti-dérive : `tokens.css` ≡ prototype | `npm test` |
| `unit/data/db.test.ts` | Schéma Dexie : 9 tables, clé composite `[habitId+date]` | `npm test` |
| `unit/data/repositories.test.ts` | CRUD, `updatedAt` automatique, suppression logique | `npm test` |
| `unit/data/migrations.test.ts` | Migrations héritées `v<2`…`v<5` et reprise du stockage du prototype | `npm test` |
| `unit/data/import.test.ts` | **Aller-retour export → import : toutes les métriques recomparées** | `npm test` |
| `unit/data/seed.test.ts` | Compte vierge vs démonstration ; aucun générateur dans `lib/` | `npm test` |
| `unit/data/log-index.test.ts` | Journal en mémoire ; une clé absente rend `undefined`, jamais 0 | `npm test` |
| `unit/store/habits.test.ts` | Tranche habitudes : dépôt d'abord, store ensuite | `npm test` |
| `unit/store/hydrate.test.ts` | Chargement de tout l'état en une passe, drapeaux et pannes | `npm test` |
| `unit/store/undo.test.ts` | **L'annulation restaure l'entité ET ses dépendances, en base** | `npm test` |
| `unit/build-output.test.ts` | **Aucune route dynamique** — exige un `npm run build` préalable | `npm test` |
| `e2e/` | Parcours, Playwright | `npm run test:e2e` |
| `setup/indexeddb.ts` | Amorce `fake-indexeddb` — Dexie a besoin d'un IndexedDB en Vitest | chargé automatiquement |
| `fixtures/golden.json` | Les 62 valeurs de référence du prototype — **ne jamais modifier** | lu par `unit/golden.test.ts` |
| `fixtures/demo-seed.ts` | Jeu de démonstration reconstitué — **usage test uniquement** | idem |

> `fixtures/demo-seed.ts` porte le seul générateur toléré par `CLAUDE.md` § 3
> (`rnd()` FNV-1a et `materialize()`, portés du prototype). Il ne doit jamais
> être importé depuis `lib/`, `app/` ou `components/` : en production, un compte
> vierge n'affiche aucune donnée générée.

Le harnais historique du prototype, **toujours valide**, vit dans
`public/prototype/tests/` : ouvrir `domain.test.html` dans un navigateur, les
**six** contrôles doivent être verts. C'est la référence contre laquelle le
portage TypeScript doit s'aligner — tant que les deux existent, ils doivent
donner les mêmes chiffres.

Recette manuelle : `public/prototype/tests/RECETTE.md`.

## Ce que la suite e2e teste vraiment

`playwright.config.ts` lance **le build de production**, pas `npm run dev`, et ne réutilise pas un
serveur déjà ouvert sur le port 3000. Les deux points ont une histoire : la configuration lançait
`npm run dev` alors que la tâche 0.12 annonçait le contraire, et la réutilisation d'un serveur
existant a masqué l'écart jusqu'à la première interaction cliente — `next dev` charge Fast Refresh,
qui évalue du code en chaîne et tombe sous la CSP du projet.

Les pages étant prérendues, le HTML arrive **avant** que les raccourcis soient écoutés. Un test qui
presse `⌘K` juste après `page.goto` est instable ; il doit d'abord attendre
`[data-hydrated="true"]`, le marqueur d'interactivité posé par la coque.
