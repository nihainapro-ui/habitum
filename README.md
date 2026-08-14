# Habitum

Gestionnaire d'habitudes, de tâches, d'objectifs et de temps de focus.
**Local-first** : aucune donnée ne quitte l'appareil, aucun compte, aucun appel réseau.
FR / EN, trois thèmes.

Ce dépôt est la **base de reprise** : le moteur métier et les onze écrans existent
et fonctionnent déjà dans un prototype haute fidélité ; le portage vers Next.js
est commencé (structure, i18n, domaine typé, tests) et se termine dans Claude Code.

## Démarrer

```bash
npm install
npm run dev          # http://localhost:3000
```

Le prototype, lui, n'a besoin de rien : ouvrir
`public/prototype/Habitum.dc.html` directement dans un navigateur, ou
<http://localhost:3000/prototype/Habitum.dc.html> une fois le serveur lancé.

## Commandes

| Commande | Quoi |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | TypeScript strict, sans émission |
| `npm run lint` / `format` | ESLint / Prettier |
| `npm run check:messages` | symétrie FR/EN des libellés |
| `npm test` | moteur métier (Vitest) |
| `npm run test:e2e` | parcours (Playwright) |
| `npm run check:tokens` | jetons de design conformes au prototype |
| `npm run check:icons` | icônes d'installation conformes aux jetons |
| `npm run icons` | régénère `public/icons/` et `app/apple-icon.png` |
| **`npm run verify`** | **les huit contrôles ci-dessus — à passer avant toute livraison** |

## Où est quoi

| Dossier | Rôle |
|---|---|
| `app/` | routes App Router — une par vue (11), `onboarding/`, `manifest.ts`, `sw.ts` (service worker) |
| `components/` | `ui/` (12 primitives), `shell/` (coque), `command/` (palette ⌘K), `settings/`, `onboarding/` |
| `lib/domain/` | **moteur métier pur** — jamais de React, jamais de Next, 100 % testable |
| `lib/data/` | persistance : schéma Dexie, dépôts typés, import/export, amorces |
| `lib/store/` | état Zustand en tranches — écrit aux dépôts, jamais à la base |
| `lib/features/` | fonctions branchées sur le navigateur : rappels, retour sonore, sauvegarde |
| `lib/keyboard/` | raccourcis globaux et piège de focus |
| `lib/storage/` | clés persistées figées (`habitum.state`, `DB_NAME`…) |
| `i18n/` | next-intl : langue par cookie, lue côté client — pas de segment d'URL, pas de rendu dynamique |
| `messages/` | `fr.json` / `en.json` — 462 clés, symétrie vérifiée en CI |
| `styles/` | `globals.css` + `tokens.css` (généré) + `theme.css` (pont Tailwind) |
| `types/` | alias public des types du domaine (`@/types`) |
| `tests/` | `unit/` Vitest · `e2e/` Playwright · `fixtures/golden.json` |
| `scripts/` | outillage local : contrôle des libellés, **génération des jetons et des icônes** |
| `public/prototype/` | **le prototype, servi tel quel** — référence exécutable |
| `docs/` | analyse, passation, décisions (ADR), spécifications, captures |
| `.claude/` | permissions et commandes pour Claude Code |
| `.github/` | CI et gabarit de PR |
| `.vscode/` | réglages d'éditeur partagés |

## À lire avant d'écrire une ligne

1. `CLAUDE.md` — les règles de ce dépôt (dont deux pièges déjà payés)
2. `docs/ANALYSE-REPRISE.md` — terminé / partiel / manquant / risques
3. `docs/PASSATION-CLAUDE-CODE.md` — le plan de reprise, phase par phase
4. `docs/adr/` — pourquoi les choix structurants sont ce qu'ils sont
5. `docs/handoff/03-ARCHITECTURE.md` — modèle de données et algorithmes

## Licence

MIT — voir `LICENSE` (réserves sur `public/prototype/support.js`, généré, et sur
les captures de l'application d'origine dans `docs/references/habitnow/`).
