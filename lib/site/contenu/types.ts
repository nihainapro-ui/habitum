import type { LangueSite } from '../routes';

/* Contenu de fond de la vitrine — tâches 7.5 et 7.6.
 *
 * Pourquoi ici et non dans `messages/*.json` : un article de mille mots
 * découpé en clés plates devient illisible, et sa structure — un tableau, une
 * liste, l'ordre des sections — n'est pas une chaîne de caractères. Les
 * LIBELLÉS restent dans `messages` sous `site.` (G6, `check:messages`) ; les
 * ARTICLES vivent ici, avec leur propre garde : `tests/unit/site-contenu.test.ts`
 * échoue si une langue manque, si les deux versions n'ont pas la même
 * structure, ou si un article sort de la fourchette de 800 à 1 500 mots.
 */

export type Bloc =
  | { readonly t: 'p'; readonly x: string }
  | { readonly t: 'h2'; readonly x: string }
  | { readonly t: 'ul'; readonly x: readonly string[] }
  | { readonly t: 'ol'; readonly x: readonly string[] }
  | {
      readonly t: 'tableau';
      readonly legende: string;
      readonly entetes: readonly string[];
      readonly lignes: readonly (readonly string[])[];
    };

export type Source = { readonly nom: string; readonly url: string };

export interface Article {
  /** Titre `h1`, porteur de la requête cible. */
  readonly titre: string;
  /** Méta-description, et sous-titre des cartes de l'accueil. */
  readonly description: string;
  readonly chapeau: string;
  /** Dates ISO. La règle éditoriale de la tâche 7.5 exige une date de
   *  relecture visible : un comparatif non daté est un comparatif faux en
   *  puissance. */
  readonly publieLe: string;
  readonly reluLe: string;
  readonly blocs: readonly Bloc[];
  /** Sources officielles du produit comparé. Vides pour un guide. */
  readonly sources?: readonly Source[];
}

export type ParLangue<T> = Readonly<Record<LangueSite, T>>;

/** Mots d'un article — sert au contrôle de longueur, et à rien d'autre. */
export function compterMots(article: Article): number {
  const morceaux: string[] = [article.titre, article.chapeau];
  for (const bloc of article.blocs) {
    if (bloc.t === 'p' || bloc.t === 'h2') morceaux.push(bloc.x);
    else if (bloc.t === 'ul' || bloc.t === 'ol') morceaux.push(...bloc.x);
    else {
      morceaux.push(bloc.legende, ...bloc.entetes);
      for (const ligne of bloc.lignes) morceaux.push(...ligne);
    }
  }
  return morceaux.join(' ').split(/\s+/).filter(Boolean).length;
}
