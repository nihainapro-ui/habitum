import {
  addDays,
  dateKey,
  today,
  type Goal,
  type Habit,
  type Note,
  type Project,
  type ProjectTask,
  type Session,
  type ShoppingItem,
  type Task,
} from '@/lib/domain';
import {
  FENETRE_OUVERTURE,
  META_KEYS,
  goalsRepo,
  habitsRepo,
  logsRepo,
  metaRepo,
  notesRepo,
  projectsRepo,
  projectTasksRepo,
  sessionsRepo,
  shoppingRepo,
  tasksRepo,
} from '@/lib/data';
import { logError } from '@/lib/logger';
import { cacheDerive } from './derived';
import { completerJournalEnFond, rechargerDonnees } from './hydrate';
import type { AppState, DataState } from './types';

/* ============================================================================
   Annulation.

   Le prototype prenait un `snapshot()` de tout l'état avant une action
   destructrice et l'exposait dans un toast. On garde ce principe, avec une
   exigence de plus, écrite noir sur blanc dans le plan : **l'instantané couvre
   l'entité ET ses dépendances**. Supprimer une habitude sans restaurer son
   journal serait une perte de données déguisée en annulation.

   L'annulation réécrit dans les DÉPÔTS avant de remettre le store à jour : une
   annulation qui ne rétablit que l'écran se découvre au rechargement suivant.

   PAR DIFFÉRENCE — 12 novembre 2026. Jusqu'ici, annuler réécrivait TOUTE la
   base : chaque habitude, chaque tâche, chaque ligne de journal, même pour une
   coche. Quatre conséquences, dont trois étaient des pertes de données :

   1. **Chaque ligne réécrite prenait l'heure de l'annulation.** Avec la
      synchronisation, l'appareil repoussait alors toute sa base, et gagnait
      tous les arbitrages contre ce qu'un autre appareil avait modifié depuis.
   2. **Un journal encore partiel passait pour le journal entier.** À
      l'ouverture sans instantané, seuls 420 jours sont en mémoire le temps que
      le reste arrive ; tout ce que la base contenait au-delà était pris pour
      « apparu depuis » et recevait une pierre tombale.
   3. **Ce qui s'était passé entre l'action et son annulation était défait
      avec elle** — une coche posée dans les six secondes, une ligne reçue
      d'un autre appareil.
   4. Projets, tâches de projet et occurrences étaient photographiés mais
      jamais restaurés : le toast disait « annulé », la base disait non.

   On compare donc deux états — juste AVANT l'action, juste APRÈS — et on ne
   défait que leur différence. Les objets du store ne sont jamais modifiés en
   place : deux références égales désignent une entité intacte.

   Écart assumé au plan : sa signature était `withUndo(label, action)`. Ici
   `set` et `get` sont passés explicitement — sans quoi ce module importerait le
   store, que le store importe déjà par ses tranches, et le cycle se refermerait.
   ========================================================================= */

type Set = (partial: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void;
type Get = () => AppState;

/** Durée d'affichage d'un toast annulable, en millisecondes. */
export const UNDO_MS = 6000;

/** Ce qu'une action annulable peut toucher. L'interface (`ui`) n'en fait pas
 *  partie : annuler une suppression ne doit pas ramener l'utilisateur sur
 *  l'écran d'avant. Réglages, profils et drapeaux non plus — aucune action
 *  annulable ne les écrit. */
export type Snapshot = Pick<
  DataState,
  | 'habits'
  | 'tasks'
  | 'goals'
  | 'notes'
  | 'sessions'
  | 'shopping'
  | 'projects'
  | 'projectTasks'
  | 'logIndex'
  | 'occurrences'
  | 'logIndexComplete'
>;

const CHAMPS = [
  'habits',
  'tasks',
  'goals',
  'notes',
  'sessions',
  'shopping',
  'projects',
  'projectTasks',
  'logIndex',
  'occurrences',
] as const satisfies readonly (keyof Snapshot)[];

let minuterie: ReturnType<typeof setTimeout> | null = null;

/** Retient les RÉFÉRENCES, sans rien copier. Le store ne modifie jamais un
 *  tableau ni un index en place — chaque écriture en pose un neuf — : garder
 *  la référence, c'est garder l'état. Copier l'index du journal à chaque coche
 *  coûtait 219 000 entrées pour une case. */
export function capturer(s: AppState): Snapshot {
  return {
    habits: s.habits,
    tasks: s.tasks,
    goals: s.goals,
    notes: s.notes,
    sessions: s.sessions,
    shopping: s.shopping,
    projects: s.projects,
    projectTasks: s.projectTasks,
    logIndex: s.logIndex,
    occurrences: s.occurrences,
    logIndexComplete: s.logIndexComplete,
  };
}

interface RepoRestaurable<T> {
  restore(id: string): Promise<void>;
  update(id: string, patch: Partial<T>): Promise<T | undefined>;
  softDelete(id: string): Promise<void>;
}

/** Défait, dans une collection, ce que l'action y a fait — et rien d'autre :
 *  ce qu'elle a créé repart, ce qu'elle a supprimé revient, ce qu'elle a
 *  modifié reprend ses valeurs. Une entité intacte n'est pas touchée. */
async function restaurerCollection<T extends { id: string }>(
  repo: RepoRestaurable<T>,
  avant: readonly T[],
  apres: readonly T[],
): Promise<void> {
  if (avant === apres) return;

  const parIdApres = new Map(apres.map((r) => [r.id, r]));
  const idsAvant = new Set(avant.map((r) => r.id));

  for (const r of apres) {
    if (!idsAvant.has(r.id)) await repo.softDelete(r.id);
  }
  for (const r of avant) {
    const devenue = parIdApres.get(r.id);
    if (devenue === r) continue;
    if (!devenue) await repo.restore(r.id);
    /* Un champ que l'action a AJOUTÉ doit repartir. `update` fusionne : sans
       ces `undefined`, déplacer une tâche sans heure vers un créneau horaire
       puis annuler lui laissait l'heure. */
    const ajoutes: Record<string, undefined> = {};
    for (const cle of Object.keys(devenue ?? {})) if (!(cle in r)) ajoutes[cle] = undefined;
    await repo.update(r.id, { ...ajoutes, ...r });
  }
}

/** Défait ce que l'action a fait au journal.
 *
 *  LE PIÈGE DU JOURNAL PARTIEL. Si l'index s'est complété PENDANT l'action,
 *  `apres` contient tout l'historique ancien que `avant` n'avait pas encore :
 *  ce ne sont pas des entrées « apparues », et leur poser une pierre tombale
 *  effacerait des années de suivi. Dans ce cas seul — rarissime, mais c'est le
 *  seul où une annulation détruirait — on ne retire que ce qui tombe dans la
 *  fenêtre d'ouverture, la seule que `avant` connaissait en entier. */
async function restaurerJournal(avant: Snapshot, apres: Snapshot): Promise<void> {
  if (avant.logIndex === apres.logIndex) return;

  const seuil =
    avant.logIndexComplete === apres.logIndexComplete
      ? ''
      : dateKey(addDays(today(), -FENETRE_OUVERTURE));

  for (const cle of apres.logIndex.keys()) {
    if (avant.logIndex.has(cle)) continue;
    const i = cle.indexOf('|');
    const date = cle.slice(i + 1);
    if (date < seuil) continue;
    await logsRepo.tombstone(cle.slice(0, i), date);
  }
  for (const [cle, valeur] of avant.logIndex) {
    if (apres.logIndex.get(cle) === valeur) continue;
    const i = cle.indexOf('|');
    await logsRepo.setValue(cle.slice(0, i), cle.slice(i + 1), valeur);
  }
}

/** Défait ce que l'action a fait aux occurrences — en partant de celles
 *  d'AUJOURD'HUI, pas de la photo : une occurrence cochée depuis reste. */
async function restaurerOccurrences(
  avant: ReadonlySet<string>,
  apres: ReadonlySet<string>,
  actuelles: ReadonlySet<string>,
): Promise<void> {
  if (avant === apres) return;
  const suivantes = new Set(actuelles);
  for (const cle of apres) if (!avant.has(cle)) suivantes.delete(cle);
  for (const cle of avant) if (!apres.has(cle)) suivantes.add(cle);

  /* Format persisté `{ clé: 1 }`, nom et forme figés (G1). */
  const objet: Record<string, number> = {};
  for (const cle of suivantes) objet[cle] = 1;
  await metaRepo.set(META_KEYS.occ, objet);
}

async function restaurer(avant: Snapshot, apres: Snapshot, actuel: AppState): Promise<void> {
  /* Une annulation réécrit journaux et définitions : le cache dérivé n'a plus
     aucune raison d'être cru. On l'oublie en entier — c'est un geste rare, et
     un cache incertain est un cache qu'on vide (tâche 5.9). */
  cacheDerive.clear();
  await restaurerCollection<Habit>(habitsRepo, avant.habits, apres.habits);
  await restaurerCollection<Task>(tasksRepo, avant.tasks, apres.tasks);
  await restaurerCollection<Goal>(goalsRepo, avant.goals, apres.goals);
  await restaurerCollection<Note>(notesRepo, avant.notes, apres.notes);
  await restaurerCollection<Session>(sessionsRepo, avant.sessions, apres.sessions);
  await restaurerCollection<ShoppingItem>(shoppingRepo, avant.shopping, apres.shopping);
  await restaurerCollection<Project>(projectsRepo, avant.projects, apres.projects);
  await restaurerCollection<ProjectTask>(projectTasksRepo, avant.projectTasks, apres.projectTasks);
  await restaurerJournal(avant, apres);
  await restaurerOccurrences(avant.occurrences, apres.occurrences, actuel.occurrences);
}

/** Exécute une action réversible et pose le toast qui permet de la défaire.
 *
 *  Un seul toast à la fois : le précédent est remplacé et sa minuterie annulée.
 *  Deux toasts empilés, c'est une annulation qu'on croit avoir et qu'on n'a pas. */
export async function withUndo<T>(
  set: Set,
  get: Get,
  toast: { messageKey: string; label: string },
  action: () => Promise<T>,
): Promise<T> {
  const avant = capturer(get());
  const resultat = await action();
  /* L'état juste APRÈS : la différence avec `avant` est l'effet de l'action,
     et de rien d'autre. Relevé ici et non à l'annulation — six secondes plus
     tard, d'autres gestes ont pu s'y ajouter, qui ne sont pas à défaire. */
  const apres = capturer(get());

  if (minuterie) clearTimeout(minuterie);

  get().showToast({
    ...toast,
    undo: async () => {
      if (minuterie) {
        clearTimeout(minuterie);
        minuterie = null;
      }
      const actuel = get();
      await restaurer(avant, apres, actuel);

      /* RIEN N'A BOUGÉ DEPUIS L'ACTION : l'état d'avant se repose tel quel,
         ordre des listes compris. Sinon — un autre geste, une synchronisation
         — la photo n'est plus l'état voulu : on relit la base, qui vient
         d'être corrigée et qui, elle, dit vrai. */
      if (CHAMPS.every((c) => actuel[c] === apres[c])) {
        const { logIndexComplete: _c, ...champs } = avant;
        set(champs);
      } else {
        const donnees = await rechargerDonnees();
        set(donnees);
        if (!donnees.logIndexComplete) {
          void completerJournalEnFond(set, get).catch((e: unknown) => void logError('journal', e));
        }
      }
      get().dismissToast();
    },
  });

  minuterie = setTimeout(() => {
    minuterie = null;
    get().dismissToast();
  }, UNDO_MS);
  /* Un toast en attente ne doit pas maintenir le processus en vie sous Node
     (tests, rendu serveur). Sans effet dans un navigateur. */
  (minuterie as { unref?: () => void }).unref?.();

  return resultat;
}

/** Pose un toast SANS annulation, qui s'efface seul.
 *
 *  Même minuterie que `withUndo` : un toast éphémère posé après un toast
 *  annulable remplace celui-ci et en annule le compte à rebours — sinon la
 *  minuterie du premier viendrait effacer le second avant son heure. C'est
 *  la règle « un seul toast à la fois », tenue au même endroit. */
export function toastEphemere(get: Get, toast: { messageKey: string; label: string }): void {
  if (minuterie) clearTimeout(minuterie);
  get().showToast(toast);
  minuterie = setTimeout(() => {
    minuterie = null;
    get().dismissToast();
  }, UNDO_MS);
  (minuterie as { unref?: () => void }).unref?.();
}
