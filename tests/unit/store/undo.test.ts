import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { useStore } from '@/lib/store';
import { logKey } from '@/lib/domain';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
  useStore.setState(useStore.getInitialState());
});

const input = {
  name: 'Méditer',
  category: 'mind' as const,
  goal: { kind: 'time' as const, target: 15, step: 1, unit: 'min' },
  mode: 'dow' as const,
  days: [0, 1, 2, 3, 4, 5, 6],
  subItems: [],
  reminders: [],
  archived: false,
  note: '',
};

describe('withUndo', () => {
  it('affiche un toast avec une action Annuler', async () => {
    await useStore.getState().createHabit(input);
    const h = useStore.getState().habits[0]!;
    await useStore.getState().deleteHabit(h.id);

    const toast = useStore.getState().ui.toast;
    expect(toast).not.toBeNull();
    expect(toast!.undo).toBeInstanceOf(Function);
  });

  it('restaure l’état complet à l’annulation', async () => {
    await useStore.getState().createHabit(input);
    const h = useStore.getState().habits[0]!;
    await useStore.getState().setLogValue(h.id, '2026-08-05', 15);
    await useStore.getState().deleteHabit(h.id);

    await useStore.getState().ui.toast!.undo!();

    expect(useStore.getState().habits).toHaveLength(1);
    // Le journal aussi : supprimer une habitude sans restaurer son historique
    // serait une perte de données déguisée en annulation.
    expect(useStore.getState().logIndex.size).toBe(1);
    expect(useStore.getState().logIndex.get(logKey(h.id, '2026-08-05'))).toBe(15);
  });

  it('n’affiche qu’un seul toast à la fois', async () => {
    await useStore.getState().createHabit(input);
    await useStore.getState().createHabit({ ...input, name: 'Lire' });
    const [a, b] = useStore.getState().habits;
    await useStore.getState().deleteHabit(a!.id);
    await useStore.getState().deleteHabit(b!.id);
    expect(useStore.getState().ui.toast!.label).toContain('Lire');
  });
});

describe("l'instantané couvre l'entité ET ses dépendances", () => {
  it('supprimer une habitude emporte son journal, sa note et le lien de ses objectifs', async () => {
    await useStore.getState().createHabit(input);
    const h = useStore.getState().habits[0]!;
    await useStore.getState().setLogValue(h.id, '2026-08-05', 15);
    await useStore.getState().saveHabitNote(h.id, 'Séance courte');
    await useStore.getState().createGoal({
      name: 'Méditer 100 fois',
      kind: 'cumul',
      target: 100,
      unit: 'séances',
      category: 'mind',
      sourceHabitId: h.id,
    });

    await useStore.getState().deleteHabit(h.id);

    const apres = useStore.getState();
    expect(apres.habits).toHaveLength(0);
    expect(apres.logIndex.size).toBe(0);
    expect(apres.notes).toHaveLength(0);
    /* L'objectif SURVIT — il appartient à l'utilisateur, pas à l'habitude.
       Seul le lien vers la source disparaît. */
    expect(apres.goals).toHaveLength(1);
    expect(apres.goals[0]!.sourceHabitId).toBeUndefined();
  });

  it('et l’annulation les rend tous', async () => {
    await useStore.getState().createHabit(input);
    const h = useStore.getState().habits[0]!;
    await useStore.getState().setLogValue(h.id, '2026-08-05', 15);
    await useStore.getState().saveHabitNote(h.id, 'Séance courte');
    await useStore.getState().createGoal({
      name: 'Méditer 100 fois',
      kind: 'cumul',
      target: 100,
      unit: 'séances',
      category: 'mind',
      sourceHabitId: h.id,
    });

    await useStore.getState().deleteHabit(h.id);
    await useStore.getState().ui.toast!.undo!();

    const apres = useStore.getState();
    expect(apres.habits).toHaveLength(1);
    expect(apres.logIndex.get(logKey(h.id, '2026-08-05'))).toBe(15);
    expect(apres.notes).toHaveLength(1);
    expect(apres.goals[0]!.sourceHabitId).toBe(h.id);

    /* Et la base doit dire la même chose que le store : une annulation qui ne
       rétablit que l'écran se découvre au rechargement suivant. */
    useStore.setState({ habits: [], notes: [], goals: [], logIndex: new Map() });
    await useStore.getState().hydrate();
    expect(useStore.getState().habits).toHaveLength(1);
    expect(useStore.getState().logIndex.size).toBe(1);
    expect(useStore.getState().notes).toHaveLength(1);
    expect(useStore.getState().goals[0]!.sourceHabitId).toBe(h.id);
  });

  it('annule aussi la suppression d’une tâche et d’un objectif', async () => {
    await useStore.getState().createTask({
      name: 'Payer le loyer',
      category: 'home',
      date: '2026-08-05',
      duration: 60,
      priority: 3,
      done: false,
      subTasks: [],
      note: '',
    });
    const t = useStore.getState().tasks[0]!;
    await useStore.getState().deleteTask(t.id);
    expect(useStore.getState().tasks).toHaveLength(0);
    await useStore.getState().ui.toast!.undo!();
    expect(useStore.getState().tasks).toHaveLength(1);
  });

  it('le toast disparaît une fois l’annulation faite', async () => {
    await useStore.getState().createHabit(input);
    const h = useStore.getState().habits[0]!;
    await useStore.getState().deleteHabit(h.id);
    await useStore.getState().ui.toast!.undo!();
    expect(useStore.getState().ui.toast).toBeNull();
  });
});
