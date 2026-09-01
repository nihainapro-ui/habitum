import { describe, expect, it } from 'vitest';
import { SyncErreur } from '@/lib/sync/types';
import { chiffrer, dechiffrer, deriverCles } from '@/lib/sync/crypto';

/* PBKDF2 à 600 000 itérations coûte ~0,3 s par dérivation : ces tests sont
   lents par construction, et c'est le prix de la résistance hors ligne. */
const CODE_A = 'K7M29QPX3RTZ8HNV4WBD';
const CODE_B = 'X4WBD8HNV3RTZ9QPXK7M';

describe('dérivation', () => {
  it('rend le même espace pour le même code', async () => {
    const un = await deriverCles(CODE_A);
    const deux = await deriverCles(CODE_A);
    expect(un.espace).toBe(deux.espace);
  });

  it('rend un espace de 32 caractères', async () => {
    const { espace } = await deriverCles(CODE_A);
    expect(espace).toHaveLength(32);
  });

  it('rend des espaces différents pour des codes différents', async () => {
    const un = await deriverCles(CODE_A);
    const deux = await deriverCles(CODE_B);
    expect(un.espace).not.toBe(deux.espace);
  });

  it('accepte un code tapé avec tirets et minuscules', async () => {
    const un = await deriverCles(CODE_A);
    const deux = await deriverCles('k7m2-9qpx-3rtz-8hnv-4wbd');
    expect(un.espace).toBe(deux.espace);
  });
}, 30_000);

describe('chiffrement', () => {
  it('fait un aller-retour sans rien perdre', async () => {
    const { cle } = await deriverCles(CODE_A);
    const valeur = { id: 'h1', name: 'Courir', tags: ['sport'], n: 42, vrai: true };
    const clair = await dechiffrer<typeof valeur>(cle, await chiffrer(cle, valeur));
    expect(clair).toEqual(valeur);
  });

  it('produit deux blobs différents pour la même valeur', async () => {
    /* Vecteur d'initialisation aléatoire : sans lui, deux entités identiques
       auraient le même chiffré, et le serveur pourrait les rapprocher. */
    const { cle } = await deriverCles(CODE_A);
    const un = await chiffrer(cle, { a: 1 });
    const deux = await chiffrer(cle, { a: 1 });
    expect(un).not.toBe(deux);
  });

  it('refuse un blob chiffré avec une autre clé', async () => {
    const a = await deriverCles(CODE_A);
    const b = await deriverCles(CODE_B);
    const blob = await chiffrer(a.cle, { secret: 'oui' });
    await expect(dechiffrer(b.cle, blob)).rejects.toBeInstanceOf(SyncErreur);
  });

  it('refuse un blob tronqué', async () => {
    const { cle } = await deriverCles(CODE_A);
    const blob = await chiffrer(cle, { a: 1 });
    await expect(dechiffrer(cle, blob.slice(0, 8))).rejects.toBeInstanceOf(SyncErreur);
  });
}, 30_000);
