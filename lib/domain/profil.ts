import type { Profile } from './types';

/* Profil local — spec du 2026-09-02 § Lot D.
 *
 * L'ENDROIT UNIQUE où l'absence des trois champs ajoutés par le lot D est
 * défaite. Ils sont facultatifs dans le type (voir `Profile`), donc `undefined`
 * pour tout profil écrit avant ce lot ou reçu d'un appareil resté en arrière.
 * Une vue qui ferait `profil.email ?? ''` de son côté marcherait — jusqu'à la
 * deuxième vue, qui écrirait `?? '—'`, et alors le même profil n'aurait plus la
 * même adresse selon l'écran. Même doctrine que `projectSubItems()` au lot B.
 *
 * Rien ici ne touche au navigateur : la réduction d'image, elle, vit dans
 * `lib/features/profil/photo.ts` (règle 2 du CLAUDE.md). */

/** Côté maximal de la photo enregistrée, en pixels. Au-delà, on paie des
 *  octets qu'aucun écran n'affiche : la vue Profil rend l'avatar à 64 px,
 *  le rail à 32 — 256 couvre encore un écran à 4× sans y penser. */
export const PHOTO_COTE_MAX = 256;

/** Poids maximal de la dataURL décodée, en octets (64 Ko).
 *  Une photo est une entité comme une autre : elle est relue à chaque
 *  ouverture avec les profils, et elle voyage dans le blob de synchronisation.
 *  Un mégaoctet ici se paierait à chaque démarrage sur tous les appareils. */
export const PHOTO_MAX_OCTETS = 64 * 1024;

export interface ChampsProfil {
  email: string;
  metier: string;
  /** `null` = pas de photo : l'avatar génératif prend le relais. */
  photo: string | null;
}

/** Les trois champs du lot D, absence défaite. Accepte `undefined` : les vues
 *  travaillent souvent sur `profiles.find(...)`, qui peut ne rien rendre.
 *
 *  LA PHOTO EST VALIDÉE ICI, une fois. Retirer sa photo écrit une chaîne vide
 *  plutôt que d'effacer le champ — un `undefined` ne se distingue pas, dans une
 *  entité transportée telle quelle par la synchronisation, d'un champ jamais
 *  écrit. Et une valeur qui ne vient pas de notre réducteur (base modifiée à la
 *  main, ligne d'une version qui n'existe pas) n'est pas affichée du tout :
 *  l'avatar génératif reprend la main. */
export function profilChamps(p: Profile | undefined | null): ChampsProfil {
  return {
    email: p?.email ?? '',
    metier: p?.metier ?? '',
    photo: photoAcceptable(p?.photo) ? p.photo : null,
  };
}

/** Poids RÉEL, en octets, du contenu d'une dataURL base64.
 *
 *  On mesure la charge décodée, pas la longueur de la chaîne : base64 gonfle
 *  de 4/3, et comparer la chaîne à 64 Ko rejetterait des images de 48 Ko.
 *  Les `=` finaux ne sont pas des octets — les compter ferait mentir la
 *  mesure de un ou deux octets, ce qui suffit à faire échouer un cas limite. */
export function octetsDataUrl(dataUrl: string): number {
  const virgule = dataUrl.indexOf(',');
  if (virgule < 0) return 0;
  const charge = dataUrl.slice(virgule + 1);
  if (charge.length === 0) return 0;
  const bourrage = charge.endsWith('==') ? 2 : charge.endsWith('=') ? 1 : 0;
  return Math.floor((charge.length * 3) / 4) - bourrage;
}

/** Une photo est acceptable si c'est une dataURL JPEG et si elle tient sous la
 *  limite. Le format est contraint volontairement : c'est nous qui produisons
 *  la chaîne (`reduirePhoto`), donc tout ce qui n'en vient pas est soit une
 *  base modifiée à la main, soit une ligne reçue d'une version qui n'existe
 *  pas — dans les deux cas, on ne l'affiche pas. */
export function photoAcceptable(valeur: unknown): valeur is string {
  return (
    typeof valeur === 'string' &&
    valeur.startsWith('data:image/jpeg;base64,') &&
    octetsDataUrl(valeur) > 0 &&
    octetsDataUrl(valeur) <= PHOTO_MAX_OCTETS
  );
}

export interface Cadrage {
  x: number;
  y: number;
  cote: number;
}

/** Recadrage CARRÉ CENTRÉ d'une image `l × h`.
 *
 *  Un avatar est rond-carré partout dans le produit ; déformer l'image pour la
 *  faire entrer serait le seul choix qu'on ne peut pas rattraper à
 *  l'affichage. On coupe donc, et on coupe au centre : c'est là que se trouve
 *  un visage dans neuf photos sur dix. */
export function cadrageCarre(largeur: number, hauteur: number): Cadrage {
  const cote = Math.max(0, Math.min(largeur, hauteur));
  return {
    x: Math.floor((largeur - cote) / 2),
    y: Math.floor((hauteur - cote) / 2),
    cote,
  };
}

/** Côté de sortie : jamais plus de `PHOTO_COTE_MAX`, jamais AGRANDI.
 *  Étirer une vignette de 48 px à 256 ne montre rien de plus et pèse dix fois
 *  plus lourd. */
export const coteSortie = (cote: number): number => Math.min(cote, PHOTO_COTE_MAX);
