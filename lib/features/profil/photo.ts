import { cadrageCarre, coteSortie, octetsDataUrl, PHOTO_MAX_OCTETS } from '@/lib/domain';

/* Réduction de la photo de profil — spec du 2026-09-02 § Lot D.
 *
 * TOUT SE PASSE SUR L'APPAREIL. Pas de requête, pas de service de
 * redimensionnement, pas de dépôt intermédiaire : la page de confidentialité
 * promet qu'aucune donnée ne part, et une photo est une donnée comme une autre.
 * Un `<canvas>` suffit.
 *
 * Ce fichier n'est PAS dans `lib/domain/` (règle 2 du CLAUDE.md) : il a besoin
 * du navigateur. Ce qui pouvait descendre dans le domaine y est descendu —
 * `cadrageCarre`, `coteSortie`, `octetsDataUrl`, la limite de poids. Ce qui
 * reste ici est de la plomberie, plus une décision : l'échelle de qualité.
 *
 * L'ÉCHELLE EST TESTÉE SANS NAVIGATEUR (`chercherCharge`), parce que c'est elle
 * qui décide, et qu'une décision non testée dans un fichier « de plomberie »
 * est une décision qui dérive. */

/** Ce que l'entrée de fichier accepte. Le format de SORTIE est toujours JPEG :
 *  un PNG de 256 px pèse volontiers dix fois le JPEG équivalent, et une photo
 *  n'a pas besoin de transparence. */
export const TYPES_PHOTO_ACCEPTES = 'image/jpeg,image/png,image/webp,image/gif,image/bmp';

/** Ce que le réducteur peut rater, dit en un mot — la vue doit distinguer
 *  « ce fichier n'est pas une image » de « votre navigateur ne sait pas
 *  faire », les deux ne se corrigent pas de la même façon. */
export type EchecPhoto = 'illisible' | 'impossible';

export class ErreurPhoto extends Error {
  constructor(readonly genre: EchecPhoto) {
    super(genre);
    this.name = 'ErreurPhoto';
  }
}

/** Qualités JPEG essayées, dans l'ordre. La première qui tient sous la limite
 *  gagne : on ne dégrade jamais plus que nécessaire. */
export const QUALITES = [0.82, 0.7, 0.58, 0.45, 0.32] as const;

/** Si même la qualité la plus basse ne suffit pas — une photo très texturée,
 *  du bruit de capteur — on redescend le côté. Un avatar de 160 px reste net
 *  aux tailles où il est rendu (64 px, 32 px). */
export const COTES_DE_REPLI = [192, 160, 128] as const;

/** Encode le carré déjà recadré, à `cote` pixels et à la qualité donnée, et
 *  rend la dataURL. C'est le seul point de contact avec le navigateur. */
export type Encodeur = (cote: number, qualite: number) => string;

/** Cherche la première charge qui tient sous `PHOTO_MAX_OCTETS`.
 *
 *  Rend `null` si aucune combinaison n'y arrive — l'appelant décide alors quoi
 *  dire ; il ne reçoit JAMAIS une image trop lourde qu'il aurait à mesurer
 *  lui-même. C'est la boucle qui garantit l'invariant, une fois. */
export function chercherCharge(cotePlein: number, encoder: Encodeur): string | null {
  const plein = coteSortie(cotePlein);
  const cotes = [plein, ...COTES_DE_REPLI.filter((c) => c < plein)];
  for (const cote of cotes) {
    for (const qualite of QUALITES) {
      const charge = encoder(cote, qualite);
      if (octetsDataUrl(charge) <= PHOTO_MAX_OCTETS) return charge;
    }
  }
  return null;
}

/** Source peignable, plus ses dimensions — `createImageBitmap` et `Image` les
 *  portent toutes deux, mais pas sous le même type. */
type Peignable = CanvasImageSource & { width: number; height: number };

/** Décode le fichier en quelque chose que `drawImage` sait peindre.
 *  `createImageBitmap` d'abord — il décode hors du fil principal ; repli sur
 *  une balise image pour les moteurs qui ne l'ont pas encore. */
async function decoder(fichier: File): Promise<Peignable> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(fichier);
    } catch {
      throw new ErreurPhoto('illisible');
    }
  }

  const url = URL.createObjectURL(fichier);
  try {
    return await new Promise<HTMLImageElement>((resoudre, rejeter) => {
      const img = new Image();
      img.onload = () => resoudre(img);
      img.onerror = () => rejeter(new ErreurPhoto('illisible'));
      img.src = url;
    });
  } finally {
    /* Libérée dès que l'image est décodée : une URL d'objet retient le fichier
       entier en mémoire tant qu'elle vit. */
    URL.revokeObjectURL(url);
  }
}

/** Réduit une photo choisie par l'utilisateur en dataURL JPEG carrée,
 *  ≤ 256 px de côté et ≤ 64 Ko. Lève `ErreurPhoto` plutôt que de rendre une
 *  chaîne qu'il faudrait vérifier ailleurs. */
export async function reduirePhoto(fichier: File): Promise<string> {
  const image = await decoder(fichier);
  const { x, y, cote } = cadrageCarre(image.width, image.height);
  if (cote <= 0) throw new ErreurPhoto('illisible');

  const toile = document.createElement('canvas');
  const contexte = toile.getContext('2d');
  if (!contexte) throw new ErreurPhoto('impossible');

  const charge = chercherCharge(cote, (sortie, qualite) => {
    toile.width = sortie;
    toile.height = sortie;
    /* Repeint À CHAQUE essai : changer `width` remet la toile à blanc, et une
       toile vide encodée donnerait un carré noir léger — qui passerait la
       limite de poids sans qu'on s'aperçoive que l'image a disparu. */
    contexte.clearRect(0, 0, sortie, sortie);
    contexte.drawImage(image, x, y, cote, cote, 0, 0, sortie, sortie);
    return toile.toDataURL('image/jpeg', qualite);
  });

  if (image instanceof ImageBitmap) image.close();
  if (!charge) throw new ErreurPhoto('impossible');
  return charge;
}
