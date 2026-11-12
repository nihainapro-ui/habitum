/* Le SEUL point d'entrée de zod dans le produit — 12 novembre 2026.
 *
 * zod 4 compile ses schémas d'objet à la volée (`new Function`) quand
 * l'environnement le permet, et pour le savoir il ESSAIE : un `new Function('')`
 * dans un `try`. Sous notre CSP — `script-src` sans `'unsafe-eval'`, et il n'y
 * entrera pas — l'essai échoue proprement, mais le navigateur consigne quand
 * même une violation de politique. Rien ne casse ; Lighthouse « bonnes
 * pratiques » tombe de 1 à 0,96 sur toutes les pages, vitrine comprise.
 *
 * `jitless` coupe la compilation ET l'essai. Le réglage doit être posé AVANT
 * la construction du premier schéma : c'est pourquoi il vit ici, et que les
 * schémas importent `z` d'ici — l'ordre d'évaluation des modules le garantit,
 * ce qu'un appel posé « au démarrage » de l'application ne ferait pas.
 *
 * Gardé par deux contrôles : `tests/unit/zod-entree-unique.test.ts` refuse
 * `from 'zod'` partout ailleurs, et `tests/e2e/console.spec.ts` échoue à la première
 * violation de CSP.
 */
import { z } from 'zod';

z.config({ jitless: true });

export { z };
