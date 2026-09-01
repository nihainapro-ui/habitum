import { describe, expect, it } from 'vitest';
import {
  ALPHABET,
  LONGUEUR_CODE,
  codeValide,
  formaterCode,
  genererCode,
  normaliserCode,
} from '@/lib/sync/code';

describe("code d'appairage", () => {
  it("rend 20 caractères de l'alphabet, sans tiret", () => {
    const c = genererCode();
    expect(c).toHaveLength(LONGUEUR_CODE);
    for (const ch of c) expect(ALPHABET).toContain(ch);
  });

  it('ne se répète pas', () => {
    /* 100 bits d\'entropie : deux tirages identiques sur cent signalent un
       générateur cassé, pas un coup de chance. */
    const tirages = new Set(Array.from({ length: 100 }, genererCode));
    expect(tirages.size).toBe(100);
  });

  it('exclut les caractères ambigus', () => {
    for (const ch of ['I', 'L', 'O', 'U']) expect(ALPHABET).not.toContain(ch);
  });

  it("normalise ce qu'un humain tape", () => {
    /* Minuscules, tirets, espaces, et les quatre confusions classiques :
       l\'utilisateur lit « O » là où le code porte un zéro. */
    expect(normaliserCode(' k7m2-9qpx 3rtz-8hnv-4wbd ')).toBe('K7M29QPX3RTZ8HNV4WBD');
    expect(normaliserCode('OIL0000000000000000U')).toBe('0110000000000000000V');
  });

  it('valide un code correct et refuse le reste', () => {
    const c = genererCode();
    expect(codeValide(c)).toBe(true);
    expect(codeValide(c.slice(0, 19))).toBe(false);
    expect(codeValide(`${c}X`)).toBe(false);
    expect(codeValide('')).toBe(false);
  });

  it('affiche en cinq groupes de quatre', () => {
    expect(formaterCode('K7M29QPX3RTZ8HNV4WBD')).toBe('K7M2-9QPX-3RTZ-8HNV-4WBD');
  });
});
