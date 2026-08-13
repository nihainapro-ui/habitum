/* Point d'entrée du moteur métier.
   RÈGLE : lib/domain/ n'importe JAMAIS React, Next, ni la couche de persistance.
   Tout y est pur et testable (tests/unit/). */
export * from './types';
export * from './date';
export * from './schedule';
export * from './metrics';
export * from './goals';
export * from './agenda';
export * from './tasks';
export * from './stats';
export * from './timer';
