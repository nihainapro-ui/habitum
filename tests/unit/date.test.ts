import { describe, expect, it } from 'vitest';
import { addDays, dateKey, dow, parseKey, startOfWeek } from '@/lib/domain';

/* `Settings.weekStart` ('mon' | 'sun') existait dans le modèle sans être
   implémentable : dow() code en dur lundi = 0 et aucune fonction de début de
   semaine n'existait (défaut D15 de l'audit). Un réglage qui ne peut pas
   fonctionner est la même faute que les interrupteurs notif/sound/vibrate
   décoratifs déjà dénoncés. */

const MER = new Date(2026, 7, 5); // mercredi 5 août 2026 — date figée du dossier

describe('startOfWeek', () => {
  it('remonte au lundi par défaut', () => {
    expect(dateKey(startOfWeek(MER))).toBe('2026-08-03');
  });

  it("remonte au dimanche quand weekStart vaut 'sun'", () => {
    expect(dateKey(startOfWeek(MER, 'sun'))).toBe('2026-08-02');
  });

  it('est idempotent : le début de semaine est son propre début de semaine', () => {
    const lundi = startOfWeek(MER);
    expect(dateKey(startOfWeek(lundi))).toBe(dateKey(lundi));
    const dimanche = startOfWeek(MER, 'sun');
    expect(dateKey(startOfWeek(dimanche, 'sun'))).toBe(dateKey(dimanche));
  });

  it("normalise l'heure à minuit", () => {
    const midi = new Date(2026, 7, 5, 12, 34, 56, 789);
    const d = startOfWeek(midi);
    expect([d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()]).toEqual([
      0, 0, 0, 0,
    ]);
  });

  it('ne modifie pas la date reçue', () => {
    const source = new Date(2026, 7, 5, 12, 0, 0);
    const copie = new Date(source.getTime());
    startOfWeek(source);
    expect(source.getTime()).toBe(copie.getTime());
  });

  it('reste cohérent avec dow() sur les sept jours de la semaine', () => {
    const lundi = startOfWeek(MER);
    for (let i = 0; i < 7; i++) {
      const jour = addDays(lundi, i);
      expect(dow(jour), `dow du jour ${i}`).toBe(i);
      expect(dateKey(startOfWeek(jour)), `startOfWeek du jour ${i}`).toBe(dateKey(lundi));
    }
  });

  it('traverse correctement un changement de mois', () => {
    // Mardi 1er septembre 2026 : la semaine commence le lundi 31 août.
    expect(dateKey(startOfWeek(new Date(2026, 8, 1)))).toBe('2026-08-31');
  });
});

describe('parseKey', () => {
  it('rejette une clé vide, nulle ou malformée', () => {
    expect(parseKey('')).toBeNull();
    expect(parseKey(null)).toBeNull();
    expect(parseKey(undefined)).toBeNull();
    expect(parseKey('pas-une-date')).toBeNull();
  });

  it('fait un aller-retour exact avec dateKey', () => {
    for (const k of ['2026-08-05', '2026-01-01', '2026-12-31']) {
      expect(dateKey(parseKey(k)!)).toBe(k);
    }
  });

  it("produit une date en heure locale, jamais décalée d'un jour", () => {
    // toISOString() aurait pu décaler : c'est le piège documenté dans date.ts.
    const d = parseKey('2026-08-05')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 7, 5]);
  });
});
