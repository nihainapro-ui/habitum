'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

/* Modale — Radix fournit le piège de focus, `Escape`, le retour du focus au
   déclencheur et `aria-modal`. Réécrire tout cela à la main, c'est réécrire
   les bogues d'accessibilité que Radix a déjà corrigés.

   `description` alimente `aria-describedby` : sans elle, Radix avertit en
   console, et un lecteur d'écran n'annonce que le titre. */
export function Dialog({
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
          className="rounded-panel fixed top-1/2 left-1/2 z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 border p-5"
          style={{ borderColor: 'var(--line2)', background: 'var(--bg2)' }}
        >
          <RadixDialog.Title className="m-0 mb-1 text-[15px] font-semibold">
            {title}
          </RadixDialog.Title>
          <RadixDialog.Description className="m-0 mb-4 text-[12px]" style={{ color: 'var(--mut)' }}>
            {description ?? ''}
          </RadixDialog.Description>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
