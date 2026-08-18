# Habitum

Gestionnaire d'habitudes, de tâches, d'objectifs et de temps de focus.
**Local-first** : aucune donnée ne quitte l'appareil, aucun compte, aucun appel réseau.
FR / EN, trois thèmes.

[![CI](https://github.com/nihainapro-ui/habitum/actions/workflows/ci.yml/badge.svg)](https://github.com/nihainapro-ui/habitum/actions/workflows/ci.yml)
[![Licence MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

Le portage depuis le prototype haute fidélité est **terminé** : les onze vues, la
vitrine bilingue, la PWA hors ligne, et une recette de sortie consignée
(`docs/RECETTE-2026-08-17.md`). Le prototype reste servi tel quel, comme archive
de référence.

## Démarrer

**Moins de cinq minutes**, sans compte, sans service à provisionner, sans variable
d'environnement — l'application n'en demande aucune.

```bash
git clone https://github.com/nihainapro-ui/habitum.git
cd habitum
npm install
npm run dev          # http://localhost:3000
```

Node ≥ 20.9. Rien d'autre : pas de base de données, pas de clé d'API, pas de
service tiers. C'est la conséquence directe du parti pris — tout vit dans le
navigateur.

| URL | Quoi |
|---|---|
| `/` · `/en` | la **vitrine** publique, bilingue — le seul actif indexable du projet |
| `/app` | l'**application** : tableau de bord, puis les dix autres vues (`noindex`) |
| `/prototype/Habitum.dc.html` | l'archive de référence, servie telle quelle |

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
| `npm run test:e2e` | parcours (Playwright), dont les **huit parcours critiques** |
| `npm run test:visual` | non-régression visuelle, 11 vues × 3 thèmes (passe par Docker hors Linux) |
| `npm run check:tokens` | jetons de design conformes au prototype |
| `npm run check:modernist` | jetons Modernist de la vitrine conformes au système livré |
| `npm run check:fonts` | polices auto-hébergées conformes aux paquets @fontsource |
| `npm run check:icons` | icônes d'installation conformes aux jetons |
| `npm run icons` | régénère `public/icons/` et `app/apple-icon.png` |
| **`npm run verify`** | **les contrôles ci-dessus — à passer avant toute livraison** |

> `npm run test:visual` compare 33 captures à un socle versionné, produit sous
> **Linux**. Sur Windows ou macOS le script passe par le conteneur officiel
> Playwright : les polices y sont celles de la CI, donc les pixels aussi.

## Où est quoi

| Dossier | Rôle |
|---|---|
| `app/(app)/` | l’application : une route par vue (11), `onboarding/`, `dev/` — layout racine sombre |
| `app/(site-fr)/`, `app/(site-en)/` | la **vitrine**, à la racine et sous `/en` — layouts racines Modernist, distincts de l’application |
| `app/` (racine) | `manifest.ts`, `robots.ts`, `sitemap.ts`, `sw.ts` (service worker), `global-error.tsx` |
| `components/` | `ui/` (12 primitives), `shell/` (coque), `command/` (palette ⌘K), `settings/`, `onboarding/`, `site/` (vitrine) |
| `lib/domain/` | **moteur métier pur** — jamais de React, jamais de Next, 100 % testable |
| `lib/data/` | persistance : schéma Dexie, dépôts typés, import/export, amorces |
| `lib/store/` | état Zustand en tranches — écrit aux dépôts, jamais à la base |
| `lib/features/` | fonctions branchées sur le navigateur : rappels, retour sonore, sauvegarde |
| `lib/keyboard/` | raccourcis globaux et piège de focus |
| `lib/site/` | vitrine : table des URL, libellés, contenu de fond, métadonnées, image sociale |
| `lib/seo/` | données structurées JSON-LD |
| `lib/storage/` | clés persistées figées (`habitum.state`, `DB_NAME`…) |
| `i18n/` | next-intl : langue par cookie, lue côté client — pas de segment d'URL, pas de rendu dynamique |
| `messages/` | `fr.json` / `en.json` — 633 clés, symétrie vérifiée en CI |
| `styles/` | application : `globals.css` + `tokens.css` (généré) + `theme.css` · vitrine : `modernist.css` + `modernist-tokens.css` (généré) |
| `types/` | alias public des types du domaine (`@/types`) |
| `tests/` | `unit/` Vitest · `e2e/` Playwright · `fixtures/golden.json` |
| `scripts/` | outillage local : contrôle des libellés, **génération des jetons et des icônes** |
| `public/prototype/` | **le prototype, servi tel quel** — référence exécutable |
| `docs/` | analyse, passation, décisions (ADR), spécifications, captures |
| `docs/RUNBOOK.md` | **conduite d'incident** : rollback, gravités, canal de signalement |
| `docs/a11y/` | rapport d'accessibilité — ce qui est automatisé, ce qui demande une oreille |
| `.claude/` | permissions et commandes pour Claude Code |
| `.github/` | CI et gabarit de PR |
| `.vscode/` | réglages d'éditeur partagés |

## À lire avant d'écrire une ligne

1. `CLAUDE.md` — les règles de ce dépôt (dont deux pièges déjà payés)
2. `docs/ANALYSE-REPRISE.md` — terminé / partiel / manquant / risques
3. `docs/PASSATION-CLAUDE-CODE.md` — le plan de reprise, phase par phase
4. `docs/adr/` — pourquoi les choix structurants sont ce qu'ils sont
5. `docs/handoff/03-ARCHITECTURE.md` — modèle de données et algorithmes

## Signaler une anomalie

Ouvrir une issue avec le gabarit « Anomalie », en joignant les trois valeurs de
**Réglages → À propos** : version de l'application, version du schéma de données,
date de construction. Sans télémétrie, c'est tout ce dont dispose le diagnostic —
et la version de schéma est la seule qui compte quand des données ont disparu
(`docs/RUNBOOK.md` § 3).

## Licence

MIT — voir `LICENSE` (réserves sur `public/prototype/support.js`, généré, et sur
les captures de l'application d'origine dans `docs/references/habitnow/`).
