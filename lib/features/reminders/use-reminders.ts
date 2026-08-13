'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSettings, useStore } from '@/lib/store';
import { etatNotifications, notifier } from './permission';
import { planifier } from './scheduler';

/* Armement des rappels — tâche 5.2.

   Monté une seule fois, dans la coque. Il se réarme quand les habitudes, le
   journal ou le réglage changent : cocher une habitude doit ANNULER son rappel
   du jour, pas le laisser sonner cinq minutes plus tard.

   Il ne demande jamais la permission — c'est le rôle de l'interrupteur, et de
   lui seul. Si la permission a été retirée depuis les réglages du navigateur,
   rien n'est armé : l'interface le dira au prochain passage dans les réglages
   plutôt que de faire semblant. */

export function useReminders(): void {
  const ts = useTranslations('system');
  const habits = useStore((s) => s.habits);
  const logIndex = useStore((s) => s.logIndex);
  const actifs = useSettings().notifications;

  useEffect(() => {
    if (!actifs || etatNotifications() !== 'granted') return;

    return planifier({
      habits,
      log: logIndex,
      envoyer: (r) => notifier(r.name, ts('notifRemB'), `rappel-${r.habitId}-${r.time}`),
    });
  }, [actifs, habits, logIndex, ts]);
}
