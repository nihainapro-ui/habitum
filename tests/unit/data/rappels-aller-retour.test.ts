import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import {
  exportToJson,
  habitsRepo,
  importFromJson,
  goalsRepo,
  projectsRepo,
  projectTasksRepo,
  tasksRepo,
} from '@/lib/data';

/* ============================================================================
   LES RAPPELS PAR ENTITÉ TRAVERSENT-ILS LA SAUVEGARDE ?

   Ce fichier est écrit AVANT les champs qu'il vérifie, et c'est délibéré :
   c'est le piège n°1 du CLAUDE.md sous sa forme la plus coûteuse. L'export et
   l'import énumèrent les champs UN PAR UN ; un champ ajouté au domaine mais
   oublié là disparaît en silence à chaque aller-retour, et personne ne s'en
   aperçoit avant d'avoir eu besoin de sa sauvegarde.

   Le lot B l'avait payé pour les sous-tâches de projet. On ne le repaie pas.
   ========================================================================= */

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

const jeuComplet = async () => {
  await tasksRepo.create({
    name: 'Dentiste',
    category: 'health',
    date: '2026-09-10',
    time: '14:30',
    duration: 60,
    priority: 2,
    done: false,
    /* Une tâche qui ne doit PAS sonner, et une sous-tâche qui, elle, sonne à
       sa propre date et à sa propre heure. */
    notify: false,
    subTasks: [
      { label: 'Prendre la carte vitale', done: false, date: '2026-09-09', time: '18:00' },
      { label: 'Sans rappel', done: true, notify: false },
    ],
    note: '',
  } as never);

  await habitsRepo.create({
    name: 'Méditer',
    category: 'mind',
    goal: { kind: 'check', target: 1, step: 1, unit: '' },
    mode: 'dow',
    days: [0, 1, 2, 3, 4, 5, 6],
    subItems: [],
    reminders: ['07:00'],
    /* Muette, mais ses heures restent : c'est exactement ce que l'aller-retour
       doit préserver — perdre `nt` rallumerait une habitude qu'on avait tue. */
    notify: false,
    archived: false,
    note: '',
  } as never);

  const projet = await projectsRepo.create({ name: 'Refonte', note: '' });
  await projectTasksRepo.create({
    projectId: projet.id,
    name: 'Livrer la maquette',
    assignee: '',
    deadline: '2026-09-12',
    status: 'todo',
    note: '',
    /* Heure PROPRE à l'étape : c'est tout l'intérêt du réglage par entité,
       une échéance ne portant aucune heure par elle-même. */
    remindAt: '07:45',
    subItems: [{ label: 'Relire les libellés', done: false, date: '2026-09-11', time: '09:15' }],
  } as never);

  await goalsRepo.create({
    name: '10 000 pas',
    kind: 'cumul',
    target: 10000,
    unit: 'pas',
    category: 'sport',
    deadline: '2026-09-30',
    remindAt: '20:00',
  } as never);
};

describe('aller-retour des rappels par entité', () => {
  it('les écrit dans la sauvegarde', async () => {
    await jeuComplet();
    const charge = await exportToJson();

    expect(charge.tasks[0]?.nt).toBe(false);
    expect(charge.tasks[0]?.sub[0]?.d).toBe('2026-09-09');
    expect(charge.tasks[0]?.sub[0]?.time).toBe('18:00');
    expect(charge.tasks[0]?.sub[1]?.nt).toBe(false);
    expect(charge.ptask[0]?.ra).toBe('07:45');
    expect(charge.ptask[0]?.sub[0]?.time).toBe('09:15');
    expect(charge.obj[0]?.ra).toBe('20:00');
    expect(charge.habits[0]?.nt).toBe(false);
  });

  it('les relit à l’identique — c’est l’aller-retour qui compte', async () => {
    await jeuComplet();
    const charge = await exportToJson();

    if (db.isOpen()) db.close();
    await db.delete();
    await db.open();
    await importFromJson(JSON.stringify(charge));

    const [tache] = await tasksRepo.list();
    expect(tache?.notify).toBe(false);
    expect(tache?.subTasks[0]).toEqual({
      label: 'Prendre la carte vitale',
      done: false,
      date: '2026-09-09',
      time: '18:00',
    });
    expect(tache?.subTasks[1]?.notify).toBe(false);

    const [etape] = await projectTasksRepo.list();
    expect(etape?.remindAt).toBe('07:45');
    expect(etape?.subItems?.[0]?.time).toBe('09:15');
    expect(etape?.subItems?.[0]?.date).toBe('2026-09-11');

    const [objectif] = await goalsRepo.list();
    expect(objectif?.remindAt).toBe('20:00');

    const [habitude] = await habitsRepo.list();
    expect(habitude?.notify).toBe(false);
    expect(habitude?.reminders).toEqual(['07:00']);
  });

  it('n’invente rien quand rien n’est réglé', async () => {
    /* L'absence doit rester l'absence : un `notify: true` écrit d'office
       ferait croire à un choix que personne n'a fait, et un `remindAt` vide
       deviendrait une heure. */
    await tasksRepo.create({
      name: 'Ordinaire',
      category: 'work',
      date: '2026-09-10',
      duration: 60,
      priority: 2,
      done: false,
      subTasks: [{ label: 'étape', done: false }],
      note: '',
    } as never);

    const charge = await exportToJson();
    expect(charge.tasks[0]).not.toHaveProperty('nt');
    expect(charge.tasks[0]).not.toHaveProperty('ra');
    expect(charge.tasks[0]?.sub[0]).not.toHaveProperty('d');

    if (db.isOpen()) db.close();
    await db.delete();
    await db.open();
    await importFromJson(JSON.stringify(charge));

    const [tache] = await tasksRepo.list();
    expect(tache).not.toHaveProperty('notify');
    expect(tache?.subTasks[0]).toEqual({ label: 'étape', done: false });
  });

  it('relit une sauvegarde d’AVANT ces champs sans broncher', async () => {
    /* Le cas qui casse une application en production : un fichier exporté par
       la version précédente. Il n'a ni `nt`, ni `ra`, ni date de sous-tâche. */
    const ancienne = {
      app: 'Habitum',
      v: 1,
      exported: '2026-09-01T00:00:00.000Z',
      habits: [],
      tasks: [
        {
          id: 't1',
          fr: 'Ancienne',
          en: 'Old',
          cat: 'work',
          d: '2026-09-10',
          dur: 60,
          prio: 2,
          done: false,
          sub: [{ fr: 'a', en: 'a', done: false }],
          note: '',
        },
      ],
      obj: [],
      log: {},
      ov: {},
      notes: {},
      sessions: [],
      shop: [],
      occ: {},
    };

    const rapport = await importFromJson(JSON.stringify(ancienne));
    expect(rapport.dropped).toEqual([]);

    const [tache] = await tasksRepo.list();
    expect(tache?.name).toBe('Ancienne');
    expect(tache?.subTasks[0]).toEqual({ label: 'a', done: false });
  });
});
