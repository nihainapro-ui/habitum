# Synchronisation multi-appareils — plan d'implémentation

> **Pour les agents exécutants :** SOUS-COMPÉTENCE REQUISE — utiliser
> `superpowers:subagent-driven-development` (recommandé) ou
> `superpowers:executing-plans` pour dérouler ce plan tâche par tâche.
> Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** deux appareils partagent les mêmes données via un serveur qui ne
peut pas les lire, sans compte et sans geste de l'utilisateur.

**Architecture :** chaque entité est chiffrée localement (AES-GCM) puis déposée
sur un Worker Cloudflare qui ne stocke que `(espace, genre, id, updatedAt, seq,
blob)`. La convergence repose sur les `updatedAt`/`deletedAt` déjà présents
partout dans le modèle : le plus récent gagne, entité par entité. Le module
client est découpé pour que l'arbitrage — la seule logique subtile — soit une
fonction **pure**, testable sans réseau ni base.

**Pile :** TypeScript strict, Dexie 4, Zustand, WebCrypto (aucune dépendance
ajoutée côté application), Cloudflare Workers + D1 côté serveur, Vitest,
Playwright.

**Spec :** `docs/superpowers/specs/2026-09-01-synchronisation-multi-appareils-design.md`

## Contraintes globales

Elles s'appliquent à **toutes** les tâches, sans être répétées.

- **Aucune clé persistée existante n'est renommée** : `ov`, `obj`, `occ`, `tt`,
  `mat`, `cfg`, `habitum.state`, `habitum.state.big`, `habitum.state.bak`,
  `habitum.best`, `DB_NAME = 'habitum'`. Les clés `meta` **ajoutées** par ce
  plan sont nouvelles, donc autorisées.
- **`lib/domain/` n'est pas touché.** La synchronisation n'est pas une règle
  métier. ESLint l'impose déjà (`no-restricted-imports` sur `lib/domain/**`).
- **`lib/sync/` n'importe jamais React ni Next.** Seul le slice Zustand et le
  composant de réglages font le pont.
- **Aucun chiffre fabriqué** : « jamais synchronisé » s'écrit ainsi, jamais
  « il y a 0 minute ».
- **Libellés symétriques** : toute clé ajoutée à `messages/fr.json` existe dans
  `messages/en.json`. `npm run check:messages` l'impose.
- **`react/jsx-no-literals` est actif** : aucun texte en dur dans le JSX, tout
  passe par `useTranslations`.
- **`exactOptionalPropertyTypes` est actif** : une clé à `undefined` retire le
  champ, elle ne l'écrase pas.
- **`public/prototype/` n'est pas touché.**
- **Rien de payant** : MIT / Apache-2.0 / ISC / OFL, et paliers gratuits.
- Fin de chaque tâche : `npm run typecheck && npm run lint && npm test` au vert.
- Fin du plan : `npm run verify` vert, `npm run test:e2e` vert, `CHANGELOG.md`
  à jour.

## Structure des fichiers

```
lib/sync/
  types.ts       SyncKind, SyncRow, SyncErreur — aucune logique
  code.ts        code d'appairage : génération, normalisation, validation
  crypto.ts      dérivation des clés, chiffrement, déchiffrement
  merge.ts       arbitrage PUR : deux lignes → laquelle gagne
  entites.ts     carte genre → lecture depuis filigrane / écriture brute
  transport.ts   les deux appels HTTP, erreurs typées
  engine.ts      orchestration : tirer, arbitrer, écrire, pousser
  index.ts       ré-exports

sync-server/
  wrangler.toml  configuration du Worker
  schema.sql     la table D1
  src/logique.ts arbitrage serveur — PUR, testable en Node
  src/index.ts   le Worker : routage, D1, limitation de débit
  README.md      comment déployer

lib/store/slices/sync.ts        état et actions exposés à l'interface
components/settings/SyncSection.tsx  l'écran

tests/unit/sync/{code,crypto,merge,entites,engine,serveur}.test.ts
tests/e2e/synchronisation.spec.ts
```

**Découpage justifié :** `merge.ts` et `sync-server/src/logique.ts` appliquent la
**même règle d'arbitrage** et sont tous deux purs — c'est ce qui permet de
prouver la convergence par des tests unitaires rapides, sans serveur ni base.
`entites.ts` isole la seule partie qui connaît Dexie ; `engine.ts` ne fait que
l'enchaînement.

---

## Écart assumé par rapport à la spec

**Le code d'appairage n'est pas une suite de mots.** La spec § 4 annonçait
« 6 mots tirés d'une liste de 2048 ». Une telle liste devrait être écrite,
relue, licenciée et maintenue — pour un gain nul par rapport à un code
alphanumérique que l'utilisateur copie-colle dans l'immense majorité des cas.

Le plan retient donc un **code de 20 caractères en alphabet de Crockford**
(`0-9`, `A-Z` sans `I`, `L`, `O`, `U`), affiché en cinq groupes de quatre :

```
K7M2-9QPX-3RTZ-8HNV-4WBD
```

**100 bits d'entropie** — l'attaque hors ligne coûte 2¹⁰⁰ dérivations PBKDF2 à
600 000 itérations. La spec est mise à jour en conséquence (tâche 12).

---

## Tâche 1 : le code d'appairage

**Fichiers :**
- Créer : `lib/sync/code.ts`
- Test : `tests/unit/sync/code.test.ts`

**Interfaces :**
- Consomme : rien.
- Produit : `ALPHABET`, `LONGUEUR_CODE = 20`, `genererCode(): string`,
  `normaliserCode(saisi: string): string`, `codeValide(code: string): boolean`,
  `formaterCode(code: string): string`.
  `genererCode` rend le code **brut** (20 caractères, sans tiret).
  `formaterCode` est la seule fonction d'affichage.

- [ ] **Étape 1 : écrire le test qui échoue**

```ts
// tests/unit/sync/code.test.ts
import { describe, expect, it } from 'vitest';
import {
  ALPHABET,
  LONGUEUR_CODE,
  codeValide,
  formaterCode,
  genererCode,
  normaliserCode,
} from '@/lib/sync/code';

describe('code d’appairage', () => {
  it('rend 20 caractères de l’alphabet, sans tiret', () => {
    const c = genererCode();
    expect(c).toHaveLength(LONGUEUR_CODE);
    for (const ch of c) expect(ALPHABET).toContain(ch);
  });

  it('ne se répète pas', () => {
    /* 100 bits d’entropie : deux tirages identiques sur cent signalent un
       générateur cassé, pas un coup de chance. */
    const tirages = new Set(Array.from({ length: 100 }, genererCode));
    expect(tirages.size).toBe(100);
  });

  it('exclut les caractères ambigus', () => {
    for (const ch of ['I', 'L', 'O', 'U']) expect(ALPHABET).not.toContain(ch);
  });

  it('normalise ce qu’un humain tape', () => {
    /* Minuscules, tirets, espaces, et les quatre confusions classiques :
       l’utilisateur lit « O » là où le code porte un zéro. */
    expect(normaliserCode(' k7m2-9qpx 3rtz-8hnv-4wbd ')).toBe('K7M29QPX3RTZ8HNV4WBD');
    expect(normaliserCode('OIL0000000000000000U')).toBe('01100000000000000000');
  });

  it('valide un code correct et refuse le reste', () => {
    const c = genererCode();
    expect(codeValide(c)).toBe(true);
    expect(codeValide(c.slice(0, 19))).toBe(false);
    expect(codeValide(`${c}X`)).toBe(false);
    expect(codeValide('')).toBe(false);
  });

  it('affiche en cinq groupes de quatre', () => {
    expect(formaterCode('K7M29QPX3RTZ8HNV4WBD')).toBe('K7M2-9QPX-3RTZ-8HNV-4WBD');
  });
});
```

- [ ] **Étape 2 : lancer le test et vérifier qu'il échoue**

Lancer : `npx vitest run tests/unit/sync/code.test.ts`
Attendu : ÉCHEC — `Cannot find module '@/lib/sync/code'`.

- [ ] **Étape 3 : écrire l'implémentation minimale**

```ts
// lib/sync/code.ts
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
```

- [ ] **Étape 4 : lancer le test et vérifier qu'il passe**

Lancer : `npx vitest run tests/unit/sync/code.test.ts`
Attendu : SUCCÈS, 6 tests.

- [ ] **Étape 5 : commiter**

```bash
git add lib/sync/code.ts tests/unit/sync/code.test.ts
git commit -m "feat(sync): le code d'appairage — vingt caractères qu'on peut lire à voix haute"
```

---

## Tâche 2 : dérivation des clés et chiffrement

**Fichiers :**
- Créer : `lib/sync/types.ts`, `lib/sync/crypto.ts`
- Test : `tests/unit/sync/crypto.test.ts`

**Interfaces :**
- Consomme : `normaliserCode` (tâche 1).
- Produit :
  - `types.ts` : `SYNC_KINDS`, `type SyncKind`, `interface SyncRow { kind: SyncKind; id: string; updatedAt: string; blob: string }`,
    `class SyncErreur extends Error { readonly genre: 'reseau' | 'serveur' | 'limite' | 'cle' }`.
  - `crypto.ts` : `interface Cles { espace: string; cle: CryptoKey }`,
    `deriverCles(code: string): Promise<Cles>`,
    `chiffrer(cle: CryptoKey, valeur: unknown): Promise<string>`,
    `dechiffrer<T>(cle: CryptoKey, blob: string): Promise<T>`.

- [ ] **Étape 1 : écrire le test qui échoue**

```ts
// tests/unit/sync/crypto.test.ts
import { describe, expect, it } from 'vitest';
import { SyncErreur } from '@/lib/sync/types';
import { chiffrer, dechiffrer, deriverCles } from '@/lib/sync/crypto';

/* PBKDF2 à 600 000 itérations coûte ~0,3 s par dérivation : ces tests sont
   lents par construction, et c'est le prix de la résistance hors ligne. */
const CODE_A = 'K7M29QPX3RTZ8HNV4WBD';
const CODE_B = 'X4WBD8HNV3RTZ9QPXK7M';

describe('dérivation', () => {
  it('rend le même espace pour le même code', async () => {
    const un = await deriverCles(CODE_A);
    const deux = await deriverCles(CODE_A);
    expect(un.espace).toBe(deux.espace);
  });

  it('rend un espace de 32 caractères', async () => {
    const { espace } = await deriverCles(CODE_A);
    expect(espace).toHaveLength(32);
  });

  it('rend des espaces différents pour des codes différents', async () => {
    const un = await deriverCles(CODE_A);
    const deux = await deriverCles(CODE_B);
    expect(un.espace).not.toBe(deux.espace);
  });

  it('accepte un code tapé avec tirets et minuscules', async () => {
    const un = await deriverCles(CODE_A);
    const deux = await deriverCles('k7m2-9qpx-3rtz-8hnv-4wbd');
    expect(un.espace).toBe(deux.espace);
  });
}, 30_000);

describe('chiffrement', () => {
  it('fait un aller-retour sans rien perdre', async () => {
    const { cle } = await deriverCles(CODE_A);
    const valeur = { id: 'h1', name: 'Courir', tags: ['sport'], n: 42, vrai: true };
    const clair = await dechiffrer<typeof valeur>(cle, await chiffrer(cle, valeur));
    expect(clair).toEqual(valeur);
  });

  it('produit deux blobs différents pour la même valeur', async () => {
    /* Vecteur d'initialisation aléatoire : sans lui, deux entités identiques
       auraient le même chiffré, et le serveur pourrait les rapprocher. */
    const { cle } = await deriverCles(CODE_A);
    const un = await chiffrer(cle, { a: 1 });
    const deux = await chiffrer(cle, { a: 1 });
    expect(un).not.toBe(deux);
  });

  it('refuse un blob chiffré avec une autre clé', async () => {
    const a = await deriverCles(CODE_A);
    const b = await deriverCles(CODE_B);
    const blob = await chiffrer(a.cle, { secret: 'oui' });
    await expect(dechiffrer(b.cle, blob)).rejects.toBeInstanceOf(SyncErreur);
  });

  it('refuse un blob tronqué', async () => {
    const { cle } = await deriverCles(CODE_A);
    const blob = await chiffrer(cle, { a: 1 });
    await expect(dechiffrer(cle, blob.slice(0, 8))).rejects.toBeInstanceOf(SyncErreur);
  });
}, 30_000);
```

- [ ] **Étape 2 : lancer le test et vérifier qu'il échoue**

Lancer : `npx vitest run tests/unit/sync/crypto.test.ts`
Attendu : ÉCHEC — modules introuvables.

- [ ] **Étape 3 : écrire l'implémentation minimale**

```ts
// lib/sync/types.ts
/* Le vocabulaire de la synchronisation. Aucune logique ici : ce fichier est
   importé par le client ET par les tests du serveur, il doit rester inerte. */

/** Les genres synchronisés. Déclarés UNE SEULE FOIS — c'est le piège n°1 du
 *  CLAUDE.md : une liste recopiée finit par en oublier un, et des entités
 *  disparaissent en silence. `meta` ne transporte que deux clés (`entites.ts`). */
export const SYNC_KINDS = [
  'habits',
  'logs',
  'tasks',
  'goals',
  'notes',
  'sessions',
  'profiles',
  'shopping',
  'projects',
  'projectTasks',
  'meta',
] as const;

export type SyncKind = (typeof SYNC_KINDS)[number];

/** Une ligne telle qu'elle voyage. `blob` est opaque : le serveur ne peut ni
 *  le lire ni le vérifier. */
export interface SyncRow {
  kind: SyncKind;
  id: string;
  updatedAt: string;
  blob: string;
}

/** Erreur typée — l'interface doit distinguer « pas de réseau » (on réessaiera)
 *  de « mauvais code » (l'utilisateur doit agir). Un message unique les
 *  confondrait, et l'utilisateur retaperait son code pendant une panne Wi-Fi. */
export class SyncErreur extends Error {
  constructor(
    readonly genre: 'reseau' | 'serveur' | 'limite' | 'cle',
    message: string,
  ) {
    super(message);
    this.name = 'SyncErreur';
  }
}
```

```ts
// lib/sync/crypto.ts
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

function depuisBase64(s: string): Uint8Array {
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
```

- [ ] **Étape 4 : lancer le test et vérifier qu'il passe**

Lancer : `npx vitest run tests/unit/sync/crypto.test.ts`
Attendu : SUCCÈS, 9 tests. Le fichier prend une dizaine de secondes — c'est PBKDF2.

- [ ] **Étape 5 : commiter**

```bash
git add lib/sync/types.ts lib/sync/crypto.ts tests/unit/sync/crypto.test.ts
git commit -m "feat(sync): deux clés d'une seule racine — l'espace part, la clé reste"
```

---

## Tâche 3 : l'arbitrage — la fonction pure

**Fichiers :**
- Créer : `lib/sync/merge.ts`
- Test : `tests/unit/sync/merge.test.ts`

**Interfaces :**
- Consomme : rien (fichier **pur** : ni réseau, ni base, ni React).
- Produit : `interface Arbitrable { updatedAt: string; blob: string }`,
  `distanteGagne(locale: Arbitrable | undefined, distante: Arbitrable): boolean`.

- [ ] **Étape 1 : écrire le test qui échoue**

```ts
// tests/unit/sync/merge.test.ts
import { describe, expect, it } from 'vitest';
import { distanteGagne } from '@/lib/sync/merge';

const l = (updatedAt: string, blob = 'AAA') => ({ updatedAt, blob });

describe('arbitrage', () => {
  it('accepte une ligne inconnue localement', () => {
    expect(distanteGagne(undefined, l('2026-09-01T10:00:00.000Z'))).toBe(true);
  });

  it('accepte la plus récente', () => {
    expect(distanteGagne(l('2026-09-01T10:00:00.000Z'), l('2026-09-01T11:00:00.000Z'))).toBe(true);
  });

  it('refuse la plus ancienne', () => {
    /* C'est CE test qui empêche une suppression de ressusciter : l'appareil en
       retard renvoie sa version d'avant, elle est écartée. */
    expect(distanteGagne(l('2026-09-01T11:00:00.000Z'), l('2026-09-01T10:00:00.000Z'))).toBe(false);
  });

  it('départage deux horodatages identiques par le blob, dans le même sens des deux côtés', () => {
    /* Sans départage déterministe, deux appareils gardent chacun leur version
       et NE CONVERGENT JAMAIS. Le blob est comparable : les deux appareils
       voient les deux mêmes chaînes et choisissent la même. */
    const a = l('2026-09-01T10:00:00.000Z', 'AAA');
    const b = l('2026-09-01T10:00:00.000Z', 'ZZZ');
    expect(distanteGagne(a, b)).toBe(true);
    expect(distanteGagne(b, a)).toBe(false);
  });

  it('n’écrit pas une ligne strictement identique', () => {
    const a = l('2026-09-01T10:00:00.000Z', 'AAA');
    expect(distanteGagne(a, { ...a })).toBe(false);
  });

  it('converge quel que soit l’ordre d’arrivée', () => {
    /* Propriété de fond : appliquer {x, y, z} dans n'importe quel ordre donne
       le même gagnant. Sinon, deux appareils divergent selon leur latence. */
    const lignes = [
      l('2026-09-01T10:00:00.000Z', 'B'),
      l('2026-09-01T12:00:00.000Z', 'C'),
      l('2026-09-01T11:00:00.000Z', 'A'),
    ];
    const replier = (ordre: typeof lignes) =>
      ordre.reduce<(typeof lignes)[number] | undefined>(
        (acc, d) => (distanteGagne(acc, d) ? d : acc),
        undefined,
      );

    const attendu = replier(lignes);
    expect(replier([...lignes].reverse())).toEqual(attendu);
    expect(replier([lignes[1]!, lignes[0]!, lignes[2]!])).toEqual(attendu);
    expect(attendu?.blob).toBe('C');
  });
});
```

- [ ] **Étape 2 : lancer le test et vérifier qu'il échoue**

Lancer : `npx vitest run tests/unit/sync/merge.test.ts`
Attendu : ÉCHEC — `Cannot find module '@/lib/sync/merge'`.

- [ ] **Étape 3 : écrire l'implémentation minimale**

```ts
// lib/sync/merge.ts
/* L'ARBITRAGE, ET RIEN D'AUTRE.
 *
 * Ce fichier est PUR : pas de réseau, pas de base, pas de React, aucun import.
 * C'est délibéré — la convergence de deux appareils est la seule chose subtile
 * de toute la synchronisation, et elle doit pouvoir être prouvée par des tests
 * qui tournent en millisecondes.
 *
 * LA MÊME RÈGLE EST APPLIQUÉE PAR LE SERVEUR (`sync-server/src/logique.ts`).
 * Si l'une des deux change sans l'autre, un appareil poussera indéfiniment une
 * ligne que le serveur refuse. */

export interface Arbitrable {
  updatedAt: string;
  blob: string;
}

/** Vrai si la ligne distante doit remplacer la locale.
 *
 *  Les horodatages sont des chaînes ISO 8601 en UTC : la comparaison
 *  lexicographique EST la comparaison chronologique, sans passer par `Date`.
 *
 *  À égalité d'horodatage, le blob départage. Ce n'est pas arbitraire : les
 *  deux appareils comparent les deux mêmes chaînes et retiennent la même. Sans
 *  ce départage, chacun garderait sa version et la divergence serait
 *  permanente. */
export function distanteGagne(locale: Arbitrable | undefined, distante: Arbitrable): boolean {
  if (!locale) return true;
  if (distante.updatedAt !== locale.updatedAt) return distante.updatedAt > locale.updatedAt;
  return distante.blob > locale.blob;
}
```

- [ ] **Étape 4 : lancer le test et vérifier qu'il passe**

Lancer : `npx vitest run tests/unit/sync/merge.test.ts`
Attendu : SUCCÈS, 6 tests.

- [ ] **Étape 5 : commiter**

```bash
git add lib/sync/merge.ts tests/unit/sync/merge.test.ts
git commit -m "feat(sync): l'arbitrage, pur et prouvé — l'ordre d'arrivée ne change rien"
```

---

## Tâche 4 : écriture brute, et l'effacement dur à corriger

**Fichiers :**
- Modifier : `lib/data/repositories/base.ts` (ajouter `putRaw`)
- Modifier : `lib/data/repositories/logs.ts` (ajouter `putRaw`)
- Modifier : les appelants de `logsRepo.clear()` (à identifier)
- Test : `tests/unit/data/repositories.test.ts` (ajouter un bloc)

**Interfaces :**
- Consomme : rien.
- Produit : `makeRepo(...).putRaw(row: T): Promise<void>` et
  `logsRepo.putRaw(entry: LogEntry): Promise<void>` — écrivent la ligne
  **telle quelle**, sans toucher `updatedAt`.

- [ ] **Étape 1 : trouver les appelants de l'effacement dur**

Lancer : `npx grep -rn "logsRepo.clear\|logs.clear(" lib components app`

Noter chaque appelant. Ils devront basculer sur `tombstone()` à l'étape 5 :
`clear()` supprime la ligne **sans laisser de trace**, donc l'appareil distant
la renverra au tour suivant et la valeur effacée réapparaîtra.

- [ ] **Étape 2 : écrire le test qui échoue**

```ts
// à ajouter dans tests/unit/data/repositories.test.ts
describe('putRaw — écriture d’une ligne reçue', () => {
  it('préserve updatedAt au lieu de le poser à maintenant', async () => {
    /* C'est TOUT l'enjeu de la synchronisation : `update()` horodate à
       maintenant, ce qui est juste pour une saisie humaine et faux pour une
       ligne qui arrive d'un autre appareil — elle gagnerait chaque arbitrage
       suivant, y compris contre des modifications plus récentes. */
    const ancien = '2020-01-01T00:00:00.000Z';
    await habitsRepo.putRaw({
      id: 'venue-d-ailleurs',
      name: 'Courir',
      type: 'check',
      createdAt: ancien,
      updatedAt: ancien,
    } as never);

    const relu = await habitsRepo.get('venue-d-ailleurs');
    expect(relu?.updatedAt).toBe(ancien);
  });

  it('écrase une ligne existante sans la fusionner', async () => {
    const cree = await habitsRepo.create({ name: 'Avant', type: 'check' } as never);
    await habitsRepo.putRaw({
      ...cree,
      name: 'Après',
      updatedAt: '2030-01-01T00:00:00.000Z',
    } as never);

    const relu = await habitsRepo.get(cree.id);
    expect(relu?.name).toBe('Après');
    expect(relu?.updatedAt).toBe('2030-01-01T00:00:00.000Z');
  });
});

describe('journal — l’effacement laisse une trace', () => {
  it('tombstone garde la ligne avec deletedAt', async () => {
    await logsRepo.setValue('h1', '2026-09-01' as never, 3);
    await logsRepo.tombstone('h1', '2026-09-01' as never);

    const toutes = await logsRepo.all();
    const ligne = toutes.find((l) => l.habitId === 'h1');
    expect(ligne).toBeDefined();
    expect(ligne?.deletedAt).toBeTruthy();
  });
});
```

- [ ] **Étape 3 : lancer le test et vérifier qu'il échoue**

Lancer : `npx vitest run tests/unit/data/repositories.test.ts`
Attendu : ÉCHEC — `habitsRepo.putRaw is not a function`.

- [ ] **Étape 4 : écrire l'implémentation minimale**

Dans `lib/data/repositories/base.ts`, à l'intérieur de l'objet rendu par
`makeRepo`, juste après `restore` :

```ts
    /** Écrit une ligne REÇUE D'UN AUTRE APPAREIL, telle quelle.
     *
     *  `create` et `update` posent `updatedAt` à maintenant — c'est juste pour
     *  une saisie humaine, et faux ici : une ligne réhorodatée à l'arrivée
     *  gagnerait tous les arbitrages suivants, y compris contre des
     *  modifications réellement plus récentes faites ailleurs. La ligne entre
     *  donc intacte, horodatage d'origine compris.
     *
     *  N'est appelée que par `lib/sync/entites.ts`. */
    async putRaw(row: T): Promise<void> {
      await table.put(row);
    },
```

Dans `lib/data/repositories/logs.ts`, dans l'objet `logsRepo` :

```ts
  /** Même rôle que `makeRepo().putRaw` — le journal n'y passe pas, sa clé est
   *  le couple [habitId+date]. */
  async putRaw(entry: LogEntry): Promise<void> {
    await db.logs.put(entry);
  },
```

- [ ] **Étape 5 : basculer les appelants de `clear()` sur `tombstone()`**

Pour chaque appelant relevé à l'étape 1, remplacer `logsRepo.clear(a, b)` par
`logsRepo.tombstone(a, b)`. **Ne pas supprimer `clear()`** : il reste légitime
pour une purge locale (réinitialisation de compte), où aucune convergence n'est
en jeu. Ajouter au-dessus de `clear()` :

```ts
  /* NE PAS UTILISER SUR UN CHEMIN SYNCHRONISÉ. L'effacement dur ne laisse
     aucune trace : l'appareil distant renverrait la valeur au tour suivant, et
     elle réapparaîtrait. Pour effacer une saisie, c'est `tombstone()`. */
```

- [ ] **Étape 6 : lancer les tests et vérifier qu'ils passent**

Lancer : `npx vitest run tests/unit/data`
Attendu : SUCCÈS, aucun test existant cassé.

- [ ] **Étape 7 : commiter**

```bash
git add lib/data/repositories/base.ts lib/data/repositories/logs.ts tests/unit/data/repositories.test.ts
git commit -m "feat(data): une ligne reçue garde son horodatage, et l'effacement laisse une trace"
```

---

## Tâche 5 : la carte des entités

**Fichiers :**
- Créer : `lib/sync/entites.ts`
- Test : `tests/unit/sync/entites.test.ts`

**Interfaces :**
- Consomme : `SYNC_KINDS`, `SyncKind` (tâche 2) ; `putRaw` (tâche 4) ;
  les dépôts de `lib/data`.
- Produit :
  - `interface LigneLocale { kind: SyncKind; id: string; updatedAt: string; valeur: unknown }`
  - `CLES_META_SYNCHRONISEES: readonly string[]` — `['settings', 'occ']`
  - `lireDepuis(filigrane: string): Promise<LigneLocale[]>`
  - `ecrire(kind: SyncKind, id: string, valeur: unknown): Promise<void>`
  - `lireUne(kind: SyncKind, id: string): Promise<LigneLocale | undefined>`

- [ ] **Étape 1 : écrire le test qui échoue**

```ts
// tests/unit/sync/entites.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { habitsRepo, logsRepo, metaRepo } from '@/lib/data';
import { CLES_META_SYNCHRONISEES, ecrire, lireDepuis, lireUne } from '@/lib/sync/entites';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

const EPOQUE = '1970-01-01T00:00:00.000Z';

describe('lecture depuis un filigrane', () => {
  it('remonte une habitude créée', async () => {
    const h = await habitsRepo.create({ name: 'Courir', type: 'check' } as never);
    const lignes = await lireDepuis(EPOQUE);
    expect(lignes.some((l) => l.kind === 'habits' && l.id === h.id)).toBe(true);
  });

  it('remonte une entrée de journal sous la clé habitId|date', async () => {
    await logsRepo.setValue('h1', '2026-09-01' as never, 3);
    const lignes = await lireDepuis(EPOQUE);
    expect(lignes.some((l) => l.kind === 'logs' && l.id === 'h1|2026-09-01')).toBe(true);
  });

  it('ignore ce qui est antérieur au filigrane', async () => {
    await habitsRepo.create({ name: 'Ancienne', type: 'check' } as never);
    const lignes = await lireDepuis('2999-01-01T00:00:00.000Z');
    expect(lignes).toHaveLength(0);
  });

  it('remonte les suppressions logiques', async () => {
    /* Une entité effacée DOIT voyager : c'est ainsi que l'autre appareil
       apprend l'effacement. Ne pas la remonter, c'est la ressusciter. */
    const h = await habitsRepo.create({ name: 'À jeter', type: 'check' } as never);
    await habitsRepo.softDelete(h.id);
    const lignes = await lireDepuis(EPOQUE);
    expect(lignes.some((l) => l.kind === 'habits' && l.id === h.id)).toBe(true);
  });

  it('ne remonte que les deux clés meta retenues', async () => {
    await metaRepo.set('settings', { theme: 'neural' });
    await metaRepo.set('timer', { startedAt: 1 });
    await metaRepo.set('errors', [{ at: 'x' }]);

    const meta = (await lireDepuis(EPOQUE)).filter((l) => l.kind === 'meta');
    expect(meta.map((l) => l.id).sort()).toEqual(['settings']);
    expect(CLES_META_SYNCHRONISEES).toEqual(['settings', 'occ']);
  });
});

describe('écriture', () => {
  it('écrit une habitude reçue en gardant son horodatage', async () => {
    const ancien = '2020-01-01T00:00:00.000Z';
    await ecrire('habits', 'venue', {
      id: 'venue',
      name: 'Reçue',
      type: 'check',
      createdAt: ancien,
      updatedAt: ancien,
    });

    const relu = await lireUne('habits', 'venue');
    expect(relu?.updatedAt).toBe(ancien);
  });

  it('écrit une entrée de journal reçue', async () => {
    await ecrire('logs', 'h9|2026-09-02', {
      habitId: 'h9',
      date: '2026-09-02',
      value: 7,
      updatedAt: '2026-09-02T08:00:00.000Z',
    });

    expect((await logsRepo.get('h9', '2026-09-02' as never))?.value).toBe(7);
  });

  it('fait un aller-retour lecture → écriture sans rien perdre', async () => {
    const h = await habitsRepo.create({ name: 'Aller-retour', type: 'count' } as never);
    const ligne = await lireUne('habits', h.id);
    await ecrire('habits', h.id, ligne!.valeur);
    expect((await lireUne('habits', h.id))?.valeur).toEqual(ligne!.valeur);
  });
});
```

- [ ] **Étape 2 : lancer le test et vérifier qu'il échoue**

Lancer : `npx vitest run tests/unit/sync/entites.test.ts`
Attendu : ÉCHEC — `Cannot find module '@/lib/sync/entites'`.

- [ ] **Étape 3 : écrire l'implémentation minimale**

```ts
// lib/sync/entites.ts
import { db } from '@/lib/data/db';
import { logsRepo } from '@/lib/data';
import type { LogEntry } from '@/lib/domain';
import { SYNC_KINDS, type SyncKind } from './types';

/* LA SEULE PARTIE DE `lib/sync/` QUI CONNAÎT DEXIE.
 *
 * Tout le reste du module est pur ou parle HTTP. Ici on traduit : une table
 * Dexie devient des lignes synchronisables, et inversement.
 *
 * CE QUI NE SE SYNCHRONISE PAS, et pourquoi :
 *   `timer`         un minuteur en cours n'a de sens que sur l'appareil qui le
 *                   fait tourner ; le recevoir ferait démarrer un chrono ailleurs
 *   `logSnapshot`   cache reconstructible — le transporter, c'est transporter
 *                   une copie périmée de ce qu'on transporte déjà
 *   `errors`        journal LOCAL (décision E) ; il décrit CET appareil
 *   `seeded`        drapeau d'amorçage, propre à l'installation
 *   `activeProfile` quel profil on REGARDE ; chacun son écran
 *   `lastExport` / `nagDismissed`  le rappel de sauvegarde est par appareil */

/** Les deux seules clés de `meta` qui voyagent. */
export const CLES_META_SYNCHRONISEES = ['settings', 'occ'] as const;

export interface LigneLocale {
  kind: SyncKind;
  id: string;
  updatedAt: string;
  valeur: unknown;
}

/** Le journal n'a pas d'identifiant propre : sa clé est le couple
 *  [habitId+date]. La barre verticale est sûre — ni un identifiant ni une date
 *  n'en contiennent. */
const cleJournal = (e: LogEntry): string => `${e.habitId}|${e.date}`;

const TABLES = SYNC_KINDS.filter((k) => k !== 'meta' && k !== 'logs');

export async function lireDepuis(filigrane: string): Promise<LigneLocale[]> {
  const lignes: LigneLocale[] = [];

  /* Toutes les tables indexent `updatedAt` (lib/data/db.ts) : la requête de
     plage évite un balayage complet, quelle que soit la taille de la base. */
  for (const kind of TABLES) {
    const rows = await db
      .table(kind)
      .where('updatedAt')
      .aboveOrEqual(filigrane)
      .toArray();
    for (const r of rows) {
      lignes.push({ kind, id: String(r.id), updatedAt: String(r.updatedAt), valeur: r });
    }
  }

  for (const e of await logsRepo.since(filigrane)) {
    lignes.push({ kind: 'logs', id: cleJournal(e), updatedAt: e.updatedAt, valeur: e });
  }

  for (const cle of CLES_META_SYNCHRONISEES) {
    const row = await db.meta.get(cle);
    if (row && row.updatedAt >= filigrane) {
      lignes.push({ kind: 'meta', id: cle, updatedAt: row.updatedAt, valeur: row.value });
    }
  }

  return lignes;
}

export async function lireUne(kind: SyncKind, id: string): Promise<LigneLocale | undefined> {
  if (kind === 'meta') {
    const row = await db.meta.get(id);
    return row ? { kind, id, updatedAt: row.updatedAt, valeur: row.value } : undefined;
  }
  if (kind === 'logs') {
    const [habitId, date] = id.split('|');
    const e = await db.logs.get([habitId!, date!]);
    return e ? { kind, id, updatedAt: e.updatedAt, valeur: e } : undefined;
  }
  const row = await db.table(kind).get(id);
  return row ? { kind, id, updatedAt: String(row.updatedAt), valeur: row } : undefined;
}

export async function ecrire(kind: SyncKind, id: string, valeur: unknown): Promise<void> {
  if (kind === 'meta') {
    const ligne = valeur as { updatedAt?: string };
    /* `metaRepo.set` horodate à maintenant ; ici la ligne garde le sien. */
    await db.meta.put({
      key: id,
      value: valeur,
      updatedAt: ligne?.updatedAt ?? new Date().toISOString(),
    });
    return;
  }
  if (kind === 'logs') {
    await logsRepo.putRaw(valeur as LogEntry);
    return;
  }
  await db.table(kind).put(valeur);
}
```

> **Note pour l'exécutant :** `ecrire('meta', …)` reçoit la **valeur** de la
> clé, pas la ligne `meta`. L'horodatage voyage séparément dans `SyncRow`. Si
> le test de l'aller-retour meta échoue, c'est là qu'il faut regarder : passer
> `updatedAt` en paramètre explicite plutôt que le déduire de la valeur.

- [ ] **Étape 4 : lancer le test et vérifier qu'il passe**

Lancer : `npx vitest run tests/unit/sync/entites.test.ts`
Attendu : SUCCÈS, 8 tests.

- [ ] **Étape 5 : commiter**

```bash
git add lib/sync/entites.ts tests/unit/sync/entites.test.ts
git commit -m "feat(sync): la carte des entités — ce qui voyage, et ce qui reste sur l'appareil"
```

---

## Tâche 6 : le serveur

**Fichiers :**
- Créer : `sync-server/src/logique.ts`, `sync-server/src/index.ts`,
  `sync-server/schema.sql`, `sync-server/wrangler.toml`, `sync-server/README.md`
- Modifier : `tsconfig.json` (exclure `sync-server`), `.gitignore`
- Test : `tests/unit/sync/serveur.test.ts`

**Interfaces :**
- Consomme : `SyncRow` (tâche 2), `distanteGagne` (tâche 3).
- Produit : `accepterLigne(stockee, entrante): boolean` — **la même règle que
  `distanteGagne`**, réexportée pour que le serveur ne la réinvente pas.

- [ ] **Étape 1 : écrire le test qui échoue**

```ts
// tests/unit/sync/serveur.test.ts
import { describe, expect, it } from 'vitest';
import { accepterLigne } from '../../../sync-server/src/logique';

const l = (updatedAt: string, blob = 'AAA') => ({ updatedAt, blob });

describe('arbitrage serveur', () => {
  it('accepte une ligne inconnue', () => {
    expect(accepterLigne(undefined, l('2026-09-01T10:00:00.000Z'))).toBe(true);
  });

  it('refuse une ligne périmée', () => {
    /* Sans ce refus, un appareil resté hors ligne une semaine écraserait au
       retour tout ce qui a été fait entre-temps. */
    expect(accepterLigne(l('2026-09-08T00:00:00.000Z'), l('2026-09-01T00:00:00.000Z'))).toBe(false);
  });

  it('applique exactement la même règle que le client', async () => {
    /* Si les deux règles divergent, un appareil pousse en boucle une ligne que
       le serveur refuse, sans que rien ne le signale. */
    const { distanteGagne } = await import('@/lib/sync/merge');
    const cas = [
      [undefined, l('2026-01-01T00:00:00.000Z')],
      [l('2026-01-01T00:00:00.000Z'), l('2026-01-02T00:00:00.000Z')],
      [l('2026-01-02T00:00:00.000Z'), l('2026-01-01T00:00:00.000Z')],
      [l('2026-01-01T00:00:00.000Z', 'A'), l('2026-01-01T00:00:00.000Z', 'Z')],
      [l('2026-01-01T00:00:00.000Z', 'Z'), l('2026-01-01T00:00:00.000Z', 'A')],
    ] as const;

    for (const [stockee, entrante] of cas) {
      expect(accepterLigne(stockee, entrante)).toBe(distanteGagne(stockee, entrante));
    }
  });
});
```

- [ ] **Étape 2 : lancer le test et vérifier qu'il échoue**

Lancer : `npx vitest run tests/unit/sync/serveur.test.ts`
Attendu : ÉCHEC — fichier `sync-server/src/logique` introuvable.

- [ ] **Étape 3 : écrire le serveur**

```ts
// sync-server/src/logique.ts
/* La règle d'arbitrage du serveur.
 *
 * Elle est IDENTIQUE à celle du client (`lib/sync/merge.ts`), et un test le
 * vérifie cas par cas. Le serveur ne fait pas confiance aux clients : sans ce
 * filtre, un appareil resté hors ligne une semaine écraserait au retour tout
 * ce qui a été fait entre-temps.
 *
 * Le serveur ne peut PAS lire les blobs. Il n'arbitre que sur des
 * horodatages qu'il ne comprend pas et une chaîne opaque. */

export interface Arbitrable {
  updatedAt: string;
  blob: string;
}

export function accepterLigne(stockee: Arbitrable | undefined, entrante: Arbitrable): boolean {
  if (!stockee) return true;
  if (entrante.updatedAt !== stockee.updatedAt) return entrante.updatedAt > stockee.updatedAt;
  return entrante.blob > stockee.blob;
}
```

```sql
-- sync-server/schema.sql
-- Une seule table. Le serveur ne sait rien du produit : ni utilisateurs, ni
-- habitudes, ni dates. Des octets, un horodatage qu'il compare sans le
-- comprendre, et un compteur.
CREATE TABLE IF NOT EXISTS lignes (
  espace     TEXT NOT NULL,
  kind       TEXT NOT NULL,
  id         TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  seq        INTEGER NOT NULL,
  blob       TEXT NOT NULL,
  PRIMARY KEY (espace, kind, id)
);

-- La seule requête chaude : « ce qui a changé depuis mon curseur ».
CREATE INDEX IF NOT EXISTS idx_lignes_curseur ON lignes (espace, seq);

-- Compteur monotone par espace. Le curseur de lecture NE PEUT PAS être une
-- date : deux appareils aux horloges décalées rateraient des lignes.
CREATE TABLE IF NOT EXISTS compteurs (
  espace TEXT PRIMARY KEY,
  seq    INTEGER NOT NULL DEFAULT 0
);
```

```ts
// sync-server/src/index.ts
import { accepterLigne } from './logique';

/* Le Worker. Deux routes, aucune notion de compte.
 *
 * L'AUTHENTIFICATION EST LE PORTEUR DE L'ESPACE : 32 caractères dérivés d'un
 * code de 100 bits. Qui le connaît lit et écrit des octets chiffrés qu'il ne
 * peut de toute façon pas déchiffrer sans la clé — laquelle ne sort jamais de
 * l'appareil. Il n'y a rien d'autre à protéger.
 *
 * AUCUN JOURNAL : ni adresse IP, ni horodatage de requête. Un serveur qui ne
 * peut pas lire les données mais garde qui se connecte quand n'est pas aveugle. */

interface Env {
  DB: D1Database;
}

const ESPACE = /^[0-9A-HJKMNP-TV-Z]{32}$/;
const MAX_LIGNES = 500;

const json = (corps: unknown, statut = 200): Response =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: {
      'content-type': 'application/json',
      /* L'application est servie depuis une AUTRE origine (Vercel, ou
         `https://localhost` dans l'APK) : sans CORS, le navigateur bloque
         tout. `*` est acceptable ici — l'espace est le secret, pas l'origine. */
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
    },
  });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return json({});

    const url = new URL(req.url);
    const espace = url.pathname.split('/')[2] ?? '';
    if (!ESPACE.test(espace)) return json({ erreur: 'espace' }, 400);

    if (req.method === 'GET') {
      const depuis = Number(url.searchParams.get('depuis') ?? 0) || 0;
      const { results } = await env.DB.prepare(
        'SELECT kind, id, updated_at, seq, blob FROM lignes WHERE espace = ? AND seq > ? ORDER BY seq LIMIT ?',
      )
        .bind(espace, depuis, MAX_LIGNES)
        .all<{ kind: string; id: string; updated_at: string; seq: number; blob: string }>();

      /* Le curseur rendu est le `seq` de la DERNIÈRE ligne servie, pas le
         compteur de l'espace : avec la limite, il reste peut-être des lignes,
         et le client doit revenir les chercher. */
      const seq = results.length ? results[results.length - 1]!.seq : depuis;
      return json({
        seq,
        lignes: results.map((r) => ({
          kind: r.kind,
          id: r.id,
          updatedAt: r.updated_at,
          blob: r.blob,
        })),
      });
    }

    if (req.method === 'POST') {
      const corps = (await req.json()) as { lignes?: unknown };
      const lignes = Array.isArray(corps.lignes) ? corps.lignes : [];
      if (lignes.length > MAX_LIGNES) return json({ erreur: 'trop de lignes' }, 413);

      let seq =
        (
          await env.DB.prepare('SELECT seq FROM compteurs WHERE espace = ?')
            .bind(espace)
            .first<{ seq: number }>()
        )?.seq ?? 0;

      for (const brute of lignes as { kind: string; id: string; updatedAt: string; blob: string }[]) {
        if (typeof brute?.blob !== 'string' || typeof brute?.updatedAt !== 'string') continue;

        const stockee = await env.DB.prepare(
          'SELECT updated_at AS updatedAt, blob FROM lignes WHERE espace = ? AND kind = ? AND id = ?',
        )
          .bind(espace, brute.kind, brute.id)
          .first<{ updatedAt: string; blob: string }>();

        if (!accepterLigne(stockee ?? undefined, brute)) continue;

        seq += 1;
        await env.DB.prepare(
          `INSERT INTO lignes (espace, kind, id, updated_at, seq, blob)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (espace, kind, id)
           DO UPDATE SET updated_at = excluded.updated_at, seq = excluded.seq, blob = excluded.blob`,
        )
          .bind(espace, brute.kind, brute.id, brute.updatedAt, seq, brute.blob)
          .run();
      }

      await env.DB.prepare(
        'INSERT INTO compteurs (espace, seq) VALUES (?, ?) ON CONFLICT (espace) DO UPDATE SET seq = excluded.seq',
      )
        .bind(espace, seq)
        .run();

      return json({ seq });
    }

    return json({ erreur: 'méthode' }, 405);
  },
};
```

```toml
# sync-server/wrangler.toml
name = "habitum-sync"
main = "src/index.ts"
compatibility_date = "2026-01-01"

[[d1_databases]]
binding = "DB"
database_name = "habitum-sync"
# `wrangler d1 create habitum-sync` rend cet identifiant — le coller ici.
database_id = ""

# Le palier gratuit suffit très largement : 100 000 requêtes par jour, quand un
# appareil en fait quelques dizaines.
```

- [ ] **Étape 4 : sortir le serveur du build de l'application**

Dans `tsconfig.json`, ajouter `"sync-server"` au tableau `exclude`.
Vérifier que `eslint.config.mjs` l'ignore aussi (sinon l'ajouter à `ignores`).

Le Worker ne doit entrer **ni** dans le bundle web, **ni** dans l'APK : il vit
dans le dépôt pour être versionné avec le client qui lui parle, rien de plus.

- [ ] **Étape 5 : écrire le mode d'emploi de déploiement**

```markdown
<!-- sync-server/README.md -->
# Serveur de synchronisation

Un Worker Cloudflare qui ne peut pas lire ce qu'il stocke.

## Déployer

1. `npm install -g wrangler` puis `wrangler login`
2. `wrangler d1 create habitum-sync` → coller l'identifiant dans `wrangler.toml`
3. `wrangler d1 execute habitum-sync --remote --file=schema.sql`
4. `wrangler deploy`
5. Reporter l'URL rendue dans `.env.local` de l'application :
   `NEXT_PUBLIC_SYNC_URL=https://habitum-sync.<compte>.workers.dev`

## Ce qu'il ne fait pas

Il ne journalise rien — ni adresse IP, ni horodatage de requête. Il ne sait pas
combien d'utilisateurs existent : un espace est 32 caractères opaques.
```

- [ ] **Étape 6 : lancer le test et vérifier qu'il passe**

Lancer : `npx vitest run tests/unit/sync/serveur.test.ts`
Attendu : SUCCÈS, 3 tests.

- [ ] **Étape 7 : commiter**

```bash
git add sync-server tsconfig.json tests/unit/sync/serveur.test.ts
git commit -m "feat(sync): un serveur qui arbitre sans comprendre, et ne journalise rien"
```

---

## Tâche 7 : le transport

**Fichiers :**
- Créer : `lib/sync/transport.ts`
- Test : `tests/unit/sync/transport.test.ts`

**Interfaces :**
- Consomme : `SyncRow`, `SyncErreur` (tâche 2).
- Produit :
  - `interface Reponse { seq: number; lignes: SyncRow[] }`
  - `interface Transport { tirer(espace: string, depuis: number): Promise<Reponse>; pousser(espace: string, lignes: SyncRow[]): Promise<{ seq: number }> }`
  - `transportHttp(base: string): Transport`

`Transport` est une **interface** : c'est ce qui permet aux tests de la tâche 8
de faire tourner deux appareils contre un serveur en mémoire, sans réseau.

- [ ] **Étape 1 : écrire le test qui échoue**

```ts
// tests/unit/sync/transport.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SyncErreur } from '@/lib/sync/types';
import { transportHttp } from '@/lib/sync/transport';

const ESPACE = 'K7M29QPX3RTZ8HNV4WBDK7M29QPX3RTZ';

afterEach(() => vi.unstubAllGlobals());

describe('transport HTTP', () => {
  it('appelle la bonne URL en lecture', async () => {
    const appel = vi.fn(async () => new Response(JSON.stringify({ seq: 7, lignes: [] })));
    vi.stubGlobal('fetch', appel);

    const r = await transportHttp('https://s.example').tirer(ESPACE, 3);

    expect(appel.mock.calls[0]?.[0]).toBe(`https://s.example/v1/${ESPACE}?depuis=3`);
    expect(r.seq).toBe(7);
  });

  it('transforme une panne réseau en SyncErreur « reseau »', async () => {
    /* La distinction compte : « pas de réseau » se réessaie tout seul,
       « mauvais code » demande une action de l'utilisateur. Les confondre,
       c'est faire retaper son code à quelqu'un dont le Wi-Fi a coupé. */
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });

    await expect(transportHttp('https://s.example').tirer(ESPACE, 0)).rejects.toMatchObject({
      genre: 'reseau',
    });
  });

  it('transforme un 500 en SyncErreur « serveur »', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 500 }));
    await expect(transportHttp('https://s.example').tirer(ESPACE, 0)).rejects.toMatchObject({
      genre: 'serveur',
    });
  });

  it('transforme un 429 en SyncErreur « limite »', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 429 }));
    await expect(transportHttp('https://s.example').tirer(ESPACE, 0)).rejects.toBeInstanceOf(
      SyncErreur,
    );
  });

  it('envoie les lignes en POST', async () => {
    const appel = vi.fn(async () => new Response(JSON.stringify({ seq: 9 })));
    vi.stubGlobal('fetch', appel);

    const ligne = { kind: 'habits' as const, id: 'h1', updatedAt: 'x', blob: 'b' };
    const r = await transportHttp('https://s.example/').pousser(ESPACE, [ligne]);

    const init = appel.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ lignes: [ligne] });
    expect(r.seq).toBe(9);
  });
});
```

- [ ] **Étape 2 : lancer le test et vérifier qu'il échoue**

Lancer : `npx vitest run tests/unit/sync/transport.test.ts`
Attendu : ÉCHEC — `Cannot find module '@/lib/sync/transport'`.

- [ ] **Étape 3 : écrire l'implémentation minimale**

```ts
// lib/sync/transport.ts
import { SyncErreur, type SyncRow } from './types';

/* Les deux seuls appels réseau de toute l'application.
 *
 * `Transport` est une INTERFACE, et c'est ce qui rend le moteur testable : les
 * tests font tourner deux appareils contre un serveur en mémoire, sans monter
 * ni Worker ni base. */

export interface Reponse {
  seq: number;
  lignes: SyncRow[];
}

export interface Transport {
  tirer(espace: string, depuis: number): Promise<Reponse>;
  pousser(espace: string, lignes: SyncRow[]): Promise<{ seq: number }>;
}

async function appeler<T>(url: string, init?: RequestInit): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(url, init);
  } catch (cause) {
    /* `fetch` ne rejette QUE sur une panne de transport : DNS, coupure, CORS.
       Un 500 est une réponse, pas un rejet — d'où les deux branches. */
    throw new SyncErreur('reseau', String(cause));
  }

  if (reponse.status === 429) throw new SyncErreur('limite', 'trop de requêtes');
  if (!reponse.ok) throw new SyncErreur('serveur', `HTTP ${reponse.status}`);

  return (await reponse.json()) as T;
}

export function transportHttp(base: string): Transport {
  const racine = base.replace(/\/+$/, '');

  return {
    tirer: (espace, depuis) => appeler<Reponse>(`${racine}/v1/${espace}?depuis=${depuis}`),
    pousser: (espace, lignes) =>
      appeler<{ seq: number }>(`${racine}/v1/${espace}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lignes }),
      }),
  };
}
```

- [ ] **Étape 4 : lancer le test et vérifier qu'il passe**

Lancer : `npx vitest run tests/unit/sync/transport.test.ts`
Attendu : SUCCÈS, 5 tests.

- [ ] **Étape 5 : commiter**

```bash
git add lib/sync/transport.ts tests/unit/sync/transport.test.ts
git commit -m "feat(sync): le transport, et la différence entre « pas de réseau » et « mauvais code »"
```

---

## Tâche 8 : le moteur

**Fichiers :**
- Créer : `lib/sync/engine.ts`, `lib/sync/index.ts`
- Modifier : `lib/data/seed.ts` (ajouter les clés `meta`)
- Test : `tests/unit/sync/engine.test.ts`

**Interfaces :**
- Consomme : tout ce qui précède.
- Produit :
  - `META_KEYS.syncCode`, `.syncCursor`, `.syncWatermark`, `.syncLastAt` (dans `lib/data/seed.ts`)
  - `interface Deps { transport: Transport; cles: Cles }`
  - `synchroniser(deps: Deps): Promise<{ recus: number; envoyes: number }>`
  - `transportMemoire(): Transport` — exporté depuis `engine.ts` **pour les
    tests uniquement**, un serveur en mémoire qui applique la même règle.

- [ ] **Étape 1 : ajouter les clés meta**

Dans `lib/data/seed.ts`, à la fin de l'objet `META_KEYS` :

```ts
  /** Code d'appairage. Il vit là où vivent les données qu'il protège : sur
   *  l'appareil, et nulle part ailleurs. Absent = synchronisation inactive,
   *  et alors AUCUNE requête ne sort. */
  syncCode: 'syncCode',
  /** Dernier `seq` reçu du serveur. Un NOMBRE, pas une date : les horloges
   *  de deux appareils ne sont pas comparables. */
  syncCursor: 'syncCursor',
  /** Horodatage de la dernière poussée réussie — filigrane de lecture locale. */
  syncWatermark: 'syncWatermark',
  /** Dernière synchronisation réussie, pour l'affichage. */
  syncLastAt: 'syncLastAt',
```

- [ ] **Étape 2 : écrire le test qui échoue**

```ts
// tests/unit/sync/engine.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { META_KEYS, habitsRepo, metaRepo } from '@/lib/data';
import { deriverCles } from '@/lib/sync/crypto';
import { synchroniser, transportMemoire } from '@/lib/sync/engine';
import type { Transport } from '@/lib/sync/transport';
import type { Cles } from '@/lib/sync/crypto';

const CODE = 'K7M29QPX3RTZ8HNV4WBD';
let cles: Cles;
let transport: Transport;

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

/* Une seule dérivation pour tout le fichier : PBKDF2 à 600 000 itérations
   coûte ~0,3 s, et la répéter à chaque test ferait un fichier de trois minutes. */
async function preparer() {
  cles ??= await deriverCles(CODE);
  transport = transportMemoire();
  await metaRepo.set(META_KEYS.syncCode, CODE);
}

describe('un aller-retour', () => {
  it('envoie ce qui est local et n’en reçoit rien de plus', async () => {
    await preparer();
    await habitsRepo.create({ name: 'Courir', type: 'check' } as never);

    const r = await synchroniser({ transport, cles });

    expect(r.envoyes).toBeGreaterThanOrEqual(1);
    expect(r.recus).toBe(0);
  });

  it('n’envoie plus rien au second passage', async () => {
    /* Le filigrane fait tout le travail : sans lui, chaque synchronisation
       repousserait la base entière, et le palier gratuit fondrait. */
    await preparer();
    await habitsRepo.create({ name: 'Courir', type: 'check' } as never);

    await synchroniser({ transport, cles });
    const second = await synchroniser({ transport, cles });

    expect(second.envoyes).toBe(0);
  });

  it('avance le curseur et note l’heure du succès', async () => {
    await preparer();
    await habitsRepo.create({ name: 'Courir', type: 'check' } as never);
    await synchroniser({ transport, cles });

    expect(await metaRepo.get<number>(META_KEYS.syncCursor)).toBeGreaterThan(0);
    expect(await metaRepo.get<string>(META_KEYS.syncLastAt)).toBeTruthy();
  });
});

describe('deux appareils', () => {
  /* Un seul transport en mémoire, deux bases successives : c'est la façon la
     plus fidèle de simuler deux appareils sans monter deux IndexedDB. */
  it('fait apparaître sur B ce qui a été créé sur A', async () => {
    await preparer();
    const partage = transport;

    await habitsRepo.create({ name: 'Créée sur A', type: 'check' } as never);
    await synchroniser({ transport: partage, cles });

    /* Appareil B : base vierge, même code. */
    db.close();
    await db.delete();
    await db.open();
    await metaRepo.set(META_KEYS.syncCode, CODE);

    const r = await synchroniser({ transport: partage, cles });

    expect(r.recus).toBeGreaterThanOrEqual(1);
    const noms = (await habitsRepo.list()).map((h) => h.name);
    expect(noms).toContain('Créée sur A');
  });

  it('fait disparaître sur B ce qui a été supprimé sur A', async () => {
    await preparer();
    const partage = transport;

    const h = await habitsRepo.create({ name: 'À jeter', type: 'check' } as never);
    await synchroniser({ transport: partage, cles });
    await habitsRepo.softDelete(h.id);
    await synchroniser({ transport: partage, cles });

    db.close();
    await db.delete();
    await db.open();
    await metaRepo.set(META_KEYS.syncCode, CODE);
    await synchroniser({ transport: partage, cles });

    expect((await habitsRepo.list()).map((x) => x.id)).not.toContain(h.id);
  });

  it('ne ressuscite pas une suppression avec une version périmée', async () => {
    await preparer();
    const partage = transport;

    const h = await habitsRepo.create({ name: 'Fantôme', type: 'check' } as never);
    await synchroniser({ transport: partage, cles });
    await habitsRepo.softDelete(h.id);
    await synchroniser({ transport: partage, cles });

    /* Appareil B, resté en arrière : il repousse la version d'AVANT. */
    db.close();
    await db.delete();
    await db.open();
    await metaRepo.set(META_KEYS.syncCode, CODE);
    await habitsRepo.putRaw({
      id: h.id,
      name: 'Fantôme',
      type: 'check',
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
    } as never);
    await synchroniser({ transport: partage, cles });

    expect((await habitsRepo.get(h.id))?.deletedAt).toBeTruthy();
  });
}, 30_000);

describe('inactif', () => {
  it('ne touche à rien sans code', async () => {
    cles ??= await deriverCles(CODE);
    const t = transportMemoire();
    let appels = 0;
    const compte: Transport = {
      tirer: (...a) => {
        appels += 1;
        return t.tirer(...a);
      },
      pousser: (...a) => {
        appels += 1;
        return t.pousser(...a);
      },
    };

    await habitsRepo.create({ name: 'Seule', type: 'check' } as never);
    await synchroniser({ transport: compte, cles });

    expect(appels).toBe(0);
  }, 30_000);
});
```

- [ ] **Étape 3 : lancer le test et vérifier qu'il échoue**

Lancer : `npx vitest run tests/unit/sync/engine.test.ts`
Attendu : ÉCHEC — `Cannot find module '@/lib/sync/engine'`.

- [ ] **Étape 4 : écrire l'implémentation minimale**

```ts
// lib/sync/engine.ts
import { META_KEYS, metaRepo } from '@/lib/data';
import { chiffrer, dechiffrer, type Cles } from './crypto';
import { ecrire, lireDepuis, lireUne } from './entites';
import { distanteGagne } from './merge';
import type { Transport } from './transport';
import { SyncErreur, type SyncRow } from './types';

/* L'ORCHESTRATION, ET RIEN D'AUTRE. Toute la logique subtile est ailleurs :
   l'arbitrage dans `merge.ts` (pur), la traduction Dexie dans `entites.ts`, le
   réseau dans `transport.ts`. Ce fichier ne fait que l'enchaînement, et c'est
   pour cela qu'il tient en une page. */

const EPOQUE = '1970-01-01T00:00:00.000Z';

export interface Deps {
  transport: Transport;
  cles: Cles;
}

export interface Bilan {
  recus: number;
  envoyes: number;
}

/** Un aller-retour complet. Sans code d'appairage, ne fait RIEN et n'émet
 *  aucune requête — c'est ce qui garde la promesse intacte pour qui n'active
 *  pas la fonctionnalité. */
export async function synchroniser({ transport, cles }: Deps): Promise<Bilan> {
  const code = await metaRepo.get<string>(META_KEYS.syncCode);
  if (!code) return { recus: 0, envoyes: 0 };

  const { espace, cle } = cles;
  const curseur = (await metaRepo.get<number>(META_KEYS.syncCursor)) ?? 0;

  /* 1. TIRER. */
  const { seq, lignes } = await transport.tirer(espace, curseur);

  /* 2 & 3. ARBITRER puis ÉCRIRE. Les identifiants appliqués sont retenus : ils
     viennent d'arriver avec un `updatedAt` postérieur au filigrane, et seraient
     donc renvoyés au serveur au même tour — un aller-retour pour rien. */
  const appliques = new Set<string>();
  let recus = 0;

  for (const distante of lignes) {
    const locale = await lireUne(distante.kind, distante.id);
    const localeArbitrable = locale
      ? { updatedAt: locale.updatedAt, blob: await chiffrer(cle, locale.valeur) }
      : undefined;

    /* Attention : rechiffrer la locale donne un blob DIFFÉRENT à chaque appel
       (vecteur aléatoire). Le départage par blob n'est donc fiable qu'à
       horodatage égal ET contenu identique — cas où l'écriture est de toute
       façon sans effet. */
    if (locale && distante.updatedAt === locale.updatedAt) continue;
    if (!distanteGagne(localeArbitrable, distante)) continue;

    try {
      await ecrire(distante.kind, distante.id, await dechiffrer(cle, distante.blob));
      appliques.add(`${distante.kind}|${distante.id}`);
      recus += 1;
    } catch (e) {
      /* Un blob illisible signifie un code différent : inutile d'insister,
         mais inutile aussi de perdre les autres lignes. */
      if (!(e instanceof SyncErreur)) throw e;
    }
  }

  /* 4. POUSSER ce qui a bougé localement depuis le filigrane. */
  const filigrane = (await metaRepo.get<string>(META_KEYS.syncWatermark)) ?? EPOQUE;
  const locales = (await lireDepuis(filigrane)).filter(
    (l) => !appliques.has(`${l.kind}|${l.id}`),
  );

  const aEnvoyer: SyncRow[] = [];
  for (const l of locales) {
    aEnvoyer.push({
      kind: l.kind,
      id: l.id,
      updatedAt: l.updatedAt,
      blob: await chiffrer(cle, l.valeur),
    });
  }

  const apres = aEnvoyer.length ? await transport.pousser(espace, aEnvoyer) : { seq };

  /* 5. MÉMORISER. Le filigrane est posé à MAINTENANT et non au plus grand
     `updatedAt` envoyé : une écriture faite pendant l'aller-retour porterait un
     horodatage antérieur et serait sautée pour toujours. */
  await metaRepo.set(META_KEYS.syncCursor, Math.max(seq, apres.seq));
  await metaRepo.set(META_KEYS.syncWatermark, new Date().toISOString());
  await metaRepo.set(META_KEYS.syncLastAt, new Date().toISOString());

  return { recus, envoyes: aEnvoyer.length };
}

/** Serveur en mémoire — POUR LES TESTS. Applique la même règle que le vrai.
 *  Il vit ici plutôt que dans les tests parce que deux fichiers de test au
 *  moins en ont besoin, et qu'une divergence entre deux copies passerait
 *  inaperçue. */
export function transportMemoire(): Transport {
  const lignes = new Map<string, SyncRow & { seq: number }>();
  let compteur = 0;

  return {
    async tirer(_espace, depuis) {
      const sorties = [...lignes.values()]
        .filter((l) => l.seq > depuis)
        .sort((a, b) => a.seq - b.seq);
      return {
        seq: sorties.length ? sorties[sorties.length - 1]!.seq : depuis,
        lignes: sorties.map(({ seq: _s, ...r }) => r),
      };
    },
    async pousser(_espace, entrantes) {
      for (const e of entrantes) {
        const cle = `${e.kind}|${e.id}`;
        const stockee = lignes.get(cle);
        if (!distanteGagne(stockee, e)) continue;
        compteur += 1;
        lignes.set(cle, { ...e, seq: compteur });
      }
      return { seq: compteur };
    },
  };
}
```

```ts
// lib/sync/index.ts
export * from './code';
export * from './crypto';
export * from './engine';
export * from './entites';
export * from './merge';
export * from './transport';
export * from './types';
```

- [ ] **Étape 5 : lancer le test et vérifier qu'il passe**

Lancer : `npx vitest run tests/unit/sync/engine.test.ts`
Attendu : SUCCÈS, 7 tests.

Si « fait apparaître sur B » échoue avec `recus: 0`, vérifier le filtre
`if (locale && distante.updatedAt === locale.updatedAt) continue;` — sur une
base vierge, `locale` est `undefined` et la ligne doit passer.

- [ ] **Étape 6 : commiter**

```bash
git add lib/sync/engine.ts lib/sync/index.ts lib/data/seed.ts tests/unit/sync/engine.test.ts
git commit -m "feat(sync): le moteur — deux appareils convergent, et une suppression ne revient pas"
```

---

## Tâche 9 : l'état applicatif et les déclencheurs

**Fichiers :**
- Créer : `lib/store/slices/sync.ts`
- Modifier : `lib/store/types.ts`, `lib/store/store.ts`
- Modifier : `components/shell/` — le composant qui monte l'application
  (repérer celui qui appelle l'hydratation ; `AppShell`)
- Test : `tests/unit/store/sync.test.ts`

**Interfaces :**
- Consomme : `synchroniser`, `deriverCles`, `transportHttp`, `genererCode`,
  `normaliserCode`, `codeValide`.
- Produit, dans `AppState` :
  - `sync: { statut: 'inactif' | 'jamais' | 'a-jour' | 'en-cours' | 'hors-ligne' | 'erreur'; dernier: string | null; code: string | null }`
  - `activerSync(): Promise<string>` — génère le code, l'enregistre, rend le code
  - `rejoindreSync(saisi: string): Promise<boolean>` — valide et enregistre ; faux si invalide
  - `delierSync(): Promise<void>` — efface code, curseur et filigrane ; **ne touche à aucune donnée**
  - `lancerSync(): Promise<void>` — un aller-retour, met `sync` à jour

- [ ] **Étape 1 : écrire le test qui échoue**

```ts
// tests/unit/store/sync.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { META_KEYS, metaRepo } from '@/lib/data';
import { useStore } from '@/lib/store';
import { codeValide } from '@/lib/sync';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

describe('activation', () => {
  it('génère un code valide et le persiste', async () => {
    const code = await useStore.getState().activerSync();
    expect(codeValide(code)).toBe(true);
    expect(await metaRepo.get<string>(META_KEYS.syncCode)).toBe(code);
  });

  it('accepte un code saisi avec tirets', async () => {
    const ok = await useStore.getState().rejoindreSync('k7m2-9qpx-3rtz-8hnv-4wbd');
    expect(ok).toBe(true);
    expect(await metaRepo.get<string>(META_KEYS.syncCode)).toBe('K7M29QPX3RTZ8HNV4WBD');
  });

  it('refuse un code trop court sans rien persister', async () => {
    const ok = await useStore.getState().rejoindreSync('TROP-COURT');
    expect(ok).toBe(false);
    expect(await metaRepo.get<string>(META_KEYS.syncCode)).toBeUndefined();
  });
});

describe('déliaison', () => {
  it('efface le code et le curseur mais garde les données', async () => {
    /* C'EST LE TEST QUI COMPTE : « délier » doit être un geste sans danger.
       S'il effaçait les données, personne ne l'utiliserait — et il serait
       utilisé par erreur au moins une fois. */
    await useStore.getState().activerSync();
    await metaRepo.set(META_KEYS.syncCursor, 12);
    const { habitsRepo } = await import('@/lib/data');
    const h = await habitsRepo.create({ name: 'Intacte', type: 'check' } as never);

    await useStore.getState().delierSync();

    expect(await metaRepo.get(META_KEYS.syncCode)).toBeUndefined();
    expect(await metaRepo.get(META_KEYS.syncCursor)).toBeUndefined();
    expect(await habitsRepo.get(h.id)).toBeDefined();
    expect(useStore.getState().sync.statut).toBe('inactif');
  });
});
```

- [ ] **Étape 2 : lancer le test et vérifier qu'il échoue**

Lancer : `npx vitest run tests/unit/store/sync.test.ts`
Attendu : ÉCHEC — `activerSync is not a function`.

- [ ] **Étape 3 : écrire le slice**

```ts
// lib/store/slices/sync.ts
import { META_KEYS, metaRepo } from '@/lib/data';
import {
  codeValide,
  deriverCles,
  genererCode,
  normaliserCode,
  synchroniser,
  transportHttp,
  SyncErreur,
  type Cles,
} from '@/lib/sync';
import { logError } from '@/lib/logger';
import { rechargerDonnees } from '../hydrate';
import type { AppState, Slice } from '../types';

/* Le pont entre le moteur et l'interface.
 *
 * L'URL DU SERVEUR EST UN RÉGLAGE DE CONSTRUCTION. Absente, `activerSync` n'est
 * même pas proposée : un fork sans serveur reste strictement local-first, sans
 * bouton qui promettrait un service inexistant. */
const URL_SYNC = process.env.NEXT_PUBLIC_SYNC_URL ?? '';

export const SYNC_DISPONIBLE = URL_SYNC !== '';

export type StatutSync = 'inactif' | 'jamais' | 'a-jour' | 'en-cours' | 'hors-ligne' | 'erreur';

export interface SyncState {
  sync: { statut: StatutSync; dernier: string | null; code: string | null };
  activerSync: () => Promise<string>;
  rejoindreSync: (saisi: string) => Promise<boolean>;
  delierSync: () => Promise<void>;
  lancerSync: () => Promise<void>;
}

/* Les clés coûtent ~0,3 s à dériver (PBKDF2, 600 000 itérations) : elles sont
   dérivées UNE FOIS et gardées en mémoire. La clé n'est pas extractible — la
   garder ainsi ne l'expose pas davantage que la garder dans WebCrypto. */
let clesEnMemoire: { code: string; cles: Cles } | null = null;

async function cles(code: string): Promise<Cles> {
  if (clesEnMemoire?.code !== code) clesEnMemoire = { code, cles: await deriverCles(code) };
  return clesEnMemoire.cles;
}

export const createSyncSlice: Slice<SyncState> = (set, get) => ({
  sync: { statut: 'inactif', dernier: null, code: null },

  async activerSync() {
    const code = genererCode();
    await metaRepo.set(META_KEYS.syncCode, code);
    set({ sync: { statut: 'jamais', dernier: null, code } });
    void get().lancerSync();
    return code;
  },

  async rejoindreSync(saisi) {
    const code = normaliserCode(saisi);
    if (!codeValide(code)) return false;
    await metaRepo.set(META_KEYS.syncCode, code);
    set({ sync: { statut: 'jamais', dernier: null, code } });
    void get().lancerSync();
    return true;
  },

  async delierSync() {
    /* Le code, le curseur et le filigrane partent. LES DONNÉES RESTENT :
       délier n'est pas effacer, et l'interface le dit. */
    await metaRepo.remove(META_KEYS.syncCode);
    await metaRepo.remove(META_KEYS.syncCursor);
    await metaRepo.remove(META_KEYS.syncWatermark);
    await metaRepo.remove(META_KEYS.syncLastAt);
    clesEnMemoire = null;
    set({ sync: { statut: 'inactif', dernier: null, code: null } });
  },

  async lancerSync() {
    if (!SYNC_DISPONIBLE) return;
    const code = await metaRepo.get<string>(META_KEYS.syncCode);
    if (!code) return;
    if (get().sync.statut === 'en-cours') return;

    set((s: AppState) => ({ sync: { ...s.sync, statut: 'en-cours', code } }));

    try {
      const bilan = await synchroniser({
        transport: transportHttp(URL_SYNC),
        cles: await cles(code),
      });

      /* Relire la base seulement si quelque chose est arrivé : une relecture
         complète à chaque battement ferait clignoter l'écran pour rien. */
      if (bilan.recus > 0) set(await rechargerDonnees());

      const dernier = (await metaRepo.get<string>(META_KEYS.syncLastAt)) ?? null;
      set({ sync: { statut: 'a-jour', dernier, code } });
    } catch (e) {
      const horsLigne = e instanceof SyncErreur && e.genre === 'reseau';
      if (!horsLigne) void logError(e, 'sync');
      set((s: AppState) => ({
        sync: { ...s.sync, statut: horsLigne ? 'hors-ligne' : 'erreur', code },
      }));
    }
  },
});
```

> **Note pour l'exécutant :** le type `Slice<T>` et la signature de `logError`
> se lisent dans `lib/store/types.ts` et `lib/logger.ts`. Aligner l'écriture sur
> les slices existants (`lib/store/slices/settings.ts`) plutôt que sur ce
> squelette si les signatures diffèrent.

- [ ] **Étape 4 : brancher le slice**

Dans `lib/store/types.ts`, ajouter `SyncState` à l'intersection qui compose
`AppState`. Dans `lib/store/store.ts`, ajouter `...createSyncSlice(...a),`
à la liste des slices, et `sync: { statut: 'inactif', dernier: null, code: null }`
à `donneesInitiales` si le type l'exige.

- [ ] **Étape 5 : poser les déclencheurs**

Dans le composant de coque qui hydrate l'application (`components/shell/AppShell`),
après l'hydratation :

```tsx
  /* TROIS DÉCLENCHEURS, ET PAS UN DE PLUS.
     - à l'ouverture : c'est là qu'on veut voir ce qui a été fait ailleurs
     - au retour au premier plan : le cas du téléphone qu'on rouvre
     - après une modification, GROUPÉE : sans le regroupement, cocher dix
       cases enverrait dix requêtes.
     Jamais fenêtre fermée : sans serveur de notification, c'est impossible —
     même raison qu'ADR-0008 pour les rappels. */
  useEffect(() => {
    if (!SYNC_DISPONIBLE) return;
    const lancer = () => void useStore.getState().lancerSync();

    lancer();
    const auRetour = () => {
      if (document.visibilityState === 'visible') lancer();
    };
    document.addEventListener('visibilitychange', auRetour);

    let minuteur: ReturnType<typeof setTimeout> | undefined;
    const desabonner = useStore.subscribe(() => {
      clearTimeout(minuteur);
      minuteur = setTimeout(lancer, 4000);
    });

    return () => {
      document.removeEventListener('visibilitychange', auRetour);
      clearTimeout(minuteur);
      desabonner();
    };
  }, []);
```

> **Attention :** `useStore.subscribe` se déclenche aussi sur les changements
> que `lancerSync` provoque lui-même (`sync.statut`, rechargement). Le garde
> `if (get().sync.statut === 'en-cours') return;` du slice empêche la boucle,
> mais **vérifier à l'exécution** qu'aucune synchronisation ne s'enchaîne
> indéfiniment : ajouter temporairement un `console.count` et l'observer.

- [ ] **Étape 6 : lancer les tests et vérifier qu'ils passent**

Lancer : `npx vitest run tests/unit/store`
Attendu : SUCCÈS, tests existants inclus.

- [ ] **Étape 7 : commiter**

```bash
git add lib/store components/shell tests/unit/store/sync.test.ts
git commit -m "feat(sync): trois déclencheurs, et délier ne perd aucune donnée"
```

---

## Tâche 10 : l'écran de réglages

**Fichiers :**
- Créer : `components/settings/SyncSection.tsx`
- Modifier : `components/settings/SettingsView.tsx`
- Modifier : `messages/fr.json`, `messages/en.json`

**Interfaces :**
- Consomme : `sync`, `activerSync`, `rejoindreSync`, `delierSync`,
  `lancerSync`, `SYNC_DISPONIBLE`, `formaterCode`.
- Produit : `<SyncSection />`.

- [ ] **Étape 1 : ajouter les libellés dans les deux langues**

Dans `messages/fr.json`, namespace `app` :

```json
    "syncSec": "Synchronisation",
    "syncOff": "Cet appareil n'échange rien. Vos données restent ici.",
    "syncEnable": "Activer la synchronisation",
    "syncJoin": "J'ai déjà un code",
    "syncCodeLabel": "Code d'appairage",
    "syncCodeHelp": "Recopiez ce code sur votre autre appareil. Il est le seul moyen de relier les deux — personne ne peut le retrouver à votre place.",
    "syncCodeShow": "Voir mon code",
    "syncCodeInvalid": "Ce code n'a pas le bon format.",
    "syncUnlink": "Délier cet appareil",
    "syncUnlinkHelp": "Les données de cet appareil ne sont pas effacées.",
    "syncNever": "Jamais synchronisé",
    "syncUpToDate": "À jour",
    "syncRunning": "Synchronisation…",
    "syncOffline": "Hors ligne — reprendra à la reconnexion",
    "syncError": "Échec de la dernière synchronisation",
    "syncLast": "Dernière synchronisation",
    "syncOccWarning": "Une tâche récurrente cochée sur deux appareils hors ligne en même temps peut n'être retenue qu'une fois."
```

Dans `messages/en.json`, aux mêmes clés :

```json
    "syncSec": "Sync",
    "syncOff": "This device exchanges nothing. Your data stays here.",
    "syncEnable": "Turn on sync",
    "syncJoin": "I already have a code",
    "syncCodeLabel": "Pairing code",
    "syncCodeHelp": "Type this code on your other device. It is the only way to link the two — nobody can recover it for you.",
    "syncCodeShow": "Show my code",
    "syncCodeInvalid": "That code has the wrong format.",
    "syncUnlink": "Unlink this device",
    "syncUnlinkHelp": "Data on this device is not erased.",
    "syncNever": "Never synced",
    "syncUpToDate": "Up to date",
    "syncRunning": "Syncing…",
    "syncOffline": "Offline — will resume when reconnected",
    "syncError": "Last sync failed",
    "syncLast": "Last sync",
    "syncOccWarning": "A recurring task ticked on two offline devices at once may only be counted once."
```

- [ ] **Étape 2 : vérifier la symétrie**

Lancer : `npm run check:messages`
Attendu : SUCCÈS. Toute clé manquante d'un côté fait échouer la CI.

- [ ] **Étape 3 : écrire le composant**

Suivre le patron de `components/settings/DataSection.tsx` : `'use client'`,
`useTranslations('app')`, `Panel` de `@/components/ui`, aucune chaîne en dur
(`react/jsx-no-literals`).

Structure attendue :

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Panel } from '@/components/ui';
import { useStore } from '@/lib/store';
import { SYNC_DISPONIBLE } from '@/lib/store/slices/sync';
import { formaterCode } from '@/lib/sync';

/* Section « Synchronisation » — spec § 8.
 *
 * DEUX HONNÊTETÉS QUE CET ÉCRAN DOIT TENIR :
 * 1. « Jamais synchronisé » s'écrit ainsi, pas « il y a 0 minute » (règle 3).
 * 2. Le code perdu n'est PAS récupérable, et l'avertissement est à côté du
 *    code au moment où on le lit — pas enterré dans une aide. */

export function SyncSection() {
  const t = useTranslations('app');
  const sync = useStore((s) => s.sync);
  const activerSync = useStore((s) => s.activerSync);
  const rejoindreSync = useStore((s) => s.rejoindreSync);
  const delierSync = useStore((s) => s.delierSync);

  const [codeAffiche, setCodeAffiche] = useState<string | null>(null);
  const [saisi, setSaisi] = useState('');
  const [invalide, setInvalide] = useState(false);

  /* Rien n'est proposé sans serveur configuré : un bouton qui promet un
     service inexistant est le défaut A5 déjà corrigé une fois. */
  if (!SYNC_DISPONIBLE) return null;

  const libelleStatut = {
    inactif: t('syncOff'),
    jamais: t('syncNever'),
    'a-jour': t('syncUpToDate'),
    'en-cours': t('syncRunning'),
    'hors-ligne': t('syncOffline'),
    erreur: t('syncError'),
  }[sync.statut];

  return <Panel title={t('syncSec')}>{/* … états inactif / appairé … */}</Panel>;
}
```

Compléter les deux états :

- **`statut === 'inactif'`** : le texte `syncOff`, un bouton `syncEnable`
  (appelle `activerSync`, met le code rendu dans `codeAffiche`), et un champ
  + bouton `syncJoin` (appelle `rejoindreSync`, pose `invalide` si faux).
- **sinon** : `libelleStatut`, `syncLast` + `sync.dernier` **seulement si non
  nul**, un bouton `syncCodeShow` qui révèle `formaterCode(sync.code)` avec
  `syncCodeHelp` juste à côté, `syncOccWarning`, et un bouton `syncUnlink`
  avec `syncUnlinkHelp`.

- [ ] **Étape 4 : brancher la section**

Dans `components/settings/SettingsView.tsx`, importer `SyncSection` et
l'insérer **après** `<DataSection />` — la synchronisation prolonge la
sauvegarde, elle ne la remplace pas.

- [ ] **Étape 5 : vérifier à l'œil**

Lancer : `npm run dev`, ouvrir `/app/settings`.
Attendu : sans `NEXT_PUBLIC_SYNC_URL`, la section **n'apparaît pas**. Avec une
URL bidon, elle apparaît en état `inactif`.

Vérifier l'absence de débordement horizontal à 390, 768, 1060 et 1440 px — le
code formaté fait 24 caractères et doit pouvoir revenir à la ligne.

- [ ] **Étape 6 : commiter**

```bash
git add components/settings messages
git commit -m "feat(sync): l'écran — « jamais synchronisé » s'écrit ainsi, et délier n'efface rien"
```

---

## Tâche 11 : ouvrir la CSP et l'empaquetage

**Fichiers :**
- Modifier : `next.config.mjs`
- Modifier : `.env.example`
- Modifier : `tests/e2e/headers.spec.ts`

- [ ] **Étape 1 : écrire le test qui échoue**

Dans `tests/e2e/headers.spec.ts`, ajouter :

```ts
test('connect-src autorise le serveur de synchronisation, et lui seul', async ({ request }) => {
  const csp = (await request.get('/app')).headers()['content-security-policy'] ?? '';
  const connect = csp.split(';').find((d) => d.trim().startsWith('connect-src')) ?? '';

  expect(connect).toContain("'self'");
  /* Aucun joker : ouvrir `connect-src` à `https:` rendrait la politique
     décorative, et c'est exactement ce qu'elle est censée empêcher. */
  expect(connect).not.toContain('*');
  expect(connect).not.toContain('https:');
});
```

- [ ] **Étape 2 : lancer le test**

Lancer : `npx playwright test tests/e2e/headers.spec.ts --project=desktop`
Attendu : SUCCÈS déjà (la CSP actuelle est `connect-src 'self'`). Le test verrouille
l'état avant modification — il doit **rester** vert après l'étape 3.

- [ ] **Étape 3 : ouvrir la CSP au seul serveur configuré**

Dans `next.config.mjs`, remplacer la ligne `"connect-src 'self'"` par :

```js
  /* La synchronisation est le SEUL appel sortant de l'application, et il n'est
     autorisé que vers l'adresse configurée à la construction. Sans
     `NEXT_PUBLIC_SYNC_URL`, la directive reste `'self'` : la politique d'un
     déploiement sans synchronisation ne bouge pas d'un caractère. */
  ['connect-src', "'self'", process.env.NEXT_PUBLIC_SYNC_URL].filter(Boolean).join(' '),
```

- [ ] **Étape 4 : documenter la variable**

Dans `.env.example` :

```bash
# Serveur de synchronisation (facultatif). Vide = application strictement
# locale, aucun appel réseau, section « Synchronisation » masquée.
# Déploiement : voir sync-server/README.md
NEXT_PUBLIC_SYNC_URL=
```

- [ ] **Étape 5 : vérifier le paquet Android**

Lancer : `npm run paquet:web && npm run paquet:verifier`
Attendu : SUCCÈS. Vérifier que `packaging/www` **ne contient pas** `sync-server/`.

Rappel : `headers()` n'est pas appliqué à un export statique — dans l'APK, la
CSP ne s'applique pas et l'appel sortant fonctionne sans cette directive.

- [ ] **Étape 6 : commiter**

```bash
git add next.config.mjs .env.example tests/e2e/headers.spec.ts
git commit -m "feat(sync): la CSP s'ouvre à une seule adresse, et à rien d'autre"
```

---

## Tâche 12 : le parcours de bout en bout

**Fichiers :**
- Créer : `tests/e2e/synchronisation.spec.ts`

- [ ] **Étape 1 : écrire le test de non-régression d'abord**

```ts
// tests/e2e/synchronisation.spec.ts
import { expect, test } from '@playwright/test';

/* LE TEST LE PLUS IMPORTANT DU FICHIER.
 *
 * Sans appairage, l'application ne doit émettre AUCUNE requête vers l'extérieur.
 * C'est la promesse de la vitrine et du README ; un test qui la vérifie vaut
 * mieux qu'un paragraphe qui l'affirme. */
test('sans appairage, aucune requête ne sort', async ({ page }) => {
  const sorties: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (url.origin !== new URL(page.url() || 'http://localhost:3000').origin) {
      sorties.push(r.url());
    }
  });

  await page.goto('/app/today');
  await page.getByRole('button', { name: /courir|ajouter|add/i }).first().click({ trial: true });
  await page.waitForTimeout(6000); // au-delà du regroupement de 4 s

  expect(sorties).toEqual([]);
});
```

- [ ] **Étape 2 : lancer le test**

Lancer : `npx playwright test tests/e2e/synchronisation.spec.ts --project=desktop`
Attendu : SUCCÈS (aucune synchronisation configurée en test).

- [ ] **Étape 3 : écrire le parcours à deux appareils**

```ts
test.describe('deux appareils', () => {
  /* Un serveur de synchronisation EN MÉMOIRE, servi par Playwright : le test ne
     dépend ni de Cloudflare, ni du réseau, ni d'un déploiement. */
  test('une habitude créée dans un contexte apparaît dans l’autre', async ({ browser }) => {
    const lignes = new Map<string, { seq: number; corps: unknown }>();
    let compteur = 0;

    const monterServeur = async (contexte: import('@playwright/test').BrowserContext) => {
      await contexte.route('**/v1/**', async (route) => {
        const url = new URL(route.request().url());
        if (route.request().method() === 'GET') {
          const depuis = Number(url.searchParams.get('depuis') ?? 0);
          const sorties = [...lignes.values()].filter((l) => l.seq > depuis);
          await route.fulfill({
            json: {
              seq: sorties.length ? Math.max(...sorties.map((s) => s.seq)) : depuis,
              lignes: sorties.map((s) => s.corps),
            },
          });
          return;
        }
        const corps = route.request().postDataJSON() as { lignes: { kind: string; id: string }[] };
        for (const l of corps.lignes) {
          compteur += 1;
          lignes.set(`${l.kind}|${l.id}`, { seq: compteur, corps: l });
        }
        await route.fulfill({ json: { seq: compteur } });
      });
    };

    const a = await browser.newContext();
    const b = await browser.newContext();
    await monterServeur(a);
    await monterServeur(b);

    const pageA = await a.newPage();
    await pageA.goto('/app/settings');
    await pageA.getByRole('button', { name: /synchronisation|sync/i }).click();
    const code = await pageA.getByTestId('sync-code').innerText();

    await pageA.goto('/app/habits');
    // … créer une habitude nommée « Venue de A » via l'éditeur …

    const pageB = await b.newPage();
    await pageB.goto('/app/settings');
    await pageB.getByRole('button', { name: /déjà un code|already have/i }).click();
    await pageB.getByRole('textbox').fill(code);
    await pageB.keyboard.press('Enter');

    await pageB.goto('/app/habits');
    await expect(pageB.getByText('Venue de A')).toBeVisible({ timeout: 15_000 });
  });
});
```

> **Note pour l'exécutant :** les sélecteurs de création d'habitude se lisent
> dans `tests/e2e/vue-habits.spec.ts` — les réutiliser plutôt que d'en inventer.
> Ajouter `data-testid="sync-code"` sur l'élément qui affiche le code dans
> `SyncSection.tsx`.
> Ce test exige `NEXT_PUBLIC_SYNC_URL` au lancement : l'ajouter au
> `webServer.env` de `playwright.config.ts`, avec une valeur bidon
> (`https://sync.test`) que `page.route` intercepte.

- [ ] **Étape 4 : lancer sur les deux profils**

Lancer : `npm run test:e2e`
Attendu : SUCCÈS sur `desktop` et `mobile`.

- [ ] **Étape 5 : commiter**

```bash
git add tests/e2e/synchronisation.spec.ts playwright.config.ts components/settings/SyncSection.tsx
git commit -m "test(sync): deux navigateurs convergent, et sans appairage rien ne sort"
```

---

## Tâche 13 : la documentation, qui doit cesser de mentir

**Fichiers :**
- Créer : `docs/adr/0009-sync-chiffree.md`
- Modifier : `docs/adr/0002-local-first.md`, `docs/adr/README.md`
- Modifier : `README.md`, `lib/site/contenu/*`, `docs/handoff/03-ARCHITECTURE.md`
- Modifier : `docs/superpowers/specs/2026-09-01-synchronisation-multi-appareils-design.md`
- Modifier : `CHANGELOG.md`

Le `CLAUDE.md` l'exige : « si l'intervention invalide une affirmation d'un
document de `docs/`, ce document est corrigé dans la même livraison ».

- [ ] **Étape 1 : écrire l'ADR-0009**

```markdown
# ADR 0009 — Synchronisation chiffrée de bout en bout

- **Statut** : accepté · 2026-09-01
- **Amende** : ADR-0002 (local-first, sans compte ni serveur)

## Décision

Un serveur de synchronisation existe, **facultatif et désactivé par défaut**. Il
stocke des entités chiffrées par une clé dérivée d'un code de 100 bits qui ne
quitte jamais l'appareil. Le serveur ne peut pas lire ce qu'il conserve.

## Pourquoi

Trois silos étanches — le navigateur de bureau, l'APK, tout autre profil — et
un seul pont manuel : l'export JSON. Le besoin est réel et permanent.

Deux options ont été écartées :

- **Un outil de synchronisation de fichiers tiers** (Syncthing) : exige une
  installation sur les deux appareils, et côté bureau l'API d'accès aux
  fichiers n'existe que sous Chrome et Edge, avec une réautorisation à chaque
  session. Ce n'est pas « automatique ».
- **Un service avec comptes** (Neon + Auth.js, comme l'annonçait
  `03-ARCHITECTURE.md`) : coût qui croît avec les utilisateurs, garde de
  données, et anti-feature F-Droid « dépend d'un service réseau ».

## Conséquences

- `connect-src` s'ouvre à **une** adresse, fixée à la construction. Sans
  `NEXT_PUBLIC_SYNC_URL`, la politique et le comportement ne changent pas d'un
  caractère, et la section de réglages n'apparaît pas.
- **Le code perdu n'est pas récupérable.** C'est la contrepartie directe du
  chiffrement de bout en bout, affichée au moment où le code est lu.
- Le serveur voit passer le **nombre** d'entités et la **cadence** des
  modifications, jamais leur contenu. Cette fuite de métadonnée est le prix de
  la synchronisation delta ; elle est assumée et écrite.
- La convergence repose sur `updatedAt`/`deletedAt`, posés dès la phase 1
  précisément pour cela. `logsRepo.clear()` (effacement dur) est désormais
  interdit sur les chemins synchronisés.
```

- [ ] **Étape 2 : amender l'ADR-0002**

Remplacer sa dernière ligne (« La synchronisation multi-appareils reste **non
tenue** ») par :

```markdown
- La synchronisation multi-appareils **existe depuis ADR-0009**, chiffrée de bout
  en bout et **désactivée par défaut**. Tant qu'elle n'est pas activée, tout ce
  qui précède reste vrai mot pour mot : aucun compte, aucun appel réseau.
```

Ajouter en tête : `- **Amendé par** : ADR-0009 · 2026-09-01`.
Ajouter la ligne correspondante dans `docs/adr/README.md`.

- [ ] **Étape 3 : corriger le README et la vitrine**

Dans `README.md`, ligne 4, remplacer
« **Local-first** : aucune donnée ne quitte l'appareil, aucun compte, aucun appel réseau. »
par :

```markdown
**Local-first** : aucun compte, aucun appel réseau. La synchronisation
multi-appareils est facultative et désactivée par défaut ; une fois activée,
les données sont chiffrées sur l'appareil — le serveur ne peut pas les lire.
```

Lancer : `npx grep -rn "aucun appel réseau\|ne quitte l" README.md lib/site docs`
Corriger **chaque** occurrence dans le même sens.

- [ ] **Étape 4 : corriger l'architecture**

Dans `docs/handoff/03-ARCHITECTURE.md` :
- ligne 21 : remplacer « **Neon PostgreSQL** + **Drizzle** + **Auth.js** » par
  « **Cloudflare Workers** + **D1** — chiffré de bout en bout, sans compte (ADR-0009) » ;
- ligne 54 : remplacer `drizzle/ migrations/…` par
  `sync-server/ Worker + D1 (synchronisation, facultative — ADR-0009)`.

- [ ] **Étape 5 : aligner la spec sur ce qui a été construit**

Dans `docs/superpowers/specs/2026-09-01-synchronisation-multi-appareils-design.md` :
- § 4 : remplacer les « 6 mots tirés d'une liste de 2048 (≈ 128 bits) » par le
  code de 20 caractères en alphabet de Crockford, **100 bits** ;
- § 7 : le tableau compte **sept** fichiers (`types.ts` et `entites.ts` en plus),
  pas cinq ;
- § 8 : « phrase » devient « code » partout.

Une spec qui décrit autre chose que le code livré est pire qu'une spec absente.

- [ ] **Étape 6 : mettre à jour le CHANGELOG**

```markdown
### Ajouté

- **Synchronisation multi-appareils**, facultative et désactivée par défaut.
  Un code d'appairage de 20 caractères relie deux appareils ; les données sont
  chiffrées sur l'appareil et le serveur ne peut pas les lire (ADR-0009).

### Modifié

- `logsRepo.clear()` n'est plus utilisé sur les chemins synchronisés :
  l'effacement passe par `tombstone()`, qui laisse une trace.
- `README.md`, la vitrine et `03-ARCHITECTURE.md` : « aucun appel réseau »
  devient exact — la synchronisation, une fois activée, en émet.
```

- [ ] **Étape 7 : vérification complète**

Lancer : `npm run verify`
Attendu : SUCCÈS — types, lint, format, libellés, jetons, build, tests unitaires.

Lancer : `npm run test:e2e`
Attendu : SUCCÈS sur `desktop` et `mobile`.

- [ ] **Étape 8 : commiter**

```bash
git add docs README.md lib/site CHANGELOG.md
git commit -m "docs(sync): ADR-0009, et tous les documents qui disaient « aucun appel réseau »"
```

---

## Auto-relecture

**Couverture de la spec :**

| Section de la spec | Tâche |
| --- | --- |
| § 3 ce que le serveur voit | 6 (`schema.sql`) |
| § 4 cryptographie | 1, 2 — **écart** : code de 100 bits, corrigé en 13 |
| § 5 protocole | 6, 7 |
| § 6 ce qui se synchronise | 5 |
| § 6 suppressions, audit de `clear()` | 4 |
| § 6 limite de `occ` | 10 (libellé `syncOccWarning`) |
| § 7 module client | 1, 2, 3, 5, 7, 8 |
| § 7 `putRaw` | 4 |
| § 7 déclenchement | 9 |
| § 7 hors ligne et pannes | 7 (erreurs typées), 9 (statuts) |
| § 8 l'écran | 10 |
| § 9 le serveur | 6 |
| § 10 ce qui change ailleurs | 11, 13 |
| § 11 tests | 1–12 |
| § 13 risques | 10 (avertissement), 13 (ADR) |

**Écart déclaré :** la spec § 4 annonce six mots ; le plan livre un code de 20
caractères. Justifié en tête, et la spec est corrigée à la tâche 13 — le plan
ne laisse pas deux documents se contredire.

**Cohérence des types :** `SyncRow` (tâche 2) est consommé tel quel par
`transport.ts` (7), `engine.ts` (8) et le Worker (6). `Arbitrable` est
volontairement dupliqué entre `merge.ts` et `sync-server/src/logique.ts` — le
serveur ne peut pas importer `lib/` —, et un test de la tâche 6 vérifie cas par
cas que les deux règles coïncident.

**Point à surveiller à l'exécution :** le regroupement par `useStore.subscribe`
(tâche 9, étape 5) peut se redéclencher sur ses propres écritures. Le garde
`statut === 'en-cours'` doit être vérifié en conditions réelles, pas seulement
en test.
