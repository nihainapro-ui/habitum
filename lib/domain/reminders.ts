import { dateKey, startOfDay, today } from './date';
import { isDone } from './metrics';
import { isScheduled } from './schedule';
import type { Habit, LogIndex } from './types';

/* ============================================================================
   Rappels d'habitude — quoi rappeler, et quand.

   Le CALCUL vit ici, pur et testé (G2). Le déclenchement — permission,
   minuteries, service worker — vit dans `lib/features/reminders/`, qui ne
   décide de rien.

   Trois règles, et chacune vient d'un rappel qu'on n'aurait pas voulu recevoir :

   1. **Ce qui n'est pas planifié ce jour-là ne se rappelle pas.** Une habitude
      du lundi ne sonne pas le mardi.
   2. **Ce qui est déjà fait ne se rappelle pas.** Rappeler à quelqu'un de faire
      ce qu'il vient de faire est le plus sûr moyen de lui faire couper les
      notifications.
   3. **Le passé ne se rattrape pas.** Un rappel de 7 h posé à 9 h ne sonne pas
      à l'ouverture : il est passé, il est perdu, et c'est très bien ainsi.
   ========================================================================= */

export interface RappelPrevu {
  habitId: string;
  /** Nom de l'habitude — contenu utilisateur, affiché tel quel. */
  name: string;
  /** Heure `HH:MM` telle qu'elle est enregistrée dans `reminders[]`. */
  time: string;
  /** Instant absolu du déclenchement, en millisecondes. */
  at: number;
}

/** `HH:MM` sur 24 h. Tout le reste est ignoré plutôt que deviné. */
const HEURE_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutes depuis minuit, ou `null` si l'heure n'est pas exploitable. */
export function parseHeure(v: string): number | null {
  const m = HEURE_RE.exec(v);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Rappels restant à déclencher pour la journée de `now`, dans l'ordre.
 *
 *  `log` sert à écarter ce qui est déjà fait ; il n'est pas optionnel, parce
 *  qu'un appelant qui l'oublierait notifierait des habitudes accomplies. */
export function rappelsRestants(
  habits: readonly Habit[],
  log: LogIndex,
  now: Date = today(),
): RappelPrevu[] {
  const jour = startOfDay(now);
  const minutesEcoulees = (now.getTime() - jour.getTime()) / 60_000;
  const prevus: RappelPrevu[] = [];

  for (const h of habits) {
    if (h.archived || h.reminders.length === 0) continue;
    if (!isScheduled(h, jour, now)) continue;
    if (isDone(log, h, jour, now)) continue;

    for (const time of h.reminders) {
      const minutes = parseHeure(time);
      if (minutes === null || minutes <= minutesEcoulees) continue;
      prevus.push({
        habitId: h.id,
        name: h.name,
        time,
        at: jour.getTime() + minutes * 60_000,
      });
    }
  }

  return prevus.sort((a, b) => a.at - b.at);
}

/** Y a-t-il quelque chose à rappeler aujourd'hui ? Sert à ne pas armer de
 *  minuterie pour rien — et à ne pas promettre un rappel qui n'existe pas. */
export const aDesRappels = (habits: readonly Habit[]): boolean =>
  habits.some((h) => !h.archived && h.reminders.some((r) => parseHeure(r) !== null));

/** Clé d'unicité d'un rappel : une habitude, un jour, une heure. Deux onglets
 *  ouverts ne doivent pas notifier deux fois la même chose. */
export const cleRappel = (r: RappelPrevu, now: Date = today()): string =>
  `${r.habitId}|${dateKey(now)}|${r.time}`;
