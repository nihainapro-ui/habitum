import type { ReactNode } from 'react';

/* Cadre défilant d'un tableau de comparaison.
 *
 * Un tableau de trois colonnes ne rétrécit pas indéfiniment : sous 768 px il
 * défile DANS son cadre, ce qui empêche la page entière de déborder. Mais un
 * conteneur qui défile et qui n'est pas atteignable au clavier est un contenu
 * inaccessible à qui n'utilise pas de souris — axe le classe « serious », et il
 * a raison : la moitié droite du tableau devient littéralement hors d'atteinte.
 *
 * Relevé par `tests/e2e/a11y.spec.ts` sur le profil MOBILE uniquement, et par
 * lui seul : à 1440 px le tableau tient, rien ne défile, aucune règle ne se
 * déclenche. C'est la raison pour laquelle l'audit tourne sur les deux profils.
 *
 * `tabIndex={0}` rend le cadre focalisable ; `role="region"` et son nom le
 * rendent annonçable, faute de quoi un lecteur d'écran signalerait un élément
 * focalisable sans dire ce qu'il contient. */
export function CadreTableau({ legende, children }: { legende: string; children: ReactNode }) {
  return (
    <div className="cadre-tableau" tabIndex={0} role="region" aria-label={legende}>
      {children}
    </div>
  );
}
