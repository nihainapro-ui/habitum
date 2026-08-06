#!/usr/bin/env node
/* Symétrie FR/EN des libellés. Le prototype a déjà payé ce défaut :
   3 clés manquaient côté français sans que rien ne le signale. */
import { readFileSync } from 'node:fs';

const load = (l) => JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), 'utf8'));
const flat = (o, p = '') =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? flat(v, `${p}${k}.`) : [`${p}${k}`],
  );

const fr = new Set(flat(load('fr')));
const en = new Set(flat(load('en')));
const missingEn = [...fr].filter((k) => !en.has(k));
const missingFr = [...en].filter((k) => !fr.has(k));

if (missingEn.length || missingFr.length) {
  if (missingEn.length) console.error(`Manquantes en EN (${missingEn.length}) :`, missingEn.slice(0, 20));
  if (missingFr.length) console.error(`Manquantes en FR (${missingFr.length}) :`, missingFr.slice(0, 20));
  process.exit(1);
}
console.log(`OK — ${fr.size} clés, symétrie FR/EN vérifiée.`);
