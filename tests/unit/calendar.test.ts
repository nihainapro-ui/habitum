import { describe, expect, it } from 'vitest';
import {
  alignerPas,
  blocHoraire,
  borneDuree,
  colonnes,
  decalerHeure,
  decalerJour,
  DUREE_MIN,
  HEURE_DEBUT,
  HEURE_FIN,
  minutesDepuisMinuit,
  monthGrid,
  redimensionner,
  seChevauchent,
  versHeure,
  weekDays,
  type Task,
} from '@/lib/domain';

const NOW = new Date(2026, 7, 5); // mercredi 5 août 2026

const task = (over: Partial<Task> & Pick<Task, 'id'>): Task => ({
  name: over.id,
  category: 'work',
  date: '2026-08-05',
  duration: 60,
  priority: 2,
  done: false,
  subTasks: [],
  note: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('monthGrid', () => {
  it('rend toujours 42 cases — une grille qui change de hauteur fait sauter la page', () => {
    for (const offset of [-1, 0, 1, 6]) {
      expect(monthGrid(offset, 'mon', NOW)).toHaveLength(42);
    }
  });

  it('commence au premier jour de la semaine contenant le 1er du mois', () => {
    /* Août 2026 commence un samedi : la grille du lundi part du 27 juillet. */
    expect(monthGrid(0, 'mon', NOW)[0]?.key).toBe('2026-07-27');
    expect(monthGrid(0, 'sun', NOW)[0]?.key).toBe('2026-07-26');
  });

  it('distingue les jours du mois affiché et marque aujourd’hui', () => {
    const grille = monthGrid(0, 'mon', NOW);
    expect(grille.find((c) => c.key === '2026-07-31')?.inMonth).toBe(false);
    expect(grille.find((c) => c.key === '2026-08-01')?.inMonth).toBe(true);
    expect(grille.filter((c) => c.isToday)).toHaveLength(1);
  });
});

describe('weekDays', () => {
  it('rend sept jours à partir du début de semaine choisi', () => {
    expect(weekDays(0, 'mon', NOW).map((d) => d.getDate())).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect(weekDays(1, 'mon', NOW)[0]?.getDate()).toBe(10);
    expect(weekDays(-1, 'mon', NOW)[0]?.getDate()).toBe(27);
  });
});

describe('heures', () => {
  it('convertit dans les deux sens', () => {
    expect(minutesDepuisMinuit('09:15')).toBe(555);
    expect(versHeure(555)).toBe('09:15');
    expect(minutesDepuisMinuit(undefined)).toBeNull();
  });

  it('aligne sur le quart d’heure', () => {
    expect(alignerPas(7)).toBe(0);
    expect(alignerPas(8)).toBe(15);
    expect(alignerPas(52)).toBe(45);
  });
});

describe('blocHoraire', () => {
  it('place un évènement par rapport au haut de la grille', () => {
    const bloc = blocHoraire({ time: '10:00', duration: 60 });
    expect(bloc).toEqual({ topMin: (10 - HEURE_DEBUT) * 60, heightMin: 60 });
  });

  it('n’a pas de bloc sans heure — la tâche est « toute la journée »', () => {
    /* Sans la CLÉ, et non avec une clé à `undefined` (D23) : c'est ainsi qu'une
       tâche sans heure est réellement écrite en base depuis que les éditeurs
       omettent les champs vides. Le test doit éprouver la forme qui existe. */
    expect(blocHoraire({ duration: 60 })).toBeNull();
  });

  /* Tronquer plutôt que masquer : faire disparaître un évènement ferait croire
     qu'il n'existe pas. */
  it('tronque un évènement qui déborde les bornes affichées', () => {
    const matin = blocHoraire({ time: '05:00', duration: 120 });
    expect(matin).toEqual({ topMin: 0, heightMin: 60 });

    const nuit = blocHoraire({ time: `${HEURE_FIN}:00`, duration: 180 });
    expect(nuit?.heightMin).toBe(60);
  });

  it('écarte un évènement entièrement hors des bornes', () => {
    expect(blocHoraire({ time: '02:00', duration: 30 })).toBeNull();
  });
});

describe('redimensionner', () => {
  it('ne descend jamais sous la durée minimale', () => {
    expect(redimensionner(60, -60)).toBe(DUREE_MIN);
    expect(redimensionner(30, -100)).toBe(DUREE_MIN);
  });

  it('avance par pas de quinze minutes', () => {
    expect(redimensionner(60, 15)).toBe(75);
    expect(redimensionner(60, 7)).toBe(60);
  });
});

describe('decalerHeure / decalerJour', () => {
  it('borne le déplacement vertical à la journée affichée', () => {
    expect(decalerHeure('10:00', 30)).toBe('10:30');
    expect(decalerHeure('06:00', -120)).toBe(`0${HEURE_DEBUT}:00`);
    expect(decalerHeure('23:00', 600)).toBe('23:45');
  });

  it('décale une date-clé sans passer par un fuseau', () => {
    expect(decalerJour('2026-08-31', 1)).toBe('2026-09-01');
    expect(decalerJour('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('colonnes', () => {
  it('range deux évènements qui se chevauchent côte à côte', () => {
    const a = task({ id: 'a', time: '10:00', duration: 60 });
    const b = task({ id: 'b', time: '10:30', duration: 60 });
    expect(seChevauchent(a, b)).toBe(true);

    const placement = colonnes([a, b]);
    expect(placement.get('a')).toEqual({ col: 0, total: 2 });
    expect(placement.get('b')).toEqual({ col: 1, total: 2 });
  });

  it('laisse toute la largeur à deux évènements successifs', () => {
    const a = task({ id: 'a', time: '10:00', duration: 60 });
    const b = task({ id: 'b', time: '11:00', duration: 60 });
    expect(seChevauchent(a, b)).toBe(false);
    expect(colonnes([a, b]).get('b')).toEqual({ col: 0, total: 1 });
  });
});

describe('borneDuree', () => {
  /* Le piège que l'e2e a attrapé : `redimensionner(0, d)` n'est PAS un simple
     bornage — son premier argument est la durée courante, et `0 || DUREE_MIN`
     y ajoute silencieusement un quart d'heure. */
  it('borne sans rien ajouter', () => {
    expect(borneDuree(75)).toBe(75);
    expect(borneDuree(0)).toBe(DUREE_MIN);
    expect(borneDuree(7)).toBe(DUREE_MIN);
    expect(borneDuree(68)).toBe(75);
    expect(borneDuree(75)).not.toBe(redimensionner(0, 75));
  });
});
