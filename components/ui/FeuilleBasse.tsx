'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

/* Feuille BASSE — refonte mobile (PDF p. 2, « feuille de choix », p. 9
   « feuille basse aux deux tiers », p. 17 « feuille de confirmation »).

   Construite sur Radix Dialog comme `Sheet` et `Dialog` : même sémantique
   (modale, piège de focus, Échap, retour du focus au déclencheur), seule la
   géométrie change — ancrée en bas, coins hauts arrondis à 22 px, et elle
   s'écarte de la poignée d'accueil par la zone sûre. Sur bureau elle reste
   utilisable, simplement centrée et bornée en largeur : une feuille qui
   n'existerait que sous 768 px obligerait chaque appelant à choisir un autre
   composant au-dessus.

   `titre` est OBLIGATOIRE et visible : une feuille sans nom est un panneau
   dont un lecteur d'écran ne dit rien. `description` alimente `aria-describedby`
   — Radix avertit sinon, à raison. */
export function FeuilleBasse({
  open,
  onOpenChange,
  title,
  description,
  children,
  testId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  testId?: string | undefined;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(2,4,10,.62)' }}
        />
        <RadixDialog.Content
          data-testid={testId}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85vh] w-full max-w-[560px] flex-col rounded-t-[22px] border px-4 pt-3 outline-none"
          style={{
            borderColor: 'var(--line2)',
            background: 'var(--bg2)',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
            animation: 'sheetup .25s cubic-bezier(.2,.8,.2,1)',
          }}
        >
          {/* La poignée : décorative, elle dit « ceci se referme vers le bas ».
              Le geste lui-même n'est pas porté : Échap, l'appui hors de la
              feuille et le bouton de chaque appelant suffisent, et un glissement
              qui ne marcherait qu'au doigt n'aurait pas d'équivalent. */}
          <span
            aria-hidden="true"
            className="rounded-pill mx-auto mb-3 block h-1 w-9"
            style={{ background: 'var(--line2)' }}
          />
          <RadixDialog.Title className="m-0 mb-1 text-[17px] font-semibold">
            {title}
          </RadixDialog.Title>
          <RadixDialog.Description
            className="m-0 mb-3 text-[12.5px]"
            style={{ color: 'var(--mut)' }}
          >
            {description ?? ''}
          </RadixDialog.Description>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
