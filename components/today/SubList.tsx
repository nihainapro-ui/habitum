'use client';

import { useTranslations } from 'next-intl';
import { RowCheck } from './RowCheck';

/* Sous-liste dépliable — sous-tâches d'une tâche, sous-éléments d'une
   habitude de type `list`.

   SA POSTURE PAR DÉFAUT DIFFÈRE SELON QUI L'APPELLE, et c'est volontaire.
   Sur Aujourd'hui (`HabitRow`) et Tâches (`TaskRow`, `TaskItem`), elle est
   TOUJOURS OUVERTE : une ligne n'y porte qu'une seule liste, la replier
   n'économiserait rien. Sur le tableau de projet de Work (`ProjectBoard`),
   elle est REPLIÉE derrière un chevron, en état local à la ligne : trois
   colonnes de sous-listes ouvertes d'office rendraient une colonne de
   plusieurs étapes illisible sur téléphone. Ce n'est pas un oubli sur les
   trois premiers appelants, c'est Work qui est le cas particulier — leur
   comportement ne change pas ici. */

export interface SousElement {
  label: string;
  done: boolean;
}

export function SubList({
  items,
  disabled,
  onToggle,
  indent = 38,
  id,
}: {
  items: readonly SousElement[];
  disabled?: boolean;
  onToggle: (index: number) => void;
  /** Décalage à gauche, en pixels. 38 = largeur de la case à cocher qui ouvre
   *  les lignes d'Aujourd'hui et de Tâches, sous laquelle la sous-liste
   *  s'aligne. Le tableau de projet n'a pas cette case : il passe 0. */
  indent?: number | undefined;
  /** Cible d'un `aria-controls` posé par l'appelant sur le bouton qui déplie
   *  la liste. Aucun des trois appelants d'Aujourd'hui et de Tâches n'a de
   *  bouton de pli — la liste y est toujours ouverte — donc aucun n'a besoin
   *  de le passer ; seul `ProjectBoard` le fait. */
  id?: string | undefined;
}) {
  const t = useTranslations('app');
  if (items.length === 0) return null;

  return (
    <ul
      id={id}
      className="m-0 flex list-none flex-col gap-2 border-t p-0 pt-2.5"
      style={{ borderColor: 'var(--line)', paddingLeft: indent }}
      aria-label={t('toggleSub')}
    >
      {items.map((s, i) => (
        <li key={`${s.label}-${i}`} className="flex items-center gap-2.5">
          <RowCheck
            size={18}
            name={s.label}
            checked={s.done}
            disabled={disabled}
            onToggle={() => onToggle(i)}
          />
          <span
            className="text-[12.5px]"
            style={{
              color: s.done ? 'var(--mut)' : 'var(--txt2)',
              textDecoration: s.done ? 'line-through' : 'none',
            }}
          >
            {s.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
