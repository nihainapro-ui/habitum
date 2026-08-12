'use client';

import { useTranslations } from 'next-intl';
import { Sheet } from '@/components/ui';
import { useStore } from '@/lib/store';
import { GoalEditor } from './GoalEditor';
import { HabitEditor } from './HabitEditor';
import { TaskEditor } from './TaskEditor';

/* Hôte des éditeurs, monté dans la coque.

   `ui.editor` porte {kind, id} : n'importe quelle vue ouvre l'éditeur d'un
   appel, sans le monter elle-même. Le formulaire est REMONTÉ à chaque
   ouverture (`key`) — sans quoi rouvrir l'éditeur sur une autre entité
   afficherait les valeurs de la précédente, `react-hook-form` ne relisant pas
   ses `defaultValues` sur un composant déjà en place. */

export function EditorSheet() {
  const t = useTranslations('editor');
  const editor = useStore((s) => s.ui.editor);
  const closeEditor = useStore((s) => s.closeEditor);

  if (!editor) return null;

  const titres = {
    habit: editor.id ? t('editH') : t('newH'),
    task: editor.id ? t('editT') : t('newT'),
    goal: editor.id ? t('editG') : t('newG'),
  } as const;

  return (
    <Sheet
      open
      onOpenChange={(ouvert) => {
        if (!ouvert) closeEditor();
      }}
      title={titres[editor.kind]}
      description={t('noteHint')}
    >
      <div key={`${editor.kind}-${editor.id ?? 'new'}`} className="pb-4">
        {editor.kind === 'habit' ? (
          <HabitEditor id={editor.id} onClose={closeEditor} />
        ) : editor.kind === 'task' ? (
          <TaskEditor id={editor.id} onClose={closeEditor} />
        ) : (
          <GoalEditor id={editor.id} onClose={closeEditor} />
        )}
      </div>
    </Sheet>
  );
}
