import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/* T7.3 — `--mut` du thème plasma est documenté SOUS le seuil AA dans
   04-DESIGN-TOKENS.md. Ce test le prouve chiffre en main, puis interdit toute
   régression sur les trois thèmes.

   Il lit `styles/tokens.css`, qui est GÉNÉRÉ depuis le prototype : corriger
   une couleur se fait à la source, jamais ici (`npm run check:tokens` le
   refuserait). */

const SOURCE = readFileSync('styles/tokens.css', 'utf8');

type Theme = 'neural' | 'plasma' | 'clinical';

/** Jetons d'un thème. Le bloc `:root` porte `neural` ; les deux autres sont
 *  dans leur sélecteur `[data-theme='…']`. */
function jetons(theme: Theme): Record<string, string> {
  const selecteur = theme === 'neural' ? ':root' : `\\[data-theme='${theme}'\\]`;
  const bloc = new RegExp(`${selecteur}\\s*\\{([^}]*)\\}`).exec(SOURCE);
  if (!bloc) throw new Error(`bloc introuvable pour le thème ${theme}`);

  const table: Record<string, string> = {};
  for (const ligne of bloc[1]!.split(';')) {
    const m = /^\s*--([\w-]+)\s*:\s*(.+?)\s*$/.exec(ligne);
    if (m) table[m[1]!] = m[2]!;
  }
  return table;
}

/** `#rrggbb`, `#rgb` ou `rgba(r,g,b,a)` → composantes 0–255.
 *  Une couleur translucide est aplatie sur son fond : c'est ce que l'œil voit,
 *  et donc ce que WCAG mesure. */
function composantes(valeur: string, fond?: [number, number, number]): [number, number, number] {
  /* Découpage plutôt qu'expression régulière : une regex `rgba(...)` avec des
     quantificateurs imbriqués est signalée comme exposée au retour arrière
     catastrophique — à juste titre. Un `split` est linéaire, et plus lisible. */
  const brut = valeur.trim();
  if (brut.startsWith('rgb')) {
    const parties = brut
      .slice(brut.indexOf('(') + 1, brut.lastIndexOf(')'))
      .split(',')
      .map((x) => Number(x.trim()));
    const [r, v, b] = parties as [number, number, number];
    const alpha = parties.length > 3 ? parties[3]! : 1;
    if (alpha >= 1 || !fond) return [r, v, b];
    return [
      r * alpha + fond[0] * (1 - alpha),
      v * alpha + fond[1] * (1 - alpha),
      b * alpha + fond[2] * (1 - alpha),
    ];
  }

  const hex = valeur.trim().replace('#', '');
  const court = hex.length === 3;
  const lire = (i: number) => parseInt(court ? hex[i]!.repeat(2) : hex.slice(i * 2, i * 2 + 2), 16);
  return [lire(0), lire(1), lire(2)];
}

/** Luminance relative, formule WCAG 2.1. */
function luminance([r, v, b]: [number, number, number]): number {
  const canal = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(v) + 0.0722 * canal(b);
}

export function ratio(theme: Theme, avant: string, arriere: string): number {
  const table = jetons(theme);
  const fond = composantes(table[arriere]!);
  const texte = composantes(table[avant]!, fond);
  const [a, b] = [luminance(texte), luminance(fond)].sort((x, y) => y - x);
  return (a! + 0.05) / (b! + 0.05);
}

const PAIRES = [
  ['txt', 'bg'],
  ['txt2', 'bg'],
  ['mut', 'bg'],
  ['txt', 'bg2'],
  ['mut', 'bg2'],
] as const;

/* UN SEUL SEUIL : 4,5.

   La tentation était de tolérer 3 pour `--mut`, au motif qu'il ne sert qu'à
   des micro-libellés. C'est faux au regard de la norme : « texte large »
   signifie 24 px, ou 18,66 px en gras. Les micro-libellés du produit font
   9,5 px. Ils relèvent donc du texte normal, et 4,5 s'applique. */
const AA = 4.5;

describe('contraste WCAG AA', () => {
  for (const theme of ['neural', 'plasma', 'clinical'] as const) {
    for (const [avant, arriere] of PAIRES) {
      it(`${theme} — --${avant} sur --${arriere}`, () => {
        const mesure = ratio(theme, avant, arriere);
        expect(
          Number(mesure.toFixed(2)),
          `${theme} --${avant}/--${arriere} = ${mesure.toFixed(2)}, seuil ${AA}`,
        ).toBeGreaterThanOrEqual(AA);
      });
    }
  }
});
