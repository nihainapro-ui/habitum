import { describe, expect, it } from 'vitest';
import {
  advancePhase,
  CYCLES_POMO,
  elapsedMs,
  formatChrono,
  INTERVAL,
  phaseComplete,
  phaseRatio,
  phaseTargetMs,
  POMO,
  remainingMs,
  sessionMinutes,
  timerInitial,
  type TimerState,
} from '@/lib/domain';

/* B5 — le défaut que ce module corrige : le prototype accumulait le temps par
   ticks de 250 ms. Un onglet en arrière-plan voit ses minuteries ralenties ;
   une session de 25 minutes en rendait 19. Ici l'écoulé se DÉDUIT de deux
   horodatages, donc la dérive n'est pas réduite, elle est impossible. */

const T0 = 1_800_000_000_000; // horodatage arbitraire mais fixe
const etat = (over: Partial<TimerState> = {}): TimerState => ({ ...timerInitial, ...over });

describe('elapsedMs', () => {
  it('ne compte rien tant que rien n’a démarré', () => {
    expect(elapsedMs(etat(), T0)).toBe(0);
  });

  it('déduit l’écoulé de l’horloge murale, pas d’un compteur', () => {
    const s = etat({ startedAt: T0 });
    expect(elapsedMs(s, T0 + 90_000)).toBe(90_000);
  });

  it('ajoute l’écoulé conservé aux pauses successives', () => {
    const s = etat({ startedAt: T0, accumulatedMs: 120_000 });
    expect(elapsedMs(s, T0 + 30_000)).toBe(150_000);
  });

  /* Le cas qui faisait tout dériver : l'onglet dort, aucune minuterie ne
     tourne, et l'écoulé doit être exact au retour. */
  it('reste exact après une longue absence de ticks', () => {
    const s = etat({ startedAt: T0 });
    const vingtCinqMinutes = 25 * 60_000;
    expect(elapsedMs(s, T0 + vingtCinqMinutes)).toBe(vingtCinqMinutes);
    expect(Math.abs(elapsedMs(s, T0 + vingtCinqMinutes) - vingtCinqMinutes)).toBeLessThan(1000);
  });

  it('ne recule jamais si l’horloge recule', () => {
    const s = etat({ startedAt: T0, accumulatedMs: 5_000 });
    expect(elapsedMs(s, T0 - 10_000)).toBe(5_000);
  });
});

describe('phaseTargetMs', () => {
  it('donne les durées du Pomodoro', () => {
    expect(phaseTargetMs(etat({ phase: 'focus' }))).toBe(POMO.focus * 60_000);
    expect(phaseTargetMs(etat({ phase: 'break' }))).toBe(POMO.brk * 60_000);
    expect(phaseTargetMs(etat({ phase: 'longBreak' }))).toBe(POMO.long * 60_000);
  });

  it('rend 0 pour le chronomètre — il n’a pas de terme', () => {
    expect(phaseTargetMs(etat({ mode: 'stopwatch' }))).toBe(0);
    expect(remainingMs(etat({ mode: 'stopwatch' }), T0)).toBeNull();
  });

  it('suit la durée choisie du compte à rebours', () => {
    expect(phaseTargetMs(etat({ mode: 'countdown', countdownMin: 45 }))).toBe(45 * 60_000);
  });

  it('donne 45 s / 15 s aux intervalles', () => {
    expect(phaseTargetMs(etat({ mode: 'interval', phase: 'focus' }))).toBe(INTERVAL.workMs);
    expect(phaseTargetMs(etat({ mode: 'interval', phase: 'break' }))).toBe(INTERVAL.restMs);
  });
});

describe('phaseComplete', () => {
  it('se déclenche au seuil, jamais avant', () => {
    const s = etat({ mode: 'countdown', countdownMin: 1, startedAt: T0 });
    expect(phaseComplete(s, T0 + 59_999)).toBe(false);
    expect(phaseComplete(s, T0 + 60_000)).toBe(true);
  });

  it('ne se déclenche jamais pour un chronomètre', () => {
    const s = etat({ mode: 'stopwatch', startedAt: T0 });
    expect(phaseComplete(s, T0 + 10 * 3_600_000)).toBe(false);
  });
});

describe('advancePhase', () => {
  it('enchaîne concentration et pause courte', () => {
    const suivant = advancePhase(etat({ phase: 'focus', cycle: 1, startedAt: T0 }), T0);
    expect(suivant).toMatchObject({ phase: 'break', cycle: 1, accumulatedMs: 0, startedAt: T0 });
  });

  it('place la pause LONGUE après la quatrième concentration', () => {
    const suivant = advancePhase(etat({ phase: 'focus', cycle: CYCLES_POMO }), T0);
    expect(suivant.phase).toBe('longBreak');
  });

  it('repart au cycle 1 après la pause longue', () => {
    const suivant = advancePhase(etat({ phase: 'longBreak', cycle: CYCLES_POMO }), T0);
    expect(suivant).toMatchObject({ phase: 'focus', cycle: 1 });
  });

  it('incrémente le cycle après une pause courte', () => {
    expect(advancePhase(etat({ phase: 'break', cycle: 2 }), T0).cycle).toBe(3);
  });

  it('arrête les intervalles au bout de huit cycles', () => {
    const fin = advancePhase(etat({ mode: 'interval', phase: 'break', cycle: 8 }), T0);
    expect(fin).toMatchObject({ phase: 'focus', cycle: 1, startedAt: null });
  });

  it('arrête le compte à rebours à la fin — la fin est la fin', () => {
    const fin = advancePhase(etat({ mode: 'countdown', startedAt: T0 }), T0);
    expect(fin.startedAt).toBeNull();
    expect(fin.accumulatedMs).toBe(0);
  });
});

describe('phaseRatio', () => {
  it('progresse de 0 à 1 sur une phase bornée', () => {
    const s = etat({ mode: 'countdown', countdownMin: 10, startedAt: T0 });
    expect(phaseRatio(s, T0)).toBe(0);
    expect(phaseRatio(s, T0 + 5 * 60_000)).toBeCloseTo(0.5, 5);
    expect(phaseRatio(s, T0 + 20 * 60_000)).toBe(1);
  });

  it('boucle sur la minute pour un chronomètre', () => {
    const s = etat({ mode: 'stopwatch', startedAt: T0 });
    expect(phaseRatio(s, T0 + 90_000)).toBeCloseTo(0.5, 5);
  });
});

describe('sessionMinutes', () => {
  it('ne perd pas une session courte, mais ne fabrique rien', () => {
    expect(sessionMinutes(0)).toBe(0);
    expect(sessionMinutes(40_000)).toBe(1);
    expect(sessionMinutes(25 * 60_000)).toBe(25);
  });
});

describe('formatChrono', () => {
  it('affiche mm:ss, puis h:mm:ss au-delà de l’heure', () => {
    expect(formatChrono(0)).toBe('00:00');
    expect(formatChrono(65_000)).toBe('01:05');
    expect(formatChrono(3_725_000)).toBe('1:02:05');
  });

  it('n’affiche jamais de temps négatif', () => {
    expect(formatChrono(-5_000)).toBe('00:00');
  });
});
