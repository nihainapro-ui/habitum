'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui';
import { useSettings, useStore } from '@/lib/store';
import {
  demanderNotifications,
  estNatif,
  etatNotificationsAsync,
  type EtatNotifications,
} from '@/lib/features/reminders';
import { NotificationDetails } from './NotificationDetails';

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
  /* Dans l'APK, la permission est celle d'Android et les rappels sont
     programmés par le système : la phrase « tant qu'Habitum est ouvert »
     y serait FAUSSE. Elle devient donc conditionnelle — la taire sur PC
     serait promettre ce que le produit ne tient pas, l'afficher dans l'APK
     ferait douter d'un rappel qui, lui, va bien arriver. */
  const [natif, setNatif] = useState(false);

  useEffect(() => {
    void etatNotificationsAsync().then(setEtat);
    /* Posé après le montage, comme l'état de permission : le rendu statique
       est celui du navigateur, et le corriger à l'hydratation évite toute
       divergence. */
    setNatif(estNatif());
  }, []);

  /* L'INTERRUPTEUR PORTE L'INTENTION, PAS LA PERMISSION — et c'est une
     correction, payée sur un vrai téléphone.

     Il valait `settings.notifications && etat === 'granted'` : l'utilisateur ne
     pouvait donc pas l'allumer tant que le système n'avait pas dit oui. Or sur
     Android, une permission refusée ou balayée deux fois est mémorisée par le
     système, qui renvoie « refusé » sans plus jamais afficher de dialogue. Le
     réglage devenait alors définitivement inactionnable, et rien à l'écran ne
     disait pourquoi : on tapait, il ne se passait rien.

     Désormais l'interrupteur dit ce que l'utilisateur VEUT, et une ligne dit ce
     que le système FAIT. Ce n'est pas un interrupteur qui ment (G3) : rien ne
     sonne sans permission — `useReminders` la vérifie avant d'armer quoi que ce
     soit — et l'écran l'écrit, avec l'endroit exact où cela se défait. */
  const basculer = async (voulu: boolean) => {
    if (!voulu) {
      await setSetting('notifications', false);
      return;
    }

    /* LA DEMANDE PART DANS LE GESTE, l'écriture vient après — et l'ordre
       compte deux fois. D'abord parce que plusieurs navigateurs exigent que
       `requestPermission()` soit appelé pendant l'activation de l'utilisateur :
       une écriture en base intercalée (quelques millisecondes) suffit à la
       perdre, et la demande est alors refusée sans qu'aucune boîte de dialogue
       n'apparaisse. Ensuite parce que l'intention doit être écrite QUOI QU'IL
       ARRIVE ensuite : c'est elle qui permet de rallumer après avoir corrigé le
       réglage système, sans deviner qu'il fallait repasser ici. */
    const demande = demanderNotifications();
    await setSetting('notifications', true);
    setEtat(await demande);
  };

  /* Redemander sans passer par l'interrupteur : sur navigateur, la boîte de
     dialogue peut avoir été fermée par mégarde ; sur Android, la permission
     accordée dans les réglages système doit pouvoir être RELUE sans
     réinstaller. */
  const redemander = async () => {
    setEtat(await demanderNotifications());
  };

  /* Désactivé UNIQUEMENT là où rien ne pourra jamais marcher : un navigateur
     sans API de notification. Dans l'APK, `unsupported` signale un plugin qui
     n'a pas chargé — un défaut, pas une incapacité : l'interrupteur reste
     actionnable et le journal d'erreurs porte la cause. */
  const indisponible = etat === 'unsupported' && !natif;
  const manquePermission = settings.notifications && etat !== 'granted' && !indisponible;

  /* CHAQUE MESSAGE DIT QUI A REFUSÉ, et dans l'APK ce n'est pas le navigateur.
     « Votre navigateur a refusé » envoyait chercher un réglage de navigateur
     sur un téléphone qui n'en montre aucun — le message était faux, et il
     cachait la seule action qui débloque : les réglages système de
     l'application. */
  const raison = indisponible
    ? ts('notifUnsupported')
    : etat === 'unsupported'
      ? ts('notifUnsupportedNative')
      : natif
        ? ts('notifNative')
        : ts('notifOnlyOpen');

  return (
    <div className="flex flex-col">
      <Switch
        label={t('notifLbl')}
        checked={settings.notifications}
        disabled={indisponible}
        reason={raison}
        onChange={(v) => void basculer(v)}
      />

      {manquePermission ? (
        <div className="flex flex-col items-start gap-2 pb-2">
          <p role="alert" className="m-0 text-[11.5px]" style={{ color: 'var(--bad)' }}>
            {natif ? ts('notifPermNative') : ts('notifPermWeb')}
          </p>
          <button
            type="button"
            onClick={() => void redemander()}
            className="rounded-btn cursor-pointer border px-3 py-1.5 text-[11.5px]"
            style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
          >
            {ts('notifRetry')}
          </button>
        </div>
      ) : null}

      {/* Les réglages fins suivent l'INTENTION : les cacher tant que le système
          n'a pas dit oui reviendrait à masquer ce qu'on vient de demander. */}
      {settings.notifications ? <NotificationDetails /> : null}
    </div>
  );
}
