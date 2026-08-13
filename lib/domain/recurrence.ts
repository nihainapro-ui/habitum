import { addDays, dateKey, dow, parseKey, startOfWeek } from './date';
import type { DateKey, Recurrence, Task } from './types';

/* ============================================================================
   Récurrence de tâches — tâche 5.6.

   Une RRULE simplifiée : trois fréquences, un intervalle, et des exceptions par
   occurrence. Volontairement pauvre — le produit gère des tâches personnelles,
   pas des calendriers d'entreprise. Ce qui manque (fins de série, « le 3ᵉ mardi
   du mois », fuseaux distants) manque exprès : chaque règle en plus est une
   règle de plus à expliquer, à afficher et à ne pas casser.

   G1 — la clé d'occurrence garde le format du prototype : `taskId|YYYY-MM-DD`.
   Des utilisateurs ont des données sous ce nom, et un import doit continuer de
   les reconnaître.

   Quatre pièges, tous traités et tous testés :

   1. **Fin de mois.** Une tâche du 31 janvier ne peut pas tomber le 31 février.
      Elle est ramenée au DERNIER JOUR du mois, et le quantième d'origine n'est
      pas perdu pour autant : mars retombe bien le 31.
   2. **Heure d'été.** Tout se calcule en dates locales par `addDays`, jamais en
      millisecondes : une journée ne fait pas toujours 86 400 000 ms, et deux
      fois par an un calcul par différence saute ou double un jour.
   3. **Intervalle.** Il s'ancre sur la date de la tâche, pas sur la fenêtre
      demandée — sinon « tous les 3 jours » changerait de jours selon le mois
      qu'on regarde.
   4. **Fenêtre vide.** Une fenêtre à l'envers ou antérieure à l'ancrage rend
      une liste vide, jamais une exception.
   ========================================================================= */

/* `Recurrence` et la liste des fréquences sont déclarées dans `types.ts`, avec
   les autres listes blanches du modèle (G8). Ici vivent les RÈGLES. */

/** Clé d'occurrence — format `occ` du prototype, FIGÉ (G1). */
export const occurrenceKey = (taskId: string, date: DateKey): string => `${taskId}|${date}`;

/** Découpe une clé d'occurrence. Rend `null` si elle n'a pas la forme attendue :
 *  une clé douteuse est écartée, jamais devinée. */
export function parseOccurrenceKey(cle: string): { taskId: string; date: DateKey } | null {
  const i = cle.indexOf('|');
  if (i <= 0) return null;
  const date = cle.slice(i + 1);
  return parseKey(date) ? { taskId: cle.slice(0, i), date } : null;
}

/** Intervalle utilisable : au moins 1, entier. Un intervalle de 0 rendrait la
 *  série infiniment dense — et une division par zéro plus loin. */
const pas = (r: Recurrence): number => Math.max(1, Math.floor(r.interval ?? 1));

/** Dernier jour du mois de `d`. */
const finDeMois = (d: Date): number => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

/** Écart en mois entre deux dates, signé. */
const moisEntre = (a: Date, b: Date): number =>
  (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());

/** `d` est-il une occurrence de la règle ancrée sur `ancre` ? */
export function estOccurrence(r: Recurrence, ancre: Date, d: Date): boolean {
  if (d < ancre) return false;
  const n = pas(r);

  if (r.freq === 'daily') {
    const jours = Math.round((d.getTime() - ancre.getTime()) / 86_400_000);
    /* Arrondi délibéré : un changement d'heure décale la différence d'une
       heure, jamais d'un jour. `Math.round` absorbe exactement cela. */
    return jours % n === 0;
  }

  if (r.freq === 'weekly') {
    const jours = r.days?.length ? r.days : [dow(ancre)];
    if (!jours.includes(dow(d))) return false;
    const semaines = Math.round(
      (startOfWeek(d).getTime() - startOfWeek(ancre).getTime()) / (7 * 86_400_000),
    );
    return semaines >= 0 && semaines % n === 0;
  }

  const mois = moisEntre(d, ancre);
  if (mois < 0 || mois % n !== 0) return false;
  /* Fin de mois : le quantième visé est ramené au dernier jour du mois quand
     il n'existe pas — un 31 janvier tombe le 28 ou le 29 février. */
  const vise = Math.min(r.dayOfMonth ?? ancre.getDate(), finDeMois(d));
  return d.getDate() === vise;
}

/** Occurrences d'une tâche récurrente sur une fenêtre, exceptions retirées.
 *
 *  `exceptions` porte des DATES (le `taskId` est déjà connu) : ce sont les
 *  occurrences supprimées ou déplacées une fois, sans toucher à la série. */
export function expandRecurrence(
  task: Task,
  from: DateKey,
  to: DateKey,
  exceptions: ReadonlySet<DateKey> = new Set(),
): DateKey[] {
  const r = task.recurrence;
  const debut = parseKey(from);
  const fin = parseKey(to);
  const ancre = parseKey(task.date);
  if (!r || !debut || !fin || !ancre || fin < debut) return [];

  const dates: DateKey[] = [];
  /* On part du plus tardif entre le début de fenêtre et l'ancrage : une série
     n'existe pas avant sa première occurrence. */
  let d = debut < ancre ? ancre : debut;
  while (d <= fin) {
    const k = dateKey(d);
    if (estOccurrence(r, ancre, d) && !exceptions.has(k)) dates.push(k);
    d = addDays(d, 1);
  }
  return dates;
}

/** Nombre de jours parcourus au plus en cherchant l'occurrence suivante.
 *  Deux ans couvrent « tous les 12 mois » ; au-delà, la règle est absurde et
 *  une boucle infinie serait pire qu'un `null`. */
const HORIZON_JOURS = 800;

/** Prochaine occurrence STRICTEMENT après `apres`, exceptions retirées.
 *  `null` s'il n'y en a pas dans l'horizon — la série est alors traitée comme
 *  terminée plutôt que cherchée indéfiniment. */
export function nextOccurrence(
  task: Task,
  apres: DateKey,
  exceptions: ReadonlySet<DateKey> = new Set(),
): DateKey | null {
  const r = task.recurrence;
  const ancre = parseKey(task.date);
  const depuis = parseKey(apres);
  if (!r || !ancre || !depuis) return null;

  /* Après une date antérieure à l'ancrage, la prochaine occurrence est la
     PREMIÈRE de la série — pas le lendemain de l'ancrage. */
  const lendemain = addDays(depuis, 1);
  let d = lendemain < ancre ? ancre : lendemain;
  for (let i = 0; i < HORIZON_JOURS; i++) {
    const k = dateKey(d);
    if (estOccurrence(r, ancre, d) && !exceptions.has(k)) return k;
    d = addDays(d, 1);
  }
  return null;
}
