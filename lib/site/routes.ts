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
 *  `.env.example` : on l'utilise, on n'en crée pas une seconde.
 *
 *  POURQUOI CE N'EST PAS UN SIMPLE `??` — défaut trouvé au premier déploiement
 *  réel, le 25 août 2026. Une variable d'environnement DÉCLARÉE MAIS VIDE est
 *  l'erreur la plus banale d'une mise en ligne, et `??` ne la voit pas : il ne
 *  se déclenche que sur `null` et `undefined`, jamais sur `''`. `BASE_SITE`
 *  valait donc la chaîne vide, et `new URL(chemin, '')` levait
 *  `ERR_INVALID_URL` au fond de la collecte de pages :
 *
 *      Failed to collect configuration for /en/comparisons/[creneau]
 *      TypeError: Invalid URL — input: ''
 *
 *  Le message ne nommait NI la variable, NI le fichier, NI ce qu'on attendait.
 *  Quarante secondes de build pour apprendre qu'un champ était vide.
 *
 *  Trois règles en découlent :
 *  1. vide ou blanc == absente, donc repli sur le local, comme si rien n'avait
 *     été posé ;
 *  2. une valeur PRÉSENTE mais invalide échoue TÔT et se nomme — mieux vaut un
 *     build rouge lisible qu'une vitrine qui annonce `localhost` aux moteurs ;
 *  3. on rend l'ORIGINE, ce qui retire la barre finale au lieu de l'interdire.
 *     Une consigne qu'un humain doit respecter à la main est une consigne qui
 *     sera oubliée ; `new URL().origin` la rend sans objet. */
function baseDuSite(): string {
  const brut = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!brut) return 'http://localhost:3000';

  let adresse: URL;
  try {
    adresse = new URL(brut);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL invalide : « ${brut} ». Attendu une URL absolue, ` +
        'par exemple https://exemple.tld — la barre finale, elle, est retirée toute seule.',
    );
  }

  if (adresse.protocol !== 'https:' && adresse.protocol !== 'http:') {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL doit être en http ou https : « ${brut} » est en ` +
        `« ${adresse.protocol} ».`,
    );
  }

  return adresse.origin;
}

export const BASE_SITE = baseDuSite();

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

/** Hébergeur et région — **décision C, tranchée le 18 août 2026 : Vercel Hobby**.
 *
 *  Le produit est NON COMMERCIAL, ce qui rend le plan Hobby légitime : ses
 *  conditions ne l'interdisent qu'à l'usage commercial. C'est aussi ce qui rend
 *  la décision durable, et pas seulement provisoire.
 *
 *  LA CONTRAINTE QUI VA AVEC, et elle vaut pour la suite : Hobby interdit TOUTE
 *  monétisation. Ni dons rattachés au produit, ni synchronisation payante — le
 *  programme envisageait les deux (décision F, et la v1.1). Si l'une revient, il
 *  faut Cloudflare Pages ou Vercel Pro, et il faut en changer AVANT
 *  l'indexation : déplacer un domaine déjà référencé coûte du référencement.
 *
 *  Cette page est opposable : si l'hébergeur change, elle change avec lui. */
export const HEBERGEUR = { nom: 'Vercel', region: 'cdg1', zone: 'Paris' } as const;
