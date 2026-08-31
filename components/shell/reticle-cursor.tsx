'use client';

import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/lib/store';
import {
  AMORTI,
  amortir,
  CHAMPS_TEXTE,
  CLIQUABLES,
  TAILLES,
  type EtatCible,
} from './reticule-calculs';

/* Curseur réticule — le réglage « Curseur réticule » de la vue Profil.
 *
 * IL ÉTAIT DÉCORATIF. La ligne existait, l'interrupteur basculait, la
 * préférence se persistait — et la souris restait la flèche du système. Un
 * réglage sans effet est un mensonge d'interface ; c'était le troisième du
 * produit, après les notifications et le son.
 *
 * AUCUN `setState` SUR `mousemove`, et c'est la contrainte qui gouverne tout
 * ce fichier. Une souris émet jusqu'à mille événements par seconde ; un rendu
 * React par événement traverserait la coque entière — rail, en-tête, vue — à
 * chaque pixel parcouru. La position vit donc dans des `ref`, et la boucle
 * `requestAnimationFrame` écrit DIRECTEMENT dans `el.style.transform`. React
 * monte deux div et n'en entend plus jamais parler.
 *
 * LES QUATRE GARDE-FOUS du rapport, tous ici :
 *   1. `prefers-reduced-motion` — plus d'amortissement ni de pulsation ;
 *   2. pointeur grossier — le composant NE MONTE PAS (`useCurseurPossible`
 *      gouverne aussi la ligne de réglage, qui disparaît) ;
 *   3. réglage coupé — l'attribut est retiré et le curseur système revient ;
 *      c'est le nettoyage de l'effet, donc il a lieu même au démontage ;
 *   4. impression — `@media print` dans `styles/globals.css`.
 *
 * Le troisième mérite qu'on insiste : il ne doit exister AUCUN état où
 * `cursor: none` survit sans réticule dessiné. L'utilisateur perdrait sa
 * souris, et pour la retrouver il lui faudrait deviner où cliquer pour couper
 * le réglage. D'où la pose et le retrait de `data-cursor` dans le MÊME effet
 * que la boucle : ils ne peuvent pas se désynchroniser. */

/** Le réticule est-il possible ici ? Faux sur pointeur grossier — un téléphone
 *  n'a pas de curseur à remplacer, et `cursor: none` n'y veut rien dire. */
export function curseurPossible(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: fine)').matches;
}

/** Le réglage doit-il être PROPOSÉ ? La vue Profil s'en sert pour retirer la
 *  ligne — absente, pas grisée : un interrupteur désactivé demande une
 *  explication, un réglage qui n'a aucun sens sur l'appareil n'a rien à y
 *  faire.
 *
 *  L'état part de `false` et bascule au montage, jamais pendant le rendu : les
 *  pages sont prérendues (D12), et interroger `matchMedia` au rendu ferait
 *  diverger le serveur du navigateur — React remplacerait alors l'arbre entier
 *  au lieu de l'hydrater. */
export function useCurseurPossible(): boolean {
  const [possible, setPossible] = useState(false);
  useEffect(() => setPossible(curseurPossible()), []);
  return possible;
}

export function ReticleCursor() {
  const { customCursor } = useSettings();
  const possible = useCurseurPossible();
  const noyau = useRef<HTMLDivElement>(null);
  const anneau = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!customCursor || !curseurPossible()) return;

    const racine = document.documentElement;
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* Facteur 1 = pas de traîne. Le garde-fou n° 1 tient en cette ligne. */
    const facteur = reduit ? 1 : AMORTI;

    /* Le curseur système ne disparaît qu'ICI, à l'entrée de l'effet, et
       revient au nettoyage — quel qu'en soit le motif : réglage coupé,
       changement de page, démontage de la coque. */
    racine.setAttribute('data-cursor', 'reticle');

    let sourisX = window.innerWidth / 2;
    let sourisY = window.innerHeight / 2;
    let anneauX = sourisX;
    let anneauY = sourisY;
    let etat: EtatCible = 'repos';
    let presse = false;
    let vue = false;
    let image = 0;
    let compteur = 0;

    const bouger = (e: MouseEvent) => {
      sourisX = e.clientX;
      sourisY = e.clientY;
      vue = true;
    };
    const enfoncer = () => (presse = true);
    const relacher = () => (presse = false);
    const sortir = () => (vue = false);
    const entrer = () => (vue = true);

    window.addEventListener('mousemove', bouger, { passive: true });
    window.addEventListener('mousedown', enfoncer, { passive: true });
    window.addEventListener('mouseup', relacher, { passive: true });
    document.addEventListener('mouseleave', sortir);
    document.addEventListener('mouseenter', entrer);

    const boucle = () => {
      image = requestAnimationFrame(boucle);

      const n = noyau.current;
      const a = anneau.current;
      if (!n || !a) return;

      /* Ce que la souris survole, échantillonné SIX FOIS moins souvent que le
         reste : `elementFromPoint` force un calcul de mise en page, et le faire
         à chaque image coûterait plus cher que tout le reste du curseur. */
      if (compteur % 6 === 0 && vue) {
        const el = document.elementFromPoint(sourisX, sourisY);
        etat = el?.closest(CHAMPS_TEXTE) ? 'texte' : el?.closest(CLIQUABLES) ? 'survol' : 'repos';
      }
      compteur++;

      const taille = presse ? TAILLES.presse : etat === 'survol' ? TAILLES.survol : TAILLES.repos;

      /* NOYAU — il ne traîne pas : il EST la position de la souris. C'est le
         contraste entre lui et l'anneau qui donne la sensation d'instrument. */
      const barre = etat === 'texte' && !presse;
      const largeurNoyau = barre ? 2 : taille.noyau;
      const hauteurNoyau = barre ? 18 : taille.noyau;
      n.style.width = `${largeurNoyau}px`;
      n.style.height = `${hauteurNoyau}px`;
      n.style.borderRadius = barre ? '1px' : '50%';
      n.style.transform = `translate3d(${sourisX - largeurNoyau / 2}px, ${sourisY - hauteurNoyau / 2}px, 0)`;
      n.style.opacity = vue ? '1' : '0';

      /* ANNEAU — il rattrape. Sous `prefers-reduced-motion`, `facteur` vaut 1
         et il colle, ce qui revient à supprimer la traîne sans code en plus. */
      anneauX = amortir(anneauX, sourisX, facteur);
      anneauY = amortir(anneauY, sourisY, facteur);

      /* PULSATION CALCULÉE ICI, et non par une image-clé CSS.
         Deux raisons, dans cet ordre. La boucle écrit `transform` à chaque
         image : une image-clé qui animerait `scale` sur le même élément serait
         écrasée soixante fois par seconde — c'est pourquoi le prototype
         n'anime que l'opacité. Et la calculer permet de composer translation
         et échelle dans UNE seule chaîne, donc une seule écriture.
         1,6 s de période, opacité .55 ↔ 1, échelle 1 ↔ 1,08. */
      const phase = reduit ? 0 : Math.sin((performance.now() / 1600) * 2 * Math.PI);
      const echelle = reduit ? 1 : 1.04 + 0.04 * phase;
      const pulse = reduit ? 1 : 0.775 + 0.225 * phase;

      a.style.width = `${taille.anneau}px`;
      a.style.height = `${taille.anneau}px`;
      a.style.borderWidth = etat === 'survol' ? '1.5px' : '1px';
      a.style.borderColor = etat === 'survol' ? 'var(--acc)' : 'rgba(var(--glow), .55)';
      a.style.transform = `translate3d(${anneauX - taille.anneau / 2}px, ${anneauY - taille.anneau / 2}px, 0) scale(${echelle})`;
      a.style.opacity = vue ? String(pulse) : '0';
    };

    image = requestAnimationFrame(boucle);

    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener('mousemove', bouger);
      window.removeEventListener('mousedown', enfoncer);
      window.removeEventListener('mouseup', relacher);
      document.removeEventListener('mouseleave', sortir);
      document.removeEventListener('mouseenter', entrer);
      /* LE geste qui rend la souris. Il est dans le nettoyage, donc il a lieu
         quoi qu'il arrive — y compris si le composant est démonté par une
         erreur de rendu ailleurs. */
      racine.removeAttribute('data-cursor');
    };
  }, [customCursor]);

  /* Garde-fou n° 2 : sur pointeur grossier, RIEN n'est monté — pas même les
     deux div invisibles. Le réglage peut valoir `true` sur un téléphone, s'il
     a été activé ailleurs et restauré par un import. */
  if (!customCursor || !possible) return null;

  return (
    <div aria-hidden="true" data-reticle className="pointer-events-none fixed inset-0 z-[999]">
      {/* `pointer-events: none` sur CHAQUE nœud, pas seulement sur le parent :
          un décor qui intercepte un clic n'est plus un décor. */}
      <div
        ref={anneau}
        className="pointer-events-none fixed top-0 left-0 rounded-full border opacity-0"
        style={{ borderColor: 'rgba(var(--glow), .55)', willChange: 'transform' }}
      />
      <div
        ref={noyau}
        className="pointer-events-none fixed top-0 left-0 opacity-0"
        style={{ background: 'var(--acc2)', willChange: 'transform' }}
      />
    </div>
  );
}
