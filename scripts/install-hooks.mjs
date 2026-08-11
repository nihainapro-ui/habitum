#!/usr/bin/env node
/* Pointe Git sur `.githooks/`.
 *
 * Les hooks vivent dans le dépôt — donc versionnés, relus et identiques pour
 * tout le monde — au lieu de `.git/hooks/`, qui n'est ni versionné ni partagé.
 * `core.hooksPath` est la seule ligne de configuration nécessaire.
 *
 * Appelé par le script `prepare` de package.json, donc par `npm install`.
 * Silencieux hors d'un dépôt Git (installation depuis une archive, CI qui
 * décoche l'historique) : ce n'est pas une erreur, il n'y a simplement rien à
 * configurer. */
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DOSSIER = '.githooks';

if (!existsSync('.git') || !existsSync(DOSSIER)) process.exit(0);

try {
  execFileSync('git', ['config', 'core.hooksPath', DOSSIER], { stdio: 'ignore' });

  /* Le bit exécutable ne survit pas toujours à un checkout sous Windows.
     Sans lui, Git ignore le hook EN SILENCE — le pire des cas : on croit
     protégé ce qui ne l'est pas. */
  for (const nom of readdirSync(DOSSIER)) {
    chmodSync(join(DOSSIER, nom), 0o755);
  }

  console.log(`hooks Git : core.hooksPath -> ${DOSSIER}`);
} catch {
  /* Git absent du PATH : on n'échoue pas l'installation pour autant. */
  process.exit(0);
}
