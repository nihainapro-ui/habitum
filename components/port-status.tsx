'use client';

import { useTranslations } from 'next-intl';

/** Marqueur de portage : chaque route existe, aucune ne prétend être finie.
 *  À supprimer vue par vue au fil de la phase 4. */
export function PortStatus({ view, titleKey }: { view: string; titleKey: string }) {
  const t = useTranslations('app');
  /* Une référence de fichier n'est pas une chaîne à traduire : elle est
     construite hors du JSX pour que la règle jsx-no-literals reste stricte
     sans exception ad hoc. */
  const specification = `05-SPEC-VUES.md § ${view}`;

  return (
    <section className="flex max-w-[720px] flex-col gap-4">
      <h1 className="m-0 text-[34px] tracking-tight">{t(titleKey)}</h1>
      <p className="m-0 text-[13px] leading-relaxed" style={{ color: 'var(--mut)' }}>
        {t('portBody')}
      </p>
      <div className="flex flex-wrap gap-3 text-[13px]">
        <a href="/prototype/Habitum.dc.html">{t('portOpen')}</a>
        <span style={{ color: 'var(--mut)' }}>
          {t('portSpec')}
          {': '}
          {specification}
        </span>
      </div>
    </section>
  );
}
