import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/* D12 — une application local-first ne doit exécuter aucune fonction serveur
   pour afficher une page. Ce test lit le manifeste de build et échoue si une
   route redevient dynamique.

   Le piège est facile à retomber dedans : il suffit qu'un composant serveur
   appelle `cookies()`, `headers()` ou `searchParams` pour que TOUT l'arbre
   bascule en `ƒ`. C'est exactement ce que faisait `i18n/request.ts`. */

const MANIFESTE = '.next/prerender-manifest.json';

describe('sortie de build', () => {
  it('ne produit aucune route dynamique', () => {
    if (!existsSync(MANIFESTE)) {
      /* `npm run verify` construit avant de tester dans la CI ; en local, un
         développeur peut lancer les tests seuls. On ne fabrique pas un faux
         succès : on dit pourquoi le contrôle n'a pas eu lieu. */
      expect.fail(`${MANIFESTE} absent — lancer « npm run build » avant ce test.`);
    }

    const manifest = JSON.parse(readFileSync(MANIFESTE, 'utf8')) as {
      routes: Record<string, unknown>;
      dynamicRoutes: Record<string, unknown>;
    };

    expect(Object.keys(manifest.dynamicRoutes)).toEqual([]);
    expect(Object.keys(manifest.routes).length).toBeGreaterThanOrEqual(12);
  });

  it('prérend les onze vues sous /app, et la racine reste libre', () => {
    const manifest = JSON.parse(readFileSync(MANIFESTE, 'utf8')) as {
      routes: Record<string, unknown>;
    };
    const routes = Object.keys(manifest.routes);

    /* ADR-0007 : les onze vues vivent sous /app. La racine n'est pas une page —
       c'est une redirection temporaire, jusqu'à la vitrine de la phase 6. */
    for (const vue of [
      '/app',
      '/app/today',
      '/app/habits',
      '/app/tasks',
      '/app/goals',
      '/app/calendar',
      '/app/stats',
      '/app/timer',
      '/app/notes',
      '/app/profile',
      '/app/settings',
    ]) {
      expect(routes, `${vue} n'est pas prérendue`).toContain(vue);
    }
    expect(routes).not.toContain('/');
  });
});
