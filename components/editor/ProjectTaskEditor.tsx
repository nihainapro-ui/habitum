'use client';

import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { PROJECT_STATUSES, type ProjectTask } from '@/lib/domain';
import { projectTaskFormSchema, type ProjectTaskForm } from '@/lib/validation/project.schema';
import { useStore } from '@/lib/store';
import { Select, TextArea, TextInput } from './fields';
import { PiedEditeur } from './PiedEditeur';

/* Éditeur d'une tâche de projet — cinq champs, sans onglets pour la même
   raison que `ProjectEditor`. */

const versFormulaire = (t?: ProjectTask): ProjectTaskForm => ({
  name: t?.name ?? '',
  assignee: t?.assignee ?? '',
  deadline: t?.deadline ?? '',
  status: t?.status ?? 'todo',
  note: t?.note ?? '',
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
