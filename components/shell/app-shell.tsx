'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { seedEmpty } from '@/lib/data';
import { useReminders } from '@/lib/features/reminders';
import { usePhaseFeedback } from '@/lib/features/feedback';
import { traiterFrappe } from '@/lib/keyboard/shortcuts';
import { CommandPalette } from '@/components/command/command-palette';
import { ForceError } from '@/components/dev/force-error';
import { EditorSheet } from '@/components/editor/EditorSheet';
import { BottomBar } from './bottom-bar';
import { Header } from './header';
import { LiveRegion } from './live-region';
import { NavDrawer } from './nav-drawer';
import { Rail } from './rail';
import { ReticleCursor } from './reticle-cursor';
import { ID_CONTENU, SkipLink } from './skip-link';
import { ToastHost } from './toast-host';
import { UpdateBanner } from './update-banner';

/* Coque applicative : rail, en-tête, contenu, barre basse, palette.

   C'est aussi le seul endroit qui amorce la base et charge l'état — une fois,
   au montage. B4 : le chemin par défaut est le COMPTE VIERGE. La démonstration
   ne s'obtient que par un geste explicite (onboarding, phase 5). */

export function AppShell({ children }: { children: ReactNode }) {
  const zen = useStore((s) => s.ui.zen);
  const onboarded = useStore((s) => s.onboarded);
  const journalComplet = useStore((s) => s.logIndexComplete);
  const router = useRouter();
  const chemin = usePathname() ?? '';
  /* Le parcours d'accueil n'est pas une vue : il n'a ni rail, ni en-tête, ni
     barre basse. Il partage en revanche l'amorçage de la base — c'est là que le
     compte se crée. */
  const accueil = chemin.startsWith('/onboarding');

  /* Marqueur d'interactivité. Les pages sont prérendues (D12) : le HTML arrive
     avant que le moindre raccourci soit écouté. Sans ce repère, un test — ou un
     script — ne peut pas distinguer « la page est là » de « la page répond ». */
  const [pret, setPret] = useState(false);

  /* Rappels d'habitude (tâche 5.2). Armés ici et nulle part ailleurs : un
     planificateur par vue en produirait autant que de vues visitées. */
  useReminders();
  /* Fin de phase du minuteur : elle doit se signaler même hors de la vue
     « Focus ». C'est tout l'intérêt d'un minuteur ancré sur l'horloge murale. */
  usePhaseFeedback();

  useEffect(() => {
    void (async () => {
      await seedEmpty();
      await useStore.getState().hydrate();
      setPret(true);
    })();
  }, []);

  /* Première ouverture : on n'entre pas dans l'application avant d'être passé
     par l'accueil. Le renvoi attend que la base ait parlé (`pret`) — renvoyer
     sur un état non lu enverrait tout le monde à l'accueil au premier rendu. */
  useEffect(() => {
    if (!pret || accueil || onboarded || !chemin.startsWith('/app')) return;
    router.replace('/onboarding');
  }, [pret, accueil, onboarded, chemin, router]);

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
          /* Le tiroir gère lui-même sa fermeture, pour rendre le focus à son
             déclencheur — même raison que la palette. On s'abstient donc tant
             qu'il est ouvert, au lieu de fermer l'éditeur derrière lui. */
          if (s.ui.menuOpen) return;
          if (s.ui.editor) s.closeEditor();
          else if (s.ui.toast) s.dismissToast();
        },
      });
      if (consomme) e.preventDefault();
    };

    window.addEventListener('keydown', surFrappe);
    return () => window.removeEventListener('keydown', surFrappe);
  }, []);

  /* Cadre NU du parcours d'accueil. Le marqueur d'hydratation reste posé : la
     recette a besoin de savoir que la base est prête, ici comme ailleurs. */
  if (accueil) {
    return (
      <div className="min-h-screen" data-hydrated={pret ? 'true' : 'false'}>
        {children}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen"
      data-hydrated={pret ? 'true' : 'false'}
      /* L'ouverture lit une fenêtre récente, puis complète en fond (5.10) :
         ce marqueur dit lequel des deux états est atteint. */
      data-journal={journalComplet ? 'complet' : 'partiel'}
    >
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
          /* Sur téléphone la garniture haute tombe de 32 à 20 px : l'en-tête
             porte déjà titre et sur-titre, et 32 px de vide entre lui et la
             première carte se paient en défilement. Rien ne change au-dessus
             de 768 px, où la référence visuelle est validée.

             LA GARNITURE BASSE EST CALCULÉE, plus un `pb-24` de convenance :
             barre (8 + 52 + 8) + voile (48) + zone sûre. Les 96 px précédents
             laissaient la dernière carte finir SOUS le voile — on la voyait
             s'éteindre au lieu de se terminer. */
          className="min-w-0 flex-1 px-4 py-5 pb-[calc(124px+env(safe-area-inset-bottom))] outline-none md:px-10 md:py-8 md:pb-8"
        >
          {children}
        </main>
      </div>

      <BottomBar zen={zen} />
      {/* Le tiroir n'est monté que sous 768 px (`md:hidden` sur sa racine) :
          au-dessus, le rail est là et deux navigations se marcheraient dessus. */}
      <NavDrawer />
      <LiveRegion />
      <ToastHost />
      <EditorSheet />
      <CommandPalette />
      <UpdateBanner />
      {/* Monté UNE fois, ici, et nulle part ailleurs : un réticule par vue en
          dessinerait autant que de vues visitées. Il ne rend rien tant que le
          réglage est coupé, et rien du tout sur pointeur grossier. */}
      <ReticleCursor />
    </div>
  );
}
