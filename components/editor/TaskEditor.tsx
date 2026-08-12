'use client';

import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { CATEGORIES, dateKey, today, type Task } from '@/lib/domain';
import { taskFormSchema, type TaskForm } from '@/lib/validation/task.schema';
import { useStore } from '@/lib/store';
import { LigneListe, Select, TextArea, TextInput } from './fields';
import { EditorTabs } from './EditorTabs';
import { PiedEditeur } from './PiedEditeur';

/* Éditeur de tâche — 05-SPEC-VUES.md § 5.

   TROIS onglets, et non quatre. Le modèle cible ne porte pas de rappel sur la
   tâche : seule l'habitude a `reminders[]`. Afficher un onglet « Rappels » qui
   n'écrirait nulle part serait un champ décoratif — exactement ce que le Plan 6
   § 6.4 nous demande de ne plus produire. L'heure de la tâche vit dans
   « Planning », là où elle est effectivement utilisée. */

const versFormulaire = (t?: Task): TaskForm => ({
  name: t?.name ?? '',
  category: t?.category ?? 'work',
  date: t?.date ?? dateKey(today()),
  time: t?.time ?? '',
  duration: t?.duration ?? 60,
  priority: t?.priority ?? 2,
  recurrence: t?.recurrence?.freq ?? 'none',
  subTasks: t?.subTasks ?? [],
  note: t?.note ?? '',
});

export function TaskEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const t = useTranslations('editor');
  const ta = useTranslations('app');
  const tc = useTranslations('cat');

  const task = useStore((s) => (id ? s.tasks.find((x) => x.id === id) : undefined));
  const createTask = useStore((s) => s.createTask);
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskFormSchema) as Resolver<TaskForm>,
    defaultValues: versFormulaire(task),
    mode: 'onSubmit',
  });

  const v = useWatch({ control }) as TaskForm;

  const messageErreur = (cle?: string): string | undefined =>
    cle ? t(`err.${cle}` as 'err.nameRequired') : undefined;

  const enregistrer = handleSubmit(async (valeurs) => {
    const entree = {
      name: valeurs.name,
      category: valeurs.category,
      date: valeurs.date,
      time: valeurs.time || undefined,
      duration: valeurs.duration,
      priority: valeurs.priority as Task['priority'],
      done: task?.done ?? false,
      subTasks: valeurs.subTasks,
      note: valeurs.note,
      recurrence:
        valeurs.recurrence === 'none'
          ? undefined
          : { freq: valeurs.recurrence as 'daily' | 'monthly' },
    };

    if (task) await updateTask(task.id, entree);
    else await createTask(entree);
    onClose();
  });

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
      <TextArea label={t('fNote')} value={v.note} onChange={(x) => setValue('note', x)} />
    </>
  );

  const planning = (
    <>
      <TextInput
        label={t('fDue')}
        type="date"
        value={v.date}
        onChange={(x) => setValue('date', x)}
        error={errors.date ? messageErreur(errors.date.message) : undefined}
      />
      <div className="flex gap-3">
        <div className="flex-1">
          <TextInput
            label={t('fTime')}
            type="time"
            value={v.time}
            onChange={(x) => setValue('time', x)}
          />
        </div>
        <div className="flex-1">
          <TextInput
            label={ta('calDur')}
            type="number"
            value={String(v.duration)}
            onChange={(x) => setValue('duration', Number(x) || 0)}
            error={errors.duration ? messageErreur(errors.duration.message) : undefined}
          />
        </div>
      </div>
      <Select
        label={t('fPrio')}
        value={String(v.priority) as '1' | '2' | '3'}
        onChange={(x) => setValue('priority', Number(x))}
        options={[
          { value: '1' as const, label: ta('low') },
          { value: '2' as const, label: ta('mid') },
          { value: '3' as const, label: ta('high') },
        ]}
      />
      <Select
        label={t('fRep')}
        value={v.recurrence}
        onChange={(x) => setValue('recurrence', x)}
        options={[
          { value: 'none' as const, label: t('repNone') },
          { value: 'daily' as const, label: t('repDaily') },
          { value: 'monthly' as const, label: t('repMonth') },
        ]}
      />
    </>
  );

  const avance = (
    <LigneListe
      legend={t('fSub')}
      items={v.subTasks}
      addLabel={t('addSub')}
      onAdd={() => setValue('subTasks', [...v.subTasks, { label: '', done: false }])}
      onRemove={(i) =>
        setValue(
          'subTasks',
          v.subTasks.filter((_, j) => j !== i),
        )
      }
    >
      {(i) => (
        <TextInput
          label={`${t('fSub')} ${i + 1}`}
          value={v.subTasks[i]?.label ?? ''}
          onChange={(x) =>
            setValue(
              'subTasks',
              v.subTasks.map((s, j) => (j === i ? { ...s, label: x } : s)),
            )
          }
        />
      )}
    </LigneListe>
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
          { value: 'adv', label: t('tabAdv'), content: avance },
        ]}
      />

      <PiedEditeur
        onCancel={onClose}
        onDelete={
          task
            ? () => {
                void deleteTask(task.id);
                onClose();
              }
            : undefined
        }
      />
    </form>
  );
}
