'use client';

import { useId, type ReactNode } from 'react';

/* Champ — rayon 11, libellé LIÉ à son contrôle.
   `aria-describedby` porte l'aide et l'erreur : sans lui, un lecteur d'écran
   annonce le libellé et se tait sur la raison du refus. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode | undefined;
  error?: ReactNode | undefined;
  children: (props: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }) => ReactNode;
}) {
  const id = useId();
  const idAide = `${id}-aide`;
  const idErreur = `${id}-erreur`;
  const decrit = [hint ? idAide : null, error ? idErreur : null].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12px]" style={{ color: 'var(--txt2)' }}>
        {label}
      </label>

      {children({
        id,
        ...(decrit ? { 'aria-describedby': decrit } : {}),
        ...(error ? { 'aria-invalid': true } : {}),
      })}

      {hint ? (
        <span id={idAide} className="text-[11px]" style={{ color: 'var(--mut)' }}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={idErreur} className="text-[11px]" style={{ color: 'var(--bad)' }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

/** Style commun des contrôles de saisie : 13px, padding 10/12, rayon 11. */
export const champStyle = {
  borderColor: 'var(--line)',
  background: 'transparent',
  color: 'var(--txt)',
  fontSize: 13,
  padding: '10px 12px',
} as const;
