/* Les DOUZE vues, dans les trois groupes du rail du prototype.
   Déclarées UNE SEULE FOIS : le rail, la barre basse et la région annoncée
   lisent la même liste. Deux listes divergent toujours. */

import type { IconName } from '@/components/ui/Icon';

export interface NavItem {
  href: string;
  /** Clé de libellé dans `messages/*.json`, espace `app`. */
  key: string;
  /** Clé du SUR-TITRE affiché sous le titre, dans l'en-tête. Le prototype le
   *  place là (`head.sub`, ligne 215), pas dans le contenu : c'est ce qui
   *  laisse la vue commencer directement par sa donnée. */
  subKey: string;
  /** Icône Lucide du rail et de la barre basse. 04-DESIGN-TOKENS.md § Icônes :
   *  Lucide pour la navigation, les glyphes typographiques restant réservés aux
   *  marqueurs de catégorie. Replié, le rail n'affiche QUE cette icône — elle
   *  n'est donc pas décorative, et son entrée porte un nom accessible. */
  icon: IconName;
}

export interface NavGroup {
  /** Clé du titre de groupe. */
  key: string;
  items: NavItem[];
}

/* ADR-0007 : l'application vit sous /app. */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'grpSpace',
    items: [
      { href: '/app', key: 'navDash', icon: 'dash', subKey: 'dashSub' },
      { href: '/app/today', key: 'navToday', icon: 'today', subKey: 'todaySub' },
      { href: '/app/calendar', key: 'navCal', icon: 'calendar', subKey: 'calSub' },
    ],
  },
  {
    key: 'grpTrack',
    items: [
      { href: '/app/habits', key: 'navHabits', icon: 'habits', subKey: 'habitsSubT' },
      { href: '/app/tasks', key: 'navTasks', icon: 'tasks', subKey: 'tasksSub' },
      { href: '/app/goals', key: 'navGoals', icon: 'goals', subKey: 'goalsSub' },
      { href: '/app/stats', key: 'navStats', icon: 'stats', subKey: 'statsSub' },
      /* Work — douzième vue (spec du 2026-08-31). Dans « Suivi » et non dans
         « Espace » : on y suit un travail, on n'y organise pas sa journée. */
      { href: '/app/work', key: 'navWork', icon: 'work', subKey: 'workSub' },
    ],
  },
  {
    /* Ordre du PROTOTYPE : profil en tête du groupe, avant le minuteur.
       `05-SPEC-VUES.md` en annonce un autre (`… timer · notes · settings ·
       profile`) ; le prototype fait foi pour le visuel, et l'ordre des icônes
       du rail se voit dans `tests/visual/reference/01-dash.png`. */
    key: 'grpFocus',
    items: [
      { href: '/app/profile', key: 'navProfile', icon: 'profile', subKey: 'settingsSub' },
      { href: '/app/timer', key: 'navTimer', icon: 'timer', subKey: 'timerSub' },
      { href: '/app/notes', key: 'navNotes', icon: 'notes', subKey: 'notesSub' },
      { href: '/app/settings', key: 'navSettings', icon: 'settings', subKey: 'settingsSub' },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** « Plus » — la quatrième destination de la barre basse (refonte mobile,
 *  PDF p. 2-3). Ce n'est PAS une vue du rail : au-dessus de 768 px, les
 *  douze vues sont à un clic et un écran de destinations n'y aurait rien à
 *  offrir. Déclarée à part pour que `NAV_ITEMS` reste la liste du rail. */
export const ITEM_PLUS: NavItem = {
  href: '/app/plus',
  key: 'navPlus',
  icon: 'more',
  subKey: 'plusSub',
};

/** Les quatre entrées de la barre basse, sous 768 px — PDF p. 2 : « Une
 *  seule barre : Aujourd'hui · Habitudes · Tâches · Plus. Le tiroir
 *  disparaît. »
 *
 *  Le tableau de bord n'y est plus : il SYNTHÉTISE plutôt qu'il n'agit, et
 *  c'est Aujourd'hui qui ouvre l'application sur téléphone. Il reste à un
 *  appui de « Plus », en tête de grille. Le tiroir latéral, ses douze entrées,
 *  le niveau, le thème et la langue ont disparu de la navigation : le niveau
 *  vit dans la carte de profil de « Plus », le thème et la langue dans les
 *  réglages. */
export const BOTTOM_ITEMS: NavItem[] = [
  { href: '/app/today', key: 'navToday', icon: 'today', subKey: 'todaySub' },
  { href: '/app/habits', key: 'navHabits', icon: 'habits', subKey: 'habitsSubT' },
  { href: '/app/tasks', key: 'navTasks', icon: 'tasks', subKey: 'tasksSub' },
  ITEM_PLUS,
];

/** Les huit tuiles de l'écran « Plus » (PDF p. 3), dans l'ordre de la
 *  maquette. Le profil n'en fait pas partie : il est la CARTE en tête de
 *  l'écran. Avec les trois entrées de la barre, les douze vues sont toutes à
 *  deux appuis au plus — c'est ce que `tests/unit/nav-items.test.ts` vérifie. */
const ORDRE_PLUS = [
  '/app',
  '/app/calendar',
  '/app/goals',
  '/app/stats',
  '/app/work',
  '/app/timer',
  '/app/notes',
  '/app/settings',
] as const;

export const PLUS_TILES: NavItem[] = ORDRE_PLUS.map((href) => {
  const item = NAV_ITEMS.find((i) => i.href === href);
  if (!item) throw new Error(`Destination inconnue dans l'écran Plus : ${href}`);
  return item;
});

/** Ce que l'en-tête MOBILE montre à droite du titre, vue par vue — PDF p. 2 :
 *  « trois éléments : titre, une action contextuelle (date ou recherche), le
 *  « + » ». `plus` dit ce que le « + » crée : directement le type courant sur
 *  Habitudes et Tâches, une feuille de choix ailleurs, rien là où créer n'a
 *  pas de sens. */
export interface EnteteMobile {
  action: 'date' | 'search' | null;
  plus: 'habit' | 'task' | 'choice' | null;
}

const ENTETE_MOBILE: Record<string, EnteteMobile> = {
  '/app/today': { action: 'date', plus: 'choice' },
  '/app/tasks': { action: 'date', plus: 'task' },
  '/app/habits': { action: 'search', plus: 'habit' },
  '/app/notes': { action: 'search', plus: 'choice' },
  '/app/plus': { action: 'search', plus: null },
  '/app/settings': { action: null, plus: null },
  '/app/profile': { action: null, plus: null },
};

export const enteteMobile = (href: string | undefined): EnteteMobile =>
  (href && ENTETE_MOBILE[href]) || { action: null, plus: 'choice' };

/** Chemin rendu COMPARABLE aux `href` de la table ci-dessus.
 *
 *  DEUX FORMES À RÉDUIRE, et il a fallu les deux.
 *
 *  1. **La barre finale.** L'export statique pose `trailingSlash: true`
 *     (`next.config.mjs`) : `usePathname()` rend `/app/tasks/`. La comparaison
 *     brute échouait sur les onze routes à la fois — l'en-tête affichait
 *     « Habitum » au lieu du titre de la vue, sans sur-titre, et aucune entrée
 *     du rail ni de la barre basse ne se marquait courante.
 *
 *  2. **`/index.html`.** C'est par là que la WebView ENTRE : `appStartPath`
 *     vaut `/app/index.html` (`capacitor.config.ts`). Traiter le seul cas 1
 *     était pire que ne rien faire — le serveur prérend le chemin `/app/`, donc
 *     « Tableau de bord », pendant que le navigateur lit `/app/index.html`,
 *     donc « Habitum ». Deux textes différents pour le même nœud : React
 *     abandonne l'hydratation (#418), et `scripts/verifier-paquet.mjs` refuse
 *     le paquet. Sans normalisation du tout, les deux côtés se trompaient
 *     PAREIL et s'accordaient par accident ; c'est ce qui rendait le défaut
 *     initial silencieux.
 *
 *  `/` reste `/` : ce n'est aucune des onze routes, mais la chaîne vide
 *  correspondrait à n'importe quel `href` vide. */
export const normaliserChemin = (chemin: string): string => {
  const nu = chemin.replace(/\/index\.html$/, '').replace(/\/+$/, '');
  return nu === '' ? '/' : nu;
};

/** Le chemin courant désigne-t-il CETTE entrée ? `/app` ne doit pas s'activer
 *  sur `/app/today` : la comparaison est exacte, jamais par préfixe. */
export const estActif = (pathname: string, href: string): boolean =>
  normaliserChemin(pathname) === href;

/** Entrée correspondant au chemin courant — les douze vues, plus « Plus »,
 *  qui a un titre à afficher dans l'en-tête et un nom à annoncer. */
export const itemActif = (pathname: string): NavItem | undefined =>
  [...NAV_ITEMS, ITEM_PLUS].find((i) => estActif(pathname, i.href));
