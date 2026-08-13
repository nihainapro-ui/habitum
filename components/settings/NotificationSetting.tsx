'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui';
import { useSettings, useStore } from '@/lib/store';
import {
  demanderNotifications,
  etatNotifications,
  type EtatNotifications,
} from '@/lib/features/reminders';

/* Interrupteur des notifications — tâche 5.2.

   Ce qu'il fait, dans l'ordre où ça compte :

   1. **Il ne demande rien au chargement.** La permission part d'un geste, et
      d'un seul : ce clic-ci.
   2. **Un refus le ramène à l'arrêt, avec l'explication.** Et l'explication dit
      QUI a refusé : c'est le navigateur, pas l'application, et c'est dans ses
      réglages à lui que ça se défait. Sans cette phrase, l'utilisateur re-clique
      indéfiniment sur un interrupteur qui ne s'allumera plus jamais.
   3. **API absente = interrupteur désactivé qui dit pourquoi** (G3). Pas
      d'interrupteur allumé qui ne déclenche rien.

   Il annonce aussi sa LIMITE tant que le service worker ne planifie pas :
   les rappels arrivent quand Habitum est ouvert. Un réglage qui promet plus
   que ce qu'il tient est un mensonge poli. */

export function NotificationSetting() {
  const t = useTranslations('app');
  const ts = useTranslations('system');
  const settings = useSettings();
  const setSetting = useStore((s) => s.setSetting);

  /* L'état réel n'existe que dans le navigateur : le rendu statique part de
     `default`, et on le corrige après le montage (aucune divergence
     d'hydratation, aucune demande au passage). */
  const [etat, setEtat] = useState<EtatNotifications>('default');
  const [refuse, setRefuse] = useState(false);

  useEffect(() => {
    setEtat(etatNotifications());
  }, []);

  const basculer = async (voulu: boolean) => {
    if (!voulu) {
      setRefuse(false);
      await setSetting('notifications', false);
      return;
    }

    const reponse = await demanderNotifications();
    setEtat(reponse);

    if (reponse === 'granted') {
      setRefuse(false);
      await setSetting('notifications', true);
      return;
    }

    /* Refus, ou API qui lève : l'interrupteur revient à l'arrêt. Le laisser
       allumé serait promettre des rappels que le navigateur ne laissera pas
       passer. */
    setRefuse(true);
    await setSetting('notifications', false);
  };

  const indisponible = etat === 'unsupported';
  const raison = indisponible
    ? ts('notifUnsupported')
    : etat === 'denied'
      ? ts('notifDenied')
      : ts('notifOnlyOpen');

  return (
    <div className="flex flex-col">
      <Switch
        label={t('notifLbl')}
        checked={settings.notifications && etat === 'granted'}
        disabled={indisponible}
        reason={raison}
        onChange={(v) => void basculer(v)}
      />
      {refuse ? (
        <p role="alert" className="m-0 pb-1.5 text-[11.5px]" style={{ color: 'var(--bad)' }}>
          {ts('notifDenied')}
        </p>
      ) : null}
    </div>
  );
}
