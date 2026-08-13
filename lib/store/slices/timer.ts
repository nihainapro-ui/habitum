import type { StateCreator } from 'zustand';
import {
  advancePhase,
  dateKey,
  elapsedMs,
  phaseComplete,
  sessionMinutes,
  timerInitial,
  today,
  type TimerMode,
  type TimerState,
  type TimerTarget,
} from '@/lib/domain';
import { META_KEYS, metaRepo } from '@/lib/data';
import type { AppState, TimerActions } from '../types';

/* Tranche du minuteur — corrige B5.

   L'état persiste à chaque transition, jamais à chaque tick : ce qu'on écrit,
   ce sont deux nombres (`startedAt`, `accumulatedMs`), pas un compteur qui
   avance. Une session survit donc au rechargement sans qu'on ait rien écrit
   entre-temps.

   À la RESTAURATION, la session reprend TOUJOURS en pause, écoulé conservé.
   Additionner le temps réel d'une session commencée il y a trois jours
   compterait comme travaillées 72 heures pendant lesquelles l'application
   était fermée. */

/** Enregistre l'état sans bloquer l'interface : le minuteur ne doit pas
 *  attendre la base pour démarrer. Une écriture perdue coûte au pire la
 *  restauration d'une session ; une latence au démarrage se voit à chaque clic. */
const persister = (t: TimerState): void => {
  void metaRepo.set(META_KEYS.timer, t);
};

/** Période du battement d'enregistrement pendant qu'une session tourne.
 *
 *  Sans lui, seul `startedAt` serait enregistré, et une fermeture d'onglet en
 *  pleine session perdrait TOUT l'écoulé : la restauration repartirait de
 *  zéro. On ne peut pas non plus recalculer `maintenant − startedAt` au
 *  retour — cela compterait comme travaillé le temps où l'application était
 *  fermée, ce que le plan interdit explicitement.
 *
 *  Le battement écrit donc, toutes les cinq secondes, un instantané
 *  ÉQUIVALENT (même écoulé total, ancré à l'instant présent). Au pire, une
 *  fermeture brutale coûte cinq secondes — pas la session. Écrire à chaque
 *  tick de 250 ms coûterait quarante écritures par seconde pour la même
 *  garantie à un dixième près. */
const BATTEMENT_MS = 5_000;
let dernierBattement = 0;

/** Garde de ré-entrance : la fin de phase écrit une session, ce qui prend
 *  quelques millisecondes en base. Sans ce verrou, les ticks suivants — 250 ms
 *  plus tard — verraient encore le seuil franchi et enregistreraient la même
 *  concentration deux ou trois fois. */
let transitionEnCours = false;

export const createTimerSlice: StateCreator<AppState, [], [], TimerActions> = (set, get) => {
  const majTimer = (suivant: TimerState) => {
    persister(suivant);
    set({ timer: suivant });
  };

  return {
    setTimerMode(mode: TimerMode) {
      majTimer({
        ...timerInitial,
        countdownMin: get().timer.countdownMin,
        target: get().timer.target,
        mode,
      });
    },

    setTimerTarget(target: TimerTarget) {
      majTimer({ ...get().timer, target });
    },

    setCountdown(minutes: number) {
      majTimer({
        ...timerInitial,
        target: get().timer.target,
        mode: 'countdown',
        countdownMin: Math.max(1, Math.round(minutes)),
      });
    },

    startTimer() {
      const t = get().timer;
      if (t.startedAt !== null) return;
      majTimer({ ...t, startedAt: Date.now() });
    },

    pauseTimer() {
      const t = get().timer;
      if (t.startedAt === null) return;
      majTimer({ ...t, startedAt: null, accumulatedMs: elapsedMs(t, Date.now()) });
    },

    resetTimer() {
      majTimer({ ...get().timer, startedAt: null, accumulatedMs: 0, phase: 'focus', cycle: 1 });
    },

    /* Enregistre le temps écoulé en session, puis remet la phase à zéro.
       G3 : les minutes viennent de l'horloge, jamais d'une estimation. */
    async logTimerSession(): Promise<void> {
      const t = get().timer;
      const minutes = sessionMinutes(elapsedMs(t, Date.now()));
      if (minutes <= 0) return;

      await get().creditSession(minutes, t);
      majTimer({ ...t, startedAt: null, accumulatedMs: 0 });
    },

    /* Écrit la session et, si une habitude est visée, lui crédite le temps.
       Le crédit ne concerne que les habitudes qui COMPTENT du temps : ajouter
       15 à une habitude « oui / non » n'aurait aucun sens. */
    async creditSession(minutes: number, t: TimerState): Promise<void> {
      const habit =
        t.target.kind === 'h' ? get().habits.find((h) => h.id === t.target.id) : undefined;
      const task =
        t.target.kind === 't' ? get().tasks.find((k) => k.id === t.target.id) : undefined;

      /* Le crédit AVANT la session, et non l'inverse : la session est ce qui
         devient visible à l'écran. L'écrire en dernier garantit qu'au moment
         où elle apparaît, tout ce qu'elle implique est déjà en base. Dans
         l'autre sens, une navigation immédiate pouvait devancer le crédit. */
      if (habit && (habit.goal.kind === 'time' || habit.goal.kind === 'total')) {
        await get().bumpHabit(habit.id, dateKey(today()), minutes);
      }

      await get().createSession({
        label: habit?.name ?? task?.name ?? '',
        minutes,
        date: dateKey(today()),
        mode: t.mode,
        ...(habit ? { habitId: habit.id } : {}),
      });
    },

    /* Appelé par le rendu périodique de la vue. Le tick ne fait AVANCER
       aucun compteur : il constate que le seuil est franchi, et il en tire les
       conséquences. C'est la différence entre mesurer et accumuler. */
    async tickTimer(): Promise<void> {
      const t = get().timer;
      if (t.startedAt === null || transitionEnCours) return;

      const maintenant = Date.now();

      if (maintenant - dernierBattement >= BATTEMENT_MS) {
        dernierBattement = maintenant;
        persister({ ...t, startedAt: maintenant, accumulatedMs: elapsedMs(t, maintenant) });
      }

      if (!phaseComplete(t, maintenant)) return;

      /* Une phase de concentration terminée EST du temps travaillé : on
         l'enregistre. Le prototype ne le faisait que pour le compte à rebours,
         et les minutes de Pomodoro n'apparaissaient donc jamais nulle part. */
      transitionEnCours = true;
      try {
        if (t.phase === 'focus') {
          await get().creditSession(sessionMinutes(elapsedMs(t, maintenant)), t);
        }
        majTimer(advancePhase(t, maintenant));
      } finally {
        transitionEnCours = false;
      }
    },

    /** Relit l'état persisté. Toujours EN PAUSE — voir l'en-tête du module. */
    async restoreTimer(): Promise<boolean> {
      const enregistre = await metaRepo.get<TimerState>(META_KEYS.timer);
      if (!enregistre) return false;

      const ecoule = enregistre.accumulatedMs ?? 0;
      set({ timer: { ...timerInitial, ...enregistre, startedAt: null, accumulatedMs: ecoule } });
      return enregistre.startedAt !== null || ecoule > 0;
    },
  };
};
