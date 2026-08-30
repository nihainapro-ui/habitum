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
 *  usages quotidiens sous le pouce ; le reste passe par la palette ⌘K. */
export const BOTTOM_ITEMS: NavItem[] = [
  { href: '/app', key: 'navDash', icon: 'dash', subKey: 'dashSub' },
  { href: '/app/today', key: 'navToday', icon: 'today', subKey: 'todaySub' },
  { href: '/app/habits', key: 'navHabits', icon: 'habits', subKey: 'habitsSubT' },
  { href: '/app/tasks', key: 'navTasks', icon: 'tasks', subKey: 'tasksSub' },
];

/** Entrée correspondant au chemin courant. `/app` ne doit pas s'activer sur
 *  `/app/today` : la comparaison est exacte, jamais par préfixe. */
export const itemActif = (pathname: string): NavItem | undefined =>
  NAV_ITEMS.find((i) => i.href === pathname);
