import type { MetadataRoute } from 'next';

/* Manifeste d'installation — tâche 5.7, lève D25.

   ÉCART ASSUMÉ AU PLAN, qui prescrivait `start_url: "/"`. La racine est
   réservée à la vitrine de la phase 6 (décision G, ADR-0007) et redirige
   aujourd'hui vers `/app`. Une application installée doit ouvrir
   l'APPLICATION : pointer sur `/` ferait démarrer chaque lancement par une
   redirection, et deviendrait carrément faux le jour où `/` servira une page
   de présentation.

   `scope` reste `/` pour que l'archive et les redirections restent dans le
   périmètre du service worker.

   Les couleurs sont celles des jetons (`--bg`), et les icônes sont générées par
   `scripts/generate-icons.mjs` depuis ces mêmes jetons. */

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/app',
    name: 'Habitum',
    short_name: 'Habitum',
    description: 'Habitudes, tâches, objectifs et temps de focus — local-first, sans compte.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#04060d',
    theme_color: '#04060d',
    lang: 'fr',
    dir: 'ltr',
    categories: ['productivity', 'lifestyle', 'health'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Aujourd’hui', url: '/app/today' },
      { name: 'Focus', url: '/app/timer' },
    ],
  };
}
