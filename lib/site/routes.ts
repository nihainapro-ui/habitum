/* Table des URL de la vitrine — tâche 7.1.
 *
 * Elle est la SOURCE UNIQUE de trois choses qui divergent toujours quand on les
 * écrit trois fois : le plan du site, les liens `hreflang`, et le fil d'Ariane.
 * Une page ajoutée ici apparaît dans `sitemap.xml`, gagne ses alternats de
 * langue et son `BreadcrumbList` — ou n'existe pas.
 *
 * Les créneaux sont TRADUITS : « /comparatifs/arreter-alcool » ne se référence
 * pas comme « /en/comparisons/quit-alcohol ». C'est tout l'objet d'une vitrine
 * bilingue — l'application, elle, n'a pas d'URL localisée et n'en a pas besoin
 * (i18n/config.ts).
 */

export const LANGUES_SITE = ['fr', 'en'] as const;
export type LangueSite = (typeof LANGUES_SITE)[number];

export const LANGUE_PAR_DEFAUT: LangueSite = 'fr';

/** Étiquette de langue complète, pour `og:locale` et `<html lang>`. */
export const ETIQUETTE_LANGUE: Record<LangueSite, string> = { fr: 'fr_FR', en: 'en_US' };

export const COMPARATIFS = ['habitnow', 'habitica', 'streaks'] as const;
export type Comparatif = (typeof COMPARATIFS)[number];

export const GUIDES = ['alcool', 'ecrans', 'pomodoro'] as const;
export type Guide = (typeof GUIDES)[number];

/** Pages simples, une par créneau. */
export const PAGES = [
  'accueil',
  'fonctionnalites',
  'comparatifs',
  'guides',
  'confidentialite',
  'mentions',
] as const;
export type Page = (typeof PAGES)[number];

const RACINE_COMPARATIFS: Record<LangueSite, string> = {
  fr: '/comparatifs',
  en: '/en/comparisons',
};

const RACINE_GUIDES: Record<LangueSite, string> = { fr: '/guides', en: '/en/guides' };

const CHEMIN_PAGE: Record<Page, Record<LangueSite, string>> = {
  accueil: { fr: '/', en: '/en' },
  fonctionnalites: { fr: '/fonctionnalites', en: '/en/features' },
  comparatifs: RACINE_COMPARATIFS,
  guides: RACINE_GUIDES,
  confidentialite: { fr: '/confidentialite', en: '/en/privacy' },
  mentions: { fr: '/mentions-legales', en: '/en/legal' },
};

const CRENEAU_COMPARATIF: Record<Comparatif, Record<LangueSite, string>> = {
  habitnow: { fr: 'habitnow', en: 'habitnow' },
  habitica: { fr: 'habitica', en: 'habitica' },
  streaks: { fr: 'streaks', en: 'streaks' },
};

const CRENEAU_GUIDE: Record<Guide, Record<LangueSite, string>> = {
  alcool: { fr: 'arreter-alcool', en: 'quit-alcohol' },
  ecrans: { fr: 'reduire-ecrans', en: 'reduce-screen-time' },
  pomodoro: { fr: 'methode-pomodoro', en: 'pomodoro-method' },
};

export const cheminPage = (page: Page, langue: LangueSite): string => CHEMIN_PAGE[page][langue];

export const creneauComparatif = (id: Comparatif, langue: LangueSite): string =>
  CRENEAU_COMPARATIF[id][langue];

export const creneauGuide = (id: Guide, langue: LangueSite): string => CRENEAU_GUIDE[id][langue];

export const cheminComparatif = (id: Comparatif, langue: LangueSite): string =>
  `${RACINE_COMPARATIFS[langue]}/${CRENEAU_COMPARATIF[id][langue]}`;

export const cheminGuide = (id: Guide, langue: LangueSite): string =>
  `${RACINE_GUIDES[langue]}/${CRENEAU_GUIDE[id][langue]}`;

/** Identifiant d'article retrouvé depuis un créneau d'URL — c'est ce dont les
 *  pages dynamiques ont besoin pour valider leur paramètre. */
export const comparatifDepuisCreneau = (
  creneau: string,
  langue: LangueSite,
): Comparatif | undefined => COMPARATIFS.find((id) => CRENEAU_COMPARATIF[id][langue] === creneau);

export const guideDepuisCreneau = (creneau: string, langue: LangueSite): Guide | undefined =>
  GUIDES.find((id) => CRENEAU_GUIDE[id][langue] === creneau);

/** Toutes les URL de la vitrine, chacune dans les deux langues.
 *  Consommée par `app/sitemap.ts` et par le test de plan du site. */
export type Adresse = { readonly [L in LangueSite]: string };

export const TOUTES_LES_ADRESSES: readonly Adresse[] = [
  ...PAGES.map((p) => ({ fr: cheminPage(p, 'fr'), en: cheminPage(p, 'en') })),
  ...COMPARATIFS.map((c) => ({ fr: cheminComparatif(c, 'fr'), en: cheminComparatif(c, 'en') })),
  ...GUIDES.map((g) => ({ fr: cheminGuide(g, 'fr'), en: cheminGuide(g, 'en') })),
];

/** L'adresse de la page en cours dans les deux langues, à partir de l'une
 *  d'elles. Sert aux `alternates` de `Metadata` et au sélecteur de langue. */
export function adresseDe(chemin: string): Adresse | undefined {
  return TOUTES_LES_ADRESSES.find((a) => a.fr === chemin || a.en === chemin);
}

/** Base absolue des URL. `NEXT_PUBLIC_SITE_URL` est déjà déclarée dans
 *  `.env.example` : on l'utilise, on n'en crée pas une seconde. */
export const BASE_SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const absolu = (chemin: string): string => new URL(chemin, BASE_SITE).toString();

/** L'application n'est PAS de la vitrine : elle n'apparaît ni au plan du site,
 *  ni dans les alternats. Son adresse ne vit qu'ici. */
export const CHEMIN_APPLICATION = '/app';

/* Le dépôt est PUBLIC (décision A du programme) : c'est l'argument de la
   section « ouvrez l'onglet réseau ». Un lien qui pointe ailleurs que sur le
   dépôt réellement publié transforme cet argument en affirmation invérifiable
   — d'où la variable, alignée sur `git remote`. */
export const DEPOT = 'https://github.com/nihainapro-ui/habitum';

/* Canal de contact de la politique de confidentialité.
 *
 * C'est le suivi d'anomalies du dépôt, et pas une adresse électronique
 * inventée : une page opposable qui donne un contact injoignable est pire
 * qu'une page qui n'en donne pas. Une vraie adresse peut être posée par
 * `NEXT_PUBLIC_SITE_CONTACT` sans toucher au code — c'est prévu pour la mise en
 * production (tâche 7.9 du plan 8). */
export const CONTACT = process.env.NEXT_PUBLIC_SITE_CONTACT ?? `${DEPOT}/issues`;

/** Hébergeur et région, tels que `vercel.json` et `DEPLOY.md` les fixent
 *  aujourd'hui. La décision C (Vercel Hobby ou Cloudflare Pages) est tranchée à
 *  la tâche 7.9 : si elle change l'hébergeur, elle change CETTE page. */
export const HEBERGEUR = { nom: 'Vercel', region: 'cdg1', zone: 'Paris' } as const;
