import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { archivo } from '@/lib/fonts';
import { socleMetadonnees } from '@/lib/site/metadonnees';
import '@/styles/modernist.css';

/* Layout RACINE de la vitrine française — tâche 7.1.
 *
 * Pourquoi un layout racine et non un groupe imbriqué sous celui de
 * l'application : trois choses ne peuvent pas être décidées ailleurs qu'ici.
 *
 *   `lang`         — « fr » ici, « en » dans `app/(site-en)` ; un attribut de
 *                    langue faux sur la moitié d'un site bilingue rend les
 *                    `hreflang` incohérents et coûte le critère SEO 100.
 *   la feuille     — la vitrine charge `modernist.css` et RIEN du registre
 *                    sombre. Deux documents distincts, pas une portée CSS :
 *                    l'application ne télécharge pas Archivo, la vitrine ne
 *                    télécharge ni Space Grotesk ni les jetons de thème.
 *   la coque       — `AppShell` ouvre la base et arme les rappels. Une page de
 *                    présentation n'a aucune raison de faire l'un ou l'autre.
 *
 * Décision B1, `docs/handoff/07-DECISION-B1.md` : les deux registres ne se
 * mélangent pas. Ici, ils ne se croisent même pas. */

export const metadata: Metadata = socleMetadonnees('fr');

export const viewport: Viewport = {
  /* Le fond Modernist, pas celui de l'application : la barre du navigateur
     mobile suit la page qu'elle encadre. */
  themeColor: '#f3f2f2',
  width: 'device-width',
  initialScale: 1,
};

export default function LayoutVitrineFr({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
