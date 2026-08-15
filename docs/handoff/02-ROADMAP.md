# 02 — Plan d'amélioration phase par phase

Objectif : transformer le prototype en produit finissable dans Claude Code, sur des technologies
**gratuites ou dont le plan gratuit suffit durablement**.

Convention de priorité : **P0** bloquant · **P1** indispensable au lancement · **P2** confort ·
**P3** optionnel / après lancement.

---

## Phase 0 — Décisions et socle technique (0,5 j) · P0

| # | Tâche | Module |
|---|---|---|
| 0.1 | Trancher **B1** (design system : sombre du prototype vs Modernist) | produit |
| 0.2 | Créer le dépôt : Next.js 15 (App Router) + TypeScript strict + Tailwind v4 | `/` |
| 0.3 | Outillage : ESLint, Prettier, Vitest, Playwright, `tsc --noEmit` en pre-commit | `/` |
| 0.4 | GitHub Actions : lint + typecheck + tests sur PR (minutes gratuites) | `.github/` |
| 0.5 | Déploiement Vercel Hobby (gratuit) sur la branche principale | infra |
| 0.6 | Copier `CLAUDE.md` à la racine | `/` |

**Sortie attendue :** dépôt qui build, déploie et teste à vide.

---

## Phase 1 — Moteur métier typé et testé (2–3 j) · P0

C'est ici que se trouve la valeur. **Aucune UI dans cette phase.**

| # | Tâche | Module |
|---|---|---|
| 1.1 | Types du domaine : `Habit`, `Task`, `Goal`, `LogEntry`, `Session`, `Note`, `Profile`, `Settings` | `lib/domain/types.ts` |
| 1.2 | Utilitaires de date — helpers maison conservés, `date-fns` écartée (ADR-0006) | `lib/domain/date.ts` |
| 1.3 | Porter `sched_`, `isDone_`, `tgt` (4 types d'objectif dont `limit` inversé) | `lib/domain/schedule.ts` |
| 1.4 | Porter `streak_`, `best_`, `pct_`, `sumVal_`, `dayRatio_`, score d'habitude, journées parfaites | `lib/domain/metrics.ts` |
| 1.5 | **Tests unitaires exhaustifs** sur 1.3/1.4 (cas limites : `limit` futur, jour courant, archivé, bornes `start`/`end`) | `lib/domain/*.test.ts` |
| 1.6 | Schéma Dexie (IndexedDB) : tables `habits`, `logs`, `tasks`, `goals`, `notes`, `sessions`, `profiles`, `meta` + index `[habitId+date]` | `lib/data/db.ts` |
| 1.7 | Migrations versionnées + **import du JSON exporté par le prototype** (`exportJSON`) | `lib/data/migrations.ts` |
| 1.8 | Séparer strictement **seed de démo** et **compte vierge** (corrige B4) ; supprimer `focusMin_()` et `journalSeed()` | `lib/data/seed.ts` |
| 1.9 | Cache de statistiques dérivées (recalcul incrémental par habitude/jour au lieu d'invalidation globale — corrige B3) | `lib/domain/cache.ts` |

**Sortie attendue :** `pnpm test` vert, moteur utilisable sans écran.

---

## Phase 2 — Système visuel et coquille d'application (2 j) · P0

| # | Tâche | Module |
|---|---|---|
| 2.1 | Tokens en variables CSS (cf. `04-DESIGN-TOKENS.md`), 3 thèmes via `[data-theme]` | `styles/tokens.css` |
| 2.2 | Polices auto-hébergées via `next/font` (Space Grotesk, JetBrains Mono) — supprime la dépendance Google Fonts | `app/layout.tsx` |
| 2.3 | Primitives : `Panel`, `Card`, `Chip`, `Switch`, `Field`, `Segmented`, `Sheet`, `Dialog`, `Toast`, `Tooltip` (base shadcn/ui, MIT) | `components/ui/` |
| 2.4 | Coquille : rail de navigation, en-tête, mode zen, barre basse mobile | `components/shell/` |
| 2.5 | i18n via `next-intl` : externaliser `L`, `EL`, `PL` en `messages/fr.json` + `en.json` ; **le contenu utilisateur cesse d'être bilingue** | `messages/`, `i18n/` |
| 2.6 | Icônes Lucide (remplace les glyphes typographiques `✚ ▲ ◉` là où c'est un vrai icône) | `components/ui/icon.tsx` |
| 2.7 | Toasts avec annulation (porter `snapshot()` / `notify()` en middleware de store) | `lib/store/undo.ts` |

---

## Phase 3 — Portage des vues (5–7 j) · P1

Ordre imposé par les dépendances (chaque lot est livrable et testable) :

| Lot | Vues | Points d'attention |
|---|---|---|
| 3.1 | `habits`, `today`, `dash` | cœur du produit ; cases, compteurs, sous-listes, limites, tiroir d'actions (Réussi / Passer / Reporter / Supprimer / Note) |
| 3.2 | Éditeur habitude + tâche (4 onglets) | validation de formulaire (`zod` + `react-hook-form`), état brouillon, suppression avec annulation |
| 3.3 | `tasks` | regroupement Aujourd'hui/Demain/Semaine/Plus tard, sous-tâches, priorités |
| 3.4 | `cal` | 4 modes ; **le drag&drop et le resize sont la partie risquée** → `@dnd-kit` (MIT), tests Playwright |
| 3.5 | `stats` | heatmap 6 mois, séries, score, journées parfaites ; graphiques en SVG maison ou `visx` |
| 3.6 | `timer` | ré-ancrage horloge murale (corrige B5) : `startedAt` + `accumulatedMs` persistés |
| 3.7 | `goals` | compléter : rythme requis, courbe d'avancement, jalons, alerte d'échéance |
| 3.8 | `notes` | journal, notes d'habitude, humeur, recherche plein texte (index Dexie) |
| 3.9 | `profile`, `settings` | profils multiples, import/export, réinitialisation, réglages réels |

---

## Phase 4 — Fiabilisation des promesses de l'UI (2 j) · P1

| # | Tâche | Module |
|---|---|---|
| 4.1 | Statistiques de focus calculées sur les **sessions réelles** | `lib/domain/metrics.ts` |
| 4.2 | Notifications réelles : `Notification API` + `showTrigger`/service worker pour les rappels d'habitude et la fin de pomodoro | `lib/features/reminders/` |
| 4.3 | Son (Web Audio, un bip synthétisé, zéro dépendance) et vibration (`navigator.vibrate`) | `lib/features/feedback/` |
| 4.4 | Renommer/clarifier le réglage `cloud` (persistance locale ≠ cloud) | `settings` |
| 4.5 | États vides, chargement et erreur systématiques sur les 11 vues + `error.tsx` / `not-found.tsx` | toutes |
| 4.6 | Onboarding 3 écrans : choix langue, thème, 3 habitudes suggérées ; **compte vierge par défaut** | `lib/features/onboarding/` |
| 4.7 | Récurrence de tâches propre (RRULE simplifiée + exceptions par occurrence) | `lib/domain/recurrence.ts` |

---

## Phase 5 — PWA, hors-ligne, installation (1,5 j) · P1

| # | Tâche | Module |
|---|---|---|
| 5.1 | Manifeste + icônes (192/512/maskable) + écran de démarrage | `public/` |
| 5.2 | Service worker via **Serwist** (successeur MIT de next-pwa) : coquille en cache, offline total | `app/sw.ts` |
| 5.3 | Sauvegarde/restauration JSON + rappel de sauvegarde périodique (garde-fou anti perte de données) | `lib/features/backup/` |
| 5.4 | Détection de reprise en ligne, file d'écritures | `lib/data/queue.ts` |

---

## Phase 6 — Synchronisation optionnelle et comptes (2–3 j) · P2

> **Attention, deux numérotations coexistent.** La « phase 6 » de CE document est la
> synchronisation, et elle n'est **pas faite**. La « phase 6 » du programme d'exécution
> (`docs/superpowers/plans/2026-08-06-habitum-phases-execution.md`), livrée le 15 août 2026, est
> la **vitrine et le SEO**. Le programme est le plan effectivement suivi ; ce document reste la
> feuille de route d'origine du dossier de passation. Quand le CHANGELOG dit « phase 6 », il
> parle du programme.

Reste **facultatif** : l'app fonctionne à 100 % en local. Socle gratuit — **Neon**, décision
projet du 6 août 2026 ; les versions antérieures de ce document prescrivaient Supabase :

| # | Tâche | Module |
|---|---|---|
| 6.1 | **Neon PostgreSQL** (plan gratuit) + **Auth.js** par lien magique | `lib/data/remote/` |
| 6.2 | Schéma miroir + RLS par `user_id` | `supabase/migrations/` |
| 6.3 | Synchronisation *local-first* : `updatedAt` + `deletedAt` (tombstones), dernier écrivain gagne par champ, journal `ov` en table append-only | `lib/data/sync.ts` |
| 6.4 | Écran d'état de synchronisation + résolution manuelle des conflits rares | `lib/features/sync/` |

*Alternative 100 % sans serveur si l'on refuse tout compte : export/import de fichier + WebRTC ou
File System Access API vers un dossier synchronisé par l'utilisateur.*

---

## Phase 7 — Responsive, accessibilité, performance (2 j) · P1

| # | Tâche | Module |
|---|---|---|
| 7.1 | Points de rupture réels 390 / 768 / 1024 / 1440 ; barre basse mobile, calendrier en liste sous 768 px, éditeur en feuille plein écran | toutes |
| 7.2 | Audit contraste WCAG AA sur les 3 thèmes (le thème `plasma` est à corriger) | `tokens` |
| 7.3 | Région live pour les toasts, navigation clavier du calendrier, alternative au drag&drop, curseur personnalisé désactivable et désactivé par défaut sur mobile | a11y |
| 7.4 | Virtualisation des longues listes (`@tanstack/react-virtual`), heatmap en `<canvas>` si > 400 cellules | perf |
| 7.5 | Budget Lighthouse ≥ 95 / ≥ 95 / 100 / 100, `next build --profile`, mesure de `materialize` supprimée | perf |

---

## Phase 8 — Qualité et mise en production (1,5 j) · P1

| # | Tâche |
|---|---|
| 8.1 | Playwright : 8 parcours critiques (cocher une habitude, créer une tâche, déplacer au calendrier, pomodoro complet, export→import, changer de profil, passer FR→EN, réinitialiser) |
| 8.2 | Journalisation d'erreurs (Sentry plan gratuit 5 k évènements/mois, ou simple `error.tsx` + console) |
| 8.3 | Analytique respectueuse et gratuite : Vercel Web Analytics (plan Hobby) ou Umami auto-hébergé |
| 8.4 | `README` développeur, `CHANGELOG`, page de version dans les réglages |
| 8.5 | Revue de sécurité : aucune donnée sensible hors appareil, en-têtes CSP, `dangerouslySetInnerHTML` interdit |

---

## Chemin critique et jalons

```
P0 ──▶ P1 (moteur testé) ──▶ P2 (système visuel) ──▶ P3 (vues) ──┬──▶ P4 ──▶ P5 ──▶ P7 ──▶ P8  = v1.0
                                                                 └──▶ P6 (sync, optionnel)  = v1.1
```

- **Jalon A (fin P1)** : moteur métier vert en tests — le produit est « sauvable » même sans UI.
- **Jalon B (fin P3)** : parité fonctionnelle avec le prototype, en code de production.
- **Jalon C (fin P5 + P7 + P8)** : **v1.0 installable, hors-ligne, gratuite d'exploitation**.
- **Jalon D (P6)** : multi-appareils.

Estimation totale v1.0 : **16 à 21 jours-personne**, dont ~30 % sur les phases 1 et 3.

## Coût d'exploitation cible

| Poste | Solution | Coût |
|---|---|---|
| Hébergement | Vercel Hobby | 0 € |
| Base locale | IndexedDB (Dexie, Apache-2.0) | 0 € |
| Base distante (opt.) | Neon plan gratuit | 0 € |
| Auth (opt.) | Auth.js auto-hébergé | 0 € |
| CI | GitHub Actions (dépôt public) | 0 € |
| Erreurs | Sentry plan gratuit | 0 € |
| Analytique | Vercel Web Analytics / Umami | 0 € |
| Polices, icônes, UI | Space Grotesk & JetBrains Mono (OFL), Lucide (ISC), shadcn/ui (MIT) | 0 € |

**Aucune dépendance premium obligatoire.**
