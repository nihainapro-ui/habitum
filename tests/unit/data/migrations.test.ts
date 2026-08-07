import { describe, expect, it } from 'vitest';
import { applyLegacyMigrations, readLegacyState } from '@/lib/data/legacy';

/* B6 — les migrations du prototype étaient une cascade `if v<n` dans seed().
   Testées côté navigateur, jamais côté portage. Ici, chacune reçoit une charge
   au format d'origine et doit produire exactement ce qu'elle annonce, y compris
   ne rien faire sur un état déjà à jour. */

/** Stockage en mémoire conforme à l'interface Storage. */
const memStorage = (init: Record<string, string> = {}): Storage => {
  const m = new Map(Object.entries(init));
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
};

describe('readLegacyState', () => {
  it("retourne null si rien n'est stocké", () => {
    expect(readLegacyState(memStorage())).toBeNull();
  });

  it('lit un état antérieur à split:1 — ov et notes dans la clé principale', () => {
    const s = memStorage({
      'habitum.state': JSON.stringify({
        v: 5,
        habits: [],
        ov: { 'h1|2026-08-01': 1 },
        notes: { a: 'x' },
      }),
    });
    const etat = readLegacyState(s)!;
    expect(etat.ov).toEqual({ 'h1|2026-08-01': 1 });
    expect(etat.notes).toEqual({ a: 'x' });
  });

  it('recompose un état split:1 depuis les deux clés', () => {
    const s = memStorage({
      'habitum.state': JSON.stringify({ v: 5, split: 1, habits: [] }),
      'habitum.state.big': JSON.stringify({ ov: { 'h1|2026-08-01': 2 }, notes: { b: 'y' } }),
    });
    const etat = readLegacyState(s)!;
    expect(etat.ov).toEqual({ 'h1|2026-08-01': 2 });
    expect(etat.notes).toEqual({ b: 'y' });
  });

  it('survit à un JSON corrompu sans lever', () => {
    expect(readLegacyState(memStorage({ 'habitum.state': '{cassé' }))).toBeNull();
  });

  it('survit à une clé volumineuse corrompue sans perdre le reste', () => {
    const s = memStorage({
      'habitum.state': JSON.stringify({ v: 5, split: 1, habits: [{ id: 'h1' }] }),
      'habitum.state.big': '{cassé',
    });
    const etat = readLegacyState(s)!;
    expect(etat.habits).toHaveLength(1);
    expect(etat.ov).toBeUndefined();
  });

  it('rejette une charge qui n’est pas un objet', () => {
    expect(readLegacyState(memStorage({ 'habitum.state': '42' }))).toBeNull();
  });
});

describe('applyLegacyMigrations', () => {
  /* ⚠ Écart assumé avec le plan : celui-ci faisait porter le cas v<2 sur un
     objectif `{id:'o4', kind:'cumul'}`. La migration du prototype ne se déclenche
     que sur `id==='o4' && kind==='reduce' && target<12` — le cas du plan n'aurait
     rien migré. La transcription à l'identique fait foi (CLAUDE.md § 7) ; c'est
     le test qui est corrigé, pas la migration. */
  it("v<2 — relève la cible de l'objectif o4 à 12", () => {
    const out = applyLegacyMigrations({
      v: 1,
      obj: [{ id: 'o4', kind: 'reduce', target: 6 }],
    } as never);
    expect((out.obj as { target: number }[])[0]!.target).toBe(12);
  });

  it('v<2 — ne touche pas un objectif qui ne remplit pas les trois conditions', () => {
    const out = applyLegacyMigrations({
      v: 1,
      obj: [
        { id: 'o1', kind: 'cumul', target: 180 },
        { id: 'o4', kind: 'reduce', target: 30 },
      ],
    } as never);
    expect((out.obj as { target: number }[]).map((o) => o.target)).toEqual([180, 30]);
  });

  it('v<3 — durée de tâche par défaut à 60', () => {
    const out = applyLegacyMigrations({ v: 2, tasks: [{ id: 't1' }] } as never);
    expect((out.tasks as { dur: number }[])[0]!.dur).toBe(60);
  });

  it('v<4 — thème par défaut neural', () => {
    const out = applyLegacyMigrations({ v: 3 } as never);
    expect(out.theme).toBe('neural');
  });

  it('v<5 — convertit off en date et remet mat à 0', () => {
    const out = applyLegacyMigrations({ v: 4, tasks: [{ id: 't1', off: 0 }], mat: 1 } as never);
    expect((out.tasks as { d?: string }[])[0]!.d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(out.mat).toBe(0);
  });

  it('v<5 — le décalage des sessions est compté vers le passé', () => {
    const out = applyLegacyMigrations({
      v: 4,
      sessions: [
        { label: 'A', min: 25, off: 0 },
        { label: 'B', min: 25, off: 1 },
      ],
    } as never);
    const [a, b] = out.sessions as { d: string }[];
    expect(a!.d > b!.d).toBe(true);
  });

  it('v<5 — une date déjà posée n’est jamais réécrite', () => {
    const out = applyLegacyMigrations({
      v: 4,
      tasks: [{ id: 't1', d: '2020-01-01', off: 5 }],
    } as never);
    expect((out.tasks as { d: string }[])[0]!.d).toBe('2020-01-01');
  });

  it('est idempotent — un état déjà à jour n’est pas modifié', () => {
    const dejaAJour = {
      v: 5,
      theme: 'plasma',
      tasks: [{ id: 't1', d: '2026-08-05', dur: 30 }],
      mat: 1,
    } as never;
    expect(applyLegacyMigrations(dejaAJour)).toEqual(dejaAJour);
  });

  it('ne modifie jamais l’état reçu', () => {
    const source = { v: 3, tasks: [{ id: 't1' }] } as never;
    const copie = structuredClone(source);
    applyLegacyMigrations(source);
    expect(source).toEqual(copie);
  });
});
