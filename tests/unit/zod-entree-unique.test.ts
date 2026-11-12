import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from '@/lib/zod';

/* zod n'entre dans le produit que par `lib/zod.ts` — 12 novembre 2026.

   Ce fichier pose `jitless` AVANT qu'un schéma soit construit. Un seul
   `import { z } from 'zod'` ailleurs suffit à défaire cet ordre : zod essaie
   alors `new Function`, notre CSP le refuse, et le navigateur consigne une
   violation sur chaque page. Rien ne casse à l'écran — c'est Lighthouse qui
   tombe, et on cherche longtemps. */

const RACINES = ['app', 'components', 'lib'];
const SEULE_ENTREE = join('lib', 'zod.ts');

const fichiers = (dossier: string): string[] =>
  readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) return fichiers(chemin);
    return /\.tsx?$/.test(e.name) ? [chemin] : [];
  });

describe('zod, une seule entrée', () => {
  it('aucun fichier du produit n’importe zod directement', () => {
    const fautifs = RACINES.flatMap(fichiers)
      .filter((f) => f !== SEULE_ENTREE)
      .filter((f) => /from ['"]zod['"/]/.test(readFileSync(f, 'utf8')));

    expect(fautifs, 'importer `z` depuis `@/lib/zod`, jamais depuis `zod`').toEqual([]);
  });

  it('la compilation à la volée est coupée', () => {
    expect(z.config().jitless).toBe(true);
  });
});
