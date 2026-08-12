'use client';

import { useMemo } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  addDays,
  CATEGORIES,
  HABIT_GOAL_KINDS,
  startOfWeek,
  today,
  type Habit,
  type HabitGoalKind,
} from '@/lib/domain';
import { habitFormSchema, type HabitForm } from '@/lib/validation/habit.schema';
import { useStore } from '@/lib/store';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import { DayPicker, LigneListe, Select, TextArea, TextInput } from './fields';
import { EditorTabs } from './EditorTabs';
import { PiedEditeur } from './PiedEditeur';

/* Éditeur d'habitude — quatre onglets, 05-SPEC-VUES.md § 5.

   Le brouillon est ISOLÉ : `react-hook-form` tient son propre état, et rien
   n'est écrit tant que « Enregistrer » n'a pas été pressé. Fermer la feuille
   jette le brouillon — c'est ce qu'attend quiconque a déjà appuyé sur Échap.

   G8 — les sept types viennent de `HABIT_GOAL_KINDS`, jamais d'une liste
   recopiée : un `<select>` qui n'en proposerait que quatre reproduirait à
   l'interface le défaut qui a fait disparaître des habitudes à l'import. */

/** Libellés des sept types, dans l'espace `editor`. */
const CLES_TYPE: Record<HabitGoalKind, string> = {
  check: 'gCheck',
  count: 'gCount',
  time: 'gTime',
  total: 'gCount',
  list: 'gList',
  limit: 'gLimit',
  exact: 'gCount',
};

/** Les types dont la cible et l'unité ont un sens. */
const AVEC_CIBLE = new Set<HabitGoalKind>(['count', 'time', 'total', 'limit', 'exact']);

const versFormulaire = (h?: Habit): HabitForm => ({
  name: h?.name ?? '',
  category: h?.category ?? 'health',
  goalKind: h?.goal.kind ?? 'check',
  target: h?.goal.target ?? 1,
  step: h?.goal.step ?? 1,
  unit: h?.goal.unit ?? '',
  subItems: h?.subItems ?? [],
  mode: h?.mode ?? 'dow',
  days: h?.days ?? [0, 1, 2, 3, 4, 5, 6],
  interval: h?.interval ?? 2,
  start: h?.start ?? '',
  end: h?.end ?? '',
  reminders: h?.reminders ?? [],
  note: h?.note ?? '',
  archived: h?.archived ?? false,
});

export function HabitEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const t = useTranslations('editor');
  const ta = useTranslations('app');
  const tc = useTranslations('cat');
  const { locale } = useLocaleSwitcher();

  const habit = useStore((s) => (id ? s.habits.find((h) => h.id === id) : undefined));
  const createHabit = useStore((s) => s.createHabit);
  const updateHabit = useStore((s) => s.updateHabit);
  const deleteHabit = useStore((s) => s.deleteHabit);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<HabitForm>({
    resolver: zodResolver(habitFormSchema) as Resolver<HabitForm>,
    defaultValues: versFormulaire(habit),
    mode: 'onSubmit',
  });

  const v = useWatch({ control }) as HabitForm;

  const nomsJours = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const lundi = startOfWeek(today(), 'mon');
    return Array.from({ length: 7 }, (_, i) => format.format(addDays(lundi, i)));
  }, [locale]);

  const enregistrer = handleSubmit(async (valeurs) => {
    const entree = {
      name: valeurs.name,
      category: valeurs.category,
      goal: {
        kind: valeurs.goalKind,
        target: valeurs.target,
        step: valeurs.step,
        unit: valeurs.unit,
      },
      mode: valeurs.mode,
      days: valeurs.days,
      interval: valeurs.interval,
      subItems: valeurs.subItems,
      reminders: valeurs.reminders,
      start: valeurs.start || undefined,
      end: valeurs.end || undefined,
      note: valeurs.note,
      archived: valeurs.archived,
    };

    if (habit) await updateHabit(habit.id, entree);
    else await createHabit(entree);
    onClose();
  });

  /* Le message d'erreur d'un schéma zod est une CLÉ, pas une phrase : une
     phrase écrite dans le schéma resterait française dans les deux langues. */
  const messageErreur = (cle?: string): string | undefined =>
    cle ? t(`err.${cle}` as 'err.nameRequired') : undefined;

  const definition = (
    <>
      <TextInput
        label={t('fName')}
        value={v.name}
        onChange={(x) => setValue('name', x)}
        error={errors.name ? messageErreur(errors.name.message) : undefined}
      />
      <Select
        label={t('fCat')}
        value={v.category}
        onChange={(x) => setValue('category', x)}
        options={CATEGORIES.map((c) => ({ value: c, label: tc(c) }))}
      />
      <Select
        label={t('fGoal')}
        value={v.goalKind}
        onChange={(x) => setValue('goalKind', x)}
        options={HABIT_GOAL_KINDS.map((k) => ({ value: k, label: t(CLES_TYPE[k]) }))}
      />

      {AVEC_CIBLE.has(v.goalKind) ? (
        <div className="flex gap-3">
          <div className="flex-1">
            <TextInput
              label={t('fTarget')}
              type="number"
              value={String(v.target)}
              onChange={(x) => setValue('target', Number(x) || 0)}
              error={errors.target ? messageErreur(errors.target.message) : undefined}
            />
          </div>
          <div className="flex-1">
            <TextInput label={t('fUnit')} value={v.unit} onChange={(x) => setValue('unit', x)} />
          </div>
        </div>
      ) : null}

      {v.goalKind === 'list' ? (
        <LigneListe
          legend={t('fSub')}
          items={v.subItems}
          addLabel={t('addSub')}
          onAdd={() => setValue('subItems', [...v.subItems, { label: '' }])}
          onRemove={(i) =>
            setValue(
              'subItems',
              v.subItems.filter((_, j) => j !== i),
            )
          }
          error={errors.subItems ? messageErreur('subItemsRequired') : undefined}
        >
          {(i) => (
            <TextInput
              label={`${t('fSub')} ${i + 1}`}
              value={v.subItems[i]?.label ?? ''}
              onChange={(x) =>
                setValue(
                  'subItems',
                  v.subItems.map((s, j) => (j === i ? { label: x } : s)),
                )
              }
            />
          )}
        </LigneListe>
      ) : null}
    </>
  );

  const planning = (
    <>
      <Select
        label={t('fRep')}
        value={v.mode}
        onChange={(x) => setValue('mode', x)}
        options={[
          { value: 'dow' as const, label: t('mDow') },
          { value: 'every' as const, label: t('mEvery') },
          { value: 'week' as const, label: t('mWeek') },
          { value: 'month' as const, label: t('repMonth') },
        ]}
      />

      {v.mode === 'dow' ? (
        <DayPicker
          label={t('fDays')}
          value={v.days}
          names={nomsJours}
          onChange={(x) => setValue('days', x)}
          error={errors.days ? messageErreur('daysRequired') : undefined}
        />
      ) : null}

      {v.mode === 'every' ? (
        <TextInput
          label={t('fEvery')}
          type="number"
          value={String(v.interval)}
          onChange={(x) => setValue('interval', Number(x) || 1)}
        />
      ) : null}

      <div className="flex gap-3">
        <div className="flex-1">
          <TextInput
            label={t('fStart')}
            type="date"
            value={v.start}
            onChange={(x) => setValue('start', x)}
          />
        </div>
        <div className="flex-1">
          <TextInput
            label={t('fEnd')}
            type="date"
            value={v.end}
            onChange={(x) => setValue('end', x)}
            error={errors.end ? messageErreur(errors.end.message) : undefined}
          />
        </div>
      </div>
    </>
  );

  const rappels = (
    <LigneListe
      legend={t('fRem')}
      items={v.reminders}
      addLabel={t('addRem')}
      onAdd={() => setValue('reminders', [...v.reminders, '08:00'])}
      onRemove={(i) =>
        setValue(
          'reminders',
          v.reminders.filter((_, j) => j !== i),
        )
      }
    >
      {(i) => (
        <TextInput
          label={`${t('fRem')} ${i + 1}`}
          type="time"
          value={v.reminders[i] ?? ''}
          onChange={(x) =>
            setValue(
              'reminders',
              v.reminders.map((r, j) => (j === i ? x : r)),
            )
          }
        />
      )}
    </LigneListe>
  );

  const avance = (
    <>
      <TextArea
        label={t('fNote')}
        value={v.note}
        onChange={(x) => setValue('note', x)}
        placeholder={t('noteHint')}
      />
      <label className="flex items-center gap-2.5 text-[12.5px]" style={{ color: 'var(--txt2)' }}>
        <input
          type="checkbox"
          checked={v.archived}
          onChange={(e) => setValue('archived', e.target.checked)}
        />
        {t('arch')}
      </label>
      <span className="text-[11.5px]" style={{ color: 'var(--mut)' }}>
        {t('archNote')}
      </span>
    </>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void enregistrer();
      }}
      className="flex flex-col gap-4"
    >
      <EditorTabs
        label={ta('mainNav')}
        onglets={[
          { value: 'def', label: t('tabDef'), content: definition },
          { value: 'plan', label: t('tabPlan'), content: planning },
          { value: 'rem', label: t('tabRem'), content: rappels },
          { value: 'adv', label: t('tabAdv'), content: avance },
        ]}
      />

      <PiedEditeur
        onCancel={onClose}
        onDelete={
          habit
            ? () => {
                void deleteHabit(habit.id);
                onClose();
              }
            : undefined
        }
      />
    </form>
  );
}
