'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ENCRE_SUR_TEINTE } from '@/components/ui/encre';

/* Pied de l'éditeur : annuler, enregistrer, et supprimer EN DEUX TEMPS.

   La suppression est annulable par le toast (`withUndo`), mais une confirmation
   reste due : l'annulation dure six secondes, l'historique d'une habitude dure
   des mois. Deux protections valent mieux qu'une seule qui expire. */

export function PiedEditeur({
  onCancel,
  onDelete,
}: {
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const t = useTranslations('editor');
  const [confirme, setConfirme] = useState(false);

  return (
    <div className="flex flex-col gap-3 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
      {onDelete ? (
        confirme ? (
          <div className="flex flex-col gap-2">
            <span className="text-[12px]" style={{ color: 'var(--bad)' }}>
              {t('delAsk')}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onDelete}
                className="rounded-btn cursor-pointer border px-3 py-2 text-[12px]"
                style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}
              >
                {t('delYes')}
              </button>
              <button
                type="button"
                onClick={() => setConfirme(false)}
                className="rounded-btn cursor-pointer border px-3 py-2 text-[12px]"
                style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
              >
                {t('keep')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirme(true)}
            className="cursor-pointer self-start border-0 bg-transparent p-0 text-[12px] underline"
            style={{ color: 'var(--bad)' }}
          >
            {t('del')}
          </button>
        )
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-btn flex-1 cursor-pointer border-0 px-4 py-2.5 text-[12.5px] font-bold"
          style={{
            background: 'linear-gradient(135deg, var(--acc), var(--acc2))',
            color: ENCRE_SUR_TEINTE,
          }}
        >
          {t('save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-btn cursor-pointer border px-4 py-2.5 text-[12.5px]"
          style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}
