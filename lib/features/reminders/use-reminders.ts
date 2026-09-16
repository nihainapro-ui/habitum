'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { prochainsRappels, type Rappel } from '@/lib/domain';
import { useSettings, useStore } from '@/lib/store';
import type { Canal, RappelPret } from './canal';
import { creerCanalMinuteries } from './canal-minuteries';
import { creerCanalNatif, estNatif } from './canal-natif';
import { etatNotificationsAsync, notifier, PERMISSION_NOTIFICATIONS_CHANGE } from './permission';
import { logError } from '@/lib/logger';

/* Armement des rappels — tâche 5.2, étendue par la spec du 2026-09-07.
 *
 * Monté une seule fois, dans la coque. Il se réarme quand les données ou les
 * réglages changent : cocher une tâche doit ANNULER son rappel, pas le laisser
 * sonner cinq minutes plus tard.
 *
 * IL NE DÉCIDE DE RIEN, et c'est le partage qui rend les cinq sources
 * testables sans navigateur : `prochainsRappels()` dit quoi et quand, ce
 * fichier traduit, un canal envoie.
 *
 * IL NE DEMANDE JAMAIS LA PERMISSION — c'est le rôle de l'interrupteur, et de
 * lui seul. Si elle a été retirée depuis les réglages du système, rien n'est
 * armé : l'interface le dira au prochain passage dans les réglages plutôt que
 * de faire semblant. */

export function useReminders(pret: boolean): void {
  const ts = useTranslations('system');
  const habits = useStore((s) => s.habits);
  const logIndex = useStore((s) => s.logIndex);
  const tasks = useStore((s) => s.tasks);
  const occurrences = useStore((s) => s.occurrences);
  const projectTasks = useStore((s) => s.projectTasks);
  const goals = useStore((s) => s.goals);
  const reglages = useSettings();
  const canalRef = useRef<Canal | null>(null);
  const [revision, actualiser] = useState(0);

  useEffect(() => {
    const rafraichir = () => actualiser((n) => n + 1);
    const auRetour = () => {
      if (document.visibilityState === 'visible') rafraichir();
    };
    window.addEventListener(PERMISSION_NOTIFICATIONS_CHANGE, rafraichir);
    window.addEventListener('focus', auRetour);
    document.addEventListener('visibilitychange', auRetour);
    /* Renouvelle l'horizon même si l'application reste ouverte plusieurs jours.
       Sur le web, remplit aussi les places libérées parmi les 24 minuteries. */
    const minuterie = setInterval(rafraichir, estNatif() ? 3_600_000 : 60_000);
    return () => {
      clearInterval(minuterie);
      window.removeEventListener(PERMISSION_NOTIFICATIONS_CHANGE, rafraichir);
      window.removeEventListener('focus', auRetour);
      document.removeEventListener('visibilitychange', auRetour);
    };
  }, []);

  useEffect(() => {
    /* Le réglage initial vaut false AVANT lecture de la base : l'utiliser
       annulerait les alarmes d'une installation pourtant activée. */
    if (!pret) return;

    const canal = (canalRef.current ??= estNatif()
      ? creerCanalNatif()
      : creerCanalMinuteries((r) => void notifier(r.titre, r.corps, r.cle)));
    let abandonne = false;

    /* La traduction a lieu ICI, une fois. Le domaine rend une clé de libellé,
       les canaux reçoivent du texte : ni l'un ni les autres n'ont à connaître
       la langue de l'utilisateur. */
    const traduire = (r: Rappel): RappelPret => ({
      cle: r.cle,
      at: r.at,
      titre: r.titre || (r.titreKey ? ts(r.titreKey) : ''),
      corps: ts(r.corpsKey, r.corpsParams ?? {}),
    });

    void (async () => {
      /* Désactivation EXPLICITE, distincte de la fermeture de l'application. */
      if (!reglages.notifications) {
        await canal.programmer([]);
        return;
      }
      if ((await etatNotificationsAsync()) !== 'granted' || abandonne) return;
      const rappels = prochainsRappels(
        { habits, log: logIndex, tasks, occurrences, projectTasks, goals },
        reglages,
        new Date(),
        canal.horizonJours,
      );
      await canal.programmer(rappels.map(traduire));
    })().catch((e: unknown) => void logError('notifications', e));

    return () => {
      abandonne = true;
      /* Le canal peut n'avoir jamais été créé (permission refusée, ou démontage
         pendant la lecture) : on n'arrête que ce qui existe. */
      void canal.arreter().catch((e: unknown) => void logError('notifications', e));
    };
  }, [pret, revision, reglages, habits, logIndex, tasks, occurrences, projectTasks, goals, ts]);
}
