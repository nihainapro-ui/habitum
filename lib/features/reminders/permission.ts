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

/** État courant, sans rien demander. */
export function etatNotifications(): EtatNotifications {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** Demande la permission. À n'appeler que depuis un geste explicite.
 *
 *  Les vieux Safari rendent la réponse par rappel plutôt que par promesse :
 *  `await` couvre les deux, une promesse déjà résolue restant une promesse. */
export async function demanderNotifications(): Promise<EtatNotifications> {
  if (etatNotifications() === 'unsupported') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    /* Certains contextes (iframe, origine non sécurisée) lèvent au lieu de
       refuser. Pour l'utilisateur, c'est la même chose : ça ne marche pas. */
    return 'denied';
  }
}

/** Envoie une notification. Rend `false` si rien n'a pu être affiché — c'est
 *  ce que l'appelant doit savoir pour ne pas prétendre avoir prévenu. */
export function notifier(titre: string, corps: string, tag: string): boolean {
  if (etatNotifications() !== 'granted') return false;
  try {
    /* `tag` dédoublonne : deux onglets ouverts, ou un rappel réarmé, ne
       produisent qu'une seule notification à l'écran. */
    new Notification(titre, {
      ...(corps ? { body: corps } : {}),
      tag,
      icon: '/icons/icon-192.png',
    });
    return true;
  } catch {
    return false;
  }
}
