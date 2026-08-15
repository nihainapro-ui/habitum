import { CadreTableau } from '@/components/site/cadre-tableau';
import Link from 'next/link';
import { JsonLd } from '@/components/site/jsonld';
import { CoqueSite } from '@/components/site/coque';
import { applicationLogicielle, questionsFrequentes } from '@/lib/seo/jsonld';
import {
  CHEMIN_APPLICATION,
  COMPARATIFS,
  DEPOT,
  GUIDES,
  cheminComparatif,
  cheminGuide,
  cheminPage,
  type LangueSite,
} from '@/lib/site/routes';
import { textes } from '@/lib/site/textes';
import { comparatif } from '@/lib/site/contenu/comparatifs';
import { guide } from '@/lib/site/contenu/guides';

/* Accueil de la vitrine — tâche 7.1, étape 3.
 *
 * L'ordre des sections n'est pas un goût : accroche, trois arguments, modèle,
 * preuve, installation, questions, appel. Un visiteur qui part à la troisième
 * section doit déjà savoir ce que le produit fait et ce qu'il refuse de faire.
 *
 * ÉCART ASSUMÉ AU PLAN : la section « preuve » ne contient pas de capture des
 * onze vues. Les captures de recette vivent dans `captures-recette/`, qui est
 * hors de Git et pèse 3,3 Mo ; les publier demanderait de versionner des
 * binaires régénérés à chaque passe et coûterait le budget de performance de la
 * tâche 7.7. La preuve est donc FACTUELLE — le modèle en entier, et l'onglet
 * réseau vide — ce qui est aussi ce que le prototype de vitrine a choisi. */

export function Accueil({ langue }: { langue: LangueSite }) {
  const t = textes(langue);
  const a = t.accueil;
  const chemin = cheminPage('accueil', langue);

  const typesHabitude = [
    [a.hCheckN, a.hCheckM, a.hCheckR],
    [a.hCountN, a.hCountM, a.hCountR],
    [a.hTimeN, a.hTimeM, a.hTimeR],
    [a.hTotalN, a.hTotalM, a.hTotalR],
    [a.hListN, a.hListM, a.hListR],
    [a.hLimitN, a.hLimitM, a.hLimitR],
    [a.hExactN, a.hExactM, a.hExactR],
  ];

  const typesObjectif = [
    [a.oCumulN, a.oCumulM],
    [a.oMsN, a.oMsM],
    [a.oReduceN, a.oReduceM],
  ];

  const questions = [
    [a.q1, a.r1],
    [a.q2, a.r2],
    [a.q3, a.r3],
    [a.q4, a.r4],
    [a.q5, a.r5],
    [a.q6, a.r6],
    [a.q7, a.r7],
    [a.q8, a.r8],
  ];

  return (
    <CoqueSite langue={langue} chemin={chemin}>
      <JsonLd bloc={applicationLogicielle(langue)} />
      <JsonLd bloc={questionsFrequentes(langue)} />

      <section className="accroche" aria-labelledby="accroche-titre">
        <div>
          <p className="kicker">{a.kicker}</p>
          <h1 id="accroche-titre">{a.titre}</h1>
          <p className="accroche-texte">{a.chapeau}</p>
          <div className="accroche-actions">
            <Link className="btn btn-primaire" href={CHEMIN_APPLICATION}>
              {a.actionOuvrir}
            </Link>
            <Link className="btn btn-secondaire" href={cheminPage('fonctionnalites', langue)}>
              {a.actionFonctionnalites}
            </Link>
          </div>
        </div>
        <div className="chiffres">
          {[
            [a.chiffre1, a.chiffre1Legende],
            [a.chiffre2, a.chiffre2Legende],
            [a.chiffre3, a.chiffre3Legende],
          ].map(([valeur, legende]) => (
            <div className="chiffre" key={legende}>
              <b>{valeur}</b>
              <span>{legende}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="colonnes" aria-label={a.modeleTitre}>
        {[
          [a.argSur1, a.argTitre1, a.argTexte1],
          [a.argSur2, a.argTitre2, a.argTexte2],
          [a.argSur3, a.argTitre3, a.argTexte3],
        ].map(([sur, titre, texte]) => (
          <div key={titre}>
            <p className="sur-titre">{sur}</p>
            <h2>{titre}</h2>
            <p>{texte}</p>
          </div>
        ))}
      </section>

      <section className="section" aria-labelledby="modele-titre">
        <h2 id="modele-titre">{a.modeleTitre}</h2>
        <p className="mesure">{a.modeleTexte}</p>

        <CadreTableau legende={a.modeleLegendeH}>
          <table className="tableau">
            <caption>{a.modeleLegendeH}</caption>
            <thead>
              <tr>
                <th scope="col">{a.modeleColType}</th>
                <th scope="col">{a.modeleColMesure}</th>
                <th scope="col">{a.modeleColReussite}</th>
              </tr>
            </thead>
            <tbody>
              {typesHabitude.map(([nom, mesure, reussite]) => (
                <tr key={nom}>
                  <th scope="row">{nom}</th>
                  <td>{mesure}</td>
                  <td>{reussite}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CadreTableau>

        <hr className="hr" />

        <CadreTableau legende={a.modeleLegendeO}>
          <table className="tableau">
            <caption>{a.modeleLegendeO}</caption>
            <thead>
              <tr>
                <th scope="col">{a.modeleColObjectif}</th>
                <th scope="col">{a.modeleColSens}</th>
              </tr>
            </thead>
            <tbody>
              {typesObjectif.map(([nom, sens]) => (
                <tr key={nom}>
                  <th scope="row">{nom}</th>
                  <td>{sens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CadreTableau>
      </section>

      <section className="section" aria-labelledby="reseau-titre">
        <h2 id="reseau-titre">{a.reseauTitre}</h2>
        <p className="mesure">{a.reseauTexte}</p>
        <p>
          <a href={DEPOT} rel="noreferrer">
            {a.reseauLienDepot}
          </a>
          {' · '}
          <Link href={cheminPage('confidentialite', langue)}>{a.reseauLienConfidentialite}</Link>
        </p>
      </section>

      <section className="section" aria-labelledby="install-titre">
        <h2 id="install-titre">{a.installTitre}</h2>
        <p className="mesure">{a.installTexte}</p>
        <ul className="mesure">
          <li>{a.install1}</li>
          <li>{a.install2}</li>
          <li>{a.install3}</li>
        </ul>
      </section>

      <section className="section" aria-labelledby="faq-titre">
        <h2 id="faq-titre">{a.faqTitre}</h2>
        <div className="faq">
          {questions.map(([question, reponse]) => (
            <div key={question}>
              <h3>{question}</h3>
              <p>{reponse}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="fond-titre">
        <h2 id="fond-titre">{a.fondTitre}</h2>
        <h3 className="sur-titre">{a.fondComparatifs}</h3>
        <ul className="carte-liste">
          {COMPARATIFS.map((id) => {
            const article = comparatif(id, langue);
            return (
              <li key={id}>
                <Link className="carte carte-lien" href={cheminComparatif(id, langue)}>
                  <h3>{article.titre}</h3>
                  <p className="attenue">{article.description}</p>
                </Link>
              </li>
            );
          })}
        </ul>
        <hr className="hr" />
        <h3 className="sur-titre">{a.fondGuides}</h3>
        <ul className="carte-liste">
          {GUIDES.map((id) => {
            const article = guide(id, langue);
            return (
              <li key={id}>
                <Link className="carte carte-lien" href={cheminGuide(id, langue)}>
                  <h3>{article.titre}</h3>
                  <p className="attenue">{article.description}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="affiche" aria-labelledby="affiche-titre">
        <p className="kicker">{a.afficheKicker}</p>
        <h2 id="affiche-titre">{a.afficheTitre}</h2>
        <p>{a.afficheTexte}</p>
        <Link className="btn btn-primaire" href={CHEMIN_APPLICATION}>
          {a.afficheAction}
        </Link>
      </section>
    </CoqueSite>
  );
}
