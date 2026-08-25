import { afterEach, describe, expect, it, vi } from 'vitest';

/* NEXT_PUBLIC_SITE_URL — le défaut du premier déploiement réel (25 août 2026).
 *
 * Une variable DÉCLARÉE MAIS VIDE faisait échouer le build sur
 * `TypeError: Invalid URL — input: ''`, au fond de la collecte de pages, sans
 * nommer ni la variable ni ce qu'on attendait. `??` ne se déclenche pas sur `''`.
 *
 * `BASE_SITE` est une constante de module : chaque cas doit donc réimporter le
 * module avec son propre environnement. */
const avec = async (valeur: string | undefined): Promise<string> => {
  vi.resetModules();
  if (valeur === undefined) delete process.env['NEXT_PUBLIC_SITE_URL'];
  else process.env['NEXT_PUBLIC_SITE_URL'] = valeur;
  const { BASE_SITE } = await import('@/lib/site/routes');
  return BASE_SITE;
};

afterEach(() => {
  delete process.env['NEXT_PUBLIC_SITE_URL'];
});

describe('BASE_SITE', () => {
  it('se replie sur le local quand la variable est absente', async () => {
    await expect(avec(undefined)).resolves.toBe('http://localhost:3000');
  });

  /* LE cas du 25 août : Vercel crée la variable, le champ est laissé vide. */
  it('traite une variable VIDE comme absente, au lieu de casser le build', async () => {
    await expect(avec('')).resolves.toBe('http://localhost:3000');
  });

  it('traite une variable faite d’espaces comme absente', async () => {
    await expect(avec('   ')).resolves.toBe('http://localhost:3000');
  });

  it('retire la barre finale au lieu de l’interdire', async () => {
    await expect(avec('https://exemple.tld/')).resolves.toBe('https://exemple.tld');
  });

  it('accepte une URL normale', async () => {
    await expect(avec('https://exemple.tld')).resolves.toBe('https://exemple.tld');
  });

  it('tolère les espaces autour de la valeur', async () => {
    await expect(avec('  https://exemple.tld  ')).resolves.toBe('https://exemple.tld');
  });

  /* Une valeur PRÉSENTE mais fausse ne doit pas se replier en silence : une
     vitrine qui annonce `localhost` aux moteurs est pire qu'un build rouge. */
  it('échoue en NOMMANT la variable quand la valeur est présente mais invalide', async () => {
    await expect(avec('pas-une-url')).rejects.toThrow(/NEXT_PUBLIC_SITE_URL invalide/);
  });

  it('refuse un protocole qui n’est ni http ni https', async () => {
    await expect(avec('ftp://exemple.tld')).rejects.toThrow(/http ou https/);
  });
});
