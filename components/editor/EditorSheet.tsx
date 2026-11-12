'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Sheet } from '@/components/ui';
import { useStore } from '@/lib/store';
import { useEstMobile } from '@/lib/features/mobile';
import { GoalEditor } from './GoalEditor';
import { HabitEditor, type GardeFermeture } from './HabitEditor';
import { ProjectEditor } from './ProjectEditor';
import { ProjectTaskEditor } from './ProjectTaskEditor';
import { TaskEditor } from './TaskEditor';

/* Hôte des éditeurs, monté dans la coque.

   `ui.editor` porte {kind, id} : n'importe quelle vue ouvre l'éditeur d'un
   appel, sans le monter elle-même. Le formulaire est REMONTÉ à chaque
   ouverture (`key`) — sans quoi rouvrir l'éditeur sur une autre entité
   afficherait les valeurs de la précédente, `react-hook-form` ne relisant pas
   ses `defaultValues` sur un composant déjà en place.

   Sur téléphone, l'éditeur d'HABITUDE prend la forme de la refonte mobile
   (PDF p. 7) : il dessine sa propre barre Annuler / Titre / Enregistrer, la
   feuille lui cède donc son en-tête (`enteteMasque`), et il peut RETENIR la
   fermeture pour demander « Abandonner ? » — c'est la garde. Les autres
   éditeurs gardent leur forme d'origine ; ils viendront avec P3. `useEstMobile`
   est lu ici, dans un composant monté depuis le chargement, pour que le
   formulaire naisse directement dans la bonne forme. */

export function EditorSheet() {
  const t = useTranslations('editor');
  const editor = useStore((s) => s.ui.editor);
  const closeEditor = useStore((s) => s.closeEditor);
  const mobile = useEstMobile();
  const garde: GardeFermeture = useRef<(() => boolean) | null>(null);

  if (!editor) return null;

  const titres = {
    habit: editor.id ? t('editH') : t('newH'),
    task: editor.id ? t('editT') : t('newT'),
    goal: editor.id ? t('editG') : t('newG'),
    project: editor.id ? t('editP') : t('newP'),
    projectTask: editor.id ? t('editPT') : t('newPT'),
  } as const;

  const habitudeMobile = mobile && editor.kind === 'habit';

  return (
    <Sheet
      open
      onOpenChange={(ouvert) => {
        if (ouvert) return;
        if (garde.current && !garde.current()) return;
        closeEditor();
      }}
      title={titres[editor.kind]}
      description={t('noteHint')}
      enteteMasque={habitudeMobile}
    >
      <div
        key={`${editor.kind}-${editor.id ?? 'new'}`}
        className={habitudeMobile ? 'min-h-full' : 'pb-4'}
      >
        {editor.kind === 'habit' ? (
          <HabitEditor id={editor.id} onClose={closeEditor} mobile={mobile} garde={garde} />
        ) : editor.kind === 'task' ? (
          <TaskEditor id={editor.id} onClose={closeEditor} />
        ) : editor.kind === 'project' ? (
          <ProjectEditor id={editor.id} onClose={closeEditor} />
        ) : editor.kind === 'projectTask' ? (
          <ProjectTaskEditor
            id={editor.id}
            projectId={editor.parentId ?? null}
            onClose={closeEditor}
          />
        ) : (
          <GoalEditor id={editor.id} onClose={closeEditor} />
        )}
      </div>
    </Sheet>
  );
}
