'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { JourSemaine } from '@/lib/domain';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import { ENCRE_SUR_TEINTE } from '@/components/ui/encre';

/* Les sept pastilles de la semaine courante.

   Trois états, et il faut qu'ils se distinguent AUTREMENT que par la couleur :
   - jour planifié et fait : pastille pleine ;
   - jour planifié non fait : pastille bordée ;
   - jour non planifié : estompé, désactivé, et annoncé comme tel.

   Un jour non planifié n'est pas un échec. Le prototype les affichait déjà
   grisés ; ici ils sont en plus `disabled`, donc hors du parcours clavier. */

export function WeekDots({
  name,
  jours,
  onToggle,
}: {
  name: string;
  jours: JourSemaine[];
  onToggle: (key: string) => void;
}) {
  const t = useTranslations('app');
  const { locale } = useLocaleSwitcher();
  const jourCourt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale]);
  const jourLong = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
    [locale],
  );

  return (
    <div className="flex gap-1">
      {jours.map((j) => {
        const actif = j.scheduled && !j.future;
        const libelle = `${name} — ${jourLong.format(j.date)}${j.scheduled ? '' : ` · ${t('dayOff')}`}`;

        return (
          <button
            key={j.key}
            type="button"
            role="checkbox"
            aria-checked={j.done}
            aria-label={libelle}
            disabled={!actif}
            onClick={() => onToggle(j.key)}
            className="rounded-btn flex flex-1 flex-col items-center gap-1 border py-1.5"
            style={{
              borderColor: j.done ? 'var(--ok)' : j.scheduled ? 'var(--line2)' : 'var(--line)',
              background: j.done ? 'var(--ok)' : 'transparent',
              color: j.done ? ENCRE_SUR_TEINTE : j.scheduled ? 'var(--txt2)' : 'var(--mut)',
              opacity: j.scheduled ? 1 : 0.45,
              cursor: actif ? 'pointer' : 'default',
            }}
          >
            <span className="font-mono text-[8.5px] tracking-[0.12em] uppercase">
              {jourCourt.format(j.date)}
            </span>
            <span className="text-[12.5px] font-semibold">{j.date.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
}
