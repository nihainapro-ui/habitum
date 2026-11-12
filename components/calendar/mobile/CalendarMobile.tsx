'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addDays,
  dateKey,
  dayAgenda,
  daysBetween,
  ecartMois,
  estCochable,
  today,
} from '@/lib/domain';
import { useStore } from '@/lib/store';
import { Segmented } from '@/components/ui';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import { LigneJour } from '@/components/today/mobile/LigneJour';
import { SemaineStrip } from '@/components/today/mobile/SemaineStrip';
import { AgendaList } from '../AgendaList';
import { MoisMobile } from './MoisMobile';

/* Calendrier sur TÉLÉPHONE — refonte mobile, PDF p. 9.

   « Voir le mois d'un coup d'œil, choisir un jour, le consulter ou le
   modifier. » Segments Mois / Semaine / Agenda ; sous la grille, le DÉTAIL du
   jour choisi, avec « Ouvrir › » vers Aujourd'hui à cette date. Avant la
   refonte, tout retombait sur l'agenda sous 768 px (D6) : le mois n'existait
   pas sur téléphone.

   LE JOUR CHOISI EST `ui.day`, le même que celui d'Aujourd'hui : « Ouvrir »
   n'a alors rien à transporter, et revenir d'Aujourd'hui retrouve le jour où
   on l'a laissé. Les lignes du détail sont celles d'Aujourd'hui (`LigneJour`) :
   cochables dans le passé et le présent, désactivées dans le futur.

   ÉCART ASSUMÉ avec la maquette : la vue Semaine n'est pas une grille horaire
   où l'on glisse une tâche. Sept colonnes d'heures ne tiennent pas dans
   358 px sans défilement horizontal, que les règles du dépôt interdisent ;
   c'est la semaine en sept cellules, puis le détail du jour. Déplacer une
   tâche reste possible par « Reprogrammer » et par son éditeur. */

type Mode = 'month' | 'week' | 'agenda';

export function CalendarMobile() {
  const t = useTranslations('app');
  const { locale } = useLocaleSwitcher();
  const router = useRouter();

  const day = useStore((s) => s.ui.day);
  const setDay = useStore((s) => s.setDay);
  const logIndex = useStore((s) => s.logIndex);
  const habits = useStore((s) => s.habits);
  const tasks = useStore((s) => s.tasks);
  const occurrences = useStore((s) => s.occurrences);

  const date = useMemo(() => addDays(today(), day), [day]);
  const cle = dateKey(date);

  const [mode, setMode] = useState<Mode>('month');
  const [offset, setOffset] = useState(() => ecartMois(date));
  const [offsetAgenda, setOffsetAgenda] = useState(0);

  /* Non filtrée : le filtre d'Aujourd'hui (Tout · Habitudes · Tâches) est un
     état de CETTE vue-là, il n'a pas à vider le détail d'un jour ici. */
  const entrees = useMemo(
    () => dayAgenda(logIndex, habits, tasks, date, today(), occurrences),
    [logIndex, habits, tasks, date, occurrences],
  );

  const titreJour = useMemo(() => {
    const brut = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric' }).format(date);
    return brut.charAt(0).toUpperCase() + brut.slice(1);
  }, [locale, date]);

  const choisir = (d: Date) => setDay(daysBetween(d, today()));
  const ouvrir = (d: Date) => {
    choisir(d);
    router.push('/app/today');
  };

  const nav = 'grid h-11 w-11 flex-none cursor-pointer place-items-center rounded-pill border';
  const styleNav = {
    borderColor: 'var(--line)',
    background: 'var(--panel2)',
    color: 'var(--txt2)',
  };

  return (
    <div className="flex flex-col gap-3" data-testid="calendar-mobile">
      <Segmented<Mode>
        fill
        label={t('calMode')}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'month', label: t('calMonth') },
          { value: 'week', label: t('calWeek') },
          { value: 'agenda', label: t('calAgenda') },
        ]}
      />

      {mode === 'month' ? (
        <MoisMobile
          offset={offset}
          onOffset={setOffset}
          selectedKey={cle}
          onSelect={choisir}
          onOpen={ouvrir}
        />
      ) : null}

      {mode === 'week' ? <SemaineStrip /> : null}

      {mode === 'agenda' ? (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOffsetAgenda(offsetAgenda - 1)}
              aria-label={t('prevPeriod')}
              className={nav}
              style={styleNav}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setOffsetAgenda(0)}
              className="rounded-pill min-h-[44px] cursor-pointer border px-4 text-[12.5px]"
              style={styleNav}
            >
              {t('calToday')}
            </button>
            <button
              type="button"
              onClick={() => setOffsetAgenda(offsetAgenda + 1)}
              aria-label={t('nextPeriod')}
              className={nav}
              style={styleNav}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <AgendaList offset={offsetAgenda} />
        </>
      ) : (
        <section
          data-testid="detail-jour"
          className="overflow-hidden rounded-[22px] border"
          style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
        >
          <header
            className="flex min-h-[48px] items-center justify-between gap-2 border-b pr-1 pl-4"
            style={{ borderColor: 'var(--line)' }}
          >
            <h2 className="m-0 min-w-0 truncate text-[14px] font-semibold">{titreJour}</h2>
            <button
              type="button"
              onClick={() => ouvrir(date)}
              className="flex min-h-[44px] flex-none cursor-pointer items-center gap-1 border-0 bg-transparent px-3 text-[13px] font-semibold"
              style={{ color: 'var(--acc2)' }}
            >
              {t('mobCalOpen')}
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </header>
          {entrees.length === 0 ? (
            <p className="m-0 px-4 py-6 text-center text-[12.5px]" style={{ color: 'var(--mut)' }}>
              {t('dayOff')}
            </p>
          ) : (
            <ul key={cle} data-queue className="m-0 flex list-none flex-col p-0">
              {entrees.map((e) => (
                <LigneJour
                  key={`${e.kind}-${e.id}`}
                  entree={e}
                  date={cle}
                  cochable={estCochable(date)}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
