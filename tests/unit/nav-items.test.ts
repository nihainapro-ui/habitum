import { describe, expect, it } from 'vitest';
import {
  BOTTOM_ITEMS,
  enteteMobile,
  estActif,
  ITEM_PLUS,
  itemActif,
  NAV_ITEMS,
  normaliserChemin,
  PLUS_TILES,
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
  it('retrouve chacune des douze vues, sous ses trois formes de chemin', () => {
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
  it('la barre basse porte Aujourd’hui, Habitudes, Tâches et Plus, dans cet ordre', () => {
    /* PDF p. 2 : « Une seule barre ». Le tableau de bord n'y est plus — il
       synthétise, il n'agit pas — et « Plus » n'est pas une vue du rail. */
    expect(BOTTOM_ITEMS.map((i) => i.href)).toEqual([
      '/app/today',
      '/app/habits',
      '/app/tasks',
      '/app/plus',
    ]);
    expect(BOTTOM_ITEMS[3]).toBe(ITEM_PLUS);
  });

  it('les douze vues sont toutes à deux appuis : barre, tuile de « Plus », ou carte de profil', () => {
    const atteignables = new Set([
      ...BOTTOM_ITEMS.map((i) => i.href),
      ...PLUS_TILES.map((i) => i.href),
      '/app/profile',
    ]);
    for (const item of NAV_ITEMS) expect(atteignables.has(item.href), item.href).toBe(true);
    /* Huit tuiles, ni plus ni moins : la grille de la maquette. */
    expect(PLUS_TILES).toHaveLength(8);
    expect(PLUS_TILES[0]?.href).toBe('/app');
  });

  it('« Plus » a un titre d’en-tête et un nom annoncé, comme les douze vues', () => {
    expect(itemActif('/app/plus')?.key).toBe('navPlus');
    expect(itemActif('/app/plus/index.html')?.key).toBe('navPlus');
    /* Mais il ne fait PAS partie du rail. */
    expect(NAV_ITEMS.map((i) => i.href)).not.toContain('/app/plus');
  });

  it('l’en-tête mobile crée le type courant sur Habitudes et Tâches, propose ailleurs', () => {
    expect(enteteMobile('/app/habits')).toEqual({ action: 'search', plus: 'habit' });
    expect(enteteMobile('/app/tasks')).toEqual({ action: 'date', plus: 'task' });
    expect(enteteMobile('/app/today')).toEqual({ action: 'date', plus: 'choice' });
    expect(enteteMobile('/app/goals')).toEqual({ action: null, plus: 'choice' });
    /* Rien à créer depuis les réglages ; un chemin inconnu garde le « + ». */
    expect(enteteMobile('/app/settings').plus).toBeNull();
    expect(enteteMobile(undefined).plus).toBe('choice');
  });

  it('les douze vues sont déclarées', () => {
    expect(NAV_ITEMS).toHaveLength(12);
    expect(NAV_ITEMS.map((i) => i.href)).toContain('/app/work');
  });
});
