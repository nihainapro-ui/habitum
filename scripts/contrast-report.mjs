#!/usr/bin/env node
/* Rapport de contraste — sert à DÉCIDER, pas à contrôler.
 * Le contrôle, lui, vit dans tests/unit/contrast.test.ts.
 *
 *   node scripts/contrast-report.mjs
 */
import { readFileSync } from 'node:fs';

const SOURCE = readFileSync('styles/tokens.css', 'utf8');

function jetons(theme) {
  const selecteur = theme === 'neural' ? ':root' : `\\[data-theme='${theme}'\\]`;
  const bloc = new RegExp(`${selecteur}\\s*\\{([^}]*)\\}`).exec(SOURCE);
  const table = {};
  for (const ligne of bloc[1].split(';')) {
    const m = /^\s*--([\w-]+)\s*:\s*(.+?)\s*$/.exec(ligne);
    if (m) table[m[1]] = m[2];
  }
  return table;
}

function composantes(valeur, fond) {
  /* Découpage plutôt qu'expression régulière : voir tests/unit/contrast.test.ts. */
  const brut = valeur.trim();
  if (brut.startsWith('rgb')) {
    const parties = brut
      .slice(brut.indexOf('(') + 1, brut.lastIndexOf(')'))
      .split(',')
      .map((x) => Number(x.trim()));
    const [r, v, b] = parties;
    const a = parties.length > 3 ? parties[3] : 1;
    if (a >= 1 || !fond) return [r, v, b];
    return [r * a + fond[0] * (1 - a), v * a + fond[1] * (1 - a), b * a + fond[2] * (1 - a)];
  }
  const hex = valeur.trim().replace('#', '');
  const court = hex.length === 3;
  const lire = (i) => parseInt(court ? hex[i].repeat(2) : hex.slice(i * 2, i * 2 + 2), 16);
  return [lire(0), lire(1), lire(2)];
}

const luminance = ([r, v, b]) => {
  const canal = (c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(v) + 0.0722 * canal(b);
};

const PAIRES = [
  ['txt', 'bg'],
  ['txt2', 'bg'],
  ['mut', 'bg'],
  ['txt', 'bg2'],
  ['mut', 'bg2'],
];

for (const theme of ['neural', 'plasma', 'clinical']) {
  const table = jetons(theme);
  console.log(`\n${theme}  (--mut = ${table.mut})`);
  for (const [avant, arriere] of PAIRES) {
    const fond = composantes(table[arriere]);
    const texte = composantes(table[avant], fond);
    const [a, b] = [luminance(texte), luminance(fond)].sort((x, y) => y - x);
    const r = (a + 0.05) / (b + 0.05);
    const drapeaux = [r < 4.5 ? '< 4.5 normal' : '', r < 3 ? '< 3 LARGE' : ''].filter(Boolean);
    console.log(
      `  --${avant.padEnd(5)} / --${arriere.padEnd(4)}  ${r.toFixed(2).padStart(6)}  ${drapeaux.join(' · ')}`,
    );
  }
}
