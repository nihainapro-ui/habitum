import type { Canal, RappelPret } from './canal';

/* Canal des MINUTERIES — le chemin du navigateur, PC compris.
 *
 * Il descend en droite ligne de `scheduler.ts` (tâche 5.2), dont il garde les
 * deux garde-fous, et il en généralise la portée : ce qu'il arme n'est plus
 * un rappel d'habitude mais un rappel, quelle que soit sa source.
 *
 * SA LIMITE EST STRUCTURELLE, et l'interface la dit : `setTimeout` meurt avec
 * l'onglet. Tant qu'Habitum est ouvert, le rappel tombe à la seconde près ;
 * fermé, il ne tombe pas. C'est pour cela que le canal natif existe, et c'est
 * pour cela que l'écran continue d'afficher « quand Habitum est ouvert » —
 * mais seulement là où c'est vrai.
 *
 * Deux garde-fous, hérités et inchangés :
 *
 * 1. **Dédoublonnage.** Deux onglets, ou une reprogrammation après une
 *    modification, ne doivent pas notifier deux fois la même chose. La clé du
 *    domaine porte déjà la source, l'entité, le jour et l'heure : elle suffit.
 * 2. **Borne.** Au-delà de `MAX_MINUTERIES` rappels en attente, on arme les
 *    plus proches. Cent minuteries ouvertes ne rendent pas l'application plus
 *    fiable, seulement plus lourde. */

/** Nombre maximal de minuteries armées simultanément. */
export const MAX_MINUTERIES = 24;

/** Délai au-delà duquel `setTimeout` n'est plus fiable (~24,8 jours pour un
 *  entier 32 bits ; on reste très en deçà, la journée suffit). */
const HORIZON_MS = 24 * 60 * 60 * 1000;

/** Rappels déjà envoyés, par clé. La clé porte le jour : les entrées d'hier ne
 *  peuvent pas bloquer celles d'aujourd'hui. */
const dejaEnvoyes = new Set<string>();

/** Oublie les rappels déjà envoyés. Utile aux tests, et au changement de
 *  profil — un autre profil, d'autres rappels. */
export function oublierRappelsEnvoyes(): void {
  dejaEnvoyes.clear();
}

export function creerCanalMinuteries(envoyer: (r: RappelPret) => void): Canal {
  let minuteries: ReturnType<typeof setTimeout>[] = [];

  const arreter = async (): Promise<void> => {
    for (const m of minuteries) clearTimeout(m);
    minuteries = [];
  };

  return {
    horizonJours: 1,
    arreter,

    async programmer(rappels) {
      await arreter();
      const maintenant = Date.now();

      minuteries = rappels
        .filter((r) => !dejaEnvoyes.has(r.cle) && r.at > maintenant)
        .slice(0, MAX_MINUTERIES)
        .map((r) => {
          const delai = Math.min(HORIZON_MS, Math.max(0, r.at - maintenant));
          return setTimeout(() => {
            /* Revérifié À L'INSTANT DE L'ENVOI et pas seulement à l'armement :
               deux onglets arment chacun le leur, et seul le premier arrivé
               doit notifier. */
            if (dejaEnvoyes.has(r.cle)) return;
            dejaEnvoyes.add(r.cle);
            envoyer(r);
          }, delai);
        });
    },
  };
}
