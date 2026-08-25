import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

/* ============================================================================
   Le harnais visuel tourne dans UNE seule image — tâche 8.2.

   La non-régression visuelle compare des captures au pixel près. Elle n'a de
   sens que si celui qui PRODUIT le socle et celui qui le JUGE dessinent
   pareil. C'est pourquoi les deux passent par le conteneur officiel
   Playwright : `scripts/visual.mjs` en local, le job `visuel` en CI.

   Le 25 août 2026, ils n'y passaient pas encore tous les deux : le socle
   sortait de l'image, `ubuntu-latest` le jugeait avec ses propres polices, et
   8 captures sur 33 échouaient à 3–4 % d'écart pour un seuil de 2 %. Aucune
   régression du produit — deux Linux qui ne rendent pas le texte identiquement.

   D'où ce contrôle. La version de l'image est écrite à DEUX endroits : le
   script la déduit de `@playwright/test`, le workflow la nomme en dur (une
   directive `container:` de GitHub Actions n'accepte pas d'expression). Deux
   sources pour un même fait finissent toujours par diverger — et cette
   divergence-là ne se verrait pas : la CI passerait au rouge sur huit captures,
   et on chercherait une régression visuelle qui n'existe pas.
   ========================================================================= */

const require = createRequire(import.meta.url);
const versionPlaywright = (require('@playwright/test/package.json') as { version: string }).version;

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const script = readFileSync('scripts/visual.mjs', 'utf8');

describe('harnais de non-régression visuelle', () => {
  it('le job `visuel` tourne dans le conteneur officiel', () => {
    /* Sans `container:`, le job s'exécute sur l'hôte `ubuntu-latest` — c'est
       exactement la configuration qui a produit les huit faux écarts. */
    expect(workflow, 'le job `visuel` doit déclarer une image de conteneur').toMatch(
      /container:\s*mcr\.microsoft\.com\/playwright:/,
    );
  });

  it('le conteneur de la CI est à la version de @playwright/test', () => {
    const trouve = /container:\s*mcr\.microsoft\.com\/playwright:v([\d.]+)-/.exec(workflow)?.[1];

    expect(trouve, 'version d’image introuvable dans ci.yml').toBeDefined();
    expect(
      trouve,
      `ci.yml épingle l’image v${trouve}, alors que @playwright/test est en ` +
        `${versionPlaywright}. Monter l’un sans l’autre fait diverger le socle ` +
        `de son juge, et la CI rougit sur des captures intactes.`,
    ).toBe(versionPlaywright);
  });

  it('le script local déduit la version au lieu de la recopier', () => {
    /* `scripts/visual.mjs` lit la version dans `@playwright/test` : il ne peut
       donc pas dériver. C'est le workflow qui a besoin d'être surveillé, pas
       lui — et ce test échouerait si quelqu'un « simplifiait » le script en y
       écrivant un numéro. */
    expect(script).toMatch(/require\('@playwright\/test\/package\.json'\)/);
    expect(script).toMatch(/playwright:v\$\{VERSION\}-noble/);
  });

  it('le job `visuel` n’installe ni Node ni les navigateurs', () => {
    /* L'image les apporte déjà. En superposer d'autres réintroduirait la
       divergence que le conteneur vient de supprimer.
     *
     * LES COMMENTAIRES SONT RETIRÉS AVANT DE CHERCHER, et ce n'est pas un
     * détail : sans cela le contrôle échoue sur sa PROPRE documentation — le
     * job explique justement qu'il n'installe « ni setup-node ni playwright
     * install ». Le dépôt a déjà payé ce piège en phase 6, sur le contrôle
     * `dangerouslySetInnerHTML` : la seule façon de le satisfaire aurait été
     * d'effacer l'explication de ce qu'il vérifie. */
    const bloc = workflow
      .slice(workflow.indexOf('  visuel:'))
      .split(String.fromCharCode(10))
      .filter((l) => !l.trim().startsWith('#'))
      .join(String.fromCharCode(10));

    expect(bloc).not.toMatch(/setup-node/);
    expect(bloc).not.toMatch(/playwright install/);
    /* Et le job fait bien ce pour quoi il existe. */
    expect(bloc).toMatch(/playwright test --project=visual/);
  });
});
