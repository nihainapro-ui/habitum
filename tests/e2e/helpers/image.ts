import { deflateSync } from 'node:zlib';

/* Une VRAIE image, engendrée par le test.
 *
 * Pourquoi pas un fichier binaire dans le dépôt : parce que le test veut
 * choisir ses dimensions. Le recadrage carré ne se prouve que sur une image qui
 * ne l'est pas, et une image de démonstration figée obligerait à en versionner
 * une par cas. Trente lignes d'encodeur PNG coûtent moins cher, et elles disent
 * exactement ce qu'elles produisent.
 *
 * PNG et non JPEG : l'encodeur tient en une passe de `zlib`, sans table de
 * quantification ni transformée. Le produit, lui, réencodera en JPEG — c'est
 * justement ce qu'on veut voir faire au navigateur. */

const TABLE_CRC = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (octets: Buffer): number => {
  let c = -1;
  for (const o of octets) c = TABLE_CRC[(c ^ o) & 0xff]! ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

const morceau = (type: string, donnees: Buffer): Buffer => {
  const longueur = Buffer.alloc(4);
  longueur.writeUInt32BE(donnees.length);
  const corps = Buffer.concat([Buffer.from(type, 'ascii'), donnees]);
  const somme = Buffer.alloc(4);
  somme.writeUInt32BE(crc32(corps));
  return Buffer.concat([longueur, corps, somme]);
};

/** PNG opaque `largeur × hauteur`, en dégradé — un aplat uni se compresserait
 *  jusqu'à quelques octets, ce qui ne dirait rien du chemin de réduction. */
export function pngDeTest(largeur: number, hauteur: number): Buffer {
  const brut = Buffer.alloc(hauteur * (1 + largeur * 3));
  let i = 0;
  for (let y = 0; y < hauteur; y += 1) {
    brut[i] = 0; /* filtre « aucun » */
    i += 1;
    for (let x = 0; x < largeur; x += 1) {
      brut[i] = (x * 7) % 256;
      brut[i + 1] = (y * 11) % 256;
      brut[i + 2] = (x * y) % 256;
      i += 3;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largeur, 0);
  ihdr.writeUInt32BE(hauteur, 4);
  ihdr[8] = 8; /* 8 bits par canal */
  ihdr[9] = 2; /* couleur vraie, sans alpha */

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    morceau('IHDR', ihdr),
    morceau('IDAT', deflateSync(brut)),
    morceau('IEND', Buffer.alloc(0)),
  ]);
}
