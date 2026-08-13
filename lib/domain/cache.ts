import { daysBetween, parseKey, today } from './date';
import type { DateKey } from './types';

/* ============================================================================
   Cache dérivé incrémental — tâche 5.9, corrige B3.

   LE PROBLÈME. `bestStreak` balaie 365 jours par habitude. Le prototype vidait
   TOUT son cache dès qu'une case était cochée, y compris sur une autre
   habitude : cocher « boire de l'eau » faisait recalculer le record de six
   habitudes, à chaque clic.

   LA RÈGLE (ADR-0004). Les métriques d'une habitude dépendent de SA définition
   et de SON journal — jamais de celui des autres. L'invalidation est donc
   toujours CIBLÉE.

   Ce que ce cache n'est pas : un cache de rendu. Il ne connaît ni React ni la
   persistance ; il mémorise le résultat d'un calcul pur sous une clé
   `habitude|métrique|fenêtre`, et il l'oublie quand on le lui dit.

   La garantie qui compte, et elle passe avant toute optimisation : **jamais une
   valeur périmée**. En cas de doute, on oublie — recalculer coûte des
   millisecondes, afficher un chiffre faux coûte la confiance dans tous les
   autres (G3).
   ========================================================================= */

export interface DerivedCache {
  /** Rend la valeur mémorisée, ou calcule et mémorise. */
  get<T>(habitId: string, metric: string, window: number, compute: () => T): T;
  /** Oublie tout ce qui concerne une habitude. */
  invalidateHabit(habitId: string): void;
  /** Oublie tout ce dont la fenêtre couvre cette date. */
  invalidateDate(date: DateKey, now?: Date): void;
  clear(): void;
  /** Nombre d'entrées mémorisées. Sert aux tests et à la mise au point. */
  readonly size: number;
}

interface Entree {
  habitId: string;
  window: number;
  valeur: unknown;
}

const cle = (habitId: string, metric: string, window: number): string =>
  `${habitId}|${metric}|${window}`;

export function createDerivedCache(): DerivedCache {
  const entrees = new Map<string, Entree>();

  return {
    get<T>(habitId: string, metric: string, window: number, compute: () => T): T {
      const k = cle(habitId, metric, window);
      const trouve = entrees.get(k);
      if (trouve) return trouve.valeur as T;

      const valeur = compute();
      entrees.set(k, { habitId, window, valeur });
      return valeur;
    },

    invalidateHabit(habitId: string): void {
      for (const [k, e] of entrees) {
        if (e.habitId === habitId) entrees.delete(k);
      }
    },

    /* Une écriture datée n'invalide que les fenêtres qui CONTIENNENT cette
       date. Corriger un oubli d'il y a deux ans ne change pas le taux à 7
       jours ; le récrire ferait payer à chaque saisie le prix de la métrique la
       plus large. Une date FUTURE, elle, invalide tout ce qui pourrait la
       compter — le jour courant se déplace. */
    invalidateDate(date: DateKey, now: Date = today()): void {
      const jour = parseKey(date);
      if (!jour) {
        /* Date illisible : on ne devine pas, on oublie tout. Un cache incertain
           est un cache qu'on vide. */
        entrees.clear();
        return;
      }
      const ecart = daysBetween(now, jour);
      for (const [k, e] of entrees) {
        if (ecart < 0 || e.window > ecart) entrees.delete(k);
      }
    },

    clear(): void {
      entrees.clear();
    },

    get size(): number {
      return entrees.size;
    },
  };
}
