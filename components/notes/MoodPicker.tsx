'use client';

import { useTranslations } from 'next-intl';

/* Humeur du jour, de 1 à 5.

   Cinq boutons radio, pas cinq émojis cliquables : l'état retenu doit être
   ANNONÇABLE. Le glyphe reste décoratif, le libellé porte la valeur. */

const GLYPHES = ['○', '◔', '◑', '◕', '●'];

export function MoodPicker({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const t = useTranslations('app');

  return (
    <div role="radiogroup" aria-label={t('mood')} className="flex items-center gap-2">
      {GLYPHES.map((glyphe, i) => {
        const n = i + 1;
        const actif = value === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={actif}
            aria-label={t('moodOf', { n })}
            onClick={() => onChange(n)}
            className="rounded-btn grid h-8 w-8 cursor-pointer place-items-center border text-[14px]"
            style={{
              borderColor: actif ? 'var(--acc2)' : 'var(--line)',
              background: actif ? 'var(--panel2)' : 'transparent',
              color: actif ? 'var(--acc2)' : 'var(--txt2)',
            }}
          >
            <span aria-hidden="true">{glyphe}</span>
          </button>
        );
      })}
    </div>
  );
}
