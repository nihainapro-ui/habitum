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
export interface NotificationNative {
  id: number;
  title: string;
  body: string;
  schedule: { at: Date; allowWhileIdle: boolean };
  channelId?: string;
}

export interface PluginNotifications {
  schedule(options: { notifications: NotificationNative[] }): Promise<unknown>;
  getPending(): Promise<{ notifications: { id: number }[] }>;
  cancel(options: { notifications: { id: number }[] }): Promise<unknown>;
  /** Canal Android. Facultatif dans ce type : un double de test n'a pas à le
   *  simuler pour éprouver la programmation. */
  createChannel?(channel: {
    id: string;
    name: string;
    description?: string;
    importance: 1 | 2 | 3 | 4 | 5;
  }): Promise<unknown>;
  /** Alarmes EXACTES (Android 12+). Sans elles, le système est libre de
   *  regrouper le rappel avec d'autres réveils — il peut arriver avec une
   *  demi-heure de retard, ce qui, pour un rappel, revient à ne pas arriver. */
  checkExactNotificationSetting?(): Promise<{ exact_alarm: string }>;
  changeExactNotificationSetting?(): Promise<{ exact_alarm: string }>;
}

/** Canal de notification Android.
 *
 *  POURQUOI UN CANAL À NOUS : depuis Android 8, tout se range dans un canal, et
 *  c'est le canal — pas l'application — qui porte l'importance, le son et la
 *  vibration. Sans canal déclaré, le plugin en crée un par défaut d'importance
 *  MOYENNE : la notification arrive, mais sans bandeau ni son. Un rappel muet
 *  qui attend qu'on déverrouille l'écran n'est pas un rappel.
 *
 *  L'identifiant est FIGÉ : Android ne laisse pas modifier un canal existant
 *  (l'utilisateur seul le peut). Le renommer en créerait un second, et les
 *  réglages faits sur le premier seraient perdus sans un mot. */
export const CANAL_RAPPELS = 'habitum-rappels';

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

/** État des alarmes exactes : `granted`, `denied`, ou `inconnu` quand la
 *  plateforme ne connaît pas la question (Android 11 et avant, où elles sont
 *  acquises d'office). */
export type EtatAlarmes = 'granted' | 'denied' | 'inconnu';

export async function alarmesExactes(
  charger: () => Promise<PluginNotifications> = pluginReel,
): Promise<EtatAlarmes> {
  if (!estNatif()) return 'inconnu';
  try {
    const plugin = await charger();
    if (!plugin.checkExactNotificationSetting) return 'inconnu';
    const { exact_alarm } = await plugin.checkExactNotificationSetting();
    return exact_alarm === 'granted' ? 'granted' : exact_alarm === 'denied' ? 'denied' : 'inconnu';
  } catch {
    return 'inconnu';
  }
}

/** Ouvre l'écran système des alarmes exactes. C'est le plugin officiel qui le
 *  fait — nous n'avons pas à le réécrire. */
export async function demanderAlarmesExactes(
  charger: () => Promise<PluginNotifications> = pluginReel,
): Promise<EtatAlarmes> {
  if (!estNatif()) return 'inconnu';
  try {
    const plugin = await charger();
    if (!plugin.changeExactNotificationSetting) return 'inconnu';
    const { exact_alarm } = await plugin.changeExactNotificationSetting();
    return exact_alarm === 'granted' ? 'granted' : exact_alarm === 'denied' ? 'denied' : 'inconnu';
  } catch {
    return 'inconnu';
  }
}

/** Déclare le canal. Idempotent côté Android : le redéclarer ne réécrit rien
 *  si l'identifiant existe déjà. */
async function declarerCanal(plugin: PluginNotifications, nom: string): Promise<void> {
  try {
    await plugin.createChannel?.({ id: CANAL_RAPPELS, name: nom, importance: 5 });
  } catch {
    /* Un canal qui ne se crée pas ne doit pas empêcher de programmer : la
       notification retombera sur le canal par défaut du plugin. */
  }
}

/** Programme UN rappel d'essai, dans quelques secondes.
 *
 *  Ce n'est pas un gadget : c'est le seul moyen, pour l'utilisateur comme pour
 *  nous, de savoir si la chaîne complète fonctionne sur SON téléphone —
 *  permission, canal, alarme exacte, veille. Un test qui part dans dix secondes
 *  et qu'on attend écran éteint prouve ce qu'aucune suite de tests ne peut
 *  prouver ici. */
export async function programmerEssai(
  titre: string,
  corps: string,
  dansSecondes = 10,
  charger: () => Promise<PluginNotifications> = pluginReel,
): Promise<void> {
  const plugin = await charger();
  await declarerCanal(plugin, titre);
  await plugin.schedule({
    notifications: [
      {
        id: ESSAI_ID,
        title: titre,
        body: corps,
        schedule: { at: new Date(Date.now() + dansSecondes * 1000), allowWhileIdle: true },
        channelId: CANAL_RAPPELS,
      },
    ],
  });
}

/** Identifiant du rappel d'essai. FIXE et hors de portée de
 *  `identifiantNotification` (qui rend un entier de 31 bits) : un essai ne doit
 *  jamais entrer en collision avec un vrai rappel, ni être annulé par la
 *  reprogrammation qui suit. */
export const ESSAI_ID = 1;

export function creerCanalNatif(charger: () => Promise<PluginNotifications> = pluginReel): Canal {
  /* Tout annuler, y compris ce qu'une VERSION PRÉCÉDENTE de l'application
     aurait posé : on demande au système ce qui est en attente plutôt que de se
     fier à ce qu'on croit avoir programmé. */
  const arreter = async (): Promise<void> => {
    const plugin = await charger();
    const { notifications } = await plugin.getPending();
    /* L'ESSAI EST ÉPARGNÉ. Il part dans dix secondes, et la moindre écriture
       dans l'application déclenche une reprogrammation : sans cette exception,
       cocher une tâche pendant l'attente annulerait le test qu'on est en train
       de faire, et l'utilisateur en conclurait que rien ne marche. */
    const aAnnuler = notifications.filter((n) => n.id !== ESSAI_ID);
    if (aAnnuler.length > 0) await plugin.cancel({ notifications: aAnnuler });
  };

  return {
    horizonJours: HORIZON_NATIF_JOURS,
    arreter,

    async programmer(rappels) {
      await arreter();
      if (rappels.length === 0) return;

      const plugin = await charger();
      await declarerCanal(plugin, rappels[0]?.titre ?? CANAL_RAPPELS);
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
            channelId: CANAL_RAPPELS,
          })),
      });
    },
  };
}
