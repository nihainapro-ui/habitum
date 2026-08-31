#!/usr/bin/env node
/* Vérifie que le contenu du paquet Android S'AFFICHE — avant de le livrer.
 *
 * POURQUOI CE CONTRÔLE EXISTE. Le premier APK produit ouvrait un ÉCRAN NOIR, et
 * aucun test du dépôt ne pouvait le voir : `npm run verify` construit et teste
 * l'application WEB, la recette e2e la sert par un serveur HTTP ordinaire, et
 * les deux passaient au vert pendant que le paquet était inutilisable.
 *
 * La cause tenait à une règle du serveur d'assets de Capacitor Android
 * (`WebViewLocalServer.handleLocalRequest`) : si le chemin vaut « / » OU si son
 * dernier segment ne contient AUCUN POINT, il sert le `index.html` DE LA
 * RACINE, et non celui du dossier demandé. Une redirection d'entrée écrite en
 * relatif se redemandait donc elle-même — `/app/`, puis `/app/app/`, puis
 * `/app/app/app/` — 3 949 fois avant abandon, sans jamais rien peindre.
 *
 * Ce script reproduit cette règle À L'IDENTIQUE, puis ouvre le paquet dans un
 * vrai navigateur et exige que quelque chose s'affiche. Il tourne dans
 * `android.yml` avant la construction Gradle : un APK noir ne doit plus
 * pouvoir être publié.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium, devices } from '@playwright/test';

const RACINE = join('packaging', 'www');
const PORT = 4599;

/** Configuration RÉELLEMENT embarquée, écrite par `cap sync`. */
const CONFIG = join(
  'packaging',
  'android',
  'app',
  'src',
  'main',
  'assets',
  'capacitor.config.json',
);

/** Compose l'URL de départ EXACTEMENT comme `Bridge.java` le fait.
 *
 *  POURQUOI CE CONTRÔLE EXISTE. La première correction de l'écran noir a posé
 *  `appStartPath: 'app/index.html'` — sans barre oblique initiale. Or le pont
 *  concatène brutalement, `appUrl += appUrlPath`, et n'ajoute « / » que pour
 *  les schémas AUTRES que `http`/`https`. L'application s'ouvrait donc sur
 *  `https://localhostapp/index.html` : un nom d'hôte qui n'existe pas, et un
 *  `ERR_NAME_NOT_RESOLVED` en plein écran.
 *
 *  Le contrôle précédent ne pouvait pas le voir : il servait le paquet
 *  correctement, mais ne vérifiait pas l'adresse par laquelle l'application y
 *  entre. Deux choses différentes, et c'est la seconde qui était fausse. */
function urlDeDepart() {
  if (!existsSync(CONFIG)) {
    console.error(`verifier-paquet : « ${CONFIG} » est absent. Lancer « npm run paquet:sync ».`);
    process.exit(1);
  }
  const cfg = JSON.parse(readFileSync(CONFIG, 'utf8'));
  const schema = cfg.server?.androidScheme ?? 'https';
  const depart = cfg.server?.appStartPath ?? '';

  let url = `${schema}://localhost`;
  /* La règle du pont, recopiée : pas de « / » ajouté pour http et https. */
  if (schema !== 'http' && schema !== 'https') url += '/';
  url += depart;
  return url;
}

const URL_DEPART = urlDeDepart();
let hote;
try {
  hote = new URL(URL_DEPART).host;
} catch {
  hote = null;
}
if (hote !== 'localhost') {
  console.error(
    `verifier-paquet : l’URL de départ est « ${URL_DEPART} », dont l’hôte vaut ` +
      `« ${hote ?? 'illisible'} » au lieu de « localhost ».\n` +
      '  `server.appStartPath` doit commencer par une barre oblique.',
  );
  process.exit(1);
}

/** Chemin de démarrage, tel que le WebView le demandera. */
const DEMARRAGE = new URL(URL_DEPART).pathname;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

if (!existsSync(RACINE)) {
  console.error(
    `verifier-paquet : « ${RACINE} » est absent. Lancer d'abord « npm run paquet:web ».`,
  );
  process.exit(1);
}

const serveur = createServer(async (req, res) => {
  const chemin = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const dernier = chemin.split('/').filter(Boolean).pop() ?? '';
  /* LA règle de Capacitor, recopiée telle quelle. */
  const versRacine = chemin === '/' || !dernier.includes('.');
  const fichier = versRacine ? join(RACINE, 'index.html') : join(RACINE, chemin);
  try {
    const corps = await readFile(fichier);
    res.writeHead(200, { 'content-type': TYPES[extname(fichier)] ?? 'application/octet-stream' });
    res.end(corps);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('404');
  }
});
await new Promise((r) => serveur.listen(PORT, r));

const navigateur = await chromium.launch();
const echecs = [];

/** Ouvre un chemin et exige un rendu, sans boucle de navigation. */
async function controler(nom, chemin) {
  const ctx = await navigateur.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage();
  const erreurs = [];
  let navigations = 0;
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('framenavigated', (f) => f === page.mainFrame() && navigations++);

  await page
    .goto(`http://localhost:${PORT}${chemin}`, { waitUntil: 'load', timeout: 20000 })
    .catch((e) => erreurs.push(String(e.message).split('\n')[0]));
  await page.waitForTimeout(3000);

  const texte = (
    await page
      .locator('body')
      .innerText()
      .catch(() => '')
  ).trim();

  if (!texte) echecs.push(`${nom} : ÉCRAN VIDE (${chemin})`);
  /* Au-delà d'une poignée, c'est une boucle : le symptôme exact du défaut. */
  if (navigations > 8) echecs.push(`${nom} : ${navigations} navigations — boucle de redirection`);
  if (erreurs.length) echecs.push(`${nom} : ${erreurs[0]}`);

  console.log(
    `  ${texte && navigations <= 8 && !erreurs.length ? 'OK  ' : 'ÉCHEC'} ${nom} — ` +
      `${navigations} navigation(s), ${texte ? `« ${texte.replace(/\s+/g, ' ').slice(0, 48)}… »` : 'rien'}`,
  );
  await ctx.close();
}

console.log('verifier-paquet : contenu du paquet Android, servi comme Capacitor le sert.');
console.log(`  URL de départ : ${URL_DEPART}`);
await controler('démarrage', DEMARRAGE);
await controler('chemin sans extension', '/app/today/');
await controler('racine', '/');

await navigateur.close();
serveur.close();

if (echecs.length) {
  console.error('\nverifier-paquet : le paquet ne s’affiche pas.');
  for (const e of echecs) console.error(`  ${e}`);
  process.exit(1);
}
console.log('verifier-paquet : le paquet s’affiche sur les trois chemins.');
