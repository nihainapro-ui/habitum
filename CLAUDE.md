# CLAUDE.md — Habitum (dépôt de reprise)

Règles de travail sur ce dépôt. Elles priment sur l'habitude et sur le goût.

## Ce qu'est ce dépôt

Une base Next.js 15 / TypeScript strict **volontairement partielle** : la structure,
l'i18n, le moteur métier porté et les tests sont en place ; les vues ne le sont pas.
La référence exécutable de chaque écran est le prototype, servi tel quel depuis
`public/prototype/`. Il n'est **jamais** compilé, jamais importé, jamais modifié —
c'est une pièce d'archive qui doit continuer à s'ouvrir seule dans un navigateur.

## Règles absolues

1. **Ne jamais renommer une clé persistée** : `ov`, `obj`, `occ`, `tt`, `mat`, `cfg`,
   `habitum.state`, `habitum.state.big`, `habitum.state.bak`, `habitum.best`.
   Des utilisateurs ont des données sous ces noms. Les documenter, oui ; les renommer, non.
   Table complète : `docs/handoff/03-ARCHITECTURE.md` § Clés d'état persistées.
2. **`lib/domain/` n'importe jamais React, Next, ni la persistance.** Si une vue a besoin
   d'un calcul, il descend dans `lib/domain` avec son test — il ne monte pas dans le composant.
3. **Aucun chiffre affiché ne doit être fabriqué.** Un compte sans session affiche 0 minute,
   pas une estimation. Le seul générateur toléré sert au jeu de démonstration et doit être
   marqué comme tel.
4. **Les 62 valeurs de référence sont la spécification.** Si un test du domaine casse,
   c'est le code qui a tort. `tests/fixtures/golden.json` +
   `public/prototype/tests/domain.test.html` (six contrôles).
5. **Gratuit uniquement** : MIT / Apache-2.0 / ISC / OFL, et plans gratuits. Aucune brique
   payante obligatoire — voir `docs/ANALYSE-REPRISE.md` § dépendances à risque.
6. **Libellés symétriques** : toute clé ajoutée à `messages/fr.json` existe dans `en.json`.
   `npm run check:messages` le vérifie, la CI l'impose.
7. **Ne pas toucher `public/prototype/`** sauf pour reporter une correction du moteur —
   et alors, régénérer `docs/handoff/reference/domain-logic-extract.js` dans la foulée.

## Deux pièges déjà payés — ne pas les refaire

1. **Liste blanche incomplète des types d'objectif.** Le produit compte **sept** types
   d'habitude (`check`, `count`, `time`, `total`, `list`, `limit`, `exact`) et **trois**
   types d'objectif (`cumul`, `milestones`, `reduce`). Un validateur qui en oublie un fait
   **disparaître silencieusement** des entités et leur historique. Elles sont déclarées une
   seule fois, dans `lib/domain/types.ts` : les importer, jamais les recopier.
2. **Sémantique inversée de `limit`.** Réussi si `valeur <= cible`, **mais** jamais réussi
   d'avance : sur le jour courant sans entrée journalisée, c'est faux. C'est la règle la plus
   facile à casser au portage ; elle a son test dédié.

## Définition de « terminé »

- `npm run verify` est vert (types, lint, libellés, tests unitaires, build) ;
- `npm run test:e2e` passe sur desktop et mobile ;
- aucun débordement horizontal à 390 / 768 / 1060 / 1440 px ;
- `CHANGELOG.md` est à jour ;
- si l'intervention invalide une affirmation d'un document de `docs/`, ce document est corrigé
  dans la même livraison.
