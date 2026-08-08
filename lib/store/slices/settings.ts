import type { StateCreator } from 'zustand';
import { META_KEYS, metaRepo } from '@/lib/data';
import type { AppState, SettingsActions } from '../types';

/* Les réglages vivent dans la table `meta`, sous la clé `settings`. Comme tout
   le reste : écriture au dépôt d'abord, store ensuite. */

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsActions> = (set, get) => ({
  async setSetting(key, value) {
    const suivants = { ...get().settings, [key]: value };
    await metaRepo.set(META_KEYS.settings, suivants);
    set({ settings: suivants });
  },

  async setActiveProfile(id) {
    if (!get().profiles.some((p) => p.id === id)) return;
    await metaRepo.set(META_KEYS.activeProfile, id);
    set({ activeProfileId: id });
  },
});
