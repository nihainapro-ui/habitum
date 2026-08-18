# Rapport d'accessibilité — Habitum

**Établi le 17 août 2026**, phase 7 tâche 8.3 (plan 8, référence T7.4).
Périmètre : les onze vues applicatives, les trois thèmes, les deux gabarits.

Ce document sépare volontairement **ce qu'une machine a vérifié** de **ce qui demande une
oreille humaine**. Confondre les deux est la façon la plus courante de déclarer une
application accessible sans qu'elle le soit : un attribut ARIA présent ne prouve pas qu'une
annonce est utile, et un audit vert ne prouve pas qu'on peut se servir du produit.

---

## 1. Ce qui est vérifié automatiquement, et à chaque exécution

| Contrôle | Où | Portée |
|---|---|---|
| axe — WCAG 2.0/2.1/2.2, niveaux A et AA | `tests/e2e/a11y-approfondie.spec.ts` | 11 vues × 3 thèmes, compte **peuplé** |
| axe — mêmes règles, compte vierge | `tests/e2e/a11y.spec.ts` | 11 vues + galerie + vitrine |
| Contraste des jetons, calculé depuis `styles/tokens.css` | `tests/unit/contrast.test.ts` | 13 paires × 3 thèmes |
| `target-size` (WCAG 2.2 § 2.5.8) | inclus dans l'audit axe, et sa bonne exécution est **assertée** | 11 vues |
| Alternative clavier au glisser-déposer | `tests/e2e/a11y-approfondie.spec.ts` | calendrier |
| Région live polie, réellement alimentée | idem | vue du jour |
| Curseur réticule désactivé par défaut | idem | profil |
| Navigation clavier de bout en bout | `tests/e2e/parcours/02`, `03` | palette, calendrier |

**Résultat au 17 août 2026 : zéro violation critique ou sérieuse**, sur les onze vues, dans
les trois thèmes, compte peuplé comme compte vierge.

### Deux défauts trouvés et corrigés par cette campagne

1. **Quatre couleurs de rôle échouaient à AA dans le thème `clinical`.** `--acc2` tombait à
   **2,55:1** — la couleur qui porte les séries, les pourcentages et les liens. `--ok`,
   `--warn` et `--bad` échouaient aussi. Corrigé **à la source** (jetons du prototype), puis
   `tokens.css` régénéré par extraction. Les paires sont désormais sous contrôle unitaire.
   Elles ne l'étaient pas : `contrast.test.ts` ne surveillait que `txt`, `txt2` et `mut`,
   c'est-à-dire tout sauf les couleurs qui portent les chiffres.

2. **Dix composants écrivaient une encre presque noire en dur** (`#04060d`) sur un aplat ou
   un dégradé d'accent. Vrai dans les deux thèmes sombres, faux dans `clinical`, dont les
   accents sont sombres : texte sombre sur fond sombre, jusqu'au bouton principal. **axe ne
   pouvait pas le voir** — il n'évalue pas le contraste d'un élément dont le fond est un
   dégradé. Trouvé en lisant le code après la correction des jetons. L'encre se déduit
   maintenant du thème (`components/ui/encre.ts`).

---

## 2. Ce qui demande une oreille humaine — **NON FAIT**

Les trois parcours au lecteur d'écran prévus par le plan 8 § 8.3 étape 2 **n'ont pas été
passés**. Ils exigent NVDA sous Windows et VoiceOver sous macOS, pilotés par une personne qui
écoute : aucune automatisation ne peut établir qu'une annonce est *compréhensible*, seulement
qu'un attribut est *présent*. Les déclarer passés sur la foi de l'audit axe serait exactement
le genre d'affirmation que ce document existe pour éviter.

Le protocole est écrit ci-dessous pour être exécutable tel quel.

### Parcours A — cocher une habitude depuis « Aujourd'hui » · NVDA (Windows)

1. Ouvrir `/app/today` sur le jeu de démonstration.
2. Atteindre la file au clavier seul, sans souris.
3. Cocher « Méditer ».

**Doit être annoncé :** le nom de l'habitude · son état avant (« non coché ») · le changement
d'état · la nouvelle valeur (« 20 sur 15 minutes ») · le message de confirmation, sans
interrompre la lecture en cours.
**Point de vigilance :** le compteur `−` / `+` d'une habitude quantifiée. Les deux boutons
portent le nom de l'habitude (« Augmenter : Boire 8 verres d'eau ») ; vérifier qu'on
distingue à l'oreille lequel a le focus.

### Parcours B — créer une tâche par ⌘K · VoiceOver (macOS)

1. Ouvrir `/app`, presser ⌘K.
2. Saisir « Arroser les plantes ».
3. Valider la création rapide.

**Doit être annoncé :** l'ouverture de la palette et son rôle de boîte de dialogue · le
nombre de résultats, et sa mise à jour à chaque frappe · l'option sélectionnée lors du
parcours aux flèches · la création effectuée.
**Point de vigilance :** le nombre de résultats doit être annoncé sans que chaque frappe
relance la lecture complète de la liste.

### Parcours C — déplacer une tâche au calendrier · NVDA (Windows)

1. Ouvrir `/app/calendar` en mode Mois, sur un écran ≥ 768 px.
2. Atteindre « Réunion de travail » au Tab, presser Entrée.
3. Déplacer d'un jour à la flèche droite, valider par Entrée.

**Doit être annoncé :** l'entrée en mode déplacement · le jour visé à chaque flèche · la
confirmation, avec la nouvelle date · l'abandon, si l'on presse Échap.
**Point de vigilance :** c'est le point le plus exposé du produit. L'alternative clavier
existe et est testée (`a11y-approfondie.spec.ts`), mais un mode dont on ne s'entend pas
sortir est un piège.

### À consigner pour chacun

Ce qui a été annoncé mot pour mot · ce qui a manqué · ce qui a été annoncé deux fois · le
temps mis à accomplir la tâche · la version du lecteur et du navigateur.

---

## 3. Écart connu et assumé — la taille de confort des cibles

**Conformité : atteinte.** WCAG 2.2 § 2.5.8 (niveau AA) est vérifié par la règle
`target-size` d'axe, sur les onze vues. Le critère n'est pas « chaque cible fait 24 px » :
une cible plus petite est conforme si un cercle de 24 px centré sur elle ne croise aucune
autre cible. Les cases à cocher de 18 à 22 px du produit sont dans ce cas.

**Confort : non atteint, et chiffré.** Le plan 8 demandait 44 px, la recommandation d'Apple
et d'Android. Au 17 août 2026, **174 commandes** sont sous ce seuil sur le gabarit mobile.
Elles se répartissent en six familles :

| Famille | Taille observée | Occurrences |
|---|---|---|
| Cases à cocher de liste (habitude, tâche, sous-tâche, article) | 18 à 26 px | ~45 |
| Boutons d'action de ligne (« Plus d'actions », « Modifier », « Supprimer ») | 24 à 28 px | ~40 |
| Onglets et sélecteurs segmentés (thème, langue, période, mode) | 30 à 32 px de haut | ~30 |
| Boutons de l'en-tête (« Rechercher… », « Mode immersion ») | 34 px de haut | 22 |
| Boutons d'action de panneau (« Exporter », « Importer », « Réinitialiser ») | 37 à 42 px de haut | ~25 |
| Liens de repli (« Tout voir », « Voir le journal ») | 17 à 37 px de haut | 4 |

**Pourquoi ce n'est pas corrigé dans cette phase :** épaissir toutes ces commandes est un
remaniement visuel de l'application entière. Il s'écarterait du prototype, qui reste la
référence visuelle du portage, et il invaliderait les trente-trois captures de
non-régression. Ce n'est pas un oubli, c'est un arbitrage — et il appartient au produit, pas
à la recette, de décider s'il vaut d'être fait.

**Une correction a tout de même été faite**, parce qu'elle ne coûtait rien visuellement :
l'interrupteur des réglages offrait un rail de 38 × 22 px comme seule surface atteignable.
Sa cible fait désormais 44 × 44 px, le rail dessiné n'a pas bougé d'un pixel
(`components/ui/Switch.tsx`).

Le compte des 174 est **imprimé par le test à chaque exécution** : il n'y a pas moyen de le
laisser grandir sans le voir.

---

## 4. Points historiquement faibles — état

| Point | État | Preuve |
|---|---|---|
| Alternative clavier au glisser-déposer | ✅ testée | `a11y-approfondie.spec.ts`, `parcours/03` |
| Région `aria-live` sur les toasts et les changements de vue | ✅ testée, `polite` | `a11y-approfondie.spec.ts` |
| Curseur personnalisé désactivé par défaut | ✅ testé | idem |
| Contraste AA sur les trois thèmes | ✅ corrigé et sous contrôle | `contrast.test.ts`, 39 cas |
| Cibles tactiles | ✅ conforme · ⚠️ sous le confort | § 3 |
| Trois parcours au lecteur d'écran | ❌ **à faire** | § 2 |
