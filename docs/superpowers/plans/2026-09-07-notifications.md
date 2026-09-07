# Notifications de rappel — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habitudes, tâches, étapes Work et objectifs savent rappeler ; sur Android le rappel
arrive application fermée ; les réglages couvrent source par source, préavis, récapitulatif et
heures silencieuses.

**Spec:** `docs/superpowers/specs/2026-09-07-notifications-design.md`

## Global Constraints

- `lib/domain/` n'importe ni React, ni Next, ni la persistance, **ni aucune langue** : il rend
  une clé de libellé et ses paramètres (règle 2 du CLAUDE.md, étendue à l'i18n).
- Aucun littéral de texte dans le JSX ; toute clé de `fr.json` existe dans `en.json`.
- Aucune clé persistée renommée : `notifications`, `sound`, `vibrate` restent ce qu'ils sont.
- Ajout à `Settings` **non destructif** — `DEFAULT_SETTINGS` comble les trous.
- Tout invariant nouveau éprouvé par mutation.

---

### Task 1 — Le calcul, cinq sources, aucune langue

**Files:** `lib/domain/notifications.ts` (nouveau), `lib/domain/types.ts` (Settings),
`lib/domain/index.ts`, `tests/unit/notifications.test.ts` (nouveau).

- [ ] `Rappel { cle, source, id, at, titre, corpsKey, corpsParams }` — `titre` est du contenu
      utilisateur (nom de l'entité), `corpsKey` une clé de libellé.
- [ ] `prochainsRappels({habits, log, tasks, occurrences, projectTasks, goals}, reglages, now,
      horizonJours)` — trié par heure, sources coupées écartées, heures silencieuses écartées.
- [ ] Habitudes : délègue à `rappelsRestants()`, inchangé.
- [ ] Tâches : `date` + `time` − `notifLead`, occurrences récurrentes comprises, faites exclues.
- [ ] Work / objectifs : `deadline` à `notifDayHour`, `done` et échéance absente exclus.
- [ ] Récapitulatif : une entrée à `notifDigestHour`, **omise si le décompte est nul**.
- [ ] `dansLesHeuresSilencieuses()` gère le passage de minuit (`22:00 → 07:00`).

### Task 2 — La couture, et le canal des minuteries

**Files:** `lib/features/reminders/canal.ts` (nouveau), `canal-minuteries.ts` (nouveau, reprend
`scheduler.ts`), `use-reminders.ts`, `index.ts`, `tests/unit/scheduler.test.ts`.

- [ ] `interface Canal { programmer(rappels): Promise<void> | void; arreter(): void }`.
- [ ] Le canal minuteries garde le dédoublonnage et la borne de `scheduler.ts` — c'est le même
      code, généralisé du `RappelPrevu` d'habitude au `Rappel` commun.
- [ ] `useReminders()` choisit le canal, calcule par le domaine, traduit, envoie.

### Task 3 — Le canal natif

**Files:** `lib/features/reminders/canal-natif.ts` (nouveau), `package.json`,
`tests/unit/canal-natif.test.ts` (double injectable).

- [ ] `@capacitor/local-notifications` en dépendance ; `estNatif()` par `Capacitor.isNativePlatform()`.
- [ ] Annuler tout, puis programmer l'horizon de 7 jours. Aucun journal local.
- [ ] Identifiant numérique **dérivé de la clé** (empreinte 31 bits), testé stable.
- [ ] Permission natif/web unifiée dans `permission.ts`.

### Task 4 — Les réglages

**Files:** `components/settings/NotificationSetting.tsx`, `NotificationDetails.tsx` (nouveau),
`components/settings/SettingsView.tsx`, `messages/*.json`.

- [ ] Interrupteur par source, préavis, heure des échéances, récapitulatif, heures silencieuses.
- [ ] Les sous-réglages n'apparaissent que si le maître est allumé.
- [ ] « quand Habitum est ouvert » devient **conditionnel** : absent dans l'APK.

### Task 5 — Filets et documents

- [ ] `tests/e2e/notifications.spec.ts` : réglages persistés, sous-réglages conditionnels.
- [ ] CHANGELOG ; `03-ARCHITECTURE.md` (réglages) ; socle visuel des Réglages régénéré.
