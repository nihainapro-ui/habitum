import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_MINUTERIES,
  creerCanalMinuteries,
  oublierRappelsEnvoyes,
} from '@/lib/features/reminders/canal-minuteries';
import {
  HORIZON_NATIF_JOURS,
  creerCanalNatif,
  type PluginNotifications,
} from '@/lib/features/reminders/canal-natif';
import { identifiantNotification } from '@/lib/domain';
import type { RappelPret } from '@/lib/features/reminders/canal';

/* Les deux canaux. Ils n'ont RIEN à décider — le domaine a déjà dit quoi et
   quand (`tests/unit/notifications.test.ts`). Ce qu'on éprouve ici est ce
   qu'eux seuls peuvent rater : le moment, le doublon, la borne, et pour le
   natif, ce qui est demandé au système.

   Ce fichier remplace `scheduler.test.ts` : le planificateur d'habitudes est
   devenu le canal des minuteries, et il porte les mêmes garanties, sur les
   cinq sources au lieu d'une. */

const MERCREDI = new Date('2026-08-05T09:00:00');

const rappel = (heure: string, cle = `task|t1|2026-08-05|${heure}`): RappelPret => {
  const [h, m] = heure.split(':').map(Number);
  const at = new Date(2026, 7, 5, h!, m!, 0).getTime();
  return { cle, at, titre: 'Dentiste', corps: `à ${heure}` };
};

describe('canal des minuteries', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MERCREDI);
    oublierRappelsEnvoyes();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('déclenche à l’heure dite, pas avant', async () => {
    const envoyes: string[] = [];
    const canal = creerCanalMinuteries((r) => envoyes.push(r.corps));
    await canal.programmer([rappel('13:30')]);

    vi.advanceTimersByTime(4 * 60 * 60 * 1000 + 29 * 60 * 1000);
    expect(envoyes).toEqual([]);

    vi.advanceTimersByTime(60 * 1000);
    expect(envoyes).toEqual(['à 13:30']);
  });

  it('n’envoie qu’une fois, même reprogrammé entre-temps', async () => {
    const envoyes: string[] = [];
    const canal = creerCanalMinuteries((r) => envoyes.push(r.corps));

    await canal.programmer([rappel('13:30')]);
    await canal.programmer([rappel('13:30')]);

    vi.advanceTimersByTime(6 * 60 * 60 * 1000);
    expect(envoyes).toEqual(['à 13:30']);
  });

  it('l’arrêt annule ce qui n’a pas encore sonné', async () => {
    const envoyes: string[] = [];
    const canal = creerCanalMinuteries((r) => envoyes.push(r.corps));
    await canal.programmer([rappel('13:30')]);

    await canal.arreter();
    vi.advanceTimersByTime(6 * 60 * 60 * 1000);
    expect(envoyes).toEqual([]);
  });

  it('n’arme rien pour une heure déjà passée', async () => {
    const envoyes: string[] = [];
    const canal = creerCanalMinuteries((r) => envoyes.push(r.corps));
    await canal.programmer([rappel('08:00')]);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(envoyes).toEqual([]);
  });

  it(`n’arme jamais plus de ${MAX_MINUTERIES} minuteries — les plus proches d’abord`, async () => {
    const rappels = Array.from({ length: 40 }, (_, i) => {
      const m = 10 * 60 + i * 5;
      const heure = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      return rappel(heure);
    });

    const envoyes: string[] = [];
    const canal = creerCanalMinuteries((r) => envoyes.push(r.corps));
    await canal.programmer(rappels);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(envoyes).toHaveLength(MAX_MINUTERIES);
    expect(envoyes[0]).toBe('à 10:00');
  });

  it('ne demande qu’UN jour d’avance — au-delà, l’onglet sera fermé', () => {
    expect(creerCanalMinuteries(() => {}).horizonJours).toBe(1);
  });
});

/* --- Canal natif ----------------------------------------------------------

   Le plugin est remplacé par un double : aucun navigateur d'intégration n'a
   Android. On vérifie donc ce qui lui est DEMANDÉ — c'est tout ce qui est à
   nous. Ce qu'Android en fait se vérifie à la main, sur l'APK. */

const doublePlugin = () => {
  const programmees: { id: number; title: string; body: string; at: Date }[] = [];
  const annulees: number[] = [];
  let enAttente: { id: number }[] = [];

  const plugin: PluginNotifications = {
    async schedule({ notifications }) {
      for (const n of notifications) {
        programmees.push({ id: n.id, title: n.title, body: n.body, at: n.schedule.at });
      }
      enAttente = [...enAttente, ...notifications.map((n) => ({ id: n.id }))];
    },
    async getPending() {
      return { notifications: enAttente };
    },
    async cancel({ notifications }) {
      for (const n of notifications) annulees.push(n.id);
      enAttente = enAttente.filter((e) => !notifications.some((n) => n.id === e.id));
    },
  };

  return { plugin, programmees, annulees, derniereProgrammation: () => programmees };
};

describe('canal natif', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MERCREDI);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('demande SEPT jours d’avance — c’est fermé qu’il sert', () => {
    expect(creerCanalNatif(async () => doublePlugin().plugin).horizonJours).toBe(
      HORIZON_NATIF_JOURS,
    );
  });

  it('programme le titre, le corps et l’instant, réveil compris', async () => {
    const d = doublePlugin();
    const canal = creerCanalNatif(async () => d.plugin);
    await canal.programmer([rappel('13:30')]);

    expect(d.programmees).toHaveLength(1);
    expect(d.programmees[0]!.title).toBe('Dentiste');
    expect(d.programmees[0]!.body).toBe('à 13:30');
    expect(d.programmees[0]!.at.getHours()).toBe(13);
  });

  it('ANNULE tout avant de reprogrammer — aucun état à réconcilier', async () => {
    const d = doublePlugin();
    const canal = creerCanalNatif(async () => d.plugin);

    await canal.programmer([rappel('13:30'), rappel('15:00')]);
    expect(d.annulees).toEqual([]);

    /* Deuxième passe : la tâche de 15 h a disparu (cochée, supprimée…). Elle
       ne doit plus être programmée nulle part — un rappel fantôme fait douter
       de tous les autres. */
    await canal.programmer([rappel('13:30')]);
    expect(d.annulees).toEqual([
      identifiantNotification('task|t1|2026-08-05|13:30'),
      identifiantNotification('task|t1|2026-08-05|15:00'),
    ]);
    expect(d.programmees).toHaveLength(3);
  });

  it('reprend le MÊME identifiant pour le même rappel', async () => {
    const d = doublePlugin();
    const canal = creerCanalNatif(async () => d.plugin);

    await canal.programmer([rappel('13:30')]);
    await canal.programmer([rappel('13:30')]);

    expect(d.programmees[0]!.id).toBe(d.programmees[1]!.id);
  });

  it('écarte ce qui est déjà passé', async () => {
    const d = doublePlugin();
    const canal = creerCanalNatif(async () => d.plugin);
    await canal.programmer([rappel('08:00'), rappel('13:30')]);

    expect(d.programmees.map((p) => p.body)).toEqual(['à 13:30']);
  });

  it('n’appelle pas le plugin pour une liste vide, mais annule quand même', async () => {
    const d = doublePlugin();
    const canal = creerCanalNatif(async () => d.plugin);
    await canal.programmer([rappel('13:30')]);
    await canal.programmer([]);

    expect(d.annulees).toHaveLength(1);
    expect(d.programmees).toHaveLength(1);
  });
});
