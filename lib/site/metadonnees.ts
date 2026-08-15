import type { Metadata } from 'next';
import { BASE_SITE, ETIQUETTE_LANGUE, adresseDe, cheminPage, type LangueSite } from './routes';

/* Métadonnées de la vitrine — tâche 7.2.
 *
 * Fabriquées à partir de la table des URL (`routes.ts`), jamais recopiées page
 * par page : les `hreflang` d'une page ajoutée à la main sont les premiers à
 * pointer sur une adresse qui n'existe plus.
 *
 * `metadataBase` vient de `NEXT_PUBLIC_SITE_URL`, DÉJÀ déclarée dans
 * `.env.example`. On l'utilise, on n'en crée pas une seconde. */

const TITRE_MODELE = '%s · Habitum';

/** Le socle commun aux deux layouts racines du site. */
export function socleMetadonnees(langue: LangueSite): Metadata {
  return {
    metadataBase: new URL(BASE_SITE),
    title: { default: 'Habitum', template: TITRE_MODELE },
    openGraph: {
      type: 'website',
      siteName: 'Habitum',
      locale: ETIQUETTE_LANGUE[langue],
      alternateLocale: ETIQUETTE_LANGUE[langue === 'fr' ? 'en' : 'fr'],
    },
    twitter: { card: 'summary_large_image' },
    /* La vitrine est le SEUL actif indexable du projet (tâche 7.3).
       `max-image-preview: large` sert l'aperçu social ; le reste de la
       configuration `robots` vit dans `app/robots.ts`. */
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    applicationName: 'Habitum',
    creator: 'Habitum',
    publisher: 'Habitum',
  };
}

/** Métadonnées d'une page, avec sa canonique et ses deux alternats de langue.
 *  `chemin` est l'adresse de la page DANS SA LANGUE. */
export function metadonneesPage(options: {
  langue: LangueSite;
  chemin: string;
  titre: string;
  description: string;
  /** Titre déjà porteur de la marque : ne pas lui appliquer le modèle.
   *  « Habitum — le suivi d'habitudes sans compte · Habitum » est le genre de
   *  titre qu'on laisse passer une fois et qui reste des années. */
  titreEntier?: boolean;
}): Metadata {
  const paire = adresseDe(options.chemin);
  const alternats = paire ?? {
    fr: cheminPage('accueil', 'fr'),
    en: cheminPage('accueil', 'en'),
  };

  return {
    title: options.titreEntier ? { absolute: options.titre } : options.titre,
    description: options.description,
    alternates: {
      canonical: options.chemin,
      languages: {
        fr: alternats.fr,
        en: alternats.en,
        /* `x-default` désigne la page servie à qui n'a pas de préférence.
           Sans elle, un moteur choisit — et il choisit mal aussi souvent
           qu'il choisit bien. */
        'x-default': alternats.fr,
      },
    },
    /* `type` et `siteName` sont REPOSÉS ici, et ce n'est pas une redondance :
       Next REMPLACE les clés `openGraph` et `twitter` du parent au lieu de les
       fusionner champ par champ. Sans ces lignes, `og:type` disparaît de toutes
       les pages et l'aperçu social retombe sur une vignette carrée à image
       rognée. Constaté sur le rendu, pas supposé — c'est le test
       `tests/e2e/seo.spec.ts` qui l'a relevé. */
    openGraph: {
      type: 'website',
      siteName: 'Habitum',
      title: options.titre,
      description: options.description,
      url: options.chemin,
      locale: ETIQUETTE_LANGUE[options.langue],
      alternateLocale: ETIQUETTE_LANGUE[options.langue === 'fr' ? 'en' : 'fr'],
    },
    twitter: {
      card: 'summary_large_image',
      title: options.titre,
      description: options.description,
    },
  };
}
