import { describe, expect, it } from 'vitest';
import {
  dateKey,
  nbJoursJournalises,
  partagerPlusTard,
  resumeJours,
  semaineDe,
  type EntreeJour,
} from '@/lib/domain';

/* Briques de domaine ajoutées pour la refonte mobile (P1). Chacune descend
   ici plutôt que dans un composant — CLAUDE.md § 2 — et chacune rend une
   FORME, jamais un libellé. */

describe('semaineDe', () => {
  it('rend sept jours, du lundi au dimanche par défaut', () => {
    /* Mercredi 5 août 2026 — la date figée du dossier. */
    const jours = semaineDe(new Date(2026, 7, 5));
    expect(jours.map(dateKey)).toEqual([
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
      '2026-08-09',
    ]);
  });

  it('commence le dimanche quand la préférence le dit', () => {
    const jours = semaineDe(new Date(2026, 7, 5), 'sun');
    expect(dateKey(jours[0]!)).toBe('2026-08-02');
    expect(dateKey(jours[6]!)).toBe('2026-08-08');
  });

  it('ne dépend pas de l’heure de la date reçue', () => {
    const jours = semaineDe(new Date(2026, 7, 5, 23, 59));
    expect(dateKey(jours[0]!)).toBe('2026-08-03');
  });
});

describe('partagerPlusTard', () => {
  const entree = (id: string, time: string | null): EntreeJour =>
    ({ kind: 'task', id, time, task: {} as never, done: false, date: '2026-08-05' }) as EntreeJour;

  it('replie sous « plus tard » les entrées sans heure', () => {
    const { maintenant, plusTard } = partagerPlusTard([
      entree('a', '09:00'),
      entree('b', null),
      entree('c', '15:00'),
    ]);
    expect(maintenant.map((e) => e.id)).toEqual(['a', 'c']);
    expect(plusTard.map((e) => e.id)).toEqual(['b']);
  });

  it('ne replie RIEN quand aucune entrée n’a d’heure', () => {
    /* Replier toute la liste serait la cacher. */
    const { maintenant, plusTard } = partagerPlusTard([entree('a', null), entree('b', null)]);
    expect(maintenant).toHaveLength(2);
    expect(plusTard).toHaveLength(0);
  });

  it('garde l’ordre reçu', () => {
    const { maintenant } = partagerPlusTard([entree('z', '18:00'), entree('a', '08:00')]);
    expect(maintenant.map((e) => e.id)).toEqual(['z', 'a']);
  });
});

describe('nbJoursJournalises', () => {
  it('compte les jours de CETTE habitude, zéro compris', () => {
    const log = new Map([
      ['h1|2026-08-01', 1],
      ['h1|2026-08-02', 0],
      ['h10|2026-08-03', 1],
      ['h2|2026-08-03', 1],
    ]);
    expect(nbJoursJournalises(log, 'h1')).toBe(2);
    /* `h1` est un préfixe de `h10` : la clé porte un séparateur, pas le
       seul identifiant. */
    expect(nbJoursJournalises(log, 'h10')).toBe(1);
  });

  it('rend 0 pour une habitude jamais cochée', () => {
    expect(nbJoursJournalises(new Map(), 'h1')).toBe(0);
  });
});

describe('resumeJours', () => {
  it('reconnaît la semaine, le week-end, tous les jours et aucun', () => {
    expect(resumeJours([0, 1, 2, 3, 4])).toEqual({ forme: 'weekdays', n: 5 });
    expect(resumeJours([5, 6])).toEqual({ forme: 'weekend', n: 2 });
    expect(resumeJours([0, 1, 2, 3, 4, 5, 6])).toEqual({ forme: 'all', n: 7 });
    expect(resumeJours([])).toEqual({ forme: 'none', n: 0 });
  });

  it('nomme « personnalisé » toute autre sélection, et compte sans doublon', () => {
    expect(resumeJours([0, 2, 3])).toEqual({ forme: 'custom', n: 3 });
    expect(resumeJours([0, 0, 1])).toEqual({ forme: 'custom', n: 2 });
  });
});
