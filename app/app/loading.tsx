import { LoadingState } from '@/components/shell/loading-state';

/* Repli de chargement des ONZE vues — tâche 5.1.

   ÉCART ASSUMÉ AU PLAN : il en demandait un par vue. Un `loading.tsx` couvre
   son segment ET tous ses descendants ; posé sur `app/app/`, celui-ci vaut pour
   les onze routes. Onze copies du même fichier n'auraient rien couvert de plus
   et se seraient désynchronisées à la première retouche.

   Il sert rarement — les pages sont prérendues (D12) — mais il sert : sur une
   première visite lente, ou quand un composant de vue est chargé à la demande,
   c'est lui ou un écran blanc. */

export default function Chargement() {
  return <LoadingState />;
}
