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
  Project,
  ProjectStatus,
  ProjectTask,
} from '@/lib/domain';
import type { CreateInput, ImportReport, UpdatePatch } from '@/lib/data';
import type { Presence } from '@/lib/sync/appareils';

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
  kind: 'habit' | 'task' | 'goal' | 'project' | 'projectTask';
  /** `null` = création. */
  id: string | null;
  /** Projet d'accueil, pour `projectTask` en création UNIQUEMENT. `id: null`
   *  dit « nouvelle tâche » mais pas « dans quel projet » : sans ce champ, la
   *  création écrirait une tâche orpheline. */
  parentId?: string;
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
  /** Tiroir de navigation MOBILE. Sous 768 px le rail n'est pas rendu : sans ce
   *  tiroir, sept des onze vues n'ont aucun chemin d'accès au doigt — la
   *  palette ⌘K suppose un clavier, que l'APK n'a pas. */
  menuOpen: boolean;
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
  /* Work. Les tâches de projet sont une entité SÉPARÉE de `tasks` — décision de
     la spec du 2026-08-31 : ce qui vit dans Work ne remonte ni dans Aujourd'hui,
     ni dans le calendrier, ni dans les statistiques. */
  projects: Project[];
  projectTasks: ProjectTask[];
  logIndex: LogIndex;
  /** Occurrences de tâches récurrentes accomplies — clés `taskId|date` (G1). */
  occurrences: ReadonlySet<string>;
  /** L'index du journal contient-il TOUT l'historique ?
   *
   *  L'ouverture ne lit que les 420 derniers jours (tâche 5.10) ; le reste
   *  arrive juste après. Tant que ce drapeau est faux, une date antérieure à la
   *  fenêtre peut manquer — la coque l'expose (`data-journal`) pour que la
   *  recette mesure la réactivité une fois l'application posée, et non pendant
   *  qu'elle finit de charger. */
  logIndexComplete: boolean;
  settings: Settings;
  profiles: Profile[];
  activeProfileId: string | null;
  /** Drapeau `meta.demo` — l'interface doit pouvoir le dire à l'utilisateur. */
  isDemo: boolean;
  /** Parcours d'accueil franchi (`meta.onboarded`). Tant qu'il est faux, une
   *  route applicative renvoie à l'accueil : c'est là que se choisit le compte
   *  VIERGE, et c'est là seulement que la démonstration peut être demandée. */
  onboarded: boolean;
  /** Dernier export, et refus du rappel de sauvegarde (D8). */
  lastExport: DateKey | null;
  nagDismissed: boolean;
  /** Horodatage de la copie de secours automatique, `null` s'il n'y en a pas.
   *  Prise avant un import et avant une réinitialisation (tâche 5.8). */
  backupAt: string | null;
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
  /** Coche ou décoche une tâche POUR UN JOUR donné.
   *
   *  Une tâche récurrente n'est pas « faite » une fois pour toutes : elle est
   *  faite CE JOUR-LÀ, et elle avance à son occurrence suivante. La distinction
   *  n'existe pas pour une tâche unique, où l'action revient à `toggleTask`. */
  toggleTaskOn(id: string, date: DateKey): Promise<void>;
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

export interface ProjectsActions {
  createProject(input: CreateInput<Project>): Promise<void>;
  updateProject(id: string, patch: UpdatePatch<Project>): Promise<void>;
  /** Supprime le projet ET ses tâches : une tâche orpheline n'est atteignable
   *  par aucune vue, elle ne ferait qu'occuper la base en silence. */
  deleteProject(id: string): Promise<void>;
  createProjectTask(input: CreateInput<ProjectTask>): Promise<void>;
  updateProjectTask(id: string, patch: UpdatePatch<ProjectTask>): Promise<void>;
  setProjectTaskStatus(id: string, status: ProjectStatus): Promise<void>;
  /** Coche ou décoche la sous-tâche à cette position. */
  toggleProjectSubItem(id: string, index: number): Promise<void>;
  deleteProjectTask(id: string): Promise<void>;
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
  setMenuOpen(open: boolean): void;
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
  /** Clôt le parcours d'accueil. Le compte reste VIERGE. */
  completeOnboarding(): Promise<void>;
  /** Charge le jeu de démonstration. Geste EXPLICITE, jamais un défaut (B4). */
  loadDemo(): Promise<void>;
  /** Restaure la copie de secours automatique. `null` s'il n'y en a aucune. */
  restoreBackup(): Promise<ImportReport | null>;
}

export interface LifecycleActions {
  hydrate(): Promise<void>;
}

/* --- Synchronisation ------------------------------------------------------
   L'ÉTAT NE PORTE PAS LES CLÉS. `deriverCles` rend un `CryptoKey` non
   extractible ; le déposer dans le store en ferait un objet vivant au milieu
   de données par ailleurs sérialisables, copié par chaque instantané
   d'annulation. Les clés vivent donc dans un cache de module
   (`slices/sync.ts`), et l'état ne retient que ce qui s'affiche. */

/** Ce que l'interface a le droit de dire de la dernière tentative. Les genres
 *  viennent de `SyncErreur` : « pas de réseau » et « mauvais code » n'appellent
 *  pas le même geste, les confondre ferait retaper un code pendant une panne
 *  Wi-Fi. */
export type SyncEchec = 'reseau' | 'serveur' | 'limite' | 'cle';

export interface SyncState {
  /** Le dépôt a-t-il été configuré avec un serveur (`NEXT_PUBLIC_SYNC_URL`) ?
   *  Faux : la section n'apparaît pas du tout. */
  disponible: boolean;
  /** Un code d'appairage est enregistré sur cet appareil. */
  actif: boolean;
  /** Le code lui-même, pour pouvoir le montrer à l'utilisateur qui appaire son
   *  second appareil. `null` quand la synchronisation est inactive. */
  code: string | null;
  /** Un aller-retour est en cours. Empêche d'en lancer deux à la fois. */
  enCours: boolean;
  /** Dernière synchronisation RÉUSSIE, ISO. `null` s'il n'y en a jamais eu. */
  lastAt: string | null;
  /** Motif du dernier échec, effacé par le premier succès. */
  echec: SyncEchec | null;
  /** Ce que le DERNIER aller-retour a réellement échangé. `null` tant qu'il
   *  n'y en a pas eu dans cette session.
   *
   *  Sans ce compte, « dernière synchronisation : 15 h 22 » s'affiche
   *  exactement pareil qu'un échange ait eu lieu ou non — et celui qui vient
   *  d'appairer son téléphone n'a aucun moyen de savoir si ça a marché. */
  bilan: { recus: number; envoyes: number } | null;
  /** Les appareils qui partagent ce code, celui-ci compris. Reconstruite à
   *  chaque synchronisation depuis les présences reçues. */
  appareils: Presence[];
  /** Identifiant de CET appareil, pour se reconnaître dans la liste. */
  moi: string | null;
}

export interface SyncActions {
  /** Lit `meta` au démarrage : y a-t-il déjà un code sur cet appareil ? */
  chargerSync(): Promise<void>;
  /** Enregistre un code (saisi ou engendré) et synchronise dans la foulée.
   *  Rend `false` si le code est mal formé — l'appelant affiche alors le refus
   *  sans qu'aucune requête ne soit partie. */
  activerSync(code: string): Promise<boolean>;
  /** Oublie le code et les curseurs. NE SUPPRIME AUCUNE DONNÉE LOCALE : les
   *  entités déjà reçues restent, elles sont à l'utilisateur.
   *
   *  `effacerRelais` demande en plus l'effacement des octets déposés sur le
   *  serveur. Rend `false` si CET effacement a échoué — et dans ce cas rien
   *  n'est oublié localement non plus : jeter le code d'abord empêcherait
   *  toute reprise, puisque c'est lui qui dérive l'espace à effacer. */
  desactiverSync(effacerRelais?: boolean): Promise<boolean>;
  /** Un aller-retour, à la demande ou au réveil de l'onglet. */
  synchroniserMaintenant(): Promise<void>;
}

/* Le minuteur est HORS de `DataState`, à côté de `ui` : il ne fait partie ni
   des instantanés d'annulation — annuler une suppression ne doit pas remettre
   une session en marche — ni de l'hydratation générale, puisqu'il se restaure
   toujours en pause (B5).  */
export type AppState = DataState & {
  ui: UiState;
  timer: TimerState;
  sync: SyncState;
} & HabitsActions &
  TasksActions &
  GoalsActions &
  NotesActions &
  SessionsActions &
  ShoppingActions &
  ProjectsActions &
  SettingsActions &
  TimerActions &
  AccountActions &
  UiActions &
  SyncActions &
  LifecycleActions;
