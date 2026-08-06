# Tests

| Dossier | Quoi | Commande |
|---|---|---|
| `unit/domain.test.ts` | Les deux pièges de `CLAUDE.md` : `limit` inversé, tolérance du jour courant | `npm test` |
| `unit/date.test.ts` | Helpers de date, bornes de semaine lundi / dimanche | `npm test` |
| `unit/golden.test.ts` | **Les 62 valeurs de référence, comparées à chaque commit** | `npm test` |
| `e2e/` | Parcours, Playwright | `npm run test:e2e` |
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
