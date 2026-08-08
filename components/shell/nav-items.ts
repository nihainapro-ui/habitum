/* Les onze vues, dans les trois groupes du rail du prototype.
   Déclarées UNE SEULE FOIS : le rail, la barre basse et la région annoncée
   lisent la même liste. Deux listes divergent toujours. */

export interface NavItem {
  href: string;
  /** Clé de libellé dans `messages/*.json`, espace `app`. */
  key: string;
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
      { href: '/app', key: 'navDash' },
      { href: '/app/today', key: 'navToday' },
      { href: '/app/calendar', key: 'navCal' },
    ],
  },
  {
    key: 'grpTrack',
    items: [
      { href: '/app/habits', key: 'navHabits' },
      { href: '/app/tasks', key: 'navTasks' },
      { href: '/app/goals', key: 'navGoals' },
      { href: '/app/stats', key: 'navStats' },
    ],
  },
  {
    key: 'grpFocus',
    items: [
      { href: '/app/timer', key: 'navTimer' },
      { href: '/app/notes', key: 'navNotes' },
      { href: '/app/profile', key: 'navProfile' },
      { href: '/app/settings', key: 'navSettings' },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** Les quatre entrées de la barre basse, sous 768 px. Le prototype garde les
 *  usages quotidiens sous le pouce ; le reste passe par la palette ⌘K. */
export const BOTTOM_ITEMS: NavItem[] = [
  { href: '/app', key: 'navDash' },
  { href: '/app/today', key: 'navToday' },
  { href: '/app/habits', key: 'navHabits' },
  { href: '/app/tasks', key: 'navTasks' },
];

/** Entrée correspondant au chemin courant. `/app` ne doit pas s'activer sur
 *  `/app/today` : la comparaison est exacte, jamais par préfixe. */
export const itemActif = (pathname: string): NavItem | undefined =>
  NAV_ITEMS.find((i) => i.href === pathname);
