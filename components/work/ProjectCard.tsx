'use client';

import { useTranslations } from 'next-intl';
import { Pencil } from 'lucide-react';
import {
  countOverdue,
  projectProgress,
  type DateKey,
  type Project,
  type ProjectTask,
} from '@/lib/domain';
import { useStore } from '@/lib/store';

/* Une carte de projet dans la liste.

   TOUT CE QU'ELLE MONTRE EST COMPTÉ, jamais estimé (règle 3 du CLAUDE.md) : un
   projet sans étape affiche 0 %, « 0 sur 0 », et pas de mention de retard. Le
   calcul vient du domaine, la carte ne fait que l'afficher. */

export function ProjectCard({
  projet,
  taches,
  aujourdHui,
  onOuvrir,
}: {
  projet: Project;
  taches: ProjectTask[];
  aujourdHui: DateKey;
  onOuvrir: () => void;
}) {
  const t = useTranslations('app');
  const openEditor = useStore((s) => s.openEditor);

  const av = projectProgress(taches);
  const retard = countOverdue(taches, aujourdHui);

  return (
    <article
      className="rounded-panel flex flex-col gap-3 border p-4"
      style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onOuvrir}
          /* Le nom accessible dit l'ACTION, pas le contenu. Sans lui, il valait
             « Refonte du site Vitrine et pages de contenu » — la note lue à la
             suite du titre, et rien qui annonce qu'appuyer ouvre le projet. */
          aria-label={t('openProject', { name: projet.name })}
          className="min-w-0 flex-1 cursor-pointer text-left"
          style={{ background: 'transparent', border: 0, color: 'inherit', font: 'inherit' }}
        >
          <span className="block truncate text-[14px] font-semibold">{projet.name}</span>
          {projet.note ? (
            <span className="mt-0.5 block truncate text-[11.5px]" style={{ color: 'var(--mut)' }}>
              {projet.note}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => openEditor({ kind: 'project', id: projet.id })}
          aria-label={t('editFor', { name: projet.name })}
          className="rounded-btn-sm grid h-7 w-7 flex-none cursor-pointer place-items-center border"
          style={{ borderColor: 'var(--line)', color: 'var(--mut)' }}
        >
          <Pencil size={12} aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="h-[5px] flex-1 overflow-hidden rounded-[99px]"
          style={{ background: 'rgba(var(--glow),.14)' }}
        >
          <div
            style={{
              width: `${av.pct}%`,
              height: '100%',
              borderRadius: '99px',
              background: 'linear-gradient(90deg,var(--acc),var(--acc2))',
              transition: 'width .5s cubic-bezier(.2,.8,.2,1)',
            }}
          />
        </div>
        <span
          className="flex-none font-mono text-[10.5px] whitespace-nowrap"
          style={{ color: 'var(--txt2)' }}
        >
          {t('projProgress', { done: av.done, total: av.total })}
        </span>
      </div>

      {/* Le retard n'apparaît QUE s'il y en a. Un « 0 en retard » permanent
          serait un signal qui crie pour rien, et qu'on cesse donc de lire. */}
      {retard > 0 ? (
        <span className="text-[11px]" style={{ color: 'var(--bad)' }}>
          {t('overdueN', { n: retard })}
        </span>
      ) : null}
    </article>
  );
}
