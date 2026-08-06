import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/* D3 — styles/tokens.css avait été RÉDIGÉ à la main, avec des noms et des
   valeurs sans rapport avec le prototype ni avec 04-DESIGN-TOKENS.md :
   --fg / --fg-dim / --accent / --accent-hi / --bg-2 au lieu de
   --txt / --txt2 / --mut / --acc / --acc2 / --acc3 / --panel2 / --line2 /
   --glow / --bg2. Sept jetons majeurs manquaient, dont --mut (180 usages
   dans le prototype), --acc2 (155) et --glow (65). Aucune valeur ne
   coïncidait : --bg valait #08090d au lieu de #04060d.

   Rien ne le signalait : le projet compilait, les tests passaient. Mais toute
   vue portée dessus aurait été visuellement fausse, et la non-régression
   visuelle (11 captures de référence) n'aurait jamais concordé.

   Les jetons ne se rédigent pas : ils s'extraient. Ce test le prouve à
   chaque commit. */

const THEMES = ['neural', 'plasma', 'clinical'] as const;

/** Extrait les déclarations `--nom: valeur` d'un corps de règle CSS. */
const parseDeclarations = (block: string): Map<string, string> => {
  const out = new Map<string, string>();
  for (const m of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;}]+)/gi)) {
    out.set(m[1]!.trim(), m[2]!.trim());
  }
  return out;
};

/** Corps de la règle portant ce sélecteur. Tolère les guillemets d'attribut. */
const ruleBody = (css: string, selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'i'));
  if (!match) throw new Error(`Sélecteur introuvable : ${selector}`);
  return match[1]!;
};

const prototype = readFileSync('public/prototype/Habitum.dc.html', 'utf8');
const tokens = readFileSync('styles/tokens.css', 'utf8');

describe('styles/tokens.css est extrait du prototype, pas rédigé', () => {
  it(':root reprend exactement les jetons de :root du prototype', () => {
    const attendus = parseDeclarations(ruleBody(prototype, ':root'));
    const obtenus = parseDeclarations(ruleBody(tokens, ':root'));

    expect(attendus.size, 'le prototype doit déclarer plus de dix jetons').toBeGreaterThan(10);
    for (const [nom, valeur] of attendus) {
      expect(obtenus.get(nom), `jeton --${nom} de :root`).toBe(valeur);
    }
  });

  for (const theme of THEMES) {
    it(`[data-theme='${theme}'] reprend exactement les jetons du prototype`, () => {
      const attendus = parseDeclarations(ruleBody(prototype, `[data-theme=${theme}]`));
      const obtenus = parseDeclarations(ruleBody(tokens, `[data-theme='${theme}']`));

      expect(attendus.size, `le thème ${theme} doit déclarer des jetons`).toBeGreaterThan(0);
      for (const [nom, valeur] of attendus) {
        expect(obtenus.get(nom), `jeton --${nom} du thème ${theme}`).toBe(valeur);
      }
    });
  }

  it("aucun jeton utilisé par le prototype n'est absent de tokens.css", () => {
    const utilises = new Set([...prototype.matchAll(/var\(--([a-z0-9-]+)\)/gi)].map((m) => m[1]!));
    const declares = parseDeclarations(ruleBody(tokens, ':root'));
    const manquants = [...utilises].filter((n) => !declares.has(n)).sort();

    expect(manquants, `jetons utilisés mais non déclarés : ${manquants.join(', ')}`).toEqual([]);
  });

  it('aucun jeton fabriqué ne subsiste dans le dépôt', () => {
    // Les noms inventés par la version rédigée à la main.
    const inventes = ['--fg', '--fg-dim', '--accent', '--accent-hi', '--bg-2'];
    for (const nom of inventes) {
      expect(tokens.includes(`${nom}:`), `${nom} ne doit plus exister`).toBe(false);
    }
  });
});
