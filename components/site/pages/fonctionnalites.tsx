import { CadreTableau } from '@/components/site/cadre-tableau';
import Link from 'next/link';
import { CoqueSite } from '@/components/site/coque';
import { JsonLd } from '@/components/site/jsonld';
import { applicationLogicielle, filDAriane } from '@/lib/seo/jsonld';
import { CHEMIN_APPLICATION, cheminPage, type LangueSite } from '@/lib/site/routes';
import { textes } from '@/lib/site/textes';

/* Détail produit — tâche 7.1.
 *
 * Elle existe pour une raison précise : l'accueil dit ce que le produit REFUSE
 * de faire, cette page dit ce qu'il fait, vue par vue. Les deux discours sont
 * nécessaires, et les mélanger sur un seul écran les affaiblit tous les deux. */

export function Fonctionnalites({ langue }: { langue: LangueSite }) {
  const t = textes(langue);
  const f = t.fonctionnalites;
  const chemin = cheminPage('fonctionnalites', langue);

  const vues = [
    [f.vDash, f.vDashR],
    [f.vToday, f.vTodayR],
    [f.vHabits, f.vHabitsR],
    [f.vTasks, f.vTasksR],
    [f.vGoals, f.vGoalsR],
    [f.vCal, f.vCalR],
    [f.vStats, f.vStatsR],
    [f.vTimer, f.vTimerR],
    [f.vNotes, f.vNotesR],
    [f.vProfile, f.vProfileR],
    [f.vSettings, f.vSettingsR],
  ];

  return (
    <CoqueSite langue={langue} chemin={chemin}>
      <JsonLd bloc={applicationLogicielle(langue)} />
      <JsonLd
        bloc={filDAriane([
          { nom: t.article.filAccueil, chemin: cheminPage('accueil', langue) },
          { nom: f.titre, chemin },
        ])}
      />

      <nav className="fil" aria-label={f.titre}>
        <ol>
          <li>
            <Link href={cheminPage('accueil', langue)}>{t.article.filAccueil}</Link>
          </li>
          <li aria-current="page">{t.chrome.navFonctionnalites}</li>
        </ol>
      </nav>

      <section className="article">
        <h1>{f.titre}</h1>
        <p className="article-chapeau">{f.chapeau}</p>

        <CadreTableau legende={f.titre}>
          <table className="tableau">
            <caption>{f.chapeau}</caption>
            <thead>
              <tr>
                <th scope="col">{f.colVue}</th>
                <th scope="col">{f.colRole}</th>
              </tr>
            </thead>
            <tbody>
              {vues.map(([nom, role]) => (
                <tr key={nom}>
                  <th scope="row">{nom}</th>
                  <td>{role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CadreTableau>

        <h2>{f.horsTitre}</h2>
        <p>{f.horsTexte}</p>
      </section>

      <section className="affiche" aria-labelledby="affiche-fonctionnalites">
        <p className="kicker">{t.accueil.afficheKicker}</p>
        <h2 id="affiche-fonctionnalites">{t.accueil.afficheTitre}</h2>
        <p>{t.accueil.afficheTexte}</p>
        <Link className="btn btn-primaire" href={CHEMIN_APPLICATION}>
          {t.accueil.afficheAction}
        </Link>
      </section>
    </CoqueSite>
  );
}
