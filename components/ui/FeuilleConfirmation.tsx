'use client';

import { FeuilleBasse } from './FeuilleBasse';

/* Feuille de confirmation — PDF p. 17 : « titre en question, conséquence
   chiffrée, [Action destructive] [Garder] ».

   Le titre EST la question (« Supprimer « Lire » et 84 jours d'historique ? »)
   et la conséquence est dite en toutes lettres par l'appelant : ce composant
   ne sait pas ce qu'il confirme, il ne fait que tenir l'ordre des deux
   boutons — le destructif à gauche, rouge, avec un MOT ; « Garder » à droite,
   neutre — et refuser qu'un bouton rouge soit le seul indice. */
export function FeuilleConfirmation({
  open,
  onOpenChange,
  question,
  consequence,
  actionLabel,
  keepLabel,
  onConfirm,
  destructive = true,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  question: string;
  consequence?: string | undefined;
  actionLabel: string;
  keepLabel: string;
  onConfirm: () => void;
  /** Faux pour une confirmation non destructive (« Abandonner ? ») : le
   *  bouton d'action garde l'accent au lieu du rouge. */
  destructive?: boolean;
}) {
  return (
    <FeuilleBasse
      open={open}
      onOpenChange={onOpenChange}
      title={question}
      description={consequence}
      testId="feuille-confirmation"
    >
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-pill min-h-[48px] flex-1 cursor-pointer border px-4 text-[14px] font-semibold"
          style={
            destructive
              ? { borderColor: 'var(--bad)', color: 'var(--bad)', background: 'transparent' }
              : { borderColor: 'var(--acc2)', color: 'var(--acc2)', background: 'transparent' }
          }
        >
          {actionLabel}
        </button>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-pill min-h-[48px] flex-1 cursor-pointer border px-4 text-[14px]"
          style={{ borderColor: 'var(--line)', color: 'var(--txt)', background: 'var(--panel2)' }}
        >
          {keepLabel}
        </button>
      </div>
    </FeuilleBasse>
  );
}
