'use client';

import { useState, type ReactNode } from 'react';
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

export function MonthPicker({ trigger }: { trigger: ReactNode }) {
  const t = useTranslations('app');

  /* L'état vit ICI et non dans l'en-tête : le dialogue est le seul à en avoir
     besoin, et le garder auprès de son déclencheur laisse Radix apparier les
     deux — c'est ce qui rend le focus au bouton après Échap, sans une ligne de
     code de notre part. */
  const [ouvert, setOuvert] = useState(false);

  return (
    <Dialog
      open={ouvert}
      onOpenChange={setOuvert}
      title={t('pickDay')}
      description={t('pickDayHint')}
      trigger={trigger}
    >
      <div />
    </Dialog>
  );
}
