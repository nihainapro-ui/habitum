# Recette manuelle — à passer avant chaque livraison

Deux automatismes d'abord, le reste à l'œil.

## 0. Automatique (30 secondes)

Ouvrir `tests/domain.test.html`. Attendu :

- `tout conforme` — **62 / 62 mesures identiques** aux valeurs de référence ;
- `invalidation fine saine` — aucune valeur périmée après une case cochée à cache chaud.

Un écart n'est acceptable que s'il est **voulu** : dans ce cas, régénérer `tests/golden.json`
(le bouton apparaît quand le fichier est absent) et l'écrire dans le `CHANGELOG.md`.

## 1. Les 11 vues × 3 thèmes × 2 langues

Thèmes : Neural · Plasma · Clinical. Langues : FR · EN. Pour chaque combinaison, parcourir :

| # | Vue | À vérifier en particulier |
|---|---|---|
| 1 | Tableau de bord | anneau de progression, matrice 6 mois, aucun libellé tronqué |
| 2 | Aujourd'hui | bande de dates, filtres, cases cochables |
| 3 | Habitudes | semaine cochable, série, taux 30 j, état vide si aucune habitude |
| 4 | Tâches | groupes par échéance, sous-tâches, liste de courses |
| 5 | Objectifs | cumul / jalons / réduction, rythme requis, création |
| 6 | Calendrier | les 5 modes (orbite, mois, semaine, jour, agenda) |
| 7 | Statistiques | score, barres du mois, tableau par habitude, densité |
| 8 | Focus | 4 modes de minuteur, cible de session, sessions récentes |
| 9 | Notes | journal, recherche, notes liées aux habitudes |
| 10 | Profil | niveau, KPI, avatar, liste des profils |
| 11 | Réglages | thème, langue, notifications, données |

Attendu partout : **aucune erreur en console**, aucun texte coupé, aucun contraste illisible
(le thème Clinical est le plus exposé), les libellés FR et EN présents (jamais de clé brute affichée).

## 2. Les 8 parcours critiques

1. **Cocher / décocher** une habitude quantifiée → la valeur, la série et le taux suivent ; recharger
   la page : l'état est conservé.
2. **Créer une tâche** par la palette `⌘K`, avec catégorie et priorité → elle apparaît dans le bon
   groupe d'échéance.
3. **Éditer une habitude** (4 onglets) → enregistrer, puis vérifier que la fréquence modifiée change
   bien les jours planifiés.
4. **Supprimer** une tâche, une habitude, un objectif, un profil → confirmation demandée (profil,
   habitude) puis **Annuler** dans le toast restaure l'élément.
5. **Glisser-déposer** un évènement dans le calendrier Semaine, puis le redimensionner.
6. **Minuteur Pomodoro** : démarrer, laisser passer une bascule de phase, enregistrer la session →
   elle apparaît dans les sessions récentes et dans le temps de focus.
7. **Exporter** le JSON, **réinitialiser**, **réimporter** le fichier → les données reviennent ;
   réimporter un fichier tronqué → refus expliqué, données intactes.
8. **Restaurer** la sauvegarde automatique depuis les réglages après un import.

## 3. Accessibilité et préférences système

- **Clavier seul** : `⌘K` ouvre la palette, `Tab` reste piégé dans l'éditeur ouvert, `Échap` ferme,
  l'anneau de focus est toujours visible.
- **Lecteur d'écran** : le changement de vue est annoncé, les toasts sont lus.
- **Mouvement réduit** (préférence système) : pas d'écran de démarrage, pas de curseur personnalisé,
  aucune animation qui boucle.
- **Curseur personnalisé** : désactivé par défaut ; l'activer depuis le profil ne doit jamais faire
  disparaître le pointeur sur un écran tactile.

## 4. Paliers responsive

| Largeur | Attendu |
|---|---|
| 1920 / 1440 px | rendu de référence, rail complet + colonne de droite |
| 1320 px | la colonne de contexte se replie |
| 1060 px | le rail passe en icônes seules |
| 780 px | navigation en barre basse |
| 767 px et moins | Calendrier Semaine et Jour deviennent une **liste**, l'éditeur occupe tout l'écran |

**Aucune régression tolérée au-dessus de 1060 px** : c'est le rendu de référence.
