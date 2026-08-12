'use client';

import { useTranslations } from 'next-intl';
import { Minus, Plus } from 'lucide-react';

/* Compteur − / + des types quantitatifs (`count`, `time`, `total`, `limit`).

   Les deux boutons portent le NOM de l'entité dans leur libellé accessible :
   une page qui affiche huit habitudes affiche seize boutons, et « Augmenter »
   seize fois ne désigne rien. */

export function CounterControl({
  name,
  value,
  step,
  disabled,
  onChange,
}: {
  name: string;
  value: number;
  step: number;
  disabled?: boolean;
  onChange: (delta: number) => void;
}) {
  const t = useTranslations('app');
  const pas = Math.max(1, step || 1);

  const bouton =
    'grid h-6 w-6 place-items-center rounded-btn-sm border flex-none disabled:opacity-40';

  return (
    <div className="flex flex-none items-center gap-1.5">
      <button
        type="button"
        disabled={disabled || value <= 0}
        onClick={() => onChange(-pas)}
        aria-label={`${t('decr')} : ${name}`}
        className={bouton}
        style={{ borderColor: 'var(--line)', color: 'var(--txt2)', cursor: 'pointer' }}
      >
        <Minus size={12} aria-hidden="true" />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(pas)}
        aria-label={`${t('incr')} : ${name}`}
        className={bouton}
        style={{ borderColor: 'var(--line)', color: 'var(--txt2)', cursor: 'pointer' }}
      >
        <Plus size={12} aria-hidden="true" />
      </button>
    </div>
  );
}
