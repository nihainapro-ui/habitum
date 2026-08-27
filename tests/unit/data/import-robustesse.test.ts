import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { importFromJson, ImportError, MAX_IMPORT_BYTES } from '@/lib/data';
import { habitsRepo, tasksRepo } from '@/lib/data/repositories';

/* ============================================================================
   Robustesse de l'import — tâche 8.6, revue OWASP côté client.

   L'import est LA surface d'attaque du produit. Il n'y a pas de serveur, pas de
   session, pas de requête à falsifier : la seule donnée qui entre vient d'un
   fichier que l'utilisateur a choisi — et qu'on a pu lui envoyer.

   Quatre propriétés, et aucune ne se déduit de la lecture du code :

   1. une charge qui tente une POLLUTION DE PROTOTYPE n'atteint pas
      `Object.prototype` ;
   2. un fichier au-delà du plafond est refusé AVANT d'être analysé ;
   3. un JSON malformé est refusé avec un code stable, pas une exception nue ;
   4. un refus ne laisse JAMAIS la base à moitié peuplée.
   ========================================================================= */

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

/** Enveloppe minimale valide — le socle sur lequel greffer chaque attaque. */
const enveloppe = (extra: Record<string, unknown> = {}) => ({
  app: 'Habitum',
  v: 5,
  exported: '2026-08-05T12:00:00.000Z',
  habits: [],
  tasks: [],
  obj: [],
  log: {},
  ...extra,
});

describe('pollution de prototype', () => {
  /* `JSON.parse` ne pollue pas par lui-même : il pose `__proto__` comme une
     propriété PROPRE. Le danger vient de ce qu'on fait ENSUITE de l'objet —
     une fusion récursive, un `Object.assign` en profondeur, un `for…in` qui
     réaffecte. Ce test constate le résultat qui compte : après import,
     `Object.prototype` est intact. */
  it('une charge portant __proto__ ne touche pas Object.prototype', async () => {
    /* La clé hostile est PRÉFIXÉE au JSON, elle n'est pas substituée dedans.
       Deux raisons, et la seconde n'est pas cosmétique :

       1. il faut passer par `JSON.parse` — un littéral `{ __proto__: … }` écrit
          en TypeScript AFFECTE le prototype au lieu de poser une propriété
          propre, et le test ne mesurerait alors plus rien ;
       2. la version précédente faisait `.replace('{', …)`, que CodeQL relève en
          `js/incomplete-sanitization` — « ne remplace que la première
          occurrence ». Ici c'était voulu, mais un code qui RESSEMBLE à une
          sanitisation incomplète finit par être lu comme tel, par une machine
          comme par un humain. Découper explicitement dit l'intention. */
    const enveloppeJson = JSON.stringify(enveloppe());
    const charge = JSON.parse(`{"__proto__":{"pollue":"oui"},${enveloppeJson.slice(1)}`) as unknown;

    await importFromJson(charge);

    expect(({} as Record<string, unknown>)['pollue']).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('pollue');
  });

  it('une habitude portant __proto__ et constructor n’altère rien', async () => {
    const brute = JSON.parse(`{
      "app": "Habitum", "v": 5, "exported": "2026-08-05T12:00:00.000Z",
      "obj": [], "log": {}, "tasks": [],
      "habits": [{
        "id": "h1", "fr": "Marcher", "en": "Walk", "cat": "health",
        "g": { "k": "check", "t": 1, "step": 1, "fr": "", "en": "" },
        "mode": "dow", "days": [0,1,2,3,4,5,6], "sub": [], "rem": [],
        "arch": false, "note": "",
        "__proto__": { "pollueHabitude": "oui" },
        "constructor": { "prototype": { "pollueConstructeur": "oui" } }
      }]
    }`) as unknown;

    const rapport = await importFromJson(brute);

    /* L'habitude entre — les clés hostiles ne sont pas au schéma, et zod les
       laisse à la porte sans refuser l'entité pour autant. */
    expect(rapport.byEntity.habits.kept).toBe(1);
    const gardee = (await habitsRepo.list())[0];
    expect(gardee?.name).toBe('Marcher');

    expect(({} as Record<string, unknown>)['pollueHabitude']).toBeUndefined();
    expect(({} as Record<string, unknown>)['pollueConstructeur']).toBeUndefined();
    /* Et l'entité écrite ne transporte pas les clés hostiles. */
    expect(Object.keys(gardee ?? {})).not.toContain('__proto__');
  });

  /* Le journal est un objet CLÉ → VALEUR, construit à partir de chaînes venues
     du fichier. C'est le seul endroit où une clé d'attaquant devient une clé
     d'objet, donc le seul où la pollution serait structurellement possible. */
  it('une clé de journal nommée __proto__ est écartée, pas écrite', async () => {
    const charge = JSON.parse(`{
      "app": "Habitum", "v": 5, "exported": "2026-08-05T12:00:00.000Z",
      "habits": [], "tasks": [], "obj": [],
      "log": { "__proto__|2026-08-05": 1, "constructor|2026-08-05": 1 }
    }`) as unknown;

    await importFromJson(charge);

    expect(({} as Record<string, unknown>)['2026-08-05']).toBeUndefined();
    /* Aucune habitude ne porte ces identifiants : les lignes sont orphelines et
       doivent être écartées, quel que soit leur nom. */
    expect(await db.logs.count()).toBe(0);
  });
});

describe('plafond de taille', () => {
  it('refuse un fichier au-delà du plafond, avec le code TOO_BIG', async () => {
    /* Construit UNE fois : au plafond actuel, chaque sérialisation coûte
       plusieurs dizaines de mégaoctets. */
    const gros = JSON.stringify(enveloppe({ note: 'x'.repeat(MAX_IMPORT_BYTES) }));
    expect(gros.length).toBeGreaterThan(MAX_IMPORT_BYTES);

    await expect(importFromJson(gros)).rejects.toThrow(ImportError);
    await expect(importFromJson(gros)).rejects.toMatchObject({ code: 'TOO_BIG' });
  });

  /* Le refus arrive AVANT l'analyse : c'est ce qui protège d'un fichier
     hostile de plusieurs centaines de mégaoctets. Un JSON volontairement
     illisible ET trop gros doit donc échouer sur la TAILLE, pas sur la
     syntaxe — preuve que rien n'a été parsé. */
  it('refuse sur la taille avant même de tenter l’analyse', async () => {
    const enorme = `{"app":"Habitum"` + 'x'.repeat(MAX_IMPORT_BYTES);
    await expect(importFromJson(enorme)).rejects.toMatchObject({ code: 'TOO_BIG' });
  });

  /* LE PLAFOND DOIT DÉPASSER CE QUE LE PRODUIT PRODUIT LUI-MÊME.
   *
   * Il valait 2 Mo, et l'export à la charge documentée du plan — 200 habitudes
   * × 3 ans — pèse 10,6 Mo : l'utilisateur téléchargeait une sauvegarde que
   * l'application refusait de relire. Sans compte, l'export EST la sauvegarde ;
   * le garde-fou détruisait ce qu'il devait protéger.
   *
   * Le calcul est refait ici plutôt que recopié : si le format d'export
   * change — une clé de plus par entrée, `ov` retiré — le chiffre suit, et le
   * test dit toujours la vérité. */
  it('accepte un export à la charge documentée du plan', () => {
    const NB_HABITUDES = 200;
    const NB_JOURS = 365 * 3;

    /* Une ligne du journal sérialisé par `JSON.stringify(export, null, 2)` :
       quatre espaces d'indentation, la clé `habitId|AAAA-MM-JJ`, la valeur, la
       virgule, et le saut de ligne (le `+ 1`). */
    const ligne = '    "c199|2026-08-05": 1,'.length + 1;
    /* `log` et `ov` portent le MÊME objet, sous deux noms (G1). */
    const octets = NB_HABITUDES * NB_JOURS * ligne * 2;

    expect(octets).toBeGreaterThan(10 * 1024 * 1024);
    expect(
      MAX_IMPORT_BYTES,
      `un export de ${Math.round(octets / 1024 / 1024)} Mo doit pouvoir être relu`,
    ).toBeGreaterThan(octets);
  });
});

describe('charges malformées', () => {
  it('refuse un JSON illisible avec le code JSON', async () => {
    await expect(importFromJson('{{{')).rejects.toMatchObject({ code: 'JSON' });
  });

  it('refuse un JSON valide qui n’est pas un export Habitum', async () => {
    await expect(importFromJson('{"bonjour":"monde"}')).rejects.toMatchObject({ code: 'FORMAT' });
    await expect(importFromJson('[]')).rejects.toMatchObject({ code: 'FORMAT' });
    await expect(importFromJson('null')).rejects.toMatchObject({ code: 'FORMAT' });
  });

  /* Un refus ne doit jamais laisser la base à moitié peuplée : l'écriture tient
     dans UNE transaction. On sème d'abord, on refuse ensuite, et ce qui existait
     doit être intact. */
  it('un refus n’écrit rien et ne détruit rien', async () => {
    await habitsRepo.create({
      name: 'Existante',
      category: 'health',
      goal: { kind: 'check', target: 1, step: 1, unit: '' },
      mode: 'dow',
      days: [0, 1, 2, 3, 4, 5, 6],
      subItems: [],
      reminders: [],
      archived: false,
      note: '',
    });

    await expect(importFromJson('{"pas":"un export"}')).rejects.toThrow(ImportError);

    const restantes = await habitsRepo.list();
    expect(restantes).toHaveLength(1);
    expect(restantes[0]?.name).toBe('Existante');
    expect(await tasksRepo.list()).toHaveLength(0);
  });
});
