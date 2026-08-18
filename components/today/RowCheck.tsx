'use client';

import { Check } from 'lucide-react';
import { ENCRE_SUR_TEINTE } from '@/components/ui/encre';

/* Case à cocher d'une ligne.

   Un vrai `role="checkbox"` avec `aria-checked`, et non un `<div onClick>` :
   c'est ce qui la rend focusable, annonçable et actionnable à la barre
   d'espace. Le nom accessible est celui de l'entité — « case à cocher » huit
   fois de suite ne désigne rien. */

export function RowCheck({
  name,
  checked,
  disabled,
  onToggle,
  size = 26,
}: {
  name: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  size?: number;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={name}
      disabled={disabled}
      onClick={onToggle}
      className="rounded-btn-sm grid flex-none place-items-center border disabled:opacity-40"
      style={{
        width: size,
        height: size,
        borderColor: checked ? 'var(--ok)' : 'var(--line2)',
        background: checked ? 'var(--ok)' : 'transparent',
        color: checked ? ENCRE_SUR_TEINTE : 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background .2s ease, border-color .2s ease',
      }}
    >
      <Check size={size * 0.5} strokeWidth={3.2} aria-hidden="true" />
    </button>
  );
}
