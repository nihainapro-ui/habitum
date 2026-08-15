import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { archivo } from '@/lib/fonts';
import { socleMetadonnees } from '@/lib/site/metadonnees';
import '@/styles/modernist.css';

/* Layout RACINE de la vitrine anglaise — tâche 7.1.
 *
 * Jumeau de `app/(site-fr)/layout.tsx`, à `lang` près. C'est la seule
 * duplication du groupe, et elle est délibérée : `lang` est un attribut du
 * document, il se décide au layout racine ou nulle part. Tout le reste — coque,
 * libellés, métadonnées — est partagé et paramétré par la langue. */

export const metadata: Metadata = socleMetadonnees('en');

export const viewport: Viewport = {
  themeColor: '#f3f2f2',
  width: 'device-width',
  initialScale: 1,
};

export default function LayoutVitrineEn({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
