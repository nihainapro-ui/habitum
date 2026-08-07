/* Dexie a besoin d'un IndexedDB. fake-indexeddb en fournit un en mémoire.
   Chaque fichier de test repart d'une base vierge (voir beforeEach des tests). */
import 'fake-indexeddb/auto';
