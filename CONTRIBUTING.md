# Contribuer à Habitum

## En cinq minutes

```bash
npm install
npm run dev        # http://localhost:3000
npm run verify     # à passer AVANT toute PR — sept contrôles
                   # `npm install` installe aussi le hook pre-push : un push
                   # sur main sans verify vert est refusé (SECURITY.md)
```

Le prototype de référence s'ouvre seul, sans rien installer :
`public/prototype/Habitum.dc.html`. Ses six contrôles de moteur :
`public/prototype/tests/domain.test.html`.

## Avant d'écrire une ligne

Lire `CLAUDE.md`. Les règles y sont courtes et non négociables — deux d'entre elles ont déjà coûté
des données réelles.

## Définition de « terminé »

- `npm run verify` vert — typecheck · lint · format · libellés · jetons · tests · build
- `npm run test:e2e` vert sur desktop **et** mobile
- Aucun débordement horizontal à 390 / 768 / 1060 / 1440 px
- `CHANGELOG.md` à jour
- Tout document de `docs/` invalidé par la PR est corrigé **dans la même PR**

## Ce qu'une PR ne peut pas faire

- **Renommer une clé persistée** : `ov`, `obj`, `occ`, `tt`, `mat`, `cfg`, `habitum.*`.
  Des utilisateurs ont des données sous ces noms.
- **Modifier `tests/fixtures/golden.json`** pour faire passer un test. Les 62 valeurs sont la
  spécification : si un test du domaine casse, c'est le code qui a tort.
- **Éditer `styles/tokens.css` à la main** — il est généré par `scripts/extract-tokens.mjs`.
- **Modifier `public/prototype/`**, sauf pour reporter une correction du moteur — et alors en
  régénérant `docs/handoff/reference/domain-logic-extract.js` dans la même PR.
- **Recopier la liste des types d'objectif.** Il y en a **sept** (`check`, `count`, `time`,
  `total`, `list`, `limit`, `exact`) et **trois** pour les objectifs (`cumul`, `milestones`,
  `reduce`). Ils sont déclarés une seule fois, dans `lib/domain/types.ts` : les importer.
- **Introduire une dépendance payante** ou sous licence non permissive (MIT / Apache-2.0 / ISC /
  OFL uniquement).
- **Ajouter un appel réseau vers un tiers.** La promesse produit est que rien ne sort de
  l'appareil, et un test e2e la vérifie.
- **Ajouter un calcul dans un composant.** S'il en faut un, il descend dans `lib/domain` avec son
  test — ESLint interdit d'ailleurs à `lib/domain/` d'importer React, Next ou la persistance.

## Commits

Conventional commits : `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ci:`, `refactor:`, `perf:`.
Un message dit **pourquoi**, pas seulement quoi.
