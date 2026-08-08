/* Raccourcis globaux.

   RÈGLE NON NÉGOCIABLE : un raccourci qui se déclenche pendant la saisie rend
   le produit inutilisable. Toute touche est donc neutralisée dès que la cible
   est un champ de saisie — sauf `Escape`, qui doit toujours pouvoir fermer ce
   qui est ouvert, y compris depuis un champ. */

/** La cible de l'évènement est-elle un champ où l'utilisateur écrit ? */
export function estChampDeSaisie(cible: EventTarget | null): boolean {
  if (!(cible instanceof HTMLElement)) return false;
  if (cible.isContentEditable) return true;
  const balise = cible.tagName;
  if (balise === 'TEXTAREA' || balise === 'SELECT') return true;
  if (balise !== 'INPUT') return false;
  /* Les cases à cocher et les boutons radio ne reçoivent pas de texte : y
     neutraliser les raccourcis serait gratuit. */
  const type = (cible as HTMLInputElement).type;
  return type !== 'checkbox' && type !== 'radio' && type !== 'button';
}

/** Le modificateur « commande » de la plateforme : ⌘ sur macOS, Ctrl ailleurs.
 *  On accepte les deux — un utilisateur de clavier externe passe de l'un à
 *  l'autre sans y penser. */
export const modifieur = (e: KeyboardEvent): boolean => e.metaKey || e.ctrlKey;

export interface Raccourcis {
  ouvrirPalette: () => void;
  basculerZen: () => void;
  echapper: () => void;
}

/** Traite une frappe. Rend `true` si le raccourci a été consommé — l'appelant
 *  peut alors appeler `preventDefault`. */
export function traiterFrappe(e: KeyboardEvent, actions: Raccourcis): boolean {
  if (e.key === 'Escape') {
    actions.echapper();
    return true;
  }

  if (estChampDeSaisie(e.target)) return false;

  if (modifieur(e) && e.key.toLowerCase() === 'k') {
    actions.ouvrirPalette();
    return true;
  }

  if (modifieur(e) && e.key === '\\') {
    actions.basculerZen();
    return true;
  }

  return false;
}

/** Éléments capables de recevoir le focus au clavier, dans l'ordre du document.
 *  Sert au piège de focus des modales : `Tab` ne doit jamais mener derrière
 *  une boîte de dialogue ouverte. */
export function focusables(racine: HTMLElement): HTMLElement[] {
  const selecteur = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');
  return [...racine.querySelectorAll<HTMLElement>(selecteur)].filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/** Maintient `Tab` à l'intérieur de `racine`. Rend `true` si la frappe a été
 *  consommée. */
export function piegerFocus(e: KeyboardEvent, racine: HTMLElement | null): boolean {
  if (e.key !== 'Tab' || !racine) return false;
  const cibles = focusables(racine);
  if (cibles.length === 0) return false;

  const premier = cibles[0]!;
  const dernier = cibles[cibles.length - 1]!;
  const actif = document.activeElement;

  if (e.shiftKey && (actif === premier || !racine.contains(actif))) {
    dernier.focus();
    return true;
  }
  if (!e.shiftKey && (actif === dernier || !racine.contains(actif))) {
    premier.focus();
    return true;
  }
  return false;
}
