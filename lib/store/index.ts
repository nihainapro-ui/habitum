/* Point d'entrée du store.

   `store.ts` porte l'assemblage, `selectors.ts` les vues dérivées. Les deux
   sont séparés pour qu'aucun cycle d'import ne s'installe : les sélecteurs
   consomment le store, le store ne connaît pas les sélecteurs. */
export * from './types';
export * from './store';
export * from './selectors';
