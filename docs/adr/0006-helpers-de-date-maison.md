# ADR 0006 — Helpers de date maison, sans bibliothèque

- **Statut** : accepté · 2026-08-06

## Décision

`lib/domain/date.ts` reste écrit à la main. `date-fns`, déclarée en dépendance de production
depuis la mise en place du dépôt mais **jamais importée**, est retirée.

## Contexte

L'audit du 6 août 2026 (défaut `D17`) a relevé que cinq des dix dépendances de production
n'étaient utilisées nulle part, dont `date-fns`. `docs/handoff/03-ARCHITECTURE.md` § 1 et la
tâche `T1.2` du backlog la prescrivaient pourtant explicitement, « pour remplacer les helpers
maison et gérer les fuseaux ».

Entre-temps, le portage a montré que ces helpers ne posaient pas de problème : neuf fonctions
pures, courtes, et couvertes par dix cas de test.

## Pourquoi la retirer

- **Le domaine ne doit dépendre de rien.** `CLAUDE.md` § 2 impose que `lib/domain/` n'importe ni
  React, ni Next, ni la persistance — la règle est même appliquée par ESLint. Y introduire une
  bibliothèque de dates irait contre l'esprit de cette frontière : c'est la couche qui doit avoir
  le moins de surface possible.
- **Le besoin est étroit.** `startOfDay`, `today`, `addDays`, `dateKey`, `parseKey`, `dow`,
  `daysBetween`, `startOfWeek` : huit fonctions, une trentaine de lignes, toutes testées.
- **`dateKey()` doit rester en heure locale.** Le fichier porte déjà l'avertissement : « jamais
  `toISOString()` — décalerait d'un jour ». C'est exactement le genre de subtilité qu'une
  bibliothèque générique invite à perdre de vue en offrant vingt façons de formater une date.
- **Une dépendance de production non importée n'est pas neutre.** Elle pèse dans `npm ci`, dans
  l'audit de licences et dans la surface de vulnérabilité, sans rien rendre.

## Ce que cela coûte

- Les **formats de date localisés** FR/EN restent à écrire. Ils appartiennent à la couche de
  présentation, pas au domaine : `Intl.DateTimeFormat`, natif dans tous les navigateurs visés,
  y suffit — sans dépendance.
- Les **fuseaux horaires** ne sont pas gérés. Ce n'est pas une régression : le produit est
  local-first et mono-appareil, et toutes ses dates sont en heure locale par construction.

## Conséquences

- La tâche `T1.2` du backlog est corrigée : « Utilitaires de date — sans dépendance ».
- `docs/handoff/03-ARCHITECTURE.md` § 1 conserve la ligne `date-fns` **barrée** par ce document :
  la stack recommandée y était une intention, pas un engagement.
- **Cette décision est à rouvrir** si un besoin réel de fuseaux horaires apparaît — c'est-à-dire
  au plus tôt à la phase de synchronisation multi-appareils (Neon), et seulement si des données
  sont écrites depuis deux fuseaux différents.
