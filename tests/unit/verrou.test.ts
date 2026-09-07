import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { META_KEYS, metaRepo, seedEmpty } from '@/lib/data';
import { depuisB64u, versB64u } from '@/lib/features/verrou/webauthn';
import { lireDepuis } from '@/lib/sync/entites';
import { useStore } from '@/lib/store';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
  useStore.setState(useStore.getInitialState());
});

describe('base64url', () => {
  it('fait l’aller-retour sur des octets quelconques', () => {
    const octets = new Uint8Array([0, 1, 62, 63, 64, 127, 128, 254, 255]);
    expect([...depuisB64u(versB64u(octets.buffer as ArrayBuffer))]).toEqual([...octets]);
  });

  it('n’emploie ni « + », ni « / », ni bourrage', () => {
    /* Ces trois caractères ne survivent pas à un aller-retour dans une URL ou
       un attribut ; l'identifiant, lui, doit survivre à tout ce qu'on lui
       fera. C'est la seule raison d'employer base64URL plutôt que base64. */
    for (let n = 1; n < 40; n += 1) {
      const octets = new Uint8Array(Array.from({ length: n }, (_, i) => (i * 251) % 256));
      const texte = versB64u(octets.buffer as ArrayBuffer);
      expect(texte).not.toMatch(/[+/=]/);
      expect([...depuisB64u(texte)]).toEqual([...octets]);
    }
  });
});

describe('le verrou dans le store', () => {
  it('s’active, se relit après rechargement, et ouvre le rideau tout de suite', async () => {
    await seedEmpty();
    await useStore.getState().hydrate();
    expect(useStore.getState().lockCredentialId).toBeNull();

    await useStore.getState().enableLock('abc123');
    /* Celui qui vient d'enregistrer son empreinte est déjà vérifié : le rideau
       ne retombe pas à l'instant où on le pose. */
    expect(useStore.getState().ui.unlocked).toBe(true);

    /* Rechargement : le rideau retombe, le verrou reste. */
    useStore.setState(useStore.getInitialState());
    await useStore.getState().hydrate();
    expect(useStore.getState().lockCredentialId).toBe('abc123');
    expect(useStore.getState().ui.unlocked).toBe(false);
  });

  it('se retire, et ne revient pas au rechargement', async () => {
    await seedEmpty();
    await useStore.getState().hydrate();
    await useStore.getState().enableLock('abc123');
    await useStore.getState().disableLock();
    expect(useStore.getState().lockCredentialId).toBeNull();

    useStore.setState(useStore.getInitialState());
    await useStore.getState().hydrate();
    expect(useStore.getState().lockCredentialId).toBeNull();
    expect(await metaRepo.get(META_KEYS.bioLock)).toBeUndefined();
  });

  it('tient pour ABSENT un verrou sans identifiant', async () => {
    /* Le cas qui enfermerait dehors : une ligne `bioLock` écrite à moitié —
       import d'une base bricolée, écriture interrompue. Un rideau qu'aucune
       vérification ne peut lever n'est pas un verrou, c'est une perte de
       données. On l'ignore. */
    await seedEmpty();
    await metaRepo.set(META_KEYS.bioLock, { credentialId: '', at: 'x' });
    await useStore.getState().hydrate();
    expect(useStore.getState().lockCredentialId).toBeNull();
  });
});

describe('le verrou NE SYNCHRONISE PAS', () => {
  it('n’apparaît dans aucune ligne à envoyer', async () => {
    /* LE TEST QUI COMPTE. Un credential WebAuthn de plateforme n'existe que sur
       l'appareil qui l'a enregistré : le transporter poserait sur l'autre
       appareil un rideau que personne ne peut lever. `meta` ne synchronise que
       deux clés nommées — si un jour quelqu'un ajoute `bioLock` à la liste,
       c'est ici qu'il l'apprend. */
    await seedEmpty();
    await metaRepo.set(META_KEYS.bioLock, { credentialId: 'abc123', at: 'x' });

    const lignes = await lireDepuis('1970-01-01T00:00:00.000Z');
    expect(lignes.some((l) => l.id === META_KEYS.bioLock)).toBe(false);
    expect(JSON.stringify(lignes)).not.toContain('abc123');
  });
});
