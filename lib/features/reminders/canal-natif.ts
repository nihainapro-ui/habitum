import { identifiantNotification } from '@/lib/domain';
import type { Canal, RappelPret } from './canal';

/* Canal NATIF — Android, application fermée. Spec du 2026-09-07.
 *
 * `@capacitor/local-notifications` (MIT, plugin officiel Capacitor) programme
 * de vraies notifications système, posées sur `AlarmManager`. C'est le seul
 * chemin qui sonne quand Habitum n'est pas ouvert, et c'est exactement là que
 * le besoin est réel : un rappel sert quand le téléphone est dans la poche.
 *
 * DEUX DÉCISIONS, ET ELLES TIENNENT LE FICHIER.
 *
 * 1. **Aucun état à réconcilier.** À chaque changement, on annule tout ce qui
 *    est programmé et on reprogramme l'horizon complet. Un planificateur qui
 *    tiendrait son propre journal de ce qu'il a posé finirait par diverger de
 *    la base — et un rappel fantôme, pour une tâche supprimée hier, est pire
 *    que pas de rappel du tout : il fait douter de tous les autres.
 *
 * 2. **Le plugin est chargé PARESSEUSEMENT et INJECTABLE.** Chargé
 *    paresseusement parce que le paquet web n'a rien à faire de code Android ;
 *    injectable parce qu'aucun navigateur d'intégration n'a Android — le test
 *    vérifie ce qui est DEMANDÉ au plugin, faute de pouvoir vérifier ce qu'il
 *    en fait. Ce que ce canal fait réellement sonner se vérifie à la main, sur
 *    l'APK. C'est écrit ici pour que personne ne croie la couverture plus
 *    large qu'elle n'est. */

/** Horizon du canal natif, en jours. Sept : au-delà, la moindre modification
 *  rendrait la programmation fausse plus vite qu'elle ne servirait, et Android
 *  borne de toute façon le nombre d'alarmes exactes qu'une application peut
 *  poser. */
export const HORIZON_NATIF_JOURS = 7;

/** Le strict nécessaire du plugin — trois méthodes sur les quinze qu'il
 *  expose. Déclarer ce qu'on utilise plutôt qu'importer son type entier rend
 *  le double de test trivial, et dit au lecteur l'étendue exacte du couplage. */
export interface PluginNotifications {
  schedule(options: {
    notifications: {
      id: number;
      title: string;
      body: string;
      schedule: { at: Date; allowWhileIdle: boolean };
    }[];
  }): Promise<unknown>;
  getPending(): Promise<{ notifications: { id: number }[] }>;
  cancel(options: { notifications: { id: number }[] }): Promise<unknown>;
}

/** Charge le vrai plugin. Séparé pour que le canal reste testable sans lui. */
async function pluginReel(): Promise<PluginNotifications> {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  return LocalNotifications as unknown as PluginNotifications;
}

/** Tourne-t-on dans l'APK ? Faux dans tout navigateur, y compris la PWA
 *  installée : celle-ci n'a pas le pont natif, seulement l'apparence.
 *
 *  SYNCHRONE, ET C'EST DÉLIBÉRÉ. La coque native injecte `window.Capacitor`
 *  avant le premier script de la page — c'est exactement ce que lit
 *  `Capacitor.isNativePlatform()`, en passant par un import. Le faire nous-mêmes
 *  évite un `await` sur le chemin de la PERMISSION, qui part d'un clic : un
 *  tour de boucle inséré entre le geste et `requestPermission()` fait perdre à
 *  certains navigateurs l'activation de l'utilisateur, et la demande est alors
 *  refusée sans que rien ne s'affiche. Le plugin, lui, reste importé
 *  paresseusement là où il sert vraiment — pour programmer. */
export function estNatif(): boolean {
  const pont = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return pont?.isNativePlatform?.() === true;
}

export function creerCanalNatif(charger: () => Promise<PluginNotifications> = pluginReel): Canal {
  /* Tout annuler, y compris ce qu'une VERSION PRÉCÉDENTE de l'application
     aurait posé : on demande au système ce qui est en attente plutôt que de se
     fier à ce qu'on croit avoir programmé. */
  const arreter = async (): Promise<void> => {
    const plugin = await charger();
    const { notifications } = await plugin.getPending();
    if (notifications.length > 0) await plugin.cancel({ notifications });
  };

  return {
    horizonJours: HORIZON_NATIF_JOURS,
    arreter,

    async programmer(rappels) {
      await arreter();
      if (rappels.length === 0) return;

      const plugin = await charger();
      const maintenant = Date.now();
      await plugin.schedule({
        notifications: rappels
          .filter((r: RappelPret) => r.at > maintenant)
          .map((r) => ({
            /* Identifiant DÉRIVÉ de la clé, jamais tiré au hasard : la même
               tâche à la même heure doit retomber sur le même entier d'une
               reprogrammation à l'autre, sinon les annulations ratent leur
               cible et les doublons s'accumulent. */
            id: identifiantNotification(r.cle),
            title: r.titre,
            body: r.corps,
            /* `allowWhileIdle` : sans lui, Doze retient le rappel jusqu'au
               prochain réveil du téléphone — c'est-à-dire précisément dans le
               cas où il sert le plus, la nuit et l'appareil posé. */
            schedule: { at: new Date(r.at), allowWhileIdle: true },
          })),
      });
    },
  };
}
