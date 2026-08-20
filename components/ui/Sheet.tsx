'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

/* Tiroir latéral — plein écran sous 768 px.
   Construit sur Dialog : c'est la même sémantique (modale, piège de focus,
   Escape), seule la géométrie change. Deux implémentations divergeraient. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
}: {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  title: string;
  description?: string;
  trigger?: ReactNode;
  children: ReactNode;
}) {
  /* Spread CONDITIONNEL plutôt que `open={open}` — `exactOptionalPropertyTypes`
     (D23). Une prop déclarée `open?: boolean` signifie « absente, ou un
     booléen » : lui passer explicitement `undefined` n'est pas la même chose
     que ne pas la passer, et Radix distingue justement les deux — `undefined`
     bascule le composant en mode NON CONTRÔLÉ. Le spread rend cette
     distinction visible au lieu de la laisser au hasard. */
  return (
    <RadixDialog.Root
      {...(open === undefined ? {} : { open })}
      {...(onOpenChange === undefined ? {} : { onOpenChange })}
    >
      {trigger ? <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger> : null}
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(2,4,10,.62)' }}
        />
        <RadixDialog.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l p-5 md:w-[420px]"
          style={{ borderColor: 'var(--line2)', background: 'var(--bg2)' }}
        >
          <RadixDialog.Title className="m-0 mb-1 text-[15px] font-semibold">
            {title}
          </RadixDialog.Title>
          <RadixDialog.Description className="m-0 mb-4 text-[12px]" style={{ color: 'var(--mut)' }}>
            {description ?? ''}
          </RadixDialog.Description>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
