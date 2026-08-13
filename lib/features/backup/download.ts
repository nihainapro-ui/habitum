import { exportToJson } from '@/lib/data';

/* Écriture d'un fichier de sauvegarde depuis le navigateur.

   Sans compte, l'export EST la sauvegarde : ce chemin doit fonctionner même
   quand le reste ne fonctionne plus. Il ne dépend donc ni du store, ni de
   l'internationalisation, ni d'un composant — seulement de la base et du DOM.

   L'URL objet est révoquée aussitôt : aucune donnée ne transite par un serveur,
   et le fichier ne reste pas en mémoire. */

/** Nom de fichier daté — `habitum-2026-08-13.json`. */
export const nomFichierSauvegarde = (now: Date = new Date()): string =>
  `habitum-${now.toISOString().slice(0, 10)}.json`;

/** Déclenche le téléchargement d'une charge déjà sérialisée. */
export function telechargerJson(charge: string, nom = nomFichierSauvegarde()): void {
  const url = URL.createObjectURL(new Blob([charge], { type: 'application/json' }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nom;
  lien.click();
  URL.revokeObjectURL(url);
}

/** Exporte SANS passer par le store — chemin de secours de l'écran d'erreur.
 *  Le store peut être exactement ce qui a échoué ; la base, elle, répond
 *  encore dans l'immense majorité des pannes de rendu. */
export async function exporterDirect(): Promise<void> {
  telechargerJson(JSON.stringify(await exportToJson(), null, 2));
}
