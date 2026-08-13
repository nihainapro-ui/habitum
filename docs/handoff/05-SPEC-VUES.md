# 05 — Spécification des vues

11 vues, sélectionnées par `state.view`. Coquille commune : rail de navigation à gauche (groupes
« Espace / Suivi / Focus »), en-tête avec date et recherche, contenu principal, panneau d'analyse à
droite sur les vues larges. Mode zen (`⌘\`) masque rail et panneau.

Navigation (ordre du prototype) :
`dash · today · cal · habits · tasks · goals · stats · timer · notes · settings · profile`

Raccourcis globaux : `⌘K`/`Ctrl+K` palette · `Escape` ferme palette/modale/éditeur ·
`⌘\` mode zen · `Tab` piégé dans les modales ouvertes.

---

## 1. `dash` — Tableau de bord
**But :** état du jour en un écran.
**Contenu :** anneau de progression du jour (`dayRatio`), compteurs (habitudes réussies /
planifiées, tâches restantes, série la plus longue, minutes de focus), liste des habitudes du jour
avec case d'action directe, prochaines tâches, mini-heatmap 30 jours, objectifs en cours.
**Interactions :** cocher une habitude depuis la liste, clic sur une carte → vue détaillée.

## 2. `today` — Aujourd'hui
**But :** exécution séquentielle de la journée.
**Contenu :** navigation jour précédent/suivant (`state.day`), filtres par catégorie
(`state.filter`), liste unifiée habitudes + tâches triée par heure, sous-listes dépliables,
compteurs quantitatifs avec `−`/`+`.
**Interactions :** case à cocher, incrément/décrément, appui long ou clic sur « ⋯ » → **tiroir
d'actions** : *Marquer réussi · Passer · Reporter · Supprimer · Note*. Toast avec **Annuler**.

## 3. `cal` — Calendrier
**But :** planification.
**Modes :** `month` (grille 6×7, intensité = `dayRatio`), `week` (colonnes horaires),
`day` (une colonne détaillée), `agenda` (liste chronologique).

> **Corrigé au portage (phase 4).** Ce document annonçait quatre modes ; le prototype en a
> **cinq** — `tests/RECETTE.md` § 6 disait vrai. Le cinquième, `orbit` (« projection orbitale du
> mois »), est une variante **décorative** de la grille mensuelle : il n'affiche aucune information
> que `month` ne donne pas. Il n'est **pas porté**, et ce choix est délibéré plutôt que subi.
> Les quatre modes ci-dessus le sont, et retombent tous sur `agenda` sous 768 px (D6).
**Interactions :** navigation par `calOff` (animation directionnelle `calDir`), **glisser-déposer**
d'une tâche vers un autre jour/heure, **redimensionnement** modifiant `duration` (minimum 15 min),
toast « déplacé/redimensionné » annulable. Clic sur un jour → `today` sur ce jour.
**À refaire proprement :** accessibilité clavier du drag&drop (phase 7.3).

## 4. `habits` — Habitudes
**But :** gestion du catalogue.
**Contenu :** carte par habitude : glyphe + couleur de catégorie, nom, libellé d'objectif,
7 pastilles de la semaine courante (lundi → dimanche, état par jour), série courante, record,
taux sur 30 jours, bouton d'édition. Bouton « Nouvelle habitude » en haut à droite.
**Interactions :** cocher un jour de la semaine directement, ouvrir l'éditeur, archiver, supprimer.

## 5. Éditeur habitude / tâche (modale, 4 onglets)
- **Définition** : nom, catégorie, type d'objectif (`check` / `total` / `list` / `limit`), cible,
  unité, sous-éléments pour `list`.
- **Planning** : jours de semaine, date de début, date de fin, heure, durée, priorité (tâches).
- **Rappels** : liste d'heures `HH:mm` (⚠ non déclenchés aujourd'hui — phase 4.2).
- **Avancé** : note libre, archivage, suppression (avec annulation).
Validation à porter en `zod` ; état brouillon isolé du store principal.

## 6. `tasks` — Tâches
**But :** liste d'actions.
**Contenu :** regroupement *Aujourd'hui / Demain / Cette semaine / Plus tard / Terminé*,
puce de priorité (1–3), heure, catégorie, sous-tâches avec compteur, note.
Colonne latérale : **liste de courses** (`shop`) et listes annexes.
**Interactions :** cocher tâche et sous-tâche, reporter (+1 jour), supprimer, éditer.

## 7. `goals` — Objectifs
**But :** engagements à moyen terme.
**Contenu :** carte par objectif : type (`cumul` cumulatif / `reduce` réduction), cible + unité,
habitude source, échéance, barre de progression, puce d'état.
**Existant :** création par brouillon (`objDraft`), suppression annulable.
**À compléter (phase 3.7) :** rythme requis restant, courbe d'avancement, jalons, alerte
d'échéance, historique des objectifs atteints.

## 8. `stats` — Statistiques
**But :** preuve de progression.
**Contenu :** sélecteur de fenêtre (`state.range` : 7 / 30 / 90 / 365 j), **heatmap 6 mois**
(style GitHub, intensité = `dayRatio`), taux global, journées parfaites, meilleure série,
classement des habitudes par score, répartition par catégorie (barres), minutes de focus.
**Fait (lot 2, E1) :** les minutes de focus viennent de `sessions`, plus de `focusMin_()` fictif.

## 9. `timer` — Focus
**But :** sessions de concentration.
**Modes :** `pomo` (focus 25 min ×4, pause 5 min, pause longue 15 min), `stopwatch`,
`countdown`, `interval`.
**Contenu :** cadran circulaire animé, phase et cycle en cours, habitude liée (crédit automatique
à la fin de session), sessions récentes du jour + total.
**À refondre (B5) :** ancrage `startedAt` + `accumulatedMs`, survie au rechargement et à
l'arrière-plan, notification et son de fin de phase.

## 10. `notes` — Notes
**Contenu :** journal du jour (zone de texte auto-sauvegardée, clé `j|YYYY-MM-DD`), humeur du jour,
historique des entrées, notes liées aux habitudes, sessions récentes.
**Fait (lot 2) :** recherche plein texte, et plus aucun contenu généré (`journalSeed()` neutralisé).
**À compléter :** liaison note↔tâche, pièces jointes, mise en forme.

## 11. `profile` — Profil
**Contenu :** identité (nom, identifiant, fonction, membre depuis), avatar génératif (glyphe +
teinte OKLCH), statistiques personnelles, préférences, **liste des profils** avec bascule,
création, suppression, import de fichier JSON.

## 12. `settings` — Réglages
**Contenu :** thème (`neural` / `plasma` / `clinical`), langue (FR / EN), début de semaine
(lundi / dimanche), interrupteurs `notif` · `sound` · `vibrate` · `confetti` · `cloud`,
export JSON, réinitialisation avec confirmation en deux temps.
**Corrections :** brancher réellement `notif`/`sound`/`vibrate` (phase 4.2–4.3), renommer `cloud`
(il gouverne la persistance locale, pas un cloud).

---

## Composants transverses

| Composant | Comportement |
|---|---|
| **Palette `⌘K`** | Recherche habitudes / courses / objectifs, `↑`/`↓` + `Entrée`, création rapide de tâche avec catégorie et priorité |
| **Toast** | Message + bouton **Annuler** restaurant un instantané complet (`snapshot()`) ; un seul à la fois, `clearTimeout` sur le précédent |
| **Tiroir d'actions** | Réussi / Passer / Reporter / Supprimer / Note, contextuel habitude ou tâche |
| **Modale de confirmation** | Réinitialisation, suppression d'habitude |
| **Écran de démarrage** | Anneau + barre + texte, une fois par session (`sessionStorage`) ; supprimé si la préférence « mouvement réduit » est active (lot 5) |
| **Curseur personnalisé** | `[data-cursor=on]` masque le pointeur ; **désactivé par défaut** (lot 5, D2), neutralisé sur `pointer:coarse` et en « mouvement réduit » |
| **États vides** | Présents sur les 11 vues (lot 2, D1) |
| **Bandeau de rappel d'export** | En tête du tableau de bord au-delà de 30 jours sans export ; refusable, ne revient pas (lot 5, D8) |
| **Région annoncée** | `aria-live="polite"` invisible portant le nom de la vue courante (lot 5, D3) |
