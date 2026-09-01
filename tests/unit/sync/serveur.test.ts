import { describe, expect, it } from 'vitest';
import { accepterLigne } from '../../../sync-server/src/logique';

const l = (updatedAt: string, blob = 'AAA') => ({ updatedAt, blob });

describe('arbitrage serveur', () => {
  it('accepte une ligne inconnue', () => {
    expect(accepterLigne(undefined, l('2026-09-01T10:00:00.000Z'))).toBe(true);
  });

  it('refuse une ligne périmée', () => {
    /* Sans ce refus, un appareil resté hors ligne une semaine écraserait au
       retour tout ce qui a été fait entre-temps. */
    expect(accepterLigne(l('2026-09-08T00:00:00.000Z'), l('2026-09-01T00:00:00.000Z'))).toBe(false);
  });

  it('applique exactement la même règle que le client', async () => {
    /* Si les deux règles divergent, un appareil pousse en boucle une ligne que
       le serveur refuse, sans que rien ne le signale. */
    const { distanteGagne } = await import('@/lib/sync/merge');
    const cas = [
      [undefined, l('2026-01-01T00:00:00.000Z')],
      [l('2026-01-01T00:00:00.000Z'), l('2026-01-02T00:00:00.000Z')],
      [l('2026-01-02T00:00:00.000Z'), l('2026-01-01T00:00:00.000Z')],
      [l('2026-01-01T00:00:00.000Z', 'A'), l('2026-01-01T00:00:00.000Z', 'Z')],
      [l('2026-01-01T00:00:00.000Z', 'Z'), l('2026-01-01T00:00:00.000Z', 'A')],
    ] as const;

    for (const [stockee, entrante] of cas) {
      expect(accepterLigne(stockee, entrante)).toBe(distanteGagne(stockee, entrante));
    }
  });
});
