import { describe, expect, it } from 'vitest';
import { defilementVers, indexParFrappe, placerPanneau } from '@/components/ui/select-calculs';

/* Les trois calculs du menu déroulant — `components/ui/select-calculs.ts`.
 *
 * Ils sont testés ICI, hors du DOM, parce qu'ils n'en ont pas besoin : ce sont
 * trois fonctions de nombres et de chaînes. Le reste du composant — ARIA,
 * clavier, portail, thèmes — se vérifie dans un vrai navigateur
 * (`tests/e2e/select.spec.ts`) : un menu déroulant qui « passe » en jsdom mais
 * se fait couper par un `overflow:hidden` n'a rien prouvé. */

describe('placerPanneau — retourner le menu plutôt que le couper', () => {
  const PANNEAU = 200;
  const FENETRE = 800;

  it('ouvre SOUS le bouton quand la place y est', () => {
    const p = placerPanneau({ haut: 100, bas: 140 }, PANNEAU, FENETRE);

    expect(p.retourne).toBe(false);
    expect(p.top).toBe(146);
  });

  it('retourne AU-DESSUS quand le bas de la fenêtre est trop proche', () => {
    /* Bouton à 40 px du bas : 200 px de panneau n'y tiennent pas. Sans
       retournement, l'utilisateur voit deux options sur six. */
    const p = placerPanneau({ haut: 720, bas: 760 }, PANNEAU, FENETRE);

    expect(p.retourne).toBe(true);
    expect(p.top).toBe(514);
  });

  it('préfère le bas quand aucun des deux côtés ne suffit', () => {
    /* Fenêtre plus courte que le panneau : retourner ne gagne rien et ferait
       sortir le menu par le haut, là où il n'y a pas de défilement. */
    const p = placerPanneau({ haut: 10, bas: 50 }, 400, 300);

    expect(p.retourne).toBe(false);
  });
});

describe('indexParFrappe — sauter à une option en tapant', () => {
  const options = ['Opérateur', 'Chercheuse', 'Athlète', 'Étudiante', 'Artisan', 'Cadre'];

  it('saute à la première option qui commence par la lettre', () => {
    expect(indexParFrappe(options, 'c', 0)).toBe(1);
  });

  it('repart APRÈS l’option courante, pour parcourir les homonymes', () => {
    /* Deux options en « A ». Taper « a » deux fois doit donner les deux, pas
       deux fois la même. */
    expect(indexParFrappe(options, 'a', 0)).toBe(2);
    expect(indexParFrappe(options, 'a', 2)).toBe(4);
  });

  it('boucle en fin de liste', () => {
    expect(indexParFrappe(options, 'o', 4)).toBe(0);
  });

  it('ignore accents et casse — « e » trouve « Étudiante »', () => {
    /* Sans cela, un utilisateur francophone tape « e » et n'atteint jamais une
       option qui commence par une majuscule accentuée. */
    expect(indexParFrappe(options, 'et', 0)).toBe(3);
  });

  it('rend -1 quand rien ne correspond, pour ne pas déplacer la sélection', () => {
    expect(indexParFrappe(options, 'z', 0)).toBe(-1);
  });
});

describe('defilementVers — ramener l’option active sans scrollIntoView', () => {
  /* CLAUDE.md interdit `scrollIntoView` : il fait défiler TOUS les ancêtres,
     donc la page derrière le menu. On ajuste `scrollTop` du panneau, et lui
     seul. */
  const VUE = 280;

  it('ne bouge pas quand l’option est déjà visible', () => {
    expect(defilementVers({ haut: 100, hauteur: 36 }, { scrollTop: 0, hauteur: VUE })).toBe(0);
  });

  it('remonte quand l’option est au-dessus de la fenêtre visible', () => {
    expect(defilementVers({ haut: 40, hauteur: 36 }, { scrollTop: 120, hauteur: VUE })).toBe(40);
  });

  it('descend juste assez pour montrer l’option entière', () => {
    /* « Juste assez » : l'option affleure le bas, elle ne saute pas au centre.
       Un menu qui recentre à chaque flèche donne le mal de mer. */
    expect(defilementVers({ haut: 400, hauteur: 36 }, { scrollTop: 0, hauteur: VUE })).toBe(156);
  });
});
