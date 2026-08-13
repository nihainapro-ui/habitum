'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from '@/lib/store';
import { seedEmpty } from '@/lib/data';
import { traiterFrappe } from '@/lib/keyboard/shortcuts';
import { CommandPalette } from '@/components/command/command-palette';
import { ForceError } from '@/components/dev/force-error';
import { EditorSheet } from '@/components/editor/EditorSheet';
import { BottomBar } from './bottom-bar';
import { Header } from './header';
import { LiveRegion } from './live-region';
import { Rail } from './rail';
import { ID_CONTENU, SkipLink } from './skip-link';
import { ToastHost } from './toast-host';

/* Coque applicative : rail, en-tête, contenu, barre basse, palette.

   C'est aussi le seul endroit qui amorce la base et charge l'état — une fois,
   au montage. B4 : le chemin par défaut est le COMPTE VIERGE. La démonstration
   ne s'obtient que par un geste explicite (onboarding, phase 5). */

export function AppShell({ children }: { children: ReactNode }) {
  const zen = useStore((s) => s.ui.zen);

  /* Marqueur d'interactivité. Les pages sont prérendues (D12) : le HTML arrive
     avant que le moindre raccourci soit écouté. Sans ce repère, un test — ou un
     script — ne peut pas distinguer « la page est là » de « la page répond ». */
  const [pret, setPret] = useState(false);

  useEffect(() => {
    void (async () => {
      await seedEmpty();
      await useStore.getState().hydrate();
      setPret(true);
    })();
  }, []);

  useEffect(() => {
    const surFrappe = (e: KeyboardEvent) => {
      const s = useStore.getState();
      const consomme = traiterFrappe(e, {
        ouvrirPalette: () => s.setCommandOpen(true),
        basculerZen: () => s.toggleZen(),
        /* Escape ferme ce qui est ouvert, du plus superficiel au plus profond.
           La palette gère elle-même sa fermeture pour pouvoir rendre le focus
           à son déclencheur : ici on ne s'occupe que du reste. */
        echapper: () => {
          if (s.ui.commandOpen) return;
          if (s.ui.editor) s.closeEditor();
          else if (s.ui.toast) s.dismissToast();
        },
      });
      if (consomme) e.preventDefault();
    };

    window.addEventListener('keydown', surFrappe);
    return () => window.removeEventListener('keydown', surFrappe);
  }, []);

  return (
    <div className="flex min-h-screen" data-hydrated={pret ? 'true' : 'false'}>
      {/* Trappe de recette du DERNIER filet : ce qui casse dans la coque ne
          peut pas être rattrapé par `app/error.tsx`, qui vit dessous. */}
      <ForceError scope="shell" />
      <SkipLink />
      <Rail zen={zen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main
          id={ID_CONTENU}
          tabIndex={-1}
          className="min-w-0 flex-1 px-4 py-8 pb-24 outline-none md:px-10 md:pb-8"
        >
          {children}
        </main>
      </div>

      <BottomBar zen={zen} />
      <LiveRegion />
      <ToastHost />
      <EditorSheet />
      <CommandPalette />
    </div>
  );
}
