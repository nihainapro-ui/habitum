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
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(v) => onChange(v as T)}
      aria-label={label}
      className="rounded-btn inline-flex border p-0.5"
      style={{ borderColor: 'var(--line)' }}
    >
      {options.map((o) => {
        const actif = o.value === value;
        return (
          <RadioGroup.Item
            key={o.value}
            value={o.value}
            className="rounded-btn-sm px-3 py-1.5 text-[12px] whitespace-nowrap"
            style={{
              background: actif ? 'var(--panel2)' : 'transparent',
              color: actif ? 'var(--txt)' : 'var(--mut)',
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
