import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { getMessages } from 'next-intl/server';
import { defaultLocale } from '@/i18n/config';
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
};

/* Le serveur rend TOUJOURS la langue par défaut : c'est ce qui garde les douze
   routes statiques (D12). `LocaleProvider` rattrape la préférence réelle à
   l'hydratation, sans rechargement. */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const messages = await getMessages();

  return (
    <html lang={defaultLocale} data-theme="neural" suppressHydrationWarning>
      <body>
        <LocaleProvider defaultMessages={messages}>
          <AppShell>{children}</AppShell>
        </LocaleProvider>
      </body>
    </html>
  );
}
