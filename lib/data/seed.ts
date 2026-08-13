import { addDays, dateKey, today } from '@/lib/domain';
import { db } from './db';
import type { Settings, Task } from '@/lib/domain';
import {
  goalsRepo,
  habitsRepo,
  logsRepo,
  metaRepo,
  profilesRepo,
  sessionsRepo,
  shoppingRepo,
  tasksRepo,
} from './repositories';

/* ============================================================================
   Deux amorces, strictement séparées.

   `seedEmpty()` est LE chemin par défaut : un profil, des réglages, et rien
   d'autre. Un compte neuf affiche 0 minute de focus, 0 % de réussite et des
   listes vides — parce que c'est la vérité (CLAUDE.md § 3).

   `seedDemo()` est explicite, marqué dans `meta`, et ne fabrique AUCUN
   historique : les six habitudes, leurs quatre entrées du jour, les huit
   tâches, les quatre sessions, les quatre objectifs et la liste de courses,
   tels que le prototype les pose à la première ouverture. La reconstitution
   d'un historique de 180 jours n'existe que dans `tests/fixtures/demo-seed.ts`,
   pour comparer le portage aux 62 valeurs de référence — jamais ici.

   B4 : un utilisateur réel qui reçoit l'historique de démonstration ne fait
   plus confiance à un seul chiffre du produit.
   ========================================================================= */

export const META_KEYS = {
  /** Drapeau du jeu de démonstration — `demo` dans le prototype. */
  demo: 'demo',
  settings: 'settings',
  seeded: 'seeded',
  /** Profil courant — `pid` dans le prototype. Nouvelle table, nouveau nom :
   *  aucune clé persistée existante n'est renommée (G1). */
  activeProfile: 'activeProfile',
  /** État du minuteur — `startedAt` + `accumulatedMs` (B5). */
  timer: 'timer',
  /** Date du dernier export, et refus du rappel de sauvegarde (D8). */
  lastExport: 'lastExport',
  nagDismissed: 'nagDismissed',
  /** Occurrences de tâches récurrentes accomplies. Nom et format FIGÉS (G1) :
   *  `{ "taskId|YYYY-MM-DD": 1 }`, comme dans le prototype. */
  occ: 'occ',
  /** Journal d'erreurs LOCAL — `lib/logger.ts`, décision E. */
  errors: 'errors',
  /** Copie de secours prise avant import et avant réinitialisation.
   *  Équivalent de `habitum.state.bak` du prototype, dans la table `meta`. */
  backup: 'backup',
  /** Onboarding franchi. Tant qu'elle est absente, la première ouverture mène
   *  au parcours d'accueil et non au tableau de bord. */
  onboarded: 'onboarded',
} as const;

/** Réglages d'un compte neuf. `notifications`, `sound` et `vibrate` sont à
 *  l'arrêt tant que la phase 5 ne les a pas implémentés : un interrupteur
 *  allumé qui ne déclenche rien est un mensonge de plus. */
export const DEFAULT_SETTINGS: Settings = {
  lang: 'fr',
  theme: 'neural',
  weekStart: 'mon',
  notifications: false,
  sound: false,
  vibrate: false,
  confetti: true,
  customCursor: false,
};

export async function isDemo(): Promise<boolean> {
  return (await metaRepo.get<boolean>(META_KEYS.demo)) === true;
}

/** Amorce par défaut : un profil vierge et les réglages. Idempotente. */
export async function seedEmpty(): Promise<void> {
  if (await metaRepo.get<boolean>(META_KEYS.seeded)) return;

  await profilesRepo.create({
    name: '',
    handle: '',
    glyph: '◉',
    hue: 188,
    role: 0,
    since: dateKey(today()),
  });
  await metaRepo.set(META_KEYS.settings, DEFAULT_SETTINGS);
  await metaRepo.set(META_KEYS.demo, false);
  await metaRepo.set(META_KEYS.seeded, true);
}

/** Les six habitudes de `HB0`, sans aucune donnée passée. */
const demoHabits = () => [
  {
    id: 'alc',
    name: "Ne pas boire d'alcool",
    category: 'health' as const,
    goal: { kind: 'check' as const, target: 1, step: 1, unit: '' },
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: 'water',
    name: "Boire 8 verres d'eau",
    category: 'health' as const,
    goal: { kind: 'count' as const, target: 8, step: 1, unit: 'verres' },
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: 'read',
    name: 'Lire au moins 20 pages',
    category: 'study' as const,
    goal: { kind: 'count' as const, target: 20, step: 1, unit: 'pages' },
    days: [0, 2, 3, 6],
    reminders: ['13:30'],
  },
  {
    id: 'run',
    name: 'Courir au moins 3 km',
    category: 'sport' as const,
    goal: { kind: 'count' as const, target: 3, step: 1, unit: 'km' },
    days: [1, 2, 5, 6],
    reminders: ['07:00'],
  },
  {
    id: 'med',
    name: 'Méditer',
    category: 'mind' as const,
    goal: { kind: 'time' as const, target: 15, step: 1, unit: 'min' },
    days: [0, 1, 2, 3, 4, 5, 6],
    reminders: ['15:00'],
  },
  {
    id: 'film',
    name: 'Regarder un film',
    category: 'home' as const,
    goal: { kind: 'check' as const, target: 1, step: 1, unit: '' },
    days: [4, 5],
    reminders: ['22:00'],
  },
];

/** Une tâche de démonstration, exprimée en décalage de jours — la date absolue
 *  se calcule à l'amorçage, pas à l'écriture du fichier. */
interface DemoTask {
  id: string;
  name: string;
  category: Task['category'];
  off: number;
  time: string;
  priority: Task['priority'];
  done: boolean;
  subTasks?: Task['subTasks'];
  recurrence?: Task['recurrence'];
}

/** Les huit tâches de `demoTasks()`. */
const demoTasks = (): DemoTask[] => [
  {
    id: 't1',
    name: 'Réunion de travail',
    category: 'work' as const,
    off: 0,
    time: '10:00',
    priority: 3 as const,
    done: true,
  },
  {
    id: 't2',
    name: 'Cours de guitare',
    category: 'mind' as const,
    off: 0,
    time: '16:00',
    priority: 2 as const,
    done: false,
  },
  {
    id: 't3',
    name: 'Promener le chien',
    category: 'home' as const,
    off: 0,
    time: '20:00',
    priority: 1 as const,
    done: false,
    recurrence: { freq: 'daily' as const },
  },
  {
    id: 't4',
    name: 'Préparer la revue trimestrielle',
    category: 'work' as const,
    off: 2,
    time: '09:00',
    priority: 3 as const,
    done: false,
    subTasks: [
      { label: 'Consolider les chiffres', done: true },
      { label: 'Relire le rapport', done: false },
      { label: 'Envoyer aux associés', done: false },
    ],
  },
  {
    id: 't5',
    name: 'Rendez-vous dentiste',
    category: 'health' as const,
    off: 3,
    time: '09:15',
    priority: 2 as const,
    done: false,
  },
  {
    id: 't6',
    name: 'Payer le loyer',
    category: 'home' as const,
    off: 5,
    time: '12:00',
    priority: 3 as const,
    done: false,
    recurrence: { freq: 'monthly' as const },
  },
  {
    id: 't7',
    name: 'Rédiger le chapitre 4',
    category: 'study' as const,
    off: 1,
    time: '18:30',
    priority: 2 as const,
    done: false,
  },
  {
    id: 't8',
    name: 'Sauvegarder les photos',
    category: 'home' as const,
    off: -1,
    time: '21:00',
    priority: 1 as const,
    done: true,
  },
];

/** Les quatre objectifs de `OBJ0`. */
const demoGoals = () => [
  {
    id: 'o1',
    name: 'Semi-marathon en octobre',
    kind: 'cumul' as const,
    target: 180,
    unit: 'km',
    sourceHabitId: 'run',
    category: 'sport' as const,
    start: '2026-05-01',
    deadline: '2026-10-11',
    current: 0,
  },
  {
    id: 'o2',
    name: '24 livres en 2026',
    kind: 'cumul' as const,
    target: 24,
    unit: 'livres',
    category: 'study' as const,
    start: '2026-01-01',
    deadline: '2026-12-31',
    current: 13,
  },
  {
    id: 'o3',
    name: 'Lancer le club de lecture',
    kind: 'milestones' as const,
    target: 0,
    unit: '',
    category: 'work' as const,
    start: '2026-06-01',
    deadline: '2026-09-15',
    current: 0,
    milestones: [
      { label: 'Choisir le format', done: true },
      { label: 'Réserver la salle', done: true },
      { label: 'Inviter 10 personnes', done: false },
      { label: 'Première séance', done: false },
      { label: 'Programme du trimestre', done: false },
    ],
  },
  {
    id: 'o4',
    name: 'Moins de 12 écarts sur 90 jours',
    kind: 'reduce' as const,
    target: 12,
    unit: 'écarts',
    sourceHabitId: 'alc',
    category: 'health' as const,
    start: '2026-05-01',
    deadline: '2026-09-30',
    current: 0,
    window: 90,
  },
];

/** La liste de courses du jeu de démonstration, `shop` du prototype. */
const DEMO_SHOPPING: { label: string; done: boolean }[] = [
  { label: 'Pommes', done: true },
  { label: 'Pain', done: true },
  { label: 'Céréales', done: false },
  { label: 'Fromage', done: true },
  { label: 'Poulet', done: true },
  { label: 'Pâtes', done: false },
  { label: 'Shampooing', done: false },
];

/** Amorce de démonstration. Explicite, drapeautée, et sans passé inventé. */
export async function seedDemo(): Promise<void> {
  await seedEmpty();

  const maintenant = today();
  const jour = dateKey(maintenant);

  for (const h of demoHabits()) {
    await habitsRepo.create({
      mode: 'dow',
      subItems: [],
      reminders: [],
      archived: false,
      note: '',
      ...h,
    });
  }

  for (const t of demoTasks()) {
    const { off, subTasks, ...reste } = t;
    await tasksRepo.create({
      ...reste,
      date: dateKey(addDays(maintenant, off)),
      duration: 60,
      subTasks: subTasks ?? [],
      note: '',
    });
  }

  for (const g of demoGoals()) {
    await goalsRepo.create(g);
  }

  const sessions = [
    { label: 'Méditer', minutes: 15, off: 0 },
    { label: 'Lecture profonde', minutes: 45, off: 0 },
    { label: 'Rédaction', minutes: 50, off: -1 },
    { label: 'Course', minutes: 28, off: -1 },
  ];
  for (const s of sessions) {
    await sessionsRepo.create({
      label: s.label,
      minutes: s.minutes,
      date: dateKey(addDays(maintenant, s.off)),
      mode: 'pomo',
    });
  }

  for (const article of DEMO_SHOPPING) {
    await shoppingRepo.create(article);
  }

  /* Les QUATRE entrées du jour de `demoData()` — le seul journal du jeu de
     démonstration. Aucune date antérieure n'est écrite : un historique de
     démonstration ne se distingue pas d'un vrai à l'œil nu. */
  for (const [habitId, valeur] of [
    ['alc', 1],
    ['med', 15],
    ['water', 5],
    ['run', 3],
  ] as const) {
    await logsRepo.setValue(habitId, jour, valeur);
  }

  await metaRepo.set(META_KEYS.demo, true);
}

/** Efface TOUT et repart d'un compte vierge.
 *
 *  Écart assumé au prototype : la réinitialisation n'y remettait pas un compte
 *  vierge mais le jeu de démonstration. C'était cohérent d'une maquette, pas
 *  d'un produit — B4 : un utilisateur qui retrouve six habitudes qu'il n'a pas
 *  créées ne sait plus ce qui est à lui. Le libellé `app.resetD` est corrigé
 *  en conséquence, dans les deux langues. */
export async function resetAll(): Promise<void> {
  /* Le parcours d'accueil ne se REJOUE pas après une réinitialisation. Ce que
     l'utilisateur a demandé, c'est d'effacer ses données — pas de refaire la
     visite, ni de se voir reproposer le jeu de démonstration qu'il vient
     peut-être d'effacer. Le drapeau est donc relevé avant, reposé après. */
  const accueilFranchi = await metaRepo.get<boolean>(META_KEYS.onboarded);

  await db.transaction(
    'rw',
    [
      db.habits,
      db.logs,
      db.tasks,
      db.goals,
      db.notes,
      db.sessions,
      db.profiles,
      db.shopping,
      db.meta,
    ],
    async () => {
      await Promise.all([
        db.habits.clear(),
        db.logs.clear(),
        db.tasks.clear(),
        db.goals.clear(),
        db.notes.clear(),
        db.sessions.clear(),
        db.profiles.clear(),
        db.shopping.clear(),
        db.meta.clear(),
      ]);
    },
  );
  await seedEmpty();
  if (accueilFranchi) await metaRepo.set(META_KEYS.onboarded, true);
}
