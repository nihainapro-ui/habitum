'use client';

import { useState, type CSSProperties } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useTranslations } from 'next-intl';
import { decalerHeure, decalerJour, DUREE_MIN, PAS_MINUTES, type Task } from '@/lib/domain';
import { COULEURS_CATEGORIE } from '@/components/ui';
import { useStore } from '@/lib/store';

/* Un évènement du calendrier : déplaçable à la souris ET au clavier.

   L'ALTERNATIVE CLAVIER N'EST PAS OPTIONNELLE (T3.9, T7.4). Elle ne rejoue pas
   le glisser-déposer en pixels — ce serait le rendre inutilisable : elle
   travaille dans les unités du domaine. Entrée ouvre un mode déplacement, les
   flèches décalent d'un jour ou d'un quart d'heure, Entrée valide, Échap
   annule sans rien écrire. Maj + flèches verticales changent la durée
   directement, bornée par `DUREE_MIN`.

   Le mode déplacement n'écrit RIEN avant validation : c'est ce qui permet
   d'annuler d'un Échap, et ce qui évite d'écrire quatre fois en base pour un
   déplacement de quatre jours. */

export interface Brouillon {
  date: string;
  time?: string;
}

export function EventBlock({
  task,
  style,
  compact = false,
}: {
  task: Task;
  style?: CSSProperties;
  compact?: boolean;
}) {
  const t = useTranslations('app');
  const moveTask = useStore((s) => s.moveTask);
  const nudgeTaskDuration = useStore((s) => s.nudgeTaskDuration);
  const openEditor = useStore((s) => s.openEditor);

  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tache:${task.id}`,
    data: { taskId: task.id },
  });

  const couleur = COULEURS_CATEGORIE[task.category];
  const enDeplacement = brouillon !== null;

  const surTouche = (e: React.KeyboardEvent) => {
    /* Maj + flèches : la durée, sans passer par le mode déplacement — c'est le
       geste le plus fréquent, il ne mérite pas deux frappes de plus. */
    if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      /* On envoie le DELTA, pas la durée calculée ici : dix frappes rapides
         liraient toutes la même valeur périmée dans cette fermeture, et neuf
         se perdraient. La durée courante se lit dans le store. */
      void nudgeTaskDuration(task.id, e.key === 'ArrowUp' ? -PAS_MINUTES : PAS_MINUTES);
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!enDeplacement) {
        setBrouillon({ date: task.date, ...(task.time ? { time: task.time } : {}) });
        return;
      }
      void moveTask(task.id, brouillon.date, brouillon.time);
      setBrouillon(null);
      return;
    }

    if (e.key === 'Escape' && enDeplacement) {
      e.preventDefault();
      setBrouillon(null);
      return;
    }

    if (!enDeplacement) return;

    const jours = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    const minutes = e.key === 'ArrowDown' ? PAS_MINUTES : e.key === 'ArrowUp' ? -PAS_MINUTES : 0;
    if (jours === 0 && minutes === 0) return;

    e.preventDefault();
    setBrouillon({
      date: decalerJour(brouillon.date, jours),
      ...(brouillon.time || minutes !== 0 ? { time: decalerHeure(brouillon.time, minutes) } : {}),
    });
  };

  const etiquette = [
    task.name,
    brouillon ? `— ${brouillon.date}${brouillon.time ? ` ${brouillon.time}` : ''}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      data-event
      data-task-id={task.id}
      data-duration={String(Math.max(DUREE_MIN, task.duration))}
      data-moving={enDeplacement ? 'true' : undefined}
      aria-label={etiquette}
      aria-describedby={undefined}
      onKeyDown={surTouche}
      onDoubleClick={() => openEditor({ kind: 'task', id: task.id })}
      className="rounded-btn-sm overflow-hidden border px-1.5 py-1 text-left"
      style={{
        ...style,
        borderColor: enDeplacement ? 'var(--acc2)' : 'transparent',
        background: `color-mix(in srgb, ${couleur} ${enDeplacement ? 34 : 22}%, transparent)`,
        color: 'var(--txt)',
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
      }}
    >
      <span className="block truncate text-[11px] font-medium">{task.name}</span>
      {compact ? null : (
        <span className="block truncate font-mono text-[9.5px]" style={{ color: 'var(--txt2)' }}>
          {brouillon ? `${brouillon.date} ${brouillon.time ?? ''}` : (task.time ?? t('calAllDay'))}
        </span>
      )}
    </div>
  );
}
