import { estNatif } from './canal-natif';

/* Permission de notifier — tâche 5.2.

   UNE RÈGLE : la permission se demande AU CLIC SUR L'INTERRUPTEUR, jamais au
   chargement. Une application qui demande à notifier avant d'avoir servi à
   quoi que ce soit se fait refuser — et un refus est définitif tant que
   l'utilisateur ne va pas le défaire dans les réglages de son navigateur. On
   ne joue pas cette carte à l'ouverture.

   Trois états à distinguer, pas deux : « pas encore demandé », « refusé »
   et « indisponible ». Le dernier n'est pas un refus — c'est un navigateur qui
   n'a pas l'API, et l'interface doit le dire autrement. */

export type EtatNotifications = 'unsupported' | 'default' | 'granted' | 'denied';

/* DEUX PLATEFORMES, UNE SEULE QUESTION. Dans l'APK, la permission n'est pas
   celle du navigateur mais celle d'Android (`POST_NOTIFICATIONS`, API 33+), et
   c'est le plugin qui la porte. La règle, elle, ne change pas d'un pouce : on
   demande AU CLIC, jamais au chargement.

   Le plugin est chargé paresseusement — le paquet web n'a rien à faire de code
   Android, et `estNatif()` répond faux partout ailleurs, PWA installée
   comprise : celle-ci a l'apparence d'une application, pas le pont natif. */

async function pluginPermissions(): Promise<{
  checkPermissions(): Promise<{ display: string }>;
  requestPermissions(): Promise<{ display: string }>;
} | null> {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    return LocalNotifications as unknown as {
      checkPermissions(): Promise<{ display: string }>;
      requestPermissions(): Promise<{ display: string }>;
    };
  } catch {
    return null;
  }
}

/** Traduit la réponse du plugin dans notre vocabulaire à quatre états. */
const versEtat = (display: string): EtatNotifications =>
  display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'default';

/** État courant, sans rien demander. Chemin NAVIGATEUR uniquement — le natif
 *  répond par promesse, d'où `etatNotificationsAsync()`. */
export function etatNotifications(): EtatNotifications {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** État courant, quelle que soit la plateforme. */
export async function etatNotificationsAsync(): Promise<EtatNotifications> {
  if (estNatif()) {
    const plugin = await pluginPermissions();
    if (!plugin) return 'unsupported';
    try {
      return versEtat((await plugin.checkPermissions()).display);
    } catch {
      return 'unsupported';
    }
  }
  return etatNotifications();
}

/** Demande la permission. À n'appeler que depuis un geste explicite.
 *
 *  Les vieux Safari rendent la réponse par rappel plutôt que par promesse :
 *  `await` couvre les deux, une promesse déjà résolue restant une promesse. */
export async function demanderNotifications(): Promise<EtatNotifications> {
  if (estNatif()) {
    const plugin = await pluginPermissions();
    if (!plugin) return 'unsupported';
    try {
      return versEtat((await plugin.requestPermissions()).display);
    } catch {
      return 'denied';
    }
  }

  if (etatNotifications() === 'unsupported') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    /* Certains contextes (iframe, origine non sécurisée) lèvent au lieu de
       refuser. Pour l'utilisateur, c'est la même chose : ça ne marche pas. */
    return 'denied';
  }
}

/** Options communes aux deux chemins d'affichage. `tag` dédoublonne : deux
 *  onglets ouverts, ou un rappel réarmé, ne produisent qu'une notification. */
const options = (corps: string, tag: string): NotificationOptions => ({
  ...(corps ? { body: corps } : {}),
  tag,
  icon: '/icons/icon-192.png',
  badge: '/icons/icon-192.png',
});

/** Envoie une notification. Rend `false` si rien n'a pu être affiché — c'est
 *  ce que l'appelant doit savoir pour ne pas prétendre avoir prévenu.
 *
 *  ELLE PASSE PAR LE SERVICE WORKER quand il y en a un, et ce n'est pas un
 *  détail d'architecture : sur Android, `new Notification()` LÈVE — Chrome
 *  mobile n'accepte que les notifications persistantes, celles qu'affiche
 *  l'enregistrement du service worker. Le chemin direct ne servait donc que le
 *  bureau, et la fonction était silencieusement morte sur mobile.
 *
 *  Une notification persistante survit en outre à la fermeture de l'onglet et
 *  reste cliquable : c'est le service worker qui la reçoit (`notificationclick`
 *  dans `app/sw.ts`) et qui ramène l'utilisateur sur sa journée.
 *
 *  Le repli `new Notification` reste nécessaire : en développement, Serwist est
 *  désactivé et il n'y a aucun service worker à interroger. */
export async function notifier(titre: string, corps: string, tag: string): Promise<boolean> {
  if (etatNotifications() !== 'granted') return false;

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const enregistrement = await navigator.serviceWorker.ready;
      await enregistrement.showNotification(titre, options(corps, tag));
      return true;
    } catch {
      /* Pas de service worker prêt : on tente le chemin direct plutôt que de
         renoncer. */
    }
  }

  try {
    new Notification(titre, options(corps, tag));
    return true;
  } catch {
    return false;
  }
}
