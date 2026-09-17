'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { dateKey, estCochable, partagerPlusTard, today, type EntreeJour } from '@/lib/domain';
import { useDayCounts, useDayRatio, useStore } from '@/lib/store';
import { Segmented } from '@/components/ui';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import type { Filtre } from '../FilterBar';
import { LigneJour } from './LigneJour';
import { SemaineStrip } from './SemaineStrip';

/* Vue « Aujourd'hui » sur TÉLÉPHONE — refonte mobile, PDF p. 5.

   « Faire la journée : cocher, compter, lancer — sans quitter l'écran. »
   Semaine (7 cellules égales) → segments avec compteurs → liste → « Plus
   tard » replié. Le titre-date vit dans l'en-tête mobile, pas ici.

   Un seul niveau de carte : la liste est la carte, ses lignes n'en ont pas.
   « FILE D'EXÉCUTION 0/4 » a disparu : le compte est dans les segments, et la
   pastille « Tâche » ne se pose que sur les tâches.

   États (PDF p. 5) : vide → « Journée libre » + « Planifier une habitude » ;
   jour passé → bandeau « Vous modifiez le 15 sept. », cases modifiables ;
   futur → cases désactivées à 45 %, « Pas encore » ; succès → « Journée
   parfaite » en tête. Chacun vient du domaine — `estCochable`, `dayRatio` —
   jamais d'une estimation.

   « Plus tard » = les entrées SANS heure (`partagerPlusTard`) : « quand vous
   voulez » vient après « à telle heure ». Replié par défaut, avec son compte. */

export function TodayMobile({ date, entrees }: { date: Date; entrees: EntreeJour[] }) {
  const t = useTranslations('app');
  const { locale } = useLocaleSwitcher();
  const filter = useStore((s) => s.ui.filter) as Filtre;
  const setFilter = useStore((s) => s.setFilter);
  const openEditor = useStore((s) => s.openEditor);
  const comptes = useDayCounts(date);
  const { scheduled, ratio } = useDayRatio(date);
  const [plusTardOuvert, setPlusTardOuvert] = useState(false);

  const cochable = estCochable(date);
  const jour = dateKey(date);
  const passe = date < today();
  const parfait = scheduled > 0 && ratio >= 1;
  const { maintenant, plusTard } = useMemo(() => partagerPlusTard(entrees), [entrees]);

  const dateCourte = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date),
    [locale, date],
  );

  const segment = (cle: string, n: number) => `${t(cle)} · ${n}`;

  return (
    <div className="flex flex-col gap-3" data-testid="today-mobile">
      <SemaineStrip />

      {passe ? (
        <p
          data-testid="bandeau-passe"
          className="rounded-field m-0 border px-3 py-2 text-[12.5px]"
          style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}
        >
          {t('mobPastBanner', { date: dateCourte })}
        </p>
      ) : null}

      {parfait ? (
        <p
          data-testid="journee-parfaite"
          className="rounded-field m-0 border px-3 py-2 text-[13px] font-semibold"
          style={{ borderColor: 'var(--acc2)', color: 'var(--acc2)' }}
        >
          {t('mobPerfect')}
        </p>
      ) : null}

      <Segmented<Filtre>
        fill
        label={t('all')}
        value={filter === 'habits' || filter === 'tasks' ? filter : 'all'}
        onChange={setFilter}
        options={[
          { value: 'all', label: segment('all', comptes.all) },
          { value: 'habits', label: segment('habitsF', comptes.habits) },
          { value: 'tasks', label: segment('tasksF', comptes.tasks) },
        ]}
      />

      {entrees.length === 0 ? (
        <section
          data-testid="empty-state"
          className="rounded-[22px] flex flex-col items-center gap-3 border px-6 py-10 text-center"
          style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
        >
          <span className="text-[15px] font-semibold">{t('mobEmptyT')}</span>
          <button
            type="button"
            onClick={() => openEditor({ kind: 'habit', id: null })}
            className="rounded-pill min-h-[44px] cursor-pointer border-0 px-5 text-[13.5px] font-semibold"
            style={{ background: 'var(--acc2)', color: 'var(--bg)' }}
          >
            {t('mobEmptyA')}
          </button>
        </section>
      ) : (
        <section
          className="rounded-[22px] overflow-hidden border"
          style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
        >
          {/* La clé par jour est ICI, sur la liste : changer de jour la remonte
              — une case cochée ne survit pas au rendu — sans remonter le
              bandeau de semaine au-dessus. */}
          <ul key={jour} data-queue className="m-0 flex list-none flex-col p-0">
            {maintenant.map((e) => (
              <LigneJour key={`${e.kind}-${e.id}`} entree={e} date={jour} cochable={cochable} />
            ))}
          </ul>
        </section>
      )}

      {plusTard.length > 0 ? (
        <section
          className="rounded-[22px] overflow-hidden border"
          style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
        >
          <button
            type="button"
            onClick={() => setPlusTardOuvert((v) => !v)}
            aria-expanded={plusTardOuvert}
            className="flex min-h-[44px] w-full cursor-pointer items-center justify-between border-0 bg-transparent px-4 font-mono text-[10px] tracking-[0.16em] uppercase"
            style={{ color: 'var(--mut)' }}
          >
            {t('mobLaterN', { n: plusTard.length })}
            <ChevronDown
              size={14}
              aria-hidden="true"
              style={{
                transform: plusTardOuvert ? 'rotate(180deg)' : 'none',
                transition: 'transform .2s',
              }}
            />
          </button>
          {plusTardOuvert ? (
            <ul
              key={jour}
              data-queue-later
              className="m-0 flex list-none flex-col border-t p-0"
              style={{ borderColor: 'var(--line)' }}
            >
              {plusTard.map((e) => (
                <LigneJour key={`${e.kind}-${e.id}`} entree={e} date={jour} cochable={cochable} />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
