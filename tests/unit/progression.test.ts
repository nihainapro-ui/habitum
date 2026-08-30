import { describe, expect, it } from 'vitest';
import { NB_RANGS, progression } from '@/lib/domain';
import type { Session } from '@/lib/domain';
import {
  DEMO_NOW,
  demoHabits,
  demoLogIndex,
  demoSessions,
  demoTasks,
} from '@/tests/fixtures/demo-seed';

/* Progression de la coque — `lib/domain/progression.ts`.

   Ce que ce fichier protège en priorité n'est pas le barème, c'est la RÈGLE 3
   de CLAUDE.md : un compte sans rien affiche zéro, jamais une estimation.
   L'indice « IDX » de l'en-tête est le plus exposé — il est visible sur les
   onze vues, et c'est exactement le genre de nombre qu'on finit par arrondir
   « pour que ça fasse mieux ». */

const habits = demoHabits();
const tasks = demoTasks();
const log = demoLogIndex();
const sessions = demoSessions();

describe('progression — compte vierge', () => {
  it('n’invente rien : xp 0, niveau 1, rang 0, avancement 0', () => {
    const p = progression(new Map(), [], [], [], DEMO_NOW);

    expect(p.xp).toBe(0);
    expect(p.level).toBe(1);
    expect(p.rankIndex).toBe(0);
    expect(p.into).toBe(0);
    expect(p.pct).toBe(0);
  });

  it('donne l’indice du niveau 1, soit 16 — et le documente', () => {
    /* ATTENTION, ce nombre surprend : un compte vierge affiche « IDX 16 », pas
       « IDX 0 ». Ce n'est pas un chiffre fabriqué au sens de CLAUDE.md § 3 —
       l'indice vaut `ratio·580 + série·12 + niveau·16`, et le niveau plancher
       est 1, pas 0. Les deux premiers termes sont bien nuls.

       C'est l'arithmétique du prototype (`coreVals`, ligne 2884), portée au
       chiffre près. Elle est verrouillée ici parce qu'un lecteur pressé
       corrigerait « l'anomalie » en forçant 0, et ferait alors diverger
       l'indice de sa référence sur toute la plage. */
    expect(progression(new Map(), [], [], [], DEMO_NOW).index).toBe(16);
  });

  it('ne divise pas par zéro quand aucun jour n’est prévu', () => {
    const p = progression(new Map(), [], [], [], DEMO_NOW);
    expect(Number.isFinite(p.pct)).toBe(true);
    expect(p.span).toBeGreaterThan(0);
  });
});

describe('progression — barème', () => {
  it('compte 2 XP par minute de focus réellement enregistrée', () => {
    const uneHeure: Session[] = [
      {
        id: 's1',
        label: 'Focus',
        minutes: 60,
        date: '2026-08-05',
        mode: 'pomo',
        createdAt: '',
        updatedAt: '',
      },
    ];
    /* Sans habitude ni tâche, les deux autres termes sont nuls : ce test
       isole le coefficient des minutes. */
    expect(progression(new Map(), [], [], uneHeure, DEMO_NOW).xp).toBe(120);
  });

  it('ignore les minutes absentes ou illisibles plutôt que de rendre NaN', () => {
    const cassee = [
      { id: 's', label: '', minutes: undefined, date: '2026-08-05', mode: 'pomo' },
    ] as unknown as Session[];
    expect(progression(new Map(), [], [], cassee, DEMO_NOW).xp).toBe(0);
  });

  it('monte de niveau aux seuils de 150·n²', () => {
    /* 150 XP = 75 minutes de focus : le niveau 2 commence là, pas un XP avant. */
    const a = (min: number): number =>
      progression(
        new Map(),
        [],
        [],
        [
          {
            id: 's',
            label: '',
            minutes: min,
            date: '2026-08-05',
            mode: 'pomo',
            createdAt: '',
            updatedAt: '',
          },
        ],
        DEMO_NOW,
      ).level;

    expect(a(74)).toBe(1); // 148 XP
    expect(a(75)).toBe(2); // 150 XP, pile le seuil
    expect(a(300)).toBe(3); // 600 XP = 150·2²
  });

  it('garde l’avancement dans son niveau, jamais au-delà', () => {
    for (const min of [0, 40, 75, 200, 600, 4000]) {
      const p = progression(
        new Map(),
        [],
        [],
        [
          {
            id: 's',
            label: '',
            minutes: min,
            date: '2026-08-05',
            mode: 'pomo',
            createdAt: '',
            updatedAt: '',
          },
        ],
        DEMO_NOW,
      );
      expect(p.into, `minutes=${min}`).toBeGreaterThanOrEqual(0);
      expect(p.into, `minutes=${min}`).toBeLessThanOrEqual(p.span);
      expect(p.pct, `minutes=${min}`).toBeGreaterThanOrEqual(0);
      expect(p.pct, `minutes=${min}`).toBeLessThanOrEqual(100);
    }
  });

  it('n’attribue jamais un rang hors de la table de libellés', () => {
    /* Le rang indexe `app.rank0`…`app.rank6`. Un index débordant afficherait
       une clé brute à l'écran, sur les onze vues. */
    const enorme = progression(
      new Map(),
      [],
      [],
      [
        {
          id: 's',
          label: '',
          minutes: 10_000_000,
          date: '2026-08-05',
          mode: 'pomo',
          createdAt: '',
          updatedAt: '',
        },
      ],
      DEMO_NOW,
    );
    expect(enorme.rankIndex).toBeLessThanOrEqual(NB_RANGS - 1);
    expect(enorme.rankIndex).toBeGreaterThanOrEqual(0);
  });

  it('borne l’indice à 999 quoi qu’il arrive', () => {
    const enorme = progression(
      log,
      habits,
      tasks,
      [
        {
          id: 's',
          label: '',
          minutes: 10_000_000,
          date: '2026-08-05',
          mode: 'pomo',
          createdAt: '',
          updatedAt: '',
        },
      ],
      DEMO_NOW,
    );
    expect(enorme.index).toBeLessThanOrEqual(999);
  });
});

describe('progression — jeu de démonstration', () => {
  it('rend un indice affichable, dans ses bornes', () => {
    const p = progression(log, habits, tasks, sessions, DEMO_NOW);

    expect(p.index).toBeGreaterThanOrEqual(1);
    expect(p.index).toBeLessThanOrEqual(999);
    expect(Number.isInteger(p.index)).toBe(true);
  });

  it('est stable : deux appels sur la même donnée donnent le même nombre', () => {
    /* L'indice se recalcule à chaque rendu de l'en-tête. S'il bougeait sans
       que la donnée bouge, il clignoterait sur les onze vues. */
    expect(progression(log, habits, tasks, sessions, DEMO_NOW)).toEqual(
      progression(log, habits, tasks, sessions, DEMO_NOW),
    );
  });

  it('monte quand le journal se remplit, jamais l’inverse', () => {
    const vide = progression(new Map(), habits, tasks, [], DEMO_NOW);
    const plein = progression(log, habits, tasks, sessions, DEMO_NOW);

    expect(plein.xp).toBeGreaterThan(vide.xp);
    expect(plein.index).toBeGreaterThan(vide.index);
  });
});
