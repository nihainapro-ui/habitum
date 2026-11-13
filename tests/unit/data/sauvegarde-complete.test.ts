import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import {
  DEFAULT_SETTINGS,
  META_KEYS,
  ecritureAAnnoncer,
  estQuotaDepasse,
  exportToJson,
  habitsRepo,
  importFromJson,
  metaRepo,
  notesRepo,
  profilesRepo,
  seedEmpty,
} from '@/lib/data';
import type { Settings } from '@/lib/domain';

/* ============================================================================
   Phase 1 — la sauvegarde est complète et se rejoue sans dégât (12 nov. 2026).

   Deux promesses que l'export faisait sans les tenir : « tout ce qui n'est pas
   supprimé sort », alors que ni les profils ni les réglages ne sortaient ; et
   « l'import ajoute et écrase ce qui porte le même identifiant », alors que
   les notes, sans identifiant dans le format, se dédoublaient à chaque passage.
   ========================================================================= */

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

const habitude = () =>
  habitsRepo.create({
    name: 'Méditer',
    category: 'mind',
    goal: { kind: 'check', target: 1, step: 1, unit: '' },
    mode: 'dow',
    days: [0, 1, 2, 3, 4, 5, 6],
    subItems: [],
    reminders: [],
    archived: false,
    note: '',
  });

const PHOTO = `data:image/jpeg;base64,${'A'.repeat(400)}`;

async function appareilNeuf(): Promise<void> {
  db.close();
  await db.delete();
  await db.open();
  await seedEmpty();
}

describe('profils et réglages traversent la sauvegarde', () => {
  it('restitue le titulaire sur un appareil neuf, à la place du profil vierge', async () => {
    const profil = await profilesRepo.create({
      name: 'Nina',
      handle: 'nina',
      glyph: '◆',
      hue: 266,
      role: 2,
      metier: 'Ingénieure',
      email: 'nina@exemple.test',
      photo: PHOTO,
      since: '2024-02-03',
    });
    await metaRepo.set(META_KEYS.activeProfile, profil.id);
    const sauvegarde = JSON.stringify(await exportToJson());

    await appareilNeuf();
    const rapport = await importFromJson(sauvegarde);

    const profils = await profilesRepo.list();
    expect(profils).toHaveLength(1);
    expect(profils[0]).toMatchObject({
      id: profil.id,
      name: 'Nina',
      glyph: '◆',
      hue: 266,
      role: 2,
      metier: 'Ingénieure',
      email: 'nina@exemple.test',
      photo: PHOTO,
      since: '2024-02-03',
    });
    expect(await metaRepo.get(META_KEYS.activeProfile)).toBe(profil.id);
    expect(rapport.byEntity.profiles).toEqual({ read: 1, kept: 1 });
    /* Le profil vierge de l'amorçage a une pierre tombale, pas un effacement
       dur : la synchronisation doit pouvoir le dire aux autres appareils. */
    expect((await profilesRepo.listAll()).filter((p) => p.deletedAt)).toHaveLength(1);
  });

  it('ne touche jamais à un profil qui porte un nom', async () => {
    await profilesRepo.create({
      name: 'Nina',
      handle: 'nina',
      glyph: '◉',
      hue: 188,
      role: 0,
      since: '2024-02-03',
    });
    const sauvegarde = JSON.stringify(await exportToJson());

    await appareilNeuf();
    await profilesRepo.create({
      name: 'Déjà là',
      handle: 'dejala',
      glyph: '◉',
      hue: 32,
      role: 0,
      since: '2026-01-01',
    });
    await importFromJson(sauvegarde);

    expect((await profilesRepo.list()).map((p) => p.name).sort()).toEqual(['Déjà là', 'Nina']);
  });

  it('restitue les réglages, et écarte ceux qui ne veulent rien dire', async () => {
    await metaRepo.set(META_KEYS.settings, {
      ...DEFAULT_SETTINGS,
      theme: 'plasma',
      notifQuiet: true,
      notifQuietFrom: '23:30',
      notifLead: 10,
    });
    const sauvegarde = await exportToJson();

    await appareilNeuf();
    await importFromJson(
      JSON.stringify({
        ...sauvegarde,
        /* Une langue inconnue laisserait l'interface sans libellés. */
        settings: { ...sauvegarde.settings, lang: 'xx', notifLead: 7, inconnu: true },
      }),
    );

    const lus = (await metaRepo.get<Settings & { inconnu?: boolean }>(META_KEYS.settings))!;
    expect(lus.theme).toBe('plasma');
    expect(lus.notifQuiet).toBe(true);
    expect(lus.notifQuietFrom).toBe('23:30');
    /* Les invalides gardent la valeur de l'appareil ; l'inconnu n'entre pas. */
    expect(lus.lang).toBe(DEFAULT_SETTINGS.lang);
    expect(lus.notifLead).toBe(DEFAULT_SETTINGS.notifLead);
    expect(lus.inconnu).toBeUndefined();
  });

  it('relit sans un mot une sauvegarde d’avant, qui n’a ni profils ni réglages', async () => {
    await seedEmpty();
    const { profiles: _p, settings: _s, activeProfile: _a, ...ancienne } = await exportToJson();

    const rapport = await importFromJson(JSON.stringify(ancienne));

    expect(rapport.dropped).toEqual([]);
    expect(await profilesRepo.list()).toHaveLength(1);
    expect(await metaRepo.get(META_KEYS.settings)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('importer deux fois ne double rien', () => {
  it('garde UN journal par date et UNE note par habitude', async () => {
    const h = await habitude();
    await notesRepo.create({ kind: 'journal', date: '2026-11-01', body: 'Bonne journée', mood: 4 });
    await notesRepo.create({ kind: 'habit', habitId: h.id, body: 'Le matin' });
    const sauvegarde = JSON.stringify(await exportToJson());
    const idsAvant = (await notesRepo.list()).map((n) => n.id).sort();

    await importFromJson(sauvegarde);
    await importFromJson(sauvegarde);

    const notes = await notesRepo.list();
    expect(notes).toHaveLength(2);
    /* Les identifiants sont REPRIS : c'est ce qui évite aussi le doublon sur
       les autres appareils, où la synchronisation suit l'identifiant. */
    expect(notes.map((n) => n.id).sort()).toEqual(idsAvant);
    expect(await habitsRepo.list()).toHaveLength(1);
  });
});

describe('annonce aux autres onglets', () => {
  it('annonce toute écriture de données', () => {
    expect(ecritureAAnnoncer('habits', ['h1'])).toBe(true);
    expect(ecritureAAnnoncer('logs', null)).toBe(true);
    expect(ecritureAAnnoncer('meta', ['settings'])).toBe(true);
    expect(ecritureAAnnoncer('meta', ['occ'])).toBe(true);
  });

  it('tait les caches et les états propres à l’onglet', () => {
    /* Sans ce silence, le minuteur — qui écrit son état en continu — ferait
       relire toute la base aux autres onglets chaque seconde. */
    expect(ecritureAAnnoncer('meta', ['timer'])).toBe(false);
    expect(ecritureAAnnoncer('meta', ['logSnapshot'])).toBe(false);
    expect(ecritureAAnnoncer('meta', ['syncCursor', 'syncWatermark'])).toBe(false);
    /* Une seule clé parlante dans le lot suffit à annoncer. */
    expect(ecritureAAnnoncer('meta', ['timer', 'settings'])).toBe(true);
  });
});

describe('quota dépassé', () => {
  it('se reconnaît nu, ou enveloppé par Dexie', () => {
    const quota = Object.assign(new Error('plein'), { name: 'QuotaExceededError' });
    expect(estQuotaDepasse(quota)).toBe(true);
    expect(
      estQuotaDepasse(Object.assign(new Error('avortée'), { name: 'AbortError', inner: quota })),
    ).toBe(true);
    expect(estQuotaDepasse(new Error('autre chose'))).toBe(false);
    expect(estQuotaDepasse(null)).toBe(false);
  });

  it('ne tourne pas sans fin sur une erreur qui se contient elle-même', () => {
    const boucle: { name: string; inner?: unknown } = { name: 'AbortError' };
    boucle.inner = boucle;
    expect(estQuotaDepasse(boucle)).toBe(false);
  });
});
