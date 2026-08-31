/* Les trois calculs du menu déroulant, séparés du composant.
 *
 * POURQUOI UN FICHIER À PART : `tsconfig.json` fixe `"jsx": "preserve"` — le
 * réglage que Next attend — et vitest ne peut alors transformer aucun `.tsx`.
 * Ces trois fonctions n'ont pourtant besoin d'aucun DOM : ce sont des nombres
 * et des chaînes. Les laisser dans `select.tsx` les rendait intestables sans
 * toucher la configuration de tout le dépôt.
 *
 * Le reste du composant — ARIA, clavier, portail, thèmes — se vérifie dans un
 * vrai navigateur (`tests/e2e/select.spec.ts`). C'est le bon partage : un menu
 * qui « passe » hors navigateur mais se fait couper par un `overflow:hidden`
 * n'a rien prouvé. */

/** Marge entre le bouton et son panneau, en pixels. */
const ECART = 6;

/** Hauteur maximale du panneau avant défilement interne, en pixels. */
export const HAUTEUR_MAX = 280;

/** Place le panneau sous le bouton, ou AU-DESSUS s'il n'y tient pas.
 *
 *  Un menu ouvert près du bas de la fenêtre était coupé : on voyait deux
 *  options sur six, sans rien pour indiquer qu'il en manquait. Le retournement
 *  n'a lieu que s'il RÈGLE le problème — dans une fenêtre plus courte que le
 *  panneau, il ferait sortir le menu par le haut, là où rien ne défile ; on
 *  préfère alors le bas, où le défilement de la page reste possible. */
export function placerPanneau(
  bouton: { haut: number; bas: number },
  hauteurPanneau: number,
  hauteurFenetre: number,
): { top: number; retourne: boolean } {
  const dessous = bouton.bas + ECART;
  if (dessous + hauteurPanneau <= hauteurFenetre) return { top: dessous, retourne: false };

  const dessus = bouton.haut - ECART - hauteurPanneau;
  if (dessus >= 0) return { top: dessus, retourne: true };

  return { top: dessous, retourne: false };
}

/** Retire diacritiques et casse — « Étudiante » se trouve en tapant « e ». */
const aplatir = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Index de la première option commençant par `tampon`, en repartant APRÈS
 *  `depuis` et en bouclant.
 *
 *  Rend -1 quand rien ne correspond : la sélection ne doit alors PAS bouger.
 *  Déplacer le curseur sur une faute de frappe reviendrait à choisir au hasard
 *  dans une liste que l'utilisateur ne voit pas encore entièrement. */
export function indexParFrappe(
  libelles: readonly string[],
  tampon: string,
  depuis: number,
): number {
  const cible = aplatir(tampon);
  if (!cible || libelles.length === 0) return -1;

  for (let i = 1; i <= libelles.length; i++) {
    const index = (((depuis + i) % libelles.length) + libelles.length) % libelles.length;
    if (aplatir(libelles[index] ?? '').startsWith(cible)) return index;
  }
  return -1;
}

/** Nouveau `scrollTop` du panneau pour rendre l'option active visible.
 *
 *  JAMAIS `scrollIntoView` (CLAUDE.md) : il fait défiler TOUS les ancêtres —
 *  donc la page derrière le menu, qui n'a aucune raison de bouger. On ajuste
 *  le panneau, et lui seul. Le déplacement est le MINIMUM nécessaire : un menu
 *  qui recentre l'option à chaque flèche donne le mal de mer. */
export function defilementVers(
  option: { haut: number; hauteur: number },
  vue: { scrollTop: number; hauteur: number },
): number {
  if (option.haut < vue.scrollTop) return option.haut;

  const bas = option.haut + option.hauteur;
  if (bas > vue.scrollTop + vue.hauteur) return bas - vue.hauteur;

  return vue.scrollTop;
}
