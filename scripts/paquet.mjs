#!/usr/bin/env node
/* Construit l'application en mode EMPAQUETÉ, puis prépare les fichiers.
 *
 * POURQUOI CE FICHIER PLUTÔT QU'UNE LIGNE DANS `package.json` :
 * `HABITUM_EMPAQUETE=1 next build` est de la syntaxe POSIX. `npm run` la passe
 * à `cmd.exe` sous Windows, qui la lit comme une commande nommée
 * « HABITUM_EMPAQUETE=1 » et échoue. Le dépôt se développe sous Windows autant
 * que sous Linux ; un script que la moitié de l'équipe ne peut pas lancer est
 * un script qui pourrit.
 *
 * `cross-env` réglerait le problème en une dépendance de plus. Vingt lignes de
 * Node le règlent sans, et le dépôt a déjà huit scripts de ce genre. */

import { spawn } from 'node:child_process';

/** Lance une commande en héritant des flux, et rejette si elle échoue. */
const executer = (commande, args, env) =>
  new Promise((resoudre, rejeter) => {
    const enfant = spawn(commande, args, {
      stdio: 'inherit',
      /* `shell: true` est nécessaire sous Windows pour atteindre `next.cmd` ;
         les arguments sont des constantes de ce fichier, jamais des entrées. */
      shell: true,
      env: { ...process.env, ...env },
    });
    enfant.on('error', rejeter);
    enfant.on('close', (code) =>
      code === 0 ? resoudre() : rejeter(new Error(`${commande} a rendu le code ${code}`)),
    );
  });

try {
  await executer('next', ['build'], { HABITUM_EMPAQUETE: '1' });
  await executer('node', ['scripts/empaqueter.mjs'], {});
} catch (err) {
  console.error(`paquet : ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
