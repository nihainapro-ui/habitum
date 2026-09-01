'use client';

import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useTranslations } from 'next-intl';
import {
  addDays,
  blocHoraire,
  colonnes,
  dateKey,
  HEURE_DEBUT,
  HEURE_FIN,
  today,
  versHeure,
  weekDays,
  type Task,
} from '@/lib/domain';
import { useSettings, useStore } from '@/lib/store';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import { EventBlock } from './EventBlock';

/* Grilles horaires — semaine (sept colonnes) et jour (une seule).

   Une seule implémentation pour les deux modes : « jour » est la semaine avec
   une colonne. Deux composants auraient divergé au premier ajustement de
   hauteur de ligne. */

/** Hauteur d'une heure, en pixels. Une minute vaut donc 4/3 de pixel. */
const HAUTEUR_HEURE = 44;
const NB_HEURES = HEURE_FIN - HEURE_DEBUT + 1;

const enPixels = (minutes: number) => (minutes / 60) * HAUTEUR_HEURE;

function ColonneJour({ date, taches }: { date: Date; taches: Task[] }) {
  const cle = dateKey(date);
  const placement = useMemo(() => colonnes(taches), [taches]);

  /* Une zone de dépôt par HEURE : le déposé retombe sur l'heure pleine, ce qui
     est prévisible. Le quart d'heure reste accessible au clavier, où il est
     précis sans demander de viser. */
  const heures = Array.from({ length: NB_HEURES }, (_, i) => HEURE_DEBUT + i);

  return (
    <div
      data-day-column={cle}
      className="relative min-w-0 flex-1 border-r last:border-r-0"
      style={{ borderColor: 'var(--line)', height: NB_HEURES * HAUTEUR_HEURE }}
    >
      {heures.map((h) => (
        <CaseHoraire key={h} date={cle} heure={h} />
      ))}

      {taches.map((k) => {
        const bloc = blocHoraire(k);
        if (!bloc) return null;
        const p = placement.get(k.id) ?? { col: 0, total: 1 };
        return (
          <EventBlock
            key={k.id}
            task={k}
            style={{
              position: 'absolute',
              top: enPixels(bloc.topMin),
              height: Math.max(18, enPixels(bloc.heightMin) - 2),
              left: `calc(${(p.col / p.total) * 100}% + 2px)`,
              width: `calc(${100 / p.total}% - 4px)`,
            }}
          />
        );
      })}
    </div>
  );
}

function CaseHoraire({ date, heure }: { date: string; heure: number }) {
  const heureTexte = versHeure(heure * 60);
  const { setNodeRef, isOver } = useDroppable({
    id: `creneau:${date}:${heureTexte}`,
    data: { date, time: heureTexte },
  });

  return (
    <div
      ref={setNodeRef}
      className="border-b"
      style={{
        height: HAUTEUR_HEURE,
        borderColor: 'var(--line)',
        background: isOver ? 'color-mix(in srgb, var(--acc2) 16%, transparent)' : 'transparent',
      }}
    />
  );
}

export function TimeGrid({ offset, jours }: { offset: number; jours: 1 | 7 }) {
  const t = useTranslations('app');
  const { locale } = useLocaleSwitcher();
  const { weekStart } = useSettings();
  const tasks = useStore((s) => s.tasks);

  const dates = useMemo(() => {
    if (jours === 7) return weekDays(offset, weekStart);
    return [addDays(today(), offset)];
  }, [offset, jours, weekStart]);

  const entete = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric' }),
    [locale],
  );

  const heures = Array.from({ length: NB_HEURES }, (_, i) => HEURE_DEBUT + i);
  const sansHeure = tasks.filter((k) => !k.time && dates.some((d) => dateKey(d) === k.date));

  return (
    <section
      className="rounded-panel overflow-hidden border"
      style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
      aria-label={jours === 7 ? t('calWeek') : t('calDay')}
    >
      <div className="flex border-b" style={{ borderColor: 'var(--line)' }}>
        <span className="w-[52px] flex-none" />
        {dates.map((d) => (
          <span
            key={dateKey(d)}
            className="min-w-0 flex-1 px-2 py-2 text-center font-mono text-[10px] tracking-[0.1em] uppercase"
            style={{ color: dateKey(d) === dateKey(today()) ? 'var(--acc2)' : 'var(--txt2)' }}
          >
            {entete.format(d)}
          </span>
        ))}
      </div>

      {sansHeure.length > 0 ? (
        <div
          className="flex items-start gap-2 border-b px-2 py-2"
          style={{ borderColor: 'var(--line)' }}
        >
          <span
            className="w-[44px] flex-none font-mono text-[9px] tracking-[0.1em] uppercase"
            style={{ color: 'var(--txt2)' }}
          >
            {t('calAllDay')}
          </span>
          <div className="flex min-w-0 flex-1 flex-wrap gap-1">
            {sansHeure.map((k) => (
              <EventBlock key={k.id} task={k} compact />
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex overflow-x-auto overscroll-x-contain">
        <div className="w-[52px] flex-none">
          {heures.map((h) => (
            <div
              key={h}
              className="border-b pr-2 text-right font-mono text-[9.5px]"
              style={{ height: HAUTEUR_HEURE, borderColor: 'var(--line)', color: 'var(--mut)' }}
            >
              {versHeure(h * 60)}
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-1">
          {dates.map((d) => (
            <ColonneJour
              key={dateKey(d)}
              date={d}
              taches={tasks.filter((k) => k.date === dateKey(d) && k.time)}
            />
          ))}
        </div>
      </div>

      <p className="m-0 px-3 py-2 text-[11px]" style={{ color: 'var(--mut)' }}>
        {t('calKeyHint')}
      </p>
    </section>
  );
}
