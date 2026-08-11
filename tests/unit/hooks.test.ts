import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/* Le garde-fou de `main` vit dans un hook Git, pas sur le serveur : GitHub
   refuse la protection de branche sur un dépôt privé en plan gratuit.
   Un hook mal installé échoue EN SILENCE — Git l'ignore, et on croit protégé
   ce qui ne l'est pas. D'où ces contrôles.

   Les cas testés sortent tous AVANT `npm run verify` : ce fichier tourne
   pendant `verify`, l'appeler ici bouclerait. */

const HOOK = '.githooks/pre-push';
const ZERO = '0'.repeat(40);

/** Joue le hook avec une ligne de stdin au format de Git :
 *  `<ref locale> <sha local> <ref distante> <sha distant>`. */
function jouer(ligne: string) {
  return spawnSync('sh', [HOOK], { input: `${ligne}\n`, encoding: 'utf8' });
}

const sha = (rev: string) => execFileSync('git', ['rev-parse', rev], { encoding: 'utf8' }).trim();

describe('garde-fou pre-push', () => {
  it('existe et est enregistré comme exécutable dans Git', () => {
    expect(existsSync(HOOK)).toBe(true);
    /* C'est le mode DANS L'INDEX GIT qui voyage, pas celui du disque : NTFS ne
       porte pas le bit exécutable, et un hook non exécutable est ignoré par Git
       sans le moindre message. `100755` est donc la seule preuve utile. */
    const entree = execFileSync('git', ['ls-files', '-s', HOOK], { encoding: 'utf8' });
    expect(entree.split(' ')[0], `mode Git de ${HOOK}`).toBe('100755');
  });

  it('Git pointe sur .githooks — sinon le hook ne sert à rien', () => {
    const chemin = execFileSync('git', ['config', 'core.hooksPath'], { encoding: 'utf8' }).trim();
    expect(chemin).toBe('.githooks');
  });

  it('laisse passer une branche qui n’est pas main, sans rien vérifier', () => {
    const r = jouer(`refs/heads/travail ${sha('HEAD')} refs/heads/travail ${ZERO}`);
    expect(r.status).toBe(0);
    expect(r.stdout).not.toContain('vérification complète');
  });

  it('refuse la suppression de main', () => {
    const r = jouer(`refs/heads/main ${ZERO} refs/heads/main ${sha('HEAD')}`);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/suppression de main refusée/i);
  });

  it('refuse un push non fast-forward sur main', () => {
    /* Distant = HEAD, local = HEAD~1 : le distant n'est pas un ancêtre du
       local, c'est exactement une réécriture d'historique. */
    const r = jouer(`refs/heads/main ${sha('HEAD~1')} refs/heads/main ${sha('HEAD')}`);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/non fast-forward/i);
  });
});
