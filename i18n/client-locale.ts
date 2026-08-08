import { LOCALE_COOKIE, defaultLocale, isLocale, type Locale } from './config';

/* Lecture et écriture de la préférence de langue DANS LE NAVIGATEUR.

   Le cookie `habitum.lang` reste le support — son nom ne change pas. Ce qui
   change, c'est qu'aucune fonction serveur ne le lit : les routes restent
   statiques (D12), et la bascule FR/EN se fait sans rechargement ni
   round-trip. */

const UN_AN = 60 * 60 * 24 * 365;

/** Langue choisie par l'utilisateur, ou la langue par défaut.
 *  Rend toujours la langue par défaut hors navigateur — c'est ce que le rendu
 *  statique produit, et le client la corrige à l'hydratation. */
export function readLocaleCookie(): Locale {
  if (typeof document === 'undefined') return defaultLocale;
  const trouve = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1);
  return isLocale(trouve) ? trouve : defaultLocale;
}

/** Enregistre la préférence. `SameSite=Lax`, un an, aucun tiers, aucun suivi —
 *  c'est le seul cookie que le produit pose (politique de confidentialité,
 *  phase 6). */
export function writeLocaleCookie(next: Locale): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${UN_AN}; samesite=lax`;
}
