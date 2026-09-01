/* Où joindre le serveur de synchronisation, et comment l'application se
 * comporte quand il n'y en a pas.
 *
 * LA VARIABLE EST OPTIONNELLE, ET C'EST STRUCTURANT. Habitum fonctionne
 * entièrement sans elle : un dépôt cloné, un `npm run dev`, et tout marche —
 * sauf la synchronisation, qui ne s'affiche alors même pas. C'est la seule
 * façon honnête de traiter une fonctionnalité facultative : ne pas montrer un
 * interrupteur qui ne peut rien allumer (même règle que `notif` dans
 * `SettingsView`).
 *
 * `NEXT_PUBLIC_` est nécessaire — l'appel part du navigateur, pas du serveur
 * Next. Rien de secret n'y transite : cette URL est publique par nature, et
 * le serveur qu'elle désigne ne voit que du chiffré (`crypto.ts`). Le seul
 * secret, le code d'appairage, ne quitte jamais l'appareil. */

/** Racine du serveur, sans barre finale. Chaîne vide = fonctionnalité absente.
 *
 *  Une FONCTION et non une constante : `process.env.NEXT_PUBLIC_*` est bien
 *  remplacé littéralement à la compilation côté navigateur, mais sous Vitest
 *  c'est un vrai `process.env` que les tests doivent pouvoir faire varier. Une
 *  constante évaluée à l'import se serait figée à la valeur qu'avait
 *  l'environnement au premier fichier de test touchant ce module — et l'ordre
 *  des fichiers aurait décidé du résultat. */
export function urlSync(): string {
  return (process.env.NEXT_PUBLIC_SYNC_URL ?? '').replace(/\/+$/, '');
}

/** Vrai si le dépôt a été configuré avec un serveur. */
export function syncDisponible(): boolean {
  return urlSync().length > 0;
}
