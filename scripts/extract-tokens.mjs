#!/usr/bin/env node
/* Génère styles/tokens.css par EXTRACTION de public/prototype/Habitum.dc.html.

   D3 — la version précédente était rédigée à la main : noms et valeurs sans
   rapport avec le prototype ni avec docs/handoff/04-DESIGN-TOKENS.md, alors que
   son en-tête affirmait qu'elle en était extraite. Sept jetons majeurs
   manquaient. Les jetons ne se rédigent pas.

   Usage :
     node scripts/extract-tokens.mjs           écrit styles/tokens.css
     node scripts/extract-tokens.mjs --check   échoue si le fichier a dérivé
*/
import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE = 'public/prototype/Habitum.dc.html';
const CIBLE = 'styles/tokens.css';
const THEMES = ['neural', 'plasma', 'clinical'];

const prototype = readFileSync(SOURCE, 'utf8');

/** Corps de la règle portant ce sélecteur, dans le prototype. */
const ruleBody = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = prototype.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'i'));
  if (!match) throw new Error(`Sélecteur introuvable dans ${SOURCE} : ${selector}`);
  return match[1];
};

/** Déclarations `--nom: valeur` d'un corps de règle, dans l'ordre d'origine. */
const declarations = (block) =>
  [...block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;}]+)/gi)].map(([, nom, valeur]) => [
    nom,
    valeur.trim(),
  ]);

const renderRule = (selector, block) => {
  const decls = declarations(block);
  if (decls.length === 0) throw new Error(`Aucun jeton extrait pour ${selector}`);
  return `${selector} {\n${decls.map(([n, v]) => `  --${n}: ${v};`).join('\n')}\n}`;
};

const sortie = [
  '/* --------------------------------------------------------------------------',
  '   Habitum — jetons de thème.',
  '',
  '   FICHIER GÉNÉRÉ — ne pas éditer à la main.',
  `   Source      : ${SOURCE}`,
  '   Régénérer   : node scripts/extract-tokens.mjs',
  '   Vérifier    : npm run check:tokens  (inclus dans npm run verify)',
  '   Test        : tests/unit/tokens.test.ts',
  '',
  '   Table commentée des valeurs : docs/handoff/04-DESIGN-TOKENS.md',
  "   Décision B1 : l'application reste sombre ; Modernist est réservé à la",
  '   vitrine et à la documentation (docs/handoff/07-DECISION-B1.md).',
  '   -------------------------------------------------------------------------- */',
  '',
  renderRule(':root', ruleBody(':root')),
  '',
  ...THEMES.flatMap((t) => [renderRule(`[data-theme='${t}']`, ruleBody(`[data-theme=${t}]`)), '']),
  '/* Typographie — non extraite : le prototype charge ses familles par une balise',
  '   <link>. Ces variables sont réaffectées aux polices auto-hébergées par',
  '   next/font au moment où elles seront posées (défaut D7, phase « Système',
  "   visuel »). Tant que ce n'est pas fait, le repli système s'applique. */",
  ':root {',
  "  --font-ui: 'Space Grotesk', system-ui, -apple-system, sans-serif;",
  "  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;",
  '}',
  '',
].join('\n');

if (process.argv.includes('--check')) {
  let actuel;
  try {
    actuel = readFileSync(CIBLE, 'utf8');
  } catch {
    console.error(`${CIBLE} est absent. Lancer : node scripts/extract-tokens.mjs`);
    process.exit(1);
  }
  if (actuel !== sortie) {
    console.error(
      `${CIBLE} a dérivé de ${SOURCE}.\n` +
        'Les jetons ne se rédigent pas : lancer `node scripts/extract-tokens.mjs`.',
    );
    process.exit(1);
  }
  const total = declarations(ruleBody(':root')).length;
  console.log(
    `OK — ${CIBLE} conforme au prototype (${total} jetons × ${THEMES.length + 1} blocs).`,
  );
} else {
  writeFileSync(CIBLE, sortie);
  const total = declarations(ruleBody(':root')).length;
  console.log(`OK — ${CIBLE} régénéré : ${total} jetons, ${THEMES.length + 1} blocs.`);
}
