'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Pencil } from 'lucide-react';
import {
  groupProjectTasks,
  isOverdue,
  projectProgress,
  projectSubItems,
  PROJECT_STATUSES,
  subItemCount,
  type DateKey,
  type Project,
  type ProjectStatus,
  type ProjectTask,
} from '@/lib/domain';
import { useStore } from '@/lib/store';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/shell/empty-state';
import { PrimaryButton } from '@/components/shell/primary-button';
import { SubList } from '@/components/today/SubList';

/* Les étapes d'un projet, rangées par statut.

   TROIS SECTIONS EMPILÉES sous 1060 px, TROIS COLONNES au-dessus. Pas de
   glisser-déposer : il est hostile au doigt, exige un piège de focus et une
   alternative clavier complète, et n'apporte rien qu'un sélecteur de statut sur
   la ligne ne donne déjà — lequel marche au clavier sans rien ajouter.

   Les colonnes viennent de `PROJECT_STATUSES`, jamais d'une liste écrite ici :
   c'est la garantie qu'un statut ajouté un jour aura sa colonne (piège n°1). */

export function ProjectBoard({
  projet,
  taches,
  aujourdHui,
}: {
  projet: Project;
  taches: ProjectTask[];
  aujourdHui: DateKey;
}) {
  const t = useTranslations('app');
  const openEditor = useStore((s) => s.openEditor);

  const groupes = groupProjectTasks(taches);
  const av = projectProgress(taches);

  const nouvelle = (
    <PrimaryButton
      onClick={() => openEditor({ kind: 'projectTask', id: null, parentId: projet.id })}
    >
      {t('newPTask')}
    </PrimaryButton>
  );

  return (
    <div className="flex flex-col gap-4">
      <header
        className="rounded-panel flex flex-wrap items-center gap-3 border px-4 py-3.5"
        style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
      >
        <h2 className="m-0 min-w-0 flex-1 truncate text-[15px] font-semibold">{projet.name}</h2>
        <span className="font-mono text-[11px] whitespace-nowrap" style={{ color: 'var(--acc2)' }}>
          {av.pct}%
        </span>
        <span className="font-mono text-[11px] whitespace-nowrap" style={{ color: 'var(--mut)' }}>
          {t('projProgress', { done: av.done, total: av.total })}
        </span>
      </header>

      {taches.length === 0 ? (
        <EmptyState titleKey="app.emPTaskT" bodyKey="app.emPTaskD" action={nouvelle} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 min-[1060px]:grid-cols-3">
          {PROJECT_STATUSES.map((statut) => (
            <Colonne
              key={statut}
              statut={statut}
              taches={groupes[statut]}
              aujourdHui={aujourdHui}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Colonne({
  statut,
  taches,
  aujourdHui,
}: {
  statut: ProjectStatus;
  taches: ProjectTask[];
  aujourdHui: DateKey;
}) {
  const t = useTranslations('app');

  return (
    <section
      data-colonne={statut}
      aria-label={t(`st_${statut}`)}
      className="rounded-panel overflow-hidden border"
      style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
    >
      <header
        className="flex items-center gap-3 border-b px-4 py-3.5"
        style={{ borderColor: 'var(--line)' }}
      >
        <h3
          className="m-0 flex-1 font-mono text-[9.5px] font-normal tracking-[0.18em] uppercase"
          style={{ color: 'var(--mut)' }}
        >
          {t(`st_${statut}`)}
        </h3>
        <span className="font-mono text-[10px]" style={{ color: 'var(--acc2)' }}>
          {taches.length}
        </span>
      </header>

      {/* Une colonne vide reste VISIBLE : elle dit « rien ici », ce qui est une
          information. La masquer ferait sauter les colonnes d'une largeur à
          l'autre à chaque changement de statut. */}
      <ul className="m-0 flex list-none flex-col p-0">
        {taches.map((tache) => (
          <LigneTache key={tache.id} tache={tache} aujourdHui={aujourdHui} />
        ))}
      </ul>
    </section>
  );
}

function LigneTache({ tache, aujourdHui }: { tache: ProjectTask; aujourdHui: DateKey }) {
  const t = useTranslations('app');
  const setProjectTaskStatus = useStore((s) => s.setProjectTaskStatus);
  const openEditor = useStore((s) => s.openEditor);
  const toggleProjectSubItem = useStore((s) => s.toggleProjectSubItem);
  /* Replié par défaut, état LOCAL à la ligne : trois colonnes de listes
     ouvertes rendraient le tableau illisible sur téléphone, et le pli d'une
     ligne n'intéresse ni la base ni les autres appareils. */
  const [deplie, setDeplie] = useState(false);

  const enRetard = isOverdue(tache, aujourdHui);
  const sous = subItemCount(tache);
  /* Assemblé en JavaScript et non en JSX : « / » entre deux accolades est un
     littéral, que `react/jsx-no-literals` refuse. Même forme que `TaskItem`. */
  const avancement = sous ? `${sous.done}/${sous.total}` : '';
  /* Dérivé de `tache.id`, pas d'un index de liste : un `id` stable évite que
     `aria-controls` pointe sur le mauvais nœud après un tri ou un filtrage. */
  const idSousListe = `ptask-sub-${tache.id}`;

  return (
    <li
      data-ptask
      className="flex flex-col gap-2 border-b px-3 py-3 last:border-b-0 md:px-4"
      style={{ borderColor: 'var(--line)' }}
    >
      <div className="flex items-start gap-3">
        <span
          className="min-w-0 flex-1 text-[13px] font-medium"
          style={{
            color: tache.status === 'done' ? 'var(--mut)' : 'var(--txt)',
            textDecoration: tache.status === 'done' ? 'line-through' : 'none',
          }}
        >
          {tache.name}
        </span>
        {sous ? (
          <button
            type="button"
            onClick={() => setDeplie((x) => !x)}
            aria-expanded={deplie}
            aria-controls={idSousListe}
            /* Le compteur visible (`avancement`) reste dans le nom accessible,
               à la suite du libellé : sans lui, qui pilote à la voix prononce
               « 1/3 » à l'écran mais ne déclenche rien à la commande, faute de
               le retrouver dans le nom du contrôle (WCAG 2.5.3, Label in
               Name). Le préfixe `${t('subA')} : ${tache.name}` reste identique
               à ce qu'il était : les sélecteurs Playwright qui le cherchent en
               SOUS-CHAÎNE continuent de matcher. */
            aria-label={`${t('subA')} : ${tache.name} — ${avancement}`}
            className="rounded-btn-sm flex h-7 flex-none cursor-pointer items-center gap-1 border px-1.5"
            style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
          >
            <span className="font-mono text-[11px] whitespace-nowrap">{avancement}</span>
            <ChevronDown
              size={12}
              aria-hidden="true"
              style={{ transform: deplie ? 'rotate(180deg)' : 'none' }}
            />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => openEditor({ kind: 'projectTask', id: tache.id })}
          aria-label={t('editFor', { name: tache.name })}
          className="rounded-btn-sm grid h-7 w-7 flex-none cursor-pointer place-items-center border"
          style={{ borderColor: 'var(--line)', color: 'var(--mut)' }}
        >
          <Pencil size={12} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10.5px]">
        <span className="whitespace-nowrap" style={{ color: 'var(--mut)' }}>
          {tache.assignee || t('noAssignee')}
        </span>
        {tache.deadline ? (
          <span
            className="whitespace-nowrap"
            /* L'échéance passe au rouge SEULEMENT si elle est dépassée et la
               tâche non terminée — c'est `isOverdue` qui tranche, pas la vue. */
            style={{ color: enRetard ? 'var(--bad)' : 'var(--mut)' }}
          >
            · {tache.deadline}
          </span>
        ) : null}
      </div>

      {/* Le statut se change SUR LA LIGNE : c'est le geste le plus fréquent de
          la vue, et le faire passer par l'éditeur coûterait quatre clics là où
          un seul suffit.

          LE MENU MAISON, PAS UN `<select>` NATIF. Le panneau d'un select natif
          est dessiné par le système, hors d'atteinte du CSS : il sortait blanc
          opaque avec une ligne survolée en bleu système, dans les trois thèmes.
          `tests/e2e/select.spec.ts` exige d'ailleurs qu'aucune vue n'en
          contienne plus. */}
      <Select
        value={tache.status}
        options={PROJECT_STATUSES.map((s) => ({ value: s, label: t(`st_${s}`) }))}
        onChange={(s) => void setProjectTaskStatus(tache.id, s)}
        label={`${t('status')} : ${tache.name}`}
        variant="inline"
      />

      {sous && deplie ? (
        /* `indent={0}` : la ligne du tableau n'a pas de case à cocher en tête,
           donc rien sous quoi aligner la sous-liste. `id={idSousListe}` est la
           cible de l'`aria-controls` posé sur le bouton ci-dessus. */
        <SubList
          items={projectSubItems(tache)}
          indent={0}
          id={idSousListe}
          onToggle={(i) => void toggleProjectSubItem(tache.id, i)}
        />
      ) : null}
    </li>
  );
}
