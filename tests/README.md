# Tests

| Dossier | Quoi | Commande |
|---|---|---|
| `unit/` | Moteur métier pur (`lib/domain`), Vitest | `npm test` |
| `e2e/` | Parcours, Playwright | `npm run test:e2e` |
| `fixtures/golden.json` | Les 62 valeurs de référence du prototype | consommées par les deux |

Le harnais historique du prototype, **toujours valide**, vit dans
`public/prototype/tests/` : ouvrir `domain.test.html` dans un navigateur, les
**six** contrôles doivent être verts. C'est la référence contre laquelle le
portage TypeScript doit s'aligner — tant que les deux existent, ils doivent
donner les mêmes chiffres.

Recette manuelle : `public/prototype/tests/RECETTE.md`.
