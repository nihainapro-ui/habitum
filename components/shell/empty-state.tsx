'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

/* État vide, partagé par les onze vues.

   D1 : chaque vue en a un. Une liste vide sans explication laisse croire à un
   défaut de chargement ; le texte dit ce qui manque ET comment le créer. */

export function EmptyState({
  titleKey,
  bodyKey,
  action,
}: {
  titleKey: string;
  bodyKey: string;
  action?: ReactNode;
}) {
  const t = useTranslations();

  return (
    <section
      data-testid="empty-state"
      className="rounded-panel flex flex-col items-center gap-2.5 border px-8 py-14 text-center"
      style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
    >
      <span className="text-[15px] font-semibold">{t(titleKey)}</span>
      <span className="max-w-[46ch] text-[12.5px] leading-relaxed" style={{ color: 'var(--mut)' }}>
        {t(bodyKey)}
      </span>
      {action ? <div className="mt-1.5">{action}</div> : null}
    </section>
  );
}
