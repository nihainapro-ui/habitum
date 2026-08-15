import { Onboarding } from '@/components/onboarding/Onboarding';

/* Première ouverture — tâche 5.5.

   Route SÉPARÉE de `/app` : le parcours n'a ni rail, ni en-tête, ni barre
   basse (`app-shell.tsx` sert un cadre nu ici). Naviguer dans une application
   qu'on n'a pas encore configurée n'a pas de sens, et l'accueil ne doit pas
   ressembler à un écran de plus. */

export default function Page() {
  return <Onboarding />;
}
