# Non-régression visuelle (léger)

Pas d'outil, pas de seuil automatique : des captures de référence et un œil.

## Références

`reference/` contient une capture par vue, prise dans le thème **Neural**, en **français**, à
**~920 px** de large (largeur du volet de prévisualisation), sur le jeu de démonstration. Elles servent de point de comparaison, pas de
vérité pixel : le rendu dépend de la machine (polices, sous-pixel, accélération).

## Comment comparer

1. Ouvrir `Habitum.dc.html` à la même largeur (~920 px), thème Neural, langue FR, jeu de démonstration.
2. Passer les 11 vues et comparer à la capture correspondante — côte à côte, pas de mémoire.
3. Ne relever que ce qui est **structurel** : élément disparu, chevauchement, texte tronqué,
   couleur de rôle changée, cadre déformé. Un écart d'antialiasing ou de 1 px n'est pas un défaut.

## Quand régénérer

Après toute modification volontaire du rendu, et **seulement après** que la recette
(`tests/RECETTE.md`) est passée. Écrire dans le `CHANGELOG.md` ce qui a changé et pourquoi.

`current/` est ignoré par git : c'est le dossier de travail pour les captures du jour.
