/* Thème : lecture et écriture de la préférence, côté navigateur.
 *
 * Le thème vit dans un COOKIE et non dans IndexedDB, contrairement au reste
 * des réglages : il doit être lisible AVANT la première peinture, par
 * `public/theme.js`, à un instant où aucune base n'est encore ouverte.
 * Le store en garde une copie pour l'interface. */

export const THEMES = ['neural', 'plasma', 'clinical'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = 'habitum.theme';
export const defaultTheme: Theme = 'neural';

const UN_AN = 60 * 60 * 24 * 365;

export const isTheme = (v: unknown): v is Theme =>
  typeof v === 'string' && (THEMES as readonly string[]).includes(v);

export function readThemeCookie(): Theme {
  if (typeof document === 'undefined') return defaultTheme;
  const trouve = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${THEME_COOKIE}=`))
    ?.slice(THEME_COOKIE.length + 1);
  return isTheme(trouve) ? trouve : defaultTheme;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${UN_AN}; samesite=lax`;
}
