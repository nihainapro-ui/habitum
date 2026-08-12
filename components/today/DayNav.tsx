'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '@/lib/store';

/* Navigation jour précédent / aujourd'hui / jour suivant.
   `ui.day` est un décalage en jours — le prototype fait de même (`state.day`),
   et c'est ce qui permet de rester juste au passage de minuit. */

const BOUTON =
  'grid h-[34px] w-[34px] place-items-center rounded-btn border cursor-pointer text-[var(--txt2)]';

export function DayNav() {
  const t = useTranslations('app');
  const day = useStore((s) => s.ui.day);
  const setDay = useStore((s) => s.setDay);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setDay(day - 1)}
        aria-label={t('prevDay')}
        className={BOUTON}
        style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
      >
        <ChevronLeft size={14} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => setDay(0)}
        className="rounded-btn cursor-pointer border px-3.5 py-2 font-mono text-[11.5px] tracking-[0.08em] uppercase"
        style={{
          borderColor: day === 0 ? 'var(--line2)' : 'var(--line)',
          background: 'var(--panel2)',
          color: day === 0 ? 'var(--txt)' : 'var(--txt2)',
        }}
      >
        {t('today')}
      </button>

      <button
        type="button"
        onClick={() => setDay(day + 1)}
        aria-label={t('nextDay')}
        className={BOUTON}
        style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
      >
        <ChevronRight size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
