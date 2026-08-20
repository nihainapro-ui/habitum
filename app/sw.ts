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

/* Le manifeste est INJECTÉ à la construction : il n'existe pas en
   développement, où il vaut `undefined`. Sous `exactOptionalPropertyTypes`
   (D23), passer la clé à `undefined` n'équivaut plus à ne pas la passer — et
   c'est bien la seconde qu'on veut : Serwist doit voir un worker SANS liste de
   préchargement, pas un worker dont la liste est vide.

   UNE SEULE mention de `self.__SW_MANIFEST` dans tout le fichier, et c'est
   celle-ci : l'injecteur de Serwist refuse d'en trouver deux (« Multiple
   instances of self.__SW_MANIFEST »). D'où la constante plutôt que deux
   références dans un ternaire. */
const manifeste = self.__SW_MANIFEST;

const serwist = new Serwist({
  ...(manifeste === undefined ? {} : { precacheEntries: manifeste }),
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

/* Clic sur un rappel — tâche 5.2.

   Les notifications sont affichées par CET enregistrement
   (`registration.showNotification`, voir `lib/features/reminders/permission.ts`).
   Elles survivent donc à la fermeture de l'onglet, et c'est ici — et nulle part
   ailleurs — que le clic peut être reçu.

   On RÉUTILISE un onglet déjà ouvert plutôt que d'en empiler un second : rien
   n'agace autant qu'une application qui se rouvre en double parce qu'on a
   cliqué sur son rappel. */
const CIBLE = '/app/today';

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clients) {
        if (!client.url.includes('/app')) continue;
        await client.focus();
        /* Le rappel parle de la journée : on y emmène, même si l'onglet
           ouvert était ailleurs. */
        if ('navigate' in client) await client.navigate(CIBLE).catch(() => undefined);
        return;
      }

      await self.clients.openWindow(CIBLE);
    })(),
  );
});
