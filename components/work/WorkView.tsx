'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { dateKey, today, type Project } from '@/lib/domain';
import { useStore } from '@/lib/store';
import { EmptyState } from '@/components/shell/empty-state';
import { PrimaryButton } from '@/components/shell/primary-button';
import { ViewActions } from '@/components/shell/view-actions';
import { ProjectCard } from './ProjectCard';
import { ProjectBoard } from './ProjectBoard';

/* Vue « Work » — spec du 2026-08-31.

   DEUX NIVEAUX DANS UNE SEULE VUE, sans sous-route. Un `/app/work/[id]` aurait
   ajouté onze pages statiques à l'export — une par projet, régénérées à chaque
   création, ce qu'un export statique ne sait pas faire (D12). Le projet ouvert
   est donc un état local : la vue est la même, ce qu'elle montre change.

   Le prix, dit franchement : le projet ouvert ne survit pas à un rechargement,
   et ne se partage pas par un lien. Dans une application locale sans compte,
   ni l'un ni l'autre n'a de destinataire. */

export function WorkView() {
  const t = useTranslations('app');
  const projects = useStore((s) => s.projects);
  const projectTasks = useStore((s) => s.projectTasks);
  const openEditor = useStore((s) => s.openEditor);

  const [ouvert, setOuvert] = useState<string | null>(null);
  const aujourdHui = dateKey(today());

  /* Les tâches sont indexées PAR PROJET une fois, ici, et non refiltrées par
     chaque carte : à N projets, filtrer dans la carte coûte N balayages de la
     liste entière à chaque rendu. */
  const parProjet = useMemo(() => {
    const index = new Map<string, typeof projectTasks>();
    for (const p of projects) index.set(p.id, []);
    for (const t of projectTasks) {
      const liste = index.get(t.projectId);
      /* Une tâche dont le projet n'existe plus n'est rattachée à rien : on ne
         la crée pas au vol, sinon un projet fantôme apparaîtrait. */
      if (liste) liste.push(t);
    }
    return index;
  }, [projects, projectTasks]);

  const projet: Project | undefined = ouvert ? projects.find((p) => p.id === ouvert) : undefined;

  const nouveauProjet = (
    <PrimaryButton onClick={() => openEditor({ kind: 'project', id: null })}>
      {t('newProject')}
    </PrimaryButton>
  );

  /* --- Un projet ouvert -------------------------------------------------- */
  if (projet) {
    return (
      <div className="flex flex-col gap-4">
        <ViewActions>
          <button
            type="button"
            onClick={() => setOuvert(null)}
            className="rounded-btn mr-auto flex cursor-pointer items-center gap-1.5 border px-3 py-2 text-[12px]"
            style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
          >
            <ChevronLeft size={13} aria-hidden="true" />
            {t('backToProjects')}
          </button>
          <PrimaryButton
            onClick={() => openEditor({ kind: 'projectTask', id: null, parentId: projet.id })}
          >
            {t('newPTask')}
          </PrimaryButton>
        </ViewActions>

        <ProjectBoard
          projet={projet}
          taches={parProjet.get(projet.id) ?? []}
          aujourdHui={aujourdHui}
        />
      </div>
    );
  }

  /* --- La liste des projets ---------------------------------------------- */
  return (
    <div className="flex flex-col gap-4">
      <ViewActions>{nouveauProjet}</ViewActions>

      {projects.length === 0 ? (
        <EmptyState titleKey="app.emWorkT" bodyKey="app.emWorkD" action={nouveauProjet} />
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[1060px]:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              projet={p}
              taches={parProjet.get(p.id) ?? []}
              aujourdHui={aujourdHui}
              onOuvrir={() => setOuvert(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
