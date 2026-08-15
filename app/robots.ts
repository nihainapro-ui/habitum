import type { MetadataRoute } from 'next';
import { BASE_SITE, absolu } from '@/lib/site/routes';

/* robots.txt — tâche 7.3.
 *
 * La décision qui structure tout : l'application est un OUTIL PRIVÉ. Elle
 * n'expose aucun contenu public, ses onze routes rendent le même écran vide à
 * un robot, et chaque URL explorée là-bas est une URL qui ne l'est pas sur la
 * vitrine. Le budget d'exploration va donc entièrement à `/`.
 *
 * `/prototype` et `/dev` sont exclus pour la même raison, avec un argument de
 * plus : ce sont des pièces d'atelier. Elles servent la recette, pas les
 * lecteurs.
 *
 * `Disallow` n'est PAS une garantie — un robot mal élevé l'ignore. La garantie
 * est l'en-tête `X-Robots-Tag: noindex` posé sur les mêmes chemins dans
 * `next.config.mjs` : l'un demande de ne pas explorer, l'autre interdit
 * d'indexer. Les deux sont nécessaires, et c'est ce qu'un test vérifie. */

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/app', '/app/', '/onboarding', '/prototype', '/dev'],
      },
    ],
    sitemap: absolu('/sitemap.xml'),
    host: BASE_SITE,
  };
}
