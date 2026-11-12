'use client';

import type { RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ListTodo, NotebookPen, Repeat2, Timer } from 'lucide-react';
import { FeuilleBasse } from '@/components/ui';
import { useStore } from '@/lib/store';

/* Feuille de choix du « + » — PDF p. 2 : « Le « + » ouvre une feuille de
   choix (Habitude · Tâche · Note · Session) ; sur Habitudes et Tâches il crée
   directement le type courant. »

   Quatre lignes de 52 px. Habitude et tâche ouvrent leur éditeur ; une note
   mène au journal du jour, une session au minuteur — ces deux-là n'ont pas
   d'éditeur, elles ont un écran. */

export function FeuilleCreation({
  open,
  onOpenChange,
  retourFocus,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  retourFocus?: RefObject<HTMLElement | null> | undefined;
}) {
  const t = useTranslations('app');
  const router = useRouter();
  const openEditor = useStore((s) => s.openEditor);

  const choisir = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  const lignes = [
    {
      key: 'mobCreateHabit',
      Icone: Repeat2,
      action: () => openEditor({ kind: 'habit', id: null }),
    },
    { key: 'mobCreateTask', Icone: ListTodo, action: () => openEditor({ kind: 'task', id: null }) },
    { key: 'mobCreateNote', Icone: NotebookPen, action: () => router.push('/app/notes') },
    { key: 'mobCreateSession', Icone: Timer, action: () => router.push('/app/timer') },
  ] as const;

  return (
    <FeuilleBasse
      open={open}
      onOpenChange={onOpenChange}
      title={t('mobCreate')}
      description={t('mobCreateD')}
      testId="feuille-creation"
      retourFocus={retourFocus}
    >
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {lignes.map(({ key, Icone, action }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => choisir(action)}
              className="rounded-field flex min-h-[52px] w-full cursor-pointer items-center gap-3 border px-4 text-left text-[14px]"
              style={{
                borderColor: 'var(--line)',
                background: 'var(--panel2)',
                color: 'var(--txt)',
              }}
            >
              <Icone
                size={18}
                strokeWidth={1.7}
                aria-hidden="true"
                style={{ color: 'var(--acc2)' }}
              />
              {t(key)}
            </button>
          </li>
        ))}
      </ul>
    </FeuilleBasse>
  );
}
