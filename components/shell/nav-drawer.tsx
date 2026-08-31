'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { piegerFocus } from '@/lib/keyboard/shortcuts';
import { RailContenu } from './rail-contenu';

/* Tiroir de navigation — MOBILE UNIQUEMENT.

   POURQUOI IL EXISTE. Sous 768 px le rail n'est pas rendu et la barre basse ne
   porte que quatre entrées : calendrier, objectifs, statistiques, minuteur,
   notes, profil et réglages n'avaient AUCUN chemin d'accès au doigt. Le
   commentaire de `nav-items.ts` renvoie « le reste passe par la palette ⌘K » —
   ce qui suppose un clavier. Dans l'APK Capacitor il n'y en a pas, et une
   recherche à taper n'est de toute façon pas une navigation : il faut
   connaître le nom de ce qu'on cherche avant de pouvoir y aller.

   Le tiroir rend EXACTEMENT le contenu du rail, déplié : marque, carte
   d'expérience, les trois groupes avec leurs titres, les onze entrées avec
   leurs libellés, et le pied thème/langue. C'est bien « le rail, en détail ».

   Il est monté sous `md:hidden` : au-dessus de 768 px le rail est là, et deux
   navigations concurrentes se marcheraient dessus.

   Accessibilité, sur le modèle de la palette (`command-palette.tsx`) :
   `role="dialog"`, `aria-modal`, piège de focus en CAPTURE sur le document —
   posé sur la boîte, il cesserait d'agir dès que le focus en sort une fois —
   et `Escape` qui REND LE FOCUS au déclencheur. */

export function NavDrawer() {
  const t = useTranslations('app');
  const ouvert = useStore((s) => s.ui.menuOpen);
  const setMenuOpen = useStore((s) => s.setMenuOpen);
  const chemin = usePathname();

  const boite = useRef<HTMLDivElement>(null);
  const declencheur = useRef<Element | null>(null);

  const fermer = () => setMenuOpen(false);
  const rendreLeFocus = () => {
    const cible = declencheur.current;
    if (cible instanceof HTMLElement) cible.focus();
  };

  useEffect(() => {
    if (!ouvert) return;
    declencheur.current = document.activeElement;
    /* Le premier élément focalisable du tiroir, et non le tiroir lui-même :
       un conteneur focalisé ne dit rien de ce qu'il contient. */
    boite.current?.querySelector<HTMLElement>('button, a[href]')?.focus();
  }, [ouvert]);

  /* Une navigation ferme le tiroir. Sans cela, taper une entrée changeait la
     vue DERRIÈRE un panneau resté ouvert. */
  useEffect(() => {
    setMenuOpen(false);
  }, [chemin, setMenuOpen]);

  useEffect(() => {
    if (!ouvert) return;

    const surFrappe = (e: KeyboardEvent) => {
      if (piegerFocus(e, boite.current)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        fermer();
        rendreLeFocus();
      }
    };

    document.addEventListener('keydown', surFrappe, true);
    return () => document.removeEventListener('keydown', surFrappe, true);
  });

  if (!ouvert) return null;

  return (
    <div
      data-testid="nav-drawer"
      className="fixed inset-0 z-50 flex md:hidden"
      style={{ background: 'rgba(2,4,10,.62)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          fermer();
          rendreLeFocus();
        }
      }}
    >
      <div
        ref={boite}
        role="dialog"
        aria-modal="true"
        aria-label={t('menuAll')}
        className="relative flex h-full w-[min(84vw,300px)] flex-col border-r"
        style={{
          borderColor: 'var(--line)',
          /* Le tiroir est OPAQUE là où le rail est translucide : posé sur du
             contenu, un flou laisserait les lignes du dessous concurrencer les
             libellés. */
          background: 'var(--bg)',
          backgroundImage: 'linear-gradient(190deg,rgba(var(--glow),.09),transparent 42%)',
          /* Encoche et poignée d'accueil : le tiroir occupe toute la hauteur,
             il est donc le seul à devoir s'en écarter lui-même. */
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          animation: 'drawerin .22s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <button
          type="button"
          onClick={() => {
            fermer();
            rendreLeFocus();
          }}
          aria-label={t('menuClose')}
          className="absolute top-3 right-3 grid h-9 w-9 cursor-pointer place-items-center rounded-[10px] border"
          style={{
            borderColor: 'var(--line)',
            background: 'var(--panel2)',
            color: 'var(--txt2)',
          }}
        >
          <X size={15} strokeWidth={1.9} aria-hidden="true" />
        </button>

        <RailContenu deplie />
      </div>
    </div>
  );
}
