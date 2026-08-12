'use client';

import type { ReactNode } from 'react';

/* Carte — rayon 11, bordure `--line`. Pas de verre dépoli : les cartes vivent
   en liste (04-DESIGN-TOKENS.md). Interactive, elle devient un vrai <button> :
   un <div onClick> n'est ni focusable ni annoncé. */
export function Card({
  interactive = false,
  tone = 'neutral',
  onClick,
  children,
}: {
  interactive?: boolean;
  tone?: 'neutral' | 'accent';
  onClick?: () => void;
  children: ReactNode;
}) {
  const style = {
    borderColor: tone === 'accent' ? 'var(--line2)' : 'var(--line)',
    background: 'var(--panel2)',
    transition: 'background .2s ease, border-color .2s ease',
  } as const;

  const classes = 'rounded-field border p-4 text-left w-full block';

  if (!interactive) {
    return (
      <div className={classes} style={style}>
        {children}
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${classes} cursor-pointer`} style={style}>
      {children}
    </button>
  );
}
