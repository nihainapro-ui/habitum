import Link from 'next/link';
import { CoqueSite } from '@/components/site/coque';
import { JsonLd } from '@/components/site/jsonld';
import { filDAriane } from '@/lib/seo/jsonld';
import {
  COMPARATIFS,
  GUIDES,
  cheminComparatif,
  cheminGuide,
  cheminPage,
  type LangueSite,
  type Page,
} from '@/lib/site/routes';
import { comparatif } from '@/lib/site/contenu/comparatifs';
import { guide } from '@/lib/site/contenu/guides';
import { textes } from '@/lib/site/textes';

/* Index d'une rubrique — comparatifs ou guides.
 *
 * Le plan ne les demandait pas explicitement, mais la navigation les exige :
 * un menu qui annonce « Comparatifs » doit mener quelque part, et six articles
 * atteignables uniquement depuis le bas de l'accueil sont six articles que le
 * moteur explore mal et que le lecteur ne trouve pas. */

export function PageRubrique({
  langue,
  rubrique,
}: {
  langue: LangueSite;
  rubrique: Extract<Page, 'comparatifs' | 'guides'>;
}) {
  const t = textes(langue);
  const bloc = rubrique === 'comparatifs' ? t.comparatifs : t.guides;
  const chemin = cheminPage(rubrique, langue);

  const articles =
    rubrique === 'comparatifs'
      ? COMPARATIFS.map((id) => ({
          chemin: cheminComparatif(id, langue),
          article: comparatif(id, langue),
        }))
      : GUIDES.map((id) => ({ chemin: cheminGuide(id, langue), article: guide(id, langue) }));

  return (
    <CoqueSite langue={langue} chemin={chemin}>
      <JsonLd
        bloc={filDAriane([
          { nom: t.article.filAccueil, chemin: cheminPage('accueil', langue) },
          { nom: bloc.titre, chemin },
        ])}
      />

      <nav className="fil" aria-label={bloc.titre}>
        <ol>
          <li>
            <Link href={cheminPage('accueil', langue)}>{t.article.filAccueil}</Link>
          </li>
          <li aria-current="page">{bloc.titre}</li>
        </ol>
      </nav>

      <section className="article">
        <h1>{bloc.titre}</h1>
        <p className="article-chapeau">{bloc.chapeau}</p>
      </section>

      <ul className="carte-liste">
        {articles.map(({ chemin: vers, article }) => (
          <li key={vers}>
            <Link className="carte carte-lien" href={vers}>
              <h2>{article.titre}</h2>
              <p className="attenue">{article.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </CoqueSite>
  );
}
