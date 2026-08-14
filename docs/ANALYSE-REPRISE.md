# Analyse de reprise — Habitum

Analyse du projet tel qu'il existe au 6 août 2026, en vue de sa finalisation dans Claude Code.
Elle porte sur le prototype (`public/prototype/Habitum.dc.html`, 3 877 lignes), sa
documentation, et la base Next.js posée par cette restructuration.

---

## 1. Terminé et fiable

**Le moteur métier est l'actif principal du projet.** Il est complet, testé, et sa
spécification est exécutable.

| Élément | État |
|---|---|
| Modèle de données (habitudes, journal, tâches, objectifs, notes, sessions, profils) | complet |
| Planification `isScheduled` — bornes, pause, jours de semaine, intervalle, archivage | complet, porté en TS |
| Complétion `isDone` — **sept** types d'objectif dont `limit` inversé | complet, porté en TS |
| Séries `currentStreak` / `bestStreak` (365 j) | complet, porté en TS |
| Taux, cumuls, ratio journalier, minutes de focus | complet, porté en TS |
| Objectifs (`cumul`, `milestones`, `reduce`) | complet, porté en TS |
| Migrations de schéma `v<2` … `v<5` | écrites **et testées** |
| Export / import JSON avec validation et rapport | complet, aller-retour vérifié |
| Sauvegarde automatique avant import et réinitialisation | complet |
| 11 vues, 3 thèmes, FR/EN intégral (311 clés symétriques) | complet |
| Calendrier mois/semaine/jour/agenda, glisser-déposer, redimensionnement | complet |
| Timer 4 modes, ancré sur l'horloge murale, persistant, repris en pause | complet |
| Palette ⌘K, mode zen, piège de focus, `prefers-reduced-motion` | complet |
| Palier téléphone (< 768 px) | complet |
| Six contrôles automatiques + recette manuelle + captures de référence | complet |

**Posé par cette restructuration** : structure Next.js 15 App Router, TypeScript strict,
i18n next-intl, moteur métier porté et typé (`lib/domain/`), tests Vitest sur les règles
les plus fragiles **et sur les 62 valeurs de référence**, Playwright, CI GitHub Actions, conventions d'éditeur, commandes Claude Code.

## 2. Partiellement terminé

| Sujet | Ce qui existe | Ce qui manque |
|---|---|---|
| **Portage React** | routes, coque, domaine typé, i18n, tests | les 11 vues elles-mêmes : aucune n'est portée |
| **Persistance** | `localStorage` découpé en deux clés, sauvegarde, migrations | IndexedDB (Dexie), index composites, transactions |
| **Objectifs** | trois types calculés | pas de courbe d'avancement, pas de rappel d'échéance |
| **Notes** | journal, humeur, notes par habitude, recherche | texte brut, pas de liaison note↔tâche |
| **Réglages** | interrupteurs `notif`, `sound`, `vibrate` | **purement décoratifs** : aucune API branchée |
| **Rappels** | champ `reminders[]` éditable | jamais déclenchés : aucun planificateur |
| **Récurrence** | `daily` / `monthly`, occurrences cochées | pas de RRULE, pas d'exception par occurrence |
| **Accessibilité** | focus visible, rôles ARIA, région live, piège de focus | pas d'audit de contraste (thème `plasma` limite) |
| **Responsive** | quatre paliers vérifiés | heatmap et grilles denses défilent au lieu de se réorganiser |

## 3. Manquant

> **État au 13 août 2026 (fin de phase 5).** Les points 1, 2, 3 et 5 sont livrés dans
> l'application portée — voir `CHANGELOG.md` § Phase 5. Ce tableau décrit le PROTOTYPE, qui reste
> la référence exécutable et n'a pas vocation à recevoir ces briques.

1. **Onboarding** — l'application démarre sur un jeu de démonstration ; un compte vierge n'est
   pas un chemin de première ouverture. *(Porté : parcours en trois écrans, compte vierge par
   défaut, démonstration en lien secondaire badgé.)*
2. **PWA** — pas de manifeste, pas de service worker, pas d'icônes, pas d'installation.
   *(Porté : manifeste, icônes générées, service worker Serwist, rechargement hors ligne éprouvé.)*
3. **Notifications réelles** — rappels d'habitude et fin de pomodoro. *(Porté : permission demandée
   au clic, rappels planifiés tant que l'onglet est ouvert ; la planification par service worker
   reste à faire.)*
4. **Synchronisation / authentification** — produit mono-appareil (choix assumé, phase 6 optionnelle).
5. **Journalisation d'erreurs** — volontairement absente : voir `DEPLOY.md` § 4. *(Porté :
   journal LOCAL uniquement, vingt entrées, aucun envoi réseau — décision E.)*

## 4. Problèmes techniques encore présents

| Réf. | Problème | Gravité | Où le traiter |
|---|---|---|---|
| **B4** | `materialize()` fabrique un historique de démonstration indistinguable du réel à l'œil (un badge le signale, mais les données sont mêlées) | élevée | phase 1 — séparer *seed de démo* et *compte vierge* |
| **B6** | Migrations en cascade artisanales (`if v<2`, `if v<3`…) — testées, mais non versionnées | moyenne | phase 1 — migrations Dexie numérotées |
| **B7** | Prototype non typé | moyenne | **en cours** : `lib/domain/` est typé strict ; le reste suit le portage |
| — | Volume de stockage : `localStorage` plafonne (~5 Mo) à plusieurs années d'historique | moyenne | phase 1 — IndexedDB |
| — | `notif` / `sound` / `vibrate` promettent un comportement inexistant | faible mais **malhonnête** | ✅ phase 5 — branchés dans l'application portée (5.2, 5.3) ; le prototype, lui, garde ses interrupteurs désactivés et motivés |
| — | `cfg.cloud=false` désactive en réalité la persistance locale : nom trompeur (déjà renommé côté libellé, pas côté clé — et la clé ne doit pas être renommée) | faible | documenter, ne pas renommer |

Aucun bug bloquant connu. Les trois défauts graves trouvés à la passe de finalisation
(restauration du stockage cassée, import rejetant notre propre export, débordement de 54 px
sur téléphone) sont corrigés et verrouillés par des tests.

## 5. Nettoyage effectué par cette restructuration

| Élément | Traitement | Pourquoi |
|---|---|---|
| `design_handoff_habitum/Habitum.dc.html` + `support.js` | **supprimés** | copies à l'identique des fichiers racine — deux sources de vérité pour un même fichier, garanties de diverger |
| `design_handoff_habitum/` | déplacé en `docs/handoff/` | la passation est de la documentation, pas une racine parallèle |
| `docs/references/landing-modernist/` | **non repris** | gabarit du design system, utile à la vitrine, sans usage dans un dépôt applicatif ; il reste disponible dans le projet de design |
| `assets/references/habitnow/` | déplacé en `docs/references/habitnow/` | un seul dossier de documentation |
| `uploads/` | **non repris** | dépôts bruts de l'utilisateur ; les 12 captures utiles sont déjà copiées et légendées dans `docs/references/habitnow/` |
| `.thumbnail` | non repris | artefact de l'outil de design |
| Prototype, `support.js`, `_ds/`, `tests/` du prototype | regroupés sous `public/prototype/` | leurs chemins relatifs sont préservés à l'identique : le prototype et ses six contrôles fonctionnent sans modification |

Aucun doublon ne subsiste. Aucun fichier orphelin n'a été trouvé au-delà de ceux déjà
supprimés lors du lot 6.

## 6. Dépendances — gratuites, retenues

| Brique | Licence | Rôle |
|---|---|---|
| Next.js 15 | MIT | framework, App Router, export statique possible |
| React 19 | MIT | — |
| TypeScript | Apache-2.0 | corrige B7 |
| Tailwind CSS v4 | MIT | utilitaires ; les jetons restent des variables CSS |
| next-intl | MIT | externalise les 308 libellés |
| Zustand | MIT | remplace l'état monolithique, sans boilerplate |
| Dexie | Apache-2.0 | IndexedDB : transactions, index, quota en Go |
| date-fns | MIT | fuseaux et formats localisés |
| zod | MIT | validation d'import — le point où le projet a déjà perdu des données |
| lucide-react | ISC | icônes (aligné avec le design system) |
| Vitest / Playwright | MIT / Apache-2.0 | tests |
| GitHub Actions, Vercel Hobby | gratuits | CI et hébergement |

**Recommandées mais non installées** (à ajouter au moment où le besoin est réel, pas avant) :
`@dnd-kit` (MIT) pour le glisser-déposer accessible du calendrier, `react-hook-form` (MIT)
pour l'éditeur à 4 onglets, `serwist` (MIT) pour la PWA, `drizzle-orm` (Apache-2.0) si Neon.

## 7. Dépendances payantes ou à risque — écartées

| Brique | Risque | Substitut gratuit |
|---|---|---|
| Sentry | quota gratuit serré, et envoi de données à un tiers dans une application local-first | aucun, par choix — voir `DEPLOY.md` § 4 |
| Vercel Pro / Analytics | payant au-delà de l'usage personnel ; l'analytique contredit la promesse produit | Vercel Hobby seul |
| Prisma Accelerate / Data Proxy | payant | Drizzle + connexion directe Neon |
| Neon plan payant | inutile : 0,5 Go couvrent des années de journal | plan gratuit, et seulement en phase 6 |
| Clerk / Auth0 | gratuits jusqu'à un seuil, puis payants | Auth.js (MIT) auto-hébergé, et seulement en phase 6 |
| Polices commerciales | licence | Space Grotesk, JetBrains Mono, Archivo — toutes OFL |

**Aucune dépendance payante n'est requise, aujourd'hui ni à terme.**

## 8. Verdict

Le projet **est prêt à être repris dans Claude Code**. Ce qui reste n'est pas de la
découverte : c'est du portage, guidé par une spécification exécutable (62 valeurs de
référence), une carte du fichier source, et un backlog de 77 tâches déjà priorisées.
Le risque principal n'est pas technique — c'est de reperdre des règles métier subtiles en
réécrivant ; c'est exactement ce que `lib/domain/` et ses tests existent pour empêcher.
