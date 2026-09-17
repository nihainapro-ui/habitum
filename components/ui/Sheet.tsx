'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

/* Tiroir latéral — plein écran sous 768 px.
   Construit sur Dialog : c'est la même sémantique (modale, piège de focus,
   Escape), seule la géométrie change. Deux implémentations divergeraient.

   `enteteMasque` — refonte mobile (PDF p. 7) : l'éditeur d'habitude dessine
   sa propre barre Annuler / Titre / Enregistrer, en zone sûre. La feuille
   garde alors son titre et sa description POUR LE LECTEUR D'ÉCRAN (`sr-only`),
   et cède toute sa surface au contenu : sans garniture, sans en-tête visible.
   Radix exige un `Title` ; le masquer visuellement n'est pas le retirer. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
  enteteMasque = false,
}: {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  title: string;
  description?: string;
  trigger?: ReactNode;
  children: ReactNode;
  enteteMasque?: boolean;
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
          className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l md:w-[420px] ${enteteMasque ? 'p-0' : 'p-5'}`}
          style={{
            borderColor: 'var(--line2)',
            background: 'var(--bg2)',
            /* Encoche : la feuille occupe toute la hauteur, elle est donc la
               seule à devoir s'en écarter. Nul partout où il n'y en a pas —
               bureau compris, ce qui laisse le socle visuel inchangé. */
            ...(enteteMasque ? {} : { paddingTop: 'calc(20px + env(safe-area-inset-top))' }),
          }}
        >
          <RadixDialog.Title
            className={enteteMasque ? 'sr-only' : 'm-0 mb-1 text-[15px] font-semibold'}
          >
            {title}
          </RadixDialog.Title>
          <RadixDialog.Description
            className={enteteMasque ? 'sr-only' : 'm-0 mb-4 text-[12px]'}
            style={enteteMasque ? undefined : { color: 'var(--mut)' }}
          >
            {description ?? ''}
          </RadixDialog.Description>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
