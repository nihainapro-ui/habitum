import Link from 'next/link';
import { Blocs } from '@/components/site/blocs';
import { CoqueSite } from '@/components/site/coque';
import { JsonLd } from '@/components/site/jsonld';
import { filDAriane, pageDeFond } from '@/lib/seo/jsonld';
import type { Article } from '@/lib/site/contenu/types';
import { dateLongue } from '@/lib/site/contenu/legal';
import { cheminPage, type LangueSite, type Page } from '@/lib/site/routes';
import { textes } from '@/lib/site/textes';

/* Gabarit d'un article de fond — comparatif ou guide, tâche 7.5.
 *
 * Il porte le fil d'Ariane à l'écran ET en JSON-LD, à partir de la même source :
 * un fil affiché qui ne correspond pas au fil déclaré est exactement le genre
 * d'incohérence qu'un moteur relève et qu'un relecteur ne voit pas. */

export function PageArticle({
  langue,
  chemin,
  article,
  rubrique,
  suite,
}: {
  langue: LangueSite;
  chemin: string;
  article: Article;
  /** Rubrique parente : « comparatifs » ou « guides ». */
  rubrique: Extract<Page, 'comparatifs' | 'guides'>;
  /** Maillage interne : les autres articles de la rubrique. */
  suite: readonly { titre: string; chemin: string }[];
}) {
  const t = textes(langue);
  const cheminAccueil = cheminPage('accueil', langue);
  const cheminRubrique = cheminPage(rubrique, langue);
  const nomRubrique = rubrique === 'comparatifs' ? t.article.filComparatifs : t.article.filGuides;

  const relu = `${t.article.relu} ${dateLongue(article.reluLe, langue)}`;

  const miettes = [
    { nom: t.article.filAccueil, chemin: cheminAccueil },
    { nom: nomRubrique, chemin: cheminRubrique },
    { nom: article.titre, chemin },
  ];

  return (
    <CoqueSite langue={langue} chemin={chemin}>
      <JsonLd
        bloc={pageDeFond({
          langue,
          titre: article.titre,
          description: article.description,
          chemin,
          publieLe: article.publieLe,
          reluLe: article.reluLe,
        })}
      />
      <JsonLd bloc={filDAriane(miettes)} />

      <nav className="fil" aria-label={nomRubrique}>
        <ol>
          <li>
            <Link href={cheminAccueil}>{t.article.filAccueil}</Link>
          </li>
          <li>
            <Link href={cheminRubrique}>{nomRubrique}</Link>
          </li>
          <li aria-current="page">{article.titre}</li>
        </ol>
      </nav>

      <article className="article">
        <h1>{article.titre}</h1>
        <p className="article-date">{relu}</p>
        <p className="article-chapeau">{article.chapeau}</p>

        <Blocs blocs={article.blocs} />

        {article.sources && article.sources.length > 0 ? (
          <div className="article-suite">
            <h2>{t.article.verifier}</h2>
            <p>{t.article.verifierTexte}</p>
            <ul>
              {article.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} rel="nofollow noreferrer">
                    {source.nom}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="article-suite">
          <h2>{t.article.lireAussi}</h2>
          <ul>
            {suite.map((autre) => (
              <li key={autre.chemin}>
                <Link href={autre.chemin}>{autre.titre}</Link>
              </li>
            ))}
            <li>
              <Link href={cheminPage('fonctionnalites', langue)}>
                {t.chrome.navFonctionnalites}
              </Link>
            </li>
            <li>
              <Link href={cheminAccueil}>{t.article.filAccueil}</Link>
            </li>
          </ul>
        </div>
      </article>
    </CoqueSite>
  );
}
