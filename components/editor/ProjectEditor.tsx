'use client';

import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import type { Project } from '@/lib/domain';
import { projectFormSchema, type ProjectForm } from '@/lib/validation/project.schema';
import { useStore } from '@/lib/store';
import { TextArea, TextInput } from './fields';
import { PiedEditeur } from './PiedEditeur';

/* Éditeur de projet — deux champs, donc PAS D'ONGLETS.

   Les onglets des autres éditeurs existent parce qu'ils ont dix à vingt
   champs. En poser sur deux serait une cérémonie qui coûte un clic pour ne
   rien ranger. */

const versFormulaire = (p?: Project): ProjectForm => ({
  name: p?.name ?? '',
  note: p?.note ?? '',
});

export function ProjectEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const t = useTranslations('editor');

  const projet = useStore((s) => (id ? s.projects.find((x) => x.id === id) : undefined));
  const createProject = useStore((s) => s.createProject);
  const updateProject = useStore((s) => s.updateProject);
  const deleteProject = useStore((s) => s.deleteProject);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectFormSchema) as Resolver<ProjectForm>,
    defaultValues: versFormulaire(projet),
    mode: 'onSubmit',
  });

  const v = useWatch({ control }) as ProjectForm;
  const messageErreur = (cle?: string): string | undefined =>
    cle ? t(`err.${cle}` as 'err.nameRequired') : undefined;

  const enregistrer = handleSubmit(async (valeurs) => {
    if (projet) await updateProject(projet.id, valeurs);
    else await createProject(valeurs);
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
      <TextArea label={t('fNote')} value={v.note} onChange={(x) => setValue('note', x)} />

      <PiedEditeur
        onCancel={onClose}
        onDelete={
          projet
            ? () => {
                void deleteProject(projet.id);
                onClose();
              }
            : undefined
        }
      />
    </form>
  );
}
