import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/* D12 — une application local-first ne doit exécuter aucune fonction serveur
   pour afficher une page. Ce test lit le manifeste de build et échoue si une
   route redevient dynamique.

   Le piège est facile à retomber dedans : il suffit qu'un composant serveur
   appelle `cookies()`, `headers()` ou `searchParams` pour que TOUT l'arbre
   bascule en `ƒ`. C'est exactement ce que faisait `i18n/request.ts`. */

const MANIFESTE = '.next/prerender-manifest.json';

type Manifeste = {
  routes: Record<string, unknown>;
  dynamicRoutes: Record<string, { fallback: unknown }>;
};

const lire = (): Manifeste => {
  if (!existsSync(MANIFESTE)) {
    /* `npm run verify` construit avant de tester dans la CI ; en local, un
       développeur peut lancer les tests seuls. On ne fabrique pas un faux
       succès : on dit pourquoi le contrôle n'a pas eu lieu. */
    expect.fail(`${MANIFESTE} absent — lancer « npm run build » avant ce test.`);
  }
  return JSON.parse(readFileSync(MANIFESTE, 'utf8')) as Manifeste;
};

describe('sortie de build', () => {
  it('ne rend aucune route à la demande', () => {
    const manifest = lire();

    /* ÉCART ASSUMÉ À LA VERSION PRÉCÉDENTE DE CE TEST, qui exigeait
       `dynamicRoutes` VIDE. La vitrine de la phase 6 introduit quatre segments
       `[creneau]` — trois comparatifs et trois guides, dans deux langues. Ils
       apparaissent donc au manifeste, et l'ancienne assertion tombait.

       Ce n'est pas l'invariant qui a changé, c'est sa formulation qui était
       trop étroite. Ce que D12 interdit, c'est qu'une requête déclenche un
       rendu ; `fallback: false` dit exactement l'inverse : tous les créneaux
       sont produits à la construction, et une URL inconnue rend un 404
       STATIQUE. Zéro invocation, comme avant — et c'est cela qu'on vérifie. */
    for (const [route, detail] of Object.entries(manifest.dynamicRoutes)) {
      expect(detail.fallback, `${route} peut être rendue à la demande`).toBe(false);
    }

    expect(Object.keys(manifest.routes).length).toBeGreaterThanOrEqual(12);
  });

  it('prérend les onze vues sous /app', () => {
    const routes = Object.keys(lire().routes);

    // ADR-0007 : les onze vues vivent sous /app.
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
  });

  it('prérend la vitrine, racine comprise, dans les deux langues', () => {
    const routes = Object.keys(lire().routes);

    /* La racine N'EST PLUS une redirection : depuis la tâche 7.1 elle sert la
       vitrine, et c'est la page qui se partage. Elle doit donc être prérendue,
       pas produite à la demande. */
    for (const page of [
      '/',
      '/fonctionnalites',
      '/comparatifs',
      '/comparatifs/habitnow',
      '/guides',
      '/guides/methode-pomodoro',
      '/confidentialite',
      '/mentions-legales',
      '/en',
      '/en/features',
      '/en/comparisons/habitnow',
      '/en/guides/pomodoro-method',
      '/en/privacy',
      '/en/legal',
    ]) {
      expect(routes, `${page} n'est pas prérendue`).toContain(page);
    }
  });
});
