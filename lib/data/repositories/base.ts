import type { EntityTable, Table } from 'dexie';

/** Toute entité versionnée du modèle. */
export interface Versioned {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export const nowIso = (): string => new Date().toISOString();

/** Identifiant opaque. `crypto.randomUUID` est disponible partout où l'app tourne
 *  (navigateurs modernes, Node ≥ 19) ; le repli couvre les environnements de test
 *  exotiques sans jamais produire de collision en usage réel. */
export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export type CreateInput<T extends Versioned> = Omit<
  T,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
> &
  Partial<Pick<T, 'id'>>;

/** Correctif d'écriture. Une clé posée à `undefined` DÉTACHE le champ.
 *
 *  `exactOptionalPropertyTypes` (D23) force à choisir, et c'est tout l'intérêt :
 *  sans lui, `{ sourceHabitId: undefined }` voulait dire deux choses à la fois —
 *  « ne touche pas à ce champ » ou « efface-le » — et la ligne écrite en base
 *  gardait la clé avec une valeur `undefined`, ce qui n'est ni l'un ni l'autre.
 *
 *  Le contrat est donc explicite : **clé absente = ne pas toucher, clé à
 *  `undefined` = retirer le champ**. `update` supprime réellement la clé, elle
 *  ne l'écrase pas. C'est la distinction dont la synchronisation aura besoin :
 *  « jamais renseigné » et « effacé » ne se fusionnent pas de la même façon.
 *
 *  Cas d'usage réel : supprimer une habitude détache les objectifs qu'elle
 *  alimentait (`lib/store/slices/habits.ts`). */
export type UpdatePatch<T extends Versioned> = {
  [K in keyof Omit<T, 'id' | 'createdAt'>]?: T[K] | undefined;
};

/** CRUD commun : identifiant, horodatages, suppression logique.
 *  Aucune entité ne réimplémente cela — c'est ainsi qu'on garantit que
 *  `updatedAt` est toujours renseigné, prérequis de synchronisation
 *  (03-ARCHITECTURE.md § 3.4). */
export function makeRepo<T extends Versioned>(entityTable: EntityTable<T, 'id'>) {
  /* `EntityTable<T,'id'>` type sa clé primaire par `IDType<T,'id'>`, que TypeScript
     ne peut pas réduire à `string` tant que `T` reste générique. La contrainte
     `T extends Versioned` garantit pourtant `id: string` : la vue `Table<T, string>`
     est exacte, et c'est la seule conversion du fichier. */
  const table = entityTable as unknown as Table<T, string>;

  return {
    async list(): Promise<T[]> {
      return (await table.toArray()).filter((r) => !r.deletedAt);
    },

    async listAll(): Promise<T[]> {
      return table.toArray();
    },

    async get(id: string): Promise<T | undefined> {
      const row = await table.get(id);
      return row && !row.deletedAt ? row : undefined;
    },

    async create(input: CreateInput<T>): Promise<T> {
      const at = nowIso();
      const row = { ...input, id: input.id ?? newId(), createdAt: at, updatedAt: at } as T;
      await table.put(row);
      return row;
    },

    async update(id: string, patch: UpdatePatch<T>): Promise<T | undefined> {
      const row = await table.get(id);
      if (!row) return undefined;
      const next = {
        ...row,
        ...patch,
        id: row.id,
        createdAt: row.createdAt,
        updatedAt: nowIso(),
      } as T;
      /* Une clé posée à `undefined` est RETIRÉE, pas écrasée : c'est le contrat
         de `UpdatePatch`. Le spread ci-dessus l'aurait laissée dans l'objet
         avec une valeur `undefined`, que `put` aurait fidèlement écrite. */
      for (const cle of Object.keys(patch) as (keyof T)[]) {
        if (patch[cle as keyof typeof patch] === undefined) delete next[cle];
      }
      await table.put(next);
      return next;
    },

    /** Suppression LOGIQUE. La ligne reste : c'est ce qui permettra à deux
     *  appareils de converger sans ressusciter une entité effacée. */
    async softDelete(id: string): Promise<void> {
      const at = nowIso();
      await table.update(id, { deletedAt: at, updatedAt: at } as never);
    },

    async restore(id: string): Promise<void> {
      const at = nowIso();
      await table.update(id, { deletedAt: undefined, updatedAt: at } as never);
    },

    async count(): Promise<number> {
      return (await this.list()).length;
    },
  };
}
