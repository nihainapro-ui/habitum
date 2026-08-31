/* Les onze vues, dans les trois groupes du rail du prototype.
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

/** Les quatre entrées de la barre basse, sous 768 px. Le prototype garde les
 *  usages quotidiens sous le pouce.
 *
 *  LES SEPT AUTRES VUES PASSENT PAR LE TIROIR (`nav-drawer.tsx`), et non par la
 *  palette ⌘K comme l'annonçait cette note. La palette suppose un clavier —
 *  l'APK Android n'en a pas — et une recherche à taper n'est pas une
 *  navigation : il faut connaître le nom de ce qu'on cherche avant d'y aller.
 *  Calendrier, objectifs, statistiques, profil, minuteur, notes et réglages
 *  n'avaient donc, sur téléphone, aucun chemin d'accès. */
export const BOTTOM_ITEMS: NavItem[] = [
  { href: '/app', key: 'navDash', icon: 'dash', subKey: 'dashSub' },
  { href: '/app/today', key: 'navToday', icon: 'today', subKey: 'todaySub' },
  { href: '/app/habits', key: 'navHabits', icon: 'habits', subKey: 'habitsSubT' },
  { href: '/app/tasks', key: 'navTasks', icon: 'tasks', subKey: 'tasksSub' },
];

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

/** Entrée correspondant au chemin courant. */
export const itemActif = (pathname: string): NavItem | undefined =>
  NAV_ITEMS.find((i) => estActif(pathname, i.href));
