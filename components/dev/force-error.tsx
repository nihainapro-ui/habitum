'use client';

/* Trappe de recette — tâche 5.1.

   Un écran de reprise qu'on ne sait pas déclencher est un écran qu'on ne teste
   pas, et donc un écran dont on ne sait pas s'il fonctionne. `?forceError=1`
   fait tomber la VUE (frontière `app/error.tsx`), `?forceError=global` fait
   tomber la COQUE (frontière `app/global-error.tsx`).

   ÉCART ASSUMÉ AU PLAN, qui voulait la trappe « active hors production
   seulement ». La recette tourne sur le BUILD DE PRODUCTION — c'est une règle
   du dépôt, posée en 0.12 : on teste ce qui sera déployé. Une trappe désactivée
   en production ne serait donc jamais éprouvée, et le critère « aucun écran
   blanc » deviendrait invérifiable. Même raisonnement que pour `/dev/ui`, gardé
   servi pour la même raison (`next.config.mjs`).

   Ce qu'elle coûte réellement : un paramètre d'URL qui fait échouer le rendu de
   celui qui le tape. Aucune donnée n'est touchée, aucun privilège n'est ouvert,
   aucun tiers ne peut l'imposer à un autre utilisateur. */

export type PorteeErreur = 'page' | 'shell';

export function ForceError({ scope }: { scope: PorteeErreur }) {
  if (typeof window === 'undefined') return null;

  const demande = new URLSearchParams(window.location.search).get('forceError');
  if (scope === 'page' && demande === '1') {
    throw new Error('forceError=1 — erreur de rendu provoquée pour la recette');
  }
  if (scope === 'shell' && demande === 'global') {
    throw new Error('forceError=global — erreur de coque provoquée pour la recette');
  }

  return null;
}
