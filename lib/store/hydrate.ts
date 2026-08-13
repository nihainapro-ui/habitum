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
    settings,
    activeProfileId,
    isDemo: demo === true,
    lastExport: dernierExport ?? null,
    nagDismissed: refuse === true,
  };
}
