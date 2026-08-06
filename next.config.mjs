import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

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
const CSP = [
  "default-src 'self'",
  // TODO(D12/2.6) — remplacer par un nonce ou des empreintes, en même temps
  // que la décision sur le rendu statique. Ne pas traiter séparément.
  "script-src 'self' 'unsafe-inline'",
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ne pas annoncer le framework : renseignement gratuit pour un attaquant.
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },

  async headers() {
    return [
      { source: '/:path*', headers: SECURITE },
      /* Le prototype vit dans public/prototype/ : servi tel quel, jamais
         compilé, jamais indexé. Il charge encore Google Fonts (défaut D8) et
         ne peut donc pas vivre sous la CSP de l'application tant que ce n'est
         pas corrigé — d'où un jeu d'en-têtes réduit mais explicite.
         C'est une archive de référence, pas une surface de production. */
      {
        source: '/prototype/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
