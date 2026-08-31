import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  addDays,
  bestStreak,
  completionRate,
  currentStreak,
  dateKey,
  dayAgenda,
  dayRatio,
  parseKey,
  focusMinutes,
  isScheduled,
  N_BEST,
  progression,
  N_STREAK,
  sumValues,
  today,
  type DayRatio,
  type EntreeJour,
  type Habit,
  type Progression,
  type Task,
} from '@/lib/domain';
import { cacheDerive } from './derived';
import { useStore } from './store';

/* Sélecteurs dérivés.

   G2 — AUCUN calcul n'est écrit ici : chaque sélecteur assemble des entrées et
   appelle `lib/domain`, qui est testé contre les 62 valeurs de référence. Un
   calcul recopié dans un composant est un calcul que l'oracle ne protège plus.

   `useShallow` est nécessaire dès qu'un sélecteur construit un tableau ou un
   objet : Zustand 5 compare par `Object.is`, et une nouvelle référence à chaque
   rendu boucle indéfiniment. */

/* ⚠ Un sélecteur ne doit JAMAIS construire un objet que `Object.is` ne
   reconnaîtra pas au rendu suivant. `useShallow` ne sauve que les tableaux et
   objets PLATS : dès que les éléments sont eux-mêmes des objets reconstruits,
   la comparaison échoue à chaque appel et React boucle jusqu'à
   « Maximum update depth exceeded ». Dans ces cas-là, on sélectionne les
   entrées — stables, puisque le store ne les remplace qu'à l'écriture — et on
   dérive dans un `useMemo`. */

/** Jour affiché : `ui.day` est un DÉCALAGE en jours, comme `state.day` du
 *  prototype. Le convertir ici, une fois, évite que chaque vue le refasse — et
 *  qu'une vue oublie de le faire. */
export const useJourAffiche = (): Date => {
  const day = useStore((s) => s.ui.day);
  return useMemo(() => addDays(today(), day), [day]);
};

/** File d'exécution de la journée affichée, filtrée par l'onglet courant.
 *  Le filtre est un état d'interface : il s'applique ici, après le domaine. */
export const useDayAgenda = (date: Date): EntreeJour[] => {
  const logIndex = useStore((s) => s.logIndex);
  const habits = useStore((s) => s.habits);
  const tasks = useStore((s) => s.tasks);
  const occurrences = useStore((s) => s.occurrences);
  const filter = useStore((s) => s.ui.filter);
  const jour = dateKey(date);

  return useMemo(() => {
    const d = parseKey(jour);
    if (!d) return [];
    const entrees = dayAgenda(logIndex, habits, tasks, d, today(), occurrences);
    if (filter === 'habits') return entrees.filter((e) => e.kind === 'habit');
    if (filter === 'tasks') return entrees.filter((e) => e.kind === 'task');
    return entrees;
  }, [logIndex, habits, tasks, occurrences, filter, jour]);
};

/** Habitudes planifiées ce jour-là, archivées exclues. */
export const useHabitsOfDay = (date: Date): Habit[] =>
  useStore(useShallow((s) => s.habits.filter((h) => isScheduled(h, date))));

/** Tâches d'une date, quelle que soit leur avancement. */
export const useTasksOfDay = (dateKey: string): Task[] =>
  useStore(useShallow((s) => s.tasks.filter((t) => t.date === dateKey)));

/** Charge et avancement d'une journée — base de l'anneau et de la heatmap. */
export const useDayRatio = (date: Date): DayRatio =>
  useStore(
    useShallow((s) => dayRatio(s.logIndex, s.habits, s.tasks, date, today(), s.occurrences)),
  );

/** Avancement de plusieurs journées — bandeau de dates, heatmap.
 *
 *  Rend un tableau de NOMBRES, pas d'objets : `useShallow` compare les
 *  éléments par `Object.is`, et une liste d'objets reconstruits à chaque appel
 *  ne serait jamais jugée égale — la comparaison échouerait à chaque rendu. */
export const useDayRatios = (dates: readonly Date[]): number[] =>
  useStore(
    useShallow((s) =>
      dates.map((d) => dayRatio(s.logIndex, s.habits, s.tasks, d, today(), s.occurrences).ratio),
    ),
  );

/** Série en cours d'une habitude, seule.
 *
 *  `useHabitMetrics` calcule aussi le record — 365 jours balayés. Une ligne de
 *  la file d'exécution n'affiche que la série : lui faire payer le record
 *  multiplierait le coût du rendu par le nombre de lignes, pour un chiffre
 *  qu'elle ne montre pas. */
export const useHabitStreak = (habitId: string): number =>
  useStore((s) => {
    const h = s.habits.find((x) => x.id === habitId);
    if (!h) return 0;
    return cacheDerive.get(h.id, 'streak', N_STREAK, () => currentStreak(s.logIndex, h));
  });

export interface HabitMetrics {
  streak: number;
  best: number;
  pct7: number;
  pct30: number;
  pct90: number;
  sum30: number;
}

/** Les chiffres d'une carte d'habitude.
 *
 *  Passés par le CACHE DÉRIVÉ (tâche 5.9, ADR-0004) : `bestStreak` balaie 365
 *  jours par habitude, et une liste de vingt habitudes le refaisait vingt fois
 *  à chaque rendu, y compris quand rien de cette habitude-là n'avait changé.
 *  L'invalidation est ciblée, dans les tranches qui écrivent — cocher `h1` ne
 *  recalcule pas `h2`. */
export const useHabitMetrics = (habitId: string): HabitMetrics | null =>
  useStore(
    useShallow((s) => {
      const h = s.habits.find((x) => x.id === habitId);
      if (!h) return null;
      const memo = <T>(metric: string, window: number, compute: () => T): T =>
        cacheDerive.get(h.id, metric, window, compute);
      return {
        streak: memo('streak', N_STREAK, () => currentStreak(s.logIndex, h)),
        best: memo('best', N_BEST, () => bestStreak(s.logIndex, h)),
        pct7: memo('pct', 7, () => completionRate(s.logIndex, h, 7)),
        pct30: memo('pct', 30, () => completionRate(s.logIndex, h, 30)),
        pct90: memo('pct', 90, () => completionRate(s.logIndex, h, 90)),
        sum30: memo('sum', 30, () => sumValues(s.logIndex, h, 30)),
      };
    }),
  );

/** Minutes de focus sur une fenêtre. G3 : agrège les sessions réellement
 *  enregistrées — un compte sans session rend 0, pas une estimation. */
export const useFocusMinutes = (window: number): number =>
  useStore((s) => focusMinutes(s.sessions, window));

export const useSettings = () => useStore((s) => s.settings);
export const useToast = () => useStore((s) => s.ui.toast);
export const useIsDemo = () => useStore((s) => s.isDemo);
export const useActiveProfile = () =>
  useStore((s) => s.profiles.find((p) => p.id === s.activeProfileId) ?? null);

/** Progression de la coque — indice de l'en-tête, niveau et rang du rail.
 *
 *  MÉMORISÉ SUR LES RÉFÉRENCES, et ce n'est pas une optimisation de confort.
 *
 *  Le rail et l'en-tête sont montés sur les onze vues. Abonnés directement aux
 *  collections, ils se redessinaient à chaque écriture du store. Recalculer
 *  sans mémoriser était pire encore : `progression` traverse 120 jours, et
 *  chaque jour balaie toutes les habitudes. Mesuré sur le jeu de charge —
 *  200 habitudes × 3 ans — cela faisait **450 ms par interaction** là où le
 *  budget en accorde 100 (`tests/e2e/charge.spec.ts`).
 *
 *  La clé est faite des QUATRE RÉFÉRENCES d'entrée, plus la date du jour. Le
 *  store remplace ses collections à chaque écriture (`set` immuable, y compris
 *  `logIndex`, reconstruit par `avecEntree`) : une donnée qui change change
 *  donc au moins une référence, et la valeur mémorisée ne peut pas être
 *  périmée. La date, elle, ne dépend d'aucune écriture — sans elle, l'indice
 *  resterait celui de la veille après minuit sur une application laissée
 *  ouverte.
 *
 *  Effet de bord utile : la référence rendue est stable, donc la coque ne se
 *  redessine que lorsqu'un des chiffres affichés change réellement.
 *
 *  CE MÉMO NE SUFFIT PAS, et la première version de ce sélecteur le prouvait.
 *  Sa clé contient `logIndex`, que `avecEntree` RECONSTRUIT à chaque écriture :
 *  il n'évite donc que les appels répétés sur un même état — le rail et
 *  l'en-tête, montés ensemble — jamais le recalcul qui suit une coche. Mesuré
 *  sur le jeu de charge : interaction à 193 ms pour un budget de 100, contre
 *  54 ms avant que la coque n'affiche ces chiffres.
 *
 *  D'où le RECORD PASSÉ PAR `cacheDerive`, qui porte 87 % de ce coût (76 ms
 *  sur 87). Ce n'est pas un motif nouveau : `useHabitMetrics` mémorise déjà
 *  `bestStreak` sous exactement cette clé — `(habitId, 'best', N_BEST)`.
 *  `progression` était le seul endroit qui le calculait hors du cache.
 *
 *  Une version précédente de ce commentaire écartait `cacheDerive` au motif
 *  que « `hydrate()` ne le vide pas ». C'EST FAUX : `store.ts` l'appelle en
 *  tête de `hydrate()`, avant même de lire la base. L'objection valait pour la
 *  progression ENTIÈRE — une valeur globale, qu'aucune invalidation par
 *  habitude ne rattrape — pas pour un terme par habitude ; c'est bien pourquoi
 *  seul le record y passe, et pourquoi les deux autres sont recalculés.
 *
 *  Reste le chemin de complétion en fond, qui remplace `logIndex` sans vider le
 *  cache. Il est sûr ici : la fenêtre d'ouverture vaut `N_STREAK` (420 jours),
 *  choisie plus profonde que toute métrique affichée — dont le record, à 365. */
interface MemoProgression {
  log: unknown;
  habits: unknown;
  tasks: unknown;
  sessions: unknown;
  jour: string;
  valeur: Progression;
}

let memoProgression: MemoProgression | null = null;

export const useProgression = (): Progression =>
  useStore((s) => {
    const maintenant = today();
    const jour = dateKey(maintenant);
    const m = memoProgression;
    if (
      m &&
      m.log === s.logIndex &&
      m.habits === s.habits &&
      m.tasks === s.tasks &&
      m.sessions === s.sessions &&
      m.jour === jour
    ) {
      return m.valeur;
    }
    /* Le record, habitude par habitude, sous la clé de `useHabitMetrics` : une
       coche n'invalide que l'habitude cochée (`setLogValue` -> `invalidateHabit`),
       les 199 autres restent mémorisées. */
    const meilleurRecord = s.habits.reduce(
      (max, h) =>
        Math.max(
          max,
          cacheDerive.get(h.id, 'best', N_BEST, () => bestStreak(s.logIndex, h)),
        ),
      0,
    );
    const valeur = progression(
      s.logIndex,
      s.habits,
      s.tasks,
      s.sessions,
      maintenant,
      meilleurRecord,
    );
    memoProgression = {
      log: s.logIndex,
      habits: s.habits,
      tasks: s.tasks,
      sessions: s.sessions,
      jour,
      valeur,
    };
    return valeur;
  });
