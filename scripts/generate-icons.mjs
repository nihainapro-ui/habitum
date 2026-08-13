#!/usr/bin/env node
/* Icônes d'installation — tâche 5.7.

   GÉNÉRÉES, pas dessinées à la main. Trois raisons, dans cet ordre :

   1. Une icône binaire déposée dans le dépôt est une icône que personne ne sait
      régénérer six mois plus tard, et dont personne ne sait de quelle couleur
      elle est censée être.
   2. Les couleurs viennent des JETONS (`styles/tokens.css`), eux-mêmes extraits
      du prototype. L'icône ne peut donc pas dériver du produit.
   3. Aucune dépendance : un encodeur PNG tient en quarante lignes avec `zlib`,
      et le projet n'a pas besoin d'une bibliothèque d'images pour trois carrés.

   La marque est celle du produit : l'anneau `◉`, deux cercles concentriques.
   Régénérer : `node scripts/generate-icons.mjs`
   Vérifier  : `node scripts/generate-icons.mjs --check` (inclus dans `verify`) */

import { deflateSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Couleurs lues dans les jetons — jamais recopiées. */
function jetons() {
  const css = readFileSync(join(RACINE, 'styles/tokens.css'), 'utf8');
  const lire = (nom) => {
    const m = new RegExp(`--${nom}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
    if (!m) throw new Error(`jeton --${nom} introuvable dans styles/tokens.css`);
    return m[1];
  };
  return { bg: lire('bg'), acc: lire('acc'), acc2: lire('acc2') };
}

const rvb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/** Mélange deux couleurs. `t` = 0 rend `a`, `t` = 1 rend `b`. */
const melange = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/* ---------------------------------------------------------------- encodeur */

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const octet of buf) c = crcTable[(c ^ octet) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const morceau = (type, data) => {
  const longueur = Buffer.alloc(4);
  longueur.writeUInt32BE(data.length);
  const corps = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const somme = Buffer.alloc(4);
  somme.writeUInt32BE(crc32(corps));
  return Buffer.concat([longueur, corps, somme]);
};

/** Encode un tableau RGBA (`Uint8Array`, 4 octets par pixel) en PNG. */
function png(largeur, hauteur, rgba) {
  const entete = Buffer.alloc(13);
  entete.writeUInt32BE(largeur, 0);
  entete.writeUInt32BE(hauteur, 4);
  entete[8] = 8; // 8 bits par canal
  entete[9] = 6; // RGBA
  /* Une ligne PNG commence par son octet de filtre ; `0` = aucun filtre, ce qui
     coûte quelques kilo-octets et évite tout l'appareil de prédiction. */
  const brut = Buffer.alloc(hauteur * (largeur * 4 + 1));
  for (let y = 0; y < hauteur; y++) {
    const debut = y * (largeur * 4 + 1);
    brut[debut] = 0;
    Buffer.from(rgba.buffer, y * largeur * 4, largeur * 4).copy(brut, debut + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    morceau('IHDR', entete),
    morceau('IDAT', deflateSync(brut, { level: 9 })),
    morceau('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ dessin */

/** L'anneau du produit, anticrénelé par sur-échantillonnage 4×4. */
function dessiner(taille, { bg, acc, acc2 }, echelle) {
  const fond = rvb(bg);
  const c1 = rvb(acc);
  const c2 = rvb(acc2);
  const rgba = new Uint8Array(taille * taille * 4);
  const centre = taille / 2;
  const rayon = (taille / 2) * echelle;
  /* Anneau extérieur et point central, dans les proportions du glyphe `◉`. */
  const anneauExt = rayon;
  const anneauInt = rayon * 0.68;
  const point = rayon * 0.34;
  const SS = 4;

  for (let y = 0; y < taille; y++) {
    for (let x = 0; x < taille; x++) {
      let couverture = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const dx = x + (sx + 0.5) / SS - centre;
          const dy = y + (sy + 0.5) / SS - centre;
          const d = Math.hypot(dx, dy);
          if ((d <= anneauExt && d >= anneauInt) || d <= point) couverture++;
        }
      }
      const a = couverture / (SS * SS);
      /* Dégradé diagonal `acc → acc2`, celui des boutons principaux. */
      const t = Math.min(1, Math.max(0, (x + y) / (2 * taille)));
      const trait = melange(c1, c2, t);
      const i = (y * taille + x) * 4;
      const px = melange(fond, trait, a);
      rgba[i] = px[0];
      rgba[i + 1] = px[1];
      rgba[i + 2] = px[2];
      rgba[i + 3] = 255;
    }
  }
  return png(taille, taille, rgba);
}

/* ------------------------------------------------------------------ sortie */

const couleurs = jetons();

const FICHIERS = [
  /* `echelle` = part du rayon occupée par la marque. Une icône masquable doit
     tenir dans une zone sûre de 80 % : la marque y est plus petite, sinon un
     masque circulaire lui couperait l'anneau. */
  { chemin: 'public/icons/icon-192.png', taille: 192, echelle: 0.74 },
  { chemin: 'public/icons/icon-512.png', taille: 512, echelle: 0.74 },
  { chemin: 'public/icons/maskable-512.png', taille: 512, echelle: 0.52 },
  { chemin: 'app/apple-icon.png', taille: 180, echelle: 0.74 },
];

const verification = process.argv.includes('--check');
let ecart = false;

for (const f of FICHIERS) {
  const cible = join(RACINE, f.chemin);
  const contenu = dessiner(f.taille, couleurs, f.echelle);

  if (verification) {
    if (!existsSync(cible) || !readFileSync(cible).equals(contenu)) {
      console.error(`✗ ${f.chemin} diffère de ce que les jetons produisent.`);
      ecart = true;
    }
    continue;
  }

  mkdirSync(dirname(cible), { recursive: true });
  writeFileSync(cible, contenu);
  console.log(`✓ ${f.chemin} (${f.taille}×${f.taille})`);
}

if (verification) {
  if (ecart) {
    console.error('Régénérer : node scripts/generate-icons.mjs');
    process.exit(1);
  }
  console.log(`OK — ${FICHIERS.length} icônes conformes aux jetons.`);
}
