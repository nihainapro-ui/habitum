#!/usr/bin/env node
/* Vérifications post-déploiement — tâche 8.9 du plan 8.
 *
 *   node scripts/verif-production.mjs https://exemple.tld
 *
 * Le plan en liste ONZE. Ce script en couvre SEPT — celles qui se décident sur
 * une réponse HTTP, donc sans navigateur. Les quatre autres demandent une page
 * rendue (hors ligne, aller-retour export/import, bascule FR↔EN, trois thèmes,
 * requêtes tierces) : elles sont couvertes par la suite e2e, qu'on pointe sur
 * la production avec `BASE_URL=https://exemple.tld npm run test:e2e`.
 *
 * POURQUOI UN SCRIPT plutôt qu'une liste à cocher : une vérification manuelle
 * se fait une fois, le jour du lancement, par quelqu'un qui sait déjà ce qu'il
 * cherche. Celle-ci se rejoue à chaque déploiement, par quelqu'un qui ne sait
 * rien — et elle échoue bruyamment.
 *
 * Aucune dépendance : `fetch` natif, et rien d'autre.
 */

const base = (process.argv[2] ?? '').replace(/\/+$/, '');

if (!base || !/^https?:\/\//.test(base)) {
  console.error('Usage : node scripts/verif-production.mjs https://exemple.tld');
  process.exit(2);
}

/* Les onze vues applicatives — celles que `NAV_ITEMS` déclare. */
const ROUTES_APP = [
  '/app',
  '/app/today',
  '/app/calendar',
  '/app/habits',
  '/app/tasks',
  '/app/goals',
  '/app/stats',
  '/app/timer',
  '/app/notes',
  '/app/profile',
  '/app/settings',
];

/* La vitrine — les vingt-quatre URL bilingues de la phase 6, échantillonnées
   sur chaque FAMILLE plutôt qu'énumérées : une famille qui casse casse en
   entier, et une liste exhaustive se périme à la première page ajoutée. */
const ROUTES_SITE = [
  '/',
  '/fonctionnalites',
  '/comparatifs',
  '/comparatifs/habitnow',
  '/guides',
  '/guides/arreter-alcool',
  '/confidentialite',
  '/mentions-legales',
  '/en',
  '/en/features',
  '/en/comparisons/habitnow',
  '/en/guides/quit-alcohol',
  '/en/privacy',
  '/en/legal',
];

let echecs = 0;
let controles = 0;

const ok = (quoi, detail = '') => {
  controles++;
  console.log(`  ✓ ${quoi}${detail ? ` — ${detail}` : ''}`);
};

const ko = (quoi, detail) => {
  controles++;
  echecs++;
  console.log(`  ✗ ${quoi} — ${detail}`);
};

const titre = (n, texte) => console.log(`\n${n}. ${texte}`);

/** `fetch` sans suivre les redirections : une route qui répond 200 APRÈS un
 *  renvoi ne répond pas 200, et c'est précisément ce qu'on veut savoir. */
const chercher = async (chemin, options = {}) => {
  try {
    return await fetch(base + chemin, { redirect: 'manual', ...options });
  } catch (e) {
    return { erreurReseau: e instanceof Error ? e.message : String(e) };
  }
};

/* ---- 1. Toutes les routes répondent 200 -------------------------------- */
titre(1, 'Les routes répondent');

for (const chemin of [...ROUTES_SITE, ...ROUTES_APP]) {
  const r = await chercher(chemin);
  if (r.erreurReseau) ko(chemin, r.erreurReseau);
  else if (r.status === 200) ok(chemin);
  else ko(chemin, `HTTP ${r.status}`);
}

/* ---- 2. L'application est noindex, la vitrine ne l'est pas -------------- */
titre(2, 'Indexation : la vitrine oui, l’application non');

const enTeteApp = await chercher('/app/habits');
const robotsApp = enTeteApp.headers?.get('x-robots-tag') ?? '';
if (/noindex/i.test(robotsApp)) ok('/app/habits porte X-Robots-Tag: noindex', robotsApp);
else ko('/app/habits devrait être noindex', `X-Robots-Tag: « ${robotsApp || 'absent'} »`);

const enTeteSite = await chercher('/');
const robotsSite = enTeteSite.headers?.get('x-robots-tag') ?? '';
if (/noindex/i.test(robotsSite)) ko('/ ne doit PAS être noindex', `X-Robots-Tag: ${robotsSite}`);
else ok('/ est indexable');

/* ---- 3. robots.txt ------------------------------------------------------ */
titre(3, 'robots.txt');

const robots = await chercher('/robots.txt');
const robotsTexte = robots.text ? await robots.text() : '';
for (const [motif, quoi] of [
  [/Disallow:\s*\/app/i, 'interdit /app'],
  [/Disallow:\s*\/prototype/i, 'interdit /prototype'],
  [/Sitemap:\s*https?:\/\//i, 'déclare un sitemap absolu'],
]) {
  if (motif.test(robotsTexte)) ok(`robots.txt ${quoi}`);
  else ko(`robots.txt ${quoi}`, 'motif absent');
}

/* ---- 4. sitemap.xml ----------------------------------------------------- */
titre(4, 'sitemap.xml');

const plan = await chercher('/sitemap.xml');
const planTexte = plan.text ? await plan.text() : '';

if (planTexte.includes('<urlset')) ok('sitemap.xml est un urlset');
else ko('sitemap.xml est un urlset', 'balise absente');

/* LE contrôle qui attrape l'oubli le plus coûteux : une variable
   `NEXT_PUBLIC_SITE_URL` non posée produit un plan du site qui annonce
   localhost à tous les moteurs. */
if (/localhost|127\.0\.0\.1/.test(planTexte)) {
  ko('sitemap.xml n’annonce pas localhost', 'NEXT_PUBLIC_SITE_URL n’est pas posée');
} else ok('sitemap.xml n’annonce pas localhost');

if (planTexte.includes(base)) ok('sitemap.xml annonce le bon domaine', base);
else ko('sitemap.xml annonce le bon domaine', `« ${base} » introuvable`);

if (/\/app(\/|<)/.test(planTexte))
  ko('sitemap.xml ne liste aucune route applicative', '/app listé');
else ok('sitemap.xml ne liste aucune route applicative');

/* ---- 5. En-têtes de sécurité -------------------------------------------- */
titre(5, 'En-têtes de sécurité');

const attendus = [
  ['content-security-policy', /default-src 'self'/],
  ['strict-transport-security', /max-age=\d+/],
  ['x-frame-options', /DENY/i],
  ['x-content-type-options', /nosniff/i],
  ['referrer-policy', /no-referrer/i],
  ['permissions-policy', /camera=\(\)/],
];

for (const [nom, motif] of attendus) {
  const valeur = enTeteSite.headers?.get(nom) ?? '';
  if (motif.test(valeur)) ok(nom);
  else ko(nom, valeur ? `valeur inattendue : ${valeur.slice(0, 60)}` : 'absent');
}

/* `X-Powered-By` renseigne gratuitement un attaquant sur le cadre servi. */
if (enTeteSite.headers?.get('x-powered-by')) {
  ko('X-Powered-By absent', enTeteSite.headers.get('x-powered-by'));
} else ok('X-Powered-By absent');

/* ---- 6. PWA : manifeste et service worker ------------------------------- */
titre(6, 'PWA');

const manifeste = await chercher('/manifest.webmanifest');
if (manifeste.status === 200) {
  const m = JSON.parse(await manifeste.text());
  ok('manifest.webmanifest servi');
  if (m.start_url === '/app') ok('start_url vaut /app', m.start_url);
  else ko('start_url doit valoir /app', `« ${m.start_url} »`);
  if ((m.icons ?? []).length >= 2) ok('le manifeste déclare ses icônes', `${m.icons.length}`);
  else ko('le manifeste déclare ses icônes', `${(m.icons ?? []).length} icône(s)`);
} else ko('manifest.webmanifest servi', `HTTP ${manifeste.status}`);

const sw = await chercher('/sw.js');
if (sw.status === 200) ok('sw.js servi');
else ko('sw.js servi', `HTTP ${sw.status}`);

/* ---- 7. Le prototype reste ouvrable, et non indexé ---------------------- */
titre(7, 'Le prototype, archive servie telle quelle');

const proto = await chercher('/prototype/Habitum.dc.html');
if (proto.status === 200) ok('le prototype répond');
else ko('le prototype répond', `HTTP ${proto.status}`);

/* ---- Verdict ------------------------------------------------------------ */
console.log(`\n${'─'.repeat(66)}`);
if (echecs === 0) {
  console.log(`${controles} contrôles, tous verts sur ${base}.`);
  console.log('\nRestent les quatre qui demandent un navigateur :');
  console.log(`  BASE_URL=${base} npm run test:e2e`);
  console.log('  puis Lighthouse, et la sonde (gh variable set SITE_URL).');
} else {
  console.log(`${echecs} ÉCHEC(S) sur ${controles} contrôles — ${base}`);
}
process.exit(echecs === 0 ? 0 : 1);
