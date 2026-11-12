'use client';

import * as RadioGroup from '@radix-ui/react-radio-group';
import type { ReactNode } from 'react';

/* Sélecteur segmenté — `role="radiogroup"` fourni par Radix : les flèches
   parcourent les options, ce qu'une rangée de <button> ne fait pas. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  fill = false,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  /** Pleine largeur, segments égaux de 44 px, en pastille — refonte mobile
   *  (PDF p. 17 : « segments » parmi les cibles de 44 px). Le bureau ne le
   *  passe jamais : sa forme est celle du socle visuel. */
  fill?: boolean;
}) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(v) => onChange(v as T)}
      aria-label={label}
      className={
        fill ? 'rounded-pill flex w-full border p-1' : 'rounded-btn inline-flex border p-0.5'
      }
      style={{ borderColor: 'var(--line)', background: fill ? 'var(--panel)' : undefined }}
    >
      {options.map((o) => {
        const actif = o.value === value;
        return (
          <RadioGroup.Item
            key={o.value}
            value={o.value}
            className={
              fill
                ? 'rounded-pill min-h-[44px] min-w-0 flex-1 px-2 text-[13px] whitespace-nowrap'
                : 'rounded-btn-sm px-3 py-1.5 text-[12px] whitespace-nowrap'
            }
            style={{
              background: actif ? (fill ? 'var(--bg2)' : 'var(--panel2)') : 'transparent',
              color: actif ? 'var(--txt)' : 'var(--mut)',
              fontWeight: fill && actif ? 600 : undefined,
              border: fill && actif ? '1px solid var(--line2)' : undefined,
              transition: 'background .2s ease, color .2s ease',
              cursor: 'pointer',
            }}
          >
            {o.label}
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
}
