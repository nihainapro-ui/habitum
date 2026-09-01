/* Le vocabulaire de la synchronisation. Aucune logique ici : ce fichier est
   importé par le client ET par les tests du serveur, il doit rester inerte. */

/** Les genres synchronisés. Déclarés UNE SEULE FOIS — c'est le piège n°1 du
 *  CLAUDE.md : une liste recopiée finit par en oublier un, et des entités
 *  disparaissent en silence. `meta` ne transporte que deux clés (`entites.ts`). */
export const SYNC_KINDS = [
  'habits',
  'logs',
  'tasks',
  'goals',
  'notes',
  'sessions',
  'profiles',
  'shopping',
  'projects',
  'projectTasks',
  'meta',
] as const;

export type SyncKind = (typeof SYNC_KINDS)[number];

/** Une ligne telle qu'elle voyage. `blob` est opaque : le serveur ne peut ni
 *  le lire ni le vérifier. */
export interface SyncRow {
  kind: SyncKind;
  id: string;
  updatedAt: string;
  blob: string;
}

/** Erreur typée — l'interface doit distinguer « pas de réseau » (on réessaiera)
 *  de « mauvais code » (l'utilisateur doit agir). Un message unique les
 *  confondrait, et l'utilisateur retaperait son code pendant une panne Wi-Fi. */
export class SyncErreur extends Error {
  constructor(
    readonly genre: 'reseau' | 'serveur' | 'limite' | 'cle',
    message: string,
  ) {
    super(message);
    this.name = 'SyncErreur';
  }
}
