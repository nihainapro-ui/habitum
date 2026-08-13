import type {
  DateKey,
  Goal,
  Habit,
  LogIndex,
  Note,
  Profile,
  Session,
  Settings,
  ShoppingItem,
  Task,
  TimerMode,
  TimerState,
  TimerTarget,
} from '@/lib/domain';
import type { CreateInput, ImportReport, UpdatePatch } from '@/lib/data';

/* Types transverses des tranches.

   RÈGLE STRUCTURANTE (G2) : aucune tranche ne calcule. Elle lit, elle écrit,
   elle délègue. Tout ce qui ressemble à une règle métier vit dans lib/domain
   avec son test ; tout ce qui ressemble à de la persistance vit dans lib/data.
   Une tranche qui calcule est un calcul qui échappe aux 62 valeurs. */

/** Fenêtre d'analyse des vues statistiques. */
export type Range = 7 | 30 | 90 | 365;

export interface ToastState {
  /** Nom de l'entité concernée. C'est du CONTENU UTILISATEUR : il ne se traduit
   *  pas, il s'affiche tel quel. */
  label: string;
  /** Clé de libellé (`messages/*.json`), composée avec `label` par le composant
   *  Toast. Le texte du toast n'est donc jamais écrit en dur dans une tranche. */
  messageKey: string;
  /** Présente uniquement si l'action est réversible (`withUndo`). */
  undo?: () => Promise<void>;
}

export interface EditorState {
  kind: 'habit' | 'task' | 'goal';
  /** `null` = création. */
  id: string | null;
}

export interface UiState {
  view: string;
  /** Décalage en jours par rapport à aujourd'hui, comme `state.day` du prototype. */
  day: number;
  filter: string;
  range: Range;
  zen: boolean;
  editor: EditorState | null;
  toast: ToastState | null;
  commandOpen: boolean;
  loading: boolean;
  error: string | null;
}

export interface DataState {
  habits: Habit[];
  tasks: Task[];
  goals: Goal[];
  notes: Note[];
  sessions: Session[];
  shopping: ShoppingItem[];
  logIndex: LogIndex;
  settings: Settings;
  profiles: Profile[];
  activeProfileId: string | null;
  /** Drapeau `meta.demo` — l'interface doit pouvoir le dire à l'utilisateur. */
  isDemo: boolean;
  /** Dernier export, et refus du rappel de sauvegarde (D8). */
  lastExport: DateKey | null;
  nagDismissed: boolean;
}

export interface HabitsActions {
  createHabit(input: CreateInput<Habit>): Promise<void>;
  updateHabit(id: string, patch: UpdatePatch<Habit>): Promise<void>;
  deleteHabit(id: string): Promise<void>;
  archiveHabit(id: string, archived: boolean): Promise<void>;
  setLogValue(habitId: string, date: DateKey, value: number): Promise<void>;
  toggleHabit(habitId: string, date: DateKey): Promise<void>;
  /** Incrément relatif d'un compteur, borné à zéro. */
  bumpHabit(habitId: string, date: DateKey, delta: number): Promise<void>;
  /** Journalise explicitement un zéro : « passée », et non « jamais saisie ».
   *  La distinction porte la sémantique de `limit` (G9). */
  skipHabit(habitId: string, date: DateKey): Promise<void>;
}

export interface TasksActions {
  createTask(input: CreateInput<Task>): Promise<void>;
  updateTask(id: string, patch: UpdatePatch<Task>): Promise<void>;
  deleteTask(id: string): Promise<void>;
  toggleTask(id: string): Promise<void>;
  /** Reporte au lendemain, avec annulation. */
  snoozeTask(id: string): Promise<void>;
  toggleSubTask(id: string, index: number): Promise<void>;
  /** Replanifie une tâche — nouveau jour, éventuellement nouvelle heure. */
  moveTask(id: string, date: DateKey, time?: string): Promise<void>;
  /** Change la durée, jamais sous le minimum du domaine. */
  resizeTask(id: string, duration: number): Promise<void>;
  /** Allonge ou raccourcit RELATIVEMENT, en lisant la durée courante dans le
   *  store. Une suite rapide de raccourcis clavier calculerait sinon chaque pas
   *  depuis une valeur périmée, et perdrait la moitié des frappes. */
  nudgeTaskDuration(id: string, deltaMin: number): Promise<void>;
}

export interface GoalsActions {
  createGoal(input: CreateInput<Goal>): Promise<void>;
  updateGoal(id: string, patch: UpdatePatch<Goal>): Promise<void>;
  deleteGoal(id: string): Promise<void>;
}

export interface NotesActions {
  saveJournal(date: DateKey, body: string, mood?: number): Promise<void>;
  saveHabitNote(habitId: string, body: string): Promise<void>;
  deleteNote(id: string): Promise<void>;
}

export interface SessionsActions {
  createSession(input: CreateInput<Session>): Promise<void>;
  deleteSession(id: string): Promise<void>;
}

export interface ShoppingActions {
  createShoppingItem(label: string): Promise<void>;
  toggleShoppingItem(id: string): Promise<void>;
  deleteShoppingItem(id: string): Promise<void>;
}

export interface SettingsActions {
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void>;
  setActiveProfile(id: string): Promise<void>;
}

export interface UiActions {
  setView(view: string): void;
  setDay(day: number): void;
  setFilter(filter: string): void;
  setRange(range: Range): void;
  toggleZen(): void;
  openEditor(editor: EditorState): void;
  closeEditor(): void;
  setCommandOpen(open: boolean): void;
  showToast(toast: ToastState): void;
  dismissToast(): void;
}

export interface TimerActions {
  setTimerMode(mode: TimerMode): void;
  setTimerTarget(target: TimerTarget): void;
  setCountdown(minutes: number): void;
  startTimer(): void;
  pauseTimer(): void;
  resetTimer(): void;
  /** Enregistre le temps écoulé en session et remet la phase à zéro. */
  logTimerSession(): Promise<void>;
  /** Écrit une session et crédite l'habitude visée, si elle compte du temps. */
  creditSession(minutes: number, timer: TimerState): Promise<void>;
  /** Constate le franchissement du seuil de phase. N'accumule rien. */
  tickTimer(): Promise<void>;
  /** Relit l'état persisté, toujours en pause. Rend `true` s'il y avait une
   *  session à restaurer — la vue en informe alors l'utilisateur. */
  restoreTimer(): Promise<boolean>;
}

export interface AccountActions {
  createProfile(name: string): Promise<void>;
  updateProfile(id: string, patch: Partial<Profile>): Promise<void>;
  deleteProfile(id: string): Promise<void>;
  /** Rend la sauvegarde complète, prête à être écrite dans un fichier. */
  exportJson(): Promise<string>;
  importJson(charge: string): Promise<ImportReport>;
  /** Efface tout et repart d'un compte VIERGE — jamais du jeu de démonstration. */
  resetAccount(): Promise<void>;
  /** Refuse le rappel de sauvegarde. Il ne revient pas (D8). */
  dismissExportNag(): Promise<void>;
}

export interface LifecycleActions {
  hydrate(): Promise<void>;
}

/* Le minuteur est HORS de `DataState`, à côté de `ui` : il ne fait partie ni
   des instantanés d'annulation — annuler une suppression ne doit pas remettre
   une session en marche — ni de l'hydratation générale, puisqu'il se restaure
   toujours en pause (B5).  */
export type AppState = DataState & { ui: UiState; timer: TimerState } & HabitsActions &
  TasksActions &
  GoalsActions &
  NotesActions &
  SessionsActions &
  ShoppingActions &
  SettingsActions &
  TimerActions &
  AccountActions &
  UiActions &
  LifecycleActions;
