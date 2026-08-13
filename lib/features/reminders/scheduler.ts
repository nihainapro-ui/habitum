import { cleRappel, rappelsRestants, type Habit, type LogIndex } from '@/lib/domain';

/* Planificateur de rappels — tâche 5.2.

   Il ne décide de rien : `lib/domain/reminders.ts` dit QUOI et QUAND, ce
   fichier arme les minuteries. C'est ce partage qui rend la règle testable
   sans navigateur.

   Repli assumé : tant que l'onglet est ouvert, `setTimeout` suffit et donne le
   rappel à la seconde près. Onglet fermé, c'est au service worker de prendre
   le relais (tâche 5.7) — et tant qu'il n'est pas là, l'interface ne promet
   pas ce que le produit ne tient pas : le libellé dit « quand Habitum est
   ouvert ».

   Deux garde-fous :

   1. **Dédoublonnage.** Deux onglets, ou un réarmement après une modification
      d'habitude, ne doivent pas notifier deux fois la même chose. La clé
      `habitude|jour|heure` est retenue le temps de la journée.
   2. **Borne.** Au-delà de `MAX_MINUTERIES` rappels en attente, on arme les
      plus proches. Cent minuteries ouvertes ne rendent pas l'application plus
      fiable, seulement plus lourde. */

/** Nombre maximal de minuteries armées simultanément. */
export const MAX_MINUTERIES = 24;

/** Délai au-delà duquel `setTimeout` n'est plus fiable (~24,8 jours pour un
 *  entier 32 bits ; on reste très en deçà, la journée suffit). */
const HORIZON_MS = 24 * 60 * 60 * 1000;

export interface OptionsPlanificateur {
  habits: readonly Habit[];
  log: LogIndex;
  /** Envoi effectif. Injecté pour que le planificateur soit testable sans
   *  API de notification. */
  envoyer: (rappel: { habitId: string; name: string; time: string }) => void;
  now?: () => Date;
}

/** Rappels déjà envoyés, par clé `habitude|jour|heure`. Vidé au changement de
 *  jour : la clé porte la date, les entrées d'hier ne servent plus. */
const dejaEnvoyes = new Set<string>();

/** Réarme depuis zéro et rend la fonction d'arrêt.
 *
 *  Appeler `planifier` à nouveau ne cumule pas : l'appelant arrête toujours la
 *  planification précédente (c'est ce que fait le nettoyage de `useEffect`). */
export function planifier(options: OptionsPlanificateur): () => void {
  const maintenant = options.now?.() ?? new Date();
  const prevus = rappelsRestants(options.habits, options.log, maintenant)
    .filter((r) => !dejaEnvoyes.has(cleRappel(r, maintenant)))
    .slice(0, MAX_MINUTERIES);

  const minuteries = prevus.map((r) => {
    const delai = Math.min(HORIZON_MS, Math.max(0, r.at - maintenant.getTime()));
    return setTimeout(() => {
      const cle = cleRappel(r, new Date(r.at));
      if (dejaEnvoyes.has(cle)) return;
      dejaEnvoyes.add(cle);
      options.envoyer(r);
    }, delai);
  });

  return () => {
    for (const m of minuteries) clearTimeout(m);
  };
}

/** Oublie les rappels déjà envoyés. Utile aux tests, et au changement de
 *  profil — un autre profil, d'autres habitudes. */
export function oublierRappelsEnvoyes(): void {
  dejaEnvoyes.clear();
}
