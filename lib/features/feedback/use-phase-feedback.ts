'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSettings } from '@/lib/store';
import { notifier } from '@/lib/features/reminders';
import { beep } from './beep';
import { surFinDePhase } from './events';
import { vibrer } from './vibrate';

/* Retour utilisateur à la fin d'une phase — tâches 5.2 et 5.3.

   Monté une fois dans la coque, et pas dans la vue « Focus » : une phase qui se
   termine pendant qu'on est sur une autre vue se termine quand même. C'était
   d'ailleurs tout l'intérêt d'ancrer le minuteur sur l'horloge murale.

   Chaque canal est gouverné par SON réglage. Aucun n'est supposé disponible :
   ce qui n'existe pas sur l'appareil ne fait rien, et l'interrupteur
   correspondant est déjà masqué ou justifié dans les réglages (G3). */

export function usePhaseFeedback(): void {
  const ts = useTranslations('system');
  const { notifications, sound, vibrate } = useSettings();

  useEffect(
    () =>
      surFinDePhase((e) => {
        const titre = e.phase === 'focus' ? ts('notifFocusEnd') : ts('notifBreakEnd');
        if (notifications) notifier(titre, '', `phase-${e.phase}`);
        /* Une pause qui commence sonne plus grave qu'une concentration qui
           reprend : deux signaux distincts, sans regarder l'écran. */
        if (sound) beep(e.phase === 'focus' ? 660 : 880);
        if (vibrate) vibrer();
      }),
    [notifications, sound, vibrate, ts],
  );
}
