import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  CHEMIN_APPLICATION,
  DEPOT,
  adresseDe,
  cheminPage,
  type LangueSite,
} from '@/lib/site/routes';
import { textes } from '@/lib/site/textes';

/* Coque de la vitrine — en-tête, contenu, pied. Tâche 7.1.
 *
 * Aucun composant client : la vitrine ne doit exécuter AUCUN JavaScript pour
 * être lisible. Le sélecteur de langue est un lien, pas un bouton — c'est ce
 * qui le rend indexable et utilisable sans script. */

const ID_CONTENU = 'contenu';

/** Bascule de langue : la MÊME page dans l'autre langue quand elle existe,
 *  l'accueil sinon. Renvoyer l'accueil pour toute page est le défaut classique
 *  du sélecteur de langue, et il coûte le lecteur qu'on prétendait servir. */
function autreLangue(chemin: string, langue: LangueSite) {
  const autre: LangueSite = langue === 'fr' ? 'en' : 'fr';
  const paire = adresseDe(chemin);
  return { langue: autre, chemin: paire?.[autre] ?? cheminPage('accueil', autre) };
}

export function CoqueSite({
  langue,
  chemin,
  children,
}: {
  langue: LangueSite;
  /** Chemin canonique de la page rendue, dans SA langue. */
  chemin: string;
  children: ReactNode;
}) {
  const t = textes(langue);
  const bascule = autreLangue(chemin, langue);

  return (
    <>
      <a className="saut" href={`#${ID_CONTENU}`}>
        {t.chrome.sauter}
      </a>

      <div className="page">
        <header className="entete">
          <Link href={cheminPage('accueil', langue)} className="marque">
            {'Habitum'}
          </Link>
          <span className="entete-signature">{t.chrome.signature}</span>
          <span className="entete-espace" />
          <nav aria-label={t.chrome.signature}>
            <Link href={cheminPage('fonctionnalites', langue)}>{t.chrome.navFonctionnalites}</Link>
            <Link href={cheminPage('comparatifs', langue)}>{t.chrome.navComparatifs}</Link>
            <Link href={cheminPage('guides', langue)}>{t.chrome.navGuides}</Link>
            <Link href={bascule.chemin} hrefLang={bascule.langue} lang={bascule.langue}>
              {t.chrome.langueAutre}
            </Link>
            <Link href={CHEMIN_APPLICATION}>{t.chrome.navOuvrir}</Link>
          </nav>
        </header>

        <main id={ID_CONTENU}>{children}</main>

        <footer className="pied">
          <span>{t.chrome.piedDroits}</span>
          <span>{t.chrome.piedNote}</span>
          <Link href={cheminPage('confidentialite', langue)}>{t.chrome.piedConfidentialite}</Link>
          <Link href={cheminPage('mentions', langue)}>{t.chrome.piedMentions}</Link>
          {/* `rel="noreferrer"` : la promesse produit vaut aussi pour les liens
              sortants — l'adresse de la page consultée n'a pas à voyager. */}
          <a href={DEPOT} rel="noreferrer">
            {t.chrome.piedDepot}
          </a>
        </footer>
      </div>
    </>
  );
}
