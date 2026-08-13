'use client';

import { useEffect, useState } from 'react';
import { defaultLocale, type Locale } from '@/i18n/config';
import { readLocaleCookie } from '@/i18n/client-locale';
import { exporterDirect } from '@/lib/features/backup';
import { logError } from '@/lib/logger';
import '@/styles/globals.css';

/* Dernier filet — tâche 5.1.

   `global-error.tsx` remplace la racine du document : ni coque, ni fournisseur
   de langue, ni contexte next-intl. Il est appelé quand la coque elle-même a
   échoué, c'est-à-dire précisément quand on ne peut plus rien supposer.

   ÉCART ASSUMÉ À G6 — ses quatre libellés sont ÉCRITS ICI, pas dans
   `messages/`. Deux raisons, dans cet ordre : charger les libellés demande le
   fournisseur qui vient de tomber, et embarquer `messages/fr.json` dans ce
   fichier le ferait entrer dans le bundle principal pour un écran qui ne doit
   jamais s'afficher. Le prix est quatre chaînes en double ; le prix inverse
   serait un écran blanc.

   La langue est relue au montage : le rendu initial part du français, comme le
   reste de l'application (D12). */

const LIBELLES: Record<Locale, Record<string, string>> = {
  fr: {
    titre: 'Quelque chose s’est mal passé',
    corps:
      'L’application n’a pas pu s’afficher. Vos données sont toujours dans ce navigateur : exportez-les avant toute autre manœuvre.',
    reessayer: 'Réessayer',
    exporter: 'Exporter mes données',
    accueil: 'Revenir à l’accueil',
    echec: 'Export impossible sur cet appareil.',
  },
  en: {
    titre: 'Something went wrong',
    corps:
      'The app failed to render. Your data is still in this browser: export it before doing anything else.',
    reessayer: 'Try again',
    exporter: 'Export my data',
    accueil: 'Back to home',
    echec: 'Export failed on this device.',
  },
};

export default function ErreurGlobale({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [echec, setEchec] = useState(false);
  const l = LIBELLES[locale] ?? LIBELLES[defaultLocale];

  useEffect(() => {
    setLocale(readLocaleCookie());
    void logError('global', error);
  }, [error]);

  const exporter = async () => {
    try {
      await exporterDirect();
      setEchec(false);
    } catch {
      setEchec(true);
    }
  };

  const bouton = 'rounded-btn cursor-pointer border px-4 py-2 text-[12.5px] no-underline';

  return (
    <html lang={locale} data-theme="neural" suppressHydrationWarning>
      <body>
        <main
          role="alert"
          className="mx-auto flex max-w-[560px] flex-col items-start gap-3 p-8"
          style={{ color: 'var(--txt)' }}
        >
          <h1 className="m-0 text-[22px] tracking-tight">{l.titre}</h1>
          <p className="m-0 text-[13px] leading-relaxed" style={{ color: 'var(--mut)' }}>
            {l.corps}
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reset}
              className={bouton}
              style={{ borderColor: 'var(--acc2)', color: 'var(--acc2)' }}
            >
              {l.reessayer}
            </button>
            <button
              type="button"
              onClick={() => void exporter()}
              className={bouton}
              style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
            >
              {l.exporter}
            </button>
            <a href="/app" className={bouton} style={{ borderColor: 'var(--line)' }}>
              {l.accueil}
            </a>
          </div>

          {echec ? (
            <p className="m-0 text-[12px]" style={{ color: 'var(--bad)' }}>
              {l.echec}
            </p>
          ) : null}

          {error.digest ? (
            <p className="m-0 font-mono text-[10.5px]" style={{ color: 'var(--mut)' }}>
              {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
