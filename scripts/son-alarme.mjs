#!/usr/bin/env node
/* Engendre le son d'alarme d'Habitum — `res/raw/habitum_alarme.wav`.
 *
 * POURQUOI UN SCRIPT ET NON UN FICHIER PRIS AILLEURS : la règle n°5 du
 * CLAUDE.md exige du gratuit, et un son « libre » trouvé sur un site est
 * exactement le genre de pièce dont personne ne retrouve la licence deux ans
 * plus tard. Trois tonalités calculées ici ne relèvent d'aucune licence tierce,
 * et n'importe qui peut les régénérer à l'identique.
 *
 * Deux secondes, mono, 22 050 Hz, 16 bits : ~88 Ko. Trois bips montants,
 * répétés — reconnaissable, pas agressif. Android exige un fichier dans
 * `res/raw` pour un son de CANAL (voir `CANAUX` dans `canal-natif.ts`).
 *
 *     node scripts/son-alarme.mjs
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FREQ = 22_050;
const DUREE_S = 2;
const total = FREQ * DUREE_S;

/* Trois bips de 120 ms à 880, 1108 et 1318 Hz (la, do#, mi), pause, puis
   encore. L'enveloppe évite les clics en début et fin de bip. */
const bips = [880, 1108.73, 1318.51];
const echantillons = new Int16Array(total);
for (let i = 0; i < total; i += 1) {
  const t = i / FREQ;
  const cycle = t % 1;
  const rang = Math.floor(cycle / 0.16);
  const dansBip = cycle - rang * 0.16;
  let v = 0;
  if (rang < 3 && dansBip < 0.12) {
    const f = bips[rang];
    const env = Math.min(1, dansBip / 0.01, (0.12 - dansBip) / 0.01);
    v = Math.sin(2 * Math.PI * f * t) * env * 0.8;
  }
  echantillons[i] = Math.round(v * 32767);
}

const donnees = Buffer.from(echantillons.buffer);
const entete = Buffer.alloc(44);
entete.write('RIFF', 0);
entete.writeUInt32LE(36 + donnees.length, 4);
entete.write('WAVE', 8);
entete.write('fmt ', 12);
entete.writeUInt32LE(16, 16);
entete.writeUInt16LE(1, 20);
entete.writeUInt16LE(1, 22);
entete.writeUInt32LE(FREQ, 24);
entete.writeUInt32LE(FREQ * 2, 28);
entete.writeUInt16LE(2, 32);
entete.writeUInt16LE(16, 34);
entete.write('data', 36);
entete.writeUInt32LE(donnees.length, 40);

const sortie = join(
  process.cwd(),
  'packaging',
  'android',
  'app',
  'src',
  'main',
  'res',
  'raw',
  'habitum_alarme.wav',
);
writeFileSync(sortie, Buffer.concat([entete, donnees]));
console.log(`son-alarme : ${sortie} (${Math.round((44 + donnees.length) / 1024)} Ko)`);
