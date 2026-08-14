import { afterEach, describe, expect, it, vi } from 'vitest';
import { notifier } from '@/lib/features/reminders/permission';

/* Tâche 5.2 — par où passe une notification, et pourquoi cela compte.

   Sur Android, `new Notification()` LÈVE : Chrome mobile n'accepte que les
   notifications persistantes, celles qu'affiche l'enregistrement du service
   worker. Le chemin direct ne servait donc que le bureau, et la fonction était
   silencieusement morte sur mobile — le genre de défaut qu'aucun test de vue ne
   voit, parce qu'il n'y a rien à voir. */

/* `navigator` est en lecture seule sur `globalThis` sous Node : on le REDÉFINIT
   plutôt que de l'affecter. */
const poserGlobal = (nom: string, valeur: unknown): void => {
  Object.defineProperty(globalThis, nom, { value: valeur, configurable: true, writable: true });
};

const retirerGlobal = (nom: string): void => {
  Reflect.deleteProperty(globalThis, nom);
};

/** Pose un environnement de navigateur minimal. */
function poser({
  permission = 'granted',
  avecServiceWorker = true,
  showNotification = vi.fn(async () => undefined),
  constructeurLeve = false,
}: {
  permission?: NotificationPermission;
  avecServiceWorker?: boolean;
  showNotification?: ReturnType<typeof vi.fn>;
  constructeurLeve?: boolean;
} = {}) {
  const construit = vi.fn();
  const FauxNotification = function (this: unknown, titre: string, options?: unknown) {
    if (constructeurLeve) throw new TypeError('Illegal constructor');
    construit(titre, options);
  } as unknown as typeof Notification;
  Object.defineProperty(FauxNotification, 'permission', { value: permission, configurable: true });

  poserGlobal('window', { Notification: FauxNotification });
  poserGlobal('Notification', FauxNotification);
  poserGlobal(
    'navigator',
    avecServiceWorker ? { serviceWorker: { ready: Promise.resolve({ showNotification }) } } : {},
  );

  return { construit, showNotification };
}

afterEach(() => {
  for (const nom of ['window', 'navigator', 'Notification']) retirerGlobal(nom);
  vi.restoreAllMocks();
});

describe('notifier', () => {
  it('passe par le SERVICE WORKER quand il y en a un', async () => {
    const { showNotification, construit } = poser();

    await expect(notifier('Méditer', 'C’est l’heure.', 'rappel-med')).resolves.toBe(true);

    expect(showNotification).toHaveBeenCalledWith(
      'Méditer',
      expect.objectContaining({ body: 'C’est l’heure.', tag: 'rappel-med' }),
    );
    /* Le chemin direct n'est même pas tenté : il lèverait sur Android. */
    expect(construit).not.toHaveBeenCalled();
  });

  it('retombe sur le chemin direct sans service worker — le cas du développement', async () => {
    const { construit } = poser({ avecServiceWorker: false });

    await expect(notifier('Méditer', '', 'rappel-med')).resolves.toBe(true);
    expect(construit).toHaveBeenCalledOnce();
  });

  it('rend `false` quand rien n’a pu être affiché', async () => {
    poser({ avecServiceWorker: false, constructeurLeve: true });
    await expect(notifier('Méditer', '', 'rappel-med')).resolves.toBe(false);
  });

  it('n’affiche RIEN sans permission accordée', async () => {
    const { showNotification, construit } = poser({ permission: 'default' });

    await expect(notifier('Méditer', '', 'rappel-med')).resolves.toBe(false);
    expect(showNotification).not.toHaveBeenCalled();
    expect(construit).not.toHaveBeenCalled();
  });

  it('omet le corps quand il est vide — une notification sans texte inutile', async () => {
    const { showNotification } = poser();

    await notifier('Concentration terminée', '', 'phase-focus');

    expect(showNotification.mock.calls[0]?.[1]).not.toHaveProperty('body');
  });
});
