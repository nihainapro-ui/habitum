'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import type { DateKey, EntreeHabitude } from '@/lib/domain';
import { useHabitStreak, useStore } from '@/lib/store';
import { ActionDrawer } from './ActionDrawer';
import { CounterControl } from './CounterControl';
import { RowCheck } from './RowCheck';
import { RowShell } from './RowShell';
import { SubList } from './SubList';

/* Une habitude dans la file d'exécution du jour.

   Aucun calcul ici : `done`, `value` et `target` viennent de `dayAgenda`, la
   série d'un sélecteur. Le composant met en forme, il ne décide pas. */

/** Types à compteur : ceux dont la valeur du jour se règle par − / +. */
const QUANTITATIFS = new Set(['count', 'time', 'total', 'limit', 'exact']);

/* Comparaison par VALEURS, pas par référence — tâche 5.10.

   `useDayAgenda` reconstruit ses entrées à chaque écriture du journal : sans
   cette comparaison, cocher UNE habitude redessine les deux cents lignes de la
   file, et l'interaction passe de 60 à 180 ms sur un compte chargé. Ce qui
   compte tient en six champs ; `habit` est l'objet du store, stable tant que
   l'habitude n'a pas changé. */
const memesValeurs = (a: ProprietesLigne, b: ProprietesLigne): boolean =>
  a.date === b.date &&
  a.cochable === b.cochable &&
  a.entree.done === b.entree.done &&
  a.entree.value === b.entree.value &&
  a.entree.target === b.entree.target &&
  a.entree.time === b.entree.time &&
  a.entree.habit === b.entree.habit;

interface ProprietesLigne {
  entree: EntreeHabitude;
  date: DateKey;
  cochable: boolean;
}

function LigneHabitude({ entree, date, cochable }: ProprietesLigne) {
  const t = useTranslations('app');
  const tc = useTranslations('cat');
  const h = entree.habit;
  const serie = useHabitStreak(h.id);

  const toggleHabit = useStore((s) => s.toggleHabit);
  const bumpHabit = useStore((s) => s.bumpHabit);
  const skipHabit = useStore((s) => s.skipHabit);
  const deleteHabit = useStore((s) => s.deleteHabit);
  const saveHabitNote = useStore((s) => s.saveHabitNote);
  const openEditor = useStore((s) => s.openEditor);
  const note = useStore((s) => s.notes.find((n) => n.kind === 'habit' && n.habitId === h.id));

  const quantitatif = QUANTITATIFS.has(h.goal.kind);
  const liste = h.goal.kind === 'list';

  const meta = [
    tc(h.category),
    entree.time ? `⏰ ${entree.time}` : '',
    serie > 0 ? `🔥 ${serie}` : '',
    cochable ? '' : t('futureLocked'),
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <RowShell
      category={h.category}
      name={h.name}
      done={entree.done}
      tag={t('habit')}
      meta={meta || undefined}
      amount={
        h.goal.kind === 'check'
          ? undefined
          : `${entree.value}/${entree.target}${h.goal.unit ? ` ${h.goal.unit}` : ''}`
      }
      ratio={h.goal.kind === 'check' ? null : entree.value / Math.max(1, entree.target)}
      check={
        <RowCheck
          name={h.name}
          checked={entree.done}
          disabled={!cochable}
          onToggle={() => void toggleHabit(h.id, date)}
        />
      }
      controls={
        quantitatif ? (
          <CounterControl
            name={h.name}
            value={entree.value}
            step={h.goal.step}
            disabled={!cochable}
            onChange={(delta) => void bumpHabit(h.id, date, delta)}
          />
        ) : null
      }
      drawer={
        <ActionDrawer
          name={h.name}
          actions={{
            onComplete: () => void toggleHabit(h.id, date),
            onEdit: () => openEditor({ kind: 'habit', id: h.id }),
            onSkip: () => void skipHabit(h.id, date),
            onDelete: () => void deleteHabit(h.id),
            note: note?.body ?? '',
            onNote: (valeur) => void saveHabitNote(h.id, valeur),
          }}
        />
      }
      sub={
        liste ? (
          /* Le journal ne retient qu'un NOMBRE par jour, pas la liste des cases
             cochées : les `n` premiers sous-éléments sont donc affichés faits.
             Cocher le troisième d'une liste vierge vaut « trois de faits » —
             c'est la seule lecture cohérente avec ce que la base garde. */
          <SubList
            items={h.subItems.map((s, i) => ({ label: s.label, done: i < entree.value }))}
            disabled={!cochable}
            onToggle={(i) =>
              void bumpHabit(h.id, date, (i < entree.value ? i : i + 1) - entree.value)
            }
          />
        ) : null
      }
    />
  );
}

export const HabitRow = memo(LigneHabitude, memesValeurs);
