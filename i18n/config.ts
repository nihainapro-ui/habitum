/* Habitum n'a pas de segment de langue dans l'URL.
   Raison : la langue est une PRÉFÉRENCE DE PROFIL (`cfg.lang` dans le prototype),
   pas une propriété de la ressource — l'application est mono-utilisateur et
   local-first, il n'y a rien à référencer publiquement en deux langues.
   Le cookie ci-dessous porte le choix ; le reste du monde n'a pas à le connaître.
   Si un jour le site public a besoin d'URL localisées, passer à next-intl
   `localePrefix: 'always'` et introduire app/[locale]/ à ce moment-là. */

export const locales = ['fr', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';
export const LOCALE_COOKIE = 'habitum.lang';

export const isLocale = (v: unknown): v is Locale =>
  typeof v === 'string' && (locales as readonly string[]).includes(v);
