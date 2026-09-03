'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, monthGrid, startOfWeek, today } from '@/lib/domain';
import { useSettings } from '@/lib/store';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import { Dialog } from '@/components/ui';

/* Le calendrier mensuel de l'en-tête — spec du 2026-09-02, lot C.

   IL N'AFFICHE AUCUNE PASTILLE D'ACTIVITÉ, et c'est une décision : les
   calculer demanderait l'état de chaque jour du mois à l'ouverture, alors que
   ce que l'utilisateur vient chercher ici est la NAVIGATION — « aller voir un
   autre jour, vite ». À réévaluer sur usage, pas avant.

   AUCUN CALCUL DE GRILLE N'EST ÉCRIT ICI. `monthGrid()` vit dans
   `lib/domain/calendar.ts` avec ses tests (42 cases toujours, premier jour selon
   la préférence de début de semaine) — la vue ne fait que dessiner ce qu'elle
   rend. C'est la règle 2 du CLAUDE.md, et c'est aussi ce qui fait que la grille
   du dialogue et celle de la vue Calendrier ne peuvent pas diverger.

   Le dialogue vient du système visuel (`components/ui/dialog.tsx`, Radix) :
   fermeture par Échap, piège de focus et retour du focus au déclencheur sont
   fournis, pas réécrits. */

export function MonthPicker({ trigger }: { trigger: ReactNode }) {
  const t = useTranslations('app');
  const { locale } = useLocaleSwitcher();
  const { weekStart } = useSettings();

  /* L'état vit ICI et non dans l'en-tête : le dialogue est le seul à en avoir
     besoin, et le garder auprès de son déclencheur laisse Radix apparier les
     deux — c'est ce qui rend le focus au bouton après Échap, sans une ligne de
     code de notre part. */
  const [ouvert, setOuvert] = useState(false);
  const [offset, setOffset] = useState(0);

  const cases = useMemo(() => monthGrid(offset, weekStart), [offset, weekStart]);

  const nomsJours = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const debut = startOfWeek(today(), weekStart);
    return Array.from({ length: 7 }, (_, i) => format.format(addDays(debut, i)));
  }, [locale, weekStart]);

  const titreMois = useMemo(() => {
    const maintenant = today();
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
      new Date(maintenant.getFullYear(), maintenant.getMonth() + offset, 1),
    );
  }, [locale, offset]);

  const jourLong = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
    [locale],
  );

  const nav = 'grid h-[30px] w-[30px] place-items-center rounded-btn-sm border cursor-pointer';

  return (
    <Dialog
      open={ouvert}
      onOpenChange={setOuvert}
      title={t('pickDay')}
      description={t('pickDayHint')}
      trigger={trigger}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOffset(offset - 1)}
            aria-label={t('prevPeriod')}
            className={nav}
            style={{
              borderColor: 'var(--line)',
              background: 'var(--panel2)',
              color: 'var(--txt2)',
            }}
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>

          {/* Le mois occupe le centre et peut céder : c'est le seul élément de
              la rangée dont la largeur dépend de la langue (« septembre 2026 »
              contre « May 2026 »). */}
          <span className="min-w-0 flex-1 truncate text-center text-[13px] font-semibold">
            {titreMois}
          </span>

          <button
            type="button"
            onClick={() => setOffset(offset + 1)}
            aria-label={t('nextPeriod')}
            className={nav}
            style={{
              borderColor: 'var(--line)',
              background: 'var(--panel2)',
              color: 'var(--txt2)',
            }}
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setOffset(0)}
            className="rounded-btn-sm flex-none cursor-pointer border px-2.5 py-1.5 font-mono text-[10.5px] tracking-[0.08em] uppercase"
            style={{
              borderColor: offset === 0 ? 'var(--line2)' : 'var(--line)',
              background: 'var(--panel2)',
              color: offset === 0 ? 'var(--txt)' : 'var(--txt2)',
            }}
          >
            {t('calToday')}
          </button>
        </div>

        <div className="grid grid-cols-7">
          {nomsJours.map((nom) => (
            <span
              key={nom}
              className="px-1 py-1 text-center font-mono text-[9px] tracking-[0.12em] uppercase"
              style={{ color: 'var(--txt2)' }}
            >
              {nom}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cases.map((c) => (
            <button
              key={c.key}
              type="button"
              data-jour={c.key}
              /* Le nom accessible est la date LONGUE, pas le seul quantième :
                 « 6 » quarante-deux fois ne désigne rien à l'oreille. */
              aria-label={jourLong.format(c.date)}
              aria-current={c.isToday ? 'date' : undefined}
              className="rounded-btn-sm grid h-8 cursor-pointer place-items-center border text-[12px]"
              style={{
                borderColor: c.isToday ? 'var(--acc2)' : 'transparent',
                background: c.isToday ? 'rgba(var(--glow),.18)' : 'transparent',
                /* Les jours des mois voisins complètent la grille sans se faire
                   passer pour le mois affiché. Ils restent CLIQUABLES : refuser
                   le 31 juillet depuis la grille d'août serait un cul-de-sac. */
                color: c.inMonth ? 'var(--txt)' : 'var(--mut)',
              }}
            >
              {c.date.getDate()}
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
