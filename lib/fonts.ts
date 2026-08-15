import localFont from 'next/font/local';

/* Polices AUTO-HÉBERGÉES (D7).
 *
 * Le prototype chargeait `fonts.googleapis.com` : chaque ouverture transmettait
 * l'adresse IP du visiteur à un tiers hors UE, sur un produit dont la promesse
 * est que rien ne sort de l'appareil (ADR-0002). Les fichiers sont désormais
 * servis depuis le même domaine, et `tests/e2e/fonts.spec.ts` échoue si une
 * requête tierce réapparaît — la promesse devient vérifiable, plus déclarative.
 *
 * Fichiers : `public/fonts/`, extraits par `scripts/extract-fonts.mjs`, OFL 1.1. */

export const spaceGrotesk = localFont({
  variable: '--font-space-grotesk',
  display: 'swap',
  src: [
    { path: '../public/fonts/SpaceGrotesk-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/SpaceGrotesk-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/SpaceGrotesk-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/SpaceGrotesk-Bold.woff2', weight: '700', style: 'normal' },
  ],
});

/* Archivo — VITRINE UNIQUEMENT (tâche 7.1, décision B1).
 *
 * Elle n'est déclarée sur aucun layout applicatif : l'application est sombre et
 * reste en Space Grotesk. Un seul poids par rôle, trois fichiers, parce qu'une
 * page de vitrine doit se peindre avant que le visiteur ait décidé de rester. */
export const archivo = localFont({
  variable: '--font-archivo',
  display: 'swap',
  src: [
    { path: '../public/fonts/Archivo-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/Archivo-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/Archivo-ExtraBold.woff2', weight: '800', style: 'normal' },
  ],
});

export const jetbrainsMono = localFont({
  variable: '--font-jetbrains-mono',
  display: 'swap',
  src: [
    { path: '../public/fonts/JetBrainsMono-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/JetBrainsMono-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/JetBrainsMono-Bold.woff2', weight: '700', style: 'normal' },
  ],
});
