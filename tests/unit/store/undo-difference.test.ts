import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { habitsRepo, logsRepo, projectsRepo, projectTasksRepo, tasksRepo } from '@/lib/data';
import { useStore } from '@/lib/store';
import { logKey } from '@/lib/domain';

/* ============================================================================
   Phase 1 — l'annulation ne défait que ce que l'action a fait (12 nov. 2026).

   Avant, annuler réécrivait toute la base à partir d'une photo. Les tests
   existants ne le voyaient pas : ils ne regardaient que l'entité annulée. Ceux
   d'ici regardent CE QUI NE DEVAIT PAS BOUGER.
   ========================================================================= */

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
  useStore.setState(useStore.getInitialState());
});

const habitude = (name: string) => ({
  name,
  category: 'mind' as const,
  goal: { kind: 'check' as const, target: 1, step: 1, unit: '' },
  mode: 'dow' as const,
  days: [0, 1, 2, 3, 4, 5, 6],
  subItems: [],
  reminders: [],
  archived: false,
  note: '',
});

const tache = (name: string) => ({
  name,
  category: 'home' as const,
  date: '2026-08-05',
  duration: 60,
  priority: 2 as const,
  done: false,
  subTasks: [],
  note: '',
});

const annuler = () => useStore.getState().ui.toast!.undo!();
const pause = () => new Promise((r) => setTimeout(r, 3));

describe('ce qui n’a pas été touché n’est pas réécrit', () => {
  it('laisse intact l’horodatage des autres entités', async () => {
    /* C'est l'horodatage qui arbitre la synchronisation : une habitude
       réhorodatée par une annulation qui ne la concernait pas écrasait, au
       passage suivant, ce qu'un autre appareil en avait fait. */
    await useStore.getState().createHabit(habitude('À supprimer'));
    await useStore.getState().createHabit(habitude('Spectatrice'));
    const [a, b] = useStore.getState().habits;
    await useStore.getState().setLogValue(b!.id, '2026-08-05', 1);
    const avant = (await habitsRepo.listAll()).find((h) => h.id === b!.id)!.updatedAt;
    const journalAvant = (await logsRepo.get(b!.id, '2026-08-05'))!.updatedAt;
    await pause();

    await useStore.getState().deleteHabit(a!.id);
    await annuler();

    expect((await habitsRepo.listAll()).find((h) => h.id === b!.id)!.updatedAt).toBe(avant);
    expect((await logsRepo.get(b!.id, '2026-08-05'))!.updatedAt).toBe(journalAvant);
    expect(useStore.getState().habits).toHaveLength(2);
  });

  it('garde ce qui a été fait entre l’action et son annulation', async () => {
    await useStore.getState().createHabit(habitude('Supprimée'));
    await useStore.getState().createHabit(habitude('Cochée ensuite'));
    const [a, b] = useStore.getState().habits;

    await useStore.getState().deleteHabit(a!.id);
    const annulation = useStore.getState().ui.toast!.undo!;
    /* Dans les six secondes du toast, un autre geste. */
    await useStore.getState().setLogValue(b!.id, '2026-08-06', 1);
    await annulation();

    const apres = useStore.getState();
    expect(apres.habits.map((h) => h.name).sort()).toEqual(['Cochée ensuite', 'Supprimée']);
    expect(apres.logIndex.get(logKey(b!.id, '2026-08-06'))).toBe(1);
    expect((await logsRepo.get(b!.id, '2026-08-06'))?.deletedAt).toBeUndefined();
  });
});

describe('journal partiel', () => {
  it('ne pose AUCUNE pierre tombale sur l’historique que la mémoire n’avait pas', async () => {
    /* LE DÉFAUT LE PLUS GRAVE DE L'AUDIT. À l'ouverture sans instantané, la
       mémoire ne tient que 420 jours. L'ancienne annulation relisait TOUTE la
       table et effaçait ce qui n'était pas dans sa photo : des années de
       suivi, pour avoir annulé une coche. */
    await useStore.getState().createHabit(habitude('Ancienne'));
    const h = useStore.getState().habits[0]!;
    await logsRepo.putRaw({
      habitId: h.id,
      date: '2021-03-04',
      value: 1,
      updatedAt: '2021-03-04T08:00:00.000Z',
    });
    /* La mémoire ignore cette ligne — exactement l'état d'une ouverture de repli. */
    useStore.setState({ logIndexComplete: false });

    await useStore.getState().toggleHabitAnnulable(h.id, '2026-08-05');
    await annuler();

    const ancienne = await logsRepo.get(h.id, '2021-03-04');
    expect(ancienne?.deletedAt).toBeUndefined();
    expect(ancienne?.updatedAt).toBe('2021-03-04T08:00:00.000Z');
    /* Et la coche, elle, est bien défaite. */
    expect(useStore.getState().logIndex.has(logKey(h.id, '2026-08-05'))).toBe(false);
    expect((await logsRepo.get(h.id, '2026-08-05'))?.deletedAt).toBeTruthy();
  });
});

describe('Work et occurrences sont restaurés, pas seulement photographiés', () => {
  it('rend le projet et ses tâches à l’écran ET en base', async () => {
    await useStore.getState().createProject({ name: 'Refonte', note: '' });
    const p = useStore.getState().projects[0]!;
    await useStore.getState().createProjectTask({
      projectId: p.id,
      name: 'Cadrer',
      assignee: '',
      deadline: '',
      status: 'todo',
      note: '',
    });

    await useStore.getState().deleteProject(p.id);
    expect(useStore.getState().projects).toHaveLength(0);
    await annuler();

    expect(useStore.getState().projects).toHaveLength(1);
    expect(useStore.getState().projectTasks).toHaveLength(1);
    expect(await projectsRepo.list()).toHaveLength(1);
    expect(await projectTasksRepo.list()).toHaveLength(1);
  });

  it('défait l’occurrence d’une tâche récurrente', async () => {
    await useStore.getState().createTask({ ...tache('Arroser'), recurrence: { freq: 'daily' } });
    const t = useStore.getState().tasks[0]!;

    await useStore.getState().toggleTaskOnAnnulable(t.id, '2026-08-05');
    expect(useStore.getState().occurrences.size).toBe(1);
    await annuler();

    expect(useStore.getState().occurrences.size).toBe(0);
    expect(useStore.getState().tasks[0]!.date).toBe('2026-08-05');
    /* La base dit la même chose après rechargement. */
    await useStore.getState().hydrate();
    expect(useStore.getState().occurrences.size).toBe(0);
    expect(useStore.getState().tasks[0]!.date).toBe('2026-08-05');
  });
});

describe('un champ ajouté par l’action repart avec elle', () => {
  it('retire l’heure posée par un déplacement', async () => {
    await useStore.getState().createTask(tache('Sans heure'));
    const t = useStore.getState().tasks[0]!;

    await useStore.getState().moveTask(t.id, '2026-08-07', '14:00');
    await annuler();

    const enBase = (await tasksRepo.list())[0]!;
    expect(enBase.date).toBe('2026-08-05');
    expect('time' in enBase).toBe(false);
    expect('time' in useStore.getState().tasks[0]!).toBe(false);
  });
});
