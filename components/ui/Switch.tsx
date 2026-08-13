'use client';

import * as RadixSwitch from '@radix-ui/react-switch';
import { useId, type ReactNode } from 'react';

/* Interrupteur — `role="switch"` fourni par Radix, donc annoncé « activé /
   désactivé » et pilotable à la barre d'espace sans code de notre part.

   `reason` n'est pas décoratif : la phase 5 exige qu'aucun interrupteur ne
   soit mort. Un interrupteur désactivé DOIT dire pourquoi (tâche 5.4) — et le
   dire AUX LECTEURS D'ÉCRAN autant qu'à l'œil, d'où `aria-describedby`. Une
   justification qu'on ne peut que voir ne justifie rien pour qui n'y voit pas.

   `reason` s'affiche aussi sur un interrupteur ACTIF : c'est là que se disent
   les limites d'un réglage qui fonctionne — « seulement quand Habitum est
   ouvert » n'est pas une excuse, c'est le contrat. */
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
  const idRaison = useId();

  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[13px]" style={{ color: 'var(--txt)' }}>
          {label}
        </span>
        {reason ? (
          <span id={idRaison} data-reason className="text-[11px]" style={{ color: 'var(--mut)' }}>
            {reason}
          </span>
        ) : null}
      </span>

      <RadixSwitch.Root
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-describedby={reason ? idRaison : undefined}
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
