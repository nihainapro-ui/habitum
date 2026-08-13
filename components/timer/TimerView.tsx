'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pause, Play, RotateCcw, Save } from 'lucide-react';
import {
  CYCLES_POMO,
  dateKey,
  elapsedMs,
  formatChrono,
  INTERVAL,
  focusTargets,
  phaseRatio,
  PRESETS_COUNTDOWN,
  remainingMs,
  sessionsOfDay,
  splitHeuresMinutes,
  TIMER_MODES,
  today,
  type TimerMode,
} from '@/lib/domain';
import { useFocusMinutes, useStore } from '@/lib/store';
import { Panel } from '@/components/ui';
import { ViewHeader } from '@/components/shell/view-header';
import { TimerDial } from './TimerDial';

/* Vue « Focus » — 05-SPEC-VUES.md § 9, corrige B5.

   Le rendu périodique est PUREMENT d'affichage : il redessine, et demande au
   store de constater si le seuil de phase est franchi. Aucun compteur n'avance
   ici. C'est ce qui rend la dérive impossible plutôt que faible. */

const PERIODE_MS = 250;

const CLES_MODE: Record<TimerMode, string> = {
  pomo: 'tmPomodoro',
  stopwatch: 'tmStopwatch',
  countdown: 'tmCountdown',
  interval: 'tmIntervals',
};

const CLES_PHASE = { focus: 'tmFocus', break: 'tmBreak', longBreak: 'tmLongBreak' } as const;

export function TimerView() {
  const t = useTranslations('app');
  const ts = useTranslations('system');

  const timer = useStore((s) => s.timer);
  const sessions = useStore((s) => s.sessions);
  const habits = useStore((s) => s.habits);
  const tasks = useStore((s) => s.tasks);

  const startTimer = useStore((s) => s.startTimer);
  const pauseTimer = useStore((s) => s.pauseTimer);
  const resetTimer = useStore((s) => s.resetTimer);
  const logTimerSession = useStore((s) => s.logTimerSession);
  const setTimerMode = useStore((s) => s.setTimerMode);
  const setTimerTarget = useStore((s) => s.setTimerTarget);
  const setCountdown = useStore((s) => s.setCountdown);
  const restoreTimer = useStore((s) => s.restoreTimer);
  const tickTimer = useStore((s) => s.tickTimer);

  const [maintenant, setMaintenant] = useState<number | null>(null);
  const [restauree, setRestauree] = useState(false);

  /* L'état persisté se relit une fois, au montage. `maintenant` reste `null`
     jusque-là : les routes sont prérendues, et une horloge lue au rendu
     afficherait celle de la compilation (erreur d'hydratation #418). */
  useEffect(() => {
    void (async () => {
      setRestauree(await restoreTimer());
      setMaintenant(Date.now());
    })();
  }, [restoreTimer]);

  useEffect(() => {
    const battement = setInterval(() => {
      setMaintenant(Date.now());
      void tickTimer();
    }, PERIODE_MS);
    return () => clearInterval(battement);
  }, [tickTimer]);

  const horloge = maintenant ?? 0;
  const enMarche = timer.startedAt !== null;
  const restant = maintenant === null ? null : remainingMs(timer, horloge);
  const ecoule = maintenant === null ? 0 : elapsedMs(timer, horloge);
  const affichage = formatChrono(restant ?? ecoule);
  const ratio = maintenant === null ? 0 : phaseRatio(timer, horloge);

  const jour = dateKey(today());
  const duJour = sessionsOfDay(sessions, jour);
  /* Le total du jour passe par `focusMinutes` — la fonction que l'oracle
     protège — plutôt que par une somme réécrite ici. Une fenêtre d'un jour,
     c'est aujourd'hui. */
  const { h, m } = splitHeuresMinutes(useFocusMinutes(1));

  const cibles = [
    { kind: '' as const, id: '', label: t('tmNoTarget') },
    ...focusTargets(habits, tasks, jour),
  ];

  const puce = (actif: boolean) => ({
    borderColor: actif ? 'var(--acc2)' : 'var(--line)',
    background: actif ? 'var(--panel2)' : 'transparent',
    color: actif ? 'var(--txt)' : 'var(--txt2)',
  });

  /* Les gabarits sont composés hors du JSX : `jsx-no-literals` les y interdit,
     et c'est ce qui garantit qu'aucun libellé ne s'y glisse. */
  const minutes = (n: number) => `${n} min`;
  const heuresMinutes = `${h} h ${m}`;
  const avecCycles = timer.mode === 'pomo' || timer.mode === 'interval';
  const totalCycles = timer.mode === 'interval' ? INTERVAL.cycles : CYCLES_POMO;

  return (
    <div className="flex flex-col gap-4">
      <ViewHeader titleKey="navTimer" subKey="timerSub" />

      {restauree ? (
        <p
          role="status"
          className="rounded-field m-0 border px-4 py-2.5 text-[12.5px]"
          style={{ borderColor: 'var(--line2)', color: 'var(--txt2)' }}
        >
          {ts('tmRestored')}
        </p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 min-[1060px]:grid-cols-[minmax(0,1fr)_320px]">
        <section
          className="rounded-panel flex flex-col items-center gap-5 border p-6"
          style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
        >
          <div
            role="radiogroup"
            aria-label={t('tmMode')}
            className="flex flex-wrap justify-center gap-2"
          >
            {TIMER_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={timer.mode === mode}
                onClick={() => setTimerMode(mode)}
                className="rounded-btn cursor-pointer border px-3 py-1.5 text-[12px]"
                style={puce(timer.mode === mode)}
              >
                {t(CLES_MODE[mode])}
              </button>
            ))}
          </div>

          <TimerDial ratio={ratio} phase={timer.phase} label={`${t('focusTime')} : ${affichage}`}>
            <span data-testid="elapsed" className="font-mono text-[38px] font-bold">
              {affichage}
            </span>
            {avecCycles ? (
              <>
                <span
                  data-testid="phase"
                  className="font-mono text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: 'var(--txt2)' }}
                >
                  {t(CLES_PHASE[timer.phase])}
                </span>
                <span className="font-mono text-[10px]" style={{ color: 'var(--mut)' }}>
                  {t('tmCycle', { n: timer.cycle, total: totalCycles })}
                </span>
              </>
            ) : null}
          </TimerDial>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => (enMarche ? pauseTimer() : startTimer())}
              className="rounded-btn flex cursor-pointer items-center gap-2 border-0 px-5 py-2.5 text-[12.5px] font-bold"
              style={{
                background: 'linear-gradient(135deg, var(--acc), var(--acc2))',
                color: '#04060d',
              }}
            >
              {enMarche ? (
                <Pause size={14} aria-hidden="true" />
              ) : (
                <Play size={14} aria-hidden="true" />
              )}
              {enMarche ? t('tmPause') : ecoule > 0 ? t('tmResume') : t('tmStart')}
            </button>

            <button
              type="button"
              onClick={() => void logTimerSession()}
              disabled={ecoule <= 0}
              className="rounded-btn flex cursor-pointer items-center gap-2 border px-4 py-2.5 text-[12.5px] disabled:opacity-40"
              style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
            >
              <Save size={13} aria-hidden="true" />
              {t('tmSave')}
            </button>

            <button
              type="button"
              onClick={resetTimer}
              className="rounded-btn flex cursor-pointer items-center gap-2 border px-4 py-2.5 text-[12.5px]"
              style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
            >
              <RotateCcw size={13} aria-hidden="true" />
              {t('tmReset')}
            </button>
          </div>

          {timer.mode === 'countdown' ? (
            <div role="radiogroup" aria-label={t('presets')} className="flex flex-wrap gap-2">
              {PRESETS_COUNTDOWN.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={timer.countdownMin === n}
                  onClick={() => setCountdown(n)}
                  className="rounded-btn cursor-pointer border px-3 py-1.5 text-[11.5px]"
                  style={puce(timer.countdownMin === n)}
                >
                  {minutes(n)}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <div className="flex flex-col gap-4">
          <Panel title={t('tmTargetL')} padding={14}>
            <div role="radiogroup" aria-label={t('tmTargetL')} className="flex flex-wrap gap-2">
              {cibles.map((c) => {
                const actif = timer.target.kind === c.kind && timer.target.id === c.id;
                return (
                  <button
                    key={`${c.kind}-${c.id}`}
                    type="button"
                    role="radio"
                    aria-checked={actif}
                    onClick={() => setTimerTarget({ kind: c.kind, id: c.id })}
                    className="rounded-btn cursor-pointer border px-3 py-1.5 text-[11.5px]"
                    style={puce(actif)}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel
            title={t('sessions')}
            padding={14}
            actions={
              <span className="font-mono text-[11px]" style={{ color: 'var(--acc2)' }}>
                {heuresMinutes}
              </span>
            }
          >
            {duJour.length === 0 ? (
              <p
                data-testid="empty-state"
                className="m-0 text-[12.5px]"
                style={{ color: 'var(--mut)' }}
              >
                {t('noSessions')}
              </p>
            ) : (
              <ul data-sessions className="m-0 flex list-none flex-col gap-2.5 p-0">
                {duJour.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-[12.5px]">
                    <span className="min-w-0 flex-1 truncate">{s.label || t('focusTime')}</span>
                    <span className="font-mono text-[11px]" style={{ color: 'var(--txt2)' }}>
                      {minutes(s.minutes)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
