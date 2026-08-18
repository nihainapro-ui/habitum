/* Encre posée SUR une teinte saturée — tâche 8.3.
 *
 *  Dix composants écrivaient `#04060d` (ou `#04120d`) en dur pour le texte
 *  posé sur un aplat `--ok`, `--acc2` ou sur le dégradé `--acc → --acc2` :
 *  bouton principal, case cochée, pastille de semaine, jour courant du
 *  calendrier, bandeau de mise à jour, accueil, minuteur.
 *
 *  Ce noir presque pur suppose que la teinte du dessous est CLAIRE. C'est vrai
 *  dans `neural` et `plasma`, dont les accents sont fluorescents. C'est faux
 *  dans `clinical`, dont les accents sont sombres pour rester lisibles sur un
 *  fond clair : le texte y était sombre sur sombre — jusqu'à 2,5:1, sous le
 *  seuil AA, et invisible pour axe, qui n'évalue pas le contraste d'un
 *  élément dont le fond est un dégradé.
 *
 *  `--bg` est le fond de la page : par construction, c'est la couleur la plus
 *  éloignée des accents de son thème — quasi noire dans les deux thèmes
 *  sombres, quasi blanche dans le thème clair. C'est donc l'encre juste dans
 *  les trois, et elle se déduit du thème au lieu d'être recopiée.
 *
 *  Une seule exception, `components/profile/Avatar.tsx` : son dégradé OKLCH
 *  est clair dans les TROIS thèmes — il ne suit pas les jetons. Son encre
 *  reste donc sombre en dur, et c'est écrit sur place.
 */
export const ENCRE_SUR_TEINTE = 'var(--bg)';
