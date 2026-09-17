'use client';

import { useEffect, useState } from 'react';

/* Le palier « téléphone » de la refonte mobile : sous 768 px, et nulle part
   ailleurs. C'est le même seuil que `md:` de Tailwind, que la barre basse et
   le rail utilisent déjà — deux définitions du mot « mobile » divergeraient.

   Le hook rend FAUX au premier rendu, y compris sur téléphone : les pages sont
   prérendues (D12), et `matchMedia` n'existe pas côté serveur. Une vue qui
   change de forme selon ce hook doit donc, comme `CalendarView`, accepter un
   premier rendu « bureau » — ou n'afficher sa forme qu'après montage. Là où le
   choix peut se faire en CSS (`md:hidden` / `hidden md:flex`), il DOIT se
   faire en CSS : c'est tranché avant la première peinture, sans battement. */

export const REQUETE_MOBILE = '(max-width: 767px)';

export const estMobile = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(REQUETE_MOBILE).matches;

/** Clé de session : « cette ouverture a déjà choisi son écran ». */
const CLE_OUVERTURE = 'habitum.ouverture';

/** L'écran d'ouverture sur téléphone est Aujourd'hui (refonte mobile, PDF
 *  p. 2). Rend `true` UNE fois par session d'onglet : la première fois que la
 *  coque est montée. Un rechargement, une navigation, un retour depuis
 *  l'accueil ne sont pas des ouvertures. `sessionStorage` peut être absent ou
 *  refusé (navigation privée, WebView restreinte) : alors on ne renvoie
 *  jamais deux fois, faute de pouvoir s'en souvenir. */
export function premiereOuverture(): boolean {
  try {
    if (window.sessionStorage.getItem(CLE_OUVERTURE)) return false;
    window.sessionStorage.setItem(CLE_OUVERTURE, '1');
    return true;
  } catch {
    return false;
  }
}

export function useEstMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const requete = window.matchMedia(REQUETE_MOBILE);
    const majeur = () => setMobile(requete.matches);
    majeur();
    requete.addEventListener('change', majeur);
    return () => requete.removeEventListener('change', majeur);
  }, []);
  return mobile;
}
