'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';

/* QUAND on synchronise. Le « comment » est dans `lib/sync`, le « quoi » dans la
   tranche de store ; il ne reste ici que le calendrier.

   TROIS DÉCLENCHEURS, ET PAS DE MINUTERIE.

   1. **Au montage**, une fois l'appairage connu. C'est le cas qui compte : on
      ouvre l'application sur le téléphone après avoir travaillé sur
      l'ordinateur.
   2. **Au retour de l'onglet** (`visibilitychange`). Un onglet laissé ouvert
      trois jours n'a rien manqué s'il se remet à jour en revenant au premier
      plan.
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

    const auReveil = () => {
      if (document.visibilityState === 'visible') lancer();
    };
    document.addEventListener('visibilitychange', auReveil);
    window.addEventListener('online', lancer);
    return () => {
      document.removeEventListener('visibilitychange', auReveil);
      window.removeEventListener('online', lancer);
    };
  }, [actif, disponible]);
}
