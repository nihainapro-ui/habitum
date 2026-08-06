# ADR 0003 — Trois thèmes, deux langues, dans les données

- **Statut** : accepté · 2026-08-05

## Décision

Trois thèmes (`neural`, `plasma`, `clinical`) déclarés en variables CSS dans le `helmet`, et un
bilinguisme FR/EN qui va **jusque dans les données** : chaque habitude, tâche, objectif et session
porte un champ `fr` et un champ `en`.

## Pourquoi

- L'utilisateur travaille en français et en anglais ; traduire l'interface sans traduire le jeu de
  démonstration aurait produit un écran à moitié anglais.
- Les tokens en variables CSS permettent de changer de thème sans réécrire un style.

## Conséquences

- Tout ajout de libellé se fait dans `L`, `EL`, `PL` ou `L2` **dans les deux langues** : la symétrie
  des clés est une invariante du fichier.
- Une donnée saisie par l'utilisateur est écrite à l'identique dans `fr` et `en` (on ne traduit pas
  à sa place).
