import createNextIntlPlugin from 'next-intl/plugin';
import withSerwistInit from '@serwist/next';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/* PWA — tâche 5.7. Serwist (MIT, successeur de next-pwa) compile `app/sw.ts`
   vers `public/sw.js` et y injecte la liste de précache.

   DÉSACTIVÉ EN DÉVELOPPEMENT : un service worker qui met en cache pendant que
   Fast Refresh recompile sert des morceaux de deux versions différentes, et
   fait perdre des heures à chercher un bogue qui n'existe pas. */
const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  /* Les vues visitées sont mises en cache au passage. Le précache ne contient
     que la coquille et les ressources statiques : les documents des onze routes
     n'y sont pas, et ne peuvent pas y être — leur HTML référence des morceaux
     dont l'empreinte change à chaque build, et un document précaché périmé
     chargerait des fichiers qui n'existent plus. La limite est donc assumée et
     écrite : une route jamais ouverte demande une connexion, une fois. */
  cacheOnNavigation: true,
  /* L'archive du prototype est HORS du service worker : elle a son propre jeu
     d'en-têtes, elle charge React depuis unpkg.com, et rien ne justifie de la
     précharger — c'est une pièce d'archive, pas une surface de production.

     Les DEUX options sont nécessaires, et c'est ce qui a failli passer :
     `exclude` filtre les sorties du build, `globPublicPatterns` filtre
     `public/`. Sans la seconde, le précache embarquait les 336 Ko du prototype
     ET ses captures de référence — plusieurs mégaoctets téléchargés à
     l'installation, pour un fichier que personne n'ouvrira hors ligne. */
  exclude: [/\.map$/, /^manifest.*\.js$/],
  globPublicPatterns: ['**/*', '!prototype/**', '!sw.js'],
});

/* D9 — en-têtes de sécurité (tâche T8.5 du backlog).

   Habitum ne charge aucune ressource tierce et n'appelle aucun service : la
   politique peut donc être stricte, sans concession. C'est un cas rare, et
   c'est directement la conséquence de la promesse produit.

   DEUX tolérances, toutes deux datées et rattachées à une décision à venir :

   1. `style-src 'unsafe-inline'` — nécessaire tant que des styles en ligne
      subsistent dans les composants (ADR-0005). Tombe quand les primitives UI
      seront portées sur des classes (phase « Système visuel »).

   2. `script-src 'unsafe-inline'` — mesuré le 6 août 2026 : sans cette
      tolérance, Next.js ne s'hydrate pas. Treize scripts en ligne sont bloqués
      (charges de streaming du App Router) et l'application reste un rendu
      serveur mort. Les deux sorties propres sont un `nonce` par requête via un
      middleware, ou des empreintes régénérées à chaque build — et le nonce
      impose un rendu dynamique, ce qui entre en conflit direct avec l'objectif
      « zéro invocation serverless » (défaut D12, phase « État & coque »,
      tâche 2.6). Les deux sujets doivent être tranchés ENSEMBLE, pas l'un
      après l'autre.

      Ce que cette tolérance coûte réellement ici : le produit ne rend aucun
      HTML d'origine utilisateur, n'utilise nulle part `dangerouslySetInnerHTML`
      (vérifié : zéro occurrence, y compris dans le prototype) et ne charge
      aucun script tiers. La surface d'injection est proche de zéro — ce qui
      n'en fait pas une bonne CSP, seulement une CSP dont le risque résiduel
      est connu et mesuré.

   `img-src data: blob:` sert aux avatars OKLCH générés côté client et aux
   exports téléchargés en mémoire. */
/* Fast Refresh évalue du code en chaîne : `next dev` ne s'hydrate pas sous une
   CSP sans `unsafe-eval`, et l'application reste un rendu mort — constaté le
   8 août 2026, en montant la coque applicative. La tolérance est donc posée
   POUR LE DÉVELOPPEMENT SEUL. La production n'est pas touchée, et le test
   e2e des en-têtes tourne sur le build de production : il verrouille bien ce
   qui est servi aux utilisateurs. */
const DEV = process.env.NODE_ENV === 'development';

const CSP = [
  "default-src 'self'",
  /* ADR-0007 — la question du nonce est tranchée : le rendu statique gagne, un
     nonce imposerait une invocation serveur par affichage. La sortie propre
     pour le script de thème (phase 3) est une EMPREINTE SHA-256, pas un nonce. */
  `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const SECURITE = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=(), serial=()',
  },
];

/* CONSTRUCTION EMPAQUETÉE — `HABITUM_EMPAQUETE=1`.
 *
 *  L'APK Android (et, plus tard, le bureau) embarque l'application ENTIÈRE :
 *  aucun serveur, aucun domaine, rien qui dépende de Vercel. C'est ce que la
 *  promesse local-first exige — un paquet qui aurait besoin du réseau pour
 *  démarrer la contredirait.
 *
 *  Cela impose `output: 'export'`, et il faut savoir ce qu'on y perd :
 *  `headers()` ci-dessous n'est PAS appliqué à un export statique. Next
 *  l'ignore, avec un avertissement. Ce n'est pas grave DANS UN PAQUET — la CSP
 *  et le `noindex` protègent d'un navigateur et d'un moteur de recherche, dont
 *  aucun ne visite l'intérieur d'un APK — mais ce serait grave sur le web.
 *  D'où le drapeau : la construction web par défaut ne change en RIEN, et
 *  `headers.spec.ts` continue de l'imposer.
 *
 *  Le service worker est retiré du paquet : dans un APK tout est déjà local,
 *  et un cache de second niveau ne ferait que servir des morceaux périmés. */
const empaquete = process.env.HABITUM_EMPAQUETE === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  ...(empaquete
    ? {
        output: 'export',
        /* Sans barre oblique finale, `file://` ne résout pas `/app/today` vers
           un document : le WebView cherche un fichier, pas un dossier. */
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),

  /* Tâche 7.1 — active `app/global-not-found.tsx`.

     Trois layouts racines valent trois documents, et Next n'en choisit aucun
     pour une URL qui ne correspond à rien : sans ce drapeau, une adresse
     inconnue reçoit la page interne de Next, sans attribut `lang`, sans marque
     et sans retour possible. C'est le mécanisme prévu pour ce cas précis.

     S'IL DISPARAÎT OU CHANGE DE NOM à une montée de version : la sortie de
     repli est un 404 par groupe (`not-found.tsx`, déjà en place) et la page
     interne pour les URL hors périmètre. Ne PAS le remplacer par un fourre-tout
     `[...slug]` : sans créneau prérendu il ne correspond à rien, et avec un
     rendu à la demande chaque 404 redevient une invocation serveur (D12). */
  experimental: { globalNotFound: true },
  // Ne pas annoncer le framework : renseignement gratuit pour un attaquant.
  poweredByHeader: false,

  /* Tâche 8.8 — date de construction, FIGÉE À LA COMPILATION.
     La page « À propos » l'affiche pour rendre un rapport d'anomalie
     exploitable (docs/RUNBOOK.md § 4). Elle est évaluée ici, une fois, et
     inlinée dans le bundle : les pages sont prérendues, donc un `new Date()`
     au rendu donnerait la date du build côté serveur et celle de l'ouverture
     côté client — deux valeurs pour le même écran, c'est-à-dire un chiffre
     fabriqué (CLAUDE.md § 3).
     `SOURCE_DATE_EPOCH` est honoré s'il est posé : c'est la convention des
     constructions reproductibles, et elle permet de comparer deux artefacts. */
  env: {
    NEXT_PUBLIC_BUILD_DATE: new Date(
      process.env.SOURCE_DATE_EPOCH ? Number(process.env.SOURCE_DATE_EPOCH) * 1000 : Date.now(),
    ).toISOString(),
  },
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },

  /* ADR-0007 (décision G) — l'application vit sous /app, la racine appartient à
     la vitrine (phase 6, tâche 7.1). La redirection temporaire `/ → /app` qui
     tenait la place a été retirée : elle était posée en `permanent: false`
     précisément pour qu'aucun navigateur ne l'ait mise en cache le jour où la
     vitrine prendrait `/`. C'est ce jour. */

  async headers() {
    return [
      /* Le motif EXCLUT `/prototype` — et ce n'est pas un détail.
         Next applique TOUTES les règles dont le motif correspond : `/:path*`
         attrapait aussi l'archive, qui recevait donc la CSP stricte de
         l'application EN PLUS de son jeu réduit. Son moteur charge React par
         balise `<script>` externe ; `script-src 'self'` le bloquait, et
         l'archive était servie MORTE depuis la tâche 0.14 — HTTP 200, page
         vide. Le test de fumée ne vérifiait que le code de statut, d'où six
         jours sans que ça se voie. */
      { source: '/((?!prototype/).*)', headers: SECURITE },

      /* ÉCART ASSUMÉ AU PLAN — celui-ci redirigeait `/dev/*` en production.
         Les tests e2e tournent sur le build de production : la galerie y
         aurait été inatteignable, et le critère de sortie n° 1 de la phase
         (« les 12 primitives, 3 thèmes, sans erreur console ») serait devenu
         invérifiable. Un critère qu'on ne peut pas vérifier ne protège rien.

         Elle reste donc servie, mais `noindex` et sans aucun lien entrant.
         Elle n'affiche aucune donnée d'utilisateur et n'expose aucune action
         privilégiée : c'est une page statique de composants. */
      { source: '/dev/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },

      /* Tâche 7.3 — l'application est un OUTIL PRIVÉ, et `robots.txt` ne
         suffit pas à le garantir : `Disallow` est une demande, un en-tête
         `noindex` est une instruction. Une URL applicative partagée dans un
         message, puis explorée par un robot qui ignore robots.txt, serait
         indexée sans cet en-tête — et une page d'application vide indexée
         sous la marque coûte exactement ce que la vitrine cherche à gagner.

         Les deux motifs sont posés : `/app/:path*` ne couvre pas `/app` nu
         dans toutes les versions de la correspondance de chemins, et le
         tableau de bord est justement l'URL qu'on partage. */
      { source: '/app', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/app/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      {
        source: '/onboarding',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },

      /* L'archive a son propre jeu, complet et explicite. Elle est hors
         périmètre de sécurité (tâche 0.15) : ce n'est pas une surface de
         production, c'est la référence exécutable des onze vues, et
         CLAUDE.md exige qu'elle « continue de s'ouvrir seule ».

         LIMITE CONNUE : son moteur charge React depuis unpkg.com, avec
         contrôle d'intégrité (SRI dans support.js). Elle ne s'ouvre donc pas
         hors ligne. C'est une propriété héritée de l'archive, pas une
         régression ; la corriger demande d'auto-héberger les deux fichiers
         UMD dans public/prototype/vendor/ et d'ajuster support.js. */
      {
        source: '/prototype/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://unpkg.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "connect-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
};

/* Le service worker n'est compilé QUE pour le web. Dans un paquet, il n'a rien
   à mettre en cache que le paquet ne contienne déjà — et il introduirait une
   seconde source de vérité pour les mêmes fichiers. */
export default empaquete ? withNextIntl(nextConfig) : withSerwist(withNextIntl(nextConfig));
