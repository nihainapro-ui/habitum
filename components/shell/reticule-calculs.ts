/* Les calculs du curseur réticule, séparés du composant.
 *
 * Même raison que `components/ui/select-calculs.ts` : `tsconfig.json` fixe
 * `"jsx": "preserve"` — le réglage que Next attend — et vitest ne peut alors
 * transformer aucun `.tsx`. Ces valeurs et cette interpolation n'ont besoin
 * d'aucun DOM ; les laisser dans le composant les rendait intestables. */

/** Fraction de l'écart parcourue à chaque image par l'anneau. Valeur du
 *  prototype : c'est elle qui fait la traîne. */
export const AMORTI = 0.18;

/** Sous ce seuil, on considère l'anneau ARRIVÉ.
 *
 *  Une interpolation géométrique tend vers sa cible sans jamais l'atteindre.
 *  Sans plancher, la boucle d'animation repeindrait indéfiniment un écart d'un
 *  centième de pixel — invisible à l'œil, bien réel pour la batterie. */
const PLANCHER = 0.5;

/** Rapproche `actuel` de `cible` d'une fraction de l'écart.
 *
 *  `facteur` vaut 1 sous `prefers-reduced-motion` : l'anneau colle alors à la
 *  souris, sans traîne — le garde-fou du rapport. */
export function amortir(actuel: number, cible: number, facteur: number): number {
  const ecart = cible - actuel;
  if (Math.abs(ecart) < PLANCHER) return cible;
  return actuel + ecart * facteur;
}

/** Diamètres des deux disques, par état, en pixels.
 *
 *  Les trois états doivent être VISIBLEMENT distincts : c'est la différence
 *  entre un curseur qui informe et une décoration. Au survol l'anneau s'ouvre
 *  (26 → 34) ; au clic il se resserre et le noyau enfle (26 → 20, 6 → 10),
 *  ce qui lit comme un déclic. */
export const TAILLES = {
  repos: { noyau: 6, anneau: 26 },
  survol: { noyau: 6, anneau: 34 },
  presse: { noyau: 10, anneau: 20 },
} as const;

/** Ce que le réticule survole. `texte` transforme le noyau en barre de saisie. */
export type EtatCible = 'repos' | 'survol' | 'texte';

/** Sélecteur des éléments qui ouvrent l'anneau. */
export const CLIQUABLES = "a, button, [role='button'], input, select, textarea, [data-hit]";

/** Sélecteur des champs où le noyau devient une barre. */
export const CHAMPS_TEXTE =
  "input:not([type='checkbox']):not([type='radio']):not([type='file']), textarea, [contenteditable='true']";
