# 06 — Backlog détaillé (tâche par tâche)

Format de chaque tâche : **objectif · fichiers/modules · priorité · dépendances · résultat attendu**.
Priorités : **C**ritique · **H**aute · **M**oyenne · **F**aible.
Identifiants stables (`T0.1`, `T1.4`…) à reprendre tels quels dans les issues du dépôt.

---

## Phase 0 — Décisions et socle (P0)

| Id | Objectif | Fichiers / modules | Prio | Dépend. | Résultat attendu |
|---|---|---|---|---|---|
| **T0.1** | Trancher le conflit de design system (B1) | `07-DECISION-B1.md` | **C** | — | Décision écrite et datée dans le fichier de décision ; option (a), (b) ou (c) retenue |
| **T0.2** | Initialiser le dépôt Next.js 15 + TypeScript strict + Tailwind v4 | `package.json`, `tsconfig.json`, `next.config.ts`, `app/` | **C** | — | `pnpm dev` sert une page vide ; `pnpm build` passe |
| **T0.3** | Outillage qualité | `.eslintrc`, `.prettierrc`, `vitest.config.ts`, `playwright.config.ts`, `.husky/` | **C** | T0.2 | `pnpm lint`, `pnpm typecheck`, `pnpm test` existent et passent à vide |
| **T0.4** | CI GitHub Actions (lint + typecheck + test + build) | `.github/workflows/ci.yml` | **H** | T0.3 | PR bloquée si un job échoue ; minutes gratuites uniquement |
| **T0.5** | Déploiement continu Vercel Hobby | Vercel + `vercel.json` si besoin | **H** | T0.2 | URL de préproduction par PR, production sur `main`, 0 € |
| **T0.6** | Poser `CLAUDE.md` et le dossier de passation à la racine | `CLAUDE.md`, `docs/handoff/` | **C** | T0.2 | Règles projet lisibles par Claude Code au premier prompt |
| **T0.7** | `.env.example` + garde d'absence de secret | `.env.example`, `lib/env.ts` (zod) | **M** | T0.2 | Aucune clé en dur ; l'app démarre sans aucune variable (mode local pur) |

## Phase 1 — Moteur métier typé et testé (P0)

| Id | Objectif | Fichiers / modules | Prio | Dépend. | Résultat attendu |
|---|---|---|---|---|---|
| **T1.1** | Déclarer les types du domaine | `lib/domain/types.ts` | **C** | T0.2 | `Habit`, `Task`, `Goal`, `LogEntry`, `Session`, `Note`, `Profile`, `Settings`, `DateKey`, `Category`, `GoalKind` ; aucun `any` |
| **T1.2** | Utilitaires de date — sans dépendance, voir décision B | `lib/domain/date.ts` | **C** | T1.1 | `dateKey`, `parseKey`, `addDays`, `dow` (lundi=0), `startOfWeek(weekStart)`, `formatDate(locale)` ; tests de fuseau et de passage à l'heure d'été |
| **T1.3** | Porter la planification | `lib/domain/schedule.ts` | **C** | T1.2 | `isScheduled(habit, date)` conforme à `sched_` : archivé, bornes `start`/`end`, jours de semaine |
| **T1.4** | Porter la complétion et les cibles | `lib/domain/schedule.ts` | **C** | T1.3 | `dailyTarget(habit)` + `isDone(habit, date, value)` couvrant les **SEPT** types (`check`, `count`, `time`, `total`, `list`, `limit`, `exact`), dont **`limit` inversé et non anticipé** |
| **T1.5** | Porter les métriques | `lib/domain/stats.ts` | **C** | T1.4 | `currentStreak`, `bestStreak`, `completionRate(window)`, `sumValue(window)`, `dayRatio(date)`, `perfectDays(window)`, `habitScore` |
| **T1.6** | Tests unitaires du moteur | `lib/domain/*.test.ts` | **C** | T1.5 | ≥ 40 cas ; couverture ≥ 95 % sur `schedule.ts` et `stats.ts` ; les 3 pièges de `CLAUDE.md` explicitement testés |
| **T1.7** | Schéma Dexie | `lib/data/db.ts` | **C** | T1.1 | Tables `habits`, `logs` (index `[habitId+date]`), `tasks`, `goals`, `notes`, `sessions`, `profiles`, `meta` ; ouverture testée |
| **T1.8** | Dépôts (repositories) typés | `lib/data/repositories/*.ts` | **C** | T1.7 | CRUD par entité, `updatedAt` automatique, suppression logique `deletedAt`, transactions |
| **T1.9** | Migrations versionnées | `lib/data/migrations.ts` | **H** | T1.7 | Versions Dexie 1→n testées ; rejeu des migrations legacy `v<2`…`v<5` du prototype |
| **T1.10** | Importeur du JSON du prototype | `lib/data/import.ts` | **H** | T1.8, T1.9 | Lit `{habits,tasks,log,notes}`, convertit `habitId\|date` en lignes `logs`, produit un rapport d'import ; test sur un fichier d'exemple |
| **T1.11** | Séparer démo et compte vierge (corrige B4) | `lib/data/seed.ts` | **C** | T1.8 | `seedDemo()` explicite + `seedEmpty()` par défaut ; suppression de `materialize`, `focusMin_`, `journalSeed` |
| **T1.12** | Cache dérivé incrémental (corrige B3) | `lib/domain/cache.ts` | **H** | T1.5 | Invalidation par `(habitId)` et par `(date)`, jamais globale ; test de non-recalcul |
| **T1.13** | Récurrence de tâches | `lib/domain/recurrence.ts` | **M** | T1.2 | RRULE simplifiée (`daily`, `weekly`, `monthly`, intervalle) + exceptions par occurrence ; expansion sur une fenêtre |
| **T1.14** | Logique d'objectifs | `lib/domain/goals.ts` | **M** | T1.5 | Progression, rythme requis restant, projection d'atteinte, état (en avance / à l'heure / en retard) |

## Phase 2 — Système visuel et coquille (P0)

| Id | Objectif | Fichiers / modules | Prio | Dépend. | Résultat attendu |
|---|---|---|---|---|---|
| **T2.1** | Tokens en CSS + 3 thèmes | `styles/tokens.css`, `themes.css` | **C** | T0.1 | Valeurs de `04-DESIGN-TOKENS.md` à l'identique ; bascule par `[data-theme]` sans re-rendu React |
| **T2.2** | Polices auto-hébergées | `app/layout.tsx` | **H** | T0.2 | Space Grotesk + JetBrains Mono via `next/font` ; zéro requête Google ; pas de FOUT |
| **T2.3** | Primitives UI | `components/ui/{Panel,Card,Chip,Switch,Field,Segmented,Sheet,Dialog,Toast,Tooltip,Ring}.tsx` | **C** | T2.1 | Chaque primitive avec états survol/actif/focus, accessible au clavier, testée en Storybook ou page `/dev/ui` |
| **T2.4** | Store Zustand par tranches | `lib/store/*.ts` | **C** | T1.8 | `habits`, `tasks`, `goals`, `timer`, `notes`, `settings`, `ui` ; persistance déléguée aux dépôts, pas de `localStorage` direct |
| **T2.5** | Middleware d'annulation | `lib/store/undo.ts` | **H** | T2.4 | `withUndo(action, label)` produisant un toast avec **Annuler** ; remplace `snapshot()`/`notify()` |
| **T2.6** | Coquille applicative | `components/shell/{Rail,Header,BottomBar,ZenToggle}.tsx` | **C** | T2.3 | Rail 3 groupes, en-tête, mode zen `⌘\`, barre basse sous 768 px |
| **T2.7** | i18n `next-intl` | `messages/fr.json`, `messages/en.json`, `i18n/` | **H** | T0.2 | Les **311** clés de `messages/*.json` réellement utilisées par les composants (D6) ; bascule FR/EN sans rechargement ; **plus aucun champ `fr`/`en` sur les données** |
| **T2.8** | Icônes | `components/ui/icon.tsx` | **M** | T2.3 | Lucide pour navigation et actions ; glyphes de catégorie conservés comme marqueurs |
| **T2.9** | Palette de commandes `⌘K` | `components/command/` | **H** | T2.4, T2.7 | Recherche habitudes/courses/objectifs, `↑`/`↓`/`Entrée`, création rapide ; test clavier |
| **T2.10** | Raccourcis globaux et piège de focus | `components/keyboard/` | **M** | T2.6 | `⌘K`, `Escape`, `⌘\`, `Tab` piégé dans les modales ; aucun conflit avec les champs de saisie |

## Phase 3 — Portage des vues (P1)

| Id | Objectif | Fichiers / modules | Prio | Dépend. | Résultat attendu |
|---|---|---|---|---|---|
| **T3.1** | Vue `habits` | `app/habits/`, `components/habits/` | **C** | T2.*, T1.5 | Cartes conformes au prototype : glyphe, objectif, 7 pastilles de semaine cliquables, série, record, taux 30 j |
| **T3.2** | Vue `today` + tiroir d'actions | `app/today/`, `components/today/` | **C** | T3.1 | Liste unifiée triée par heure, filtres, compteurs `−`/`+`, sous-listes ; tiroir Réussi/Passer/Reporter/Supprimer/Note ; toast annulable |
| **T3.3** | Vue `dash` | `app/page.tsx`, `components/dashboard/` | **H** | T3.2 | Anneau du jour, 4 compteurs, habitudes du jour, prochaines tâches, mini-heatmap 30 j, objectifs |
| **T3.4** | Éditeur habitude (4 onglets) | `components/habits/HabitEditor/` | **C** | T3.1 | Définition/Planning/Rappels/Avancé, validation `zod` + `react-hook-form`, brouillon isolé, suppression annulable |
| **T3.5** | Éditeur tâche | `components/tasks/TaskEditor/` | **H** | T3.4 | Mêmes onglets adaptés (heure, durée, priorité, sous-tâches, récurrence) |
| **T3.6** | Vue `tasks` | `app/tasks/` | **H** | T3.5 | Groupes Aujourd'hui/Demain/Semaine/Plus tard/Terminé, priorités, sous-tâches, liste de courses en colonne |
| **T3.7** | Calendrier — grille mois | `components/calendar/MonthGrid.tsx` | **H** | T1.5 | 6×7, intensité = `dayRatio`, navigation animée, clic → `today` du jour |
| **T3.8** | Calendrier — semaine / jour | `components/calendar/TimeGrid.tsx` | **H** | T3.7 | Colonnes horaires, positionnement par `time`+`duration`, ligne d'heure courante |
| **T3.9** | Calendrier — glisser-déposer et redimensionnement | `components/calendar/dnd.ts` (`@dnd-kit`) | **H** | T3.8 | Déplacement jour/heure, resize ≥ 15 min, toast annulable, **alternative clavier obligatoire** |
| **T3.10** | Calendrier — agenda | `components/calendar/AgendaList.tsx` | **M** | T3.7 | Liste chronologique, état vide |
| **T3.11** | Vue `stats` — heatmap 6 mois | `components/stats/Heatmap.tsx` | **H** | T1.12 | 26 semaines, échelle d'intensité, infobulle par jour, `<canvas>` si > 400 cellules |
| **T3.12** | Vue `stats` — indicateurs et graphiques | `app/stats/`, `components/stats/` | **H** | T3.11 | Fenêtres 7/30/90/365, taux global, journées parfaites, meilleure série, classement par score, répartition par catégorie |
| **T3.13** | Vue `timer` | `app/timer/`, `lib/store/timerSlice.ts` | **H** | T2.4 | 4 modes, cadran animé, phases pomodoro 25/5/15 ×4, crédit d'habitude, sessions du jour |
| **T3.14** | Persistance du timer (corrige B5) | `lib/store/timerSlice.ts` | **H** | T3.13 | `startedAt` + `accumulatedMs` persistés ; survit au rechargement et à l'onglet en arrière-plan ; test de dérive < 1 s sur 25 min |
| **T3.15** | Vue `goals` complétée | `app/goals/` | **M** | T1.14 | Progression, rythme requis, courbe d'avancement, jalons, alerte d'échéance, historique |
| **T3.16** | Vue `notes` | `app/notes/` | **M** | T2.4 | Journal auto-sauvegardé, humeur, historique, notes d'habitude, recherche plein texte (index Dexie) |
| **T3.17** | Vue `profile` | `app/profile/` | **M** | T2.4 | Identité, avatar génératif OKLCH, statistiques personnelles, profils multiples (créer/basculer/supprimer), import JSON |
| **T3.18** | Vue `settings` | `app/settings/` | **H** | T2.7 | Thème, langue, début de semaine, interrupteurs réels, export, réinitialisation en deux temps |

## Phase 4 — Fiabilisation des promesses de l'UI (P1)

| Id | Objectif | Fichiers / modules | Prio | Dépend. | Résultat attendu |
|---|---|---|---|---|---|
| **T4.1** | Statistiques de focus réelles | `lib/domain/stats.ts` | **C** | T3.13 | Minutes agrégées depuis `sessions` ; `focusMin_` supprimé du code et des écrans |
| **T4.2** | Notifications réelles | `components/reminders/` | **H** | Phase 5 (SW) | Demande de permission contextuelle, rappels d'habitude aux heures `reminders[]`, fin de phase pomodoro ; dégradation propre si refusé |
| **T4.3** | Retour sonore et haptique | `components/feedback/` | **M** | T3.18 | Bip synthétisé en Web Audio (zéro fichier), `navigator.vibrate`, pilotés par les réglages |
| **T4.4** | Clarifier le réglage `cloud` | `app/settings/`, `messages/*` | **M** | T3.18 | Renommé « Sauvegarde locale » ; un réglage « Synchronisation » n'apparaît que si la phase 6 est livrée |
| **T4.5** | États vides / chargement / erreur | toutes les vues, `error.tsx`, `loading.tsx` | **H** | Phase 3 | Chaque vue a ses 3 états ; aucun écran blanc possible |
| **T4.6** | Onboarding | `components/onboarding/` | **H** | T1.11 | 3 écrans (langue, thème, 3 habitudes suggérées) ; compte **vierge** par défaut, démo optionnelle |
| **T4.7** | Confettis et micro-récompenses | `components/feedback/confetti.tsx` | **F** | T4.3 | Déclenché sur journée parfaite, désactivable, respecte `prefers-reduced-motion` |

## Phase 5 — PWA et hors-ligne (P1)

| Id | Objectif | Fichiers / modules | Prio | Dépend. | Résultat attendu |
|---|---|---|---|---|---|
| **T5.1** | Manifeste et icônes | `public/manifest.webmanifest`, `public/icons/` | **H** | T2.1 | Installable sur Android/iOS/desktop ; icônes 192/512/maskable ; couleur de thème par thème actif |
| **T5.2** | Service worker (Serwist) | `app/sw.ts`, `next.config.ts` | **H** | T5.1 | Coquille et polices en cache, application utilisable **totalement hors ligne** |
| **T5.3** | Sauvegarde / restauration | `components/backup/` | **C** | T1.10 | Export JSON complet, import avec rapport, rappel de sauvegarde périodique (garde-fou anti perte de données) |
| **T5.4** | File d'écritures et reprise en ligne | `lib/data/queue.ts` | **M** | T5.2 | Écritures rejouées à la reconnexion ; prérequis de la phase 6 |
| **T5.5** | Détection de mise à jour | `components/update/` | **M** | T5.2 | Bandeau « nouvelle version disponible » et rechargement contrôlé |

## Phase 6 — Synchronisation optionnelle (P2)

| Id | Objectif | Fichiers / modules | Prio | Dépend. | Résultat attendu |
|---|---|---|---|---|---|
| **T6.1** | Auth.js par lien magique (Neon) | `lib/data/remote/auth.ts` | **M** | T0.7 | Connexion optionnelle ; l'app reste pleinement utilisable sans compte |
| **T6.2** | Schéma Neon miroir (Drizzle) + RLS | `drizzle/migrations/` | **M** | T6.1 | Tables miroir, politiques par `user_id`, aucune donnée lisible par un tiers |
| **T6.3** | Synchronisation local-first | `lib/data/sync.ts` | **M** | T5.4, T6.2 | `updatedAt`/`deletedAt`, dernier écrivain gagne par champ, `logs` en append-only ; test de convergence sur 2 clients simulés |
| **T6.4** | Écran d'état de synchronisation | `components/sync/` | **F** | T6.3 | État (à jour / en attente / erreur), résolution manuelle des conflits rares |

## Phase 7 — Responsive, accessibilité, performance (P1)

| Id | Objectif | Fichiers / modules | Prio | Dépend. | Résultat attendu |
|---|---|---|---|---|---|
| **T7.1** | Points de rupture réels | toutes les vues | **H** | Phase 3 | 390 / 768 / 1024 / 1440 ; aucun débordement horizontal ; cibles tactiles ≥ 44 px |
| **T7.2** | Calendrier et heatmap mobiles | `components/calendar/`, `stats/` | **H** | T7.1 | Semaine/jour en liste sous 768 px, heatmap défilable, éditeur en feuille plein écran |
| **T7.3** | Audit de contraste WCAG AA | `styles/themes.css` | **H** | T2.1 | Les 3 thèmes conformes ; `--mut` du thème `plasma` corrigé |
| **T7.4** | Accessibilité d'interaction | toutes les vues | **H** | T3.9 | Région live pour les toasts, calendrier pilotable au clavier, curseur personnalisé **désactivé par défaut**, lecteur d'écran testé sur 3 parcours |
| **T7.5** | Virtualisation et perf de rendu | `@tanstack/react-virtual` | **M** | T1.12 | 200 habitudes × 365 j : interaction < 100 ms, aucun recalcul global au clic |
| **T7.6** | Budget de performance | `next build`, Lighthouse CI | **M** | T7.5 | Perf ≥ 95, A11y ≥ 95, Best-practices 100, SEO 100 ; budget en CI |

## Phase 8 — Qualité et mise en production (P1)

| Id | Objectif | Fichiers / modules | Prio | Dépend. | Résultat attendu |
|---|---|---|---|---|---|
| **T8.1** | Tests de parcours Playwright | `e2e/` | **C** | Phase 3 | 8 parcours : cocher une habitude · créer une tâche · déplacer au calendrier · pomodoro complet · export→import · changer de profil · FR→EN · réinitialiser |
| **T8.2** | Journalisation d'erreurs | `lib/logger.ts` | **M** | T4.5 | Sentry plan gratuit ou repli console ; aucune donnée personnelle transmise |
| **T8.3** | Analytique respectueuse | `lib/analytics.ts` | **F** | T0.5 | Vercel Web Analytics (Hobby) ou Umami ; sans cookie, désactivable |
| **T8.4** | Documentation développeur | `README.md`, `CHANGELOG.md`, `docs/` | **H** | Phase 3 | Démarrage en < 5 min pour un nouvel arrivant ; page de version dans les réglages |
| **T8.5** | Revue de sécurité et confidentialité | `next.config.ts`, `docs/privacy.md` | **H** | T5.2 | En-têtes CSP, aucun `dangerouslySetInnerHTML`, politique de confidentialité « données sur votre appareil » |
| **T8.6** | Recette de non-régression visuelle | `e2e/visual/` | **F** | T8.1 | Captures de référence des 11 vues × 3 thèmes comparées en CI |

---

## Récapitulatif

| Phase | Tâches | Dont critiques |
|---|---|---|
| 0 — Socle | 7 | 4 |
| 1 — Moteur | 14 | 8 |
| 2 — Système visuel | 10 | 4 |
| 3 — Vues | 18 | 4 |
| 4 — Fiabilisation | 7 | 2 |
| 5 — PWA | 5 | 1 |
| 6 — Sync (opt.) | 4 | 0 |
| 7 — Responsive/a11y/perf | 6 | 0 |
| 8 — Qualité | 6 | 1 |
| **Total** | **77** | **24** |

Chemin critique : `T0.1 → T0.2 → T1.1 → T1.3 → T1.4 → T1.6 → T1.7 → T2.1 → T2.3 → T3.1 → T3.2 → T8.1`.
