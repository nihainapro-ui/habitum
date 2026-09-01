import { beforeEach, describe, expect, it, vi } from 'vitest';

/* La tranche « synchronisation » — le branchement du moteur au produit.

   LE MOTEUR N'EST PAS RETESTÉ ICI : `tests/unit/sync/engine.test.ts` s'en
   charge. Ce fichier ne vérifie que ce que la tranche ajoute — les gardes, la
   traduction des échecs, l'effacement des curseurs, le rechargement de l'état.

   `transportHttp` est remplacé par le serveur en mémoire du moteur, et
   `syncDisponible` par un « oui » : sans cela, la tranche croirait le dépôt
   non configuré et refuserait tout, muettement et à juste titre. La doublure
   est posée par `vi.mock`, donc AVANT l'évaluation des modules — c'est
   nécessaire, `syncInitial.disponible` est calculé à l'import. */

const { transportPartage } = vi.hoisted(() => ({
  transportPartage: { courant: null as unknown },
}));

vi.mock('@/lib/sync', async (original) => {
  const vrai = await original<typeof import('@/lib/sync')>();
  transportPartage.courant = vrai.transportMemoire();
  return {
    ...vrai,
    syncDisponible: () => true,
    urlSync: () => 'https://exemple.test',
    transportHttp: () => transportPartage.courant,
  };
});

const { db } = await import('@/lib/data/db');
const { META_KEYS, metaRepo, seedEmpty } = await import('@/lib/data');
const { SyncErreur } = await import('@/lib/sync');
const { useStore } = await import('@/lib/store');
const { _viderCacheCles } = await import('@/lib/store/slices/sync');

const CODE = 'K7M29QPX3RTZ8HNV4WBD';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
  await seedEmpty();
  _viderCacheCles();
  await useStore.getState().hydrate();
});

const creerHabitude = async (name: string) => {
  await useStore.getState().createHabit({
    name,
    category: 'health',
    goal: { kind: 'check', target: 1, step: 1, unit: '' },
    mode: 'dow',
    days: [0, 1, 2, 3, 4, 5, 6],
    subItems: [],
    reminders: [],
    archived: false,
    note: '',
  });
};

describe('appairage', () => {
  it('part inactif, et le reste tant qu’aucun code n’est saisi', () => {
    const { sync } = useStore.getState();
    expect(sync.actif).toBe(false);
    expect(sync.code).toBeNull();
  });

  it('refuse un code mal formé SANS rien enregistrer', async () => {
    /* Le refus doit être local et instantané. S'il passait par le réseau,
       une faute de frappe coûterait un aller-retour — et pendant une panne,
       l'utilisateur croirait son code mauvais alors qu'il est bon. */
    const ok = await useStore.getState().activerSync('TROP-COURT');

    expect(ok).toBe(false);
    expect(useStore.getState().sync.actif).toBe(false);
    expect(await metaRepo.get(META_KEYS.syncCode)).toBeUndefined();
  });

  it('accepte un code tapé à l’humaine — minuscules, tirets, espaces', async () => {
    const ok = await useStore.getState().activerSync(' k7m2-9qpx 3rtz-8hnv-4wbd ');

    expect(ok).toBe(true);
    /* NORMALISÉ à l'enregistrement, pas à la lecture : deux appareils qui
       enregistrent deux graphies du même code doivent dériver la MÊME clé. */
    expect(useStore.getState().sync.code).toBe(CODE);
    expect(await metaRepo.get(META_KEYS.syncCode)).toBe(CODE);
  }, 30_000);

  it('retrouve son appairage après un rechargement', async () => {
    await useStore.getState().activerSync(CODE);

    /* `hydrate` relit tout : un appareil appairé doit se savoir appairé sans
       qu'on ait à repasser par les réglages. */
    await useStore.getState().hydrate();

    expect(useStore.getState().sync.actif).toBe(true);
    expect(useStore.getState().sync.code).toBe(CODE);
  }, 30_000);
});

describe('désappairage', () => {
  it('oublie le code ET les curseurs, sans toucher aux données', async () => {
    await useStore.getState().activerSync(CODE);
    await creerHabitude('Courir');
    await useStore.getState().synchroniserMaintenant();

    await useStore.getState().desactiverSync();

    /* Les quatre clés partent ensemble. Garder le curseur d'un code oublié
       ferait manquer, au réappairage, tout ce qui a transité entre-temps. */
    expect(await metaRepo.get(META_KEYS.syncCode)).toBeUndefined();
    expect(await metaRepo.get(META_KEYS.syncCursor)).toBeUndefined();
    expect(await metaRepo.get(META_KEYS.syncWatermark)).toBeUndefined();
    expect(await metaRepo.get(META_KEYS.syncLastAt)).toBeUndefined();
    expect(useStore.getState().sync.actif).toBe(false);

    /* CE QUI COMPTE LE PLUS : désappairer n'efface rien. L'habitude est à
       l'utilisateur, pas à la synchronisation. */
    expect(useStore.getState().habits.map((h) => h.name)).toContain('Courir');
  }, 30_000);
});

describe('effacement du relais', () => {
  it('efface sur demande, et désappaire ensuite', async () => {
    await useStore.getState().activerSync(CODE);
    await creerHabitude('Courir');
    await useStore.getState().synchroniserMaintenant();

    const ok = await useStore.getState().desactiverSync(true);

    expect(ok).toBe(true);
    expect(useStore.getState().sync.actif).toBe(false);
    /* Le relais est vide : un appareil qui réappairerait le même code ne
       recevrait plus rien. C'est le sens du geste. */
    const t = transportPartage.courant as {
      tirer: (e: string, d: number) => Promise<{ lignes: unknown[] }>;
    };
    const { cles } = await import('./_cles-sync');
    expect((await t.tirer(await cles(CODE), 0)).lignes).toEqual([]);
    /* Les données LOCALES ne bougent pas : effacer le relais n'est pas
       effacer son compte. */
    expect(useStore.getState().habits.map((h) => h.name)).toContain('Courir');
  }, 30_000);

  it('ne désappaire PAS si l’effacement échoue', async () => {
    await useStore.getState().activerSync(CODE);

    const vrai = (transportPartage.courant as { effacer: unknown }).effacer;
    (transportPartage.courant as { effacer: unknown }).effacer = () => {
      throw new SyncErreur('reseau', 'coupure');
    };

    const ok = await useStore.getState().desactiverSync(true);

    /* LE POINT DE CE TEST. Désappairer d'abord jetterait le code — or c'est
       lui qui dérive l'espace à effacer. L'utilisateur serait déconnecté ET
       définitivement incapable de reprendre ses octets, c'est-à-dire le
       contraire exact de ce qu'il demandait. */
    expect(ok).toBe(false);
    expect(useStore.getState().sync.actif).toBe(true);
    expect(useStore.getState().sync.code).toBe(CODE);
    expect(useStore.getState().sync.echec).toBe('reseau');
    expect(await metaRepo.get(META_KEYS.syncCode)).toBe(CODE);

    (transportPartage.courant as { effacer: unknown }).effacer = vrai;
  }, 30_000);

  it('n’efface rien quand on ne le demande pas', async () => {
    await useStore.getState().activerSync(CODE);
    await creerHabitude('Courir');
    await useStore.getState().synchroniserMaintenant();

    /* Défaut = ne PAS effacer. Un désappairage ordinaire ne doit pas détruire
       ce que l'autre appareil n'a pas encore reçu. */
    await useStore.getState().desactiverSync();

    const t = transportPartage.courant as {
      tirer: (e: string, d: number) => Promise<{ lignes: unknown[] }>;
    };
    const { cles } = await import('./_cles-sync');
    expect((await t.tirer(await cles(CODE), 0)).lignes.length).toBeGreaterThan(0);
  }, 30_000);
});

describe('gardes', () => {
  it('ne synchronise pas quand aucun code n’est enregistré', async () => {
    await useStore.getState().synchroniserMaintenant();

    /* Ni erreur, ni date : un appareil non appairé n'a pas « échoué » à
       synchroniser, il n'a rien tenté. */
    expect(useStore.getState().sync.echec).toBeNull();
    expect(useStore.getState().sync.lastAt).toBeNull();
  });

  it('n’en lance pas deux à la fois', async () => {
    await useStore.getState().activerSync(CODE);
    await creerHabitude('Courir');

    /* Le premier appel est BLOQUÉ dans `tirer`, sur une promesse qu'on tient.
       Rien n'est laissé à l'ordonnancement des microtâches : une première
       version de ce test comptait les appels concurrents et passait au vert
       même garde retirée, parce que les trois passes ne se croisaient jamais
       vraiment dans `tirer`. Bloquer explicitement rend l'invariant vérifiable
       plutôt que probable.

       CE QU'ON PROTÈGE : deux passes concurrentes poseraient deux filigranes,
       dont le second effacerait le premier — et tout ce qui aurait été écrit
       entre les deux serait sauté pour toujours. La garde vit dans la tranche
       parce qu'elle doit couvrir TOUTES les sources d'appel (montage, retour
       d'onglet, retour du réseau, bouton), pas seulement l'une d'elles. */
    let appels = 0;
    let liberer = () => {};
    const bloquant = new Promise<void>((r) => {
      liberer = r;
    });
    const vrai = (transportPartage.courant as { tirer: (...a: never[]) => Promise<unknown> }).tirer;
    (transportPartage.courant as { tirer: unknown }).tirer = async (...a: never[]) => {
      appels += 1;
      await bloquant;
      return vrai(...a);
    };

    const premier = useStore.getState().synchroniserMaintenant();
    /* Laisse la première passe atteindre `tirer` et s'y arrêter. */
    await vi.waitFor(() => expect(appels).toBe(1));

    /* Le second appel doit rendre la main IMMÉDIATEMENT, sans toucher au
       réseau. S'il attendait, ce `await` ne rendrait jamais. */
    await useStore.getState().synchroniserMaintenant();
    expect(appels).toBe(1);

    liberer();
    await premier;
    (transportPartage.courant as { tirer: unknown }).tirer = vrai;
    expect(useStore.getState().sync.echec).toBeNull();
  }, 30_000);
});

describe('échecs', () => {
  it('range une panne réseau comme telle, et garde les données', async () => {
    await useStore.getState().activerSync(CODE);
    await creerHabitude('Courir');

    const vrai = (transportPartage.courant as { tirer: unknown }).tirer;
    (transportPartage.courant as { tirer: unknown }).tirer = () => {
      throw new SyncErreur('reseau', 'coupure');
    };

    await useStore.getState().synchroniserMaintenant();

    /* Le GENRE est conservé : « pas de réseau » et « mauvais code » n'appellent
       pas le même geste. Les confondre ferait retaper un code pendant une
       panne Wi-Fi — c'est la raison d'être de `SyncErreur`. */
    expect(useStore.getState().sync.echec).toBe('reseau');
    expect(useStore.getState().sync.enCours).toBe(false);
    /* Un échec réseau ne coûte AUCUNE donnée. */
    expect(useStore.getState().habits.map((h) => h.name)).toContain('Courir');

    (transportPartage.courant as { tirer: unknown }).tirer = vrai;
  }, 30_000);

  it('efface l’échec au premier succès', async () => {
    await useStore.getState().activerSync(CODE);

    const vrai = (transportPartage.courant as { tirer: unknown }).tirer;
    (transportPartage.courant as { tirer: unknown }).tirer = () => {
      throw new SyncErreur('reseau', 'coupure');
    };
    await useStore.getState().synchroniserMaintenant();
    expect(useStore.getState().sync.echec).toBe('reseau');

    /* Un message d'erreur qui survit à sa cause est un message qui ment. */
    (transportPartage.courant as { tirer: unknown }).tirer = vrai;
    await useStore.getState().synchroniserMaintenant();

    expect(useStore.getState().sync.echec).toBeNull();
    expect(useStore.getState().sync.lastAt).toBeTruthy();
  }, 30_000);
});

describe('deux appareils', () => {
  it('fait apparaître dans le store ce qu’un autre appareil a créé', async () => {
    await useStore.getState().activerSync(CODE);
    await creerHabitude('Créée sur A');
    await useStore.getState().synchroniserMaintenant();

    /* Appareil B : base vierge, même code, même serveur en mémoire. */
    db.close();
    await db.delete();
    await db.open();
    await seedEmpty();
    await useStore.getState().hydrate();
    await useStore.getState().activerSync(CODE);

    /* LE POINT DE CE TEST : le moteur écrit dans Dexie, SOUS le store. Sans le
       rechargement que fait la tranche, la base contiendrait l'habitude et
       l'écran n'en montrerait rien. */
    expect(useStore.getState().habits.map((h) => h.name)).toContain('Créée sur A');
  }, 30_000);
});
