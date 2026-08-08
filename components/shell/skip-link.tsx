'use client';

import { useTranslations } from 'next-intl';

/** Identifiant du conteneur principal — partagé par le lien d'évitement et par
 *  la coque, pour qu'ils ne puissent pas diverger. */
export const ID_CONTENU = 'contenu';

/* Premier élément focusable du document : au clavier, une tabulation depuis le
   haut de page doit permettre de SAUTER la navigation, pas de la traverser à
   chaque changement de vue. Invisible tant qu'il n'a pas le focus. */
export function SkipLink() {
  const t = useTranslations('app');

  return (
    <a
      href={`#${ID_CONTENU}`}
      className="sr-only rounded-lg px-4 py-2 text-sm focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      style={{ background: 'var(--bg2)', color: 'var(--txt)', outlineColor: 'var(--acc2)' }}
    >
      {t('skipToContent')}
    </a>
  );
}
