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
  /** Efface TOUT l'espace sur le relais. Le seul geste par lequel ce qui est
   *  parti peut revenir en arrière — sans lui, désappairer rend l'appareil
   *  muet mais laisse les octets sur le relais indéfiniment. */
  effacer(espace: string): Promise<void>;
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

  try {
    return (await reponse.json()) as T;
  } catch (cause) {
    /* Un corps illisible sur une réponse par ailleurs valide : coupure en plein
       transfert, réponse tronquée par un intermédiaire. Ce n'est pas une panne du
       serveur mais bien un incident de transport — le genre `reseau` le range du
       côté des choses qui se réessaient toutes seules. */
    throw new SyncErreur('reseau', `corps illisible : ${String(cause)}`);
  }
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
    effacer: async (espace) => {
      await appeler<{ seq: number }>(`${racine}/v1/${espace}`, { method: 'DELETE' });
    },
  };
}
