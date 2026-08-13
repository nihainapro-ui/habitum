'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { daysBack, startOfWeek, today } from '@/lib/domain';
import { useSettings, useStore } from '@/lib/store';

/* Carte de chaleur sur six mois — 182 jours, en colonnes de semaines.

   Décision déjà instruite (`09-PLAN-AMELIORATION.md`, tâche B7) : 182 cellules
   restent en DOM. Le `<canvas>` ne se justifie qu'au-delà de 400 — et il coûte
   l'accessibilité, la sélection et l'infobulle native. Ne pas sur-optimiser. */

const JOURS = 182;

/** Cinq paliers d'intensité, comme le prototype. Le premier est « rien de
 *  prévu » : il se distingue de « prévu, rien de fait » par sa BORDURE, pas
 *  seulement par sa teinte. */
function ton(ratio: number, prevu: number): { background: string; borderColor: string } {
  if (prevu === 0) return { background: 'transparent', borderColor: 'var(--line)' };
  if (ratio <= 0) return { background: 'var(--panel2)', borderColor: 'var(--line2)' };
  if (ratio < 0.4)
    return {
      background: 'color-mix(in srgb, var(--ok) 28%, transparent)',
      borderColor: 'transparent',
    };
  if (ratio < 0.8)
    return {
      background: 'color-mix(in srgb, var(--ok) 58%, transparent)',
      borderColor: 'transparent',
    };
  return { background: 'var(--ok)', borderColor: 'transparent' };
}

export function Heatmap() {
  const t = useTranslations('app');
  const logIndex = useStore((s) => s.logIndex);
  const habits = useStore((s) => s.habits);
  const tasks = useStore((s) => s.tasks);
  const { weekStart } = useSettings();

  const semaines = useMemo(() => {
    const jours = daysBack(logIndex, habits, tasks, JOURS);
    /* On aligne la première colonne sur le début de semaine : sans cela, les
       lignes ne correspondraient à aucun jour fixe et la carte ne se lirait
       plus horizontalement. */
    const debut = startOfWeek(jours[0]?.date ?? today(), weekStart);
    const decalage = Math.round(((jours[0]?.date.getTime() ?? 0) - debut.getTime()) / 86_400_000);

    const cellules: (typeof jours)[number][] = Array.from({ length: decalage }).concat(
      jours,
    ) as (typeof jours)[number][];

    const colonnes: (typeof jours)[number][][] = [];
    for (let i = 0; i < cellules.length; i += 7) colonnes.push(cellules.slice(i, i + 7));
    return colonnes;
  }, [logIndex, habits, tasks, weekStart]);

  return (
    <section
      className="rounded-panel border p-4"
      style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
      aria-label={t('activity')}
    >
      <header className="mb-3 flex items-baseline gap-2">
        <h2 className="m-0 text-[13px] font-semibold">{t('activity')}</h2>
        <span className="text-[11px]" style={{ color: 'var(--mut)' }}>
          {t('activitySub')}
        </span>
      </header>

      <div className="overflow-x-auto pb-1">
        <div data-heatmap className="flex gap-[3px]">
          {semaines.map((colonne, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {colonne.map((jour, j) =>
                jour ? (
                  <span
                    key={jour.key}
                    data-cell
                    title={`${jour.key} · ${jour.done}/${jour.scheduled}`}
                    className="block h-[11px] w-[11px] flex-none rounded-[3px] border"
                    style={ton(jour.ratio, jour.scheduled)}
                  />
                ) : (
                  <span key={`vide-${i}-${j}`} className="block h-[11px] w-[11px]" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        className="mt-3 flex items-center gap-2 text-[10px]"
        style={{ color: 'var(--txt2)' }}
        aria-hidden="true"
      >
        <span>{t('less')}</span>
        {[0, 0.3, 0.6, 1].map((r) => (
          <span
            key={r}
            className="block h-[11px] w-[11px] rounded-[3px] border"
            style={ton(r, 1)}
          />
        ))}
        <span>{t('more')}</span>
      </div>
    </section>
  );
}
