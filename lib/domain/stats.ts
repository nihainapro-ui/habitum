import type { Category, DateKey, Habit, LogIndex, Task } from './types';
import { CATEGORIES } from './types';
import { addDays, dateKey, today } from './date';
import { bestStreak, completionRate, currentStreak, dayRatio } from './metrics';

/* Agrégats de la vue Statistiques — 05-SPEC-VUES.md § 8.

   Tout part de `dayRatio`, déjà couvert par les 62 valeurs de référence :
   `global.dayRatios30` est la suite exacte des trente derniers jours du jeu de
   démonstration. Le score global et les journées parfaites s'en déduisent, et
   c'est pour cela qu'ils se testent contre l'oracle plutôt que contre
   eux-mêmes. */

export interface JourAgrege {
  date: Date;
  key: DateKey;
  scheduled: number;
  done: number;
  ratio: number;
  future: boolean;
}

/** Les `n` derniers jours, du plus ancien au plus récent. */
export function daysBack(
  log: LogIndex,
  habits: readonly Habit[],
  tasks: readonly Task[],
  n: number,
  now: Date = today(),
): JourAgrege[] {
  const jours: JourAgrege[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(now, -i);
    const r = dayRatio(log, habits, tasks, date, now);
    jours.push({ date, key: dateKey(date), ...r, future: false });
  }
  return jours;
}

/** Les jours d'un mois civil, jours à venir compris — la barre d'un jour futur
 *  est vide, elle n'est pas absente : le mois se lit d'un coup d'œil. */
export function daysOfMonth(
  log: LogIndex,
  habits: readonly Habit[],
  tasks: readonly Task[],
  now: Date = today(),
): JourAgrege[] {
  const premier = new Date(now.getFullYear(), now.getMonth(), 1);
  const nb = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const jours: JourAgrege[] = [];
  for (let i = 0; i < nb; i++) {
    const date = addDays(premier, i);
    const future = date > now;
    const r = future
      ? { scheduled: 0, done: 0, ratio: 0 }
      : dayRatio(log, habits, tasks, date, now);
    jours.push({ date, key: dateKey(date), ...r, future });
  }
  return jours;
}

/** Score global : ce qui a été fait sur ce qui était prévu, en %.
 *  Porté de `statVals()` — la moyenne des RATIOS donnerait un autre nombre,
 *  en pesant autant un jour à une habitude qu'un jour à huit. */
export function globalScore(
  log: LogIndex,
  habits: readonly Habit[],
  tasks: readonly Task[],
  window: number,
  now: Date = today(),
): number {
  let prevu = 0;
  let fait = 0;
  for (const j of daysBack(log, habits, tasks, window, now)) {
    prevu += j.scheduled;
    fait += j.done;
  }
  return prevu ? Math.round((fait / prevu) * 100) : 0;
}

/** Journées parfaites : tout ce qui était prévu a été fait. Une journée SANS
 *  rien de prévu n'est pas parfaite — elle est vide. */
export function perfectDays(
  log: LogIndex,
  habits: readonly Habit[],
  tasks: readonly Task[],
  window: number,
  now: Date = today(),
): number {
  return daysBack(log, habits, tasks, window, now).filter((j) => j.scheduled > 0 && j.ratio >= 1)
    .length;
}

/** Le meilleur record, toutes habitudes confondues. */
export function bestStreakOverall(
  log: LogIndex,
  habits: readonly Habit[],
  now: Date = today(),
): number {
  return habits.reduce((max, h) => Math.max(max, bestStreak(log, h, now)), 0);
}

export interface LigneScore {
  habit: Habit;
  pct: number;
  streak: number;
  best: number;
  /** Cumul de la fenêtre pour un type quantitatif ; taux sur un an sinon. */
  total: number;
}

/** Classement des habitudes.
 *
 *  Le score EST le taux de réussite sur la fenêtre. Le plan proposait « pct
 *  pondéré par la série » : aucune référence ne donne cette pondération, et un
 *  coefficient inventé rendrait le classement invérifiable. La série départage
 *  les ex æquo — elle informe le classement sans le fabriquer. */
export function habitRanking(
  log: LogIndex,
  habits: readonly Habit[],
  window: number,
  now: Date = today(),
  sumFn?: (h: Habit) => number,
): LigneScore[] {
  return habits
    .map((h) => ({
      habit: h,
      pct: completionRate(log, h, window, now),
      streak: currentStreak(log, h, now),
      best: bestStreak(log, h, now),
      total: sumFn ? sumFn(h) : 0,
    }))
    .sort((a, b) => b.pct - a.pct || b.streak - a.streak);
}

export interface PartCategorie {
  category: Category;
  /** Taux moyen des habitudes de la catégorie sur la fenêtre. */
  pct: number;
  /** Nombre d'habitudes concernées — une catégorie vide vaut 0, pas « rien ». */
  count: number;
}

/** Répartition par catégorie — `load` du prototype, trié du plus haut au plus bas. */
export function categoryBreakdown(
  log: LogIndex,
  habits: readonly Habit[],
  window: number,
  now: Date = today(),
): PartCategorie[] {
  return CATEGORIES.map((category) => {
    const membres = habits.filter((h) => h.category === category);
    const pct = membres.length
      ? Math.round(
          membres.reduce((s, h) => s + completionRate(log, h, window, now), 0) / membres.length,
        )
      : 0;
    return { category, pct, count: membres.length };
  }).sort((a, b) => b.pct - a.pct);
}

/** Minutes en « 2h 18 ». Le prototype affichait `hm()` ; la mise en forme reste
 *  ici parce qu'elle ne dépend pas de la langue — seules les unités changent,
 *  et elles sont passées par l'appelant. */
export const splitHeuresMinutes = (minutes: number): { h: number; m: number } => ({
  h: Math.floor(Math.max(0, minutes) / 60),
  m: Math.max(0, minutes) % 60,
});
