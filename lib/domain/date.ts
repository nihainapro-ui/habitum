/* Helpers de date — portés à l'identique du prototype.
   Semaine commençant lundi : dow() renvoie 0 pour lundi. */

export const startOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const today = (): Date => startOfDay(new Date());

export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** 'YYYY-MM-DD' en heure locale (jamais toISOString : décalerait d'un jour). */
export const dateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseKey = (k: string | null | undefined): Date | null => {
  if (!k) return null;
  const [y, m, day] = String(k).split('-').map(Number);
  if (!y || !m || !day) return null;
  const d = new Date(y, m - 1, day);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** 0 = lundi … 6 = dimanche */
export const dow = (d: Date): number => (d.getDay() + 6) % 7;

export const daysBetween = (a: Date, b: Date): number =>
  Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000);

/** Premier jour de la semaine : 'mon' (défaut du produit) ou 'sun'.
 *  Source unique de la préférence portée par `Settings.weekStart`. */
export type WeekStart = 'mon' | 'sun';

/** Premier jour de la semaine contenant `d`, à minuit, en heure locale.
 *  `dow()` renvoyant 0 pour lundi, le décalage vers dimanche vaut `getDay()`.
 *  Ne modifie jamais la date reçue. */
export const startOfWeek = (d: Date, weekStart: WeekStart = 'mon'): Date => {
  const base = startOfDay(d);
  const offset = weekStart === 'mon' ? dow(base) : base.getDay();
  return addDays(base, -offset);
};
