'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/shell/error-state';
import { logError } from '@/lib/logger';

/* Frontière d'erreur de l'application — tâche 5.1, lève D10.

   Elle couvre tout ce qui est rendu SOUS la coque : les onze vues. Ce qui casse
   dans la coque elle-même remonte à `global-error.tsx`, un cran plus haut.

   L'erreur est journalisée LOCALEMENT (décision E) avant d'être affichée : sans
   trace, un incident reproductible reste une anecdote. */

export default function ErreurApplication({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void logError('render', error);
  }, [error]);

  return <ErrorState reset={reset} digest={error.digest} />;
}
