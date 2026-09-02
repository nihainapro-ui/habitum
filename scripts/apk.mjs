#!/usr/bin/env node
/* Lance l'enveloppe Gradle du projet Android, depuis n'importe quel shell.
 *
 * POURQUOI CE FICHIER PLUTÔT QU'UNE LIGNE DANS `package.json`.
 *
 * L'ancienne recette était `cd packaging/android && gradlew assembleDebug`.
 * Elle marche sur beaucoup de postes, et elle a échoué ici avec
 * « 'gradlew' n'est pas reconnu » — alors que le fichier était bien présent,
 * et cmd bien placé dans le bon dossier.
 *
 * LA CAUSE : la variable d'environnement Windows
 * `NoDefaultCurrentDirectoryInExePath`. Quand elle vaut 1 — c'est un
 * durcissement courant, posé par certaines politiques d'entreprise et par
 * plusieurs antivirus — cmd cesse de chercher les exécutables dans le dossier
 * COURANT. Un `gradlew` nu devient alors introuvable, et le message d'erreur
 * ne dit rien de la vraie raison : il laisse croire à un fichier manquant.
 *
 * Le remède tient en une règle : ne jamais compter sur la résolution
 * implicite. On construit ici le chemin ABSOLU de l'enveloppe, et on choisit
 * `.bat` sur Windows, l'exécutable POSIX ailleurs. Aucun shell n'intervient
 * (`shell: false`), donc plus aucune règle de recherche de chemin ne
 * s'applique — ni celle de cmd, ni celle de sh.
 *
 * Les arguments sont transmis tels quels : `npm run paquet:apk -- assembleRelease`
 * fonctionne comme on l'attend. */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PROJET = join(process.cwd(), 'packaging', 'android');
const WINDOWS = process.platform === 'win32';
const ENVELOPPE = join(PROJET, WINDOWS ? 'gradlew.bat' : 'gradlew');

if (!existsSync(ENVELOPPE)) {
  console.error(`apk : enveloppe Gradle introuvable — ${ENVELOPPE}`);
  console.error("Le projet natif est-il bien généré ? Lancer d'abord `npm run paquet:sync`.");
  process.exit(1);
}

/* `assembleDebug` par défaut : c'est le paquet de test, non signé pour la
   distribution. Un `assembleRelease` demande une clé de signature, qui n'a
   rien à faire dans le dépôt. */
const taches = process.argv.slice(2);
const args = taches.length > 0 ? taches : ['assembleDebug'];

/* Sur Windows, l'enveloppe est un `.bat`, et Node 20 REFUSE de lancer un
   fichier de commandes sans shell (durcissement contre l'injection
   d'arguments, CVE-2024-27980) : `spawnSync` rend alors EINVAL. On passe donc
   par `cmd.exe`.

   ET ON LUI DONNE UN CHEMIN RELATIF, `.\gradlew.bat`, alors que le chemin
   absolu était sous la main. Deux raisons, et la première a déjà mordu :

   — le chemin absolu de ce dépôt contient une espace (« En cours »), et
     `cmd /c` re-découpe ce qu'on lui passe : il a lu « D:\Projet\En » comme
     la commande. Les règles de guillemets de `cmd /s /c` sont un nid à
     surprises ; le plus sûr est de n'avoir aucune espace à protéger ;
   — le préfixe `.\` désigne explicitement le dossier courant, ce qui
     contourne `NoDefaultCurrentDirectoryInExePath` — la variable qui a fait
     échouer la recette d'origine. Rien n'est cherché, tout est désigné.

   `cwd` vaut `PROJET` : le relatif s'y résout, et Gradle a de toute façon
   besoin d'y être pour trouver son projet. */
const [commande, prefixe] = WINDOWS
  ? [process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', '.\\gradlew.bat']]
  : ['./gradlew', []];

const r = spawnSync(commande, [...prefixe, ...args], {
  cwd: PROJET,
  stdio: 'inherit',
  shell: false,
});

if (r.error) {
  console.error(`apk : impossible de lancer Gradle — ${r.error.message}`);
  process.exit(1);
}

/* Gradle rend 1 sans JAVA_HOME, et son message le dit clairement. On ne le
   reformule pas : le sien est plus précis que tout ce qu'on écrirait ici. On
   ajoute seulement où chercher le JDK, parce que Gradle, lui, l'ignore. */
if (r.status !== 0 && !process.env.JAVA_HOME) {
  console.error('');
  console.error('apk : aucun JAVA_HOME. Android Studio embarque un JDK utilisable :');
  console.error(WINDOWS ? '  C:\\Program Files\\Android\\Android Studio\\jbr' : '  <studio>/jbr');
}

process.exit(r.status ?? 1);
