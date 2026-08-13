import type { DateKey, Task } from './types';
import { addDays, dateKey, startOfWeek, today, type WeekStart } from './date';

/* Géométrie du calendrier — 05-SPEC-VUES.md § 3.

   Tout ce qui se calcule ici est pur : quelles dates compose une grille, où se
   place un évènement, ce que devient une durée qu'on redimensionne. Les
   composants ne font que dessiner le résultat, et ces règles-là se testent
   sans navigateur. */

/** Première et dernière heure affichées dans les grilles horaires.
 *  Le prototype affichait la journée utile plutôt que 24 lignes dont la
 *  moitié reste vide ; les évènements hors bornes sont ramenés au bord. */
export const HEURE_DEBUT = 6;
export const HEURE_FIN = 23;

/** Pas de manipulation, en minutes. Un déplacement au clavier, un
 *  redimensionnement à la souris : tout s'aligne sur le quart d'heure. */
export const PAS_MINUTES = 15;

/** Durée minimale d'un évènement. En dessous, le bloc n'est plus cliquable et
 *  la tâche devient impossible à rattraper. */
export const DUREE_MIN = 15;

export interface CaseMois {
  date: Date;
  key: DateKey;
  /** Appartient au mois affiché — les autres complètent la grille 6×7. */
  inMonth: boolean;
  isToday: boolean;
}

/** Grille 6×7 du mois décalé de `offset` mois. Toujours 42 cases : une grille
 *  qui change de hauteur d'un mois à l'autre fait sauter toute la page. */
export function monthGrid(
  offset: number,
  weekStart: WeekStart = 'mon',
  now: Date = today(),
): CaseMois[] {
  const premier = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const debut = startOfWeek(premier, weekStart);
  const jourCourant = dateKey(now);

  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(debut, i);
    return {
      date,
      key: dateKey(date),
      inMonth:
        date.getMonth() === premier.getMonth() && date.getFullYear() === premier.getFullYear(),
      isToday: dateKey(date) === jourCourant,
    };
  });
}

/** Les sept jours de la semaine décalée de `offset` semaines. */
export function weekDays(
  offset: number,
  weekStart: WeekStart = 'mon',
  now: Date = today(),
): Date[] {
  const debut = addDays(startOfWeek(now, weekStart), offset * 7);
  return Array.from({ length: 7 }, (_, i) => addDays(debut, i));
}

/** 'HH:mm' → minutes depuis minuit. `null` si l'heure est absente ou illisible. */
export function minutesDepuisMinuit(time: string | undefined): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/** minutes depuis minuit → 'HH:mm', borné à la journée. */
export function versHeure(minutes: number): string {
  const borne = Math.max(0, Math.min(24 * 60 - PAS_MINUTES, Math.round(minutes)));
  const deux = (n: number) => String(n).padStart(2, '0');
  return `${deux(Math.floor(borne / 60))}:${deux(borne % 60)}`;
}

/** Arrondit au pas de manipulation. */
export const alignerPas = (minutes: number): number =>
  Math.round(minutes / PAS_MINUTES) * PAS_MINUTES;

export interface Bloc {
  /** Décalage depuis le haut de la grille, en minutes affichées. */
  topMin: number;
  /** Hauteur, en minutes affichées. */
  heightMin: number;
}

/** Place un évènement dans la grille horaire, bornes comprises.
 *  Un évènement qui commence avant l'aube ou déborde la nuit est TRONQUÉ, pas
 *  masqué : le faire disparaître ferait croire qu'il n'existe pas. */
export function blocHoraire(t: Pick<Task, 'time' | 'duration'>): Bloc | null {
  const debut = minutesDepuisMinuit(t.time);
  if (debut === null) return null;

  const hautMin = HEURE_DEBUT * 60;
  const basMin = (HEURE_FIN + 1) * 60;
  const fin = debut + Math.max(DUREE_MIN, t.duration || DUREE_MIN);
  if (fin <= hautMin || debut >= basMin) return null;

  const haut = Math.max(hautMin, debut);
  const bas = Math.min(basMin, fin);
  return { topMin: haut - hautMin, heightMin: Math.max(PAS_MINUTES, bas - haut) };
}

/** Borne une durée : alignée sur le pas, jamais sous le minimum. */
export const borneDuree = (duree: number): number =>
  Math.max(DUREE_MIN, alignerPas(duree || DUREE_MIN));

/** Nouvelle durée après redimensionnement, jamais sous le minimum.
 *
 *  ⚠ Le premier argument est la durée COURANTE, pas une base neutre :
 *  `duree || DUREE_MIN` fait qu'un 0 vaut quinze minutes. Pour se contenter de
 *  borner une durée déjà calculée, c'est `borneDuree` qu'il faut — passer 0
 *  ici ajoute silencieusement le minimum. */
export const redimensionner = (duree: number, deltaMin: number): number =>
  Math.max(DUREE_MIN, alignerPas((duree || DUREE_MIN) + deltaMin));

/** Nouvelle heure après déplacement vertical, bornée à la journée affichée. */
export function decalerHeure(time: string | undefined, deltaMin: number): string {
  const debut = minutesDepuisMinuit(time) ?? HEURE_DEBUT * 60;
  const borne = Math.max(
    HEURE_DEBUT * 60,
    Math.min((HEURE_FIN + 1) * 60 - PAS_MINUTES, debut + deltaMin),
  );
  return versHeure(alignerPas(borne));
}

/** Décale une date-clé de `jours`. */
export function decalerJour(date: DateKey, jours: number): DateKey {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return dateKey(addDays(new Date(y, m - 1, d), jours));
}

/** Deux évènements se chevauchent-ils ? Sert à les répartir en colonnes —
 *  deux blocs superposés en cachent un. */
export function seChevauchent(a: Task, b: Task): boolean {
  if (a.date !== b.date) return false;
  const da = minutesDepuisMinuit(a.time);
  const db = minutesDepuisMinuit(b.time);
  if (da === null || db === null) return false;
  return da < db + (b.duration || DUREE_MIN) && db < da + (a.duration || DUREE_MIN);
}

/** Répartit les tâches d'une journée en colonnes sans recouvrement.
 *  Rend, pour chaque tâche, sa colonne et le nombre total de colonnes. */
export function colonnes(taches: readonly Task[]): Map<string, { col: number; total: number }> {
  const tri = [...taches].sort(
    (a, b) => (minutesDepuisMinuit(a.time) ?? 0) - (minutesDepuisMinuit(b.time) ?? 0),
  );
  const placement = new Map<string, { col: number; total: number }>();
  const groupes: Task[][] = [];

  for (const t of tri) {
    const groupe = groupes.find((g) => g.some((x) => seChevauchent(x, t)));
    if (groupe) groupe.push(t);
    else groupes.push([t]);
  }

  for (const g of groupes) {
    g.forEach((t, i) => placement.set(t.id, { col: i, total: g.length }));
  }
  return placement;
}
