'use client';

import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

/* Infobulle — s'ouvre au survol ET au focus clavier. Radix s'en charge ;
   une infobulle qui n'apparaît qu'au survol n'existe pas pour qui navigue au
   clavier, et l'information qu'elle porte est alors perdue. */
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={200}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
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
