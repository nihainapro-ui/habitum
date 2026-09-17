'use client';

import { useCallback, useRef, useState, type PointerEvent } from 'react';

/* Glissement horizontal — refonte mobile, PDF p. 5 : « Glisser une ligne à
   gauche → Focus ; à droite → reporter à demain (tâches) », et « Glisser la
   semaine : semaine ±1 ».

   Événements POINTEUR, pas tactiles : ils couvrent le doigt, le stylet et la
   souris avec un seul code, et Playwright les produit dans les deux projets.
   Le geste n'est reconnu que s'il est HORIZONTAL DÈS LE DÉPART : un doigt qui
   descend fait défiler la page, et une liste qui confisquerait ce défilement
   serait pire qu'une liste sans geste. `touch-action: pan-y` sur l'élément
   laisse le navigateur gérer la verticale ; nous ne prenons que l'horizontale.

   Le geste n'est JAMAIS le seul chemin : chaque action qu'il déclenche existe
   aussi dans la feuille d'actions de la ligne, atteignable au clavier et au
   lecteur d'écran. Il est un raccourci, pas une porte. */

/** Déplacement minimal pour valider un geste, en pixels. */
export const SEUIL_GLISSEMENT = 56;
/** Déplacement visuel maximal — la ligne suit le doigt, mais pas jusqu'au bord. */
const BUTEE = 96;
/** Pendant ce délai après un geste validé, un `click` est ignoré : le relâché
 *  qui termine le glissement retombe sinon sur le bouton sous le doigt. */
const DELAI_CLIC_MS = 350;

export interface Glissement {
  /** À poser sur l'élément qui glisse. */
  proprietes: {
    onPointerDown: (e: PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: PointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: PointerEvent<HTMLElement>) => void;
    onClickCapture: (e: { preventDefault: () => void; stopPropagation: () => void }) => void;
    style: { touchAction: 'pan-y'; transform: string; transition: string };
  };
  /** Déplacement courant, pour un retour visuel de l'appelant s'il en veut un. */
  dx: number;
}

export function useGlissement({
  onGauche,
  onDroite,
  seuil = SEUIL_GLISSEMENT,
}: {
  onGauche?: (() => void) | undefined;
  onDroite?: (() => void) | undefined;
  seuil?: number;
}): Glissement {
  const depart = useRef<{ x: number; y: number; id: number; verrou: 'h' | 'v' | null } | null>(
    null,
  );
  const dernierGeste = useRef(0);
  const [dx, setDx] = useState(0);

  const finir = useCallback(() => {
    depart.current = null;
    setDx(0);
  }, []);

  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    /* Le bouton principal seulement : un clic droit n'est pas un geste. */
    if (e.button !== 0) return;
    depart.current = { x: e.clientX, y: e.clientY, id: e.pointerId, verrou: null };
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      const d = depart.current;
      if (!d || d.id !== e.pointerId) return;
      const ecartX = e.clientX - d.x;
      const ecartY = e.clientY - d.y;
      if (d.verrou === null) {
        if (Math.abs(ecartX) < 8 && Math.abs(ecartY) < 8) return;
        d.verrou = Math.abs(ecartX) > Math.abs(ecartY) ? 'h' : 'v';
        if (d.verrou === 'h') e.currentTarget.setPointerCapture?.(e.pointerId);
      }
      if (d.verrou !== 'h') return;
      /* Un sens sans action ne bouge pas : glisser à droite une habitude ne
         promet rien qu'elle ne puisse tenir. */
      const permis = (ecartX < 0 && onGauche) || (ecartX > 0 && onDroite);
      setDx(permis ? Math.max(-BUTEE, Math.min(BUTEE, ecartX)) : 0);
    },
    [onGauche, onDroite],
  );

  const onPointerUp = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      const d = depart.current;
      if (!d || d.id !== e.pointerId) return;
      const ecartX = e.clientX - d.x;
      if (d.verrou === 'h') {
        if (ecartX <= -seuil && onGauche) {
          dernierGeste.current = Date.now();
          onGauche();
        } else if (ecartX >= seuil && onDroite) {
          dernierGeste.current = Date.now();
          onDroite();
        }
      }
      finir();
    },
    [seuil, onGauche, onDroite, finir],
  );

  const onClickCapture = useCallback(
    (e: { preventDefault: () => void; stopPropagation: () => void }) => {
      if (Date.now() - dernierGeste.current < DELAI_CLIC_MS) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [],
  );

  return {
    dx,
    proprietes: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: finir,
      onClickCapture,
      style: {
        touchAction: 'pan-y',
        transform: dx ? `translateX(${dx}px)` : 'none',
        transition: dx ? 'none' : 'transform .2s ease',
      },
    },
  };
}
