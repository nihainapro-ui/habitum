'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDroppable } from '@dnd-kit/core';
import { useTranslations } from 'next-intl';
import { addDays, monthGrid, startOfWeek, today } from '@/lib/domain';
import { useDayRatios, useSettings, useStore } from '@/lib/store';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import { EventBlock } from './EventBlock';

/* Grille 6×7 du mois. L'intensité d'une case suit `dayRatio` — la même mesure
   que la carte de chaleur des statistiques, pas une seconde façon de compter.

   Cliquer un jour ouvre « Aujourd'hui » SUR CE JOUR : le calendrier montre,
   la vue du jour exécute. */

const MAX_APERCU = 3;

function CaseJour({
  cle,
  numero,
  inMonth,
  isToday,
  ratio,
  taches,
  onOuvrir,
  libelle,
}: {
  cle: string;
  numero: number;
  inMonth: boolean;
  isToday: boolean;
  ratio: number;
  taches: { id: string }[];
  onOuvrir: () => void;
  libelle: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `jour:${cle}`, data: { date: cle } });
  const tasks = useStore((s) => s.tasks);

  return (
    <div
      ref={setNodeRef}
      data-day={cle}
      className="flex min-h-[92px] flex-col gap-1 border-r border-b p-1.5 last:border-r-0"
      style={{
        borderColor: 'var(--line)',
        background: isOver
          ? 'color-mix(in srgb, var(--acc2) 16%, transparent)'
          : ratio > 0
            ? `color-mix(in srgb, var(--ok) ${Math.round(8 + ratio * 26)}%, transparent)`
            : inMonth
              ? 'transparent'
              : 'color-mix(in srgb, var(--bg) 55%, transparent)',
        /* Un jour hors du mois se distingue par son FOND, pas par une
           opacité : atténuer tout le bloc fait tomber le texte sous AA. */
      }}
    >
      <button
        type="button"
        onClick={onOuvrir}
        aria-label={libelle}
        className="rounded-btn-sm cursor-pointer self-start px-1.5 py-0.5 font-mono text-[11px]"
        style={{
          /* Tous les numéros en `--txt2` : sur une case teintée par
             `dayRatio`, `--mut` tombe jusqu'à 2,07 — très en dessous d'AA.
             Le hors-mois se lit à son fond et à sa position, pas à un texte
             qu'on n'arrive plus à lire. */
          color: isToday ? '#04060d' : 'var(--txt2)',
          /* Le numéro porte son PROPRE fond. Posé à même la case, il se lit
             sur une teinte qui varie avec `dayRatio` — au plus fort du vert,
             `--txt2` n'y mesurait plus que 4,39. Un fond opaque rend le
             contraste indépendant de la charge de la journée. */
          background: isToday ? 'var(--acc2)' : 'var(--bg)',
        }}
      >
        {numero}
      </button>

      {taches.slice(0, MAX_APERCU).map((t) => {
        const tache = tasks.find((x) => x.id === t.id);
        return tache ? <EventBlock key={t.id} task={tache} compact /> : null;
      })}
    </div>
  );
}

export function MonthGrid({ offset }: { offset: number }) {
  const t = useTranslations('app');
  const { locale } = useLocaleSwitcher();
  const { weekStart } = useSettings();
  const router = useRouter();
  const tasks = useStore((s) => s.tasks);
  const setDay = useStore((s) => s.setDay);

  const cases = useMemo(() => monthGrid(offset, weekStart), [offset, weekStart]);
  const dates = useMemo(() => cases.map((c) => c.date), [cases]);
  const ratios = useDayRatios(dates);

  const nomsJours = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const debut = startOfWeek(today(), weekStart);
    return Array.from({ length: 7 }, (_, i) => format.format(addDays(debut, i)));
  }, [locale, weekStart]);

  const jourLong = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
    [locale],
  );

  const ouvrirJour = (date: Date) => {
    setDay(Math.round((date.getTime() - today().getTime()) / 86_400_000));
    router.push('/app/today');
  };

  return (
    <section
      className="rounded-panel overflow-hidden border"
      style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
      aria-label={t('calMonth')}
    >
      <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--line)' }}>
        {nomsJours.map((nom) => (
          <span
            key={nom}
            className="px-2 py-2 text-center font-mono text-[9.5px] tracking-[0.14em] uppercase"
            style={{ color: 'var(--txt2)' }}
          >
            {nom}
          </span>
        ))}
      </div>

      <div data-month-grid className="grid grid-cols-7">
        {cases.map((c, i) => (
          <CaseJour
            key={c.key}
            cle={c.key}
            numero={c.date.getDate()}
            inMonth={c.inMonth}
            isToday={c.isToday}
            ratio={ratios[i] ?? 0}
            taches={tasks.filter((k) => k.date === c.key)}
            onOuvrir={() => ouvrirJour(c.date)}
            libelle={jourLong.format(c.date)}
          />
        ))}
      </div>

      <p className="m-0 px-3 py-2 text-[11px]" style={{ color: 'var(--mut)' }}>
        {t('calHint')}
      </p>
    </section>
  );
}
