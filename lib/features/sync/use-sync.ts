'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';

/* QUAND on synchronise. Le « comment » est dans `lib/sync`, le « quoi » dans la
   tranche de store ; il ne reste ici que le calendrier.

   TROIS DÉCLENCHEURS, ET PAS DE MINUTERIE.

   1. **Au montage**, une fois l'appairage connu. C'est le cas qui compte : on
      ouvre l'application sur le téléphone après avoir travaillé sur
      l'ordinateur.
   2. **Au changement de visibilité**, dans les deux sens. En revenant : un
      onglet laissé ouvert trois jours n'a rien manqué s'il se remet à jour.
      En partant : ce qu'on vient de saisir s'en va tout de suite.
   3. **Au retour du réseau** (`online`). C'est l'échec le plus fréquent —
      métro, ascenseur, avion — et le seul qui se répare tout seul.

   POURQUOI PAS D'INTERVALLE. Un `setInterval` ferait des requêtes pour un
   onglet que personne ne regarde, et le palier gratuit se paie en requêtes,
   pas en octets. Les trois événements ci-dessus couvrent tout ce qu'un
   utilisateur perçoit ; le bouton « Synchroniser maintenant » couvre le reste.

   Aucune garde `enCours` ici : elle est dans la tranche, où elle protège
   TOUTES les sources d'appel — y compris le bouton — plutôt que cette seule. */

export function useSync(): void {
  const actif = useStore((s) => s.sync.actif);
  const disponible = useStore((s) => s.sync.disponible);

  useEffect(() => {
    if (!disponible || !actif) return;

    /* `getState()` plutôt que la valeur capturée : l'action est stable, mais la
       lire au moment de l'appel évite de réarmer les écouteurs à chaque rendu
       du store. */
    const lancer = () => void useStore.getState().synchroniserMaintenant();

    lancer();

    /* DANS LES DEUX SENS — 12 novembre 2026. Ne synchroniser qu'au retour
       laissait sur le téléphone tout ce qu'on venait d'y saisir : on coche, on
       range l'appareil, et l'ordinateur n'en sait rien tant qu'on ne rouvre
       pas l'application sur le téléphone. En partant, on envoie. La requête
       peut être coupée par le système ; rien n'est perdu alors, le filigrane
       ne bouge qu'après un envoi complet. */
    const auReveil = () => lancer();
    document.addEventListener('visibilitychange', auReveil);
    window.addEventListener('online', lancer);
    return () => {
      document.removeEventListener('visibilitychange', auReveil);
      window.removeEventListener('online', lancer);
    };
  }, [actif, disponible]);
}
