'use client';

import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { CATEGORIES, GOAL_KINDS, type Goal, type GoalKind } from '@/lib/domain';
import { goalFormSchema, type GoalForm } from '@/lib/validation/goal.schema';
import { useStore } from '@/lib/store';
import { LigneListe, Select, TextInput } from './fields';
import { EditorTabs } from './EditorTabs';
import { PiedEditeur } from './PiedEditeur';

/* Éditeur d'objectif — deux onglets : ce qu'on vise, et dans quel temps. */

const CLES_TYPE: Record<GoalKind, 'kCumul' | 'kMile' | 'kReduce'> = {
  cumul: 'kCumul',
  milestones: 'kMile',
  reduce: 'kReduce',
};

const versFormulaire = (g?: Goal): GoalForm => ({
  name: g?.name ?? '',
  kind: g?.kind ?? 'cumul',
  category: g?.category ?? 'health',
  target: g?.target ?? 1,
  unit: g?.unit ?? '',
  sourceHabitId: g?.sourceHabitId ?? '',
  start: g?.start ?? '',
  deadline: g?.deadline ?? '',
  window: g?.window ?? 90,
  milestones: g?.milestones ?? [],
});

export function GoalEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const t = useTranslations('editor');
  const ta = useTranslations('app');
  const tc = useTranslations('cat');

  const goal = useStore((s) => (id ? s.goals.find((g) => g.id === id) : undefined));
  const habits = useStore((s) => s.habits);
  const createGoal = useStore((s) => s.createGoal);
  const updateGoal = useStore((s) => s.updateGoal);
  const deleteGoal = useStore((s) => s.deleteGoal);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<GoalForm>({
    resolver: zodResolver(goalFormSchema) as Resolver<GoalForm>,
    defaultValues: versFormulaire(goal),
    mode: 'onSubmit',
  });

  const v = useWatch({ control }) as GoalForm;

  const messageErreur = (cle?: string): string | undefined =>
    cle ? t(`err.${cle}` as 'err.nameRequired') : undefined;

  const enregistrer = handleSubmit(async (valeurs) => {
    const entree = {
      name: valeurs.name,
      kind: valeurs.kind,
      category: valeurs.category,
      target: valeurs.target,
      unit: valeurs.unit,
      sourceHabitId: valeurs.sourceHabitId || undefined,
      start: valeurs.start || undefined,
      deadline: valeurs.deadline || undefined,
      window: valeurs.kind === 'reduce' ? valeurs.window : undefined,
      milestones: valeurs.kind === 'milestones' ? valeurs.milestones : undefined,
      current: goal?.current ?? 0,
    };

    if (goal) await updateGoal(goal.id, entree);
    else await createGoal(entree);
    onClose();
  });

  const definition = (
    <>
      <TextInput
        label={ta('objName')}
        value={v.name}
        onChange={(x) => setValue('name', x)}
        error={errors.name ? messageErreur(errors.name.message) : undefined}
      />
      <Select
        label={ta('objKind')}
        value={v.kind}
        onChange={(x) => setValue('kind', x)}
        options={GOAL_KINDS.map((k) => ({ value: k, label: ta(CLES_TYPE[k]) }))}
      />
      <Select
        label={t('fCat')}
        value={v.category}
        onChange={(x) => setValue('category', x)}
        options={CATEGORIES.map((c) => ({ value: c, label: tc(c) }))}
      />

      {v.kind === 'milestones' ? (
        <LigneListe
          legend={t('fMs')}
          items={v.milestones}
          addLabel={t('addMs')}
          onAdd={() => setValue('milestones', [...v.milestones, { label: '', done: false }])}
          onRemove={(i) =>
            setValue(
              'milestones',
              v.milestones.filter((_, j) => j !== i),
            )
          }
          error={errors.milestones ? messageErreur('subItemsRequired') : undefined}
        >
          {(i) => (
            <TextInput
              label={`${t('fMs')} ${i + 1}`}
              value={v.milestones[i]?.label ?? ''}
              onChange={(x) =>
                setValue(
                  'milestones',
                  v.milestones.map((m, j) => (j === i ? { ...m, label: x } : m)),
                )
              }
            />
          )}
        </LigneListe>
      ) : (
        <div className="flex gap-3">
          <div className="flex-1">
            <TextInput
              label={ta('objTarget')}
              type="number"
              value={String(v.target)}
              onChange={(x) => setValue('target', Number(x) || 0)}
              error={errors.target ? messageErreur(errors.target.message) : undefined}
            />
          </div>
          <div className="flex-1">
            <TextInput label={ta('objUnit')} value={v.unit} onChange={(x) => setValue('unit', x)} />
          </div>
        </div>
      )}
    </>
  );

  const planning = (
    <>
      <Select
        label={ta('objSrc')}
        value={v.sourceHabitId}
        onChange={(x) => setValue('sourceHabitId', x)}
        options={[
          { value: '', label: ta('objNoSrc') },
          ...habits.map((h) => ({ value: h.id, label: h.name })),
        ]}
      />
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
            label={ta('objDue')}
            type="date"
            value={v.deadline}
            onChange={(x) => setValue('deadline', x)}
            error={errors.deadline ? messageErreur(errors.deadline.message) : undefined}
          />
        </div>
      </div>

      {v.kind === 'reduce' ? (
        <TextInput
          label={t('fWindow')}
          type="number"
          value={String(v.window)}
          onChange={(x) => setValue('window', Number(x) || 1)}
        />
      ) : null}
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
        ]}
      />

      <PiedEditeur
        onCancel={onClose}
        onDelete={
          goal
            ? () => {
                void deleteGoal(goal.id);
                onClose();
              }
            : undefined
        }
      />
    </form>
  );
}
