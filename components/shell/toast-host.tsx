'use client';

import { useTranslations } from 'next-intl';
import { Toast } from '@/components/ui';
import { useStore } from '@/lib/store';

/* Le seul point d'affichage des toasts.

   `withUndo` en posait depuis la phase 2 et RIEN ne les rendait : chaque
   suppression était donc irréversible en pratique, faute d'un bouton pour
   revenir en arrière. Le défaut ne se voyait pas tant qu'aucune vue n'offrait
   de suppression.

   Un seul toast à la fois — la tranche `ui` le garantit déjà : deux toasts
   empilés, c'est une annulation qu'on croit avoir et qu'on n'a pas. */

export function ToastHost() {
  const t = useTranslations();
  const toast = useStore((s) => s.ui.toast);
  const dismissToast = useStore((s) => s.dismissToast);

  if (!toast) return null;

  /* La clé porte l'action, le libellé porte le NOM de l'entité — contenu
     utilisateur, jamais traduit. Les deux sont composés ici, jamais dans une
     tranche du store. */
  const message = toast.label ? `${t(toast.messageKey)} · ${toast.label}` : t(toast.messageKey);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6">
      <div className="pointer-events-auto w-full max-w-[440px]">
        <Toast
          message={message}
          actionLabel={toast.undo ? t('app.undo') : undefined}
          onAction={toast.undo ? () => void toast.undo?.() : undefined}
          onDismiss={dismissToast}
          dismissLabel={t('app.close')}
        />
      </div>
    </div>
  );
}
