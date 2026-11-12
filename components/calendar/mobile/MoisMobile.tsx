'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, monthGrid, startOfWeek, today, type EtatJour } from '@/lib/domain';
import { useDayStates, useSettings } from '@/lib/store';
import { useGlissement } from '@/lib/features/mobile/glissement';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';

/* Le mois sur téléphone — refonte mobile, PDF p. 9.

   UNE grille, deux usages : la vue Calendrier, et le sélecteur de jour appelé
   depuis l'en-tête d'Aujourd'hui et de Tâches (« cette même vue, en feuille
   basse »). Deux grilles auraient divergé au premier ajustement.

   « Observé — le sélecteur s'ouvrait sans indication de ce qui s'est passé
   chaque jour. » Ici chaque jour porte un TRAIT d'état — complet, partiel,
   manqué — et le trait n'est jamais seul à le dire : la légende l'écrit, et
   le nom accessible de chaque case le dit en toutes lettres (p. 17 : jamais
   la couleur seule).

   AUCUN CALCUL ICI : `monthGrid` rend les 42 cases (toujours 42 — une grille
   qui change de hauteur fait sauter la page), `etatJour` classe la journée.
   Cellules de 44 px au moins ; glisser change de mois, et les deux flèches
   font la même chose pour qui ne glisse pas. */

const TRAIT: Record<EtatJour, string> = {
  complete: 'var(--ok)',
  partial: 'color-mix(in srgb, var(--ok) 45%, transparent)',
  missed: 'var(--line2)',
  none: 'transparent',
};

const CLE_ETAT: Record<EtatJour, string> = {
  complete: 'mobCalComplete',
  partial: 'mobCalPartial',
  missed: 'mobCalMissed',
  none: 'mobCalNone',
};

export function MoisMobile({
  offset,
  onOffset,
  selectedKey,
  onSelect,
  onOpen,
}: {
  offset: number;
  onOffset: (offset: number) => void;
  selectedKey: string;
  onSelect: (date: Date) => void;
  /** Double appui sur un jour — « Ouvrir » (PDF p. 9). Facultatif : le
   *  sélecteur de jour choisit au premier appui. */
  onOpen?: ((date: Date) => void) | undefined;
}) {
  const t = useTranslations('app');
  const { locale } = useLocaleSwitcher();
  const { weekStart } = useSettings();

  const cases = useMemo(() => monthGrid(offset, weekStart), [offset, weekStart]);
  const dates = useMemo(() => cases.map((c) => c.date), [cases]);
  const etats = useDayStates(dates);

  const nomsJours = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    const debut = startOfWeek(today(), weekStart);
    return Array.from({ length: 7 }, (_, i) => format.format(addDays(debut, i)));
  }, [locale, weekStart]);

  const titreMois = useMemo(() => {
    const ancre = cases.find((c) => c.inMonth) ?? cases[0];
    const brut = ancre
      ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(ancre.date)
      : '';
    return brut;
  }, [cases, locale]);

  const jourLong = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
    [locale],
  );

  const glissement = useGlissement({
    onGauche: () => onOffset(offset + 1),
    onDroite: () => onOffset(offset - 1),
  });

  const aujourdhui = today();
  const moisVide = cases.every((c, i) => !c.inMonth || etats[i] === 'none');
  const nav = 'grid h-11 w-11 flex-none cursor-pointer place-items-center rounded-pill border';
  const styleNav = {
    borderColor: 'var(--line)',
    background: 'var(--panel2)',
    color: 'var(--txt2)',
  };

  return (
    <div className="flex flex-col gap-2" data-testid="mois-mobile">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onOffset(offset - 1)}
          aria-label={t('prevPeriod')}
          className={nav}
          style={styleNav}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <span
          aria-live="polite"
          className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold first-letter:uppercase"
        >
          {titreMois}
        </span>
        <button
          type="button"
          onClick={() => onOffset(offset + 1)}
          aria-label={t('nextPeriod')}
          className={nav}
          style={styleNav}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onOffset(0)}
          className="rounded-pill min-h-[44px] flex-none cursor-pointer border px-3 text-[12.5px]"
          style={{
            borderColor: offset === 0 ? 'var(--line2)' : 'var(--line)',
            background: 'var(--panel2)',
            color: offset === 0 ? 'var(--txt)' : 'var(--txt2)',
          }}
        >
          {t('calToday')}
        </button>
      </div>

      <div className="grid grid-cols-7" aria-hidden="true">
        {nomsJours.map((nom, i) => (
          <span
            key={`${nom}-${i}`}
            className="py-1 text-center font-mono text-[10px] uppercase"
            style={{ color: 'var(--mut)' }}
          >
            {nom}
          </span>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-y-0.5"
        onPointerDown={glissement.proprietes.onPointerDown}
        onPointerMove={glissement.proprietes.onPointerMove}
        onPointerUp={glissement.proprietes.onPointerUp}
        onPointerCancel={glissement.proprietes.onPointerCancel}
        onClickCapture={glissement.proprietes.onClickCapture}
        style={{ touchAction: 'pan-y' }}
      >
        {cases.map((c, i) => {
          const etat = etats[i] ?? 'none';
          const choisi = c.key === selectedKey;
          const futur = c.date > aujourdhui;
          return (
            <button
              key={c.key}
              type="button"
              data-jour={c.key}
              data-etat={etat}
              onClick={() => onSelect(c.date)}
              onDoubleClick={onOpen ? () => onOpen(c.date) : undefined}
              aria-current={c.isToday ? 'date' : undefined}
              aria-pressed={choisi}
              aria-label={t('mobCalDayLabel', {
                date: jourLong.format(c.date),
                etat: t(CLE_ETAT[etat]),
              })}
              className="rounded-field flex min-h-[44px] min-w-0 cursor-pointer flex-col items-center justify-center gap-1 border"
              style={{
                borderColor: choisi ? 'var(--acc2)' : c.isToday ? 'var(--line2)' : 'transparent',
                background: c.isToday ? 'var(--panel2)' : 'transparent',
                color: !c.inMonth || futur ? 'var(--mut)' : 'var(--txt)',
              }}
            >
              <span className="font-mono text-[13px]">{c.date.getDate()}</span>
              <span
                aria-hidden="true"
                className="rounded-pill block h-[3px] w-5"
                style={{ background: TRAIT[etat] }}
              />
            </button>
          );
        })}
      </div>

      {/* Légende TEXTUELLE : chaque trait est nommé. */}
      <ul
        aria-label={t('mobCalLegend')}
        className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-[11.5px]"
        style={{ color: 'var(--txt2)' }}
      >
        {(['complete', 'partial', 'missed'] as const).map((e) => (
          <li key={e} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="rounded-pill block h-[3px] w-5"
              style={{ background: TRAIT[e] }}
            />
            {t(CLE_ETAT[e])}
          </li>
        ))}
      </ul>

      {moisVide ? (
        <p className="m-0 text-[12.5px]" style={{ color: 'var(--mut)' }}>
          {t('mobCalEmptyMonth')}
        </p>
      ) : null}
    </div>
  );
}
