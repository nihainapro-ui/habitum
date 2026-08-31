/* Visibilité du rail, côté navigateur.
 *
 * MÊME MÉCANIQUE QUE LE THÈME, et pour la même raison (`lib/theme.ts`). La
 * préférence vit dans un COOKIE et non dans IndexedDB : elle doit être lisible
 * AVANT la première peinture, par `public/theme.js`, à un instant où aucune
 * base n'est ouverte. Les pages sont prérendues (D12) — un rail masqué après
 * montage s'afficherait d'abord, puis disparaîtrait sous les yeux de
 * l'utilisateur à chaque chargement. C'est exactement ce que `rail.tsx` refuse
 * déjà pour sa largeur.
 *
 * DEUX ÉTATS SEULEMENT, et pas trois. « Replié » n'en est pas un : le rail se
 * replie DÉJÀ tout seul en dessous de 1060 px, et le seuil est la référence
 * visuelle validée (04-DESIGN-TOKENS.md § Palier téléphone). Ce réglage-ci
 * répond à une autre demande — rendre la largeur au contenu. */

export const RAIL_COOKIE = 'habitum.rail';

/** `off` masque le rail ; toute autre valeur, cookie absent compris, le montre. */
export type EtatRail = 'on' | 'off';
export const defaultRail: EtatRail = 'on';

const UN_AN = 60 * 60 * 24 * 365;

export function readRailCookie(): EtatRail {
  if (typeof document === 'undefined') return defaultRail;
  const trouve = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${RAIL_COOKIE}=`))
    ?.slice(RAIL_COOKIE.length + 1);
  return trouve === 'off' ? 'off' : defaultRail;
}

export function applyRail(etat: EtatRail): void {
  if (typeof document === 'undefined') return;
  /* L'attribut n'est POSÉ que pour masquer. Un `data-rail="on"` obligerait
     chaque règle à le tester, et le défaut cesserait d'être le défaut. */
  if (etat === 'off') document.documentElement.setAttribute('data-rail', 'off');
  else document.documentElement.removeAttribute('data-rail');
  document.cookie = `${RAIL_COOKIE}=${etat}; path=/; max-age=${UN_AN}; samesite=lax`;
}
