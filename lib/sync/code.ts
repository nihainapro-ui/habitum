/* Code d'appairage — 20 caractères, 100 bits d'entropie.
 *
 * POURQUOI UN CODE ET NON DES MOTS. Une liste de 2048 mots devrait être
 * écrite, relue et licenciée, pour un gain nul : ce code se copie-colle, et
 * quand il faut le taper, l'alphabet de Crockford retire les quatre
 * caractères qu'on confond en le lisant à voix haute — I, L, O, U.
 *
 * C'EST LE SEUL SECRET DE L'UTILISATEUR. Il dérive à la fois l'identifiant
 * d'espace et la clé de chiffrement (`crypto.ts`) : perdu, rien n'est
 * récupérable — ni par nous, ni par personne. */

/** Alphabet de Crockford : dix chiffres, vingt-deux lettres. 32 symboles,
 *  donc exactement 5 bits par caractère. */
export const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** 20 × 5 bits = 100 bits. */
export const LONGUEUR_CODE = 20;

/** Confusions de lecture, telles que Crockford les tranche. */
const CONFUSIONS: Record<string, string> = { I: '1', L: '1', O: '0', U: 'V' };

export function genererCode(): string {
  /* `getRandomValues` et non `Math.random` : le second est prévisible, et un
     secret prévisible n'est pas un secret. */
  const octets = crypto.getRandomValues(new Uint8Array(LONGUEUR_CODE));
  /* Le modulo est sans biais : 256 est un multiple exact de 32. */
  return Array.from(octets, (o) => ALPHABET[o % ALPHABET.length]).join('');
}

export function normaliserCode(saisi: string): string {
  const brut = saisi.toUpperCase().replace(/[\s-]/g, '');
  return Array.from(brut, (ch) => CONFUSIONS[ch] ?? ch).join('');
}

export function codeValide(code: string): boolean {
  if (code.length !== LONGUEUR_CODE) return false;
  return Array.from(code).every((ch) => ALPHABET.includes(ch));
}

export function formaterCode(code: string): string {
  return (code.match(/.{1,4}/g) ?? []).join('-');
}
