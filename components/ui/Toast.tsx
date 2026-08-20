'use client';

import type { ReactNode } from 'react';

/* Message éphémère, avec son bouton d'annulation.

   `role="status"` + `aria-live="polite"` : le toast est la seule trace d'une
   suppression. Sans région annoncée, un utilisateur non voyant supprime une
   habitude et n'apprend jamais qu'il pouvait revenir en arrière. */
export function Toast({
  message,
  actionLabel,
  onAction,
  onDismiss,
  dismissLabel,
}: {
  message: ReactNode;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  onDismiss?: (() => void) | undefined;
  dismissLabel: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-field flex items-center gap-3 border px-4 py-3"
      style={{ borderColor: 'var(--line2)', background: 'var(--bg2)' }}
    >
      <span className="min-w-0 flex-1 truncate text-[12.5px]">{message}</span>

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="rounded-btn-sm shrink-0 border px-2.5 py-1 text-[12px]"
          style={{ borderColor: 'var(--acc2)', color: 'var(--acc2)', cursor: 'pointer' }}
        >
          {actionLabel}
        </button>
      ) : null}

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="rounded-btn-sm shrink-0 px-1.5 py-1 text-[12px]"
          style={{ color: 'var(--mut)', cursor: 'pointer' }}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
