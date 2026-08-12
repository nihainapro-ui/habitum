'use client';

import { useTranslations } from 'next-intl';

/** Marqueur de portage : chaque route existe, aucune ne prétend être finie.
 *  À supprimer vue par vue au fil de la phase 4. */
export function PortStatus({
  view,
  titleKey,
  /* Une page qui porte DÉJÀ son titre reçoit le marqueur comme une section :
     deux `<h1>` sur un même écran cassent la structure du document — et la
     recette e2e, qui cherche « le » titre de la vue. C'était le cas de
     `/app/settings` depuis la phase 3. */
  asSection = false,
}: {
  view: string;
  titleKey: string;
  asSection?: boolean;
}) {
  const t = useTranslations('app');
  const Titre = asSection ? 'h2' : 'h1';
  /* Une référence de fichier n'est pas une chaîne à traduire : elle est
     construite hors du JSX pour que la règle jsx-no-literals reste stricte
     sans exception ad hoc. */
  const specification = `05-SPEC-VUES.md § ${view}`;

  return (
    <section className="flex max-w-[720px] flex-col gap-4">
      <Titre className="m-0 text-[34px] tracking-tight">{t(titleKey)}</Titre>
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
