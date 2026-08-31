#!/usr/bin/env node
/* Prépare la sortie statique pour l'empaquetage Android.
 *
 * `next build` avec `HABITUM_EMPAQUETE=1` produit `out/` : l'application, la
 * vitrine, la galerie de développement et l'archive du prototype. Un APK n'a
 * besoin que de la PREMIÈRE, et les trois autres ne sont pas neutres :
 *
 *   - `prototype/` pèse 773 Ko et charge React depuis `unpkg.com`. Dans un
 *     paquet qui doit démarrer sans réseau, c'est du poids mort qui, en plus,
 *     ne s'afficherait pas. C'est une pièce d'archive, pas une surface de
 *     production (CLAUDE.md § 7) ;
 *   - `dev/` est la galerie des primitives, déjà `noindex` sur le web ;
 *   - la vitrine vend le produit à qui ne l'a pas. Dans une application
 *     INSTALLÉE, elle n'a personne à convaincre.
 *
 * Reste le point d'entrée. Capacitor ouvre `index.html` à la racine de
 * `webDir` ; or à la racine de l'export vit la page d'accueil de la vitrine.
 * On la remplace donc par une redirection vers `/app/`, plutôt que de déplacer
 * l'application à la racine — un déplacement casserait tous les liens internes,
 * qui sont absolus et commencent par `/app/`.
 */

import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = 'out';
const CIBLE = join('packaging', 'www');

/** Ce qui ne doit PAS entrer dans le paquet. */
const EXCLUS = new Set(['prototype', 'dev']);

/** Page d'entrée du paquet : elle renvoie sur l'application, sans réseau.
 *
 *  `replace` et non `assign` : l'entrée ne doit pas rester dans l'historique,
 *  sinon le bouton « retour » d'Android depuis le tableau de bord ramènerait
 *  ici, qui renverrait sur le tableau de bord — une boucle dont on ne sort
 *  qu'en fermant l'application.
 *
 *  La balise `meta refresh` double le script : si JavaScript est indisponible
 *  au tout premier rendu du WebView, la redirection a lieu quand même. */
const ENTREE = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0; url=./app/" />
    <title>Habitum</title>
    <style>
      html { background: #04060d; }
    </style>
  </head>
  <body>
    <script>
      location.replace('./app/');
    </script>
  </body>
</html>
`;

async function principal() {
  if (!existsSync(SOURCE)) {
    console.error(
      `empaqueter : « ${SOURCE}/ » est absent.\n` +
        'Construire d’abord : HABITUM_EMPAQUETE=1 npm run build',
    );
    process.exit(1);
  }

  await rm(CIBLE, { recursive: true, force: true });
  await mkdir(CIBLE, { recursive: true });

  const entrees = await readdir(SOURCE, { withFileTypes: true });
  let copies = 0;
  for (const e of entrees) {
    if (EXCLUS.has(e.name)) continue;
    await cp(join(SOURCE, e.name), join(CIBLE, e.name), { recursive: true });
    copies++;
  }

  await writeFile(join(CIBLE, 'index.html'), ENTREE, 'utf8');

  console.log(
    `empaqueter : ${copies} entrées copiées vers ${CIBLE}, ` +
      `${[...EXCLUS].join(' et ')} exclus, point d’entrée posé sur /app/.`,
  );
}

await principal();
