import type { StateCreator } from 'zustand';
import type { AppState, UiActions, UiState } from '../types';

export const uiInitial: UiState = {
  view: 'dash',
  day: 0,
  filter: 'all',
  range: 30,
  zen: false,
  editor: null,
  toast: null,
  commandOpen: false,
  menuOpen: false,
  loading: false,
  error: null,
};

/** Applique une modification partielle à `ui` sans écraser le reste. */
const majUi =
  (patch: Partial<UiState>) =>
  (s: AppState): Partial<AppState> => ({ ui: { ...s.ui, ...patch } });

export const createUiSlice: StateCreator<AppState, [], [], UiActions> = (set, get) => ({
  setView: (view) => set(majUi({ view })),
  setDay: (day) => set(majUi({ day })),
  setFilter: (filter) => set(majUi({ filter })),
  setRange: (range) => set(majUi({ range })),
  toggleZen: () => set((s) => majUi({ zen: !s.ui.zen })(s)),
  openEditor: (editor) => set(majUi({ editor })),
  closeEditor: () => set(majUi({ editor: null })),
  setCommandOpen: (commandOpen) => set(majUi({ commandOpen })),
  setMenuOpen: (menuOpen) => set(majUi({ menuOpen })),

  /* Un seul toast à la fois — comportement du prototype (`notify()` posait un
     `clearTimeout` sur le précédent). Deux toasts empilés, c'est une annulation
     qu'on croit avoir et qu'on n'a pas. */
  showToast: (toast) => set(majUi({ toast })),
  dismissToast: () => {
    if (get().ui.toast) set(majUi({ toast: null }));
  },
});
