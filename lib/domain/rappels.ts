import { addDays, dow } from './date';
import type { Habit, RappelBrut, RappelEntite, ReglageRappel, TypeRappel } from './types';

/* ============================================================================
   Réglage d'un rappel — heure, TYPE et CALENDRIER. Spec du 2026-09-16.

   L'ENDROIT UNIQUE où deux absences sont défaites :

   1. `Habit.reminders` a longtemps été une liste d'heures `'HH:MM'`. Le nom de
      la clé est figé (CLAUDE.md § 1) ; son contenu s'est enrichi. Une chaîne
      reste donc valide — c'est un rappel « notification, toujours » — et
      `normaliserRappel()` est le seul code qui sache lire les deux formes.
      Un lecteur qui ferait `typeof r === 'string'` de son côté finirait par
      diverger de celui-ci au premier champ ajouté.

   2. `remindAt` (lot du 2026-09-07) a précédé `rappels[]`. Une entité qui
      porte encore `remindAt` sans `rappels` a UN rappel, à cette heure. Le
      normaliser ici évite de laisser deux vérités concurrentes dans le
      domaine — et les vues n'ont jamais à connaître l'ancienne.

   Le calcul de « ce rappel sonne-t-il ce jour-là ? » vit ici aussi, parce que
   les quatre sources se posent exactement la même question et qu'une réponse
   par source aurait été quatre réponses différentes.
   ========================================================================= */

/** Le type par défaut. Une chaîne nue, un objet sans `type` : notification. */
export const TYPE_RAPPEL_DEFAUT: TypeRappel = 'notif';

/** Lit une des deux formes persistées et rend toujours la forme pleine. */
export function normaliserRappel(r: RappelBrut): ReglageRappel {
  if (typeof r === 'string') return { time: r };
  return r;
}

/** Le type d'un rappel, absence défaite. */
export const typeRappel = (r: ReglageRappel): TypeRappel => r.type ?? TYPE_RAPPEL_DEFAUT;

/** Les rappels d'une habitude, quelle que soit la forme écrite. */
export const rappelsHabitude = (h: Pick<Habit, 'reminders'>): ReglageRappel[] =>
  h.reminders.map(normaliserRappel);

/** Les rappels d'une tâche, d'une étape ou d'un objectif.
 *
 *  `rappels` gagne quand il existe — même vide : une liste vide est un choix
 *  (« aucun rappel propre, je suis les réglages généraux »), pas une absence.
 *  `remindAt` seul est l'écriture d'avant, relue comme un rappel unique. */
export function rappelsEntite(e: RappelEntite): ReglageRappel[] {
  if (e.rappels) return e.rappels;
  return e.remindAt ? [{ time: e.remindAt }] : [];
}

/** Ce rappel doit-il partir le jour `jour` ?
 *
 *  `estEcheance(d)` dit si l'entité est due le jour `d` — c'est la seule chose
 *  que les sources ont à fournir, et c'est ce qui rend le calendrier commun.
 *
 *  - `days`   : certains jours de la semaine seulement (0 = lundi … 6 =
 *               dimanche, la convention de `Habit.days`). Vide = tous.
 *  - `before` : jours AVANT l'échéance. `[0]` = le jour même, `[1]` = la veille,
 *               `[3, 1, 0]` = trois fois. Vide = le jour même seulement.
 *
 *  Une entité sans échéance ne sonne que si `before` la contient au jour
 *  courant — c'est-à-dire jamais par « jours avant », et toujours par
 *  « toujours » : une habitude est due chaque jour où elle est planifiée. */
export function rappelCeJour(
  r: ReglageRappel,
  jour: Date,
  estEcheance: (d: Date) => boolean,
): boolean {
  if (r.days && r.days.length > 0 && !r.days.includes(dow(jour))) return false;
  const avant = r.before && r.before.length > 0 ? r.before : [0];
  return avant.some((n) => estEcheance(addDays(jour, n)));
}

/** Prépare un rappel pour l'ÉCRITURE : les défauts n'y sont pas répétés.
 *
 *  `type: 'notif'` écrit d'office, une liste `days` vide, un `before` à `[0]` :
 *  autant de champs qui disent la même chose que leur absence, et qui
 *  feraient d'un défaut un choix aux yeux de la synchronisation, qui compare
 *  champ à champ. */
export function epurerRappel(r: ReglageRappel): ReglageRappel {
  return {
    time: r.time,
    ...(r.type && r.type !== TYPE_RAPPEL_DEFAUT ? { type: r.type } : {}),
    ...(r.days && r.days.length > 0 ? { days: [...r.days].sort((a, b) => a - b) } : {}),
    ...(r.before && r.before.length > 0 && !(r.before.length === 1 && r.before[0] === 0)
      ? { before: [...new Set(r.before)].sort((a, b) => b - a) }
      : {}),
  };
}

/** Un rappel se réécrit-il en simple chaîne ? Oui s'il n'a que son heure : la
 *  sauvegarde reste alors lisible par une version antérieure du produit. */
export const estRappelNu = (r: ReglageRappel): boolean => {
  const e = epurerRappel(r);
  return e.type === undefined && e.days === undefined && e.before === undefined;
};
