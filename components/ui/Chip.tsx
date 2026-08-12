import type { ReactNode } from 'react';

const TONS = {
  neutral: 'var(--mut)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  bad: 'var(--bad)',
} as const;

/* Puce — rayon 5. Le ton porte une couleur, jamais une INFORMATION à lui seul :
   un daltonien ne distingue pas `ok` de `bad`. Le texte de la puce doit
   suffire. */
export function Chip({
  tone = 'neutral',
  size = 'md',
  children,
}: {
  tone?: keyof typeof TONS;
  size?: 'sm' | 'md';
  children: ReactNode;
}) {
  return (
    <span
      className="rounded-chip inline-flex items-center gap-1 border whitespace-nowrap"
      style={{
        borderColor: 'var(--line)',
        color: TONS[tone],
        fontSize: size === 'sm' ? 10.5 : 11.5,
        padding: size === 'sm' ? '2px 6px' : '3px 8px',
      }}
    >
      {children}
    </span>
  );
}
