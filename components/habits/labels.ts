'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { addDays, dailyTarget, startOfWeek, today, type Habit } from '@/lib/domain';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';

/* Mise en forme des libellés d'une habitude.

   Ce n'est PAS du calcul : rien ici ne décide de ce qui est fait, planifié ou
   réussi — tout cela vient de `lib/domain`. Il ne s'agit que de choisir des
   mots, ce qui suppose une langue, donc un composant. */

export function useHabitLabels() {
  const t = useTranslations('app');
  const { locale } = useLocaleSwitcher();

  /* Noms de jours dans l'ordre du domaine : 0 = lundi. On les prend d'une
     semaine réelle plutôt que d'une liste écrite à la main — sept libellés
     recopiés, ce sont sept libellés à retraduire. */
  const nomsJours = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const lundi = startOfWeek(today(), 'mon');
    return Array.from({ length: 7 }, (_, i) => format.format(addDays(lundi, i)));
  }, [locale]);

  return {
    /** « Quotidiennement », « Lun · Mer · Dim », « Tous les 3 jours »… */
    frequence(h: Habit): string {
      if (h.mode === 'every') return t('freqEvery', { n: Math.max(1, h.interval ?? 2) });
      if (h.mode === 'week') return t('freqWeek', { n: Math.max(1, h.goal.target || 1) });
      if (h.mode === 'month') return t('freqMonth');
      const jours = h.days ?? [];
      if (jours.length >= 7) return t('freqDaily');
      return [...jours]
        .sort((a, b) => a - b)
        .map((d) => nomsJours[d] ?? '')
        .filter(Boolean)
        .join(' · ');
    },

    /** « 8 verres », « max 2 cafés », « 5 éléments ». Vide pour un oui/non :
     *  « 1 » ne dit rien de plus que la case elle-même. */
    objectif(h: Habit): string {
      const unite = h.goal.unit ? ` ${h.goal.unit}` : '';
      switch (h.goal.kind) {
        case 'check':
          return '';
        case 'list':
          return t('goalItems', { n: h.subItems.length });
        case 'limit':
          return t('goalMax', { n: h.goal.target, unit: h.goal.unit });
        default:
          return `${dailyTarget(h)}${unite}`;
      }
    },
  };
}
