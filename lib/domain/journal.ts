import type { DateKey, Note, Session } from './types';

/* Sélections du journal et des sessions.

   Ce ne sont pas de simples filtres d'affichage : ce sont des RÈGLES. « Quelles
   notes composent l'historique », « qu'est-ce qu'une note d'habitude qui
   compte », « que trouve une recherche » — trois questions dont la réponse doit
   être la même dans la vue Notes, dans le tableau de bord et demain dans
   l'export. Écrites dans un composant, elles auraient trois réponses (G2). */

/** Note de journal réellement datée. Le type large de `Note` autorise une note
 *  sans date ; l'historique, lui, ne peut rien en faire. */
export type NoteDatee = Note & { date: DateKey };

const estDatee = (n: Note): n is NoteDatee => n.kind === 'journal' && Boolean(n.date);

/** Historique du journal, du plus récent au plus ancien.
 *  G3 : seules les entrées ÉCRITES y figurent — aucun jour n'est fabriqué. */
export const journalHistory = (notes: readonly Note[]): NoteDatee[] =>
  notes.filter(estDatee).sort((a, b) => b.date.localeCompare(a.date));

/** Notes d'habitude non vides. Une note effacée devient une chaîne vide avant
 *  d'être supprimée : la lister ferait apparaître une ligne sans contenu. */
export const habitNotes = (notes: readonly Note[]): Note[] =>
  notes.filter((n) => n.kind === 'habit' && n.body.trim().length > 0);

/** Recherche plein texte, insensible à la casse. Même règle que
 *  `notesRepo.search`, dont c'est la version en mémoire. */
export function searchNotes(notes: readonly Note[], query: string): Note[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return notes.filter((n) => n.body.toLowerCase().includes(q));
}

/** Sessions d'une journée, dans l'ordre où elles ont été enregistrées. */
export const sessionsOfDay = (sessions: readonly Session[], date: DateKey): Session[] =>
  sessions.filter((s) => s.date === date);

/** Les `limite` dernières sessions, la plus récente en tête. */
export const recentSessions = (sessions: readonly Session[], limite: number): Session[] =>
  [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, Math.max(0, limite));
