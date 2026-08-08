'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useStore } from '@/lib/store';
import { itemActif } from './nav-items';

/* Région annoncée.

   Une navigation côté client ne recharge pas la page : un lecteur d'écran n'a
   donc RIEN qui lui dise que la vue a changé. Cette région le dit — et porte
   ensuite les toasts, qui sont l'autre chose qu'un utilisateur non voyant ne
   verrait jamais.

   `polite` et non `assertive` : on informe, on n'interrompt pas. */

export function LiveRegion() {
  const t = useTranslations();
  const pathname = usePathname();
  const toast = useStore((s) => s.ui.toast);

  const item = itemActif(pathname);
  const vue = item ? t(`app.${item.key}`) : '';
  const message = toast
    ? `${t(toast.messageKey, { name: toast.label })}`
    : vue
      ? `${t('system.srView')} ${vue}`
      : '';

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
