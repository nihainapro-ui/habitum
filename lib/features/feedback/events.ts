import type { TimerMode, TimerPhase } from '@/lib/domain';

/* Fin de phase du minuteur — le fait, et rien que le fait.

   Pourquoi un événement plutôt qu'un appel direct : la transition est constatée
   dans la tranche du minuteur, au millième près, mais ce sont les libellés
   traduits et les réglages de l'utilisateur qui décident de ce qu'on en fait.
   La tranche annonce ; la coque écoute et traduit. Personne ne fait le travail
   de l'autre.

   C'est aussi ce qui rend le signal EXACT : constater la fin depuis la vue, en
   comparant la phase d'un rendu à l'autre, confondrait un changement de mode
   avec une fin de concentration, et raterait la fin d'un compte à rebours —
   qui ne change pas de phase, il s'arrête. */

export interface FinDePhase {
  /** Phase qui vient de se TERMINER. */
  phase: TimerPhase;
  mode: TimerMode;
}

type Abonne = (e: FinDePhase) => void;

const abonnes = new Set<Abonne>();

/** S'abonne aux fins de phase. Rend la fonction de désabonnement. */
export function surFinDePhase(cb: Abonne): () => void {
  abonnes.add(cb);
  return () => {
    abonnes.delete(cb);
  };
}

/** Signale une fin de phase. Un abonné qui lève ne doit pas empêcher les
 *  autres d'être servis, ni faire échouer la transition du minuteur. */
export function emettreFinDePhase(e: FinDePhase): void {
  for (const a of [...abonnes]) {
    try {
      a(e);
    } catch {
      /* Un retour utilisateur raté ne casse pas le minuteur. */
    }
  }
}
