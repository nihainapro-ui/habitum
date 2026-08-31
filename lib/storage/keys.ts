/* Clés de stockage héritées du prototype. NOMS FIGÉS : les renommer détruirait
   les données des utilisateurs existants (docs/handoff/03-ARCHITECTURE.md § Clés). */
export const LEGACY_KEYS = {
  main: 'habitum.state',
  big: 'habitum.state.big',
  backup: 'habitum.state.bak',
  best: 'habitum.best',
} as const;

/** Version de schéma du prototype au moment du portage. */
export const LEGACY_SCHEMA_VERSION = 5;

/** Base Dexie cible (phase 1). */
export const DB_NAME = 'habitum';
/** 2 depuis Work : deux tables ajoutées, aucune touchée (`lib/data/db.ts`). */
export const DB_VERSION = 2;
