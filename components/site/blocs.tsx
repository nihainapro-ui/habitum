import { CadreTableau } from '@/components/site/cadre-tableau';
import type { Bloc } from '@/lib/site/contenu/types';

/* Rendu des blocs d'un article — tâches 7.5 et 7.6.
 *
 * Le contenu est une STRUCTURE, pas du HTML : pas de balisage dans les données,
 * donc pas de `dangerouslySetInnerHTML`, donc aucune surface d'injection. Le
 * type `Bloc` est exhaustif et le `switch` l'épuise : ajouter un type de bloc
 * sans l'afficher devient une erreur de compilation, pas un trou silencieux à
 * l'écran — c'est le piège n° 1 du dépôt, appliqué ici. */

function Un({ bloc }: { bloc: Bloc }) {
  switch (bloc.t) {
    case 'h2':
      return <h2>{bloc.x}</h2>;
    case 'p':
      return <p>{bloc.x}</p>;
    case 'ul':
      return (
        <ul>
          {bloc.x.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol>
          {bloc.x.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      );
    case 'tableau':
      return (
        <CadreTableau legende={bloc.legende}>
          <table className="tableau">
            <caption>{bloc.legende}</caption>
            <thead>
              <tr>
                {bloc.entetes.map((entete, i) => (
                  // La première colonne d'un tableau de comparaison n'a pas
                  // d'intitulé : c'est la colonne des critères. Une clé d'index
                  // est ici légitime — l'ordre est figé et le contenu statique.
                  <th key={`${entete}-${i}`} scope="col">
                    {entete}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloc.lignes.map((ligne) => (
                <tr key={ligne[0]}>
                  <th scope="row">{ligne[0]}</th>
                  {ligne.slice(1).map((cellule, i) => (
                    <td key={`${ligne[0]}-${i}`}>{cellule}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CadreTableau>
      );
  }
}

export function Blocs({ blocs }: { blocs: readonly Bloc[] }) {
  return (
    <>
      {blocs.map((bloc, i) => (
        <Un key={`${bloc.t}-${i}`} bloc={bloc} />
      ))}
    </>
  );
}
