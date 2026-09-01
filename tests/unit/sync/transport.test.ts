import { afterEach, describe, expect, it, vi } from 'vitest';
import { transportHttp } from '@/lib/sync/transport';

const ESPACE = 'K7M29QPX3RTZ8HNV4WBDK7M29QPX3RTZ';

afterEach(() => vi.unstubAllGlobals());

describe('transport HTTP', () => {
  it('appelle la bonne URL en lecture', async () => {
    const appel = vi.fn(async () => new Response(JSON.stringify({ seq: 7, lignes: [] })));
    vi.stubGlobal('fetch', appel);

    const r = await transportHttp('https://s.example').tirer(ESPACE, 3);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((appel.mock.calls[0] as any)[0]).toBe(`https://s.example/v1/${ESPACE}?depuis=3`);
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
    await expect(transportHttp('https://s.example').tirer(ESPACE, 0)).rejects.toMatchObject({
      genre: 'limite',
    });
  });

  it('envoie les lignes en POST', async () => {
    const appel = vi.fn(async () => new Response(JSON.stringify({ seq: 9 })));
    vi.stubGlobal('fetch', appel);

    const ligne = { kind: 'habits' as const, id: 'h1', updatedAt: 'x', blob: 'b' };
    const r = await transportHttp('https://s.example/').pousser(ESPACE, [ligne]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const init = (appel.mock.calls[0] as any)[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ lignes: [ligne] });
    expect(r.seq).toBe(9);
  });

  it('transforme un corps illisible en SyncErreur « reseau »', async () => {
    /* Une réponse HTTP 200 au corps vide ou tronqué — coupure réseau en plein
       transfert, réponse d'un intermédiaire, serveur qui ferme la connexion —
       lève un SyntaxError. Ce n'est pas une panne du serveur mais bien un
       incident de transport : la connexion a lâché en plein envoi. */
    vi.stubGlobal('fetch', async () => new Response('pas du json', { status: 200 }));

    await expect(transportHttp('https://s.example').tirer(ESPACE, 0)).rejects.toMatchObject({
      genre: 'reseau',
    });
  });
});
