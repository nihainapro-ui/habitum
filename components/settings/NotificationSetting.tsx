'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui';
import { useSettings, useStore } from '@/lib/store';
import {
  alarmesExactes,
  creerCanalNatif,
  demanderAlarmesExactes,
  demanderNotifications,
  estNatif,
  etatNotificationsAsync,
  ouvrirReglagesNotifications,
  programmerEssai,
  notifier,
  type EtatAlarmes,
  type EtatNotifications,
} from '@/lib/features/reminders';
import { logError } from '@/lib/logger';
import { NotificationDetails } from './NotificationDetails';

/* Interrupteur des notifications — tâche 5.2, refondu par la spec du
   2026-09-07 et par ce qu'un vrai téléphone en a dit.

   Ce qu'il fait, dans l'ordre où ça compte :

   1. **Il ne demande rien au chargement.** La permission part d'un geste, et
      d'un seul : ce clic-ci.
   2. **Il porte l'intention, pas la permission.** Android mémorise un refus et
      cesse d'afficher toute boîte de dialogue ; lier l'interrupteur à la
      permission le rendait définitivement inactionnable, sans un mot.
   3. **Il EMMÈNE là où le refus se défait** plutôt que d'y renvoyer par une
      phrase : l'arborescence des réglages change à chaque surcouche
      constructeur, et « allez dans les réglages d'Android » est une consigne
      qu'on ne peut pas suivre à coup sûr.
   4. **Il se teste.** Un rappel d'essai à dix secondes est la seule preuve que
      la chaîne complète marche sur CET appareil — permission, canal, alarme
      exacte, veille. Aucune suite de tests ne peut la donner à notre place.
   5. **Il dit ce que le système répond**, mot pour mot. Un état affiché vaut
      mieux qu'un utilisateur et un développeur qui devinent chacun de leur
      côté. */

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
  /* Alarmes exactes : `inconnu` tant qu'on n'a pas demandé, et sur toute
     plateforme qui ne connaît pas la question (Android 11 et avant). */
  const [exactes, setExactes] = useState<EtatAlarmes>('inconnu');
  /* Ce que l'essai a donné. `null` = pas encore tenté. */
  const [essai, setEssai] = useState<'ok' | 'echec' | null>(null);
  const [ouvertureRatee, setOuvertureRatee] = useState(false);
  /* Combien de rappels le SYSTÈME détient réellement. `null` = pas encore
     demandé, ou navigateur (où la question n'a pas de sens : les minuteries
     meurent avec la page). */
  const [programmes, setProgrammes] = useState<number | null>(null);

  useEffect(() => {
    void etatNotificationsAsync().then(setEtat);
    /* Posé après le montage, comme l'état de permission : le rendu statique
       est celui du navigateur, et le corriger à l'hydratation évite toute
       divergence. */
    setNatif(estNatif());
    void alarmesExactes().then(setExactes);
    if (estNatif()) void creerCanalNatif().compterProgrammes().then(setProgrammes);
  }, []);

  /* RELECTURE AU RETOUR DANS L'APPLICATION.
     Sans elle, revenir des réglages d'Android — où l'on vient d'accorder la
     permission — laissait l'écran sur son état d'avant, message rouge compris.
     Il fallait alors taper « redemander la permission » pour voir la vérité,
     et rien ne le disait. La page se relit désormais toute seule dès qu'elle
     redevient visible : c'est exactement l'instant du retour. */
  useEffect(() => {
    const relire = () => {
      if (document.visibilityState !== 'visible') return;
      void etatNotificationsAsync().then(setEtat);
      void alarmesExactes().then(setExactes);
      if (estNatif()) void creerCanalNatif().compterProgrammes().then(setProgrammes);
    };
    document.addEventListener('visibilitychange', relire);
    return () => document.removeEventListener('visibilitychange', relire);
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

  const ouvrirReglages = async () => {
    setOuvertureRatee(!(await ouvrirReglagesNotifications()));
  };

  /* L'ESSAI PART PAR LE MÊME CHEMIN QUE LES VRAIS RAPPELS : le canal natif s'il
     y en a un, l'affichage direct sinon. Un test qui emprunterait une voie à
     lui ne prouverait que lui-même. */
  const tester = async () => {
    setEssai(null);
    try {
      if (natif) await programmerEssai(ts('notifTestTitle'), ts('notifTestBody'));
      else await notifier(ts('notifTestTitle'), ts('notifTestBody'), 'essai');
      setEssai('ok');
    } catch (e) {
      void logError('notifications', e);
      setEssai('echec');
    }
  };

  /* Redemander sans passer par l'interrupteur : sur navigateur, la boîte de
     dialogue peut avoir été fermée par mégarde ; sur Android, la permission
     accordée dans les réglages système doit pouvoir être RELUE sans
     réinstaller. */
  const redemander = async () => {
    setEtat(await demanderNotifications());
    setExactes(await alarmesExactes());
    if (estNatif()) setProgrammes(await creerCanalNatif().compterProgrammes());
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

          {/* L'ÉTAT BRUT, mot pour mot. « Ça ne marche pas » ne se corrige pas ;
              « denied » se corrige. */}
          <p className="m-0 font-mono text-[10.5px]" style={{ color: 'var(--mut)' }}>
            {ts('notifState', { etat })}
          </p>

          <div className="flex flex-wrap gap-2">
            {natif ? (
              <button
                type="button"
                onClick={() => void ouvrirReglages()}
                className="rounded-btn cursor-pointer border px-3 py-1.5 text-[11.5px]"
                style={{ borderColor: 'var(--acc2)', color: 'var(--acc2)' }}
              >
                {ts('notifOpenSettings')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void redemander()}
              className="rounded-btn cursor-pointer border px-3 py-1.5 text-[11.5px]"
              style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
            >
              {ts('notifRetry')}
            </button>
          </div>

          {ouvertureRatee ? (
            <p role="alert" className="m-0 text-[11.5px]" style={{ color: 'var(--bad)' }}>
              {ts('notifOpenFailed')}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ALARMES EXACTES — Android 12+. Refusées, le système est libre de
          regrouper le rappel avec d'autres réveils : il peut arriver une
          demi-heure plus tard, ce qui, pour un rappel, revient à ne pas
          arriver. Le plugin officiel sait ouvrir cet écran ; on l'expose
          plutôt que de laisser le retard inexpliqué. */}
      {settings.notifications && exactes === 'denied' ? (
        <div className="flex flex-col items-start gap-2 pb-2">
          <p className="m-0 text-[11.5px]" style={{ color: 'var(--bad)' }}>
            {ts('notifExactT')}
          </p>
          <p className="m-0 text-[11px]" style={{ color: 'var(--mut)' }}>
            {ts('notifExactD')}
          </p>
          <button
            type="button"
            onClick={() => void demanderAlarmesExactes().then(setExactes)}
            className="rounded-btn cursor-pointer border px-3 py-1.5 text-[11.5px]"
            style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
          >
            {ts('notifExactBtn')}
          </button>
        </div>
      ) : null}

      {/* L'ESSAI — visible dès que le réglage est allumé, permission accordée ou
          non : c'est justement quand rien n'arrive qu'on a besoin de savoir où
          la chaîne casse. */}
      {settings.notifications && !indisponible ? (
        <div className="flex flex-col items-start gap-2 pb-2">
          <button
            type="button"
            onClick={() => void tester()}
            data-test-notif
            className="rounded-btn cursor-pointer border px-3 py-1.5 text-[11.5px]"
            style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
          >
            {ts('notifTest')}
          </button>
          {essai === 'ok' ? (
            <p role="status" className="m-0 text-[11.5px]" style={{ color: 'var(--acc2)' }}>
              {ts('notifTestSent')}
            </p>
          ) : null}
          {essai === 'echec' ? (
            <p role="alert" className="m-0 text-[11.5px]" style={{ color: 'var(--bad)' }}>
              {ts('notifTestFailed')}
            </p>
          ) : null}

          {/* CE QUE LE SYSTÈME DÉTIENT VRAIMENT. C'est la ligne qui distingue
              « rien n'a sonné parce que rien n'était programmé » de « rien n'a
              sonné alors que trois rappels attendaient » — deux pannes qui ne
              se corrigent pas au même endroit, et qu'on ne pouvait pas
              distinguer jusqu'ici. */}
          {natif && programmes !== null ? (
            <p className="m-0 font-mono text-[10.5px]" style={{ color: 'var(--mut)' }}>
              {ts('notifScheduled', { n: programmes })}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Les réglages fins suivent l'INTENTION : les cacher tant que le système
          n'a pas dit oui reviendrait à masquer ce qu'on vient de demander. */}
      {settings.notifications ? <NotificationDetails /> : null}
    </div>
  );
}
