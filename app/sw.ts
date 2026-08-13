/// <reference lib="webworker" />
import { defaultCache, PAGES_CACHE_NAME } from '@serwist/next/worker';
import {
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from 'serwist';

/* Service worker — tâche 5.7, lève D25.

   Ce qu'il rend possible : l'application s'ouvre et navigue AVION ACTIVÉ. C'est
   la conséquence logique de la promesse produit — les données ne sortent pas de
   l'appareil, il n'y a donc aucune raison qu'il faille un réseau pour les
   consulter.

   Deux choix explicites :

   1. **`skipWaiting: false`.** Une nouvelle version ne remplace JAMAIS l'ancienne
      en cours de route : elle attend, et l'utilisateur décide (bandeau de mise à
      jour, `components/shell/update-banner.tsx`). Recharger sous les doigts de
      quelqu'un qui écrit une note est une perte de données, pas une mise à jour.
   2. **Aucune stratégie réseau à inventer.** Il n'y a aucun appel d'API à mettre
      en cache : `defaultCache` couvre la coquille Next et les polices
      auto-hébergées, et c'est tout ce qu'il y a à couvrir.

   CSP : `worker-src 'self'` est posé depuis la tâche 0.14 — le service worker
   est servi depuis la même origine, aucune violation n'est attendue. */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    /** Injecté au build par `@serwist/next`. */
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  /* Préchargement de navigation DÉSACTIVÉ : il lance la requête réseau en
     parallèle du démarrage du worker, ce qui fait gagner quelques dizaines de
     millisecondes en ligne — et fait échouer la navigation HORS LIGNE, où la
     réponse préchargée est une erreur réseau que la stratégie reçoit avant
     d'avoir pu consulter son cache. Entre « un peu plus rapide en ligne » et
     « fonctionne sans réseau », le produit a déjà choisi. */
  navigationPreload: false,
  runtimeCaching: [
    /* RÈGLE MAISON, EN PREMIER — et elle n'est pas cosmétique.
       La règle « pages » de `defaultCache` filtre sur l'en-tête `Content-Type`
       de la REQUÊTE. Une navigation n'en envoie pas : elle envoie `Accept`. La
       règle ne s'applique donc jamais aux documents, ceux-ci retombent sur la
       règle générique, et son cache n'est pas celui que remplit
       `cacheOnNavigation` — d'où un document présent en cache que rien ne va
       chercher. Mesuré le 13 août 2026 : la page était bien cachée, et le
       rechargement hors ligne échouait quand même.

       On filtre donc sur `request.mode === 'navigate'`, et on écrit dans LE
       cache que l'autre mécanisme remplit. */
    {
      matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE_NAME.html,
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 3600 })],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
