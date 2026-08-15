import { DashView } from '@/components/dashboard/DashView';
import { ForceError } from '@/components/dev/force-error';

export default function Page() {
  return (
    <>
      {/* Trappe de recette de l'écran de reprise — voir `force-error.tsx`. */}
      <ForceError scope="page" />
      <DashView />
    </>
  );
}
