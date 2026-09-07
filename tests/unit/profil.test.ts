import { describe, expect, it } from 'vitest';
import {
  cadrageCarre,
  coteSortie,
  octetsDataUrl,
  photoAcceptable,
  profilChamps,
  PHOTO_COTE_MAX,
  PHOTO_MAX_OCTETS,
  type Profile,
} from '@/lib/domain';

/* Lot D. Ces calculs sont NEUFS : ils n'ont pas d'oracle dans les 62 valeurs de
   référence, donc ce fichier fait foi si l'un d'eux change un jour. */

const profil = (p: Partial<Profile>): Profile => ({
  id: 'p1',
  name: 'Ada',
  handle: 'ada',
  glyph: '◉',
  hue: 188,
  role: 0,
  since: '2026-01-01',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...p,
});

/** Une dataURL JPEG dont la charge décodée pèse EXACTEMENT `octets`.
 *  Le bourrage est posé à la main : quatre caractères base64 valent trois
 *  octets, et sans les `=` finaux on ne sait pas viser un poids qui n'est pas
 *  un multiple de trois — or 64 Ko n'en est pas un, et c'est justement la
 *  valeur limite qu'il faut pouvoir viser. */
const photoDe = (octets: number): string => {
  const groupes = Math.ceil(octets / 3);
  const reste = octets % 3;
  let charge = 'A'.repeat(groupes * 4);
  if (reste === 1) charge = `${charge.slice(0, -2)}==`;
  else if (reste === 2) charge = `${charge.slice(0, -1)}=`;
  return `data:image/jpeg;base64,${charge}`;
};

describe('profilChamps', () => {
  it('rend des chaînes vides et pas de photo pour un profil d’avant le lot D', () => {
    /* LE CAS QUI COMPTE : un profil écrit par la version précédente, ou reçu
       d'un appareil resté en arrière. C'est exactement lui qui ferait planter
       une vue qui lirait `profil.email.trim()`. */
    expect(profilChamps(profil({}))).toEqual({ email: '', metier: '', photo: null });
  });

  it('rend ce qui est écrit quand c’est écrit', () => {
    const p = profil({ email: 'ada@exemple.org', metier: 'Analyste', photo: photoDe(120) });
    expect(profilChamps(p)).toEqual({
      email: 'ada@exemple.org',
      metier: 'Analyste',
      photo: photoDe(120),
    });
  });

  it('supporte l’absence totale de profil — `find()` peut ne rien rendre', () => {
    expect(profilChamps(undefined)).toEqual({ email: '', metier: '', photo: null });
    expect(profilChamps(null)).toEqual({ email: '', metier: '', photo: null });
  });
});

describe('octetsDataUrl', () => {
  it('mesure la charge DÉCODÉE, pas la longueur de la chaîne', () => {
    /* 4 caractères base64 = 3 octets. Mesurer la chaîne rejetterait une image
       de 48 Ko en la croyant à 64. */
    expect(octetsDataUrl('data:image/jpeg;base64,AAAA')).toBe(3);
    expect(octetsDataUrl('data:image/jpeg;base64,AAAAAAAA')).toBe(6);
  });

  it('ne compte pas le bourrage comme des octets', () => {
    expect(octetsDataUrl('data:image/jpeg;base64,AAA=')).toBe(2);
    expect(octetsDataUrl('data:image/jpeg;base64,AA==')).toBe(1);
  });

  it('rend zéro sur une chaîne qui n’est pas une dataURL', () => {
    expect(octetsDataUrl('')).toBe(0);
    expect(octetsDataUrl('pas une dataURL')).toBe(0);
    expect(octetsDataUrl('data:image/jpeg;base64,')).toBe(0);
  });
});

describe('photoAcceptable', () => {
  it('accepte une dataURL JPEG sous la limite', () => {
    expect(photoAcceptable(photoDe(1000))).toBe(true);
  });

  it('refuse au-delà de 64 Ko, accepte pile dessus', () => {
    expect(photoAcceptable(photoDe(PHOTO_MAX_OCTETS))).toBe(true);
    expect(photoAcceptable(photoDe(PHOTO_MAX_OCTETS + 3))).toBe(false);
  });

  it('refuse tout ce qui ne vient pas de notre réducteur', () => {
    /* Une URL distante affichée comme avatar ferait sortir une requête de
       l'appareil — exactement ce que la page de confidentialité promet qu'il
       n'arrive pas. */
    expect(photoAcceptable('https://exemple.org/photo.jpg')).toBe(false);
    expect(photoAcceptable('data:image/svg+xml;base64,AAAA')).toBe(false);
    expect(photoAcceptable(undefined)).toBe(false);
    expect(photoAcceptable(42)).toBe(false);
  });
});

describe('cadrageCarre', () => {
  it('coupe au centre une image en paysage', () => {
    expect(cadrageCarre(400, 300)).toEqual({ x: 50, y: 0, cote: 300 });
  });

  it('coupe au centre une image en portrait', () => {
    expect(cadrageCarre(300, 500)).toEqual({ x: 0, y: 100, cote: 300 });
  });

  it('ne coupe rien sur un carré', () => {
    expect(cadrageCarre(256, 256)).toEqual({ x: 0, y: 0, cote: 256 });
  });

  it('ne rend jamais de côté négatif', () => {
    expect(cadrageCarre(0, 100).cote).toBe(0);
  });
});

describe('coteSortie', () => {
  it('plafonne à 256', () => {
    expect(coteSortie(4000)).toBe(PHOTO_COTE_MAX);
  });

  it('n’AGRANDIT jamais une petite image', () => {
    expect(coteSortie(48)).toBe(48);
  });
});

describe('profilChamps et la photo — la validation vit là, et là seulement', () => {
  it('n’affiche pas une photo retirée (chaîne vide)', () => {
    expect(profilChamps(profil({ photo: '' })).photo).toBeNull();
  });

  it('n’affiche pas une valeur qui ne vient pas du réducteur', () => {
    expect(profilChamps(profil({ photo: 'https://exemple.org/p.jpg' })).photo).toBeNull();
    expect(profilChamps(profil({ photo: photoDe(PHOTO_MAX_OCTETS + 3) })).photo).toBeNull();
  });
});
