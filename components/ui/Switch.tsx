'use client';

import * as RadixSwitch from '@radix-ui/react-switch';
import type { ReactNode } from 'react';

/* Interrupteur — `role="switch"` fourni par Radix, donc annoncé « activé /
   désactivé » et pilotable à la barre d'espace sans code de notre part.

   `reason` n'est pas décoratif : la phase 5 exige qu'aucun interrupteur ne
   soit mort. Un interrupteur désactivé DOIT dire pourquoi (tâche 5.4). */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  reason,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  reason?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[13px]" style={{ color: 'var(--txt)' }}>
          {label}
        </span>
        {disabled && reason ? (
          <span className="text-[11px]" style={{ color: 'var(--mut)' }}>
            {reason}
          </span>
        ) : null}
      </span>

      <RadixSwitch.Root
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="rounded-pill relative shrink-0 border"
        style={{
          width: 38,
          height: 22,
          borderColor: checked ? 'var(--acc2)' : 'var(--line)',
          background: checked ? 'var(--acc2)' : 'transparent',
          opacity: disabled ? 0.45 : 1,
          transition: 'background .18s ease, border-color .18s ease',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <RadixSwitch.Thumb
          className="rounded-pill block"
          style={{
            width: 16,
            height: 16,
            background: checked ? 'var(--bg)' : 'var(--mut)',
            transform: `translateX(${checked ? 18 : 2}px)`,
            transition: 'transform .18s ease, background .18s ease',
          }}
        />
      </RadixSwitch.Root>
    </label>
  );
}
