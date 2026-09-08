import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_MINUTERIES,
  creerCanalMinuteries,
  oublierRappelsEnvoyes,
} from '@/lib/features/reminders/canal-minuteries';
import {
  CANAL_RAPPELS,
  ESSAI_ID,
  HORIZON_NATIF_JOURS,
  creerCanalNatif,
  programmerEssai,
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
  const programmees: {
    id: number;
    title: string;
    body: string;
    at: Date;
    channelId?: string | undefined;
  }[] = [];
  const annulees: number[] = [];
  let enAttente: { id: number }[] = [];

  const plugin: PluginNotifications = {
    async schedule({ notifications }) {
      for (const n of notifications) {
        /* `channelId` est RECOPIÉ ici, et ce n'est pas un détail de double :
           l'oublier faisait passer le test « range chaque rappel dans ce
           canal » pour un défaut du code alors que c'était le double qui
           jetait l'information. */
        programmees.push({
          id: n.id,
          title: n.title,
          body: n.body,
          at: n.schedule.at,
          channelId: n.channelId,
        });
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

/* --- Ce que l'APK ajoute autour du canal --------------------------------- */

const doubleComplet = () => {
  const base = doublePlugin();
  const canaux: { id: string; importance: number }[] = [];
  const plugin: PluginNotifications = {
    ...base.plugin,
    async createChannel(c) {
      canaux.push({ id: c.id, importance: c.importance });
    },
  };
  return { ...base, plugin, canaux };
};

describe('canal Android et rappel d’essai', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MERCREDI);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('déclare un canal d’importance MAXIMALE avant de programmer', async () => {
    /* Sans canal déclaré, le plugin en crée un d'importance moyenne : la
       notification arrive sans bandeau ni son. Un rappel muet qui attend le
       déverrouillage n'est pas un rappel. */
    const d = doubleComplet();
    await creerCanalNatif(async () => d.plugin).programmer([rappel('13:30')]);

    expect(d.canaux).toHaveLength(1);
    expect(d.canaux[0]!.id).toBe(CANAL_RAPPELS);
    expect(d.canaux[0]!.importance).toBe(5);
  });

  it('range chaque rappel DANS ce canal — le déclarer sans l’employer ne sert à rien', async () => {
    const d = doubleComplet();
    await creerCanalNatif(async () => d.plugin).programmer([rappel('13:30')]);
    expect(d.programmees[0]!.channelId).toBe(CANAL_RAPPELS);
  });

  it('programme l’essai dans dix secondes', async () => {
    const d = doubleComplet();
    await programmerEssai('Habitum', 'ça marche', 10, async () => d.plugin);

    expect(d.programmees).toHaveLength(1);
    expect(d.programmees[0]!.id).toBe(ESSAI_ID);
    expect(d.programmees[0]!.at.getTime()).toBe(MERCREDI.getTime() + 10_000);
  });

  it('N’ANNULE PAS l’essai en reprogrammant', async () => {
    /* Le cas vécu : on lance l'essai, on coche une tâche pendant les dix
       secondes d'attente, la reprogrammation emporte l'essai — et on en conclut
       que rien ne marche. */
    const d = doubleComplet();
    await programmerEssai('Habitum', 'ça marche', 10, async () => d.plugin);
    await creerCanalNatif(async () => d.plugin).programmer([rappel('13:30')]);

    expect(d.annulees).not.toContain(ESSAI_ID);
    expect(d.programmees.some((p) => p.id === ESSAI_ID)).toBe(true);
  });
});

describe('le canal natif NE DÉSARME PAS ce que le système détient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MERCREDI);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('`arreter()` n’annule rien — LE DÉFAUT QUI EMPÊCHAIT TOUT RAPPEL', () => {
    /* L'armement appelle `arreter()` au démontage et à chaque changement de
       données. Sur les minuteries c'est juste — elles meurent avec la page. Sur
       le canal natif, c'était effacer, en fermant Habitum, exactement ce qu'on
       venait de programmer POUR quand Habitum serait fermé.

       Ce test est la mémoire de ce défaut : si `arreter()` se remet un jour à
       annuler, il tombe ici plutôt que sur le téléphone de quelqu'un. */
    return (async () => {
      const d = doubleComplet();
      const canal = creerCanalNatif(async () => d.plugin);

      await canal.programmer([rappel('13:30'), rappel('15:00')]);
      const avant = d.programmees.length;

      await canal.arreter();

      expect(d.annulees).toEqual([]);
      expect(await canal.compterProgrammes()).toBe(avant);
    })();
  });

  it('mais la REPROGRAMMATION annule bien, elle', async () => {
    /* L'annulation n'a pas disparu : elle a changé d'endroit. Elle a lieu là où
       elle sert — juste avant de reposer la liste à jour. */
    const d = doubleComplet();
    const canal = creerCanalNatif(async () => d.plugin);

    await canal.programmer([rappel('13:30'), rappel('15:00')]);
    await canal.programmer([rappel('13:30')]);

    expect(d.annulees.length).toBe(2);
  });

  it('compte ce que le système détient, l’essai mis à part', async () => {
    const d = doubleComplet();
    const canal = creerCanalNatif(async () => d.plugin);

    await canal.programmer([rappel('13:30'), rappel('15:00')]);
    await programmerEssai('Habitum', 'essai', 10, async () => d.plugin);

    /* Deux vrais rappels : l'essai ne gonfle pas le compte, sinon la ligne
       affichée dirait « 3 » là où l'utilisateur n'en a que deux. */
    expect(await canal.compterProgrammes()).toBe(2);
  });
});

describe('canal des minuteries — le comptage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MERCREDI);
    oublierRappelsEnvoyes();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('compte les minuteries armées, et retombe à zéro à l’arrêt', async () => {
    const canal = creerCanalMinuteries(() => {});
    await canal.programmer([rappel('13:30'), rappel('15:00')]);
    expect(await canal.compterProgrammes()).toBe(2);

    await canal.arreter();
    expect(await canal.compterProgrammes()).toBe(0);
  });
});
