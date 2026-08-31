import { describe, expect, it } from 'vitest';
import {
  BOTTOM_ITEMS,
  estActif,
  itemActif,
  NAV_ITEMS,
  normaliserChemin,
} from '@/components/shell/nav-items';

/* La route courante décidait de trois choses à la fois — le titre de l'en-tête,
   l'entrée marquée du rail, celle de la barre basse — et elle les décidait par
   une égalité de chaînes. `next.config.mjs` pose `trailingSlash: true` sur
   l'export statique : dans l'APK, `usePathname()` rend `/app/tasks/`, et les
   trois se sont tues d'un coup. Le défaut ne se voit pas en développement, où
   la barre finale n'est pas ajoutée : il lui faut donc son propre test. */

describe('normaliserChemin', () => {
  it('retire la barre finale de l’export statique', () => {
    expect(normaliserChemin('/app/tasks/')).toBe('/app/tasks');
    expect(normaliserChemin('/app/')).toBe('/app');
  });

  it('laisse un chemin déjà nu intact', () => {
    expect(normaliserChemin('/app/tasks')).toBe('/app/tasks');
  });

  it('retire le `/index.html` par lequel la WebView entre', () => {
    /* `appStartPath` vaut `/app/index.html` (`capacitor.config.ts`). Traiter la
       seule barre finale était PIRE que ne rien faire : le serveur prérend
       `/app/` — donc « Tableau de bord » — pendant que le navigateur lit
       `/app/index.html` — donc « Habitum ». React abandonne l'hydratation sur
       ce désaccord de texte (#418) et `verifier-paquet` refuse le paquet. */
    expect(normaliserChemin('/app/index.html')).toBe('/app');
    expect(normaliserChemin('/app/tasks/index.html')).toBe('/app/tasks');
  });

  it('ne réduit aucune forme de la racine à la chaîne vide', () => {
    /* `''` correspondrait à un `href` vide, donc à n'importe quelle entrée mal
       déclarée. La racine reste `/`, qui n'est aucune des onze routes. */
    expect(normaliserChemin('/')).toBe('/');
    expect(normaliserChemin('/index.html')).toBe('/');
  });
});

describe('estActif', () => {
  it('reconnaît la route, avec ou sans barre finale', () => {
    expect(estActif('/app/habits', '/app/habits')).toBe(true);
    expect(estActif('/app/habits/', '/app/habits')).toBe(true);
  });

  it('n’active pas le tableau de bord depuis une autre vue', () => {
    /* `/app` est un préfixe des dix autres routes : une comparaison par
       préfixe le marquerait actif partout, barre finale ou non. */
    expect(estActif('/app/today', '/app')).toBe(false);
    expect(estActif('/app/today/', '/app')).toBe(false);
  });
});

describe('itemActif', () => {
  it('retrouve chacune des onze vues, sous ses trois formes de chemin', () => {
    for (const item of NAV_ITEMS) {
      expect(itemActif(item.href)?.href, item.href).toBe(item.href);
      expect(itemActif(`${item.href}/`)?.href, `${item.href}/`).toBe(item.href);
      /* La forme que sert la WebView de l'APK. */
      expect(itemActif(`${item.href}/index.html`)?.href, `${item.href}/index.html`).toBe(item.href);
    }
  });

  it('ne rend rien hors des routes déclarées', () => {
    expect(itemActif('/onboarding')).toBeUndefined();
    expect(itemActif('/')).toBeUndefined();
  });
});

describe('table de navigation', () => {
  it('la barre basse ne propose que des routes déclarées dans le rail', () => {
    const routes = new Set(NAV_ITEMS.map((i) => i.href));
    for (const item of BOTTOM_ITEMS) expect(routes.has(item.href), item.href).toBe(true);
  });

  it('les sept vues absentes de la barre basse existent bien', () => {
    /* C'est la raison d'être du tiroir mobile : sous 768 px, ces sept-là
       n'avaient aucun chemin d'accès au doigt. Si ce compte change, le tiroir
       change de justification — et ce test le dit. */
    const bas = new Set(BOTTOM_ITEMS.map((i) => i.href));
    expect(NAV_ITEMS.filter((i) => !bas.has(i.href))).toHaveLength(7);
  });
});
