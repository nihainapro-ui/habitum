/* LA COUTURE — spec du 2026-09-07.
 *
 * D'un côté, `lib/domain/notifications.ts` dit QUOI rappeler et QUAND, sans
 * jamais savoir où il tourne. De l'autre, un canal envoie. Entre les deux,
 * cette interface, et rien d'autre.
 *
 * C'est ce qui rend le renoncement à `TimestampTrigger` gratuit (voir la
 * spec) : le jour où il se standardise, ou le jour où Habitum a une
 * application de bureau, c'est une troisième implémentation de ces trois
 * membres — et pas une ligne à toucher ailleurs. */

/** Un rappel prêt à partir : TRADUIT, donc plus rien à décider. La traduction
 *  a lieu une fois, dans `use-reminders.ts` ; un canal qui traduirait serait un
 *  canal qui connaît la langue de l'utilisateur, et il y en aurait deux. */
export interface RappelPret {
  /** Identité stable, venue du domaine — dédoublonnage et identifiant natif. */
  cle: string;
  at: number;
  titre: string;
  corps: string;
}

export interface Canal {
  /** Combien de jours d'avance ce canal veut recevoir.
   *
   *  Les minuteries n'en veulent qu'un : au-delà, l'onglet aura été fermé. Le
   *  canal natif en veut sept — c'est justement quand l'application est fermée
   *  qu'il sert. */
  readonly horizonJours: number;

  /** Programme EXACTEMENT ces rappels. Ce qui était programmé et n'est plus
   *  dans la liste disparaît : le canal n'a aucun état à réconcilier, et un
   *  rappel fantôme d'une tâche supprimée est pire que pas de rappel. */
  programmer(rappels: readonly RappelPret[]): Promise<void>;

  /** Tout annuler. Appelé au démontage et avant toute reprogrammation. */
  arreter(): Promise<void>;
}
