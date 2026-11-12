'use client';

import { useTranslations } from 'next-intl';
import { Minus, Plus } from 'lucide-react';

/* Pas à pas − / + de 44 px — refonte mobile, PDF p. 5 : « Observé — pas à
   pas −/+ de 28 px ; ici 44 px, alignés au compteur. » Le compteur est ENTRE
   les deux boutons, en chiffres à chasse fixe, pour que `8/20` ne bouge pas
   d'un pixel quand il passe à `9/20`.

   Les deux boutons portent le NOM de l'entité dans leur libellé accessible,
   comme `CounterControl` : « Augmenter » huit fois ne désigne rien. */

export function PasAPas({
  name,
  value,
  target,
  unit,
  step,
  disabled,
  onChange,
}: {
  name: string;
  value: number;
  target: number;
  unit: string;
  step: number;
  disabled?: boolean | undefined;
  onChange: (delta: number) => void;
}) {
  const t = useTranslations('app');
  const pas = Math.max(1, step || 1);
  /* Composés hors du JSX : `jsx-no-literals` interdit jusqu'aux gabarits. */
  const compteur = `${value}/${target}`;
  const unite = unit ? ` ${unit}` : '';
  const bouton =
    'grid h-11 w-11 flex-none cursor-pointer place-items-center rounded-pill border disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-none items-center gap-0.5" data-testid="pas-a-pas">
      <button
        type="button"
        disabled={disabled || value <= 0}
        onClick={() => onChange(-pas)}
        aria-label={`${t('decr')} : ${name}`}
        className={bouton}
        style={{ borderColor: 'var(--line)', color: 'var(--txt2)', background: 'var(--panel2)' }}
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      <span
        className="min-w-[38px] text-center font-mono text-[13px] whitespace-nowrap"
        style={{ color: 'var(--txt)' }}
      >
        {compteur}
        {unite ? <span className="sr-only">{unite}</span> : null}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(pas)}
        aria-label={`${t('incr')} : ${name}`}
        className={bouton}
        style={{ borderColor: 'var(--line)', color: 'var(--txt2)', background: 'var(--panel2)' }}
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
