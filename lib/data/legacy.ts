import { LEGACY_KEYS, LEGACY_SCHEMA_VERSION } from '@/lib/storage/keys';
import { addDays, dateKey, today } from '@/lib/domain';

/** État du prototype, tel qu'il est écrit dans localStorage.
 *  Volontairement laxiste : on lit ce qui existe chez de vrais utilisateurs. */
export interface LegacyState {
  v?: number;
  split?: number;
  ov?: Record<string, number>;
  notes?: Record<string, unknown>;
  habits?: unknown[];
  tasks?: unknown[];
  obj?: unknown[];
  sessions?: unknown[];
  shop?: unknown[];
  occ?: Record<string, number>;
  cfg?: Record<string, unknown>;
  theme?: string;
  lang?: string;
  mat?: number;
  demo?: number;
  [k: string]: unknown;
}

/** Lit `habitum.state`, et `habitum.state.big` si l'état porte `split:1`.
 *  Les noms de clés sont FIGÉS (CLAUDE.md § 1) : de vrais utilisateurs ont des
 *  données dessous. */
export function readLegacyState(storage: Storage): LegacyState | null {
  let raw: string | null;
  try {
    raw = storage.getItem(LEGACY_KEYS.main);
  } catch {
    return null;
  }
  if (!raw) return null;

  let state: LegacyState;
  try {
    state = JSON.parse(raw) as LegacyState;
  } catch {
    return null;
  }
  if (!state || typeof state !== 'object') return null;

  if (state.split) {
    try {
      const big = JSON.parse(storage.getItem(LEGACY_KEYS.big) ?? 'null') as LegacyState | null;
      if (big) {
        if (state.ov === undefined && big.ov !== undefined) state.ov = big.ov;
        if (state.notes === undefined && big.notes !== undefined) state.notes = big.notes;
      }
    } catch {
      /* clé volumineuse illisible : on garde ce qu'on a, sans perdre le reste */
    }
  }
  return state;
}

/* ----------------------------------------------------------------------------
   Les quatre migrations ci-dessous sont la transcription LITTÉRALE de la cascade
   `if (v<n)` de `seed()` dans public/prototype/Habitum.dc.html. Elles ne sont ni
   simplifiées, ni « nettoyées » : une migration réécrite au propre est une perte
   de données. Si l'une paraît étrange, c'est qu'elle décrit fidèlement ce que de
   vrais utilisateurs ont sur leur disque.
   ---------------------------------------------------------------------------- */

interface LegacyGoalRow {
  id?: string;
  kind?: string;
  target?: number;
  [k: string]: unknown;
}
interface LegacyTaskRow {
  d?: string;
  dur?: number;
  off?: number;
  [k: string]: unknown;
}
interface LegacySessionRow {
  d?: string;
  off?: number;
  [k: string]: unknown;
}

/** Rejoue les migrations du prototype, en cascade et dans l'ordre.
 *  Idempotent : un état déjà en v5 ressort inchangé, et l'entrée n'est jamais
 *  modifiée sur place. */
export function applyLegacyMigrations(input: LegacyState): LegacyState {
  const v = input.v ?? 1;
  if (v >= LEGACY_SCHEMA_VERSION) return input;

  const s: LegacyState = structuredClone(input);

  /* v<2 — la cible de l'objectif « moins de N écarts » était sous-évaluée. */
  if (v < 2) {
    s.obj = ((s.obj ?? []) as LegacyGoalRow[]).map((o) =>
      o.id === 'o4' && o.kind === 'reduce' && (o.target ?? 0) < 12
        ? {
            ...o,
            target: 12,
            fr: 'Moins de 12 écarts sur 90 jours',
            en: 'Under 12 slips in 90 days',
          }
        : o,
    );
  }

  /* v<3 — une tâche sans durée dure une heure. */
  if (v < 3) {
    s.tasks = ((s.tasks ?? []) as LegacyTaskRow[]).map((k) => (k.dur ? k : { ...k, dur: 60 }));
  }

  /* v<4 — le thème par défaut redevient `neural`. */
  if (v < 4) s.theme = 'neural';

  /* v<5 — les décalages relatifs deviennent des dates absolues. Le décalage des
     tâches va vers l'avenir, celui des sessions vers le passé : c'est le signe
     opposé du prototype, conservé tel quel. `mat` repasse à 0.
     PIÈGE CONNU : `SV` valait 4 alors que la dernière migration écrite est v<5 ;
     elle se rejouait donc à chaque ouverture. D'où le garde-fou en tête de
     fonction, et le test d'idempotence. */
  if (v < 5) {
    const maintenant = today();
    s.tasks = ((s.tasks ?? []) as LegacyTaskRow[]).map((k) =>
      k.d ? k : { ...k, d: dateKey(addDays(maintenant, k.off ?? 0)) },
    );
    s.sessions = ((s.sessions ?? []) as LegacySessionRow[]).map((x) =>
      x.d ? x : { ...x, d: dateKey(addDays(maintenant, -(x.off ?? 0))) },
    );
    s.mat = 0;
  }

  s.occ = s.occ ?? {};
  s.v = LEGACY_SCHEMA_VERSION;
  return s;
}
