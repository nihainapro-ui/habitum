import { DEPOT, absolu, cheminPage, type LangueSite, ETIQUETTE_LANGUE } from '@/lib/site/routes';
import { textes } from '@/lib/site/textes';

/* Données structurées — tâche 7.4.
 *
 * Deux notes qui ont chacune coûté une décision :
 *
 * 1. AUCUN `dangerouslySetInnerHTML`. C'est la voie que la documentation de
 *    Next recommande pour le JSON-LD, et le dépôt l'interdit — un test de
 *    `tests/e2e/headers.spec.ts` échoue si le motif réapparaît dans
 *    `app/`, `components/` ou `lib/`. Il se trouve que React ne réencode pas
 *    le texte d'une balise `<script>` : un enfant textuel suffit. Le sérialiseur
 *    ci-dessous échappe malgré tout `<` en `<`, ce qui rend un
 *    « </script> » inséré dans une chaîne structurellement impossible à
 *    refermer, quelle que soit la provenance du contenu.
 *
 * 2. AUCUN `nonce`. Le plan en prescrivait un ; ADR-0007 a tranché l'inverse et
 *    pour une raison qui n'a pas changé : un nonce impose un rendu dynamique,
 *    donc une invocation serveur par affichage, sur un produit dont l'argument
 *    est qu'il n'en fait aucune. La CSP tolère `script-src 'unsafe-inline'`,
 *    tolérance connue, mesurée et testée. Le JSON-LD n'est de toute façon pas
 *    exécutable.
 */

export type BlocJsonLd = Record<string, unknown>;

/** Sérialisation sûre : `<` ne peut plus fermer la balise qui la porte. */
export const serialiser = (bloc: BlocJsonLd): string =>
  JSON.stringify(bloc).replace(/</g, '\\u003c');

const identiteEditeur = () => ({
  '@type': 'Organization',
  name: 'Habitum',
  url: absolu('/'),
});

/** Le produit lui-même. Déclaré GRATUIT, parce qu'il l'est : `price: '0'` est
 *  un engagement lisible par une machine, pas une formule marketing. */
export function applicationLogicielle(langue: LangueSite): BlocJsonLd {
  const t = textes(langue);
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Habitum',
    url: absolu(cheminPage('accueil', langue)),
    description: t.accueil.description,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript and IndexedDB.',
    inLanguage: ['fr', 'en'],
    isAccessibleForFree: true,
    license: 'https://opensource.org/licenses/MIT',
    codeRepository: DEPOT,
    publisher: identiteEditeur(),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
  };
}

/** Questions fréquentes. Les mêmes que celles affichées : une `FAQPage` qui
 *  déclare une question absente de la page est un signal trompeur, et c'est
 *  aussi ce que les moteurs sanctionnent. */
export function questionsFrequentes(langue: LangueSite): BlocJsonLd {
  const a = textes(langue).accueil;
  const paires: [string, string][] = [
    [a.q1, a.r1],
    [a.q2, a.r2],
    [a.q3, a.r3],
    [a.q4, a.r4],
    [a.q5, a.r5],
    [a.q6, a.r6],
    [a.q7, a.r7],
    [a.q8, a.r8],
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: langue,
    mainEntity: paires.map(([question, reponse]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: reponse },
    })),
  };
}

export type Miette = { nom: string; chemin: string };

export function filDAriane(miettes: readonly Miette[]): BlocJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: miettes.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: m.nom,
      item: absolu(m.chemin),
    })),
  };
}

/** Page de fond : comparatif ou guide. `dateModified` est la date de relecture
 *  affichée — la règle éditoriale de la tâche 7.5 exige qu'elle existe, et il
 *  n'y a aucune raison de la cacher aux machines. */
export function pageDeFond(options: {
  langue: LangueSite;
  titre: string;
  description: string;
  chemin: string;
  publieLe: string;
  reluLe: string;
}): BlocJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: options.titre,
    description: options.description,
    inLanguage: ETIQUETTE_LANGUE[options.langue],
    datePublished: options.publieLe,
    dateModified: options.reluLe,
    mainEntityOfPage: { '@type': 'WebPage', '@id': absolu(options.chemin) },
    author: identiteEditeur(),
    publisher: identiteEditeur(),
  };
}
