'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

/* Titre de vue : le nom de l'écran et sa ligne de sous-titre, plus la zone
   d'actions de droite. Les onze vues le partagent — un titre écrit onze fois
   finit par diverger onze fois. Le titre vient TOUJOURS d'une clé : passé en
   chaîne, il resterait français quelle que soit la langue (D6). */

export function ViewHeader({
  titleKey,
  subKey,
  actions,
}: {
  titleKey: string;
  subKey?: string;
  actions?: ReactNode;
}) {
  const t = useTranslations('app');

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="m-0 text-[26px] tracking-tight md:text-[30px]">{t(titleKey)}</h1>
        {subKey ? (
          <p className="mt-1 mb-0 text-[12.5px]" style={{ color: 'var(--mut)' }}>
            {t(subKey)}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
