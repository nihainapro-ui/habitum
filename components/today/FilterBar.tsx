'use client';

import { useTranslations } from 'next-intl';
import { Segmented } from '@/components/ui';
import { useStore } from '@/lib/store';

/** Filtre de la file d'exécution. État d'interface pur : il ne descend pas
 *  dans le domaine, qui n'a pas à savoir ce qu'un onglet est. */
export type Filtre = 'all' | 'habits' | 'tasks';

export function FilterBar() {
  const t = useTranslations('app');
  const filter = useStore((s) => s.ui.filter) as Filtre;
  const setFilter = useStore((s) => s.setFilter);

  return (
    <Segmented<Filtre>
      label={t('all')}
      value={filter === 'habits' || filter === 'tasks' ? filter : 'all'}
      onChange={setFilter}
      options={[
        { value: 'all', label: t('all') },
        { value: 'habits', label: t('habitsF') },
        { value: 'tasks', label: t('tasksF') },
      ]}
    />
  );
}
