import { describe, expect, it } from 'vitest';
import {
  countOverdue,
  groupProjectTasks,
  isOverdue,
  projectProgress,
  projectSubItems,
  PROJECT_STATUSES,
  type ProjectStatus,
  type ProjectTask,
} from '@/lib/domain';

/* Work est NEUF : il n'a pas d'oracle dans les 62 valeurs de référence. Ces
   tests posent donc la spécification — ce sont eux qui font foi si le calcul
   change un jour. */

const tache = (p: Partial<ProjectTask> & { id: string }): ProjectTask => ({
  projectId: 'p1',
  name: p.id,
  assignee: '',
  deadline: '',
  status: 'todo',
  note: '',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...p,
});

describe('groupProjectTasks', () => {
  it('rend TOUJOURS les trois clés, même vides', () => {
    /* Une clé absente ferait disparaître une colonne sans bruit — variante
       exacte du piège n°1 du CLAUDE.md. La vue doit pouvoir lire les trois
       sans se demander si elles existent. */
    const groupes = groupProjectTasks([]);
    for (const statut of PROJECT_STATUSES) {
      expect(groupes[statut], statut).toEqual([]);
    }
    expect(Object.keys(groupes)).toHaveLength(PROJECT_STATUSES.length);
  });

  it('range chaque tâche dans son statut, sans en perdre', () => {
    const taches = [
      tache({ id: 'a', status: 'todo' }),
      tache({ id: 'b', status: 'doing' }),
      tache({ id: 'c', status: 'done' }),
      tache({ id: 'd', status: 'todo' }),
    ];
    const g = groupProjectTasks(taches);
    expect(g.todo.map((t) => t.id)).toEqual(['a', 'd']);
    expect(g.doing.map((t) => t.id)).toEqual(['b']);
    expect(g.done.map((t) => t.id)).toEqual(['c']);

    /* Aucune tâche ne s'évapore : la somme des groupes vaut l'entrée. */
    const total = PROJECT_STATUSES.reduce((n, s) => n + g[s].length, 0);
    expect(total).toBe(taches.length);
  });
});

describe('projectProgress', () => {
  it('un projet SANS tâche affiche 0 %, jamais 100', () => {
    /* Règle 3 du CLAUDE.md : aucun chiffre affiché ne doit être fabriqué. Un
       0/0 qui rendrait 100 dirait « tout est fait » d'un projet où rien
       n'existe. */
    expect(projectProgress([])).toEqual({ done: 0, total: 0, pct: 0 });
  });

  it('compte les tâches réellement terminées', () => {
    const taches = [
      tache({ id: 'a', status: 'done' }),
      tache({ id: 'b', status: 'doing' }),
      tache({ id: 'c', status: 'todo' }),
      tache({ id: 'd', status: 'done' }),
    ];
    expect(projectProgress(taches)).toEqual({ done: 2, total: 4, pct: 50 });
  });

  it('« en cours » ne compte pas comme fait', () => {
    /* Un statut intermédiaire qui compterait à moitié serait précisément un
       chiffre fabriqué : personne ne sait ce que vaut « en cours ». */
    expect(projectProgress([tache({ id: 'a', status: 'doing' })]).pct).toBe(0);
  });
});

describe('isOverdue', () => {
  const AUJOURD_HUI = '2026-08-31';

  it('une échéance passée met la tâche en retard', () => {
    expect(isOverdue(tache({ id: 'a', deadline: '2026-08-30' }), AUJOURD_HUI)).toBe(true);
  });

  it('l’échéance du jour n’est pas en retard', () => {
    /* La journée n'est pas finie. Marquer en retard dès le matin ferait mentir
       le signal, et un signal qui crie pour tout cesse d'être lu. */
    expect(isOverdue(tache({ id: 'a', deadline: AUJOURD_HUI }), AUJOURD_HUI)).toBe(false);
  });

  it('une tâche TERMINÉE n’est jamais en retard, même livrée après', () => {
    /* Elle est faite. Signaler en rouge un travail achevé n'apprend rien. */
    expect(isOverdue(tache({ id: 'a', deadline: '2026-01-01', status: 'done' }), AUJOURD_HUI)).toBe(
      false,
    );
  });

  it('sans échéance, rien n’est en retard', () => {
    /* L'absence de date n'est pas une date passée. `''` se compare pourtant
       comme « plus petit que tout » en lexicographie : sans le garde-fou,
       TOUTES les tâches sans échéance viraient au rouge. */
    expect(isOverdue(tache({ id: 'a', deadline: '' }), AUJOURD_HUI)).toBe(false);
  });

  it('countOverdue ne compte que celles-là', () => {
    const taches = [
      tache({ id: 'a', deadline: '2026-08-01' }),
      tache({ id: 'b', deadline: '2026-08-02', status: 'done' }),
      tache({ id: 'c', deadline: '' }),
      tache({ id: 'd', deadline: '2026-12-01' }),
      tache({ id: 'e', deadline: '2026-08-03', status: 'doing' }),
    ];
    expect(countOverdue(taches, AUJOURD_HUI)).toBe(2);
  });
});

describe('les statuts sont déclarés une seule fois', () => {
  it('la constante porte exactement les trois états convenus', () => {
    /* Si ce test casse, c'est qu'un statut a été ajouté ou retiré. Alors
       `groupProjectTasks`, la vue, l'éditeur et l'import doivent être relus —
       pas seulement le test. */
    expect(PROJECT_STATUSES).toEqual(['todo', 'doing', 'done']);
    const _exhaustif: ProjectStatus[] = ['todo', 'doing', 'done'];
    expect(_exhaustif).toHaveLength(PROJECT_STATUSES.length);
  });
});

describe('projectSubItems', () => {
  it('rend une liste vide pour une étape écrite AVANT le lot B', () => {
    /* Une étape d'avant ce lot n'a pas le champ — ni en base locale, ni dans
       une ligne reçue d'un appareil resté en arrière (la synchronisation
       transporte l'entité telle quelle, sans validation). Lire `.length` sur
       `undefined` planterait le tableau ; c'est ici, et ici seulement, que
       l'absence est défaite. */
    expect(projectSubItems(tache({ id: 'a' }))).toEqual([]);
  });

  it('rend la liste telle quelle quand elle existe', () => {
    const items = [{ label: 'Menu mobile', done: false }];
    expect(projectSubItems(tache({ id: 'a', subItems: items }))).toEqual(items);
  });
});
