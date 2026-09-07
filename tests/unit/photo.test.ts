import { describe, expect, it, vi } from 'vitest';
import {
  chercherCharge,
  COTES_DE_REPLI,
  QUALITES,
  TYPES_PHOTO_ACCEPTES,
} from '@/lib/features/profil/photo';
import { PHOTO_COTE_MAX, PHOTO_MAX_OCTETS } from '@/lib/domain';

/* La boucle de réduction se teste SANS navigateur : c'est elle qui décide, le
   `<canvas>` ne fait qu'exécuter. On lui donne un encodeur simulé dont on
   connaît le poids, et on regarde ce qu'elle choisit. */

/** Une dataURL JPEG dont la charge décodée pèse EXACTEMENT `octets`. Le
 *  bourrage est posé à la main : sans les `=` finaux on ne saurait viser un
 *  poids qui n'est pas un multiple de trois — or 64 Ko n'en est pas un, et
 *  c'est justement la valeur limite qu'il faut pouvoir viser. */
const chargeDe = (octets: number): string => {
  const utiles = Math.max(octets, 1);
  const groupes = Math.ceil(utiles / 3);
  const reste = utiles % 3;
  let charge = 'A'.repeat(groupes * 4);
  if (reste === 1) charge = `${charge.slice(0, -2)}==`;
  else if (reste === 2) charge = `${charge.slice(0, -1)}=`;
  return `data:image/jpeg;base64,${charge}`;
};

/** Encodeur simulé : le poids décroît avec le côté et la qualité, comme un
 *  vrai encodeur JPEG. `facteur` règle la « lourdeur » de l'image. */
const encodeurSimule = (facteur: number) => (cote: number, qualite: number) =>
  chargeDe(Math.round(cote * cote * qualite * facteur));

describe('chercherCharge', () => {
  it('garde la MEILLEURE qualité qui tient — on ne dégrade pas pour rien', () => {
    const essais: Array<[number, number]> = [];
    const charge = chercherCharge(1200, (cote, qualite) => {
      essais.push([cote, qualite]);
      return encodeurSimule(0.5)(cote, qualite);
    });

    expect(charge).not.toBeNull();
    /* Un seul essai : le plus grand côté autorisé, à la meilleure qualité. La
       boucle s'arrête dès qu'un essai passe. */
    expect(essais).toEqual([[PHOTO_COTE_MAX, QUALITES[0]]]);
  });

  it('n’AGRANDIT pas une image déjà petite', () => {
    const essais: number[] = [];
    chercherCharge(64, (cote, qualite) => {
      essais.push(cote);
      return encodeurSimule(0.001)(cote, qualite);
    });
    expect(essais[0]).toBe(64);
    expect(Math.max(...essais)).toBe(64);
  });

  it('redescend le côté quand même la qualité la plus basse ne suffit pas', () => {
    const essais: Array<[number, number]> = [];
    /* Rien ne passe au-dessus de 192 px, tout passe en dessous : c'est
       exactement le cas que les côtés de repli existent pour couvrir. */
    const charge = chercherCharge(1000, (cote, qualite) => {
      essais.push([cote, qualite]);
      return chargeDe(cote > 192 ? PHOTO_MAX_OCTETS * 2 : 1000);
    });

    expect(charge).not.toBeNull();
    expect(essais.length).toBe(QUALITES.length + 1);
    expect(essais.at(-1)?.[0]).toBe(COTES_DE_REPLI[0]);
  });

  it('rend `null` plutôt qu’une charge trop lourde — l’appelant n’a rien à mesurer', () => {
    expect(chercherCharge(1000, () => chargeDe(PHOTO_MAX_OCTETS * 4))).toBeNull();
  });

  it('essaie toutes les combinaisons avant d’abandonner, et pas une de plus', () => {
    const encoder = vi.fn(() => chargeDe(PHOTO_MAX_OCTETS * 4));
    chercherCharge(4000, encoder);
    expect(encoder).toHaveBeenCalledTimes((1 + COTES_DE_REPLI.length) * QUALITES.length);
  });

  it('accepte une charge PILE à la limite', () => {
    /* `<=` et non `<` : une image de 65 536 octets exactement est acceptable,
       et la refuser ferait dégrader la qualité pour un octet. */
    expect(chercherCharge(256, () => chargeDe(PHOTO_MAX_OCTETS))).not.toBeNull();
  });
});

describe('types acceptés', () => {
  it('n’accepte que des images — une entrée de fichier ouverte à tout ferait choisir un PDF', () => {
    for (const type of TYPES_PHOTO_ACCEPTES.split(',')) {
      expect(type.startsWith('image/')).toBe(true);
    }
  });
});
