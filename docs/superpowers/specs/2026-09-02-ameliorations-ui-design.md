# Améliorations d'interface et d'ergonomie — spécification

- **Date** : 2026-09-02
- **Origine** : retours d'usage réel sur téléphone (captures d'écran), plus un audit
  automatisé mené le même jour : chaque vue rendue à 360 / 390 / 768 / 1060 / 1440 px,
  débordements mesurés dans le navigateur (`scrollWidth > clientWidth`, sortie de la
  boîte parente). 339 relevés bruts, réduits à six défauts réels après filtrage des
  faux positifs (éléments d'accessibilité invisibles, troncatures volontaires, halo
  décoratif du logo, marge négative documentée du bouton-interrupteur).
- **Décision de cadrage, tranchée avec l'utilisateur** : le « profil enrichi » se fait
  **entièrement en local, sans compte**. Aucun identifiant, aucun mot de passe, aucun
  serveur d'authentification. La politique de confidentialité publiée reste vraie mot
  pour mot. L'alternative — un vrai système de comptes — a été présentée et écartée :
  elle annulait l'ADR-0002 et l'ADR-0009 et faisait tomber l'argument n°1 du produit.

## Découpage

Quatre lots indépendants. Chacun livre un logiciel qui marche et se teste seul ;
chacun aura son plan d'implémentation détaillé au moment de démarrer.

| Lot | Contenu | Poids |
| --- | --- | --- |
| A | Corrections d'affichage mesurées + affordances d'édition | Petit |
| B | Sous-tâches dans l'onglet Work | Moyen |
| C | Calendrier mensuel depuis l'en-tête | Moyen |
| D | Profil local : photo, e-mail, fonction, verrou biométrique | Grand |

Ordre proposé : **A → B → C → D** — A d'abord parce qu'il corrige des défauts
visibles aujourd'hui ; D en dernier parce qu'il est le plus lourd et le plus
sensible (il touche à ce que la politique de confidentialité décrit).

---

## Lot A — corrections d'affichage et affordances

### Défauts mesurés (audit du 2026-09-02)

1. **Libellés des tuiles coupés** — Tableau de bord et Statistiques, 360–390 px.
   « Tâches prioritaires », « Habitudes du jour », « Score global », « Jours
   parfaits ». Cause : `text-[8.5px] tracking-[0.18em] uppercase` — l'interlettrage
   rend le mot « prioritaires » plus large (80 px) que la tuile (62 px) ; un mot
   insécable qui ne tient pas déborde au lieu de passer à la ligne.
2. **« 4 h 36 » cassé en trois lignes** — tuile « Temps de focus ». La valeur
   (`text-[20px]`) n'est pas insécable.
   **Corrigé en clôture de lot (revue finale, 2026-09-02)** : une première
   version forçait l'insécabilité de la valeur seulement au-delà de 480 px
   (`min-[480px]:whitespace-nowrap`), donc encore cassable en dessous. Revu en
   même temps que le défaut n°1 : c'est l'anneau qui cède sa ligne à la grille
   de tuiles (`max-[479px]:basis-full`), ce qui porte le libellé disponible à
   ~111 px mesurés — largement assez pour que la valeur tienne en
   `whitespace-nowrap` simple, à toutes les largeurs, sans condition de
   palier. Détail au CHANGELOG.
3. **Ligne d'Aujourd'hui écrasée à 360 px** — le conteneur central de la ligne tombe
   à 36 px de large : le titre déborde de 1 px, la pastille « Habitude » de 23 px, la
   méta est coupée. La jauge censée disparaître « quand la place manque » (commentaire
   de `RowShell.tsx`) ne disparaît pas assez tôt. Diagnostic à confirmer en
   implémentation — c'est le seul défaut dont la cause n'est pas encore prouvée.
4. **Élément fantôme du Calendrier** — un `div` vide positionné à −344 px hors écran,
   à toutes les largeurs. À élucider : soit un artefact de positionnement à corriger,
   soit un élément volontaire à documenter (comme le halo du logo).
   **Investigué le 2026-09-02, introuvable** : balayage `getBoundingClientRect().right < 0`
   sur tout le document, cinq paliers, quatre modes, compte démo et vierge, moteurs
   desktop et mobile — zéro élément hors écran. Aucun correctif appliqué faute de défaut
   à corriger ; détail au CHANGELOG.
5. **L'édition d'une habitude est invisible** — taper le nom ouvre l'éditeur
   (`HabitCard.tsx:45`) mais rien ne le signale, alors que Tâches et Work affichent un
   crayon. Ce n'est pas une fonctionnalité manquante, c'est une affordance absente.
6. **Date coupée « 2026-08- / 31 »** (capture utilisateur) — **non reproduit** par
   l'audit ; la capture provient vraisemblablement de l'ancien APK, antérieur au
   correctif de séparateur déjà présent dans `TaskItem.tsx`. À vérifier sur le nouvel
   APK ; ne corriger que si reproduit.
   **Vérifié le 2026-09-02, toujours non reproduit** : mesuré `scrollWidth`/`clientWidth`
   de chaque segment (catégorie/heure/date) des huit tâches de démonstration à 360 et
   390 px, puis d'un cas fabriqué à l'extrême (ligne forcée à 110 px de large) — aucune
   coupe. Aucun correctif appliqué ; détail au CHANGELOG.

### Ce qui est VOULU et ne sera pas « corrigé »

- Les sous-titres d'en-tête tronqués avec points de suspension (`truncate`) ;
- le halo du logo qui déborde de sa boîte (décoratif, `aria-hidden`) ;
- les 3 px du bouton-interrupteur (marge négative documentée, absorbée par le
  rembourrage du panneau) ;
- les éléments `sr-only` (boîte de 1 px par définition).

### Correctifs

- **Tuiles** : c'est l'anneau qui cède sa ligne à la grille de tuiles sous 480 px
  (`max-[479px]:basis-full`), lui seul étant décoratif à cette largeur — jamais le
  texte. Libellé et valeur restent en interlettrage et `whitespace-nowrap` normaux
  à toutes les largeurs ; aucun changement au-delà de 768 px — le rendu y était déjà
  bon. Une version antérieure resserrait l'interlettrage et autorisait la coupure du
  mot (`break-words`) sous 480 px : incohérente avec le refus de la même coupure sur
  la vue Aujourd'hui, elle a été abandonnée en revue finale au profit de ce qui
  précède. Détail au CHANGELOG.
- **Aujourd'hui** : diagnostic d'abord (règle du dépôt : pas de correctif sans cause
  prouvée), puis correction — vraisemblablement le seuil de disparition de la jauge
  et un `min-w-0` manquant sur le titre.
- **Crayon sur `HabitCard`** : même dessin que celui de Work (`Pencil` de lucide,
  bouton bordé), même position. Le nom reste cliquable — on ajoute, on ne déplace pas.
- **Verrou de non-régression** : un test e2e reprend la détection de l'audit
  (débordement mesuré, pas capture comparée), aux cinq paliers (360/390/768/1060/
  1440 px). Il couvre sept vues à la clôture du lot — Tableau de bord, Statistiques,
  Aujourd'hui, Tâches, Calendrier, Habitudes et Profil — et non les trois prévues
  ici : les vues touchées par des tâches ultérieures du même lot en avaient besoin
  pour ne pas travailler à l'aveugle, et la dernière vue portant le motif de tuile a
  été ajoutée en clôture. Les coupes de texte ne reviendront pas en silence.

---

## Lot B — sous-tâches dans Work

### Modèle

`ProjectTask` gagne `subItems: { label: string; done: boolean }[]`, défaut `[]`.
Différence assumée avec `Habit.subItems` (`{ label }` seul) : pour une habitude,
l'accompli du jour vit dans le journal ; pour une étape de projet, l'accompli est
intrinsèque et unique — il vit donc dans l'entité.

### Le piège qui coûterait des données (à traiter en PREMIER dans le plan)

L'export et l'import énumèrent les champs de `ProjectTask` un par un
(`lib/data/export.ts:260`, `lib/data/import.ts:296`). Un champ ajouté au domaine mais
oublié là **disparaît en silence à chaque aller-retour export → import** — c'est
exactement le piège n°1 du CLAUDE.md, sous une autre forme. Le plan commence par le
test d'aller-retour, écrit AVANT le champ lui-même. La synchronisation, elle, est
automatiquement correcte : elle transporte l'entité entière en blob.

### Interface

- Dans le tableau de projet : chaque étape affiche « 2/5 » quand elle a des
  sous-tâches ; un développement (chevron) montre la liste à cocher, cochable en
  place.
- Dans l'éditeur d'étape (`EditorSheet`, branche `projectTask`) : le même éditeur de
  sous-éléments que celui des habitudes, adapté au champ `done`.
- **La progression du projet ne change pas de définition** : elle reste « étapes
  faites / étapes totales ». Les sous-tâches détaillent une étape, elles ne la
  fractionnent pas — sinon cocher une sous-tâche ferait bouger deux jauges à la fois,
  et plus personne ne saurait ce que mesure celle du projet.

---

## Lot C — calendrier mensuel depuis l'en-tête

- Un bouton (icône calendrier) dans l'en-tête de l'application, à côté de la
  recherche. Il ouvre un `Dialog` existant du système visuel : grille du mois,
  navigation ← / →, bouton « Aujourd'hui », fermeture par Échap avec retour du focus.
- Choisir un jour règle `ui.day` (le décalage en jours par rapport à aujourd'hui,
  déjà existant) et mène à la vue Aujourd'hui. C'est le geste HabitNow que
  l'utilisateur demande : « aller voir un autre jour, vite ».
- **Pas de pastilles d'activité sur les jours en v1.** Elles demanderaient de
  calculer l'état de chaque jour du mois à l'ouverture ; la valeur première est la
  navigation. À réévaluer ensuite, sur usage.
- Les calculs de grille (premier jour du mois, semaines, début de semaine réglable)
  descendent dans `lib/domain` avec leurs tests — règle n°2 du CLAUDE.md — en
  réutilisant les assistants de date existants.

## Lot D — profil local

Tout est local ; rien ne crée de compte ; la politique de confidentialité reste vraie.

- **Photo ou avatar** : image recadrée et réduite sur l'appareil (≤ 256 px de côté,
  JPEG, ≤ 64 Ko) stockée en dataURL dans `Profile.photo?: string`. Le choix d'un
  glyphe et d'une teinte (existant) reste le défaut. La photo voyage chiffrée avec le
  reste si la synchronisation est active, comme toute donnée.
- **E-mail et fonction** : `Profile.email: string` et `Profile.metier: string`
  (défauts `''`). Champs libres, affichés sur la vue Profil, jamais transmis à
  quiconque — l'interface le dit. Le champ existant `role: number` n'est PAS renommé
  (clé persistée) ; `metier` s'ajoute à côté.
- **Verrou biométrique** : WebAuthn, authentificateur de plateforme
  (`userVerification: 'required'`) — l'empreinte sur téléphone, avec repli natif sur
  le code de l'appareil géré par le système, ce qui règle le cas du capteur cassé
  sans écrire de porte dérobée. Identifiant de credential stocké dans `meta`,
  **local, jamais synchronisé** (ajouté à la liste commentée de `entites.ts`).
- **Honnêteté obligatoire dans l'interface** : ce verrou est un rideau, pas un
  chiffrement. Les données restent lisibles dans IndexedDB pour qui a l'appareil et
  s'y connaît — la politique de confidentialité le dit déjà des données locales. Le
  réglage l'affiche en toutes lettres, sur le modèle des avertissements existants.
- L'export n'inclut pas les profils aujourd'hui ; ce lot ne change pas ça (constat,
  pas décision — à réévaluer hors de ce périmètre).

---

## Définition de terminé (chaque lot)

Celle du CLAUDE.md, sans retranchement : `npm run verify` vert, e2e desktop et
mobile, aucun débordement aux quatre paliers (désormais outillé par le test du
lot A), CHANGELOG à jour, documents corrigés si une affirmation devient fausse.
Chaque invariant nouveau est éprouvé par mutation avant d'être tenu pour acquis.
