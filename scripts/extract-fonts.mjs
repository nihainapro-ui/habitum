#!/usr/bin/env node
/* Extrait les polices auto-hébergées depuis les paquets @fontsource.
 *
 * Pourquoi versionner les `.woff2` au lieu de les copier à la construction :
 * le prototype les charge par un chemin RELATIF et doit continuer à s'ouvrir
 * seul, hors de tout outillage (CLAUDE.md — « une pièce d'archive qui doit
 * continuer à s'ouvrir seule dans un navigateur »).
 *
 *   node scripts/extract-fonts.mjs           régénère public/fonts/
 *   node scripts/extract-fonts.mjs --check   échoue si un fichier manque ou diffère
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const SORTIE = 'public/fonts';

const FAMILLES = [
  {
    pkg: '@fontsource/space-grotesk',
    slug: 'space-grotesk',
    nom: 'SpaceGrotesk',
    poids: { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' },
  },
  {
    pkg: '@fontsource/jetbrains-mono',
    slug: 'jetbrains-mono',
    nom: 'JetBrainsMono',
    poids: { 400: 'Regular', 500: 'Medium', 700: 'Bold' },
  },
  /* Archivo — police du système Modernist, et de la VITRINE SEULE (tâche 7.1).
     Elle n'est jamais chargée par l'application : les deux registres ne se
     mélangent pas (décision B1). Le `.woff` accompagne le `.woff2` parce que
     Satori — le moteur de `next/og` qui compose l'image sociale — ne sait pas
     lire le woff2. Sans lui, l'image Open Graph tomberait sur une police
     distante, ce que la CSP interdit et que la promesse produit interdit
     aussi. */
  {
    pkg: '@fontsource/archivo',
    slug: 'archivo',
    nom: 'Archivo',
    poids: { 400: 'Regular', 600: 'SemiBold', 800: 'ExtraBold' },
    woffAussi: [800],
  },
];

const controle = process.argv.includes('--check');
const empreinte = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');

let ecarts = 0;

const rapprocher = (source, cible) => {
  if (!existsSync(source)) {
    console.error(`source introuvable : ${source}`);
    process.exit(1);
  }
  if (controle) {
    if (!existsSync(cible) || empreinte(source) !== empreinte(cible)) {
      console.error(`écart : ${cible}`);
      ecarts++;
    }
    return;
  }
  copyFileSync(source, cible);
};

for (const f of FAMILLES) {
  const base = `node_modules/${f.pkg}`;
  for (const [poids, variante] of Object.entries(f.poids)) {
    rapprocher(
      `${base}/files/${f.slug}-latin-${poids}-normal.woff2`,
      `${SORTIE}/${f.nom}-${variante}.woff2`,
    );
    if (f.woffAussi?.includes(Number(poids))) {
      rapprocher(
        `${base}/files/${f.slug}-latin-${poids}-normal.woff`,
        `${SORTIE}/${f.nom}-${variante}.woff`,
      );
    }
  }

  /* Le texte de l'OFL doit accompagner les fichiers : c'est une obligation de
     la licence, pas une politesse. */
  const licence = readdirSync(base).find((n) => /^LICENSE/i.test(n));
  if (!licence) {
    console.error(`licence introuvable dans ${base}`);
    process.exit(1);
  }
  rapprocher(`${base}/${licence}`, `${SORTIE}/${f.nom}-OFL.txt`);
}

if (controle) {
  if (ecarts) {
    console.error(`\n${ecarts} écart(s) — lancer « node scripts/extract-fonts.mjs ».`);
    process.exit(1);
  }
  console.log('OK — polices conformes aux paquets @fontsource.');
} else {
  writeFileSync(
    `${SORTIE}/README.md`,
    [
      '# Polices auto-hébergées',
      '',
      'Space Grotesk, JetBrains Mono et Archivo, sous licence **OFL 1.1** — texte',
      "joint (`*-OFL.txt`), comme la licence l'exige.",
      '',
      "Archivo sert la VITRINE seule (système Modernist) ; l'application garde",
      'Space Grotesk et JetBrains Mono. `Archivo-ExtraBold.woff` accompagne le',
      '`woff2` pour `next/og` : Satori ne lit pas le woff2.',
      '',
      'FICHIERS GÉNÉRÉS par `scripts/extract-fonts.mjs` depuis les paquets',
      '`@fontsource/*` (sous-ensemble latin, `woff2`). Ils sont versionnés plutôt',
      'que copiés à la construction : le prototype les charge par un chemin relatif',
      "et doit continuer à s'ouvrir seul, hors de tout outillage.",
      '',
      'Aucune requête ne sort du domaine — `tests/e2e/fonts.spec.ts` échoue si une',
      'seule réapparaît.',
      '',
    ].join('\n'),
  );
  console.log(`polices écrites dans ${SORTIE}/`);
}
