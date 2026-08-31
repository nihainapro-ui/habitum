#!/usr/bin/env node
/* Icônes de lancement Android, dérivées des icônes du web.
 *
 * Capacitor pose ses propres icônes dans le projet natif : livrer un APK qui
 * porte le logo d'un outil de construction n'est pas une finition manquante,
 * c'est une erreur d'identité. Elles sont donc REGÉNÉRÉES depuis la source du
 * produit — `public/icons/` — comme `scripts/generate-icons.mjs` le fait pour
 * le web.
 *
 * Trois familles, et elles ne servent pas à la même chose :
 *
 *   - `ic_launcher` — l'icône carrée héritée, pour Android 7 et avant ;
 *   - `ic_launcher_round` — sa variante ronde, que certains lanceurs préfèrent ;
 *   - `ic_launcher_foreground` — le PLAN AVANT de l'icône adaptative
 *     (Android 8+), posé sur un fond défini en XML. Le système la recadre en
 *     cercle, en carré arrondi ou en goutte selon le constructeur, et il
 *     ROGNE JUSQU'À 25 % DE CHAQUE CÔTÉ. C'est pourquoi elle part de
 *     `maskable-512.png`, dessinée avec cette marge, et non de l'icône simple :
 *     celle-ci se ferait couper le glyphe.
 *
 * `--check` ne réécrit rien et sort en code 1 si un fichier manque : c'est la
 * même discipline que les autres contrôles du dépôt.
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const RES = join('packaging', 'android', 'app', 'src', 'main', 'res');

/** Densités Android et côté de l'icône héritée, en pixels. */
const DENSITES = [
  ['mdpi', 48],
  ['hdpi', 72],
  ['xhdpi', 96],
  ['xxhdpi', 144],
  ['xxxhdpi', 192],
];

/* Le plan avant d'une icône adaptative se dessine dans un carré de 108 dp dont
   seuls les 72 dp centraux sont garantis visibles. Le rapport 108/48 donne le
   côté à produire pour chaque densité. */
const RAPPORT_ADAPTATIVE = 108 / 48;

const controle = process.argv.includes('--check');

async function principal() {
  const carree = join('public', 'icons', 'icon-512.png');
  const masquable = join('public', 'icons', 'maskable-512.png');

  for (const f of [carree, masquable]) {
    if (!existsSync(f)) {
      console.error(`icones-android : source absente — ${f}`);
      process.exit(1);
    }
  }

  const sourceCarree = await readFile(carree);
  const sourceMasquable = await readFile(masquable);

  const manquants = [];
  let ecrits = 0;

  for (const [densite, cote] of DENSITES) {
    const dossier = join(RES, `mipmap-${densite}`);
    const cibles = [
      ['ic_launcher.png', cote, sourceCarree],
      ['ic_launcher_round.png', cote, sourceCarree],
      ['ic_launcher_foreground.png', Math.round(cote * RAPPORT_ADAPTATIVE), sourceMasquable],
    ];

    for (const [nom, taille, source] of cibles) {
      const chemin = join(dossier, nom);
      if (controle) {
        if (!existsSync(chemin)) manquants.push(chemin);
        continue;
      }
      const png = await sharp(source)
        .resize(taille, taille, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      await writeFile(chemin, png);
      ecrits++;
    }
  }

  if (controle) {
    if (manquants.length) {
      console.error(`icones-android : ${manquants.length} fichier(s) manquant(s) :`);
      for (const m of manquants) console.error(`  ${m}`);
      process.exit(1);
    }
    console.log(`icones-android : OK — ${DENSITES.length * 3} fichiers en place.`);
    return;
  }

  console.log(`icones-android : ${ecrits} icônes écrites depuis public/icons/.`);
}

await principal();
