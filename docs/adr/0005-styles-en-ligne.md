# ADR 0005 — Styles en ligne, pas de feuille de classes

- **Statut** : accepté · 2026-08-05

## Décision

Tout le style est en ligne (objets calculés ou attribut `style`). Le `<style>` du `helmet` ne porte
que ce qui ne peut pas l'être : tokens des thèmes, `@keyframes`, resets, requêtes média.

## Pourquoi

Une feuille de classes retarde l'affichage jusqu'à ce que les règles **et** le markup soient arrivés.
En ligne, chaque élément se peint dès qu'il est lu.

## Conséquences

- Le panneau « verre » est répété dans le markup (~50 fois). La tâche `C2` proposait une fabrique
  `panelSt()` : **écartée** pour cette raison exacte (voir `CHANGELOG.md`).
- Un style **statique** ne doit jamais passer par une valeur calculée : cela le rendrait invisible
  jusqu'à la fin du rendu. Seules les valeurs réellement dynamiques (une largeur en %, un état) y
  passent.
- Au portage, Tailwind et les classes reprennent ce rôle : la contrainte disparaît.
