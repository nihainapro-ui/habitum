/* Minuteur — modèle d'état et transitions. Corrige B5.

   LA RÈGLE : le temps écoulé n'est JAMAIS accumulé par les ticks d'affichage.
   Il se calcule à chaque lecture depuis une horloge murale :

       écoulé = accumulatedMs + (startedAt ? maintenant − startedAt : 0)

   Le prototype incrémentait un compteur toutes les 250 ms. Un onglet en
   arrière-plan voit ses minuteries ralenties par le navigateur : une session
   de 25 minutes en rendait 19. Avec un ancrage sur `Date.now()`, la dérive
   n'est pas réduite — elle est STRUCTURELLEMENT nulle, quel que soit le
   comportement des minuteries. Le rendu périodique ne sert plus qu'à
   rafraîchir l'affichage, et la fin de phase se détecte par comparaison au
   seuil, jamais par un compte de ticks. */

export const TIMER_MODES = ['pomo', 'stopwatch', 'countdown', 'interval'] as const;
export type TimerMode = (typeof TIMER_MODES)[number];

export type TimerPhase = 'focus' | 'break' | 'longBreak';

/** Minutes du Pomodoro — `POMO` du prototype. */
export const POMO = { focus: 25, brk: 5, long: 15 } as const;

/** Nombre de concentrations avant la pause longue. */
export const CYCLES_POMO = 4;

/** Intervalles : 45 s d'effort, 15 s de repos, huit fois. */
export const INTERVAL = { workMs: 45_000, restMs: 15_000, cycles: 8 } as const;

/** Durées proposées au compte à rebours, en minutes. */
export const PRESETS_COUNTDOWN = [10, 20, 25, 45, 60] as const;

export interface TimerTarget {
  /** 'h' = habitude, 't' = tâche, '' = aucune. Correspond à `tt` du prototype. */
  kind: 'h' | 't' | '';
  id: string;
}

export interface TimerState {
  mode: TimerMode;
  phase: TimerPhase;
  /** 1 … CYCLES_POMO (ou INTERVAL.cycles). */
  cycle: number;
  /** Horodatage mural du dernier démarrage ; `null` si en pause. */
  startedAt: number | null;
  accumulatedMs: number;
  /** Minutes du compte à rebours. */
  countdownMin: number;
  target: TimerTarget;
}

export const timerInitial: TimerState = {
  mode: 'pomo',
  phase: 'focus',
  cycle: 1,
  startedAt: null,
  accumulatedMs: 0,
  countdownMin: 25,
  target: { kind: '', id: '' },
};

/** Durée de la phase courante, en millisecondes. `0` = sans terme (chronomètre). */
export function phaseTargetMs(s: TimerState): number {
  switch (s.mode) {
    case 'stopwatch':
      return 0;
    case 'countdown':
      return Math.max(1, s.countdownMin) * 60_000;
    case 'interval':
      return s.phase === 'focus' ? INTERVAL.workMs : INTERVAL.restMs;
    default:
      return (
        (s.phase === 'focus' ? POMO.focus : s.phase === 'longBreak' ? POMO.long : POMO.brk) * 60_000
      );
  }
}

/** Temps écoulé de la phase courante. Lecture pure : aucun effet de bord. */
export function elapsedMs(s: TimerState, now: number): number {
  const enCours = s.startedAt === null ? 0 : Math.max(0, now - s.startedAt);
  return s.accumulatedMs + enCours;
}

/** Temps restant, ou `null` pour un chronomètre — qui ne « reste » pas. */
export function remainingMs(s: TimerState, now: number): number | null {
  const cible = phaseTargetMs(s);
  return cible === 0 ? null : Math.max(0, cible - elapsedMs(s, now));
}

/** Avancement 0–1 de la phase. Un chronomètre boucle sur la minute : sans
 *  terme, il n'y a pas de fraction à montrer, seulement un mouvement. */
export function phaseRatio(s: TimerState, now: number): number {
  const cible = phaseTargetMs(s);
  const ecoule = elapsedMs(s, now);
  if (cible === 0) return (ecoule % 60_000) / 60_000;
  return Math.min(1, ecoule / cible);
}

/** La phase est-elle terminée ? Comparaison au SEUIL, jamais un compte de ticks. */
export function phaseComplete(s: TimerState, now: number): boolean {
  const cible = phaseTargetMs(s);
  return cible > 0 && elapsedMs(s, now) >= cible;
}

/** État après la fin de la phase courante.
 *
 *  Le compte à rebours et le chronomètre s'arrêtent ; le Pomodoro et les
 *  intervalles enchaînent. La pause LONGUE suit la quatrième concentration —
 *  le prototype ne l'avait pas, le plan 5 § 5.9 l'impose. */
export function advancePhase(s: TimerState, now: number): TimerState {
  const base = { ...s, accumulatedMs: 0, startedAt: now };

  if (s.mode === 'interval') {
    if (s.phase !== 'focus') {
      const cycle = s.cycle + 1;
      return cycle > INTERVAL.cycles
        ? { ...s, phase: 'focus', cycle: 1, accumulatedMs: 0, startedAt: null }
        : { ...base, phase: 'focus', cycle };
    }
    return { ...base, phase: 'break' };
  }

  if (s.mode === 'pomo') {
    if (s.phase === 'focus') {
      return { ...base, phase: s.cycle >= CYCLES_POMO ? 'longBreak' : 'break' };
    }
    /* Après une pause longue, le compteur de cycles repart de 1. */
    const cycle = s.phase === 'longBreak' ? 1 : s.cycle + 1;
    return { ...base, phase: 'focus', cycle };
  }

  /* Compte à rebours et chronomètre : la fin est la fin. */
  return { ...s, startedAt: null, accumulatedMs: 0 };
}

/** Minutes à créditer pour un temps écoulé. Au moins une minute dès qu'une
 *  session a réellement tourné : arrondir 40 secondes à zéro effacerait du
 *  travail fait. Zéro reste zéro. */
export const sessionMinutes = (ms: number): number =>
  ms <= 0 ? 0 : Math.max(1, Math.round(ms / 60_000));

/** Formate en `mm:ss`, ou `h:mm:ss` au-delà de l'heure. */
export function formatChrono(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const deux = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${deux(m)}:${deux(s)}` : `${deux(m)}:${deux(s)}`;
}

/** Période du battement d'affichage du minuteur, en millisecondes.
 *
 *  Elle ne fait avancer AUCUN compteur — le temps se lit sur l'horloge murale
 *  (`elapsedMs`). Elle dit seulement à quelle cadence l'écran se redessine et
 *  demande au store de constater un franchissement de phase.
 *
 *  Elle vit ici plutôt que dans `TimerView` parce que deux lecteurs en ont
 *  besoin : la vue, et le harnais de recette, qui doit avancer une horloge
 *  figée d'un nombre ENTIER de battements sous peine de déphaser `startedAt`
 *  par rapport à la grille de ticks (`tests/e2e/helpers/app.ts`). */
export const PERIODE_BATTEMENT_MS = 250;
