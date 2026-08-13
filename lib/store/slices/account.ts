import type { StateCreator } from 'zustand';
import { dateKey, today, type Profile } from '@/lib/domain';
import {
  exportToJson,
  importFromJson,
  META_KEYS,
  metaRepo,
  profilesRepo,
  resetAll,
  type ImportReport,
} from '@/lib/data';
import { chargerTout } from '../hydrate';
import type { AccountActions, AppState } from '../types';

/* Compte : profils, export, import, réinitialisation.

   Import et réinitialisation touchent TOUTES les tables. Après elles, on
   recharge l'état complet plutôt que de rapiécer le store : une écriture
   massive suivie d'une mise à jour partielle est exactement ce qui laisse une
   interface qui n'affiche plus ce que contient la base. */

/** Teintes d'avatar du prototype (`HUES`), 04-DESIGN-TOKENS.md. */
const TEINTES = [188, 214, 266, 318, 158, 32];

export const createAccountSlice: StateCreator<AppState, [], [], AccountActions> = (set, get) => ({
  async createProfile(name: string): Promise<void> {
    const propre = name.trim();
    if (!propre) return;
    const rang = get().profiles.length;
    const profil = await profilesRepo.create({
      name: propre,
      handle: propre
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .slice(0, 16),
      glyph: '◉',
      hue: TEINTES[rang % TEINTES.length] ?? 188,
      role: 0,
      since: dateKey(today()),
    });
    set((s) => ({ profiles: [...s.profiles, profil] }));
    await get().setActiveProfile(profil.id);
  },

  async updateProfile(id: string, patch: Partial<Profile>): Promise<void> {
    const suivant = await profilesRepo.update(id, patch);
    if (!suivant) return;
    set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? suivant : p)) }));
  },

  /* Le dernier profil ne se supprime pas : un compte sans profil n'a plus de
     titulaire, et l'amorçage en recréerait un vide au rechargement suivant. */
  async deleteProfile(id: string): Promise<void> {
    if (get().profiles.length <= 1) return;
    await profilesRepo.softDelete(id);

    const restants = get().profiles.filter((p) => p.id !== id);
    set({ profiles: restants });
    if (get().activeProfileId === id && restants[0]) {
      await get().setActiveProfile(restants[0].id);
    }
  },

  /* Un export réussi remet le compteur du rappel à zéro (D8) : c'est le seul
     endroit qui sait qu'une sauvegarde a réellement été produite. */
  async exportJson(): Promise<string> {
    const charge = JSON.stringify(await exportToJson(), null, 2);
    const jour = dateKey(today());
    await metaRepo.set(META_KEYS.lastExport, jour);
    set({ lastExport: jour });
    return charge;
  },

  async dismissExportNag(): Promise<void> {
    await metaRepo.set(META_KEYS.nagDismissed, true);
    set({ nagDismissed: true });
  },

  async importJson(charge: string): Promise<ImportReport> {
    const rapport = await importFromJson(charge);
    set(await chargerTout());
    return rapport;
  },

  async resetAccount(): Promise<void> {
    await resetAll();
    set(await chargerTout());
  },
});
