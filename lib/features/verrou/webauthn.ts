/* Verrou biométrique — spec du 2026-09-02 § Lot D.
 *
 * WebAuthn, authentificateur DE PLATEFORME, `userVerification: 'required'` :
 * l'empreinte ou le visage de l'appareil, avec repli natif sur le code de
 * l'appareil, géré par le système. C'est ce repli qui règle le capteur cassé
 * sans qu'on écrive la moindre porte dérobée — et une porte dérobée écrite ici
 * serait exactement la faille que ce verrou prétend combler.
 *
 * CE QUE CE VERROU N'EST PAS : un chiffrement. Rien n'est chiffré, rien ne
 * dépend de la clé. Les données restent lisibles dans IndexedDB pour qui tient
 * l'appareil et sait où regarder — ce que la politique de confidentialité dit
 * déjà des données locales, et ce que le réglage répète en toutes lettres.
 * C'est un rideau : il arrête un regard, pas un adversaire.
 *
 * AUCUN SERVEUR. Pas de défi signé côté relais, pas de vérification distante :
 * il n'y a pas de compte, donc rien à prouver à personne. Le défi est engendré
 * localement et la réponse n'est pas vérifiée cryptographiquement — un rideau
 * n'a pas de serrure. Le vérifier localement ne prouverait rien de plus : le
 * code qui vérifierait est le code qu'on contournerait. */

/** Ce que le verrou peut rater, dit en un mot. */
export type EchecVerrou = 'indisponible' | 'refuse';

export class ErreurVerrou extends Error {
  constructor(readonly genre: EchecVerrou) {
    super(genre);
    this.name = 'ErreurVerrou';
  }
}

/** Base64url — la forme sous laquelle l'identifiant de credential est rangé
 *  dans `meta`. Pur et testable : c'est la seule chose ici qui puisse se
 *  tromper en silence. */
export function versB64u(octets: ArrayBuffer): string {
  const vue = new Uint8Array(octets);
  let brut = '';
  for (const o of vue) brut += String.fromCharCode(o);
  return btoa(brut).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function depuisB64u(texte: string): Uint8Array<ArrayBuffer> {
  const base = texte.replace(/-/g, '+').replace(/_/g, '/');
  const brut = atob(base.padEnd(Math.ceil(base.length / 4) * 4, '='));
  const octets = new Uint8Array(brut.length);
  for (let i = 0; i < brut.length; i += 1) octets[i] = brut.charCodeAt(i);
  return octets;
}

/** L'appareil a-t-il un authentificateur intégré utilisable ?
 *
 *  Deux questions, pas une : le navigateur connaît-il WebAuthn, et cet appareil
 *  a-t-il de quoi vérifier l'utilisateur. Un ordinateur de bureau sans lecteur
 *  d'empreinte répond oui à la première et non à la seconde — proposer le
 *  réglage là-bas donnerait un interrupteur qui échoue à chaque tentative. */
export async function verrouPossible(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const pkc = window.PublicKeyCredential;
  if (!pkc?.isUserVerifyingPlatformAuthenticatorAvailable) return false;
  try {
    return await pkc.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

const defi = (): Uint8Array<ArrayBuffer> => crypto.getRandomValues(new Uint8Array(32));

const identifiantLocal = (): Uint8Array<ArrayBuffer> => crypto.getRandomValues(new Uint8Array(16));

/** Enregistre le verrou et rend l'identifiant de credential à ranger dans
 *  `meta.bioLock`. Lève `ErreurVerrou` si l'utilisateur annule ou si la
 *  plateforme refuse — le réglage ne s'allume alors PAS. Un interrupteur qui
 *  s'allume sans verrou derrière est le pire des deux mondes. */
export async function enregistrerVerrou(nom: string): Promise<string> {
  if (!(await verrouPossible())) throw new ErreurVerrou('indisponible');

  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: defi(),
        /* `rp.id` non renseigné : le navigateur y met le domaine courant. Le
           coder en dur casserait l'APK, servi depuis un autre schéma. */
        rp: { name: 'Habitum' },
        /* IDENTIFIANT LOCAL et ARBITRAIRE. Il n'y a pas de compte : ce champ
           ne désigne personne, et surtout pas l'adresse électronique du profil
           — l'écrire ici la ferait sortir de nos mains vers le trousseau de la
           plateforme, et parfois vers sa sauvegarde en nuage. */
        user: { id: identifiantLocal(), name: nom, displayName: nom },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          /* Pas de credential découvrable : nous connaissons l'identifiant, on
             le range nous-mêmes. Une clé résidente occuperait une place limitée
             dans l'authentificateur, pour rien. */
          residentKey: 'discouraged',
        },
        /* Aucune attestation : nous ne vérifions rien côté serveur — il n'y a
           pas de serveur. En demander une ferait afficher un avertissement de
           confidentialité à l'utilisateur, pour une donnée que personne ne lit. */
        attestation: 'none',
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;

    if (!credential) throw new ErreurVerrou('refuse');
    return versB64u(credential.rawId);
  } catch (e) {
    if (e instanceof ErreurVerrou) throw e;
    throw new ErreurVerrou('refuse');
  }
}

/** Demande la vérification. Rend `true` si la plateforme a validé
 *  l'utilisateur, lève `ErreurVerrou('refuse')` si elle a refusé ou si
 *  l'utilisateur a annulé. */
export async function verifierVerrou(credentialId: string): Promise<boolean> {
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: defi(),
        allowCredentials: [{ type: 'public-key', id: depuisB64u(credentialId) }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    if (!assertion) throw new ErreurVerrou('refuse');
    return true;
  } catch (e) {
    if (e instanceof ErreurVerrou) throw e;
    throw new ErreurVerrou('refuse');
  }
}
