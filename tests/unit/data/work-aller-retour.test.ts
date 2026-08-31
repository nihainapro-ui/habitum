import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { exportToJson, importFromJson, projectsRepo, projectTasksRepo } from '@/lib/data';

/* ============================================================================
   Work traverse-t-il la sauvegarde ?

   C'EST LE CONTRÔLE QUI MANQUE LE PLUS SOUVENT, et le plus cher. Une entité
   neuve doit passer par l'export ET par l'import ; en oublier un côté fait
   perdre les données sans un mot, et personne ne s'en aperçoit avant d'avoir
   eu besoin de sa sauvegarde. Le CLAUDE.md le désigne comme le défaut déjà
   payé : « des entités disparaissent silencieusement ».
   ========================================================================= */

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

const projetAvecEtapes = async () => {
  const projet = await projectsRepo.create({ name: 'Refonte', note: 'vitrine' });
  await projectTasksRepo.create({
    projectId: projet.id,
    name: 'Cadrer',
    assignee: 'Alex',
    deadline: '2026-09-10',
    status: 'doing',
    note: 'note d’étape',
  });
  await projectTasksRepo.create({
    projectId: projet.id,
    name: 'Livrer',
    assignee: '',
    deadline: '',
    status: 'todo',
    note: '',
  });
  return projet;
};

describe('aller-retour de sauvegarde', () => {
  it('exporte les projets et leurs étapes', async () => {
    await projetAvecEtapes();
    const charge = await exportToJson();

    expect(charge.proj).toHaveLength(1);
    expect(charge.proj[0]?.name).toBe('Refonte');
    expect(charge.ptask).toHaveLength(2);
  });

  it('réimporte tout, champ par champ', async () => {
    await projetAvecEtapes();
    const charge = await exportToJson();

    await db.projects.clear();
    await db.projectTasks.clear();
    expect(await projectsRepo.list()).toHaveLength(0);

    await importFromJson(JSON.stringify(charge));

    const projets = await projectsRepo.list();
    const etapes = await projectTasksRepo.list();
    expect(projets).toHaveLength(1);
    expect(etapes).toHaveLength(2);

    /* Les CHAMPS, pas seulement le compte : une étape restituée sans son
       responsable ni son échéance serait « importée » et pourtant perdue. */
    const cadrer = etapes.find((t) => t.name === 'Cadrer');
    expect(cadrer?.assignee).toBe('Alex');
    expect(cadrer?.deadline).toBe('2026-09-10');
    expect(cadrer?.status).toBe('doing');
    expect(cadrer?.note).toBe('note d’étape');

    /* Le rattachement survit : une étape dont le projet a changé d'identifiant
       serait orpheline, donc invisible. */
    expect(new Set(etapes.map((t) => t.projectId))).toEqual(new Set([projets[0]!.id]));
  });

  it('une sauvegarde d’AVANT Work s’importe sans erreur', async () => {
    /* Toutes celles produites jusqu'à aujourd'hui n'ont ni `proj` ni `ptask`.
       Les rendre obligatoires aurait cassé la restauration de tout le monde. */
    const ancienne = JSON.stringify({
      app: 'Habitum',
      v: 5,
      habits: [],
      tasks: [],
      obj: [],
      log: {},
      ov: {},
      notes: {},
      sessions: [],
      shop: [],
      occ: {},
    });

    const rapport = await importFromJson(ancienne);
    expect(rapport.byEntity.projects).toEqual({ read: 0, kept: 0 });
    expect(await projectsRepo.list()).toHaveLength(0);
  });

  it('une étape sans projet est ÉCARTÉE, et le rapport le dit', async () => {
    /* Elle ne serait atteignable par aucune vue. Le rapport la nomme plutôt
       que de l'avaler — c'est la différence entre écarter et perdre. */
    const charge = JSON.stringify({
      app: 'Habitum',
      v: 5,
      habits: [],
      tasks: [],
      obj: [],
      log: {},
      ov: {},
      notes: {},
      sessions: [],
      shop: [],
      occ: {},
      proj: [],
      ptask: [{ id: 't1', projectId: 'fantôme', name: 'Orpheline', status: 'todo' }],
    });

    const rapport = await importFromJson(charge);
    expect(rapport.byEntity.projectTasks).toEqual({ read: 1, kept: 0 });
    expect(rapport.dropped.some((d) => d.includes('fantôme'))).toBe(true);
    expect(await projectTasksRepo.list()).toHaveLength(0);
  });

  it('un statut inconnu retombe sur « à faire » plutôt que de perdre l’étape', async () => {
    /* Perdre une tâche parce que son statut vient d'une version plus récente
       serait exactement la disparition silencieuse qu'on cherche à éviter. */
    const charge = JSON.stringify({
      app: 'Habitum',
      v: 5,
      habits: [],
      tasks: [],
      obj: [],
      log: {},
      ov: {},
      notes: {},
      sessions: [],
      shop: [],
      occ: {},
      proj: [{ id: 'p1', name: 'P', note: '' }],
      ptask: [{ id: 't1', projectId: 'p1', name: 'X', status: 'bloque' }],
    });

    await importFromJson(charge);
    const etapes = await projectTasksRepo.list();
    expect(etapes).toHaveLength(1);
    expect(etapes[0]?.status).toBe('todo');
  });
});

describe('réinitialisation', () => {
  it('vide aussi les tables de Work', async () => {
    /* Un compte annoncé vierge qui garderait les projets ne serait pas vierge.
       C'est un oubli d'une ligne, et il ne se voit qu'en le cherchant. */
    await projetAvecEtapes();
    const { resetAll } = await import('@/lib/data');
    await resetAll();

    expect(await projectsRepo.list()).toHaveLength(0);
    expect(await projectTasksRepo.list()).toHaveLength(0);
  });
});
