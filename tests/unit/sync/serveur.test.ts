import { describe, expect, it } from 'vitest';
import { accepterLigne, ligneValide } from '../../../sync-server/src/logique';

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

describe('validation des lignes entrantes', () => {
  /* Le corps JSON d'une requête n'a aucune forme garantie : une ligne peut
     manquer un champ, ou ne pas être un objet du tout. Ces cas doivent être
     ignorés silencieusement (`continue` côté Worker), jamais planter — voir
     le commentaire de `ligneValide` dans sync-server/src/logique.ts. */

  it('rejette une ligne sans kind', () => {
    expect(ligneValide({ id: 'x', updatedAt: '2026-01-01T00:00:00.000Z', blob: 'AAA' })).toBe(false);
  });

  it('rejette une ligne sans id', () => {
    expect(ligneValide({ kind: 'x', updatedAt: '2026-01-01T00:00:00.000Z', blob: 'AAA' })).toBe(false);
  });

  it('rejette une ligne null', () => {
    expect(ligneValide(null)).toBe(false);
  });

  it('rejette une ligne qui n’est pas un objet', () => {
    expect(ligneValide('AAA')).toBe(false);
    expect(ligneValide(42)).toBe(false);
    expect(ligneValide(undefined)).toBe(false);
  });

  it('accepte une ligne complète', () => {
    expect(
      ligneValide({ kind: 'x', id: 'y', updatedAt: '2026-01-01T00:00:00.000Z', blob: 'AAA' }),
    ).toBe(true);
  });
});
