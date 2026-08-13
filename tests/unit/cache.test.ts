import { describe, expect, it } from 'vitest';
import { createDerivedCache } from '@/lib/domain/cache';

/* Tâche 5.9 — corrige B3 : le prototype vidait tout son cache dès qu'une case
   était cochée, même sur une autre habitude. */

const AUJOURDHUI = new Date('2026-08-05T09:00:00');

describe('createDerivedCache', () => {
  it('cocher une habitude n’invalide pas les métriques des autres', () => {
    const cache = createDerivedCache();
    let calculs = 0;
    const calc = () => {
      calculs++;
      return 42;
    };

    cache.get('h1', 'best', 365, calc);
    cache.get('h2', 'best', 365, calc);
    expect(calculs).toBe(2);

    cache.invalidateHabit('h1');
    cache.get('h1', 'best', 365, calc); // recalculé
    cache.get('h2', 'best', 365, calc); // servi par le cache
    expect(calculs).toBe(3);
  });

  it("n'affiche jamais une valeur périmée", () => {
    const cache = createDerivedCache();
    expect(cache.get('h1', 'streak', 30, () => 3)).toBe(3);
    cache.invalidateHabit('h1');
    expect(cache.get('h1', 'streak', 30, () => 8)).toBe(8);
  });

  it('distingue les métriques et les fenêtres d’une même habitude', () => {
    const cache = createDerivedCache();
    cache.get('h1', 'pct', 7, () => 1);
    cache.get('h1', 'pct', 30, () => 2);
    cache.get('h1', 'streak', 7, () => 3);

    expect(cache.size).toBe(3);
    expect(cache.get('h1', 'pct', 30, () => 99)).toBe(2);
  });

  it('mémorise aussi ce qui vaut zéro, faux ou nul', () => {
    const cache = createDerivedCache();
    let calculs = 0;
    for (const valeur of [0, false, null]) {
      cache.get('h1', String(valeur), 30, () => {
        calculs++;
        return valeur;
      });
      cache.get('h1', String(valeur), 30, () => {
        calculs++;
        return valeur;
      });
    }
    /* Trois calculs, pas six : un zéro mémorisé est une valeur, pas une
       absence. C'est le piège classique du `if (!trouve)`. */
    expect(calculs).toBe(3);
  });

  describe('invalidateDate', () => {
    it('n’invalide que les fenêtres qui contiennent la date', () => {
      const cache = createDerivedCache();
      cache.get('h1', 'pct', 7, () => 1);
      cache.get('h1', 'pct', 365, () => 2);

      /* Un oubli corrigé il y a 40 jours ne change pas le taux à 7 jours. */
      cache.invalidateDate('2026-06-26', AUJOURDHUI);

      expect(cache.get('h1', 'pct', 7, () => 99)).toBe(1);
      expect(cache.get('h1', 'pct', 365, () => 99)).toBe(99);
    });

    it('invalide tout pour le jour courant', () => {
      const cache = createDerivedCache();
      cache.get('h1', 'pct', 7, () => 1);
      cache.get('h2', 'pct', 365, () => 2);

      cache.invalidateDate('2026-08-05', AUJOURDHUI);
      expect(cache.size).toBe(0);
    });

    it('invalide tout pour une date à venir — le jour courant se déplace', () => {
      const cache = createDerivedCache();
      cache.get('h1', 'pct', 7, () => 1);
      cache.invalidateDate('2026-09-01', AUJOURDHUI);
      expect(cache.size).toBe(0);
    });

    it('vide tout sur une date illisible : un cache incertain se vide', () => {
      const cache = createDerivedCache();
      cache.get('h1', 'pct', 7, () => 1);
      cache.invalidateDate('pas-une-date', AUJOURDHUI);
      expect(cache.size).toBe(0);
    });
  });

  it('clear oublie tout', () => {
    const cache = createDerivedCache();
    cache.get('h1', 'pct', 7, () => 1);
    cache.get('h2', 'pct', 7, () => 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
