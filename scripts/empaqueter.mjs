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
 *   - `sw.js` est le service worker du web. Dans un paquet, tout est déjà
 *     local : il n'aurait rien à mettre en cache que l'APK ne contienne, et
 *     introduirait une seconde source de vérité pour les mêmes fichiers ;
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
const DESTINATION = join('packaging', 'www');

/** Ce qui ne doit PAS entrer dans le paquet. */
const EXCLUS = new Set(['prototype', 'dev', 'sw.js']);

/** Cible d'entrée. LE POINT DANS `index.html` EST INDISPENSABLE, et c'est la
 *  leçon la plus chère de cet empaquetage.
 *
 *  Le serveur d'assets de Capacitor (`WebViewLocalServer.handleLocalRequest`)
 *  applique cette règle : si le chemin vaut « / » OU si son dernier segment ne
 *  contient AUCUN POINT, il sert le `index.html` DE LA RACINE — pas celui du
 *  dossier demandé. C'est le comportement « html5mode », pensé pour les
 *  applications à page unique.
 *
 *  Viser `/app/` revenait donc à redemander cette même page d'entrée. */
const CIBLE = '/app/index.html';

/** Page d'entrée du paquet : elle renvoie sur l'application, sans réseau.
 *
 *  LA REDIRECTION EST ABSOLUE, et c'est ce qui a coûté un écran noir.
 *  Écrite en relatif (`./app/`), elle se résolvait depuis `/app/` vers
 *  `/app/app/`, puis `/app/app/app/` : le serveur renvoyant cette page pour
 *  tout chemin sans point, chaque tour en ajoutait un. Mesuré : 3 949
 *  navigations avant abandon, et un écran noir tout du long — le WebView
 *  n'ayant jamais rien eu à peindre.
 *
 *  En absolu, la cible ne bouge plus quel que soit le chemin d'où l'on part,
 *  et elle désigne un fichier réel que le serveur lit sur le disque.
 *
 *  Cette page n'est PLUS le chemin normal : `capacitor.config.ts` démarre
 *  directement sur la cible. Elle reste un FILET pour toute navigation dure
 *  vers un chemin sans extension — un rechargement, une reprise de tâche —
 *  qui recevrait ce document au lieu de la vue demandée.
 *
 *  `replace` et non `assign` : l'entrée ne doit pas rester dans l'historique,
 *  sinon le bouton « retour » d'Android y reviendrait. La balise `meta refresh`
 *  double le script au cas où JavaScript ne serait pas encore actif. */
const ENTREE = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0; url=${CIBLE}" />
    <title>Habitum</title>
    <style>
      html { background: #04060d; }
    </style>
  </head>
  <body>
    <script>
      if (location.pathname !== ${JSON.stringify(CIBLE)}) location.replace(${JSON.stringify(CIBLE)});
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

  await rm(DESTINATION, { recursive: true, force: true });
  await mkdir(DESTINATION, { recursive: true });

  const entrees = await readdir(SOURCE, { withFileTypes: true });
  let copies = 0;
  for (const e of entrees) {
    if (EXCLUS.has(e.name)) continue;
    await cp(join(SOURCE, e.name), join(DESTINATION, e.name), { recursive: true });
    copies++;
  }

  await writeFile(join(DESTINATION, 'index.html'), ENTREE, 'utf8');

  console.log(
    `empaqueter : ${copies} entrées copiées vers ${DESTINATION}, ` +
      `${[...EXCLUS].join(' et ')} exclus, point d’entrée posé sur ${CIBLE}.`,
  );
}

await principal();
