import Link from 'next/link';
import { Blocs } from '@/components/site/blocs';
import { CoqueSite } from '@/components/site/coque';
import { JsonLd } from '@/components/site/jsonld';
import { filDAriane } from '@/lib/seo/jsonld';
import { CONFIDENTIALITE, MENTIONS, MISE_A_JOUR, dateLongue } from '@/lib/site/contenu/legal';
import { cheminPage, type LangueSite, type Page } from '@/lib/site/routes';
import { textes } from '@/lib/site/textes';

/* Confidentialité et mentions légales — tâche 7.6.
 *
 * Un seul gabarit pour les deux : ce sont deux documents opposables de même
 * nature, et leur seule différence est leur contenu. Le contenu vit dans
 * `lib/site/contenu/legal.ts`, avec l'hébergeur et le contact lus depuis
 * `routes.ts` — jamais recopiés. */

export function PageLegale({
  langue,
  page,
}: {
  langue: LangueSite;
  page: Extract<Page, 'confidentialite' | 'mentions'>;
}) {
  const t = textes(langue);
  const bloc = page === 'confidentialite' ? t.confidentialite : t.mentions;
  const contenu = page === 'confidentialite' ? CONFIDENTIALITE[langue] : MENTIONS[langue];
  const chemin = cheminPage(page, langue);
  const relu = `${t.article.relu} ${dateLongue(MISE_A_JOUR, langue)}`;

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

      <article className="article">
        <h1>{bloc.titre}</h1>
        <p className="article-date">{relu}</p>
        <p className="article-chapeau">{bloc.chapeau}</p>
        <Blocs blocs={contenu} />

        <div className="article-suite">
          <ul>
            <li>
              <Link
                href={cheminPage(
                  page === 'confidentialite' ? 'mentions' : 'confidentialite',
                  langue,
                )}
              >
                {page === 'confidentialite' ? t.chrome.piedMentions : t.chrome.piedConfidentialite}
              </Link>
            </li>
            <li>
              <Link href={cheminPage('accueil', langue)}>{t.article.filAccueil}</Link>
            </li>
          </ul>
        </div>
      </article>
    </CoqueSite>
  );
}
