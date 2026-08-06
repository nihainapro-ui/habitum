# ADR 0001 — Une seule Design Component, pas de découpage en composants

- **Statut** : accepté · 2026-08-05
- **Contexte** : l'application compte 11 vues et ~3 800 lignes dans un unique `Habitum.dc.html`.

## Décision

Garder **un seul fichier**. Le découpage en composants enfants n'aura lieu qu'au portage.

## Pourquoi

- Le format streame : la page se peint au fur et à mesure de sa lecture. Des composants enfants
  ajoutent des attentes de chargement avant le premier pixel.
- Les designers dupliquent le fichier pour explorer une variante ; des enfants partagés cassent
  cette pratique.
- Le découpage utile a été fait **à l'intérieur** du fichier : `coreVals`, `profVals`, et depuis le
  lot 4 les huit fonctions `habitVals` … `settingVals` (voir ADR 0004).

## Conséquences

- `reference/CARTE-DU-FICHIER.md` est indispensable et doit être régénéré à chaque livraison.
- Le portage (`docs/handoff/03-ARCHITECTURE.md`) prévoit l'éclatement en routes et composants.
