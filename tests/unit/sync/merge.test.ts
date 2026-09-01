import { describe, expect, it } from 'vitest';
import { distanteGagne } from '@/lib/sync/merge';

const l = (updatedAt: string, blob = 'AAA') => ({ updatedAt, blob });

describe('arbitrage', () => {
  it('accepte une ligne inconnue localement', () => {
    expect(distanteGagne(undefined, l('2026-09-01T10:00:00.000Z'))).toBe(true);
  });

  it('accepte la plus récente', () => {
    expect(distanteGagne(l('2026-09-01T10:00:00.000Z'), l('2026-09-01T11:00:00.000Z'))).toBe(true);
  });

  it('refuse la plus ancienne', () => {
    /* C'est CE test qui empêche une suppression de ressusciter : l'appareil en
       retard renvoie sa version d'avant, elle est écartée. */
    expect(distanteGagne(l('2026-09-01T11:00:00.000Z'), l('2026-09-01T10:00:00.000Z'))).toBe(false);
  });

  it('départage deux horodatages identiques par le blob, dans le même sens des deux côtés', () => {
    /* Sans départage déterministe, deux appareils gardent chacun leur version
       et NE CONVERGENT JAMAIS. Le blob est comparable : les deux appareils
       voient les deux mêmes chaînes et choisissent la même. */
    const a = l('2026-09-01T10:00:00.000Z', 'AAA');
    const b = l('2026-09-01T10:00:00.000Z', 'ZZZ');
    expect(distanteGagne(a, b)).toBe(true);
    expect(distanteGagne(b, a)).toBe(false);
  });

  it("n'écrit pas une ligne strictement identique", () => {
    const a = l('2026-09-01T10:00:00.000Z', 'AAA');
    expect(distanteGagne(a, { ...a })).toBe(false);
  });

  it("converge quel que soit l'ordre d'arrivée", () => {
    /* Propriété de fond : appliquer {x, y, z} dans n'importe quel ordre donne
       le même gagnant. Sinon, deux appareils divergent selon leur latence. */
    const lignes = [
      l('2026-09-01T10:00:00.000Z', 'B'),
      l('2026-09-01T12:00:00.000Z', 'C'),
      l('2026-09-01T11:00:00.000Z', 'A'),
    ];
    const replier = (ordre: typeof lignes) =>
      ordre.reduce<(typeof lignes)[number] | undefined>(
        (acc, d) => (distanteGagne(acc, d) ? d : acc),
        undefined,
      );

    const attendu = replier(lignes);
    expect(replier([...lignes].reverse())).toEqual(attendu);
    expect(replier([lignes[1]!, lignes[0]!, lignes[2]!])).toEqual(attendu);
    expect(attendu?.blob).toBe('C');
  });
});
