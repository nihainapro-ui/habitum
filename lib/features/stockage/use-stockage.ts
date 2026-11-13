'use client';

import { useEffect } from 'react';
import { brancherOnglets, demanderPersistance, estQuotaDepasse } from '@/lib/data';
import { logError } from '@/lib/logger';
import { cacheDerive, useStore } from '@/lib/store';
import { completerJournalEnFond, rechargerDonnees } from '@/lib/store/hydrate';

/* Trois gardes autour de la base locale — 12 novembre 2026. Le « pourquoi » de
   chacune est dans `lib/data/stockage.ts` et `lib/data/onglets.ts` ; il ne
   reste ici que le branchement sur la page.

   1. **Persistance.** Demandée dès que le compte contient quelque chose à
      protéger — pas avant : Firefox pose la question à l'utilisateur, et la
      lui poser devant un compte vide, c'est lui demander de garder rien.
   2. **Quota.** Une écriture refusée faute de place se DIT. Les actions du
      store ne rattrapent pas leurs erreurs : sans cette écoute, la case se
      cochait à l'écran, la base refusait, et rien ne le signalait avant le
      rechargement suivant.
   3. **Onglets.** Quand un autre onglet écrit, celui-ci relit. */

/** Relit la base dans le store. Si l'onglet n'est pas regardé, la relecture
 *  attend qu'il le soit : rafraîchir un écran que personne ne voit ne sert
 *  qu'à dépenser. */
function relireQuandVisible(): () => void {
  let perime = false;
  let enCours = false;

  const relire = async (): Promise<void> => {
    if (enCours || !perime || document.visibilityState !== 'visible') return;
    enCours = true;
    perime = false;
    try {
      cacheDerive.clear();
      const donnees = await rechargerDonnees();
      useStore.setState(donnees);
      await useStore.getState().chargerSync();
      if (!donnees.logIndexComplete) {
        await completerJournalEnFond(useStore.setState, useStore.getState);
      }
    } catch (e) {
      void logError('onglets', e);
    } finally {
      enCours = false;
      /* Une écriture arrivée PENDANT la relecture a reposé le drapeau. */
      if (perime) void relire();
    }
  };

  const signale = (): void => {
    perime = true;
    void relire();
  };
  const auRetour = (): void => void relire();

  const debrancher = brancherOnglets(signale);
  document.addEventListener('visibilitychange', auRetour);
  return () => {
    debrancher();
    document.removeEventListener('visibilitychange', auRetour);
  };
}

export function useStockage(pret: boolean): void {
  /* « Quelque chose à protéger » : une habitude, une tâche ou un objectif. */
  const aProteger = useStore(
    (s) => s.habits.length + s.tasks.length + s.goals.length + s.projects.length > 0,
  );

  useEffect(() => {
    if (pret && aProteger) void demanderPersistance();
  }, [pret, aProteger]);

  useEffect(() => {
    if (!pret) return;

    const surRejet = (e: PromiseRejectionEvent): void => {
      if (!estQuotaDepasse(e.reason)) return;
      void logError('stockage', e.reason);
      useStore.getState().flashToast('system.storageFull');
    };
    window.addEventListener('unhandledrejection', surRejet);

    const debrancher = relireQuandVisible();
    return () => {
      window.removeEventListener('unhandledrejection', surRejet);
      debrancher();
    };
  }, [pret]);
}
