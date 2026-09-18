'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { habitWeek, nbJoursJournalises, type Habit } from '@/lib/domain';
import { useHabitMetrics, useSettings, useStore } from '@/lib/store';
import { CategoryGlyph, FeuilleConfirmation } from '@/components/ui';
import { FeuilleMenu } from '@/components/shell/feuille-menu';
import { useHabitLabels } from '../labels';
import { WeekDots } from '../WeekDots';

/* Une habitude dans la liste, sur téléphone — refonte mobile, PDF p. 6 :
   « icône de catégorie (couleur + glyphe, jamais la couleur seule), nom,
   planning en clair (« Lun · mer · jeu »), série à droite ».

   Ce que la maquette ne montre pas et que la carte de bureau offre reste
   là (rien n'est retiré) : le taux sur 30 jours et le record sur la ligne
   d'appoint, l'objectif en clair, et surtout les SEPT PASTILLES cochables de
   la semaine, à 44 px — c'est par elles qu'on rattrape un jour oublié.

   L'appui sur le nom ouvre la feuille de menu (pas d'appui long, arbitrage
   du 18/09) : Modifier · Archiver · Statistiques · Supprimer. Les trois
   chiffres viennent de `useHabitMetrics`, donc des 62 valeurs de référence. */

export function LigneHabitude({ habit }: { habit: Habit }) {
  const t = useTranslations('app');
  const tc = useTranslations('cat');
  const router = useRouter();
  const { frequence, objectif } = useHabitLabels();
  const { weekStart } = useSettings();
  const metriques = useHabitMetrics(habit.id);
  const logIndex = useStore((s) => s.logIndex);
  const toggleHabit = useStore((s) => s.toggleHabitAnnulable);
  const archiveHabit = useStore((s) => s.archiveHabitAnnulable);
  const deleteHabit = useStore((s) => s.deleteHabit);
  const openEditor = useStore((s) => s.openEditor);
  const joursHistorique = useStore((s) => nbJoursJournalises(s.logIndex, habit.id));

  const [menuOuvert, setMenuOuvert] = useState(false);
  const [confirmer, setConfirmer] = useState(false);

  const semaine = habitWeek(logIndex, habit, weekStart);
  const but = objectif(habit);
  const meta = [frequence(habit), tc(habit.category), but].filter(Boolean).join(' · ');

  return (
    <li
      data-habit
      className="border-b last:border-b-0"
      style={{ borderBottomColor: 'var(--line)' }}
    >
      {/* Un `article` nommé, comme la carte de bureau : les parcours de recette
          lisent chaque habitude par ce rôle, sur les deux formes. */}
      <article aria-label={habit.name} className="flex flex-col gap-2 px-3 py-3">
        <div className="flex min-h-[44px] items-center gap-2.5">
          <CategoryGlyph category={habit.category} size={30} />

          <button
            type="button"
            onClick={() => setMenuOuvert(true)}
            aria-haspopup="dialog"
            aria-expanded={menuOuvert}
            data-name
            className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 border-0 bg-transparent p-0 text-left"
            style={{ color: 'inherit', font: 'inherit' }}
          >
            <span
              className="text-[14px] leading-snug font-medium"
              style={{ color: habit.archived ? 'var(--mut)' : 'var(--txt)' }}
            >
              {habit.name}
            </span>
            <span className="font-mono text-[10.5px] leading-snug" style={{ color: 'var(--mut)' }}>
              {meta}
            </span>
            <span className="font-mono text-[10.5px] leading-snug" style={{ color: 'var(--mut)' }}>
              <span data-testid="pct30">{metriques?.pct30 ?? 0} %</span> · {t('colBest')}{' '}
              <span data-testid="best">{metriques?.best ?? 0}</span>
            </span>
          </button>

          <span className="flex flex-none flex-col items-end leading-none">
            <span
              className="font-mono text-[15px] font-bold"
              style={{ color: 'var(--warn)' }}
              aria-label={t('mobDashDays', { n: metriques?.streak ?? 0 })}
            >
              <span data-testid="streak">{metriques?.streak ?? 0}</span>
              <span aria-hidden="true">{t('mobDashDays', { n: '' })}</span>
            </span>
            <span
              className="font-mono text-[9.5px] tracking-[0.14em] uppercase"
              style={{ color: 'var(--txt2)' }}
            >
              {t('mobStreakShort')}
            </span>
          </span>
        </div>

        <WeekDots
          name={habit.name}
          jours={semaine}
          tactile
          onToggle={(cle) => void toggleHabit(habit.id, cle)}
        />

        <FeuilleMenu
          open={menuOuvert}
          onOpenChange={setMenuOuvert}
          title={habit.name}
          description={t('moreA')}
          items={[
            { label: t('edit'), onSelect: () => openEditor({ kind: 'habit', id: habit.id }) },
            {
              label: habit.archived ? t('mobUnarchive') : t('mobArchive'),
              onSelect: () => void archiveHabit(habit.id, !habit.archived),
            },
            { label: t('statsA'), onSelect: () => router.push('/app/stats') },
            { label: t('delete'), tone: 'bad', onSelect: () => setConfirmer(true) },
          ]}
        />

        <FeuilleConfirmation
          open={confirmer}
          onOpenChange={setConfirmer}
          question={t('mobDelHabitAsk', { name: habit.name, n: joursHistorique })}
          consequence={t('mobDelHabitD')}
          actionLabel={t('delete')}
          keepLabel={t('keep')}
          onConfirm={() => {
            setConfirmer(false);
            void deleteHabit(habit.id);
          }}
        />
      </article>
    </li>
  );
}
