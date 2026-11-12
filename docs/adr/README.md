# Journal de décisions (ADR)

Une décision par fichier, numérotée, jamais réécrite : si une décision change, on en ajoute une qui
remplace la précédente et on marque l'ancienne « remplacée par ».

| Nº | Décision | Statut |
|---|---|---|
| [0001](0001-design-component-unique.md) | Une seule Design Component | accepté |
| [0002](0002-local-first.md) | Local-first, sans compte ni serveur | accepté, amendé par 0009 |
| [0003](0003-trois-themes-deux-langues.md) | Trois thèmes, deux langues jusque dans les données | accepté |
| [0004](0004-cache-de-rendu.md) | Cache de rendu à invalidation fine | accepté |
| [0005](0005-styles-en-ligne.md) | Styles en ligne, pas de feuille de classes | accepté |
| [0006](0006-helpers-de-date-maison.md) | Helpers de date maison, sans bibliothèque | accepté |
| [0007](0007-application-sous-app.md) | L'application vit sous `/app`, la racine revient à la vitrine | accepté |
| [0008](0008-rappels-onglet-ouvert.md) | Les rappels sonnent tant qu'un onglet est ouvert, et le disent | accepté |
| [0009](0009-sync-chiffree.md) | Synchronisation chiffrée de bout en bout, sans compte, facultative | accepté |

> ADR-0005 a commencé à s'éteindre en phase 2 : la coque a besoin de points de rupture, qu'un
> style en ligne ne sait pas exprimer. Elle est donc écrite en classes utilitaires. La phase 3
> (système visuel) porte les primitives et refermera le sujet — c'est la fin annoncée par
> l'ADR elle-même, pas un contournement.

**Décision B1 — tranchée par le commanditaire, option (c)** : l'application reste sombre, la
vitrine porte le système *Modernist*, et les deux surfaces ne partagent aucun composant. Le
dossier est `docs/handoff/07-DECISION-B1.md` ; elle n'a pas d'ADR parce qu'elle appartenait au
commanditaire, pas à l'équipe technique.
