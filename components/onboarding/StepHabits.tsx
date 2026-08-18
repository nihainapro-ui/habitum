'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Category, HabitGoalKind } from '@/lib/domain';
import { ENCRE_SUR_TEINTE } from '@/components/ui/encre';

/* Troisième écran : trois habitudes suggérées.

   AUCUNE N'EST PRÉ-COCHÉE, et le bouton principal fonctionne sans en cocher
   une seule. C'est la règle B4 vue depuis l'autre bout : ce que l'utilisateur
   n'a pas demandé n'entre pas dans ses données. Une case pré-cochée fabrique
   un historique qu'il n'a pas voulu et rend le premier chiffre douteux.

   Les trois suggestions sont volontairement banales et courtes. Ce n'est pas un
   catalogue — le catalogue existe, il est dans l'éditeur. */

export interface Suggestion {
  cle: string;
  category: Category;
  kind: HabitGoalKind;
  target: number;
  /** Clé du libellé de l'unité, ou vide pour une habitude « oui / non ». */
  unite: string;
}

export const SUGGESTIONS: Suggestion[] = [
  { cle: 'obH1', category: 'health', kind: 'count', target: 8, unite: 'obU1' },
  { cle: 'obH2', category: 'sport', kind: 'time', target: 20, unite: 'obU2' },
  { cle: 'obH3', category: 'study', kind: 'count', target: 10, unite: 'obU3' },
];

export function StepHabits({
  onFinish,
  onDemo,
}: {
  onFinish: (choisies: Suggestion[]) => void;
  onDemo: () => void;
}) {
  const t = useTranslations('app');
  const [cochees, setCochees] = useState<Set<string>>(new Set());

  const basculer = (cle: string) => {
    setCochees((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(cle)) suivant.delete(cle);
      else suivant.add(cle);
      return suivant;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {SUGGESTIONS.map((s) => (
          <li key={s.cle}>
            <label
              className="rounded-btn flex cursor-pointer items-center gap-3 border px-4 py-3 text-[13px]"
              style={{
                borderColor: cochees.has(s.cle) ? 'var(--acc2)' : 'var(--line)',
                background: cochees.has(s.cle) ? 'var(--panel2)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={cochees.has(s.cle)}
                onChange={() => basculer(s.cle)}
                className="cursor-pointer"
              />
              <span>{t(s.cle)}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-start gap-3">
        <button
          type="button"
          onClick={() => onFinish(SUGGESTIONS.filter((s) => cochees.has(s.cle)))}
          className="rounded-btn cursor-pointer border-0 px-5 py-2.5 text-[13px] font-bold"
          style={{
            background: 'linear-gradient(135deg, var(--acc), var(--acc2))',
            color: ENCRE_SUR_TEINTE,
          }}
        >
          {t('obStart')}
        </button>

        {/* La démonstration est un lien SECONDAIRE, jamais le chemin par
            défaut, et elle annonce ce qu'elle est avant d'être choisie. */}
        <button
          type="button"
          onClick={onDemo}
          className="cursor-pointer border-0 bg-transparent p-0 text-[12.5px] underline"
          style={{ color: 'var(--txt2)' }}
        >
          {t('obDemo')}
        </button>
      </div>
    </div>
  );
}
