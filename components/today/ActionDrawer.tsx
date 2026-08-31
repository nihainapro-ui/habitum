'use client';

import { useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { useTranslations } from 'next-intl';
import { MoreVertical } from 'lucide-react';
import { Sheet } from '@/components/ui';

/* Tiroir d'actions — « Marquer réussi · Passer · Reporter · Supprimer · Note ».

   Les cinq actions existent, mais elles sont CONTEXTUELLES, comme l'écrit
   05-SPEC-VUES.md § Composants transverses : « Reporter » n'a pas de sens pour
   une habitude (une occurrence ne se déplace pas d'un jour à l'autre : le
   lendemain a la sienne), et « Passer » n'en a pas pour une tâche, qui n'a pas
   de journal où écrire un zéro. Le prototype affichait les quatre boutons dans
   les deux cas et se contentait de fermer la fenêtre en annonçant l'action —
   un bouton qui ne fait rien mais dit l'avoir fait est exactement ce que le
   Plan 6 § 6.4 interdit.

   Radix fournit les rôles `menu`/`menuitem`, la navigation par flèches,
   `Escape` et le retour du focus au déclencheur. */

export interface ActionsTiroir {
  onComplete: () => void;
  /** Ouvre l'éditeur de l'entité. Optionnel par prudence de typage, mais les
   *  deux appelants le fournissent : sans lui, la vue Aujourd'hui était le seul
   *  endroit du produit où l'on ne pouvait RIEN corriger — or c'est celui où
   *  l'on passe le plus de temps. Les vues Habitudes, Tâches et Objectifs
   *  avaient leur crayon depuis toujours ; cette ligne-ci ne l'avait pas. */
  onEdit?: () => void;
  onSkip?: () => void;
  onSnooze?: () => void;
  onDelete: () => void;
  note: string;
  onNote: (valeur: string) => void;
}

export function ActionDrawer({ name, actions }: { name: string; actions: ActionsTiroir }) {
  const t = useTranslations('app');
  const [noteOuverte, setNoteOuverte] = useState(false);
  const [brouillon, setBrouillon] = useState(actions.note);

  const item =
    'flex w-full cursor-pointer items-center rounded-btn-sm px-3 py-2 text-[12.5px] outline-none data-[highlighted]:bg-[var(--panel2)]';

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label={`${t('moreA')} : ${name}`}
          className="rounded-btn-sm grid h-7 w-7 flex-none cursor-pointer place-items-center border border-transparent"
          style={{ color: 'var(--mut)', background: 'transparent' }}
        >
          <MoreVertical size={14} aria-hidden="true" />
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Content
            align="end"
            sideOffset={6}
            className="rounded-field z-50 min-w-[188px] border p-1"
            style={{ borderColor: 'var(--line2)', background: 'var(--bg2)' }}
          >
            <Menu.Item className={item} onSelect={actions.onComplete}>
              {t('markDone')}
            </Menu.Item>

            {/* Deuxième, et non en bas : après « réussi », corriger est ce
                qu'on vient chercher le plus souvent dans ce menu. */}
            {actions.onEdit ? (
              <Menu.Item className={item} onSelect={actions.onEdit}>
                {t('edit')}
              </Menu.Item>
            ) : null}

            {actions.onSkip ? (
              <Menu.Item className={item} onSelect={actions.onSkip}>
                {t('skip')}
              </Menu.Item>
            ) : null}

            {actions.onSnooze ? (
              <Menu.Item className={item} onSelect={actions.onSnooze}>
                {t('reschedule')}
              </Menu.Item>
            ) : null}

            <Menu.Item
              className={item}
              onSelect={() => {
                setBrouillon(actions.note);
                setNoteOuverte(true);
              }}
            >
              {t('addNote')}
            </Menu.Item>

            <Menu.Item className={item} style={{ color: 'var(--bad)' }} onSelect={actions.onDelete}>
              {t('delete')}
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>

      <Sheet
        open={noteOuverte}
        onOpenChange={setNoteOuverte}
        title={t('addNote')}
        description={name}
      >
        <div className="flex flex-col gap-3">
          <textarea
            value={brouillon}
            onChange={(e) => setBrouillon(e.target.value)}
            placeholder={t('notePlaceholder')}
            aria-label={t('addNote')}
            className="rounded-field min-h-[120px] w-full resize-y border p-3 text-[12.5px] outline-none"
            style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--txt)' }}
          />
          <button
            type="button"
            onClick={() => {
              actions.onNote(brouillon);
              setNoteOuverte(false);
            }}
            className="rounded-btn cursor-pointer border px-4 py-2 text-[12.5px] font-semibold"
            style={{ borderColor: 'var(--acc2)', color: 'var(--acc2)' }}
          >
            {t('save')}
          </button>
        </div>
      </Sheet>
    </>
  );
}
