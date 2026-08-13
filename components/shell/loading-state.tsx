'use client';

import { useTranslations } from 'next-intl';

/* État de chargement partagé — tâche 5.1.

   Il annonce le chargement AUX LECTEURS D'ÉCRAN (`role="status"`) autant qu'à
   l'œil : une zone qui se remplit sans un mot laisse l'utilisateur non-voyant
   devant un écran silencieux.

   `aria-busy` porte l'information sur le conteneur, l'animation reste
   décorative — et s'efface si le système demande moins de mouvement. */

export function LoadingState() {
  const ts = useTranslations('system');

  return (
    <div
      data-testid="loading-state"
      role="status"
      aria-busy="true"
      className="flex flex-col gap-3 p-6"
    >
      <span className="sr-only">{ts('loading')}</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className="rounded-panel motion-safe:animate-pulse"
          style={{ height: i === 0 ? 96 : 64, background: 'var(--panel)', opacity: 1 - i * 0.2 }}
        />
      ))}
    </div>
  );
}
