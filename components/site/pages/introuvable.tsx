import Link from 'next/link';
import { CoqueSite } from '@/components/site/coque';
import { CHEMIN_APPLICATION, cheminPage, type LangueSite } from '@/lib/site/routes';
import { textes } from '@/lib/site/textes';

/* Page 404 de la vitrine.
 *
 * Elle existe parce que la séparation en trois layouts racines (tâche 7.1) a
 * COÛTÉ le 404 du projet : sans layout racine unique, Next ne sait pas lequel
 * appliquer à une URL qui ne correspond à rien, et sert sa page interne — sans
 * attribut `lang`, sans marque, sans lien de retour. C'est une régression, elle
 * a été relevée après coup, et elle est réparée ici plutôt qu'expliquée.
 *
 * Le retour est TRIPLE et ce n'est pas de la décoration : quelqu'un qui arrive
 * sur une URL morte cherchait soit la présentation, soit son application, soit
 * un article. Un seul lien vers l'accueil oblige les deux autres à chercher. */

/* Le code HTTP, en surtitre. Ce n'est pas un libellé : il ne se traduit pas. */
const CODE = '404';

export function Introuvable({ langue }: { langue: LangueSite }) {
  const t = textes(langue);

  return (
    <CoqueSite langue={langue} chemin={cheminPage('accueil', langue)}>
      <section className="article">
        <p className="kicker">{CODE}</p>
        <h1>{t.introuvable.titre}</h1>
        <p className="article-chapeau">{t.introuvable.texte}</p>
        <div className="accroche-actions">
          <Link className="btn btn-primaire" href={cheminPage('accueil', langue)}>
            {t.introuvable.versAccueil}
          </Link>
          <Link className="btn btn-secondaire" href={CHEMIN_APPLICATION}>
            {t.chrome.navOuvrir}
          </Link>
        </div>
        <ul>
          <li>
            <Link href={cheminPage('fonctionnalites', langue)}>{t.chrome.navFonctionnalites}</Link>
          </li>
          <li>
            <Link href={cheminPage('comparatifs', langue)}>{t.chrome.navComparatifs}</Link>
          </li>
          <li>
            <Link href={cheminPage('guides', langue)}>{t.chrome.navGuides}</Link>
          </li>
        </ul>
      </section>
    </CoqueSite>
  );
}
