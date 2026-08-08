import type { StateCreator } from 'zustand';
import { sessionsRepo } from '@/lib/data';
import type { AppState, SessionsActions } from '../types';

/* G3 — les minutes de focus agrègent des sessions RÉELLEMENT enregistrées.
   `focusMin_()` du prototype les fabriquait par hachage ; un compte sans
   session affiche 0, et c'est la bonne réponse. */

export const createSessionsSlice: StateCreator<AppState, [], [], SessionsActions> = (set) => ({
  async createSession(input) {
    const s = await sessionsRepo.create(input);
    set((etat) => ({ sessions: [...etat.sessions, s] }));
  },

  async deleteSession(id) {
    await sessionsRepo.softDelete(id);
    set((etat) => ({ sessions: etat.sessions.filter((s) => s.id !== id) }));
  },
});
