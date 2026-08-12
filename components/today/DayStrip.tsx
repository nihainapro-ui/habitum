'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { addDays, today } from '@/lib/domain';
import { useDayRatios, useStore } from '@/lib/store';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';

/* Bandeau de dates du prototype : quatre jours en arrière, sept en avant.
   La fenêtre est ancrée sur AUJOURD'HUI et non sur le jour sélectionné : elle
   ne défile pas sous le doigt à chaque clic, et « aujourd'hui » garde sa place. */

const AVANT = 4;
const APRES = 7;

export function DayStrip() {
  const t = useTranslations('app');
  const { locale } = useLocaleSwitcher();
  const day = useStore((s) => s.ui.day);
  const setDay = useStore((s) => s.setDay);

  /* Le jour courant se lit au montage, pas au rendu serveur : les routes sont
     prérendues (D12) et afficheraient sinon la date de la compilation. */
  const decalages = useMemo(() => {
    const liste: number[] = [];
    for (let i = -AVANT; i <= APRES; i++) liste.push(i);
    return liste;
  }, []);

  const dates = useMemo(() => decalages.map((o) => addDays(today(), o)), [decalages]);
  const ratios = useDayRatios(dates);

  const jourCourt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale]);
  const jourLong = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
    [locale],
  );

  return (
    <div className="flex gap-2 overflow-x-auto pt-1 pb-1.5" role="group" aria-label={t('quickNav')}>
      {dates.map((d, i) => {
        const offset = decalages[i] ?? 0;
        const actif = offset === day;
        const ratio = ratios[i] ?? 0;
        return (
          <button
            key={offset}
            type="button"
            onClick={() => setDay(offset)}
            aria-current={actif ? 'date' : undefined}
            aria-label={jourLong.format(d)}
            className="rounded-field flex min-w-[62px] flex-none cursor-pointer flex-col items-center gap-1 border px-3 py-2.5"
            style={{
              borderColor: actif ? 'var(--acc2)' : 'var(--line)',
              background: actif ? 'var(--panel2)' : 'transparent',
              color: actif ? 'var(--txt)' : 'var(--txt2)',
            }}
          >
            <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase">
              {jourCourt.format(d)}
            </span>
            <span className="text-[16px] font-semibold">{d.getDate()}</span>
            <span
              aria-hidden="true"
              className="rounded-pill block h-[3px] w-4"
              style={{
                background: ratio > 0 ? 'var(--ok)' : 'var(--line)',
                opacity: ratio > 0 ? 0.35 + ratio * 0.65 : 1,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
