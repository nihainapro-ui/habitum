'use client';

import * as RadixTabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

/* Onglets de l'éditeur.

   Radix pose `role="tablist"`, la navigation par flèches et le lien
   `tab` ↔ `tabpanel`. Une rangée de boutons ne fait rien de tout cela : au
   lecteur d'écran, ce serait quatre boutons sans rapport avec ce qui change
   en dessous. */

export interface Onglet {
  value: string;
  label: string;
  content: ReactNode;
}

export function EditorTabs({
  onglets,
  label,
  defaultValue,
}: {
  onglets: Onglet[];
  label: string;
  defaultValue?: string;
}) {
  return (
    <RadixTabs.Root
      defaultValue={defaultValue ?? onglets[0]?.value}
      className="flex flex-col gap-4"
    >
      <RadixTabs.List
        aria-label={label}
        className="rounded-btn flex gap-0.5 border p-0.5"
        style={{ borderColor: 'var(--line)' }}
      >
        {onglets.map((o) => (
          <RadixTabs.Trigger
            key={o.value}
            value={o.value}
            className="rounded-btn-sm flex-1 cursor-pointer px-2 py-1.5 text-[11.5px] whitespace-nowrap text-[var(--mut)] data-[state=active]:bg-[var(--panel2)] data-[state=active]:text-[var(--txt)]"
          >
            {o.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>

      {onglets.map((o) => (
        <RadixTabs.Content
          key={o.value}
          value={o.value}
          className="flex flex-col gap-4 outline-none"
        >
          {o.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
