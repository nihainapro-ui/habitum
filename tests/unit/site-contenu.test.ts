import { describe, expect, it } from 'vitest';
import { tousLesComparatifs } from '@/lib/site/contenu/comparatifs';
import { tousLesGuides } from '@/lib/site/contenu/guides';
import { compterMots, type Article } from '@/lib/site/contenu/types';
import { TOUTES_LES_ADRESSES, LANGUES_SITE, adresseDe } from '@/lib/site/routes';
import { textes } from '@/lib/site/textes';

/* Garde du contenu de fond — tâche 7.5.
 *
 * `npm run check:messages` verrouille la symétrie des LIBELLÉS ; il ne voit pas
 * les articles, qui vivent dans `lib/site/contenu/`. Ce fichier est leur
 * équivalent, et il vérifie ce que la règle éditoriale du plan exige
 * réellement : les deux langues existent, elles ont la même structure, chaque
 * article tient dans la fourchette de 800 à 1 500 mots, et chaque comparatif
 * est daté. */

const ARTICLES: [string, Article][] = [
  ...Object.entries(tousLesComparatifs).flatMap(([id, paire]) =>
    LANGUES_SITE.map((l): [string, Article] => [`comparatif ${id} (${l})`, paire[l]]),
  ),
  ...Object.entries(tousLesGuides).flatMap(([id, paire]) =>
    LANGUES_SITE.map((l): [string, Article] => [`guide ${id} (${l})`, paire[l]]),
  ),
];

describe('contenu de fond de la vitrine', () => {
  it('couvre trois comparatifs et trois guides, dans les deux langues', () => {
    expect(ARTICLES).toHaveLength(12);
  });

  it.each(ARTICLES)('%s tient entre 800 et 1 500 mots', (_nom, article) => {
    const mots = compterMots(article);
    expect(mots).toBeGreaterThanOrEqual(800);
    expect(mots).toBeLessThanOrEqual(1500);
  });

  it.each(ARTICLES)('%s porte un titre, un chapeau et une description', (_nom, article) => {
    expect(article.titre.length).toBeGreaterThan(15);
    expect(article.chapeau.length).toBeGreaterThan(80);
    /* La méta-description est tronquée au-delà d'environ 160 caractères : plus
       long, ce n'est pas plus riche, c'est coupé au milieu d'un mot. */
    expect(article.description.length).toBeGreaterThan(80);
    expect(article.description.length).toBeLessThanOrEqual(200);
  });

  it.each(ARTICLES)('%s est daté', (_nom, article) => {
    expect(article.publieLe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(article.reluLe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(article.reluLe >= article.publieLe).toBe(true);
  });

  it('les deux versions d’un article ont la même structure', () => {
    for (const paire of [...Object.values(tousLesComparatifs), ...Object.values(tousLesGuides)]) {
      const forme = (a: Article) => a.blocs.map((b) => b.t).join(',');
      expect(forme(paire.en)).toBe(forme(paire.fr));
    }
  });

  /* RÈGLE ÉDITORIALE : un comparatif affirme quelque chose sur un tiers, il
     doit donc dire où le vérifier. Un guide ne parle que d'Habitum. */
  it('chaque comparatif cite au moins une source officielle', () => {
    for (const paire of Object.values(tousLesComparatifs)) {
      for (const langue of LANGUES_SITE) {
        const sources = paire[langue].sources ?? [];
        expect(sources.length).toBeGreaterThan(0);
        for (const s of sources) expect(s.url).toMatch(/^https:\/\//);
      }
    }
  });
});

describe('table des URL de la vitrine', () => {
  it('chaque adresse existe dans les deux langues et se retrouve par son chemin', () => {
    for (const adresse of TOUTES_LES_ADRESSES) {
      expect(adresse.fr.startsWith('/')).toBe(true);
      expect(adresse.en.startsWith('/en')).toBe(true);
      expect(adresseDe(adresse.fr)).toEqual(adresse);
      expect(adresseDe(adresse.en)).toEqual(adresse);
    }
  });

  it('aucune adresse de vitrine ne mord sur l’application', () => {
    for (const adresse of TOUTES_LES_ADRESSES) {
      for (const langue of LANGUES_SITE) {
        expect(adresse[langue].startsWith('/app')).toBe(false);
      }
    }
  });

  it('les adresses sont uniques', () => {
    const toutes = TOUTES_LES_ADRESSES.flatMap((a) => [a.fr, a.en]);
    expect(new Set(toutes).size).toBe(toutes.length);
  });
});

describe('libellés de la vitrine', () => {
  it('les deux langues exposent exactement les mêmes clés', () => {
    const aplatir = (o: unknown, p = ''): string[] =>
      typeof o === 'object' && o !== null
        ? Object.entries(o).flatMap(([k, v]) => aplatir(v, `${p}${k}.`))
        : [p];
    expect(aplatir(textes('en'))).toEqual(aplatir(textes('fr')));
  });

  it('aucun libellé de vitrine n’est vide', () => {
    const vides: string[] = [];
    const parcourir = (o: unknown, p = ''): void => {
      if (typeof o === 'string') {
        if (o.trim() === '') vides.push(p);
      } else if (typeof o === 'object' && o !== null) {
        for (const [k, v] of Object.entries(o)) parcourir(v, `${p}${k}.`);
      }
    };
    parcourir(textes('fr'));
    parcourir(textes('en'));
    expect(vides).toEqual([]);
  });
});
