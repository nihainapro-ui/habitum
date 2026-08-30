'use client';

import * as RadixTooltip from '@radix-ui/react-tooltip';
import { useRef, useState, type FocusEvent, type ReactNode } from 'react';

/* Infobulle — s'ouvre au survol ET au focus clavier. Une infobulle qui
 * n'apparaît qu'au survol n'existe pas pour qui navigue au clavier, et
 * l'information qu'elle porte est alors perdue.
 *
 * POURQUOI L'ÉTAT EST CONTRÔLÉ ICI, et pas laissé à Radix. Ce paragraphe est
 * long parce que le symptôme ne ressemblait en rien à sa cause.
 *
 * Au portage de la coque (rail d'icônes, en-tête complet), l'infobulle a cessé
 * de s'ouvrir quand le focus arrivait EN TABULANT DEPUIS LE HAUT DE LA PAGE.
 * Elle s'ouvrait toujours au survol, et toujours au clavier si la tabulation
 * partait de `<main>`. Cinq exécutions sur cinq, jamais une réussite.
 *
 * Écarté par la mesure, dans l'ordre : le nombre de tabulations (identique
 * depuis `<main>`, qui marche), la vitesse de tabulation, l'attente de
 * l'hydratation, le remplacement du nœud DOM, `:focus-visible` (vrai au moment
 * de l'événement), et l'événement lui-même — un `onFocus` posé à la main ici
 * partait bien.
 *
 * La trace a fini par montrer la vérité : `onOpenChange(true)` PUIS
 * `onOpenChange(false)`, dans la foulée, sans aucun `blur`. Radix ouvre puis
 * referme lui-même : sa couche de fermeture prend le focus du déclencheur —
 * qui vit hors du portail du contenu — pour un focus « à l'extérieur ».
 * `onFocusOutside` n'est pas exposé sur `Tooltip.Content` : on ne peut pas le
 * lui dire.
 *
 * D'où la règle, écrite ici plutôt que subie : **tant que le déclencheur garde
 * le focus clavier, l'infobulle reste ouverte.** C'est exactement le contrat
 * qu'annonçait déjà le commentaire d'origine ; il est maintenant tenu par du
 * code qu'on peut lire. Le survol et la fermeture ordinaire restent à Radix.
 *
 * `:focus-visible` est vérifié à l'ouverture pour conserver le comportement
 * voulu : un clic à la souris n'ouvre pas l'infobulle, l'utilisateur voit déjà
 * l'élément qu'il vient de viser. */
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  const declencheur = useRef<HTMLButtonElement>(null);

  return (
    <RadixTooltip.Provider delayDuration={200}>
      <RadixTooltip.Root
        open={ouvert}
        onOpenChange={(v) => {
          /* Le seul refus : une fermeture demandée alors que le déclencheur a
             toujours le focus clavier. Le `onBlur` ci-dessous, lui, ferme. */
          if (!v && declencheur.current?.matches(':focus-visible')) return;
          setOuvert(v);
        }}
      >
        <RadixTooltip.Trigger
          asChild
          ref={declencheur}
          onFocus={(e: FocusEvent<HTMLElement>) => {
            if (e.currentTarget.matches(':focus-visible')) setOuvert(true);
          }}
          onBlur={() => setOuvert(false)}
        >
          {children}
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            sideOffset={6}
            className="rounded-btn-sm z-50 border px-2 py-1 text-[11.5px]"
            style={{
              borderColor: 'var(--line2)',
              background: 'var(--bg2)',
              color: 'var(--txt)',
            }}
          >
            {label}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
