'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { addDays, dateKey, ecartMois, parseKey, today, type Task } from '@/lib/domain';
import { useStore } from '@/lib/store';
import { FeuilleBasse } from '@/components/ui';
import { MoisMobile } from '@/components/calendar/mobile/MoisMobile';

/* Reporter une tâche — refonte mobile, PDF p. 8 : « feuille Aujourd'hui /
   Demain / Choisir ».

   « Demain » est le lendemain d'AUJOURD'HUI, pas celui de l'échéance : pour
   une tâche en retard de trois jours, `snoozeTask` (+1 jour) la laisserait en
   retard. « Aujourd'hui » n'est proposé que si la tâche n'y est pas déjà.
   « Choisir » ouvre la grille du mois (`MoisMobile`, P2), sur le mois de
   l'échéance. Chaque déplacement passe par `moveTask`, annulable six
   secondes, et garde l'heure de la tâche. */
export function FeuilleReport({
  open,
  onOpenChange,
  task,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: Task;
}) {
  const t = useTranslations('app');
  const moveTask = useStore((s) => s.moveTask);
  const [panneau, setPanneau] = useState<'choix' | 'mois'>('choix');
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (open) {
      setPanneau('choix');
      setOffset(ecartMois(parseKey(task.date) ?? today()));
    }
  }, [open, task.date]);

  const deplacer = (date: Date) => {
    onOpenChange(false);
    void moveTask(task.id, dateKey(date), task.time);
  };

  const aujourdhui = dateKey(today());
  const ligne =
    'rounded-field flex min-h-[52px] w-full cursor-pointer items-center border px-4 text-left text-[14px]';
  const style = { borderColor: 'var(--line)', background: 'var(--panel2)', color: 'var(--txt)' };

  return (
    <FeuilleBasse
      open={open}
      onOpenChange={onOpenChange}
      title={t('mobSnoozeTitle')}
      description={t('mobSnoozeD')}
      testId="feuille-report"
    >
      {panneau === 'choix' ? (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {task.date !== aujourdhui ? (
            <li>
              <button
                type="button"
                className={ligne}
                style={style}
                onClick={() => deplacer(today())}
              >
                {t('today')}
              </button>
            </li>
          ) : null}
          <li>
            <button
              type="button"
              className={ligne}
              style={style}
              onClick={() => deplacer(addDays(today(), 1))}
            >
              {t('mobSnoozeTomorrow')}
            </button>
          </li>
          <li>
            <button
              type="button"
              className={ligne}
              style={style}
              onClick={() => setPanneau('mois')}
            >
              {t('mobSnoozePick')}
            </button>
          </li>
        </ul>
      ) : (
        <MoisMobile
          offset={offset}
          onOffset={setOffset}
          selectedKey={task.date}
          onSelect={deplacer}
        />
      )}
    </FeuilleBasse>
  );
}
