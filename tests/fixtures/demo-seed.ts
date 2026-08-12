/* ==========================================================================
 * JEU DE DÉMONSTRATION — USAGE TEST UNIQUEMENT.
 *
 * Ce fichier contient le SEUL générateur toléré par CLAUDE.md § 3, et il ne
 * doit JAMAIS être importé depuis lib/, app/ ou components/. Il reconstitue le
 * jeu de démonstration du prototype (HB0, demoTasks, sessions) et rejoue
 * materialize() à l'identique, pour que tests/unit/golden.test.ts puisse
 * comparer le portage TypeScript aux 62 valeurs de tests/fixtures/golden.json.
 *
 * Porté sans modification depuis public/prototype/Habitum.dc.html :
 *   rnd()          hachage FNV-1a, déterministe et sans état
 *   materialize()  historique généré sur N_MAT jours
 *
 * En production, ce générateur n'existe pas : lib/data/seed.ts (phase 1)
 * fournira seedEmpty() par défaut et seedDemo() sans historique fabriqué.
 * ========================================================================== */
import {
  addDays,
  dailyTarget,
  dateKey,
  isScheduled,
  logKey,
  type Goal,
  type Habit,
  type LogIndex,
  type Session,
  type ShoppingItem,
  type Task,
} from '@/lib/domain';

/** Date figée du dossier : mercredi 5 août 2026. `golden.json._meta.fixedDate`. */
export const DEMO_NOW = new Date(2026, 7, 5);

/** Profondeur de l'historique généré. `NMAT` du prototype. */
export const N_MAT = 180;

/** Horodatage arbitraire mais fixe : le jeu de démonstration ne doit pas
 *  dépendre de l'instant où les tests tournent. */
const ISO = '2026-08-05T00:00:00.000Z';

/** Hachage FNV-1a du prototype. Déterministe : même chaîne, même valeur. */
export const rnd = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
};

/** Taux de réussite visé par habitude — champ `rate` de HB0, hors modèle
 *  produit : il ne sert qu'à la génération de l'historique de démonstration. */
export const DEMO_RATES: Record<string, number> = {
  alc: 0.94,
  water: 0.64,
  read: 0.7,
  run: 0.83,
  med: 0.78,
  film: 0.55,
};

const habit = (
  over: Partial<Habit> & Pick<Habit, 'id' | 'name' | 'category' | 'goal' | 'days'>,
): Habit => ({
  mode: 'dow',
  subItems: [],
  reminders: [],
  archived: false,
  note: '',
  createdAt: ISO,
  updatedAt: ISO,
  ...over,
});

/** Les six habitudes de `HB0`, transposées au modèle cible. */
export const demoHabits = (): Habit[] => [
  habit({
    id: 'alc',
    name: "Ne pas boire d'alcool",
    category: 'health',
    days: [0, 1, 2, 3, 4, 5, 6],
    goal: { kind: 'check', target: 1, step: 1, unit: '' },
  }),
  habit({
    id: 'water',
    name: "Boire 8 verres d'eau",
    category: 'health',
    days: [0, 1, 2, 3, 4, 5, 6],
    goal: { kind: 'count', target: 8, step: 1, unit: 'verres' },
  }),
  habit({
    id: 'read',
    name: 'Lire au moins 20 pages',
    category: 'study',
    days: [0, 2, 3, 6],
    reminders: ['13:30'],
    goal: { kind: 'count', target: 20, step: 1, unit: 'pages' },
  }),
  habit({
    id: 'run',
    name: 'Courir au moins 3 km',
    category: 'sport',
    days: [1, 2, 5, 6],
    reminders: ['07:00'],
    goal: { kind: 'count', target: 3, step: 1, unit: 'km' },
  }),
  habit({
    id: 'med',
    name: 'Méditer',
    category: 'mind',
    days: [0, 1, 2, 3, 4, 5, 6],
    reminders: ['15:00'],
    goal: { kind: 'time', target: 15, step: 1, unit: 'min' },
  }),
  habit({
    id: 'film',
    name: 'Regarder un film',
    category: 'home',
    days: [4, 5],
    reminders: ['22:00'],
    goal: { kind: 'check', target: 1, step: 1, unit: '' },
  }),
];

/** Décalage en jours par rapport à la date figée. */
const D = (n: number): string => dateKey(addDays(DEMO_NOW, n));

const task = (
  id: string,
  name: string,
  category: Task['category'],
  offset: number,
  time: string,
  priority: Task['priority'],
  done: boolean,
  subTasks: Task['subTasks'] = [],
): Task => ({
  id,
  name,
  category,
  date: D(offset),
  time,
  duration: 60,
  priority,
  done,
  subTasks,
  note: '',
  createdAt: ISO,
  updatedAt: ISO,
});

/** Les huit tâches de `demoTasks()`. */
export const demoTasks = (): Task[] => [
  task('t1', 'Réunion de travail', 'work', 0, '10:00', 3, true),
  task('t2', 'Cours de guitare', 'mind', 0, '16:00', 2, false),
  task('t3', 'Promener le chien', 'home', 0, '20:00', 1, false),
  task('t4', 'Préparer la revue trimestrielle', 'work', 2, '09:00', 3, false, [
    { label: 'Consolider les chiffres', done: true },
    { label: 'Relire le rapport', done: false },
    { label: 'Envoyer aux associés', done: false },
  ]),
  task('t5', 'Rendez-vous dentiste', 'health', 3, '09:15', 2, false),
  task('t6', 'Payer le loyer', 'home', 5, '12:00', 3, false),
  task('t7', 'Rédiger le chapitre 4', 'study', 1, '18:30', 2, false),
  task('t8', 'Sauvegarder les photos', 'home', -1, '21:00', 1, true),
];

const session = (id: string, label: string, minutes: number, offset: number): Session => ({
  id,
  label,
  minutes,
  date: D(offset),
  mode: 'pomo',
  createdAt: ISO,
  updatedAt: ISO,
});

/** Les quatre sessions de focus du jeu de démonstration. */
export const demoSessions = (): Session[] => [
  session('s1', 'Méditer', 15, 0),
  session('s2', 'Lecture profonde', 45, 0),
  session('s3', 'Rédaction', 50, -1),
  session('s4', 'Course', 28, -1),
];

/** Journal du jeu de démonstration : les quatre entrées du jour saisies par
 *  `demoData()`, puis `materialize()` sur les N_MAT jours précédents.
 *  Strictement déterministe — aucun appel à Date.now() ni Math.random(). */
export const demoLogIndex = (): LogIndex => {
  const log = new Map<string, number>();
  const today = dateKey(DEMO_NOW);
  log.set(logKey('alc', today), 1);
  log.set(logKey('med', today), 15);
  log.set(logKey('water', today), 5);
  log.set(logKey('run', today), 3);

  for (const h of demoHabits()) {
    const rate = DEMO_RATES[h.id] ?? 0.7;
    for (let i = 1; i <= N_MAT; i++) {
      const d = addDays(DEMO_NOW, -i);
      const k = logKey(h.id, dateKey(d));
      if (log.has(k)) continue;
      if (!isScheduled(h, d, DEMO_NOW)) continue;
      const r = rnd(h.id + dateKey(d));
      const target = dailyTarget(h);
      log.set(k, r < rate ? target : Math.round(target * r * 0.5));
    }
  }
  return log;
};

/* Objectifs et liste de courses : mêmes valeurs que `lib/data/seed.ts`, mais
   figées ici pour que les tests puissent les écrire directement en base sans
   passer par l'amorçage de production. Les dates des objectifs sont absolues
   dans le prototype comme dans le produit — elles ne dépendent pas de DEMO_NOW. */

const goal = (over: Partial<Goal> & Pick<Goal, 'id' | 'name' | 'kind' | 'category'>): Goal => ({
  target: 0,
  unit: '',
  current: 0,
  createdAt: ISO,
  updatedAt: ISO,
  ...over,
});

/** Les quatre objectifs de `OBJ0`. */
export const demoGoals = (): Goal[] => [
  goal({
    id: 'o1',
    name: 'Semi-marathon en octobre',
    kind: 'cumul',
    target: 180,
    unit: 'km',
    sourceHabitId: 'run',
    category: 'sport',
    start: '2026-05-01',
    deadline: '2026-10-11',
  }),
  goal({
    id: 'o2',
    name: '24 livres en 2026',
    kind: 'cumul',
    target: 24,
    unit: 'livres',
    category: 'study',
    start: '2026-01-01',
    deadline: '2026-12-31',
    current: 13,
  }),
  goal({
    id: 'o3',
    name: 'Lancer le club de lecture',
    kind: 'milestones',
    category: 'work',
    start: '2026-06-01',
    deadline: '2026-09-15',
    milestones: [
      { label: 'Choisir le format', done: true },
      { label: 'Réserver la salle', done: true },
      { label: 'Inviter 10 personnes', done: false },
      { label: 'Première séance', done: false },
      { label: 'Programme du trimestre', done: false },
    ],
  }),
  goal({
    id: 'o4',
    name: 'Moins de 12 écarts sur 90 jours',
    kind: 'reduce',
    target: 12,
    unit: 'écarts',
    sourceHabitId: 'alc',
    category: 'health',
    start: '2026-05-01',
    deadline: '2026-09-30',
    window: 90,
  }),
];

/** La liste de courses du jeu de démonstration — `shop` du prototype. */
export const demoShopping = (): ShoppingItem[] =>
  [
    { label: 'Pommes', done: true },
    { label: 'Pain', done: true },
    { label: 'Céréales', done: false },
    { label: 'Fromage', done: true },
    { label: 'Poulet', done: true },
    { label: 'Pâtes', done: false },
    { label: 'Shampooing', done: false },
  ].map((a, i) => ({ id: `sh${i + 1}`, ...a, createdAt: ISO, updatedAt: ISO }));
