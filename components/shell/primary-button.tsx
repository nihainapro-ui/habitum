'use client';

import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { ENCRE_SUR_TEINTE } from '@/components/ui/encre';

/* Bouton d'action principale — dégradé accent, comme « + Nouveau » du
   prototype. Le texte est noir sur dégradé clair : c'est le seul endroit du
   produit où la couleur de texte ne vient pas d'un jeton, parce que le fond
   n'en vient pas non plus. */

export function PrimaryButton({
  onClick,
  icon = true,
  children,
}: {
  onClick: () => void;
  icon?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-btn flex cursor-pointer items-center gap-2 border-0 px-4 py-2.5 text-[12px] font-bold"
      style={{
        background: 'linear-gradient(135deg, var(--acc), var(--acc2))',
        color: ENCRE_SUR_TEINTE,
      }}
    >
      {icon ? <Plus size={13} strokeWidth={2.4} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
