import {
  DEFAULT_SETTINGS,
  META_KEYS,
  goalsRepo,
  habitsRepo,
  loadLogIndex,
  metaRepo,
  notesRepo,
  profilesRepo,
  sessionsRepo,
  shoppingRepo,
  tasksRepo,
} from '@/lib/data';
import type { DateKey, Settings } from '@/lib/domain';
import type { DataState } from './types';

/** Charge tout l'état persistant en une passe.
 *
 *  Une seule vague de lectures parallèles : à l'ouverture, l'utilisateur attend
 *  l'écran, pas neuf allers-retours en série. */
export async function chargerTout(): Promise<DataState> {
  const [
    habits,
    tasks,
    goals,
    notes,
    sessions,
    shopping,
    profiles,
    logIndex,
    reglages,
    demo,
    actif,
    dernierExport,
    refuse,
    accueilFranchi,
    occurrences,
    copie,
  ] = await Promise.all([
    habitsRepo.list(),
    tasksRepo.list(),
    goalsRepo.list(),
    notesRepo.list(),
    sessionsRepo.list(),
    shoppingRepo.list(),
    profilesRepo.list(),
    loadLogIndex(),
    metaRepo.get<Partial<Settings>>(META_KEYS.settings),
    metaRepo.get<boolean>(META_KEYS.demo),
    metaRepo.get<string>(META_KEYS.activeProfile),
    metaRepo.get<DateKey>(META_KEYS.lastExport),
    metaRepo.get<boolean>(META_KEYS.nagDismissed),
    metaRepo.get<boolean>(META_KEYS.onboarded),
    metaRepo.get<Record<string, number>>(META_KEYS.occ),
    metaRepo.get<{ at: string }>(META_KEYS.backup),
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
    logIndex,
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
  };
}
