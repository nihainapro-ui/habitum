import { createDerivedCache } from '@/lib/domain';

/* Instance UNIQUE du cache dérivé (tâche 5.9).

   Elle vit ici, à côté du store, et non dans `lib/domain` : le domaine reste
   sans état, il fournit la mécanique. C'est la couche qui écrit qui sait quand
   une valeur cesse d'être vraie.

   RÈGLE D'USAGE, et elle n'a qu'une ligne : **tout chemin qui écrit invalide**.
   Une écriture qui oublie d'invalider ne se voit pas en test unitaire, elle se
   voit à l'écran, six jours plus tard, sous la forme d'un record qui n'avance
   plus. En cas de doute, `clear()` : recalculer coûte des millisecondes. */
export const cacheDerive = createDerivedCache();
