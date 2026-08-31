import { describe, expect, it } from 'vitest';
import { amortir, TAILLES } from '@/components/shell/reticule-calculs';

/* L'amortissement du réticule — `components/shell/reticule-calculs.ts`.
 *
 * C'est le décalage entre le noyau, qui colle à la souris, et l'anneau, qui la
 * rattrape, qui donne la sensation d'instrument. Une seule ligne de calcul,
 * mais elle a deux façons de rater : trop lente, l'anneau reste en arrière et
 * paraît cassé ; sans plancher, il n'arrive JAMAIS tout à fait, et le
 * navigateur repeint indéfiniment un écart d'un centième de pixel. */

describe('amortir — l’anneau rattrape la souris', () => {
  it('avance d’une fraction de l’écart, pas de tout l’écart', () => {
    /* 0,18 par image : la valeur du prototype. */
    expect(amortir(0, 100, 0.18)).toBeCloseTo(18, 5);
  });

  it('converge vers la cible sans jamais la dépasser', () => {
    let x = 0;
    for (let i = 0; i < 60; i++) x = amortir(x, 100, 0.18);

    expect(x).toBeGreaterThan(99);
    expect(x).toBeLessThanOrEqual(100);
  });

  it('colle exactement à la cible sous `prefers-reduced-motion` (facteur 1)', () => {
    /* Le garde-fou : sans amortissement, le réticule ne traîne pas. */
    expect(amortir(0, 100, 1)).toBe(100);
  });

  it('se pose EXACTEMENT sur la cible sous le demi-pixel', () => {
    /* Sans ce plancher, l'écart tend vers zéro sans l'atteindre : la boucle
       d'animation ne s'arrête jamais et repeint pour rien, batterie comprise. */
    expect(amortir(99.9, 100, 0.18)).toBe(100);
  });

  it('ne bouge pas quand il est déjà arrivé', () => {
    expect(amortir(42, 42, 0.18)).toBe(42);
  });
});

describe('TAILLES — les états du réticule sont distincts', () => {
  /* Le rapport exige trois états VISIBLES et distincts. S'ils se ressemblent,
     la fonctionnalité est décorative — exactement le défaut qu'on corrige. */

  it('l’anneau grossit au survol d’un élément cliquable', () => {
    expect(TAILLES.survol.anneau).toBeGreaterThan(TAILLES.repos.anneau);
  });

  it('le clic resserre l’anneau ET grossit le noyau', () => {
    expect(TAILLES.presse.anneau).toBeLessThan(TAILLES.repos.anneau);
    expect(TAILLES.presse.noyau).toBeGreaterThan(TAILLES.repos.noyau);
  });

  it('les valeurs du rapport sont respectées au pixel', () => {
    expect(TAILLES.repos).toEqual({ noyau: 6, anneau: 26 });
    expect(TAILLES.survol.anneau).toBe(34);
    expect(TAILLES.presse).toEqual({ noyau: 10, anneau: 20 });
  });
});
