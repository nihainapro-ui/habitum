'use client';

import { useTranslations } from 'next-intl';
import { RowCheck } from './RowCheck';

/* Sous-liste dépliable — sous-tâches d'une tâche, sous-éléments d'une
   habitude de type `list`. */

export interface SousElement {
  label: string;
  done: boolean;
}

export function SubList({
  items,
  disabled,
  onToggle,
}: {
  items: readonly SousElement[];
  disabled?: boolean;
  onToggle: (index: number) => void;
}) {
  const t = useTranslations('app');
  if (items.length === 0) return null;

  return (
    <ul
      className="m-0 flex list-none flex-col gap-2 border-t p-0 pt-2.5 pl-[38px]"
      style={{ borderColor: 'var(--line)' }}
      aria-label={t('toggleSub')}
    >
      {items.map((s, i) => (
        <li key={`${s.label}-${i}`} className="flex items-center gap-2.5">
          <RowCheck
            size={18}
            name={s.label}
            checked={s.done}
            disabled={disabled}
            onToggle={() => onToggle(i)}
          />
          <span
            className="text-[12.5px]"
            style={{
              color: s.done ? 'var(--mut)' : 'var(--txt2)',
              textDecoration: s.done ? 'line-through' : 'none',
            }}
          >
            {s.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
