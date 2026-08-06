# Passation — reprise dans Claude Code

Destinataire : la session Claude Code qui finira ce projet. Ce document est le point d'entrée ;
il ne répète pas les autres, il dit dans quel ordre les lire et quoi faire.

## En trois phrases

Habitum est un gestionnaire d'habitudes local-first dont le **moteur métier est terminé et
testé**, et dont les **onze écrans existent déjà** — dans un prototype HTML haute fidélité
servi tel quel sous `public/prototype/`. Le travail restant est un **portage**, pas une
conception : reproduire ces écrans en React/Next avec les mêmes chiffres. Les 62 valeurs de
référence de `tests/fixtures/golden.json` disent si le portage est fidèle.

## Première demi-heure

1. `npm install && npm run dev`, puis ouvrir <http://localhost:3000> — onze routes, aucune vue.
2. Ouvrir <http://localhost:3000/prototype/Habitum.dc.html> — le produit réel, complet.
3. Ouvrir `public/prototype/tests/domain.test.html` — **six contrôles verts**. C'est le mètre étalon.
4. Lire `CLAUDE.md` (les deux pièges déjà payés), puis `docs/ANALYSE-REPRISE.md`.
5. `npm run verify` — **vert depuis la phase 0 de stabilisation (6 août 2026)**. Il était
   rouge dans la version initiale du dépôt : une apostrophe non échappée dans
   `components/shell/app-shell.tsx` cassait la compilation, et toutes les routes
   auraient répondu en erreur. Voir `docs/AUDIT-PRODUCTION-2026-08-06.md`.

## Plan de finalisation, phase par phase

### Phase 0 — amorçage (½ journée)
Installer, faire passer `verify`, pousser sur GitHub, brancher Vercel.
**Critère d'arrêt** : la CI est verte sur `main` et une préversion est en ligne.

### Phase 1 — données (2–3 jours) · corrige B4, B6, et le plafond de stockage
Schéma Dexie (`habits`, `logs` indexée `[habitId+date]`, `tasks`, `goals`, `notes`,
`sessions`, `profiles`, `meta`), migrations **numérotées** (plus de cascade `if v<n`),
importeur du format d'export du prototype (`lib/storage/legacy-import.ts` en est l'amorce),
et **séparation stricte du jeu de démonstration et d'un compte vierge** : deux chemins
distincts à la première ouverture, jamais un mélange.
**Critère d'arrêt** : un export du prototype se réimporte sans perte, et un compte vierge
n'affiche aucune donnée générée.

### Phase 2 — état et coque (2 jours)
Store Zustand en slices (habitudes, tâches, objectifs, timer, notes, réglages, UI),
mécanisme d'annulation (`snapshot` + toast), coque complète : rail, mode zen, palette ⌘K.
**Critère d'arrêt** : naviguer entre les onze routes avec des données réelles chargées.

### Phase 3 — les onze vues (1–2 semaines)
Une vue à la fois, dans cet ordre : `today` → `habits` → `dash` → `tasks` → `stats` →
`goals` → `calendar` → `timer` → `notes` → `settings` → `profile`.
Pour chacune : `docs/handoff/05-SPEC-VUES.md`, la capture de référence
(`public/prototype/tests/visual/reference/`), puis la commande `/port-view <vue>`.
Aucun calcul dans un composant : tout descend dans `lib/domain`.
**Critère d'arrêt par vue** : mêmes chiffres que le prototype, à la même date figée.

### Phase 4 — les promesses non tenues (2–3 jours)
Notifications réelles (API Notification + planification), son de fin de pomodoro (Web Audio),
vibration — ou **retrait des interrupteurs** s'ils ne sont pas branchés. Un réglage décoratif
est un mensonge d'interface.
**Critère d'arrêt** : aucun interrupteur sans effet.

### Phase 5 — finition (3–4 jours)
PWA (manifeste, service worker via Serwist, icônes, offline), onboarding, audit de contraste
du thème `plasma`, réorganisation — et non plus défilement — de la heatmap sous 768 px,
navigation clavier du calendrier.
**Critère d'arrêt** : installable, utilisable hors ligne, recette `RECETTE.md` passée.

### Phase 6 — synchronisation (optionnelle, 1 semaine)
Seulement si le multi-appareils est décidé : Neon (plan gratuit) + Auth.js, file d'attente
de synchronisation, résolution par `updatedAt`, suppressions logiques (`deletedAt`).
Les entités portent déjà `updatedAt` pour rendre cette phase possible sans migration.
**Critère d'arrêt** : deux appareils convergent, et l'application reste utilisable hors ligne.

## Ce qu'il ne faut pas faire

- Réécrire le moteur « au propre » : il est juste, et ses subtilités (le `limit` inversé,
  la tolérance du jour courant dans la série) sont invisibles à la relecture.
- Renommer une clé persistée pour la rendre lisible : c'est une perte de données.
- Ajouter un service tiers de suivi : la promesse produit est que rien ne sort de l'appareil.
- Toucher au prototype sous `public/prototype/` : c'est l'archive de référence.

## Le backlog

77 tâches priorisées dans `docs/handoff/06-BACKLOG.md`, alignées sur ces phases.
