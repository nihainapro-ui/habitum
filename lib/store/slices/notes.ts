import type { StateCreator } from 'zustand';
import { notesRepo } from '@/lib/data';
import type { AppState, NotesActions } from '../types';

/* G3 — un jour sans note est VIDE. Le prototype fabriquait un texte pour les
   jours sans entrée ; ce générateur a été neutralisé au lot 2, et le test de
   `tests/unit/data/seed.test.ts` échoue si un équivalent réapparaît dans lib/.
   Ici, écrire une chaîne vide EFFACE la note plutôt que d'en créer une vide :
   l'historique du journal ne doit lister que ce que l'utilisateur a écrit. */

export const createNotesSlice: StateCreator<AppState, [], [], NotesActions> = (set, get) => ({
  async saveJournal(date, body, mood) {
    const existante = get().notes.find((n) => n.kind === 'journal' && n.date === date);

    if (!body.trim() && mood === undefined) {
      if (existante) await get().deleteNote(existante.id);
      return;
    }

    if (existante) {
      const suivante = await notesRepo.update(existante.id, {
        body,
        ...(mood === undefined ? {} : { mood }),
      });
      if (!suivante) return;
      set((s) => ({ notes: s.notes.map((n) => (n.id === existante.id ? suivante : n)) }));
      return;
    }

    const creee = await notesRepo.create({
      kind: 'journal',
      date,
      body,
      ...(mood === undefined ? {} : { mood }),
    });
    set((s) => ({ notes: [...s.notes, creee] }));
  },

  async saveHabitNote(habitId, body) {
    const existante = get().notes.find((n) => n.kind === 'habit' && n.habitId === habitId);

    if (!body.trim()) {
      if (existante) await get().deleteNote(existante.id);
      return;
    }

    if (existante) {
      const suivante = await notesRepo.update(existante.id, { body });
      if (!suivante) return;
      set((s) => ({ notes: s.notes.map((n) => (n.id === existante.id ? suivante : n)) }));
      return;
    }

    const creee = await notesRepo.create({ kind: 'habit', habitId, body });
    set((s) => ({ notes: [...s.notes, creee] }));
  },

  async deleteNote(id) {
    await notesRepo.softDelete(id);
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
  },
});
