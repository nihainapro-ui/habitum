'use client';

import { useEffect, useMemo, useState, type RefObject } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { addDays, dateKey, daysBetween, ecartMois, today } from '@/lib/domain';
import { useStore } from '@/lib/store';
import { FeuilleBasse } from '@/components/ui';
import { MoisMobile } from '@/components/calendar/mobile/MoisMobile';
import { estActif } from './nav-items';

/* Sélecteur de jour en FEUILLE BASSE — refonte mobile, PDF p. 9 : « Le
   sélecteur de date depuis Aujourd'hui / Tâches est cette même vue, en
   feuille basse. »

   « Observé — le sélecteur s'ouvrait en boîte de dialogue couvrant l'écran,
   sans indication de ce qui s'est passé chaque jour, avec un texte d'aide de
   deux lignes. » Ici : la grille de `MoisMobile`, traits d'état compris, et
   un appui choisit — la feuille se referme sur Aujourd'hui, réglée sur ce
   jour. Depuis Aujourd'hui on y reste ; depuis Tâches on y va, comme le
   faisait le dialogue du bureau (`month-picker.tsx`, inchangé au-dessus de
   768 px).

   Elle s'ouvre sur le MOIS DU JOUR AFFICHÉ, pas sur le mois courant, et
   l'oublie à chaque ouverture — mêmes deux règles que le dialogue. */
export function FeuilleDate({
  open,
  onOpenChange,
  retourFocus,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  retourFocus?: RefObject<HTMLElement | null> | undefined;
}) {
  const t = useTranslations('app');
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const day = useStore((s) => s.ui.day);
  const setDay = useStore((s) => s.setDay);

  const jourAffiche = useMemo(() => addDays(today(), day), [day]);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (open) setOffset(ecartMois(jourAffiche));
    /* Seule l'OUVERTURE recale le mois : pas un changement de jour en cours. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choisir = (date: Date) => {
    setDay(daysBetween(date, today()));
    onOpenChange(false);
    if (!estActif(pathname, '/app/today')) router.push('/app/today');
  };

  return (
    <FeuilleBasse
      open={open}
      onOpenChange={onOpenChange}
      title={t('pickDay')}
      description=""
      testId="feuille-date"
      retourFocus={retourFocus}
    >
      <MoisMobile
        offset={offset}
        onOffset={setOffset}
        selectedKey={dateKey(jourAffiche)}
        onSelect={choisir}
      />
    </FeuilleBasse>
  );
}
