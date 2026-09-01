import { ALPHABET, normaliserCode } from './code';
import { SyncErreur } from './types';

/* Dérivation et chiffrement — tout par WebCrypto, aucune dépendance ajoutée.
 *
 * DEUX DÉRIVATIONS SÉPARÉES, et c'est le cœur du contrat : l'identifiant
 * d'espace part vers le serveur, la clé de chiffrement ne quitte JAMAIS
 * l'appareil. Elles sortent de la même racine mais par deux chemins HKDF
 * distincts — connaître l'une n'apprend rien sur l'autre.
 *
 * LE SEL EST FIXE, et il doit l'être : deux appareils qui ne se sont jamais
 * parlé doivent dériver la même clé du même code. C'est ce qui interdit une
 * phrase choisie par l'utilisateur — elle serait cassable hors ligne. Le code
 * est tiré au sort sur 100 bits (`code.ts`), ce qui ferme ce chemin. */

const enc = new TextEncoder();
const SEL = enc.encode('habitum-sync-v1');
const ITERATIONS = 600_000;

async function maitre(code: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: SEL, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    256,
  );
  return crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveBits', 'deriveKey']);
}

/** Base 32 de Crockford — le même alphabet que le code, pour qu'un espace lu
 *  dans un journal ne soit pas confondu avec autre chose. */
function base32(octets: Uint8Array): string {
  let bits = 0;
  let valeur = 0;
  let sortie = '';
  for (const o of octets) {
    valeur = (valeur << 8) | o;
    bits += 8;
    while (bits >= 5) {
      sortie += ALPHABET[(valeur >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return sortie;
}

export interface Cles {
  /** Envoyé au serveur. Ne révèle rien de la clé. */
  espace: string;
  /** Ne sort jamais de l'appareil. `extractable: false` l'impose. */
  cle: CryptoKey;
}

export async function deriverCles(code: string): Promise<Cles> {
  const m = await maitre(normaliserCode(code));
  const info = (etiquette: string) => ({
    name: 'HKDF' as const,
    hash: 'SHA-256' as const,
    salt: new Uint8Array(0),
    info: enc.encode(etiquette),
  });

  /* 160 bits → exactement 32 caractères en base 32, sans reste ni remplissage. */
  const espaceBits = await crypto.subtle.deriveBits(info('espace'), m, 160);
  const cle = await crypto.subtle.deriveKey(
    info('chiffrement'),
    m,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );

  return { espace: base32(new Uint8Array(espaceBits)), cle };
}

/** Base 64 par morceaux : `String.fromCharCode(...tableau)` fait déborder la
 *  pile d'appels au-delà de quelques dizaines de milliers d'octets, et une
 *  note longue y suffit. */
function versBase64(octets: Uint8Array): string {
  let s = '';
  for (let i = 0; i < octets.length; i += 8192) {
    s += String.fromCharCode(...octets.subarray(i, i + 8192));
  }
  return btoa(s);
}

function depuisBase64(s: string): Uint8Array<ArrayBuffer> {
  const brut = atob(s);
  const octets = new Uint8Array(brut.length);
  for (let i = 0; i < brut.length; i += 1) octets[i] = brut.charCodeAt(i);
  return octets;
}

export async function chiffrer(cle: CryptoKey, valeur: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const chiffre = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cle, enc.encode(JSON.stringify(valeur))),
  );
  const tout = new Uint8Array(iv.length + chiffre.length);
  tout.set(iv);
  tout.set(chiffre, iv.length);
  return versBase64(tout);
}

export async function dechiffrer<T>(cle: CryptoKey, blob: string): Promise<T> {
  try {
    const tout = depuisBase64(blob);
    const clair = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: tout.subarray(0, 12) },
      cle,
      tout.subarray(12),
    );
    return JSON.parse(new TextDecoder().decode(clair)) as T;
  } catch {
    /* AES-GCM est authentifié : un échec signifie mauvaise clé OU blob altéré.
       Les deux appellent la même réponse — ne pas écrire cette ligne. */
    throw new SyncErreur('cle', 'blob illisible');
  }
}
