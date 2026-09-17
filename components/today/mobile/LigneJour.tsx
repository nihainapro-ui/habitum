'use client';

import { memo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Play } from 'lucide-react';
import { nbJoursJournalises, subTaskCount, type DateKey, type EntreeJour } from '@/lib/domain';
import { useHabitStreak, useStore } from '@/lib/store';
import { useGlissement } from '@/lib/features/mobile/glissement';
import { BarreProgression, CategoryGlyph, COULEURS_CATEGORIE } from '@/components/ui';
import { RowCheck } from '../RowCheck';
import { SubList } from '../SubList';
import { FeuilleActions } from './FeuilleActions';
import { PasAPas } from './PasAPas';

/* Une ligne de la journée sur téléphone — refonte mobile, PDF p. 5 et 17 :
   « case 44 px · icône catégorie · nom · méta · action droite (pas à pas,
   ▷, ›) ».

   Une seule implémentation pour l'habitude et la tâche, comme `RowShell`
   sur bureau. Ce qui les distingue passe par les données de l'entrée :
   - action droite : pas à pas de 44 px pour une habitude à compteur, ▷ pour
     une habitude de DURÉE (elle se fait en session de Focus, qui la crédite),
     rien pour une case oui/non ou une tâche ;
   - pastille « Tâche » pour les tâches seulement — sur bureau, chaque ligne
     porte son type, ce qui ne dit rien quand tout est une habitude ;
   - glissement à gauche → Focus ; à droite → reporter, pour une tâche.

   Aucun calcul ici : `done`, `value`, `target` viennent de `dayAgenda`, la
   série d'un sélecteur, le nombre de jours d'historique du domaine. */

/** Types dont la valeur du jour se règle par − / +. `time` en est exclu : sa
 *  ligne lance Focus, et la saisie directe reste dans la feuille d'actions. */
const A_COMPTEUR = new Set(['count', 'total', 'limit', 'exact']);

interface Proprietes {
  entree: EntreeJour;
  date: DateKey;
  cochable: boolean;
}

/* Même comparaison par VALEURS que `HabitRow` / `TaskRow` (tâche 5.10) : les
   entrées sont reconstruites à chaque écriture du journal. */
const memesValeurs = (a: Proprietes, b: Proprietes): boolean => {
  if (a.date !== b.date || a.cochable !== b.cochable) return false;
  if (a.entree.kind !== b.entree.kind) return false;
  if (a.entree.kind === 'habit' && b.entree.kind === 'habit') {
    return (
      a.entree.done === b.entree.done &&
      a.entree.value === b.entree.value &&
      a.entree.target === b.entree.target &&
      a.entree.time === b.entree.time &&
      a.entree.habit === b.entree.habit
    );
  }
  if (a.entree.kind === 'task' && b.entree.kind === 'task') {
    return (
      a.entree.done === b.entree.done &&
      a.entree.date === b.entree.date &&
      a.entree.task === b.entree.task
    );
  }
  return false;
};

function Ligne({ entree, date, cochable }: Proprietes) {
  const t = useTranslations('app');
  const te = useTranslations('editor');
  const tc = useTranslations('cat');
  const router = useRouter();
  const [actionsOuvertes, setActionsOuvertes] = useState(false);

  const toggleHabit = useStore((s) => s.toggleHabitAnnulable);
  const bumpHabit = useStore((s) => s.bumpHabit);
  const setLogValue = useStore((s) => s.setLogValue);
  const skipHabit = useStore((s) => s.skipHabit);
  const deleteHabit = useStore((s) => s.deleteHabit);
  const saveHabitNote = useStore((s) => s.saveHabitNote);
  const toggleTaskOn = useStore((s) => s.toggleTaskOnAnnulable);
  const toggleSubTask = useStore((s) => s.toggleSubTask);
  const snoozeTask = useStore((s) => s.snoozeTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const updateTask = useStore((s) => s.updateTask);
  const openEditor = useStore((s) => s.openEditor);
  const setTimerTarget = useStore((s) => s.setTimerTarget);

  const habitId = entree.kind === 'habit' ? entree.id : null;
  const serie = useHabitStreak(habitId ?? '');
  const noteHabitude = useStore((s) =>
    habitId ? s.notes.find((n) => n.kind === 'habit' && n.habitId === habitId) : undefined,
  );
  const joursHistorique = useStore((s) => (habitId ? nbJoursJournalises(s.logIndex, habitId) : 0));

  const lancerFocus = () => {
    setTimerTarget({ kind: entree.kind === 'habit' ? 'h' : 't', id: entree.id });
    router.push('/app/timer');
  };

  const glissement = useGlissement({
    onGauche: cochable ? lancerFocus : undefined,
    onDroite: entree.kind === 'task' && cochable ? () => void snoozeTask(entree.id) : undefined,
  });

  const name = entree.kind === 'habit' ? entree.habit.name : entree.task.name;
  const category = entree.kind === 'habit' ? entree.habit.category : entree.task.category;
  const couleur = COULEURS_CATEGORIE[category];

  /* Ligne d'appoint : catégorie · heure · quantité · série · « Pas encore ».
     La couleur du glyphe ne porte jamais seule la catégorie : elle est ÉCRITE. */
  let meta: string[] = [];
  let ratio: number | null = null;
  let actionDroite: 'compteur' | 'focus' | null = null;
  let sous: { label: string; done: boolean }[] = [];
  let surSous: ((i: number) => void) | null = null;

  if (entree.kind === 'habit') {
    const h = entree.habit;
    const quantite = h.goal.kind !== 'check' && h.goal.kind !== 'list';
    meta = [
      tc(h.category),
      entree.time ?? '',
      /* La quantité n'est écrite ici que pour une DURÉE — le pas à pas des
         autres types la porte déjà, à droite, et l'unité y est lue par le
         lecteur d'écran. */
      quantite && h.goal.kind === 'time'
        ? `${entree.value}/${entree.target} ${h.goal.unit || 'min'}`.trim()
        : '',
      serie > 0 ? `🔥 ${serie}` : '',
      cochable ? '' : t('mobFuture'),
    ];
    ratio = h.goal.kind === 'check' ? null : entree.value / Math.max(1, entree.target);
    actionDroite = A_COMPTEUR.has(h.goal.kind)
      ? 'compteur'
      : h.goal.kind === 'time'
        ? 'focus'
        : null;
    if (h.goal.kind === 'list') {
      sous = h.subItems.map((s, i) => ({ label: s.label, done: i < entree.value }));
      surSous = (i) => void bumpHabit(h.id, date, (i < entree.value ? i : i + 1) - entree.value);
    }
  } else {
    const k = entree.task;
    const CLES_FREQ = { daily: 'repDaily', weekly: 'repWeek', monthly: 'repMonth' } as const;
    const prio = [t('low'), t('mid'), t('high')][k.priority - 1] ?? t('mid');
    const compte = subTaskCount(k);
    meta = [
      tc(k.category),
      k.time ?? '',
      t('mobPrio', { p: prio.toLowerCase() }),
      compte ? `${compte.done}/${compte.total}` : '',
      k.recurrence ? `⟳ ${te(CLES_FREQ[k.recurrence.freq])}` : '',
      cochable ? '' : t('mobFuture'),
    ];
    ratio = compte ? compte.done / compte.total : null;
    sous = k.subTasks;
    surSous = (i) => void toggleSubTask(k.id, i);
  }

  const basculer = () =>
    entree.kind === 'habit'
      ? void toggleHabit(entree.id, date)
      : void toggleTaskOn(entree.id, entree.date);

  return (
    <li
      data-row
      data-kind={entree.kind}
      className="flex flex-col border-b last:border-b-0"
      style={{
        borderBottomColor: 'var(--line)',
        opacity: cochable ? 1 : 0.45,
        ...glissement.proprietes.style,
      }}
      onPointerDown={glissement.proprietes.onPointerDown}
      onPointerMove={glissement.proprietes.onPointerMove}
      onPointerUp={glissement.proprietes.onPointerUp}
      onPointerCancel={glissement.proprietes.onPointerCancel}
      onClickCapture={glissement.proprietes.onClickCapture}
    >
      <div className="flex min-h-[64px] items-center gap-2.5 px-3 py-2">
        <RowCheck
          name={name}
          checked={entree.done}
          disabled={!cochable}
          onToggle={basculer}
          size={44}
          rond
        />
        <CategoryGlyph category={category} size={30} />

        <button
          type="button"
          onClick={() => setActionsOuvertes(true)}
          aria-haspopup="dialog"
          aria-expanded={actionsOuvertes}
          data-name
          className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 border-0 bg-transparent p-0 text-left"
          style={{ color: 'inherit', font: 'inherit' }}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="min-w-0 text-[14px] leading-snug font-medium"
              style={{
                color: entree.done ? 'var(--mut)' : 'var(--txt)',
                textDecoration: entree.done ? 'line-through' : 'none',
              }}
            >
              {name}
            </span>
            {entree.kind === 'task' ? (
              <span
                className="rounded-chip flex-none px-1.5 py-px text-[10.5px] font-semibold tracking-[0.04em] whitespace-nowrap"
                style={{ color: 'var(--txt2)', background: 'var(--panel2)' }}
              >
                {t('task')}
              </span>
            ) : null}
          </span>
          <span className="font-mono text-[10.5px] leading-snug" style={{ color: 'var(--mut)' }}>
            {meta.filter(Boolean).join(' · ')}
          </span>
          {ratio !== null ? <BarreProgression ratio={ratio} couleur={couleur} /> : null}
        </button>

        {entree.kind === 'habit' && actionDroite === 'compteur' ? (
          <PasAPas
            name={name}
            value={entree.value}
            target={entree.target}
            unit={entree.habit.goal.unit}
            step={entree.habit.goal.step}
            disabled={!cochable}
            onChange={(delta) => void bumpHabit(entree.id, date, delta)}
          />
        ) : null}

        {actionDroite === 'focus' ? (
          <button
            type="button"
            onClick={lancerFocus}
            disabled={!cochable}
            aria-label={t('mobLaunchFocus', { name })}
            className="rounded-pill grid h-11 w-11 flex-none cursor-pointer place-items-center border disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              borderColor: 'var(--line)',
              background: 'var(--panel2)',
              color: 'var(--acc2)',
            }}
          >
            <Play size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {sous.length && surSous ? (
        <SubList items={sous} disabled={!cochable} onToggle={surSous} indent={98} />
      ) : null}

      <FeuilleActions
        open={actionsOuvertes}
        onOpenChange={setActionsOuvertes}
        name={name}
        done={entree.done}
        value={entree.kind === 'habit' ? entree.value : undefined}
        deleteQuestion={
          entree.kind === 'habit'
            ? t('mobDelHabitAsk', { name, n: joursHistorique })
            : t('mobDelTaskAsk', { name })
        }
        deleteConsequence={entree.kind === 'habit' ? t('mobDelHabitD') : t('mobDelTaskD')}
        actions={
          entree.kind === 'habit'
            ? {
                onEdit: () => openEditor({ kind: 'habit', id: entree.id }),
                onComplete: basculer,
                onSetValue:
                  entree.habit.goal.kind === 'check' || entree.habit.goal.kind === 'list'
                    ? undefined
                    : (v) => void setLogValue(entree.id, date, v),
                onFocus: cochable ? lancerFocus : undefined,
                onSkip: cochable ? () => void skipHabit(entree.id, date) : undefined,
                onDelete: () => void deleteHabit(entree.id),
                note: noteHabitude?.body ?? '',
                onNote: (v) => void saveHabitNote(entree.id, v),
              }
            : {
                onEdit: () => openEditor({ kind: 'task', id: entree.id }),
                onComplete: basculer,
                onFocus: cochable ? lancerFocus : undefined,
                onSnooze: () => void snoozeTask(entree.id),
                onDelete: () => void deleteTask(entree.id),
                note: entree.task.note,
                onNote: (v) => void updateTask(entree.id, { note: v }),
              }
        }
      />
    </li>
  );
}

export const LigneJour = memo(Ligne, memesValeurs);
