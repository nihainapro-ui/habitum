'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FeuilleBasse } from '@/components/ui';

/* Feuille de NOTE — refonte mobile, P3. Un champ, un bouton : la note d'une
   tâche (ou d'une habitude) depuis sa feuille de menu. Le brouillon est
   repris de la valeur à chaque ouverture : rouvrir la feuille ne doit pas
   montrer ce qu'on avait renoncé à enregistrer. */
export function FeuilleNote({
  open,
  onOpenChange,
  title,
  value,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  value: string;
  onSave: (valeur: string) => void;
}) {
  const t = useTranslations('app');
  const [brouillon, setBrouillon] = useState(value);
  useEffect(() => {
    if (open) setBrouillon(value);
  }, [open, value]);

  return (
    <FeuilleBasse
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={t('addNote')}
      testId="feuille-note"
    >
      <div className="flex flex-col gap-3">
        <textarea
          value={brouillon}
          onChange={(e) => setBrouillon(e.target.value)}
          placeholder={t('notePlaceholder')}
          aria-label={t('addNote')}
          className="rounded-field min-h-[120px] w-full resize-y border p-3 text-[14px] outline-none"
          style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--txt)' }}
        />
        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            onSave(brouillon);
          }}
          className="rounded-pill min-h-[48px] cursor-pointer border-0 px-4 text-[14px] font-semibold"
          style={{ background: 'var(--acc2)', color: 'var(--bg)' }}
        >
          {t('save')}
        </button>
      </div>
    </FeuilleBasse>
  );
}
