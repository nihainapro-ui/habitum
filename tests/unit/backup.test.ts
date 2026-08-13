import { describe, expect, it } from 'vitest';
import { addDays, dateKey, NAG_DAYS, shouldNagExport } from '@/lib/domain';

const NOW = new Date(2026, 7, 5);
const ilYA = (n: number) => dateKey(addDays(NOW, -n));

/* D8 — le rappel est un garde-fou, pas une réclame. Trois conditions, et
   chacune a son test : sinon la première régression le rendra bavard. */

describe('shouldNagExport', () => {
  it('rappelle un compte qui n’a jamais exporté', () => {
    expect(shouldNagExport({ lastExport: null, dismissed: false, hasData: true }, NOW)).toBe(true);
  });

  it('se tait sur un compte vide — il n’y a rien à perdre', () => {
    expect(shouldNagExport({ lastExport: null, dismissed: false, hasData: false }, NOW)).toBe(
      false,
    );
  });

  it('ne revient pas une fois refusé', () => {
    expect(shouldNagExport({ lastExport: null, dismissed: true, hasData: true }, NOW)).toBe(false);
  });

  it('laisse un mois de répit après un export', () => {
    expect(
      shouldNagExport({ lastExport: ilYA(NAG_DAYS - 1), dismissed: false, hasData: true }, NOW),
    ).toBe(false);
    expect(
      shouldNagExport({ lastExport: ilYA(NAG_DAYS), dismissed: false, hasData: true }, NOW),
    ).toBe(true);
  });
});
