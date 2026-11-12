'use client';

import type { ReactNode } from 'react';
import { FeuilleBasse } from '@/components/ui';

/* Feuille de MENU — refonte mobile, P3.

   Le PDF demande un « appui long → menu » sur six écrans (Habitudes, Tâches,
   Objectifs, Work, Notes…). Le dépôt n'a pas d'appui long : c'est un geste
   caché, sans équivalent clavier, que rien n'annonce. Arbitrage du
   18/09/2026 (`docs/handoff/10-ECARTS-P3-MOBILE.md` § 1) : partout, l'appui
   sur le NOM ouvre une feuille basse qui liste les actions — le même chemin
   que la feuille d'actions d'Aujourd'hui (P1), en cibles de 52 px.

   Cette feuille ne porte que la LISTE. Ce qui suit un choix (confirmation,
   saisie, sous-panneau) appartient à l'appelant : il ferme la feuille, puis
   ouvre ce qu'il veut. */

export interface EntreeMenu {
  label: ReactNode;
  onSelect: () => void;
  /** Rouge, pour ce qui détruit — toujours avec le mot (PDF p. 17). */
  tone?: 'bad' | undefined;
}

export function FeuilleMenu({
  open,
  onOpenChange,
  title,
  description,
  items,
  testId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string | undefined;
  items: EntreeMenu[];
  testId?: string | undefined;
}) {
  const ligne =
    'rounded-field flex min-h-[52px] w-full cursor-pointer items-center border px-4 text-left text-[14px]';
  const style = { borderColor: 'var(--line)', background: 'var(--panel2)', color: 'var(--txt)' };

  return (
    <FeuilleBasse
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      testId={testId ?? 'feuille-menu'}
    >
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {items.map((entree, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                entree.onSelect();
              }}
              className={ligne}
              style={entree.tone === 'bad' ? { ...style, color: 'var(--bad)' } : style}
            >
              {entree.label}
            </button>
          </li>
        ))}
      </ul>
    </FeuilleBasse>
  );
}
