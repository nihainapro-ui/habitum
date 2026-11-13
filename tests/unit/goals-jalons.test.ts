import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { goalsRepo } from '@/lib/data';
import { aUneDuree, basculerJalon, partagerObjectifs, type Goal } from '@/lib/domain';
import { useStore } from '@/lib/store';
import { DEMO_NOW } from '@/tests/fixtures/demo-seed';

/* Refonte mobile, P3 lot 2 — trois fonctions NEUVES du domaine, donc sans
   oracle dans le prototype : ces tests posent leur spécification. Et l'action
   du store qui rend les jalons cochables (arbitrage n° 5 du 18/09/2026). */

const objectif = (over: Partial<Goal> = {}): Goal => ({
  id: 'o',
  name: 'Club de lecture',
  kind: 'milestones',
  category: 'work',
  target: 0,
  unit: '',
  milestones: [
    { label: 'Choisir le format', done: true },
    { label: 'Réserver la salle', done: false },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('basculerJalon', () => {
  it('bascule le jalon visé, et lui seul', () => {
    const g = objectif();
    expect(basculerJalon(g, 1)).toEqual([
      { label: 'Choisir le format', done: true },
      { label: 'Réserver la salle', done: true },
    ]);
    expect(basculerJalon(g, 0)![0]!.done).toBe(false);
  });

  it('rend une liste NEUVE sans toucher à celle de l’objectif', () => {
    /* Le store compare des références, et l'annulation s'appuie dessus : une
       liste modifiée en place serait une modification invisible. */
    const g = objectif();
    const avant = g.milestones!;
    const apres = basculerJalon(g, 1)!;
    expect(apres).not.toBe(avant);
    expect(avant[1]!.done).toBe(false);
  });

  it('ne rend rien quand il n’y a rien à basculer', () => {
    expect(basculerJalon(objectif(), 9)).toBeNull();
    expect(basculerJalon(objectif(), -1)).toBeNull();
    expect(basculerJalon(objectif(), 0.5)).toBeNull();
    const { milestones: _m, ...sansJalons } = objectif();
    expect(basculerJalon(sansJalons, 0)).toBeNull();
  });
});

describe('partagerObjectifs', () => {
  it('range à 100 % dans « atteints », le reste dans « en cours »', () => {
    const fini = objectif({ id: 'fini', milestones: [{ label: 'a', done: true }] });
    const enRoute = objectif({ id: 'route' });
    const { enCours, atteints } = partagerObjectifs([fini, enRoute], [], new Map(), DEMO_NOW);
    expect(atteints.map((g) => g.id)).toEqual(['fini']);
    expect(enCours.map((g) => g.id)).toEqual(['route']);
  });

  it('laisse EN COURS un objectif à l’échéance dépassée', () => {
    /* Il n'est pas atteint : le ranger ailleurs le ferait disparaître de la
       liste où l'on s'attend à le retrouver. */
    const depasse = objectif({ id: 'tard', start: '2026-01-01', deadline: '2026-02-01' });
    const { enCours, atteints } = partagerObjectifs([depasse], [], new Map(), DEMO_NOW);
    expect(enCours).toHaveLength(1);
    expect(atteints).toHaveLength(0);
  });
});

describe('aUneDuree', () => {
  it('exige un début ET une échéance, dans l’ordre', () => {
    expect(aUneDuree(objectif({ start: '2026-06-01', deadline: '2026-09-15' }))).toBe(true);
    /* Sans l'un des deux, `goalElapsed` rend 0,5 par convention : l'afficher
       serait fabriquer un chiffre. */
    expect(aUneDuree(objectif({ start: '2026-06-01' }))).toBe(false);
    expect(aUneDuree(objectif({ deadline: '2026-09-15' }))).toBe(false);
    expect(aUneDuree(objectif())).toBe(false);
    expect(aUneDuree(objectif({ start: '2026-09-15', deadline: '2026-06-01' }))).toBe(false);
  });
});

describe('toggleMilestone', () => {
  beforeEach(async () => {
    if (db.isOpen()) db.close();
    await db.delete();
    await db.open();
    useStore.setState(useStore.getInitialState());
  });

  const creer = async () => {
    const { id: _i, createdAt: _c, updatedAt: _u, ...entree } = objectif();
    await useStore.getState().createGoal(entree);
    return useStore.getState().goals[0]!;
  };

  it('coche le jalon à l’écran ET en base, avec un toast annulable', async () => {
    const g = await creer();

    await useStore.getState().toggleMilestone(g.id, 1);

    expect(useStore.getState().goals[0]!.milestones![1]!.done).toBe(true);
    expect((await goalsRepo.get(g.id))!.milestones![1]!.done).toBe(true);
    const toast = useStore.getState().ui.toast!;
    expect(toast.messageKey).toBe('app.msChecked');
    expect(toast.label).toBe('Réserver la salle');
  });

  it('l’annulation le décoche, en base aussi', async () => {
    const g = await creer();
    await useStore.getState().toggleMilestone(g.id, 1);

    await useStore.getState().ui.toast!.undo!();

    expect(useStore.getState().goals[0]!.milestones![1]!.done).toBe(false);
    expect((await goalsRepo.get(g.id))!.milestones![1]!.done).toBe(false);
  });

  it('décocher s’annonce autrement que cocher', async () => {
    const g = await creer();
    await useStore.getState().toggleMilestone(g.id, 0);
    expect(useStore.getState().ui.toast!.messageKey).toBe('app.msUnchecked');
  });

  it('ne fait rien — ni écriture ni toast — pour une position hors liste', async () => {
    const g = await creer();
    const avant = (await goalsRepo.get(g.id))!.updatedAt;
    await useStore.getState().toggleMilestone(g.id, 7);
    expect((await goalsRepo.get(g.id))!.updatedAt).toBe(avant);
    expect(useStore.getState().ui.toast).toBeNull();
  });
});
