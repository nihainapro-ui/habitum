'use client';

import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { PROJECT_STATUSES, projectSubItems, type ProjectTask } from '@/lib/domain';
import { projectTaskFormSchema, type ProjectTaskForm } from '@/lib/validation/project.schema';
import { useStore } from '@/lib/store';
import { LigneListe, Select, TextArea, TextInput } from './fields';
import { PiedEditeur } from './PiedEditeur';

/* Éditeur d'une tâche de projet — cinq champs, sans onglets pour la même
   raison que `ProjectEditor`. */

const versFormulaire = (t?: ProjectTask): ProjectTaskForm => ({
  name: t?.name ?? '',
  assignee: t?.assignee ?? '',
  deadline: t?.deadline ?? '',
  status: t?.status ?? 'todo',
  note: t?.note ?? '',
  /* `projectSubItems`, et non `t?.subItems ?? []` : l'absence du champ se
     défait à UN SEUL endroit du produit (tâche 1). La copie est nécessaire —
     le domaine rend une liste en lecture seule, le formulaire la modifie. */
  subItems: t ? [...projectSubItems(t)] : [],
});

export function ProjectTaskEditor({
  id,
  projectId,
  onClose,
}: {
  id: string | null;
  /** Projet d'accueil à la CRÉATION. `id: null` ne dit pas dans quel projet
   *  écrire : c'est pour cela que `EditorState` porte un `parentId`. */
  projectId: string | null;
  onClose: () => void;
}) {
  const t = useTranslations('editor');
  const ta = useTranslations('app');

  const tache = useStore((s) => (id ? s.projectTasks.find((x) => x.id === id) : undefined));
  const createProjectTask = useStore((s) => s.createProjectTask);
  const updateProjectTask = useStore((s) => s.updateProjectTask);
  const deleteProjectTask = useStore((s) => s.deleteProjectTask);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProjectTaskForm>({
    resolver: zodResolver(projectTaskFormSchema) as Resolver<ProjectTaskForm>,
    defaultValues: versFormulaire(tache),
    mode: 'onSubmit',
  });

  const v = useWatch({ control }) as ProjectTaskForm;
  const messageErreur = (cle?: string): string | undefined =>
    cle ? t(`err.${cle}` as 'err.nameRequired') : undefined;

  const enregistrer = handleSubmit(async (valeurs) => {
    if (tache) {
      await updateProjectTask(tache.id, valeurs);
    } else {
      /* Sans projet d'accueil, la tâche serait ORPHELINE : atteignable par
         aucune vue, et écartée au prochain import. On ne l'écrit pas. */
      if (!projectId) return;
      await createProjectTask({ ...valeurs, projectId });
    }
    onClose();
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void enregistrer();
      }}
      className="flex flex-col gap-4"
    >
      <TextInput
        label={t('fName')}
        value={v.name}
        onChange={(x) => setValue('name', x)}
        error={errors.name ? messageErreur(errors.name.message) : undefined}
      />
      <TextInput
        label={ta('assignee')}
        value={v.assignee}
        onChange={(x) => setValue('assignee', x)}
        placeholder={ta('assigneeHint')}
      />
      <TextInput
        label={ta('deadline')}
        type="date"
        value={v.deadline}
        onChange={(x) => setValue('deadline', x)}
      />
      <Select
        label={ta('status')}
        value={v.status}
        onChange={(x) => setValue('status', x)}
        options={PROJECT_STATUSES.map((s) => ({ value: s, label: ta(`st_${s}`) }))}
      />
      <LigneListe
        legend={t('fSub')}
        items={v.subItems}
        addLabel={t('addSub')}
        onAdd={() => setValue('subItems', [...v.subItems, { label: '', done: false }])}
        onRemove={(i) =>
          setValue(
            'subItems',
            v.subItems.filter((_, j) => j !== i),
          )
        }
        error={errors.subItems ? messageErreur('labelRequired') : undefined}
      >
        {(i) => (
          <TextInput
            label={`${t('fSub')} ${i + 1}`}
            value={v.subItems[i]?.label ?? ''}
            onChange={(x) =>
              setValue(
                'subItems',
                /* `{ ...s, label: x }` et non `{ label: x }` : le second
                   perdrait `done` à chaque frappe. */
                v.subItems.map((s, j) => (j === i ? { ...s, label: x } : s)),
              )
            }
          />
        )}
      </LigneListe>

      <TextArea label={t('fNote')} value={v.note} onChange={(x) => setValue('note', x)} />

      <PiedEditeur
        onCancel={onClose}
        onDelete={
          tache
            ? () => {
                void deleteProjectTask(tache.id);
                onClose();
              }
            : undefined
        }
      />
    </form>
  );
}
