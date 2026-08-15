import { serialiser, type BlocJsonLd } from '@/lib/seo/jsonld';

/* Un bloc `application/ld+json` par entité déclarée — tâche 7.4.
 *
 * L'enfant est TEXTUEL, jamais `dangerouslySetInnerHTML` : React ne réencode
 * pas le contenu d'un `<script>`, et `serialiser` neutralise `<`. Voir
 * `lib/seo/jsonld.ts` pour le pourquoi complet. */
export function JsonLd({ bloc }: { bloc: BlocJsonLd }) {
  return <script type="application/ld+json">{serialiser(bloc)}</script>;
}
