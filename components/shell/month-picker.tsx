'use client';

import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui';

/* Le calendrier mensuel de l'en-tête — spec du 2026-09-02, lot C.

   IL N'AFFICHE AUCUNE PASTILLE D'ACTIVITÉ, et c'est une décision : les
   calculer demanderait l'état de chaque jour du mois à l'ouverture, alors que
   ce que l'utilisateur vient chercher ici est la NAVIGATION — « aller voir un
   autre jour, vite ». À réévaluer sur usage, pas avant.

   Le dialogue vient du système visuel (`components/ui/dialog.tsx`, Radix) :
   fermeture par Échap, piège de focus et retour du focus au déclencheur sont
   fournis, pas réécrits. */

export function MonthPicker({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useTranslations('app');

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('pickDay')}>
      <div />
    </Dialog>
  );
}
