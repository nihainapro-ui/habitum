import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { getMessages } from 'next-intl/server';
import { defaultLocale } from '@/i18n/config';
import { jetbrainsMono, spaceGrotesk } from '@/lib/fonts';
import { LocaleProvider } from '@/components/shell/locale-provider';
import { AppShell } from '@/components/shell/app-shell';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Habitum',
  description: 'Habitudes, tâches, objectifs et temps de focus — local-first, sans compte.',
};

export const viewport: Viewport = {
  themeColor: '#04060d',
  width: 'device-width',
  initialScale: 1,
  /* Sans `viewport-fit=cover`, `env(safe-area-inset-*)` vaut ZÉRO — y compris
     sur les téléphones qui en ont un. L'en-tête, la barre basse et le tiroir
     s'écartent tous des encoches et de la poignée d'accueil par ces variables ;
     elles ne valaient rien tant que cette ligne manquait. Aucun effet là où il
     n'y a pas d'encoche : les insets y restent nuls. */
  viewportFit: 'cover',
};

/* Le serveur rend TOUJOURS la langue par défaut : c'est ce qui garde les douze
   routes statiques (D12). `LocaleProvider` rattrape la préférence réelle à
   l'hydratation, sans rechargement. */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const messages = await getMessages();

  return (
    <html
      lang={defaultLocale}
      data-theme="neural"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Pose `data-theme` AVANT la première peinture. Fichier statique et
            non script en ligne : une empreinte SHA-256 ferait ignorer
            `unsafe-inline`, dont Next a besoin pour s'hydrater (ADR-0007).

            Le script est BLOQUANT, et c'est le but : « no-sync-scripts » met en
            garde contre le coût d'un script synchrone, mais un anti-clignotement
            différé ne sert à rien — la page aurait déjà été peinte dans le
            mauvais thème. Le fichier fait moins d'un kilo-octet et vient du
            même domaine. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme.js" />
      </head>
      <body>
        <LocaleProvider defaultMessages={messages}>
          <AppShell>{children}</AppShell>
        </LocaleProvider>
      </body>
    </html>
  );
}
