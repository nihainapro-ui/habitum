'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { groupTasks, GROUPES_TACHE, type GroupeTache } from '@/lib/domain';
import { useSettings, useStore } from '@/lib/store';
import { Segmented } from '@/components/ui';
import { ShoppingList } from '../ShoppingList';
import { LigneTache } from './LigneTache';

/* Vue « Tâches » sur TÉLÉPHONE — refonte mobile, PDF p. 8.

   Segments À faire / Faites avec compteurs → une seule carte, dont les
   groupes (Aujourd'hui → Demain → Cette semaine → Plus tard) sont des
   sections à en-tête, pas des cartes dans une carte → la liste de courses,
   repliée sous un bouton qui dit combien elle contient.

   Le groupe « En retard » du PDF n'existe pas : le domaine range le retard
   dans « Aujourd'hui », à dessein (`lib/domain/tasks.ts`), et la ligne
   l'écrit. « Faites » garde TOUTES les tâches terminées, sans fenêtre : le
   dépôt n'en a pas, et une tâche faite il y a un mois doit rester
   retrouvable.

   États : aucun tâche → « Aucune tâche » + « Nouvelle tâche » ; tout fait →
   « Tout est fait » (seulement s'il y a des tâches : un compte vierge n'a
   rien fait) ; Faites vide → « Aucune tâche terminée ». */

type Onglet = 'todo' | 'done';
const A_FAIRE: readonly GroupeTache[] = GROUPES_TACHE.filter((g) => g !== 'done');
const TITRES: Record<GroupeTache, string> = {
  today: 'grpToday',
  tomorrow: 'grpTomorrow',
  week: 'grpWeek',
  later: 'grpLater',
  done: 'grpDone',
};

export function TasksMobile() {
  const t = useTranslations('app');
  const tasks = useStore((s) => s.tasks);
  const courses = useStore((s) => s.shopping);
  const openEditor = useStore((s) => s.openEditor);
  const { weekStart } = useSettings();
  const [onglet, setOnglet] = useState<Onglet>('todo');
  const [coursesOuvertes, setCoursesOuvertes] = useState(false);

  const groupes = useMemo(() => groupTasks(tasks, weekStart), [tasks, weekStart]);
  const nbAFaire = A_FAIRE.reduce((n, g) => n + groupes[g].length, 0);
  const sectionsAFaire = A_FAIRE.filter((g) => groupes[g].length > 0);

  const carte = 'rounded-[22px] overflow-hidden border';
  const styleCarte = { borderColor: 'var(--line)', background: 'var(--panel)' };

  const vide = (titre: string, action?: boolean) => (
    <section
      data-testid="empty-state"
      className={`${carte} flex flex-col items-center gap-3 px-6 py-8 text-center`}
      style={styleCarte}
    >
      <span className="text-[15px] font-semibold">{titre}</span>
      {action ? (
        <button
          type="button"
          onClick={() => openEditor({ kind: 'task', id: null })}
          className="rounded-pill min-h-[44px] cursor-pointer border-0 px-5 text-[13.5px] font-semibold"
          style={{ background: 'var(--acc2)', color: 'var(--bg)' }}
        >
          {t('mobNewTask')}
        </button>
      ) : null}
    </section>
  );

  let contenu;
  if (tasks.length === 0) contenu = vide(t('emTasksT'), true);
  else if (onglet === 'todo' && nbAFaire === 0) contenu = vide(t('mobTaskAllDone'));
  else if (onglet === 'done' && groupes.done.length === 0) contenu = vide(t('mobTaskNoneDone'));
  else if (onglet === 'done')
    contenu = (
      <section className={carte} style={styleCarte} aria-label={t('grpDone')}>
        <ul className="m-0 flex list-none flex-col p-0">
          {groupes.done.map((k) => (
            <LigneTache key={k.id} task={k} />
          ))}
        </ul>
      </section>
    );
  else
    contenu = (
      <div className={carte} style={styleCarte}>
        {sectionsAFaire.map((g) => (
          <section
            key={g}
            aria-label={t(TITRES[g])}
            className="border-b last:border-b-0"
            style={{ borderColor: 'var(--line)' }}
          >
            <h2
              className="m-0 flex min-h-[36px] items-center gap-2 px-4 font-mono text-[9.5px] font-normal tracking-[0.18em] uppercase"
              style={{ color: 'var(--txt2)', background: 'var(--panel2)' }}
            >
              {t(TITRES[g])}
              <span style={{ color: 'var(--acc2)' }}>{groupes[g].length}</span>
            </h2>
            <ul className="m-0 flex list-none flex-col p-0">
              {groupes[g].map((k) => (
                <LigneTache key={k.id} task={k} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    );

  return (
    <div className="flex flex-col gap-3" data-testid="tasks-mobile">
      <Segmented<Onglet>
        fill
        label={t('navTasks')}
        value={onglet}
        onChange={setOnglet}
        options={[
          { value: 'todo', label: `${t('mobTaskTodo')} · ${nbAFaire}` },
          { value: 'done', label: `${t('mobTaskDone')} · ${groupes.done.length}` },
        ]}
      />

      {contenu}

      <section className={carte} style={styleCarte}>
        <button
          type="button"
          onClick={() => setCoursesOuvertes((v) => !v)}
          aria-expanded={coursesOuvertes}
          className="flex min-h-[44px] w-full cursor-pointer items-center justify-between border-0 bg-transparent px-4 font-mono text-[10px] tracking-[0.16em] uppercase"
          style={{ color: 'var(--mut)' }}
        >
          {t('mobShoppingN', { n: courses.length })}
          <ChevronDown
            size={14}
            aria-hidden="true"
            style={{
              transform: coursesOuvertes ? 'rotate(180deg)' : 'none',
              transition: 'transform .2s',
            }}
          />
        </button>
        {coursesOuvertes ? (
          <div className="border-t px-4 py-3" style={{ borderColor: 'var(--line)' }}>
            <ShoppingList nu />
          </div>
        ) : null}
      </section>
    </div>
  );
}
