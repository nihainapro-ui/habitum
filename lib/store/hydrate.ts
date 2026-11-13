import {
  DEFAULT_SETTINGS,
  META_KEYS,
  goalsRepo,
  habitsRepo,
  loadLogIndexComplet,
  loadLogIndexOuverture,
  memoriserOuverture,
  metaRepo,
  notesRepo,
  profilesRepo,
  sessionsRepo,
  projectsRepo,
  projectTasksRepo,
  shoppingRepo,
  tasksRepo,
} from '@/lib/data';
import type { DateKey, Settings } from '@/lib/domain';
import type { DataState } from './types';

/** Journal COMPLET relu depuis la table, avec son filigrane — sert à compléter
 *  une ouverture de repli, puis à enregistrer l'instantané. */
export const completerJournal = loadLogIndexComplet;

/** Enregistre l'instantané d'ouverture (tâche 5.10). */
export const memoriserJournal = memoriserOuverture;

/** Complète en fond un index du journal encore partiel, puis l'enregistre.
 *
 *  Trois appelants — l'ouverture, la synchronisation, l'annulation — et une
 *  seule règle, qui est tout l'intérêt de la mettre ici : CE QUI EST EN
 *  MÉMOIRE FAIT AUTORITÉ. Une coche posée pendant la relecture ne doit pas
 *  être écrasée par ce que la base contenait une seconde plus tôt. */
export async function completerJournalEnFond(
  set: (p: Pick<DataState, 'logIndex' | 'logIndexComplete'>) => void,
  get: () => Pick<DataState, 'logIndex'>,
): Promise<void> {
  const { index, watermark } = await loadLogIndexComplet();
  const complet = new Map([...index, ...get().logIndex]);
  set({ logIndex: complet, logIndexComplete: true });
  await memoriserOuverture(complet, watermark);
}

/** Relit tout après une écriture massive (import, restauration,
 *  réinitialisation) et rend le seul état de données.
 *
 *  Le filigrane et le drapeau « déjà à jour » ne concernent QUE l'ouverture :
 *  les laisser entrer dans le store y déposerait deux champs que personne ne
 *  lit et qu'il faudrait maintenir. */
export async function rechargerDonnees(): Promise<DataState> {
  const { watermark: _w, aJour: _a, ...donnees } = await chargerTout();
  return donnees;
}

/** Charge tout l'état persistant en une passe.
 *
 *  Une seule vague de lectures parallèles : à l'ouverture, l'utilisateur attend
 *  l'écran, pas neuf allers-retours en série.
 *
 *  Le journal passe par `loadLogIndexOuverture` : instantané + delta quand il
 *  existe un instantané, fenêtre récente sinon (tâche 5.10). L'état rendu porte
 *  donc deux informations de plus — le filigrane à mémoriser, et si l'instantané
 *  enregistré est déjà à jour. */
export async function chargerTout(): Promise<DataState & { watermark: string; aJour: boolean }> {
  const [
    habits,
    tasks,
    goals,
    notes,
    sessions,
    shopping,
    profiles,
    projects,
    projectTasks,
    ouverture,
    reglages,
    demo,
    actif,
    dernierExport,
    refuse,
    accueilFranchi,
    occurrences,
    copie,
    verrou,
  ] = await Promise.all([
    habitsRepo.list(),
    tasksRepo.list(),
    goalsRepo.list(),
    notesRepo.list(),
    sessionsRepo.list(),
    shoppingRepo.list(),
    profilesRepo.list(),
    projectsRepo.list(),
    projectTasksRepo.list(),
    loadLogIndexOuverture(),
    metaRepo.get<Partial<Settings>>(META_KEYS.settings),
    metaRepo.get<boolean>(META_KEYS.demo),
    metaRepo.get<string>(META_KEYS.activeProfile),
    metaRepo.get<DateKey>(META_KEYS.lastExport),
    metaRepo.get<boolean>(META_KEYS.nagDismissed),
    metaRepo.get<boolean>(META_KEYS.onboarded),
    metaRepo.get<Record<string, number>>(META_KEYS.occ),
    metaRepo.get<{ at: string }>(META_KEYS.backup),
    metaRepo.get<{ credentialId: string; at: string }>(META_KEYS.bioLock),
  ]);

  /* Les réglages enregistrés priment, mais un réglage ajouté après coup ne doit
     pas rendre l'état incomplet : les valeurs par défaut comblent les trous. */
  const settings: Settings = { ...DEFAULT_SETTINGS, ...(reglages ?? {}) };

  const activeProfileId =
    actif && profiles.some((p) => p.id === actif) ? actif : (profiles[0]?.id ?? null);

  return {
    habits,
    tasks,
    goals,
    notes,
    sessions,
    shopping,
    profiles,
    projects,
    projectTasks,
    logIndex: ouverture.index,
    logIndexComplete: ouverture.complete,
    watermark: ouverture.watermark,
    aJour: ouverture.aJour,
    /* Le format persisté est un objet `{ clé: 1 }` (G1) ; l'interface, elle,
       ne pose qu'une question — « cette occurrence est-elle faite ? ». D'où un
       ensemble, où la réponse coûte un accès au lieu d'un balayage. */
    occurrences: new Set(
      Object.entries(occurrences ?? {})
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k),
    ),
    settings,
    activeProfileId,
    isDemo: demo === true,
    lastExport: dernierExport ?? null,
    nagDismissed: refuse === true,
    onboarded: accueilFranchi === true,
    backupAt: copie?.at ?? null,
    /* Un `bioLock` sans identifiant est un verrou qui ne peut pas s'ouvrir :
       on le tient pour absent plutôt que d'enfermer l'utilisateur dehors. */
    lockCredentialId: verrou?.credentialId || null,
  };
}
